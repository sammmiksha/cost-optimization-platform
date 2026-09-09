from typing import Dict, Any, List


class CompensationCalculator:
    """
    Compensation Model Builder supporting various payment models:
    - 'per_round': Payment per completed delivery/round trip (e.g. ₹1,000 / round for sand transport)
    - 'hourly': Payment per hour worked
    - 'per_shift': Fixed payment per shift
    - 'per_unit': Payment per unit produced/handled
    - 'monthly': Fixed monthly salary
    """

    @staticmethod
    def calculate_compensation(
        payment_model: str,
        rate: float,
        rounds_completed: float = 0.0,
        hours_worked: float = 0.0,
        shifts_worked: float = 0.0,
        units_produced: float = 0.0
    ) -> float:
        if payment_model == "per_round":
            return round(rounds_completed * rate, 2)
        elif payment_model == "hourly":
            return round(hours_worked * rate, 2)
        elif payment_model == "per_shift":
            return round(shifts_worked * rate, 2)
        elif payment_model == "per_unit":
            return round(units_produced * rate, 2)
        elif payment_model == "monthly":
            return round(rate, 2)
        else:
            return round(hours_worked * rate, 2)
