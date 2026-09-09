from backend.app.data_platform.quality import DataQualityEvaluator
from backend.app.recommendations.guardrails import FactVerificationGuardrail


def test_data_quality_evaluator():
    products = [{"name": "Burger", "selling_price": 12.0}]
    ingredients = [{"name": "Beef", "current_stock": 50.0}]
    employees = [{"name": "Alice", "hourly_cost": 20.0}]

    scorecard = DataQualityEvaluator.evaluate_dataset_quality(products, ingredients, employees)
    assert scorecard["overall_score"] >= 80.0
    assert scorecard["readiness_status"] == "READY"


def test_fact_verification_guardrail():
    financials = {
        "expected_profit": 14800.0,
        "expected_revenue": 51200.0
    }
    
    valid_text = "The recommended plan yields an expected profit of $14,800.00 with optimal labor efficiency."
    verified, msg = FactVerificationGuardrail.verify_explanation(valid_text, financials)
    assert verified is True

    hallucinated_text = "The recommended plan yields an expected profit of $99,999.00 with low cost."
    verified_hallucinated, msg_hallucinated = FactVerificationGuardrail.verify_explanation(hallucinated_text, financials)
    assert verified_hallucinated is False
