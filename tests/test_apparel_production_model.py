from backend.app.industries.apparel.plugin import ApparelDesignerPlugin
from backend.app.optimization.problem_builder import DecisionProblemBuilder


def test_apparel_designer_production_planning():
    plugin = ApparelDesignerPlugin()
    res = plugin.solve_apparel_model()

    assert res["status"] in ["OPTIMAL", "FEASIBLE"]
    assert "financials" in res
    assert res["financials"]["expected_contribution"] > 0
    assert "production_plan" in res["decisions"]

    # Verify optimal production decision mix
    plan = res["decisions"]["production_plan"]
    assert "Dress A" in plan
    assert "Dress B" in plan
    assert "Dress C" in plan


def test_decision_problem_builder_production():
    builder = DecisionProblemBuilder()
    domain_data = {
        "products": [
            {"name": "Item 1", "selling_price": 100.0, "material_cost": 30.0, "prep_time_hours": 2.0},
            {"name": "Item 2", "selling_price": 200.0, "material_cost": 80.0, "prep_time_hours": 4.0}
        ],
        "resources": {
            "fabric_meters": 200.0,
            "tailor_hours": 10.0
        }
    }

    res = builder.build_and_solve_problem("production_planning", domain_data)
    assert res["status"] in ["OPTIMAL", "FEASIBLE"]
    assert res["financials"]["expected_contribution"] > 0
