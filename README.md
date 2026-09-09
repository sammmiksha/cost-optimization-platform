# Configurable Business Decision & Optimization Platform

Turn your business constraints, resources, costs, operational rules, and goals into an optimal feasible operating plan.

---

## The Core Promise

> **"Define your business rules, resources, costs, constraints, and goals. The platform automatically generates the optimal feasible operating decision."**

The platform answers critical operational questions:
- Which products should we produce? How many? On which day?
- Which employee should work on which shift?
- Which machine should produce what?
- Which supplier should we purchase from?
- Which vehicle should make which trip?
- How much inventory should we hold?
- At what price should we sell to achieve target margins?
- What is the most profitable feasible schedule?

---

## Workspace Navigation Workflow

```text
Select Decision Problem Template (Production, Workforce, Logistics, Pricing)
        ↓
Configure Business Operating Rules & Costs
        ↓
Analyze Unit Economics & Target Pricing Tiers
        ↓
Evaluate Data Quality Readiness Scorecard
        ↓
Generate Demand Forecasts (Optional Prediction Layer)
        ↓
Execute Mathematical Solver (CP-SAT / MIP Model Generator)
        ↓
Evaluate What-If Scenarios & Parametric Sensitivity
        ↓
Review Actionable Decisions & Submit Human Manager Approval
```

---

## Flagship Demonstration Models

1. **Designer Clothing (Apparel Production Planning)**: Optimizes production mix of Dress A, B, C under tailor hours (16h), designer hours (6h), embroidery machine limits (5h), and fabric bounds $\rightarrow$ Expected Contribution: ₹79,100 (+18.6% improvement vs un-optimized baseline).
2. **Construction Sand Transport (Logistics & Dispatch)**: Per-round driver pay (₹1,000/round), fuel mileage (3 km/L @ ₹92/L), vehicle payload bounds $\rightarrow$ Net Contribution: ₹6,040/round (27.45% margin).
3. **Multi-Branch Restaurant (Workforce & Kitchen Production)**: Multi-supplier purchasing ($y_{i,s,t}$) and cook shift scheduling ($h_{e,k,m,t}$).

---

## Quick Start

### 1. Install Dependencies
```bash
pip install ortools pandas numpy scikit-learn fastapi uvicorn pydantic pydantic-settings sqlalchemy pytest pyjwt
```

### 2. Start Backend API Server
```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```
Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### 3. Open Business Workspace
Open `frontend/index.html` directly in any web browser.

### 4. Run Automated Test Suites
```bash
python -m pytest tests/
```

---

## Repository Structure

```text
├── backend/
│   └── app/
│       ├── api/v1/           # Authentication, Datasets, Forecasting, Optimization, Approvals
│       ├── business_models/  # Unit economics calculator, compensation models, pricing analysis
│       ├── core/             # Configuration and security settings
│       ├── data_platform/    # Data ingestion, validation, quality scorecard, versioning
│       ├── db/               # PostgreSQL / SQLite ORM entities & session management
│       ├── forecasting/      # Time-series demand forecasting engines
│       ├── industries/       # Domain plugins (Apparel, Logistics, Restaurant, Retail)
│       ├── optimization/     # DecisionProblemBuilder model generator, CP-SAT & MIP solver adapters
│       ├── recommendations/  # AI explanation engine & numerical fact verifier
│       └── main.py           # FastAPI application entrypoint
├── frontend/
│   ├── index.html            # Business Decision Workspace UI
│   └── app.js                # Frontend state management & API integration
├── tests/                    # Comprehensive Pytest automated test suites
├── roadmap.md                # Technical blueprint
└── README.md
```
