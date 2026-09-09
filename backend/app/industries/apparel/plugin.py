from typing import Dict, List, Any, Tuple
from backend.app.industries.base import IndustryModel
from backend.app.optimization.problem_builder import DecisionProblemBuilder


class ApparelDesignerPlugin(IndustryModel):
    """
    Apparel Designer Clothing Domain Plugin (Flagship Demo 1).
    Models small-batch production planning for designer dresses (Dress A, Dress B, Dress C)
    under fabric stock, tailor hours, designer hours, and embroidery machine capacity limits.
    """

    def get_schema(self) -> Dict[str, Any]:
        return {
            "industry": "apparel",
            "operating_model": "small_batch_designer_clothing",
            "entities": ["products", "fabric", "tailors", "designers", "machines"],
            "supported_units": ["piece", "meter", "hour"]
        }

    def validate_domain_data(self, data: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]]]:
        issues = []
        if not data.get("products"):
            issues.append({"type": "missing_data", "detail": "No clothing products catalog defined."})
        return (len(issues) == 0, issues)

    def get_supported_objectives(self) -> List[str]:
        return ["maximize_profit", "minimize_material_waste", "balanced"]

    def build_decision_variables(self, solver_adapter: Any, horizon_days: int) -> Dict[str, Any]:
        return {}

    def solve_apparel_model(
        self,
        products: List[Dict[str, Any]] = None,
        resources: Dict[str, Any] = None,
        days: int = 1
    ) -> Dict[str, Any]:
        products = products or [
            {"name": "Dress A", "selling_price": 8000.0, "material_cost": 2800.0, "prep_time_hours": 5.0, "embroidery_hours": 0.5, "max_demand": 10},
            {"name": "Dress B", "selling_price": 12000.0, "material_cost": 4500.0, "prep_time_hours": 8.0, "embroidery_hours": 1.0, "max_demand": 10},
            {"name": "Dress C", "selling_price": 18000.0, "material_cost": 7000.0, "prep_time_hours": 12.0, "embroidery_hours": 2.0, "max_demand": 5}
        ]

        resources = resources or {
            "fabric_meters": 500.0,
            "tailor_hours": 16.0,      # Tailor 1 (8h) + Tailor 2 (8h)
            "designer_hours": 6.0,     # Designer (6h)
            "embroidery_hours": 5.0    # Embroidery machine (5h)
        }

        builder = DecisionProblemBuilder()
        domain_data = {"products": products, "resources": resources}
        return builder.build_and_solve_problem("production_planning", domain_data, objective_choice="maximize_profit", days=days)

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
