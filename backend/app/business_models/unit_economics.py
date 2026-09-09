from typing import Dict, List, Any


class UnitEconomicsCalculator:
    """
    Unit Economics & Pricing Analysis Engine.
    Operates even when no historical sales ML data exists (Guided Mode).
    Computes direct cost per load/unit, gross contribution, contribution margin %,
    break-even price, minimum viable price, and recommended price.
    """

    @staticmethod
    def calculate_transport_economics(
        material_cost: float = 5000.0,
        distance_km: float = 240.0,
        mileage_km_per_liter: float = 3.0,
        fuel_price_per_liter: float = 92.0,
        driver_pay_per_round: float = 1000.0,
        toll_cost: float = 800.0,
        loading_unloading_cost: float = 800.0,
        maintenance_allocation: float = 1000.0,
        quoted_customer_price: float = 22000.0,
        target_margin_pct: float = 25.0
    ) -> Dict[str, Any]:
        # 1. Fuel Cost Calculation
        fuel_liters = distance_km / max(0.1, mileage_km_per_liter)
        fuel_cost = fuel_liters * fuel_price_per_liter

        # 2. Total Direct Trip Cost
        total_direct_cost = (
            material_cost +
            fuel_cost +
            driver_pay_per_round +
            toll_cost +
            loading_unloading_cost +
            maintenance_allocation
        )

        # 3. Margin Analysis
        gross_contribution = quoted_customer_price - total_direct_cost
        contribution_margin_pct = (gross_contribution / max(1.0, quoted_customer_price)) * 100.0

        # 4. Pricing Tiers Calculation
        break_even_price = total_direct_cost
        min_viable_price = total_direct_cost / (1.0 - 0.15)  # 15% target margin
        recommended_price = total_direct_cost / (1.0 - (target_margin_pct / 100.0))  # e.g. 25% target margin
        premium_price = total_direct_cost / (1.0 - 0.35)  # 35% premium margin

        return {
            "operating_model": "Construction Material Haulage (Sand Transport)",
            "cost_breakdown": {
                "material_purchase_cost": round(material_cost, 2),
                "fuel_cost": round(fuel_cost, 2),
                "fuel_liters_used": round(fuel_liters, 1),
                "driver_compensation": round(driver_pay_per_round, 2),
                "toll_expenses": round(toll_cost, 2),
                "loading_unloading": round(loading_unloading_cost, 2),
                "maintenance_allocation": round(maintenance_allocation, 2),
                "total_direct_cost": round(total_direct_cost, 2)
            },
            "profitability_metrics": {
                "quoted_customer_price": round(quoted_customer_price, 2),
                "gross_contribution": round(gross_contribution, 2),
                "contribution_margin_percentage": round(contribution_margin_pct, 2)
            },
            "pricing_analysis": {
                "break_even_price": round(break_even_price, 2),
                "minimum_viable_price_15pct": round(min_viable_price, 2),
                "recommended_price_target": round(recommended_price, 2),
                "premium_price_35pct": round(premium_price, 2)
            }
        }

    @staticmethod
    def calculate_apparel_economics(
        fabric_cost: float = 40000.0,
        trimmings_cost: float = 15000.0,  # Buttons, lining, accessories
        tailoring_cost: float = 20000.0,
        embroidery_cost: float = 10000.0,
        packaging_marketing_cost: float = 16000.0,
        platform_transport_fee: float = 6000.0,
        batch_quantity: int = 10,
        target_margin_pct: float = 35.0
    ) -> Dict[str, Any]:
        total_batch_cost = (
            fabric_cost + trimmings_cost + tailoring_cost +
            embroidery_cost + packaging_marketing_cost + platform_transport_fee
        )
        cost_per_unit = total_batch_cost / max(1, batch_quantity)

        recommended_unit_price = cost_per_unit / (1.0 - (target_margin_pct / 100.0))

        return {
            "operating_model": "Small-Batch Designer Clothing",
            "batch_quantity": batch_quantity,
            "cost_breakdown": {
                "raw_materials_total": round(fabric_cost + trimmings_cost, 2),
                "production_labor_total": round(tailoring_cost + embroidery_cost, 2),
                "overhead_marketing_total": round(packaging_marketing_cost + platform_transport_fee, 2),
                "total_batch_cost": round(total_batch_cost, 2),
                "cost_per_unit": round(cost_per_unit, 2)
            },
            "pricing_analysis": {
                "break_even_unit_price": round(cost_per_unit, 2),
                "recommended_unit_price_35pct": round(recommended_unit_price, 2),
                "batch_expected_revenue": round(recommended_unit_price * batch_quantity, 2),
                "batch_expected_profit": round((recommended_unit_price * batch_quantity) - total_batch_cost, 2)
            }
        }
