from typing import Dict, List, Any, Tuple
from backend.app.industries.base import IndustryModel
from backend.app.optimization.solver_adapter import LinearMipAdapter


class LogisticsTransportPlugin(IndustryModel):
    """
    Logistics Construction Material Transport Domain Plugin.
    Models per-round driver compensation, vehicle load capacities (tonnes),
    fuel consumption per km, toll costs, and multi-trip route optimization.
    """

    def get_schema(self) -> Dict[str, Any]:
        return {
            "industry": "logistics",
            "operating_model": "construction_material_transport",
            "entities": ["vehicles", "materials", "drivers", "routes", "trips"],
            "supported_units": ["tonne", "load", "km", "liter", "round"]
        }

    def validate_domain_data(self, data: Dict[str, Any]) -> Tuple[bool, List[Dict[str, Any]]]:
        issues = []
        if not data.get("vehicles"):
            issues.append({"type": "missing_data", "detail": "No transport vehicles configured."})
        return (len(issues) == 0, issues)

    def get_supported_objectives(self) -> List[str]:
        return ["maximize_contribution", "minimize_fuel_cost", "maximize_trips"]

    def build_decision_variables(self, solver_adapter: Any, horizon_days: int) -> Dict[str, Any]:
        return {}

    def solve_logistics_model(
        self,
        vehicles: List[Dict[str, Any]],
        routes: List[Dict[str, Any]],
        fuel_price_per_liter: float = 92.0,
        days: int = 1
    ) -> Dict[str, Any]:
        adapter = LinearMipAdapter()

        # Decision Variables: trips[v, r, t] = number of completed rounds by vehicle v on route r on day t
        trip_vars = {}
        for v in vehicles:
            v_name = v.get("name", "Truck_01")
            for r in routes:
                r_name = r.get("name", "Route_Default")
                for t in range(days):
                    trip_vars[(v_name, r_name, t)] = adapter.create_int_var(0, 5, f"trips_{v_name}_{r_name}_{t}")

        # Constraints: Maximum rounds per day per vehicle (e.g. 2 rounds max due to distance)
        for v in vehicles:
            v_name = v.get("name", "Truck_01")
            for t in range(days):
                adapter.add_constraint(
                    sum(trip_vars[(v_name, r["name"], t)] for r in routes) <= v.get("max_rounds_per_day", 2)
                )

        # Objective Function: Maximize Net Contribution (Quote - Fuel - Driver Pay - Toll - Maintenance)
        net_contribution_expr = sum(
            trip_vars[(v["name"], r["name"], t)] * (
                r.get("quoted_price", 22000.0) -
                ((r.get("round_distance_km", 240.0) / max(0.1, v.get("mileage_km_l", 3.0))) * fuel_price_per_liter) -
                v.get("driver_pay_per_round", 1000.0) -
                r.get("toll_cost", 800.0) -
                1800.0  # Loading/Unloading + Maintenance allocation
            )
            for v in vehicles for r in routes for t in range(days)
        )

        adapter.set_objective(net_contribution_expr, maximize=True)
        res = adapter.solve(time_limit_seconds=60)

        if res["status"] in ["OPTIMAL", "FEASIBLE"]:
            vals = res["solution_values"]
            assigned_trips = []
            total_net_profit = 0.0

            for v in vehicles:
                v_name = v["name"]
                for r in routes:
                    r_name = r["name"]
                    for t in range(days):
                        count = int(vals.get(f"trips_{v_name}_{r_name}_{t}", 0))
                        if count > 0:
                            trip_cost = (
                                (r.get("round_distance_km", 240.0) / max(0.1, v.get("mileage_km_l", 3.0))) * fuel_price_per_liter +
                                v.get("driver_pay_per_round", 1000.0) + r.get("toll_cost", 800.0) + 1800.0
                            )
                            revenue = count * r.get("quoted_price", 22000.0)
                            total_cost = count * trip_cost
                            contribution = revenue - total_cost
                            total_net_profit += contribution

                            assigned_trips.append({
                                "vehicle": v_name,
                                "route": r_name,
                                "rounds_completed": count,
                                "revenue": round(revenue, 2),
                                "operating_cost": round(total_cost, 2),
                                "net_contribution": round(contribution, 2)
                            })

            return {
                "status": res["status"],
                "financials": {
                    "total_expected_contribution": round(total_net_profit, 2),
                    "total_trips_scheduled": sum(t["rounds_completed"] for t in assigned_trips)
                },
                "assigned_trips": assigned_trips
            }
        else:
            return {"status": "INFEASIBLE", "message": "Infeasible transport model."}

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
