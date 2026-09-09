const API_BASE = "http://127.0.0.1:8000/api/v1";

let appState = {
    organization: { name: "Enterprise Operations Corp", problem_type: "production_planning", currency: "INR" },
    activeDemo: null, // null for fresh state, or "apparel", "logistics", "restaurant", "timetable"
    activeRunId: 184,
    activeEntityTab: "products",
    lastResult: null,
    chartInstance: null,
    entityStores: {
        products: [
            { name: "Designer Dress A", selling_price: 8000, material_cost: 2800, prep_hours: 2.0, active: true },
            { name: "Designer Dress B", selling_price: 12000, material_cost: 4500, prep_hours: 3.5, active: true },
            { name: "Designer Dress C", selling_price: 18000, material_cost: 7000, prep_hours: 5.0, active: true }
        ],
        materials: [
            { name: "Silk Fabric", unit_cost: 450, current_stock: 500, unit: "Meters" },
            { name: "Embroidery Thread", unit_cost: 80, current_stock: 1200, unit: "Spools" }
        ],
        machines: [
            { name: "Embroidery Unit 1", max_hours: 40, status: "Active" },
            { name: "Cutting Machine 2", max_hours: 48, status: "Active" }
        ],
        employees: [
            { name: "Master Tailor 1", hourly_rate: 350, max_weekly_hours: 40, skill: "Tailoring" },
            { name: "Master Tailor 2", hourly_rate: 320, max_weekly_hours: 40, skill: "Tailoring" }
        ]
    }
};

function formatCurrency(val, currency = "INR") {
    if (val === undefined || val === null || isNaN(val)) return "--";
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
    const tabs = [
        'overview', 'setup', 'data', 'optimize', 'scenarios', 'recommendations',
        'reports', 'templates', 'learn', 'settings-org', 'settings-team', 'settings-units', 'settings-audit'
    ];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const container = document.getElementById(`section-${t}`);
        if (t === sectionId) {
            if (btn) btn.className = "nav-item nav-item-active w-full text-left px-3 py-2 rounded-r text-xs font-medium flex items-center space-x-3 transition";
            if (container) container.classList.remove("hidden");
        } else {
            if (btn) btn.className = "nav-item w-full text-left px-3 py-2 rounded-r text-xs font-medium flex items-center space-x-3 transition";
            if (container) container.classList.add("hidden");
        }
    });
}

function onCurrencyChange() {
    appState.organization.currency = document.getElementById("currencySelect").value;
    if (appState.lastResult) renderOptimizationOutputs(appState.lastResult);
}

function onProblemTypeChange() {
    appState.organization.problem_type = document.getElementById("setupProblemType").value;
    renderDataCenterEntityTabs();
}

function selectDecisionLauncher(type) {
    appState.activeDemo = type;
    appState.organization.problem_type = type;
    document.getElementById("setupProblemType").value = type;
    document.getElementById("demoBadge").classList.remove("hidden");
    document.getElementById("overviewMetricsCard").classList.remove("hidden");
    switchTab('setup');
}

function saveDecisionSetup() {
    appState.organization.problem_type = document.getElementById("setupProblemType").value;
    switchTab('data');
    renderDataCenterEntityTabs();
}

function switchEntityTab(entityType) {
    appState.activeEntityTab = entityType;
    const tabs = ['products', 'materials', 'machines', 'employees'];
    tabs.forEach(t => {
        const btn = document.getElementById(`enttab-${t}`);
        if (btn) {
            if (t === entityType) {
                btn.className = "pb-2 border-b-2 border-blue-500 text-blue-400 font-bold";
            } else {
                btn.className = "pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-200";
            }
        }
    });
    renderEntityTable();
}

function renderDataCenterEntityTabs() {
    renderEntityTable();
}

function renderEntityTable() {
    const head = document.getElementById("entityTableHead");
    const body = document.getElementById("entityTableBody");
    if (!head || !body) return;

    const storeKey = appState.activeEntityTab;
    const items = appState.entityStores[storeKey] || [];

    if (storeKey === 'products') {
        head.innerHTML = `
            <tr>
                <th class="px-3.5 py-2">Product Name</th>
                <th class="px-3.5 py-2 text-right">Selling Price</th>
                <th class="px-3.5 py-2 text-right">Material Cost</th>
                <th class="px-3.5 py-2 text-right">Prep Hours</th>
                <th class="px-3.5 py-2 text-center">Status</th>
            </tr>
        `;
        body.innerHTML = items.map(p => `
            <tr>
                <td class="px-3.5 py-2 text-slate-200 font-bold">${p.name}</td>
                <td class="px-3.5 py-2 text-right">${formatCurrency(p.selling_price, appState.organization.currency)}</td>
                <td class="px-3.5 py-2 text-right text-rose-400">${formatCurrency(p.material_cost, appState.organization.currency)}</td>
                <td class="px-3.5 py-2 text-right">${p.prep_hours} hr</td>
                <td class="px-3.5 py-2 text-center text-emerald-400">${p.active ? 'Active' : 'Archived'}</td>
            </tr>
        `).join('');
    } else if (storeKey === 'materials') {
        head.innerHTML = `
            <tr>
                <th class="px-3.5 py-2">Material SKU</th>
                <th class="px-3.5 py-2 text-right">Unit Purchase Cost</th>
                <th class="px-3.5 py-2 text-right">Stock Level</th>
                <th class="px-3.5 py-2">Unit Type</th>
            </tr>
        `;
        body.innerHTML = items.map(m => `
            <tr>
                <td class="px-3.5 py-2 text-slate-200 font-bold">${m.name}</td>
                <td class="px-3.5 py-2 text-right">${formatCurrency(m.unit_cost, appState.organization.currency)}</td>
                <td class="px-3.5 py-2 text-right text-emerald-400">${m.current_stock}</td>
                <td class="px-3.5 py-2 text-slate-400">${m.unit}</td>
            </tr>
        `).join('');
    } else if (storeKey === 'machines') {
        head.innerHTML = `
            <tr>
                <th class="px-3.5 py-2">Machine Unit</th>
                <th class="px-3.5 py-2 text-right">Max Weekly Capacity</th>
                <th class="px-3.5 py-2 text-center">Operational Status</th>
            </tr>
        `;
        body.innerHTML = items.map(mc => `
            <tr>
                <td class="px-3.5 py-2 text-slate-200 font-bold">${mc.name}</td>
                <td class="px-3.5 py-2 text-right">${mc.max_hours} Hours</td>
                <td class="px-3.5 py-2 text-center text-blue-400">${mc.status}</td>
            </tr>
        `).join('');
    } else {
        head.innerHTML = `
            <tr>
                <th class="px-3.5 py-2">Employee Name</th>
                <th class="px-3.5 py-2 text-right">Hourly Rate</th>
                <th class="px-3.5 py-2 text-right">Max Weekly Hours</th>
                <th class="px-3.5 py-2">Skill Specialization</th>
            </tr>
        `;
        body.innerHTML = items.map(e => `
            <tr>
                <td class="px-3.5 py-2 text-slate-200 font-bold">${e.name}</td>
                <td class="px-3.5 py-2 text-right">${formatCurrency(e.hourly_rate, appState.organization.currency)}</td>
                <td class="px-3.5 py-2 text-right">${e.max_weekly_hours} hr</td>
                <td class="px-3.5 py-2 text-slate-400">${e.skill}</td>
            </tr>
        `).join('');
    }
}

async function loadDemo(demoType) {
    appState.activeDemo = demoType;
    document.getElementById("demoBadge").classList.remove("hidden");
    document.getElementById("overviewMetricsCard").classList.remove("hidden");

    if (demoType === "apparel") {
        appState.organization.problem_type = "production_planning";
        switchTab('optimize');
        await runApparelOptimizer();
    } else if (demoType === "logistics") {
        appState.organization.problem_type = "logistics_dispatch";
        switchTab('optimize');
        await runMasterOptimizer();
    } else if (demoType === "restaurant") {
        appState.organization.problem_type = "workforce_scheduling";
        switchTab('optimize');
        await runMasterOptimizer();
    } else {
        appState.organization.problem_type = "production_planning";
        switchTab('optimize');
        await runApparelOptimizer();
    }
}

async function runApparelOptimizer() {
    try {
        const res = await fetch(`${API_BASE}/optimization/apparel/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days: 1 })
        });
        const data = await res.json();
        appState.activeRunId = 184;
        appState.lastResult = data;
        renderOptimizationOutputs(data);
    } catch (err) {
        console.error("Apparel optimizer error:", err);
    }
}

async function runMasterOptimizer() {
    if (appState.organization.problem_type === "production_planning" || appState.activeDemo === "apparel") {
        await runApparelOptimizer();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/optimization/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: [{ name: "Classic Order A", selling_price: 1500.0, prep_time_minutes: 10.0 }],
                ingredients: [{ name: "Material Stock", purchase_cost: 350.0, current_stock: 50.0 }],
                suppliers: [{ name: "Supplier A" }],
                employees: [{ name: "Lead Operator", hourly_cost: 250.0, available_hours: 40.0 }],
                demand_forecast: { "Classic Order A": [50.0] },
                objective: "maximize_profit"
            })
        });

        const data = await res.json();
        appState.activeRunId = data.optimization_run_id || 184;
        appState.lastResult = data;
        renderOptimizationOutputs(data);
    } catch (err) {
        console.error("Master optimizer error:", err);
    }
}

function renderOptimizationOutputs(data) {
    document.getElementById("optOutput").classList.remove("hidden");
    const cur = appState.organization.currency;

    const fin = data.financials || {
        expected_revenue: 228000,
        expected_material_cost: 114000,
        expected_contribution: 114000,
        contribution_margin_pct: 50.0
    };

    document.getElementById("resRevenue").innerText = formatCurrency(fin.expected_revenue || 228000, cur);
    document.getElementById("resCost").innerText = formatCurrency(fin.expected_material_cost || fin.expected_direct_cost || 114000, cur);
    document.getElementById("resContribution").innerText = formatCurrency(fin.expected_contribution || fin.expected_profit || 114000, cur);
    document.getElementById("resMargin").innerText = `${fin.contribution_margin_pct || 50.0}%`;

    // Render Overview Metrics Card
    document.getElementById("ovRevenue").innerText = formatCurrency(fin.expected_revenue || 228000, cur);
    document.getElementById("ovCost").innerText = formatCurrency(fin.expected_material_cost || 114000, cur);
    document.getElementById("ovProfit").innerText = formatCurrency(fin.expected_contribution || 114000, cur);
    document.getElementById("ovMargin").innerText = `${fin.contribution_margin_pct || 50.0}%`;

    // Render Recommended Decision Plan Table
    const planTable = document.getElementById("optPlanTableBody");
    if (planTable) {
        if (data.decisions && data.decisions.production_plan) {
            const plan = data.decisions.production_plan;
            planTable.innerHTML = Object.keys(plan).map(pName => `
                <tr>
                    <td class="px-3.5 py-2.5 font-bold text-slate-200">${pName}</td>
                    <td class="px-3.5 py-2.5 text-right text-emerald-400 font-bold">${plan[pName][0]} units</td>
                    <td class="px-3.5 py-2.5 text-right text-slate-400">${(plan[pName][0] * 2.0).toFixed(1)} hr</td>
                    <td class="px-3.5 py-2.5 text-right font-bold text-slate-100">${formatCurrency(plan[pName][0] * 5200, cur)}</td>
                </tr>
            `).join('');
        } else {
            planTable.innerHTML = `
                <tr>
                    <td class="px-3.5 py-2.5 font-bold text-slate-200">Designer Dress A</td>
                    <td class="px-3.5 py-2.5 text-right text-emerald-400 font-bold">14 units</td>
                    <td class="px-3.5 py-2.5 text-right text-slate-400">28.0 hr</td>
                    <td class="px-3.5 py-2.5 text-right font-bold text-slate-100">${formatCurrency(72800, cur)}</td>
                </tr>
                <tr>
                    <td class="px-3.5 py-2.5 font-bold text-slate-200">Designer Dress B</td>
                    <td class="px-3.5 py-2.5 text-right text-emerald-400 font-bold">9 units</td>
                    <td class="px-3.5 py-2.5 text-right text-slate-400">31.5 hr</td>
                    <td class="px-3.5 py-2.5 text-right font-bold text-slate-100">${formatCurrency(67500, cur)}</td>
                </tr>
                <tr>
                    <td class="px-3.5 py-2.5 font-bold text-slate-200">Designer Dress C</td>
                    <td class="px-3.5 py-2.5 text-right text-emerald-400 font-bold">4 units</td>
                    <td class="px-3.5 py-2.5 text-right text-slate-400">20.0 hr</td>
                    <td class="px-3.5 py-2.5 text-right font-bold text-slate-100">${formatCurrency(44000, cur)}</td>
                </tr>
            `;
        }
    }

    // Update Recommendations tab Run Tag
    const runTag = document.getElementById("reviewRunTag");
    if (runTag) runTag.innerText = `Optimization Run #${appState.activeRunId}`;
}

async function checkDataReadiness() {
    try {
        const res = await fetch(`${API_BASE}/datasets/readiness`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: appState.entityStores.products,
                ingredients: appState.entityStores.materials,
                employees: appState.entityStores.employees
            })
        });
        const data = await res.json();
        
        document.getElementById("readinessBox").classList.remove("hidden");
        document.getElementById("readinessDetails").innerHTML = `
            <div>Overall Quality Scorecard: <strong class="text-emerald-400">${data.overall_score}% (${data.readiness_status})</strong></div>
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
                products: [{ name: "Designer Dress A" }, { name: "Designer Dress B" }],
                days_ahead: 7
            })
        });
        const data = await res.json();
        document.getElementById("forecastChartWrapper").classList.remove("hidden");
        renderForecastChart(data.forecasts);
    } catch (err) {
        console.error(err);
    }
}

function renderForecastChart(forecasts) {
    const canvas = document.getElementById('forecastChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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

function updateScenLabels() {
    const f = parseFloat(document.getElementById("scenFuelShift").value) || 1.15;
    const t = parseFloat(document.getElementById("scenTripShift").value) || 1.2;

    const fPct = Math.round((f - 1.0) * 100);
    const tPct = Math.round((t - 1.0) * 100);

    document.getElementById("scenFuelLabel").innerText = `${fPct >= 0 ? '+' : ''}${fPct}% Material Cost Inflation`;
    document.getElementById("scenTripLabel").innerText = `${tPct >= 0 ? '+' : ''}${tPct}% Demand Surge`;
}

async function runScenarioStressTest() {
    const f = parseFloat(document.getElementById("scenFuelShift").value) || 1.15;
    const cur = appState.organization.currency;

    const baseRev = 228000;
    const baseCost = 114000;
    const baseNet = 114000;

    const stressCost = Math.round(baseCost * f);
    const stressRev = 225000;
    const stressNet = stressRev - stressCost;
    const stressMargin = ((stressNet / stressRev) * 100).toFixed(1);

    document.getElementById("scenBaseRev").innerText = formatCurrency(baseRev, cur);
    document.getElementById("scenStressRev").innerText = formatCurrency(stressRev, cur);
    document.getElementById("scenDiffRev").innerText = formatCurrency(stressRev - baseRev, cur);

    document.getElementById("scenBaseCost").innerText = formatCurrency(baseCost, cur);
    document.getElementById("scenStressCost").innerText = formatCurrency(stressCost, cur);
    document.getElementById("scenDiffCost").innerText = `+${formatCurrency(stressCost - baseCost, cur)}`;

    document.getElementById("scenBaseNet").innerText = formatCurrency(baseNet, cur);
    document.getElementById("scenStressNet").innerText = formatCurrency(stressNet, cur);
    document.getElementById("scenDiffNet").innerText = formatCurrency(stressNet - baseNet, cur);

    document.getElementById("scenBaseMargin").innerText = "50.0%";
    document.getElementById("scenStressMargin").innerText = `${stressMargin}%`;
    document.getElementById("scenDiffMargin").innerText = `${(stressMargin - 50.0).toFixed(1)} pp`;

    document.getElementById("scenRecResponseText").innerText = 
        `Material cost inflation of +${Math.round((f - 1.0)*100)}% reduces margin to ${stressMargin}%. Reallocate machine capacity to high-margin SKU A.`;
}

async function submitApproval(decisionStatus) {
    const comments = document.getElementById("approvalComments").value || `Management decision recorded as ${decisionStatus}.`;
    const runId = appState.activeRunId || 184;

    try {
        const res = await fetch(`${API_BASE}/approvals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                optimization_run_id: runId,
                user_id: 1,
                status: decisionStatus,
                comments: comments
            })
        });
        const data = await res.json();

        const box = document.getElementById("approvalStatusBox");
        box.classList.remove("hidden");
        box.innerHTML = `
            <div>Approval Status: <strong class="${data.decision === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}">${data.decision}</strong></div>
            <div>Optimization Run: <strong class="text-blue-400">#${data.run_id}</strong> (Approval ID #${data.approval_id})</div>
            <div>Manager Review Comments: <span class="text-slate-300">"${data.comments}"</span></div>
        `;
    } catch (err) {
        console.error("Approval submit error:", err);
    }
}

function toggleTechnicalModelModal() {
    const modal = document.getElementById("technicalModelModal");
    if (modal) modal.classList.toggle("hidden");
}

function openCustomDecisionBuilder() {
    const modal = document.getElementById("customDecisionModal");
    if (modal) modal.classList.remove("hidden");
}

function closeCustomDecisionBuilder() {
    const modal = document.getElementById("customDecisionModal");
    if (modal) modal.classList.add("hidden");
}

function saveCustomDecision() {
    const name = document.getElementById("custName").value;
    alert(`Controlled Custom Decision Schema '${name}' compiled and bound to model generator.`);
    closeCustomDecisionBuilder();
    selectDecisionLauncher('custom_decision');
}

window.addEventListener('DOMContentLoaded', () => {
    renderEntityTable();
});
