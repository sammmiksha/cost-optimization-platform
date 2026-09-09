from backend.app.business_models.unit_economics import UnitEconomicsCalculator
from backend.app.business_models.compensation import CompensationCalculator
from backend.app.industries.logistics.plugin import LogisticsTransportPlugin


def test_transport_sand_load_unit_economics():
    res = UnitEconomicsCalculator.calculate_transport_economics(
        material_cost=5000.0,
        distance_km=240.0,
        mileage_km_per_liter=3.0,
        fuel_price_per_liter=92.0,
        driver_pay_per_round=1000.0,
        toll_cost=800.0,
        loading_unloading_cost=800.0,
        maintenance_allocation=1000.0,
        quoted_customer_price=22000.0,
        target_margin_pct=25.0
    )

    cb = res["cost_breakdown"]
    assert cb["fuel_cost"] == 7360.0  # 80 liters * 92
    assert cb["total_direct_cost"] == 15960.0  # 5000 + 7360 + 1000 + 800 + 800 + 1000

    pm = res["profitability_metrics"]
    assert pm["gross_contribution"] == 6040.0  # 22000 - 15960
    assert pm["contribution_margin_percentage"] == 27.45

    pa = res["pricing_analysis"]
    assert pa["break_even_price"] == 15960.0


def test_apparel_designer_clothing_unit_economics():
    res = UnitEconomicsCalculator.calculate_apparel_economics(
        fabric_cost=40000.0,
        trimmings_cost=15000.0,
        tailoring_cost=20000.0,
        embroidery_cost=10000.0,
        packaging_marketing_cost=16000.0,
        platform_transport_fee=6000.0,
        batch_quantity=10,
        target_margin_pct=35.0
    )

    cb = res["cost_breakdown"]
    assert cb["total_batch_cost"] == 107000.0
    assert cb["cost_per_unit"] == 10700.0

    pa = res["pricing_analysis"]
    assert pa["break_even_unit_price"] == 10700.0
    assert pa["recommended_unit_price_35pct"] == 16461.54


def test_per_round_compensation():
    pay = CompensationCalculator.calculate_compensation(
        payment_model="per_round",
        rate=1000.0,
        rounds_completed=4
    )
    assert pay == 4000.0


def test_logistics_transport_plugin():
    plugin = LogisticsTransportPlugin()
    vehicles = [
        {"name": "Sand Truck 01", "mileage_km_l": 3.0, "driver_pay_per_round": 1000.0, "max_rounds_per_day": 2}
    ]
    routes = [
        {"name": "Sand Quarry -> Site A", "round_distance_km": 240.0, "quoted_price": 22000.0, "toll_cost": 800.0}
    ]

    res = plugin.solve_logistics_model(vehicles=vehicles, routes=routes, fuel_price_per_liter=92.0, days=1)
    assert res["status"] in ["OPTIMAL", "FEASIBLE"]
    assert res["financials"]["total_expected_contribution"] > 0
    assert len(res["assigned_trips"]) > 0
