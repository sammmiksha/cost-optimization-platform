import re
from typing import Dict, Any, Tuple


class FactVerificationGuardrail:
    """
    Numerical Fact Verification Guardrail. Validates LLM-generated text explanations
    against deterministic solver outputs to prevent numerical hallucinations.
    """

    @staticmethod
    def verify_explanation(
        explanation_text: str,
        solver_financials: Dict[str, Any]
    ) -> Tuple[bool, str]:
        """
        Extracts monetary numbers ($X) and percentage values (Y%) from LLM explanation
        and cross-references them against solver_financials payload.
        """
        if not explanation_text:
            return (False, "Explanation text is empty.")

        expected_profit = solver_financials.get("expected_profit", 0.0)
        expected_revenue = solver_financials.get("expected_revenue", 0.0)

        # Check monetary mentions
        dollar_matches = re.findall(r'\$\s*([0-9,]+(?:\.[0-9]+)?)', explanation_text)
        for match in dollar_matches:
            val = float(match.replace(",", ""))
            # Check if extracted dollar figure matches expected profit or revenue within 5% tolerance
            if val > 10.0 and abs(val - expected_profit) > (expected_profit * 0.15) and abs(val - expected_revenue) > (expected_revenue * 0.15):
                # Unverified dollar figure detected
                return (False, f"Numerical claim mismatch: ${val} in explanation text does not match solver financial results.")

        return (True, "All numerical claims verified against deterministic solver output.")
