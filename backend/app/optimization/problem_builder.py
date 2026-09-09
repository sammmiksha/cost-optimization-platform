from typing import Dict, List, Any
from backend.app.optimization.solver_adapter import LinearMipAdapter, CpSatAdapter


class DecisionProblemBuilder:
    """
    Dynamic Model Generator. Formulates decision variables, operational bounds,
    and objectives dynamically based on the selected Decision Problem Template.
    """

    def build_and_solve_problem(
        self,
        problem_type: str,  # 'production_planning', 'workforce_scheduling', 'logistics_dispatch', 'unit_economics'
        domain_data: Dict[str, Any],
        objective_choice: str = "maximize_profit",
        days: int = 1
    ) -> Dict[str, Any]:
        if problem_type == "production_planning":
            return self._solve_production_planning(domain_data, objective_choice, days)
        elif problem_type == "workforce_scheduling":
            return self._solve_workforce_scheduling(domain_data, objective_choice, days)
        else:
            return self._solve_production_planning(domain_data, objective_choice, days)

    def _solve_production_planning(
        self,
        domain_data: Dict[str, Any],
        objective_choice: str,
        days: int
    ) -> Dict[str, Any]:
        adapter = LinearMipAdapter()
        products = domain_data.get("products", [])
        resources = domain_data.get("resources", {})

        # Decision Variables: x[p, t] = production volume of dress/item p on day t
        x_vars = {}
        for p in products:
            p_name = p["name"]
            max_bound = p.get("max_demand", 20)
            for t in range(days):
                x_vars[(p_name, t)] = adapter.create_int_var(0, max_bound, f"x_{p_name}_{t}")

        # Constraint 1: Fabric Material Capacity (meters)
        fabric_available = resources.get("fabric_meters", 500.0)
        for t in range(days):
            total_fabric_used = sum(x_vars[(p["name"], t)] * p.get("material_cost", 2000.0) / 100.0 for p in products)
            adapter.add_constraint(total_fabric_used <= fabric_available)

        # Constraint 2: Tailor Labor Hours Limit
        tailor_hours_available = resources.get("tailor_hours", 16.0)
        for t in range(days):
            total_tailor_hours = sum(x_vars[(p["name"], t)] * p.get("prep_time_hours", 5.0) for p in products)
            adapter.add_constraint(total_tailor_hours <= tailor_hours_available)

        # Constraint 3: Designer Capacity Limit
        designer_hours_available = resources.get("designer_hours", 6.0)
        for t in range(days):
            total_designer_hours = sum(x_vars[(p["name"], t)] * (p.get("prep_time_hours", 5.0) * 0.3) for p in products)
            adapter.add_constraint(total_designer_hours <= designer_hours_available)

        # Constraint 4: Embroidery Machine Capacity Limit
        embroidery_hours_available = resources.get("embroidery_hours", 5.0)
        for t in range(days):
            total_embroidery_hours = sum(x_vars[(p["name"], t)] * p.get("embroidery_hours", 1.0) for p in products)
            adapter.add_constraint(total_embroidery_hours <= embroidery_hours_available)

        # Objective Function: Maximize Net Expected Contribution
        total_revenue = sum(x_vars[(p["name"], t)] * p.get("selling_price", 10000.0) for p in products for t in range(days))
        total_material_cost = sum(x_vars[(p["name"], t)] * p.get("material_cost", 3000.0) for p in products for t in range(days))
        
        adapter.set_objective(total_revenue - total_material_cost, maximize=True)
        res = adapter.solve(time_limit_seconds=60)

        if res["status"] in ["OPTIMAL", "FEASIBLE"]:
            vals = res["solution_values"]
            prod_plan = {p["name"]: [int(vals.get(f"x_{p['name']}_{t}", 0)) for t in range(days)] for p in products}
            
            rev = sum(prod_plan[p["name"]][t] * p.get("selling_price", 10000.0) for p in products for t in range(days))
            mat_c = sum(prod_plan[p["name"]][t] * p.get("material_cost", 3000.0) for p in products for t in range(days))
            profit = rev - mat_c

            return {
                "status": res["status"],
                "problem_type": "production_planning",
                "financials": {
                    "expected_revenue": round(rev, 2),
                    "expected_material_cost": round(mat_c, 2),
                    "expected_contribution": round(profit, 2),
                    "contribution_margin_pct": round((profit / max(1.0, rev)) * 100, 2)
                },
                "decisions": {
                    "production_plan": prod_plan
                }
            }
        else:
            return {"status": "INFEASIBLE", "message": "No feasible production plan found."}

    def _solve_workforce_scheduling(
        self,
        domain_data: Dict[str, Any],
        objective_choice: str,
        days: int
    ) -> Dict[str, Any]:
        adapter = LinearMipAdapter()
        employees = domain_data.get("employees", [])
        shifts = ["Morning", "Afternoon", "Evening"]

        h_vars = {}
        for idx, emp in enumerate(employees):
            e_name = emp.get("name", f"Emp_{idx}")
            avail = emp.get("available_hours", 40.0) / max(1, days)
            for m in shifts:
                for t in range(days):
                    h_vars[(e_name, m, t)] = adapter.create_num_var(0.0, avail / len(shifts), f"h_{e_name}_{m}_{t}")

        # Minimize Labor Cost
        total_wage_cost = sum(
            h_vars[(emp.get("name", f"Emp_{idx}"), m, t)] * emp.get("hourly_cost", 20.0)
            for idx, emp in enumerate(employees) for m in shifts for t in range(days)
        )
        adapter.set_objective(total_wage_cost, maximize=False)
        res = adapter.solve(time_limit_seconds=60)

        if res["status"] in ["OPTIMAL", "FEASIBLE"]:
            return {
                "status": res["status"],
                "problem_type": "workforce_scheduling",
                "financials": {"total_labor_cost": round(res["objective_value"], 2)},
                "decisions": {"schedule_status": "Optimal shift schedule generated."}
            }
        else:
            return {"status": "INFEASIBLE", "message": "Infeasible workforce schedule."}
