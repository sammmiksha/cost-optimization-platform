# KitchenOptima — Restaurant Operations & Cost Optimization Platform

Most restaurant owners guess when deciding how much food to order and how to staff each week. **KitchenOptima** turns your sales history, recipes, ingredient stock, and supplier costs into specific, explainable operational recommendations — saving thousands in food waste and labor overruns.

---

## What KitchenOptima Does

- **Smart Ingredient Ordering**: Calculates exact weekly procurement quantities based on menu demand, stock on hand, and supplier delivery lead times to eliminate food waste.
- **Optimal Kitchen & Staff Scheduling**: Matches prep cook, line cook, and server shift hours to projected dining demand spikes to prevent overtime overruns.
- **Recipe Margin & Food Cost Control**: Tracks your exact Food Cost % and Contribution Margin % across menu items as raw material prices shift.
- **Plain-English Explanations & Track Record**: Every recommendation includes a clear monetary rationale (e.g. *"Order 15% less chicken this week — demand is trending down and you are overstocked by 2 days. Estimated savings: $170"*), expandable *"Why we recommend this"* cards, and a track record of total savings.
- **Manual Overrides**: Restaurant managers maintain 100% control and can adjust order quantities or shift hours anytime without breaking the model.

---

## How It Works (3-Step Onboarding)

```text
  1. MENU & RECIPES                   2. INGREDIENTS & SUPPLIERS          3. STAFFING & SHIFTS
┌───────────────────────────────┐   ┌───────────────────────────────┐   ┌───────────────────────────────┐
│ Input menu item prices, prep  │ ──│ Manage stock levels, unit     │ ──│ Define cook & server shift    │
│ times, and ingredient recipes │   │ costs, and supplier lead time │   │ availability & hourly rates   │
└───────────────────────────────┘   └───────────────────────────────┘   └───────────────────────────────┘
                                                    │
                                                    ▼
                                    WEEKLY OPTIMIZED PLAN & SAVINGS
```

---

## For Developers

KitchenOptima is built on a clean Python FastAPI architecture with OR-Tools mathematical solvers and dynamic demand forecasting.

### Tech Stack
- **Backend API**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy ORM
- **Optimization Engine**: Google OR-Tools (CP-SAT solver adapter for shift scheduling & linear MIP for multi-supplier ingredient procurement)
- **Forecasting Layer**: Time-series demand prediction with confidence bounds
- **Database & Security**: PostgreSQL / SQLite, JWT authentication, tenant-scoped data models (`restaurant_id`)
- **Frontend**: Vanilla JS / HTML5, Tailwind CSS, Chart.js

### Quick Start

1. **Install Dependencies**:
   ```bash
   pip install ortools pandas numpy scikit-learn fastapi uvicorn pydantic pydantic-settings sqlalchemy pytest pyjwt
   ```

2. **Start Backend API Server**:
   ```bash
   python -m uvicorn backend.app.main:app --reload --port 8000
   ```
   Interactive API documentation: `http://127.0.0.1:8000/docs`

3. **Open Business Workspace**:
   Open `frontend/index.html` in any web browser.

4. **Run Automated Test Suite**:
   ```bash
   python -m pytest tests/ -v
   ```

---

## Repository Architecture

```text
├── backend/
│   └── app/
│       ├── api/v1/           # Auth, CSV import router, forecasting, optimization, approvals
│       ├── business_models/  # Unit economics calculator, compensation models, pricing analysis
│       ├── core/             # Security, JWT tokens, configuration settings
│       ├── data_platform/    # Quality scorecard, CSV parser, data validation
│       ├── db/               # SQLAlchemy ORM schemas (tenant-scoped by restaurant_id)
│       ├── forecasting/      # Time-series demand forecaster with confidence bounds
│       ├── industries/       # Restaurant domain plugin & solvers
│       ├── optimization/     # DecisionProblemBuilder & OR-Tools solver adapters (CP-SAT / MIP)
│       ├── recommendations/  # Recommendation explainer & numerical fact verifier
│       └── main.py           # FastAPI application entrypoint
├── frontend/
│   ├── index.html            # KitchenOptima Workspace UI
│   └── app.js                # Frontend state management & API integration
├── tests/                    # 21+ Pytest automated integration test suite
└── README.md
```
