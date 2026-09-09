from abc import ABC, abstractmethod
from typing import Dict, List, Any, Tuple


class IndustryModel(ABC):

    @abstractmethod
    def get_schema(self) -> Dict[str, Any]:
        """Returns entity definitions, schema expectations, and measurement units."""
        pass

    @abstractmethod
    def validate_domain_data(self, data: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]]]:
        """Validates business domain constraints (recipe bounds, supplier minimums)."""
        pass

    @abstractmethod
    def get_supported_objectives(self) -> List[str]:
        """Returns supported objectives: maximize_profit, minimize_cost, minimize_waste, etc."""
        pass

    @abstractmethod
    def build_decision_variables(self, solver_adapter: Any, horizon_days: int) -> Dict[str, Any]:
        """Creates continuous and integer variables (y[i,s,t], x[p,t], h[e,k,m,t], u[p,t])."""
        pass

    @abstractmethod
    def build_constraints(self, solver_adapter: Any, variables: Dict[str, Any], config: Dict[str, Any]) -> None:
        """Constructs lead-time, supplier capacity, shift/skill, and kitchen capacity constraints."""
        pass

    @abstractmethod
    def build_objective(self, solver_adapter: Any, variables: Dict[str, Any], objective_type: str) -> None:
        """Builds objective function including unmet demand penalties and supplier costs."""
        pass

    @abstractmethod
    def calculate_kpis(self, solution_values: Dict[str, Any]) -> Dict[str, float]:
        """Calculates Revenue, Procurement Cost, Labor Cost, Waste Cost, Net Profit, and ROI %."""
        pass

    @abstractmethod
    def generate_action_items(self, solution_values: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generates concrete operational actions (e.g. Purchase 400kg from Supplier A)."""
        pass

    @abstractmethod
    def explain_decision_context(self, solution_values: Dict[str, Any]) -> Dict[str, Any]:
        """Constructs structured JSON payload for explanation and guardrail engines."""
        pass
