from typing import Dict, List, Any


class RetailIndustryPlugin:
    """
    Industry Plugin for Retail operations.
    Handles reorder points, holding costs, safety stock, lead times, and stockout penalty calculations.
    """

    @staticmethod
    def calculate_retail_metrics(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        processed = []
        for p in products:
            lead_time_days = p.get("lead_time_days", 3)
            daily_demand = p.get("average_daily_demand", 20.0)
            safety_stock = p.get("safety_stock", daily_demand * 0.5)

            reorder_point = (daily_demand * lead_time_days) + safety_stock
            holding_cost_per_unit = p.get("holding_cost_daily", p.get("selling_price", 10.0) * 0.001)

            processed.append({
                **p,
                "lead_time_days": lead_time_days,
                "reorder_point": round(reorder_point, 1),
                "safety_stock": round(safety_stock, 1),
                "holding_cost_daily": round(holding_cost_per_unit, 4)
            })

        return processed
