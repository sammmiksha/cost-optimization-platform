const API_BASE = "http://127.0.0.1:8000/api/v1";

let appState = {
    organization: { name: "Enterprise Operations Corp", industry: "logistics", operating_model: "Construction Material Haulage", currency: "INR" },
    unitEcon: null,
    forecasts: {},
    chartInstance: null
};

function formatCurrency(val, currency = "INR") {
    if (currency === "INR") {
        if (val >= 10000000) {
            return `₹${(val / 10000000).toFixed(2)} Crore`;
        } else if (val >= 100000) {
            return `₹${(val / 100000).toFixed(2)} Lakh`;
        } else {
            return `₹${val.toLocaleString('en-IN')}`;
        }
    } else {
        return `$${val.toLocaleString('en-US')}`;
    }
}

function switchTab(sectionId) {
    const sections = ['overview', 'setup', 'data', 'forecast', 'unit-econ', 'optimize', 'scenarios', 'recommendations', 'learn'];
    sections.forEach(s => {
        const btn = document.getElementById(`tab-${s}`);
        const container = document.getElementById(`section-${s}`);
        if (s === sectionId) {
            btn.className = "nav-item nav-item-active w-full text-left px-3.5 py-2.5 rounded-r text-xs font-medium flex items-center space-x-3 transition";
            container.classList.remove("hidden");
        } else {
            btn.className = "nav-item w-full text-left px-3.5 py-2.5 rounded-r text-xs font-medium flex items-center space-x-3 transition";
            container.classList.add("hidden");
        }
    });
}

function onCurrencyChange() {
    appState.organization.currency = document.getElementById("currencySelect").value;
    if (appState.unitEcon) {
        renderOverviewMetrics();
    }
}

function onSetupTemplateChange() {
    const ind = document.getElementById("setupIndustry").value;
    const modelInput = document.getElementById("setupOperatingModel");
    if (ind === "logistics") modelInput.value = "Construction Material Haulage (Sand Transport)";
    else if (ind === "apparel") modelInput.value = "Small-Batch Designer Clothing";
    else if (ind === "restaurant") modelInput.value = "Multi-Branch Casual Dining";
    else modelInput.value = "Chain Supermarket Retail";
}

function saveBusinessSetup() {
    appState.organization.industry = document.getElementById("setupIndustry").value;
    appState.organization.operating_model = document.getElementById("setupOperatingModel").value;
    switchTab('unit-econ');
    calculateUnitEconomics();
}

async function calculateUnitEconomics() {
    const mat = parseFloat(document.getElementById("ueMaterial").value) || 5000;
    const dist = parseFloat(document.getElementById("ueDistance").value) || 240;
    const fuelP = parseFloat(document.getElementById("ueFuelPrice").value) || 92;
    const driverPay = parseFloat(document.getElementById("ueDriverPay").value) || 1000;
    const tolls = parseFloat(document.getElementById("ueTolls").value) || 1600;
    const price = parseFloat(document.getElementById("ueQuotedPrice").value) || 22000;

    try {
        const res = await fetch(`${API_BASE}/business/unit-economics/transport`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                material_cost: mat,
                distance_km: dist,
                mileage_km_per_liter: 3.0,
                fuel_price_per_liter: fuelP,
                driver_pay_per_round: driverPay,
                toll_cost: tolls / 2.0,
                loading_unloading_cost: tolls / 2.0,
                maintenance_allocation: 1000.0,
                quoted_customer_price: price,
                target_margin_pct: 25.0
            })
        });

        const data = await res.json();
        appState.unitEcon = data;

        document.getElementById("unitEconOutput").classList.remove("hidden");
        document.getElementById("ueBreakEven").innerText = formatCurrency(data.pricing_analysis.break_even_price, appState.organization.currency);
        document.getElementById("ueDirectCost").innerText = formatCurrency(data.cost_breakdown.total_direct_cost, appState.organization.currency);
        document.getElementById("ueContribution").innerText = formatCurrency(data.profitability_metrics.gross_contribution, appState.organization.currency);
        document.getElementById("ueRecommended").innerText = formatCurrency(data.pricing_analysis.recommended_price_target, appState.organization.currency);

        renderOverviewMetrics();
    } catch (err) {
        console.error(err);
    }
}

function renderOverviewMetrics() {
    if (!appState.unitEcon) return;
    const data = appState.unitEcon;
    const cur = appState.organization.currency;

    document.getElementById("ovRevenue").innerText = formatCurrency(data.profitability_metrics.quoted_customer_price, cur);
    document.getElementById("ovCost").innerText = formatCurrency(data.cost_breakdown.total_direct_cost, cur);
    document.getElementById("ovProfit").innerText = formatCurrency(data.profitability_metrics.gross_contribution, cur);
    document.getElementById("ovMargin").innerText = `${data.profitability_metrics.contribution_margin_percentage}%`;
}

async function checkDataReadiness() {
    try {
        const res = await fetch(`${API_BASE}/datasets/readiness`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: [{ name: "Sand Load", selling_price: 22000 }],
                ingredients: [{ name: "Diesel", current_stock: 500 }],
                employees: [{ name: "Driver 01", hourly_cost: 1000 }]
            })
        });
        const data = await res.json();
        
        document.getElementById("readinessBox").classList.remove("hidden");
        document.getElementById("readinessDetails").innerHTML = `
            <div>Overall Quality Score: <strong class="text-emerald-400">${data.overall_score}% (${data.readiness_status})</strong></div>
            <div>Completeness: ${data.metrics.completeness}% | Validity: ${data.metrics.validity}% | Freshness: ${data.metrics.freshness}%</div>
        `;
    } catch (err) {
        console.error(err);
    }
}

async function generateForecasts() {
    try {
        const res = await fetch(`${API_BASE}/forecasting/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: [{ name: "Sand Load (20T)" }],
                days_ahead: 7
            })
        });
        const data = await res.json();
        renderForecastChart(data.forecasts);
    } catch (err) {
        console.error(err);
    }
}

function renderForecastChart(forecasts) {
    const ctx = document.getElementById('forecastChartCanvas').getContext('2d');
    if (appState.chartInstance) appState.chartInstance.destroy();

    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const datasets = Object.keys(forecasts).map(name => ({
        label: name,
        data: forecasts[name],
        borderColor: '#2563eb',
        borderWidth: 2,
        fill: false,
        tension: 0.3
    }));

    appState.chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: days, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
            scales: {
                x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 } } },
                y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 } } }
            }
        }
    });
}

async function runMasterOptimizer() {
    try {
        const res = await fetch(`${API_BASE}/optimization/logistics/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vehicles: [{ name: "Sand Truck 01", mileage_km_l: 3.0, driver_pay_per_round: 1000.0, max_rounds_per_day: 2 }],
                routes: [{ name: "Sand Quarry -> Customer Site", round_distance_km: 240.0, quoted_price: 22000.0, toll_cost: 800.0 }],
                fuel_price_per_liter: 92.0,
                days: 1
            })
        });

        const data = await res.json();
        document.getElementById("optOutput").classList.remove("hidden");

        const fin = data.financials;
        const cur = appState.organization.currency;
        document.getElementById("optSummaryText").innerText = `Optimal schedule completed ${fin.total_trips_scheduled} rounds generating expected net contribution of ${formatCurrency(fin.total_expected_contribution, cur)}.`;
        
        document.getElementById("optActionList").innerHTML = data.assigned_trips.map(t => 
            `<li>Assign ${t.vehicle} to ${t.route} for ${t.rounds_completed} rounds (Revenue: ${formatCurrency(t.revenue, cur)}, Net Contribution: ${formatCurrency(t.net_contribution, cur)})</li>`
        ).join('');
    } catch (err) {
        console.error(err);
    }
}

function updateScenLabels() {
    const f = document.getElementById("scenFuelShift").value;
    const t = document.getElementById("scenTripShift").value;

    const fPct = Math.round((f - 1.0) * 100);
    const tPct = Math.round((t - 1.0) * 100);

    document.getElementById("scenFuelLabel").innerText = `${fPct >= 0 ? '+' : ''}${fPct}% Diesel Price Variance`;
    document.getElementById("scenTripLabel").innerText = `${tPct >= 0 ? '+' : ''}${tPct}% Trip Volume Variance`;
}

async function runScenarioStressTest() {
    calculateUnitEconomics();
}

async function submitApproval(decisionStatus) {
    try {
        const res = await fetch(`${API_BASE}/approvals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                optimization_run_id: 184,
                user_id: 1,
                status: decisionStatus,
                comments: `Management decision recorded as ${decisionStatus}.`
            })
        });
        const data = await res.json();

        const box = document.getElementById("approvalStatusBox");
        box.classList.remove("hidden");
        box.innerText = `Approval Decision Recorded: ${data.decision} (Run ID #${data.run_id})`;
    } catch (err) {
        console.error(err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    calculateUnitEconomics();
});
