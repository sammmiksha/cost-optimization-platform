from typing import Dict, List, Any
from copy import deepcopy
from backend.app.industries.restaurant.plugin import RestaurantPlugin


class ParametricSensitivityAnalyzer:
    """
    Parametric Sensitivity Analyzer. Generates sensitivity matrices evaluating parameter
    thresholds where operational decisions (e.g., supplier selection, staffing) switch.
    """

    def __init__(self, plugin: RestaurantPlugin):
        self.plugin = plugin

    def analyze_supplier_sensitivity(
        self,
        products: List[Dict[str, Any]],
        ingredients: List[Dict[str, Any]],
        suppliers: List[Dict[str, Any]],
        employees: List[Dict[str, Any]],
        demand_forecast: Dict[str, List[float]],
        variances: List[float] = [-0.10, 0.0, 0.10, 0.20]
    ) -> Dict[str, Any]:
        matrix = []
        baseline_supplier = None

        for var in variances:
            scen_ingredients = deepcopy(ingredients)
            for ing in scen_ingredients:
                ing["purchase_cost"] = round(ing.get("purchase_cost", 2.0) * (1.0 + var), 2)

            res = self.plugin.solve_restaurant_model(
                products=products,
                ingredients=scen_ingredients,
                suppliers=suppliers,
                employees=employees,
                demand_forecast=demand_forecast,
                days=1
            )

            if res["status"] in ["OPTIMAL", "FEASIBLE"]:
                fin = res["financials"]
                alloc = res["decisions"]["supplier_allocation"]
                matrix.append({
                    "price_variance_pct": f"{int(var * 100):+d}%",
                    "expected_profit": fin["expected_profit"],
                    "total_cost": fin["expected_total_cost"],
                    "supplier_allocation": alloc
                })

        return {
            "parameter": "Supplier Price Variance",
            "sensitivity_matrix": matrix,
            "stability": "HIGH" if len(matrix) >= 3 else "MEDIUM"
        }
