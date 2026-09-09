from typing import Dict, List, Any
from copy import deepcopy
from backend.app.optimization.engine import BusinessOptimizationEngine


class ScenarioSimulator:
    """
    Scenario Simulation Engine ("What-If" Analysis).
    Runs comparative optimization runs to stress-test business decisions under changing market conditions.
    """

    def __init__(self, optimizer: BusinessOptimizationEngine):
        self.optimizer = optimizer

    def run_scenario(
        self,
        products: List[Dict[str, Any]],
        ingredients: List[Dict[str, Any]],
        employees: List[Dict[str, Any]],
        demand_forecast: Dict[str, List[float]],
        scenario_params: Dict[str, float],
        days: int = 1,
        constraints_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        scenario_params keys:
        - 'demand_multiplier': float (e.g. 1.20 for +20% demand)
        - 'supplier_cost_multiplier': float (e.g. 1.15 for +15% raw material cost)
        - 'wage_multiplier': float (e.g. 1.10 for +10% hourly wage)
        - 'budget_multiplier': float (e.g. 0.90 for -10% budget)
        """
        constraints_config = constraints_config or {}

        # 1. Compute baseline optimization
        baseline_result = self.optimizer.solve(
            products, ingredients, employees, demand_forecast, days=days, constraints_config=constraints_config
        )

        # 2. Apply scenario parameters to cloned data
        scen_products = deepcopy(products)
        scen_ingredients = deepcopy(ingredients)
        scen_employees = deepcopy(employees)
        scen_forecast = deepcopy(demand_forecast)
        scen_constraints = deepcopy(constraints_config)

        dem_mult = scenario_params.get("demand_multiplier", 1.0)
        cost_mult = scenario_params.get("supplier_cost_multiplier", 1.0)
        wage_mult = scenario_params.get("wage_multiplier", 1.0)
        bud_mult = scenario_params.get("budget_multiplier", 1.0)

        # Apply demand change
        if dem_mult != 1.0:
            for p_name in scen_forecast:
                scen_forecast[p_name] = [round(v * dem_mult, 1) for v in scen_forecast[p_name]]

        # Apply supplier raw material cost change
        if cost_mult != 1.0:
            for ing in scen_ingredients:
                ing["purchase_cost"] = round(ing.get("purchase_cost", 1.0) * cost_mult, 2)

        # Apply wage change
        if wage_mult != 1.0:
            for emp in scen_employees:
                emp["hourly_cost"] = round(emp.get("hourly_cost", 15.0) * wage_mult, 2)

        # Apply budget change
        if bud_mult != 1.0 and "budget_limit" in scen_constraints and scen_constraints["budget_limit"]:
            scen_constraints["budget_limit"] = round(scen_constraints["budget_limit"] * bud_mult, 2)

        # 3. Solve scenario optimization model
        scenario_result = self.optimizer.solve(
            scen_products, scen_ingredients, scen_employees, scen_forecast, days=days, constraints_config=scen_constraints
        )

        if scenario_result.get("status") == "infeasible":
            return {
                "status": "scenario_infeasible",
                "baseline": baseline_result,
                "scenario": scenario_result,
                "summary": "Scenario is infeasible under modified constraints."
            }

        # 4. Compute financial & operational diffs
        base_fin = baseline_result.get("financials", {})
        scen_fin = scenario_result.get("financials", {})

        profit_diff = scen_fin.get("expected_profit", 0.0) - base_fin.get("expected_profit", 0.0)
        cost_diff = scen_fin.get("expected_total_cost", 0.0) - base_fin.get("expected_total_cost", 0.0)
        revenue_diff = scen_fin.get("expected_revenue", 0.0) - base_fin.get("expected_revenue", 0.0)

        return {
            "status": "completed",
            "scenario_params": scenario_params,
            "baseline_financials": base_fin,
            "scenario_financials": scen_fin,
            "variance": {
                "delta_profit": round(profit_diff, 2),
                "delta_cost": round(cost_diff, 2),
                "delta_revenue": round(revenue_diff, 2),
                "profit_percentage_change": round((profit_diff / max(1.0, base_fin.get("expected_profit", 1.0))) * 100, 2)
            },
            "baseline_decisions": baseline_result.get("decisions", {}),
            "scenario_decisions": scenario_result.get("decisions", {})
        }
