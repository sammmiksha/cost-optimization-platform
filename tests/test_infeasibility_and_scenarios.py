from backend.app.optimization.engine import BusinessOptimizationEngine
from backend.app.optimization.infeasibility import InfeasibilityAnalyzer
from backend.app.scenarios.simulator import ScenarioSimulator
from backend.app.optimization.network import MultiBranchNetworkOptimizer


def test_infeasibility_and_diagnosis():
    products = [{"name": "Burger", "selling_price": 10.0, "prep_time_minutes": 120.0}]  # 120 mins prep!
    ingredients = [{"name": "Beef", "purchase_cost": 5.0, "current_stock": 0.0}]
    employees = [{"name": "Solo Cook", "hourly_cost": 15.0, "available_hours": 2.0}]  # only 2 hours available!
    forecast = {"Burger": [100.0]}  # 100 burgers requested

    diagnosis = InfeasibilityAnalyzer.diagnose(products, ingredients, employees, forecast, days=1)
    assert diagnosis["status"] == "infeasible_analysis"
    assert len(diagnosis["bottlenecks"]) > 0
    assert any(b["type"] == "kitchen_capacity_shortfall" for b in diagnosis["bottlenecks"])


def test_scenario_simulator():
    products = [{"name": "Burger", "selling_price": 12.0, "prep_time_minutes": 10.0, "ingredient_requirements": {"Beef": 0.2}}]
    ingredients = [{"name": "Beef", "purchase_cost": 5.0, "current_stock": 50.0}]
    employees = [{"name": "Chef Mario", "hourly_cost": 20.0, "available_hours": 40.0}]
    forecast = {"Burger": [50.0]}

    engine = BusinessOptimizationEngine(objective="maximize_profit")
    simulator = ScenarioSimulator(optimizer=engine)

    res = simulator.run_scenario(
        products, ingredients, employees, forecast,
        scenario_params={"demand_multiplier": 1.20, "supplier_cost_multiplier": 1.15},
        days=1
    )
    assert res["status"] == "completed"
    assert "variance" in res
    assert "delta_profit" in res["variance"]


def test_network_optimizer():
    net_opt = MultiBranchNetworkOptimizer()
    branches = [
        {"name": "Mumbai", "stock": 500, "demand": 100},  # 400 excess
        {"name": "Pune", "stock": 50, "demand": 300}     # 250 shortage
    ]
    matrix = {"Mumbai": {"Pune": 2.0}, "Pune": {"Mumbai": 2.0}}
    res = net_opt.solve_network_transfers(branches, matrix, unit_procurement_cost=10.0)

    assert res["status"] == "optimal"
    assert len(res["recommended_transfers"]) == 1
    assert res["recommended_transfers"][0]["from_branch"] == "Mumbai"
    assert res["recommended_transfers"][0]["to_branch"] == "Pune"
