from typing import Dict, List, Any


class InfeasibilityAnalyzer:
    """
    Analyzes why an optimization run is infeasible and provides precise diagnostic feedback
    and actionable managerial suggestions (Constraint Infeasibility Analysis).
    """

    @staticmethod
    def diagnose(
        products: List[Dict[str, Any]],
        ingredients: List[Dict[str, Any]],
        employees: List[Dict[str, Any]],
        demand_forecast: Dict[str, List[float]],
        days: int = 1,
        constraints_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        constraints_config = constraints_config or {}
        bottlenecks = []
        recommendations = []

        # 1. Kitchen Capacity Check
        total_demanded_prep_minutes = 0.0
        for p in products:
            p_name = p["name"]
            daily_dem = sum(demand_forecast.get(p_name, [50.0])) / max(1, days)
            total_demanded_prep_minutes += daily_dem * p.get("prep_time_minutes", 10.0)

        total_staff_hours = sum(emp.get("available_hours", 40.0) for emp in employees) / max(1, days)
        total_staff_minutes = total_staff_hours * 60.0

        if total_demanded_prep_minutes > total_staff_minutes:
            diff_hours = round((total_demanded_prep_minutes - total_staff_minutes) / 60.0, 1)
            bottlenecks.append({
                "type": "kitchen_capacity_shortfall",
                "severity": "HIGH",
                "detail": f"Demanded product prep time ({round(total_demanded_prep_minutes/60, 1)} hrs/day) exceeds available staff hours ({round(total_staff_hours, 1)} hrs/day) by {diff_hours} hours."
            })
            recommendations.append(f"Increase staff availability by at least {diff_hours} hours/day or adjust product prep efficiency.")

        # 2. Budget Shortfall Check
        budget = constraints_config.get("budget_limit")
        if budget and budget > 0:
            # Estimate minimal cost required to satisfy demand
            min_proc_cost = 0.0
            for p in products:
                p_name = p["name"]
                daily_dem = sum(demand_forecast.get(p_name, [50.0])) / max(1, days)
                reqs = p.get("ingredient_requirements", {})
                for ing_name, qty in reqs.items():
                    # Find ingredient price
                    ing_cost = next((i.get("purchase_cost", 1.0) for i in ingredients if i["name"] == ing_name), 1.0)
                    min_proc_cost += daily_dem * qty * ing_cost

            min_labor_cost = sum(emp.get("hourly_cost", 15.0) * (emp.get("available_hours", 40.0)/days) for emp in employees)
            min_total_cost = min_proc_cost + min_labor_cost

            if min_total_cost > budget:
                shortfall = round(min_total_cost - budget, 2)
                bottlenecks.append({
                    "type": "budget_shortfall",
                    "severity": "HIGH",
                    "detail": f"Required baseline operational cost (${round(min_total_cost, 2)}) exceeds budget limit (${budget}) by ${shortfall}."
                })
                recommendations.append(f"Increase budget limit by at least ${shortfall} or reduce raw material procurement targets.")

        # 3. Minimum Staffing Conflict Check
        min_staff_hours = constraints_config.get("min_daily_staff_hours", 8.0)
        if total_staff_hours < min_staff_hours:
            bottlenecks.append({
                "type": "staffing_shortage",
                "severity": "MEDIUM",
                "detail": f"Total scheduled employee hours ({round(total_staff_hours, 1)} hrs) is less than the minimum required staffing constraint ({min_staff_hours} hrs)."
            })
            recommendations.append("Hire additional staff or raise maximum shift hour limits.")

        if not bottlenecks:
            bottlenecks.append({
                "type": "complex_coupling",
                "severity": "MEDIUM",
                "detail": "Over-constrained combination of simultaneous inventory, budget, and labor parameters."
            })
            recommendations.append("Try relaxing the budget limit or kitchen prep time constraints slightly.")

        return {
            "status": "infeasible_analysis",
            "bottlenecks": bottlenecks,
            "suggested_actions": recommendations
        }
