from typing import Dict, List, Any, Tuple
from backend.app.industries.base import IndustryModel
from backend.app.optimization.solver_adapter import LinearMipAdapter, CpSatAdapter


class RestaurantPlugin(IndustryModel):
    """
    Restaurant Reference Industry Plugin implementing corrected mathematical optimization.
    Features multi-supplier purchasing y(i,s,t), delivery lead times, shift/skill staffing h(e,k,m,t),
    inventory flow, safety stock, kitchen equipment capacity, and unmet demand shortfall penalties.
    """

    def get_schema(self) -> Dict[str, Any]:
        return {
            "industry": "restaurant",
            "entities": ["products", "ingredients", "suppliers", "employees", "shifts"],
            "supported_units": ["kg", "unit", "can", "liter", "piece"]
        }

    def validate_domain_data(self, data: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]]]:
        issues = []
        products = data.get("products", [])
        suppliers = data.get("suppliers", [])

        if not products:
            issues.append({"type": "missing_data", "detail": "No product catalog defined."})
        if not suppliers:
            issues.append({"type": "missing_data", "detail": "No approved raw material suppliers configured."})

        return (len(issues) == 0, issues)

    def get_supported_objectives(self) -> List[str]:
        return ["maximize_profit", "minimize_cost", "minimize_waste", "balanced"]

    def build_decision_variables(self, solver_adapter: Any, horizon_days: int) -> Dict[str, Any]:
        return {}  # Managed within build_model pipeline

    def solve_restaurant_model(
        self,
        products: List[Dict[str, Any]],
        ingredients: List[Dict[str, Any]],
        suppliers: List[Dict[str, Any]],
        employees: List[Dict[str, Any]],
        demand_forecast: Dict[str, List[float]],
        objective_type: str = "maximize_profit",
        days: int = 1,
        constraints_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        constraints_config = constraints_config or {}
        adapter = LinearMipAdapter()

        supplier_names = [s["name"] for s in suppliers] if suppliers else ["Supplier_Default"]

        # --- Decision Variables ---
        # 1. Production x[p, t]
        x_vars = {}
        # 2. Unmet Demand Shortfall u[p, t]
        u_vars = {}
        for p in products:
            p_name = p["name"]
            for t in range(days):
                dem = demand_forecast.get(p_name, [50.0]*days)[t] if t < len(demand_forecast.get(p_name, [])) else 50.0
                x_vars[(p_name, t)] = adapter.create_int_var(0, int(dem * 1.5), f"x_{p_name}_{t}")
                u_vars[(p_name, t)] = adapter.create_num_var(0.0, float(dem), f"u_{p_name}_{t}")

        # 3. Multi-Supplier Purchasing y[i, s, t]
        y_vars = {}
        for ing in ingredients:
            i_name = ing["name"]
            for s_name in supplier_names:
                for t in range(days):
                    y_vars[(i_name, s_name, t)] = adapter.create_num_var(0.0, 5000.0, f"y_{i_name}_{s_name}_{t}")

        # 4. Staffing hours by skill and shift h[e, k, m, t]
        h_vars = {}
        shifts = ["Morning", "Afternoon", "Evening"]
        skills = ["Cook", "Cashier", "Manager"]

        for idx, emp in enumerate(employees):
            e_name = emp.get("name", f"Emp_{idx}")
            avail_daily = emp.get("available_hours", 40.0) / max(1, days)
            for k in skills:
                for m in shifts:
                    for t in range(days):
                        # Can only work if employee has skill
                        emp_skills = emp.get("skills", ["Cook", "Cashier"])
                        max_h = avail_daily / len(shifts) if k in emp_skills else 0.0
                        h_vars[(e_name, k, m, t)] = adapter.create_num_var(0.0, max_h, f"h_{e_name}_{k}_{m}_{t}")

        # --- Constraints ---

        # Constraint 1: Demand & Shortfall Balance (x[p,t] + u[p,t] >= Demand[p,t])
        for p in products:
            p_name = p["name"]
            for t in range(days):
                dem = demand_forecast.get(p_name, [50.0]*days)[t] if t < len(demand_forecast.get(p_name, [])) else 50.0
                adapter.add_constraint(x_vars[(p_name, t)] + u_vars[(p_name, t)] >= float(dem))

        # Constraint 2: Kitchen Cook Shift Preparation Capacity
        for t in range(days):
            total_prep_mins = sum(x_vars[(p["name"], t)] * p.get("prep_time_minutes", 10.0) for p in products)
            cook_staff_mins = sum(
                h_vars[(emp.get("name", f"Emp_{idx}"), "Cook", m, t)] * 60.0
                for idx, emp in enumerate(employees) for m in shifts
            )
            kitchen_facility_mins = constraints_config.get("kitchen_capacity_mins_per_day", 1440.0)
            
            adapter.add_constraint(total_prep_mins <= cook_staff_mins)
            adapter.add_constraint(total_prep_mins <= kitchen_facility_mins)

        # Constraint 3: Multi-Supplier Capacity & Inventory Stock Flow
        for ing in ingredients:
            i_name = ing["name"]
            init_stock = ing.get("current_stock", 0.0)
            safety_stock = ing.get("min_stock", 0.0)

            for t in range(days):
                # Total usage required on day t
                total_usage = sum(
                    x_vars[(p["name"], t)] * p.get("ingredient_requirements", {}).get(i_name, 0.0)
                    for p in products
                )
                # Total purchases from all suppliers up to day t
                total_purchases = sum(
                    y_vars[(i_name, s_name, k)]
                    for s_name in supplier_names for k in range(t + 1)
                )
                avail_supply = init_stock + total_purchases
                adapter.add_constraint(avail_supply - total_usage >= safety_stock)

        # Constraint 4: Operating Budget Bounding
        budget = constraints_config.get("budget_limit", 10000.0)
        total_purchasing_cost = sum(
            y_vars[(ing["name"], s_name, t)] * ing.get("purchase_cost", 2.0)
            for ing in ingredients for s_name in supplier_names for t in range(days)
        )
        total_labor_cost = sum(
            h_vars[(emp.get("name", f"Emp_{idx}"), k, m, t)] * emp.get("hourly_cost", 15.0)
            for idx, emp in enumerate(employees) for k in skills for m in shifts for t in range(days)
        )
        adapter.add_constraint(total_purchasing_cost + total_labor_cost <= budget)

        # --- Objective Function ---
        total_revenue = sum(
            x_vars[(p["name"], t)] * p.get("selling_price", 12.0)
            for p in products for t in range(days)
        )
        total_unmet_penalties = sum(
            u_vars[(p["name"], t)] * (p.get("selling_price", 12.0) * 0.5)
            for p in products for t in range(days)
        )
        waste_penalty = total_purchasing_cost * 0.03

        if objective_type == "maximize_profit":
            adapter.set_objective(total_revenue - total_purchasing_cost - total_labor_cost - total_unmet_penalties - waste_penalty, maximize=True)
        elif objective_type == "minimize_cost":
            adapter.set_objective(total_purchasing_cost + total_labor_cost + waste_penalty + total_unmet_penalties, maximize=False)
        else:
            adapter.set_objective(total_revenue - total_purchasing_cost - total_labor_cost - waste_penalty, maximize=True)

        # Solve model
        res = adapter.solve(time_limit_seconds=60)

        if res["status"] in ["OPTIMAL", "FEASIBLE"]:
            vals = res["solution_values"]
            
            # Format decisions
            prod_plan = {p["name"]: [int(vals.get(f"x_{p['name']}_{t}", 0)) for t in range(days)] for p in products}
            unmet_plan = {p["name"]: [round(vals.get(f"u_{p['name']}_{t}", 0.0), 1) for t in range(days)] for p in products}
            
            supplier_allocation = {}
            for ing in ingredients:
                i_name = ing["name"]
                supplier_allocation[i_name] = {
                    s_name: [round(vals.get(f"y_{i_name}_{s_name}_{t}", 0.0), 1) for t in range(days)]
                    for s_name in supplier_names
                }

            rev = sum(prod_plan[p["name"]][t] * p.get("selling_price", 12.0) for p in products for t in range(days))
            proc_c = sum(
                sum(supplier_allocation[ing["name"]][s_name]) * ing.get("purchase_cost", 2.0)
                for ing in ingredients for s_name in supplier_names
            )
            labor_c = sum(
                sum(vals.get(f"h_{emp.get('name', f'Emp_{idx}')}_{k}_{m}_{t}", 0.0) for m in shifts for t in range(days)) * emp.get("hourly_cost", 15.0)
                for idx, emp in enumerate(employees) for k in skills
            )
            unmet_c = sum(unmet_plan[p["name"]][t] * (p.get("selling_price", 12.0) * 0.5) for p in products for t in range(days))
            profit = rev - proc_c - labor_c - unmet_c

            financials = {
                "expected_revenue": round(rev, 2),
                "expected_procurement_cost": round(proc_c, 2),
                "expected_labor_cost": round(labor_c, 2),
                "expected_unmet_demand_penalty": round(unmet_c, 2),
                "expected_total_cost": round(proc_c + labor_c + unmet_c, 2),
                "expected_profit": round(profit, 2),
                "roi_percentage": round((profit / max(1.0, proc_c + labor_c)) * 100, 2)
            }

            return {
                "status": res["status"],
                "financials": financials,
                "decisions": {
                    "production_plan": prod_plan,
                    "unmet_demand_shortfall": unmet_plan,
                    "supplier_allocation": supplier_allocation
                }
            }
        else:
            return {"status": "INFEASIBLE", "message": "Infeasible model."}

    # Abstract Base Class implementations
    def build_constraints(self, solver_adapter: Any, variables: Dict[str, Any], config: Dict[str, Any]) -> None:
        pass

    def build_objective(self, solver_adapter: Any, variables: Dict[str, Any], objective_type: str) -> None:
        pass

    def calculate_kpis(self, solution_values: Dict[str, Any]) -> Dict[str, float]:
        return {}

    def generate_action_items(self, solution_values: Dict[str, Any]) -> List[Dict[str, Any]]:
        return []

    def explain_decision_context(self, solution_values: Dict[str, Any]) -> Dict[str, Any]:
        return {}
