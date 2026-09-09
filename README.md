# Business Optimization Platform

A configurable enterprise decision-support platform that helps organizations understand their cost structures, analyze unit economics, forecast demand, evaluate operational choices, optimize resources, and determine more profitable business strategies.

---

## Workspace Navigation Workflow

```text
Set up your business model
        ↓
Add your costs & operations
        ↓
Analyze unit economics & target pricing
        ↓
Forecast demand where historical data exists
        ↓
Optimize resource allocations & procurement
        ↓
Stress-test what-if scenarios
        ↓
Review recommendations & submit approvals
```

---

## Core Capabilities

1. **Configurable Business Model Builder**: Separates Industry Template from Operating Model (e.g., Logistics Construction Material Haulage, Apparel Designer Clothing, Multi-Branch Casual Dining).
2. **Compensation Model Builder**: Supports Monthly Salary, Hourly Wage, Daily Rate, Per Shift, **Per Completed Round** (e.g., ₹1,000 / completed delivery round), Per Trip, Commission, and Custom rates.
3. **Unit Economics & Pricing Engine**: Calculates contribution margins, break-even prices, minimum viable prices, and recommended target prices even when no historical sales data exists (Guided Mode).
4. **Data Readiness Scorecard**: Evaluates 5 data quality metrics (Completeness, Validity, Consistency, Freshness, Uniqueness) prior to solver execution.
5. **Decoupled Optimization Engine**: Uses Google OR-Tools solvers (`CpSatAdapter` and `LinearMipAdapter`) to resolve resource allocations, shift scheduling, and multi-supplier procurement.
6. **Indian Numbering & Localization**: Supports Indian currency formatting (`₹1,25,000`, `₹12.50 lakh`, `₹1.25 crore`), GST %, TDS %, and metric/imperial units.
7. **Fact-Verified AI Explanation Engine**: Validates numeric claims in explanations against deterministic solver outputs before displaying recommendations.
8. **Human Plan Approvals & Audit Ledger**: Tracks plan review decisions (`APPROVED`, `REJECTED`) and system event logs.

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
│       ├── industries/       # Domain plugins (Logistics, Restaurant, Retail)
│       ├── optimization/     # CP-SAT & MIP solver adapters, sensitivity analysis
│       ├── recommendations/  # AI explanation engine & numerical fact verifier
│       └── main.py           # FastAPI application entrypoint
├── frontend/
│   ├── index.html            # Business Decision Workspace UI
│   └── app.js                # Frontend state management & API integration
├── tests/                    # Comprehensive Pytest automated test suites
├── roadmap.md                # Technical blueprint
└── README.md
```
