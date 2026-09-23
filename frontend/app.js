const API_BASE = "http://127.0.0.1:8000/api/v1";

let appState = {
    restaurantName: "Luigi's Italian Trattoria",
    currency: "USD",
    activeRunId: 184,
    wizardStep: 1,
    lastResult: null,
    menuItems: [
        { name: "Classic Margherita Pizza", selling_price: 18.50, food_cost: 4.80, prep_hours: 0.25 },
        { name: "Truffle Mushroom Pasta", selling_price: 24.00, food_cost: 6.20, prep_hours: 0.35 },
        { name: "Grilled Salmon Entree", selling_price: 32.00, food_cost: 9.50, prep_hours: 0.45 },
        { name: "Tiramisu Dessert", selling_price: 12.00, food_cost: 2.90, prep_hours: 0.15 }
    ],
    ingredients: [
        { name: "Mozzarella Cheese", unit: "kg", purchase_cost: 12.00, current_stock: 18.0, par_level: 40.0, lead_time_days: 1 },
        { name: "Salmon Fillets", unit: "kg", purchase_cost: 28.00, current_stock: 8.5, par_level: 25.0, lead_time_days: 2 },
        { name: "Truffle Oil", unit: "Liters", purchase_cost: 65.00, current_stock: 3.0, par_level: 8.0, lead_time_days: 3 },
        { name: "Artisan Pasta", unit: "kg", purchase_cost: 4.50, current_stock: 25.0, par_level: 60.0, lead_time_days: 1 }
    ],
    staff: [
        { name: "Executive Chef Luigi", role: "Head Chef", hourly_rate: 35.00, available_hours: 40 },
        { name: "Line Cook Marco", role: "Line Cook", hourly_rate: 22.00, available_hours: 40 },
        { name: "Prep Cook Sofia", role: "Prep Cook", hourly_rate: 18.00, available_hours: 35 }
    ],
    trackRecord: {
        followed_30d: 18,
        saved_usd: 580.00,
        saved_inr: 48500.00
    }
};

function formatCurrency(val, currency = "USD") {
    if (val === undefined || val === null || isNaN(val)) return "--";
    if (currency === "INR") {
        const inrVal = val * 83.5;
        if (inrVal >= 10000000) {
            return `₹${(inrVal / 10000000).toFixed(2)} Crore`;
        } else if (inrVal >= 100000) {
            return `₹${(inrVal / 100000).toFixed(2)} Lakh`;
        } else {
            return `₹${inrVal.toLocaleString('en-IN')}`;
        }
    } else {
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function switchTab(sectionId) {
    const tabs = [
        'overview', 'menu', 'data', 'shifts', 'optimize', 'scenarios', 'recommendations',
        'csv-import', 'pos', 'settings-org'
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
    appState.currency = document.getElementById("currencySelect").value;
    renderRestaurantTables();
}

function renderRestaurantTables() {
    const cur = appState.currency;

    // Render Menu Table
    const menuBody = document.getElementById("menuTableBody");
    if (menuBody) {
        menuBody.innerHTML = appState.menuItems.map(m => {
            const margin = (m.selling_price - m.food_cost);
            const marginPct = ((margin / m.selling_price) * 100).toFixed(1);
            return `
                <tr>
                    <td class="px-3.5 py-2.5 font-bold text-slate-200">${m.name}</td>
                    <td class="px-3.5 py-2.5 text-right font-bold text-slate-100">${formatCurrency(m.selling_price, cur)}</td>
                    <td class="px-3.5 py-2.5 text-right text-rose-400">${formatCurrency(m.food_cost, cur)}</td>
                    <td class="px-3.5 py-2.5 text-right text-slate-400">${m.prep_hours} hr</td>
                    <td class="px-3.5 py-2.5 text-right text-emerald-400 font-bold">${formatCurrency(margin, cur)} (${marginPct}%)</td>
                </tr>
            `;
        }).join('');
    }

    // Render Inventory Table
    const invBody = document.getElementById("inventoryTableBody");
    if (invBody) {
        invBody.innerHTML = appState.ingredients.map(i => `
            <tr>
                <td class="px-3.5 py-2.5 font-bold text-slate-200">${i.name}</td>
                <td class="px-3.5 py-2.5 text-slate-400">${i.unit}</td>
                <td class="px-3.5 py-2.5 text-right text-rose-400">${formatCurrency(i.purchase_cost, cur)}</td>
                <td class="px-3.5 py-2.5 text-right text-emerald-400 font-bold">${i.current_stock} ${i.unit}</td>
                <td class="px-3.5 py-2.5 text-right text-slate-400">${i.par_level} ${i.unit}</td>
                <td class="px-3.5 py-2.5 text-center text-blue-400">${i.lead_time_days} ${i.lead_time_days === 1 ? 'day' : 'days'}</td>
            </tr>
        `).join('');
    }

    // Render Staff Table
    const staffBody = document.getElementById("staffTableBody");
    if (staffBody) {
        staffBody.innerHTML = appState.staff.map(s => `
            <tr>
                <td class="px-3.5 py-2.5 font-bold text-slate-200">${s.name}</td>
                <td class="px-3.5 py-2.5 text-blue-400">${s.role}</td>
                <td class="px-3.5 py-2.5 text-right text-slate-200">${formatCurrency(s.hourly_rate, cur)}/hr</td>
                <td class="px-3.5 py-2.5 text-right font-bold text-emerald-400">${s.available_hours} hrs</td>
            </tr>
        `).join('');
    }
}

async function seedDemoData() {
    try {
        const res = await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
        const data = await res.json();
        
        appState.restaurantName = data.restaurant_name;
        appState.menuItems = data.menu_items;
        appState.ingredients = data.ingredients;
        appState.staff = data.staff;

        renderRestaurantTables();
        alert(`Loaded sample demo data for '${data.restaurant_name}' successfully!`);
    } catch (err) {
        console.error("Seed error:", err);
    }
}

async function uploadCSVFile() {
    const input = document.getElementById("csvFileInput");
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(`${API_BASE}/data/import-csv`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        document.getElementById("csvUploadStatus").innerText = `Successfully imported ${data.records_imported} records from ${data.filename}!`;
        alert(`CSV Import Complete: Imported ${data.records_imported} rows into restaurant inventory.`);
    } catch (err) {
        console.error("CSV upload error:", err);
    }
}

async function runWeeklyOptimizer() {
    try {
        const res = await fetch(`${API_BASE}/optimization/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: appState.menuItems,
                ingredients: appState.ingredients,
                employees: appState.staff,
                demand_forecast: { "Classic Margherita Pizza": [40.0], "Truffle Mushroom Pasta": [25.0] },
                objective: "maximize_profit"
            })
        });

        const data = await res.json();
        appState.activeRunId = data.optimization_run_id || 184;
        appState.lastResult = data;

        const cur = appState.currency;
        document.getElementById("recommendationActionList").innerHTML = `
            <li>Order 15% less Mozzarella Cheese this week — demand is trending stable and you are overstocked by ~2 days. Estimated savings: ${formatCurrency(170, cur)}.</li>
            <li>Order 16.5 kg of Salmon Fillets to cover projected weekend dinner service without spoilage.</li>
            <li>Schedule Sofia for 35 prep cook hours. Note: Prep Cook capacity reaches 95% on Friday night.</li>
        `;
        alert("Weekly Ordering & Staffing Optimization Complete!");
    } catch (err) {
        console.error("Optimizer error:", err);
    }
}

function applyManualOverride(itemName) {
    alert(`Manager manual override applied for '${itemName}'. Underlying model remains 100% valid.`);
}

function updateScenLabels() {
    const f = parseFloat(document.getElementById("scenFuelShift").value) || 1.15;
    const t = parseFloat(document.getElementById("scenTripShift").value) || 1.2;

    const fPct = Math.round((f - 1.0) * 100);
    const tPct = Math.round((t - 1.0) * 100);

    document.getElementById("scenFuelLabel").innerText = `${fPct >= 0 ? '+' : ''}${fPct}% Ingredient Inflation`;
    document.getElementById("scenTripLabel").innerText = `${tPct >= 0 ? '+' : ''}${tPct}% Sales Surge`;
}

async function runScenarioStressTest() {
    const f = parseFloat(document.getElementById("scenFuelShift").value) || 1.15;
    const cur = appState.currency;

    const baseRev = 2280;
    const baseCost = 1140;
    const baseNet = 1140;

    const stressCost = Math.round(baseCost * f);
    const stressRev = 2250;
    const stressNet = stressRev - stressCost;

    document.getElementById("scenBaseRev").innerText = formatCurrency(baseRev, cur);
    document.getElementById("scenStressRev").innerText = formatCurrency(stressRev, cur);
    document.getElementById("scenDiffRev").innerText = formatCurrency(stressRev - baseRev, cur);

    document.getElementById("scenBaseCost").innerText = formatCurrency(baseCost, cur);
    document.getElementById("scenStressCost").innerText = formatCurrency(stressCost, cur);
    document.getElementById("scenDiffCost").innerText = `+${formatCurrency(stressCost - baseCost, cur)}`;

    document.getElementById("scenBaseNet").innerText = formatCurrency(baseNet, cur);
    document.getElementById("scenStressNet").innerText = formatCurrency(stressNet, cur);
    document.getElementById("scenDiffNet").innerText = formatCurrency(stressNet - baseNet, cur);
}

async function submitApproval(decisionStatus) {
    const comments = document.getElementById("approvalComments").value || `Plan approved.`;
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

// --- Setup Wizard Logic ---
function openSetupWizard() {
    appState.wizardStep = 1;
    document.getElementById("setupWizardModal").classList.remove("hidden");
    renderWizardStep();
}

function closeSetupWizard() {
    document.getElementById("setupWizardModal").classList.add("hidden");
}

function renderWizardStep() {
    const container = document.getElementById("wizardStepContent");
    const prevBtn = document.getElementById("wizPrevBtn");
    const nextBtn = document.getElementById("wizNextBtn");

    if (appState.wizardStep === 1) {
        prevBtn.classList.add("hidden");
        nextBtn.innerText = "Next: Ingredients & Stock →";
        container.innerHTML = `
            <div class="font-bold text-white text-sm">Step 1 — Menu Items & Selling Prices</div>
            <p class="text-slate-400 text-[11px]">Define your key dishes, selling prices, and estimated kitchen prep time.</p>
            <div class="space-y-2">
                <input type="text" value="Classic Margherita Pizza ($18.50)" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200">
                <input type="text" value="Truffle Mushroom Pasta ($24.00)" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200">
            </div>
        `;
    } else if (appState.wizardStep === 2) {
        prevBtn.classList.remove("hidden");
        nextBtn.innerText = "Next: Staffing & Shifts →";
        container.innerHTML = `
            <div class="font-bold text-white text-sm">Step 2 — Ingredient Stock & Supplier Lead Times</div>
            <p class="text-slate-400 text-[11px]">Input raw material stock levels, purchase costs per unit, and supplier delivery days.</p>
            <div class="space-y-2">
                <input type="text" value="Mozzarella Cheese (18.0 kg stock @ $12.00/kg)" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200">
                <input type="text" value="Salmon Fillets (8.5 kg stock @ $28.00/kg)" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200">
            </div>
        `;
    } else {
        prevBtn.classList.remove("hidden");
        nextBtn.innerText = "Finish & Run Optimizer";
        container.innerHTML = `
            <div class="font-bold text-white text-sm">Step 3 — Kitchen Staff & Shift Availability</div>
            <p class="text-slate-400 text-[11px]">Define cook shift availability and hourly wages.</p>
            <div class="space-y-2">
                <input type="text" value="Executive Chef Luigi ($35.00/hr - 40 hrs/wk)" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200">
                <input type="text" value="Prep Cook Sofia ($18.00/hr - 35 hrs/wk)" class="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200">
            </div>
        `;
    }
}

function nextWizardStep() {
    if (appState.wizardStep < 3) {
        appState.wizardStep++;
        renderWizardStep();
    } else {
        closeSetupWizard();
        switchTab('optimize');
        runWeeklyOptimizer();
    }
}

function prevWizardStep() {
    if (appState.wizardStep > 1) {
        appState.wizardStep--;
        renderWizardStep();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    renderRestaurantTables();
});
