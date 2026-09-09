from ortools.linear_solver import pywraplp
from typing import Dict, List, Any, Optional


class BusinessOptimizationEngine:
    """
    Core MILP (Mixed Integer Linear Programming) Optimization Engine powered by Google OR-Tools.
    Models business decision variables, operational constraints, and objectives to find exact optimal plans.
    """

    def __init__(self, objective: str = "maximize_profit", budget_limit: Optional[float] = None):
        self.objective = objective
        self.budget_limit = budget_limit

    def solve(
        self,
        products: List[Dict[str, Any]],
        ingredients: List[Dict[str, Any]],
        employees: List[Dict[str, Any]],
        demand_forecast: Dict[str, List[float]],
        days: int = 1,
        constraints_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        constraints_config = constraints_config or {}
        
        # Instantiate solver (CBC solver for MILP)
        solver = pywraplp.Solver.CreateSolver("CBC")
        if not solver:
            return {"status": "error", "message": "Failed to create OR-Tools CBC solver instance."}

        # --- Decision Variables ---
        # 1. Production variables: x[p, t] = quantity of product p to produce on day t
        prod_vars = {}
        for p in products:
            p_name = p["name"]
            for t in range(days):
                max_dem = demand_forecast.get(p_name, [100.0]*days)[t] if t < len(demand_forecast.get(p_name, [])) else 100.0
                prod_vars[(p_name, t)] = solver.IntVar(0, int(max_dem * 1.5), f"prod_{p_name}_{t}")

        # 2. Ingredient Procurement variables: proc[i, t] = units of ingredient i purchased on day t
        proc_vars = {}
        for ing in ingredients:
            i_name = ing["name"]
            for t in range(days):
                proc_vars[(i_name, t)] = solver.NumVar(0.0, 5000.0, f"proc_{i_name}_{t}")

        # 3. Staffing variables: staff[emp_id, t] = hours scheduled for employee emp on day t
        staff_vars = {}
        for idx, emp in enumerate(employees):
            emp_id = emp.get("name", f"Emp_{idx}")
            avail_daily = emp.get("available_hours", 40.0) / days
            for t in range(days):
                staff_vars[(emp_id, t)] = solver.NumVar(0.0, avail_daily, f"staff_{emp_id}_{t}")

        # --- Operational Constraints ---
        
        # Constraint 1: Kitchen Preparation Capacity
        # Total prep time on day t <= Total staff hours available on day t * efficiency
        for t in range(days):
            total_prep_time_expr = solver.Sum(
                prod_vars[(p["name"], t)] * p.get("prep_time_minutes", 10.0)
                for p in products
            )
            total_staff_minutes_expr = solver.Sum(
                staff_vars[(emp.get("name", f"Emp_{idx}"), t)] * 60.0
                for idx, emp in enumerate(employees)
            )
            max_kitchen_cap = constraints_config.get("max_kitchen_hours_per_day", 24.0) * 60.0
            solver.Add(total_prep_time_expr <= total_staff_minutes_expr)
            solver.Add(total_prep_time_expr <= max_kitchen_cap)

        # Constraint 2: Ingredient Usage <= Current Stock + Procurement
        for ing in ingredients:
            i_name = ing["name"]
            init_stock = ing.get("current_stock", 0.0)
            unit_cost = ing.get("purchase_cost", 1.0)

            for t in range(days):
                # Total ingredient required for all products on day t
                req_expr = solver.Sum(
                    prod_vars[(p["name"], t)] * p.get("ingredient_requirements", {}).get(i_name, 0.0)
                    for p in products
                )
                available_supply = init_stock + solver.Sum(proc_vars[(i_name, k)] for k in range(t + 1))
                solver.Add(req_expr <= available_supply)

        # Constraint 3: Bounded Demand Fulfillment
        for p in products:
            p_name = p["name"]
            for t in range(days):
                dem = demand_forecast.get(p_name, [50.0]*days)[t] if t < len(demand_forecast.get(p_name, [])) else 50.0
                # Production cannot exceed forecasted market demand by more than configured threshold
                solver.Add(prod_vars[(p_name, t)] <= int(dem))

        # Constraint 4: Budget Bounding (if specified)
        budget = constraints_config.get("budget_limit", self.budget_limit)
        if budget and budget > 0:
            total_proc_cost = solver.Sum(
                proc_vars[(ing["name"], t)] * ing.get("purchase_cost", 1.0)
                for ing in ingredients for t in range(days)
            )
            total_labor_cost = solver.Sum(
                staff_vars[(emp.get("name", f"Emp_{idx}"), t)] * emp.get("hourly_cost", 15.0)
                for idx, emp in enumerate(employees) for t in range(days)
            )
            solver.Add(total_proc_cost + total_labor_cost <= budget)

        # Constraint 5: Minimum Staffing
        min_staff_hours = constraints_config.get("min_daily_staff_hours", 8.0)
        for t in range(days):
            solver.Add(
                solver.Sum(staff_vars[(emp.get("name", f"Emp_{idx}"), t)] for idx, emp in enumerate(employees))
                >= min_staff_hours
            )

        # --- Objective Function ---
        total_revenue = solver.Sum(
            prod_vars[(p["name"], t)] * p.get("selling_price", 10.0)
            for p in products for t in range(days)
        )
        total_procurement_cost = solver.Sum(
            proc_vars[(ing["name"], t)] * ing.get("purchase_cost", 1.0)
            for ing in ingredients for t in range(days)
        )
        total_labor_cost = solver.Sum(
            staff_vars[(emp.get("name", f"Emp_{idx}"), t)] * emp.get("hourly_cost", 15.0)
            for idx, emp in enumerate(employees) for t in range(days)
        )
        # Estimated waste / holding cost penalty
        total_waste_penalty = solver.Sum(
            proc_vars[(ing["name"], t)] * 0.05 * ing.get("purchase_cost", 1.0)
            for ing in ingredients for t in range(days)
        )

        if self.objective == "maximize_profit":
            solver.Maximize(total_revenue - total_procurement_cost - total_labor_cost - total_waste_penalty)
        elif self.objective == "minimize_cost":
            solver.Minimize(total_procurement_cost + total_labor_cost + total_waste_penalty)
        elif self.objective == "minimize_waste":
            solver.Minimize(total_waste_penalty + 0.1 * total_labor_cost)
        else:  # Balanced objective
            solver.Maximize(
                0.6 * (total_revenue - total_procurement_cost - total_labor_cost) - 0.4 * total_waste_penalty
            )

        # Solve model
        status = solver.Solve()

        if status == pywraplp.Solver.OPTIMAL or status == pywraplp.Solver.FEASIBLE:
            opt_production = {
                p["name"]: [int(prod_vars[(p["name"], t)].solution_value()) for t in range(days)]
                for p in products
            }
            opt_procurement = {
                ing["name"]: [round(proc_vars[(ing["name"], t)].solution_value(), 2) for t in range(days)]
                for ing in ingredients
            }
            opt_staffing = {
                emp.get("name", f"Emp_{idx}"): [round(staff_vars[(emp.get("name", f"Emp_{idx}"), t)].solution_value(), 2) for t in range(days)]
                for idx, emp in enumerate(employees)
            }

            rev = sum(
                opt_production[p["name"]][t] * p.get("selling_price", 10.0)
                for p in products for t in range(days)
            )
            proc_c = sum(
                opt_procurement[ing["name"]][t] * ing.get("purchase_cost", 1.0)
                for ing in ingredients for t in range(days)
            )
            labor_c = sum(
                opt_staffing[emp.get("name", f"Emp_{idx}")][t] * emp.get("hourly_cost", 15.0)
                for idx, emp in enumerate(employees) for t in range(days)
            )
            waste_c = sum(
                opt_procurement[ing["name"]][t] * 0.05 * ing.get("purchase_cost", 1.0)
                for ing in ingredients for t in range(days)
            )
            profit = rev - proc_c - labor_c - waste_c

            return {
                "status": "optimal" if status == pywraplp.Solver.OPTIMAL else "feasible",
                "objective_type": self.objective,
                "financials": {
                    "expected_revenue": round(rev, 2),
                    "expected_procurement_cost": round(proc_c, 2),
                    "expected_labor_cost": round(labor_c, 2),
                    "expected_waste_cost": round(waste_c, 2),
                    "expected_total_cost": round(proc_c + labor_c + waste_c, 2),
                    "expected_profit": round(profit, 2),
                    "roi_percentage": round((profit / (proc_c + labor_c + 1.0)) * 100, 2)
                },
                "decisions": {
                    "production_plan": opt_production,
                    "procurement_plan": opt_procurement,
                    "staffing_schedule_hours": opt_staffing
                }
            }
        else:
            return {
                "status": "infeasible",
                "message": "No feasible solution found under the current constraints."
            }
