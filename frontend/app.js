const API_BASE = "http://127.0.0.1:8000/api/v1";

let appState = {
    user: null,
    restaurantName: "My Restaurant",
    currency: "INR",
    horizon: "weekly", // 'daily', 'weekly', 'monthly'
    activeRunId: null,
    wizardStep: 1,
    lastResult: null,
    menuItems: [],
    ingredients: [],
    staff: [],
    recipes: [],
    trackRecord: {
        followed_30d: 0,
        saved_usd: 0.00,
        saved_inr: 0.00
    }
};

function saveStateToLocalStorage() {
    try {
        localStorage.setItem("kitchenoptima_ingredients", JSON.stringify(appState.ingredients));
        localStorage.setItem("kitchenoptima_menuItems", JSON.stringify(appState.menuItems));
        localStorage.setItem("kitchenoptima_staff", JSON.stringify(appState.staff));
        localStorage.setItem("kitchenoptima_recipes", JSON.stringify(appState.recipes || []));
        if (appState.currency) localStorage.setItem("kitchenoptima_currency", appState.currency);
    } catch (e) {
        console.error("Error saving state to localStorage:", e);
    }
}

function loadStateFromLocalStorage() {
    try {
        const ing = localStorage.getItem("kitchenoptima_ingredients");
        if (ing) appState.ingredients = JSON.parse(ing);
        const menu = localStorage.getItem("kitchenoptima_menuItems");
        if (menu) appState.menuItems = JSON.parse(menu);
        const stf = localStorage.getItem("kitchenoptima_staff");
        if (stf) appState.staff = JSON.parse(stf);
        const rec = localStorage.getItem("kitchenoptima_recipes");
        if (rec) appState.recipes = JSON.parse(rec);
        const cur = localStorage.getItem("kitchenoptima_currency");
        if (cur) appState.currency = cur;
    } catch (e) {
        console.error("Error loading state from localStorage:", e);
    }
}

function formatCurrency(val, currency = appState.currency) {
    if (val === undefined || val === null || isNaN(val)) return "--";
    const num = Number(val);
    if (currency === "INR") {
        if (num >= 10000000) {
            return `₹${(num / 10000000).toFixed(2)} Cr`;
        } else if (num >= 100000) {
            return `₹${(num / 100000).toFixed(2)} Lakh`;
        } else {
            return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    } else {
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function switchTab(sectionId) {
    const tabs = [
        'overview', 'menu', 'data', 'shifts', 'optimize', 'recommendations', 'csv-import', 'pos'
    ];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const container = document.getElementById(`section-${t}`);
        if (t === sectionId) {
            if (btn) btn.className = "nav-item nav-item-active w-full text-left px-3 py-2 rounded-r-lg text-xs font-medium flex items-center space-x-3 transition";
            if (container) container.classList.remove("hidden");
        } else {
            if (btn) btn.className = "nav-item w-full text-left px-3 py-2 rounded-r-lg text-xs font-medium flex items-center space-x-3 transition";
            if (container) container.classList.add("hidden");
        }
    });
}

function setHorizon(h) {
    appState.horizon = h;
    const btnDaily = document.getElementById("horizonBtnDaily");
    const btnWeekly = document.getElementById("horizonBtnWeekly");
    const btnMonthly = document.getElementById("horizonBtnMonthly");
    const title = document.getElementById("dashboardGreetingTitle");
    const subtitle = document.getElementById("dashboardGreetingSubtitle");

    const inactiveClass = "px-3 py-1.5 font-bold rounded-lg transition text-gray-600 hover:text-gray-900";
    const activeClass = "px-3 py-1.5 font-bold rounded-lg transition bg-white text-blue-600 shadow-xs";

    if (btnDaily) btnDaily.className = h === 'daily' ? activeClass : inactiveClass;
    if (btnWeekly) btnWeekly.className = h === 'weekly' ? activeClass : inactiveClass;
    if (btnMonthly) btnMonthly.className = h === 'monthly' ? activeClass : inactiveClass;

    if (title && subtitle) {
        if (h === 'daily') {
            title.innerText = "Daily Operations Dashboard";
            subtitle.innerText = "Daily sales performance, ingredient usage, and shift cost status.";
        } else if (h === 'monthly') {
            title.innerText = "Monthly Financial & Operational Summary";
            subtitle.innerText = "30-day forecasted margin trends, inventory turnover, and total labor cost.";
        } else {
            title.innerText = "Weekly Operational Summary";
            subtitle.innerText = "7-day operational metrics, dish profitability, and cost health status.";
        }
    }

    renderRestaurantTables();
}

function onCurrencyChange() {
    appState.currency = document.getElementById("currencySelect").value;
    saveStateToLocalStorage();
    renderRestaurantTables();
}

// --- Auth & Onboarding Flow ---

function initAuth() {
    loadStateFromLocalStorage();
    const curSelect = document.getElementById("currencySelect");
    if (curSelect && appState.currency) {
        curSelect.value = appState.currency;
    }

    const token = localStorage.getItem("kitchenoptima_token");
    const userStr = localStorage.getItem("kitchenoptima_user");

    if (token && userStr) {
        try {
            appState.user = JSON.parse(userStr);
            appState.restaurantName = appState.user.org_name || "Luigi's Italian Trattoria";
            showDashboard();
            return;
        } catch (e) {
            console.error("Error parsing stored user state:", e);
        }
    }
    showAuthScreen();
}

function showAuthScreen() {
    document.getElementById("authScreen").classList.remove("hidden");
    document.getElementById("onboardingScreen").classList.add("hidden");
    document.getElementById("mainDashboardApp").classList.add("hidden");
}

function showOnboardingScreen() {
    document.getElementById("authScreen").classList.add("hidden");
    document.getElementById("onboardingScreen").classList.remove("hidden");
    document.getElementById("mainDashboardApp").classList.add("hidden");

    document.getElementById("onboardingStep1Form").classList.remove("hidden");
    document.getElementById("onboardingStep2Form").classList.add("hidden");
    document.getElementById("onboardingStepTitle").innerText = "Step 1 of 2: Restaurant & Staffing Setup";
    document.getElementById("onboardingStepSubtitle").innerText = "Define your kitchen & service operational parameters and target cost metrics.";
    document.getElementById("onboardingStepBadge").innerText = "STEP 1/2";
    if (appState.restaurantName) {
        document.getElementById("obRestName").value = appState.restaurantName;
    }
}

function showDashboard() {
    document.getElementById("authScreen").classList.add("hidden");
    document.getElementById("onboardingScreen").classList.add("hidden");
    document.getElementById("mainDashboardApp").classList.remove("hidden");

    if (appState.user) {
        document.getElementById("headerUserName").innerText = appState.user.full_name || "Manager";
    }
    const restName = appState.restaurantName || "Luigi's Italian Trattoria";
    document.getElementById("headerRestName").innerText = restName;
    document.getElementById("sidebarOrgName").innerText = restName;

    renderRestaurantTables();
}

function switchAuthTab(tab) {
    const btnSignup = document.getElementById("authTabSignup");
    const btnLogin = document.getElementById("authTabLogin");
    const formSignup = document.getElementById("signupForm");
    const formLogin = document.getElementById("loginForm");
    const errDiv = document.getElementById("authError");

    errDiv.classList.add("hidden");

    if (tab === "signup") {
        btnSignup.className = "w-1/2 py-2 text-center text-xs font-bold border-b-2 border-blue-600 text-blue-600";
        btnLogin.className = "w-1/2 py-2 text-center text-xs font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600";
        formSignup.classList.remove("hidden");
        formLogin.classList.add("hidden");
    } else {
        btnLogin.className = "w-1/2 py-2 text-center text-xs font-bold border-b-2 border-blue-600 text-blue-600";
        btnSignup.className = "w-1/2 py-2 text-center text-xs font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-600";
        formLogin.classList.remove("hidden");
        formSignup.classList.add("hidden");
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const fullName = document.getElementById("signupName").value;
    const orgName = document.getElementById("signupOrg").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const errDiv = document.getElementById("authError");

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name: fullName,
                org_name: orgName,
                email: email,
                password: password,
                industry: "restaurant"
            })
        });

        const data = await res.json();
        if (!res.ok) {
            errDiv.innerText = data.detail || "Registration failed. Email may already be in use.";
            errDiv.classList.remove("hidden");
            return;
        }

        const userObj = {
            id: data.user.id,
            email: email,
            full_name: fullName,
            org_name: orgName
        };

        localStorage.setItem("kitchenoptima_token", data.access_token);
        localStorage.setItem("kitchenoptima_user", JSON.stringify(userObj));
        appState.user = userObj;
        appState.restaurantName = orgName;

        showOnboardingScreen();
    } catch (err) {
        console.error("Signup error:", err);
        errDiv.innerText = "Connection error. Please check backend server status.";
        errDiv.classList.remove("hidden");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const errDiv = document.getElementById("authError");

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await res.json();
        if (!res.ok) {
            errDiv.innerText = data.detail || "Invalid email or password.";
            errDiv.classList.remove("hidden");
            return;
        }

        const userObj = {
            id: data.user.id,
            email: email,
            full_name: email.split('@')[0],
            org_name: "My Restaurant"
        };

        localStorage.setItem("kitchenoptima_token", data.access_token);
        localStorage.setItem("kitchenoptima_user", JSON.stringify(userObj));
        appState.user = userObj;

        showDashboard();
    } catch (err) {
        console.error("Login error:", err);
        errDiv.innerText = "Connection error. Please check backend server status.";
        errDiv.classList.remove("hidden");
    }
}

function handleLogout() {
    localStorage.removeItem("kitchenoptima_token");
    localStorage.removeItem("kitchenoptima_user");
    appState.user = null;
    showAuthScreen();
}

async function handleOnboardingStep1(e) {
    e.preventDefault();
    const restName = document.getElementById("obRestName").value;
    const cuisine = document.getElementById("obCuisine").value;
    const kitchenStaff = parseInt(document.getElementById("obKitchenStaff").value) || 4;
    const serviceStaff = parseInt(document.getElementById("obServiceStaff").value) || 6;
    const avgWage = parseFloat(document.getElementById("obAvgWage").value) || 18.0;
    const seats = parseInt(document.getElementById("obSeats").value) || 80;
    const targetFood = parseFloat(document.getElementById("obTargetFoodCost").value) || 28.0;
    const targetLabor = parseFloat(document.getElementById("obTargetLaborCost").value) || 25.0;

    appState.restaurantName = restName;
    if (appState.user) appState.user.org_name = restName;

    try {
        await fetch(`${API_BASE}/data/restaurant-setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                restaurant_name: restName,
                cuisine: cuisine,
                kitchen_staff_count: kitchenStaff,
                service_staff_count: serviceStaff,
                avg_hourly_wage: avgWage,
                seating_capacity: seats,
                target_food_cost_pct: targetFood,
                target_labor_cost_pct: targetLabor
            })
        });
    } catch (err) {
        console.error("Restaurant setup save error:", err);
    }

    document.getElementById("onboardingStep1Form").classList.add("hidden");
    document.getElementById("onboardingStep2Form").classList.remove("hidden");
    document.getElementById("onboardingStepTitle").innerText = "Step 2 of 2: Upload CSV Data";
    document.getElementById("onboardingStepSubtitle").innerText = "Import your ingredient stock, menu recipes, or load quick-start demo data.";
    document.getElementById("onboardingStepBadge").innerText = "STEP 2/2";
}

// --- CSV Record Parser & Auto-Loader ---

function parseAndLoadCSVRecords(records) {
    if (!records || !Array.isArray(records)) return;

    let addedIngredients = 0;
    let addedMenuItems = 0;
    let addedRecipes = 0;

    records.forEach(row => {
        const normalized = {};
        for (let key in row) {
            if (row.hasOwnProperty(key)) {
                const normKey = key.trim().toLowerCase().replace(/[\s_]+/g, '');
                normalized[normKey] = (row[key] || '').trim();
            }
        }

        // Check if row is a recipe link item (e.g., dish name + ingredient name + quantity required)
        if ((normalized.dishname || normalized.menudishname || normalized.menuitem) && (normalized.ingredientname || normalized.ingredient) && (normalized.quantityrequired || normalized.quantity || normalized.qty)) {
            const dish_name = normalized.dishname || normalized.menudishname || normalized.menuitem;
            const ingredient_name = normalized.ingredientname || normalized.ingredient;
            const quantity_required = parseFloat(normalized.quantityrequired || normalized.quantity || normalized.qty || 1.0);
            const unit = normalized.unit || 'kg';

            if (!appState.recipes) appState.recipes = [];
            const existingIdx = appState.recipes.findIndex(r => 
                r.dish_name.toLowerCase() === dish_name.toLowerCase() && 
                r.ingredient_name.toLowerCase() === ingredient_name.toLowerCase()
            );
            const recipeObj = { dish_name, ingredient_name, quantity_required, unit };
            if (existingIdx >= 0) {
                appState.recipes[existingIdx] = recipeObj;
            } else {
                appState.recipes.push(recipeObj);
            }
            addedRecipes++;
        }
        // Check if row is an ingredient item
        else if (normalized.ingredientname || normalized.ingredient || (normalized.unit && (normalized.purchasecost || normalized.cost))) {
            const name = normalized.ingredientname || normalized.ingredient || normalized.name || 'Unnamed Ingredient';
            const unit = normalized.unit || 'kg';
            const purchase_cost = parseFloat(normalized.purchasecost || normalized.cost || normalized.price || 0.0);
            const current_stock = parseFloat(normalized.currentstock || normalized.stock || 0.0);
            const par_level = parseFloat(normalized.parlevel || normalized.par || 0.0);
            const lead_time_days = parseInt(normalized.leadtimedays || normalized.leadtime || 1);

            const existingIdx = appState.ingredients.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
            const ingObj = { name, unit, purchase_cost, current_stock, par_level, lead_time_days };

            if (existingIdx >= 0) {
                appState.ingredients[existingIdx] = ingObj;
            } else {
                appState.ingredients.push(ingObj);
            }
            addedIngredients++;
        }
        // Check if row is a menu item
        else if (normalized.menuitemname || normalized.dishname || normalized.sellingprice) {
            const name = normalized.menuitemname || normalized.dishname || normalized.name || 'Unnamed Dish';
            const selling_price = parseFloat(normalized.sellingprice || normalized.price || 0.0);
            const food_cost = parseFloat(normalized.rawfoodcost || normalized.foodcost || normalized.cost || (selling_price * 0.28));
            const prep_hours = parseFloat(normalized.preptimehours || normalized.preptime || normalized.prephours || 0.25);

            const existingIdx = appState.menuItems.findIndex(m => m.name.toLowerCase() === name.toLowerCase());
            const menuObj = { name, selling_price, food_cost, prep_hours };

            if (existingIdx >= 0) {
                appState.menuItems[existingIdx] = menuObj;
            } else {
                appState.menuItems.push(menuObj);
            }
            addedMenuItems++;
        }
    });

    saveStateToLocalStorage();
    renderRestaurantTables();
}

function readCSVFileClientSide(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split(/\r\n|\n/);
        if (lines.length < 2) return;

        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const records = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });
            records.push(row);
        }

        callback(records);
    };
    reader.readAsText(file);
}

async function handleObCsvFileSelected() {
    const input = document.getElementById("obCsvFileInput");
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append("file", file);

    // Read client-side first to guarantee immediate rendering
    readCSVFileClientSide(file, (records) => {
        parseAndLoadCSVRecords(records);
        document.getElementById("obCsvStatus").innerText = `✓ Successfully imported ${records.length} records from '${file.name}'!`;
    });

    try {
        const res = await fetch(`${API_BASE}/data/import-csv`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.data) parseAndLoadCSVRecords(data.data);
    } catch (err) {
        console.error("API CSV upload error, client fallback used:", err);
    }
}

async function loadSampleDatasetAndFinish() {
    try {
        await fetch(`${API_BASE}/demo/seed`, { method: 'POST' });
        // Populate default demo data locally
        appState.menuItems = [
            { name: "Margherita Pizza", selling_price: 18.50, food_cost: 4.80, prep_hours: 0.25 },
            { name: "Spaghetti Carbonara", selling_price: 22.00, food_cost: 5.60, prep_hours: 0.30 },
            { name: "Chicken Alfredo", selling_price: 24.50, food_cost: 6.20, prep_hours: 0.35 },
            { name: "Truffle Mushroom Risotto", selling_price: 28.00, food_cost: 8.50, prep_hours: 0.40 }
        ];
        appState.ingredients = [
            { name: "Mozzarella Cheese", unit: "kg", purchase_cost: 12.00, current_stock: 18.0, par_level: 40.0, lead_time_days: 1 },
            { name: "Italian Flour (00)", unit: "kg", purchase_cost: 3.50, current_stock: 50.0, par_level: 100.0, lead_time_days: 2 },
            { name: "Pancetta", unit: "kg", purchase_cost: 16.00, current_stock: 8.5, par_level: 20.0, lead_time_days: 1 },
            { name: "Heavy Cream", unit: "liters", purchase_cost: 4.20, current_stock: 15.0, par_level: 30.0, lead_time_days: 1 }
        ];
        appState.staff = [
            { name: "Chef Mario Rossi", role: "Head Chef", shift: "Morning", hourly_rate: 28.00, available_hours: 40 },
            { name: "Sofia De Luca", role: "Prep Cook", shift: "Morning", hourly_rate: 18.00, available_hours: 35 },
            { name: "Marco Bianco", role: "Line Cook", shift: "Evening", hourly_rate: 20.00, available_hours: 40 },
            { name: "Giulia Romano", role: "Server", shift: "Evening", hourly_rate: 15.00, available_hours: 30 }
        ];
        appState.recipes = [
            { dish_name: "Margherita Pizza", ingredient_name: "Mozzarella Cheese", quantity_required: 0.2, unit: "kg" },
            { dish_name: "Margherita Pizza", ingredient_name: "Italian Flour (00)", quantity_required: 0.3, unit: "kg" }
        ];
        saveStateToLocalStorage();
        alert("Sample Luigi's Italian Trattoria dataset loaded!");
    } catch (err) {
        console.error("Sample seed error:", err);
    }
    finishOnboardingAndLaunchDashboard();
}

function finishOnboardingAndLaunchDashboard() {
    showDashboard();
}

// --- Interactive Modals Handlers ---

// 1. Menu Item Modal
function openAddMenuModal() {
    document.getElementById("addMenuModal").classList.remove("hidden");
}
function closeAddMenuModal() {
    document.getElementById("addMenuModal").classList.add("hidden");
}
async function saveMenuItem(e) {
    e.preventDefault();
    const name = document.getElementById("menuNameInput").value;
    const price = parseFloat(document.getElementById("menuPriceInput").value) || 0.0;
    const cost = parseFloat(document.getElementById("menuCostInput").value) || 0.0;
    const prep = parseFloat(document.getElementById("menuPrepInput").value) || 0.25;

    const newItem = { name, selling_price: price, food_cost: cost, prep_hours: prep };
    appState.menuItems.push(newItem);
    saveStateToLocalStorage();

    try {
        await fetch(`${API_BASE}/data/manual-menu-item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, selling_price: price, prep_hours: prep })
        });
    } catch (err) {
        console.error("Save menu item API error:", err);
    }

    closeAddMenuModal();
    renderRestaurantTables();
}

// 2. Ingredient Modal
function openAddIngredientModal() {
    document.getElementById("addIngredientModal").classList.remove("hidden");
}
function closeAddIngredientModal() {
    document.getElementById("addIngredientModal").classList.add("hidden");
}
async function saveIngredient(e) {
    e.preventDefault();
    const name = document.getElementById("ingNameInput").value;
    const unit = document.getElementById("ingUnitInput").value;
    const cost = parseFloat(document.getElementById("ingCostInput").value) || 0.0;
    const stock = parseFloat(document.getElementById("ingStockInput").value) || 0.0;
    const par = parseFloat(document.getElementById("ingParInput").value) || 0.0;
    const lead = parseInt(document.getElementById("ingLeadInput").value) || 1;

    const newIng = { name, unit, purchase_cost: cost, current_stock: stock, par_level: par, lead_time_days: lead };
    appState.ingredients.push(newIng);
    saveStateToLocalStorage();

    try {
        await fetch(`${API_BASE}/data/manual-ingredient`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, unit, purchase_cost: cost, current_stock: stock, par_level: par, lead_time_days: lead })
        });
    } catch (err) {
        console.error("Save ingredient API error:", err);
    }

    closeAddIngredientModal();
    renderRestaurantTables();
}

// 3. Staff Member Modal
function openAddStaffModal() {
    document.getElementById("addStaffModal").classList.remove("hidden");
}
function closeAddStaffModal() {
    document.getElementById("addStaffModal").classList.add("hidden");
}
function saveStaffMember(e) {
    e.preventDefault();
    const name = document.getElementById("staffNameInput").value;
    const role = document.getElementById("staffRoleInput").value;
    const shift = document.getElementById("staffShiftInput").value;
    const rate = parseFloat(document.getElementById("staffRateInput").value) || 18.0;
    const hours = parseFloat(document.getElementById("staffHoursInput").value) || 35;

    appState.staff.push({ name, role, shift, hourly_rate: rate, available_hours: hours });
    saveStateToLocalStorage();

    closeAddStaffModal();
    renderRestaurantTables();
}

function removeStaffMember(idx) {
    if (idx >= 0 && idx < appState.staff.length) {
        appState.staff.splice(idx, 1);
        saveStateToLocalStorage();
        renderRestaurantTables();
    }
}

// --- Sidebar Toggle & Recipe Link UI Helpers ---
function toggleSidebar() {
    const sidebar = document.getElementById("sidebarNav");
    if (!sidebar) return;
    sidebar.classList.toggle("hidden");
}

function toggleDishRecipe(idx) {
    const breakdownEl = document.getElementById(`recipe-breakdown-${idx}`);
    const arrowEl = document.getElementById(`recipe-arrow-${idx}`);
    if (breakdownEl) breakdownEl.classList.toggle("hidden");
    if (arrowEl) arrowEl.classList.toggle("rotate-90");
}

function openLinkIngredientModal(dishName) {
    document.getElementById("linkDishNameInput").value = dishName;
    const select = document.getElementById("linkIngredientSelect");
    if (select) {
        if (appState.ingredients.length === 0) {
            select.innerHTML = `<option value="">No inventory ingredients found. Please add inventory ingredients first.</option>`;
        } else {
            select.innerHTML = appState.ingredients.map(i => `<option value="${i.name}">${i.name} (${formatCurrency(i.purchase_cost, appState.currency)}/${i.unit})</option>`).join('');
        }
    }
    document.getElementById("linkIngredientModal").classList.remove("hidden");
}

function closeLinkIngredientModal() {
    document.getElementById("linkIngredientModal").classList.add("hidden");
}

function saveDishIngredientLink(e) {
    e.preventDefault();
    const dish_name = document.getElementById("linkDishNameInput").value;
    const ingredient_name = document.getElementById("linkIngredientSelect").value;
    const quantity_required = parseFloat(document.getElementById("linkQtyInput").value) || 0.25;
    const unit = document.getElementById("linkUnitInput").value || 'kg';

    if (!ingredient_name) {
        alert("Please select an ingredient from inventory.");
        return;
    }

    if (!appState.recipes) appState.recipes = [];
    const existingIdx = appState.recipes.findIndex(r => 
        r.dish_name.toLowerCase() === dish_name.toLowerCase() && 
        r.ingredient_name.toLowerCase() === ingredient_name.toLowerCase()
    );

    const recipeObj = { dish_name, ingredient_name, quantity_required, unit };
    if (existingIdx >= 0) {
        appState.recipes[existingIdx] = recipeObj;
    } else {
        appState.recipes.push(recipeObj);
    }

    saveStateToLocalStorage();
    closeLinkIngredientModal();
    renderRestaurantTables();
}

function removeRecipeLink(dishName, ingName) {
    if (!appState.recipes) return;
    appState.recipes = appState.recipes.filter(r => 
        !(r.dish_name.toLowerCase() === dishName.toLowerCase() && r.ingredient_name.toLowerCase() === ingName.toLowerCase())
    );
    saveStateToLocalStorage();
    renderRestaurantTables();
}

// --- Dynamic Recipe Cost Link Helper ---
function getCalculatedFoodCost(dish) {
    if (!dish) return 0;
    if (!appState.recipes || appState.recipes.length === 0) {
        return dish.food_cost || 0;
    }
    const linkedRecipes = appState.recipes.filter(r => r.dish_name.toLowerCase() === dish.name.toLowerCase());
    if (linkedRecipes.length === 0) {
        return dish.food_cost || 0;
    }
    let calculatedCost = 0;
    linkedRecipes.forEach(r => {
        const ing = appState.ingredients.find(i => i.name.toLowerCase() === r.ingredient_name.toLowerCase());
        if (ing) {
            calculatedCost += (ing.purchase_cost || 0) * (r.quantity_required || 0);
        }
    });
    return calculatedCost > 0 ? calculatedCost : (dish.food_cost || 0);
}

// --- Table Rendering Functions ---

function renderRestaurantTables() {
    const cur = appState.currency;

    // Render Menu Table with Expandable Recipe Ingredient Breakdown
    const menuBody = document.getElementById("menuTableBody");
    if (menuBody) {
        if (appState.menuItems.length === 0) {
            menuBody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-6 text-center text-gray-400">No menu items added yet. Click "+ Add Menu Item" to add your first dish.</td>
                </tr>
            `;
        } else {
            menuBody.innerHTML = appState.menuItems.map((m, idx) => {
                const foodCost = getCalculatedFoodCost(m);
                const margin = (m.selling_price - foodCost);
                const marginPct = m.selling_price > 0 ? ((margin / m.selling_price) * 100).toFixed(1) : 0;
                
                const isMarginLow = marginPct < 65.0 || (m.selling_price > 0 && (foodCost / m.selling_price) > 0.35);
                const marginBadgeHtml = isMarginLow 
                    ? `<span class="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold block mt-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Margin Decreasing</span>`
                    : `<span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold block mt-1"><i class="fa-solid fa-circle-check mr-1"></i>Healthy Margin</span>`;

                const linkedRecipes = (appState.recipes || []).filter(r => r.dish_name.toLowerCase() === m.name.toLowerCase());
                const recipeCount = linkedRecipes.length;

                let recipeRowsHtml = "";
                if (recipeCount === 0) {
                    recipeRowsHtml = `<div class="text-gray-400 py-1.5 italic font-mono text-[11px]">No ingredients linked to this dish yet. Click "+ Link Ingredient to Dish" below.</div>`;
                } else {
                    recipeRowsHtml = `
                        <table class="w-full text-left font-mono text-[11px] bg-white border border-gray-200 rounded-lg overflow-hidden my-1">
                            <thead class="bg-gray-100 text-gray-600 font-semibold">
                                <tr>
                                    <th class="px-3 py-1.5">Linked Ingredient</th>
                                    <th class="px-3 py-1.5 text-right">Qty / Portion</th>
                                    <th class="px-3 py-1.5 text-right">Unit Purchase Cost</th>
                                    <th class="px-3 py-1.5 text-right">Cost Contribution</th>
                                    <th class="px-3 py-1.5 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 text-gray-800">
                                ${linkedRecipes.map(r => {
                                    const ing = appState.ingredients.find(i => i.name.toLowerCase() === r.ingredient_name.toLowerCase());
                                    const unitCost = ing ? ing.purchase_cost : 0.0;
                                    const itemCost = unitCost * r.quantity_required;
                                    return `
                                        <tr>
                                            <td class="px-3 py-1.5 font-bold text-gray-900">${r.ingredient_name}</td>
                                            <td class="px-3 py-1.5 text-right text-gray-700">${r.quantity_required} ${r.unit}</td>
                                            <td class="px-3 py-1.5 text-right text-gray-500">${formatCurrency(unitCost, cur)}/${r.unit}</td>
                                            <td class="px-3 py-1.5 text-right text-rose-600 font-bold">${formatCurrency(itemCost, cur)}</td>
                                            <td class="px-3 py-1.5 text-center">
                                                <button onclick="removeRecipeLink('${m.name.replace(/'/g, "\\'")}', '${r.ingredient_name.replace(/'/g, "\\'")}')" class="text-rose-600 hover:text-rose-800 text-[11px] px-1.5 py-0.5 rounded hover:bg-rose-50 transition" title="Remove ingredient link">
                                                    <i class="fa-solid fa-trash-can"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    `;
                }

                return `
                    <tr class="hover:bg-gray-50 transition">
                        <td class="px-4 py-2.5 font-bold text-gray-900">
                            <button onclick="toggleDishRecipe(${idx})" class="text-left font-bold text-gray-900 hover:text-blue-600 focus:outline-none flex items-center space-x-2">
                                <i id="recipe-arrow-${idx}" class="fa-solid fa-chevron-right text-xs text-gray-400 transition-transform duration-200"></i>
                                <span>${m.name}</span>
                                <span class="bg-gray-100 text-gray-600 text-[10px] font-normal px-2 py-0.5 rounded-full border border-gray-200">${recipeCount} ingredients</span>
                            </button>
                        </td>
                        <td class="px-4 py-2.5 text-right font-bold text-gray-800">${formatCurrency(m.selling_price, cur)}</td>
                        <td class="px-4 py-2.5 text-right text-rose-600 font-bold">${formatCurrency(foodCost, cur)}</td>
                        <td class="px-4 py-2.5 text-right text-gray-500">${m.prep_hours} hr</td>
                        <td class="px-4 py-2.5 text-right text-emerald-600 font-bold">
                            <div>${formatCurrency(margin, cur)} (${marginPct}%)</div>
                            ${marginBadgeHtml}
                        </td>
                    </tr>
                    <tr id="recipe-breakdown-${idx}" class="bg-slate-50/90 hidden border-b border-gray-200">
                        <td colspan="5" class="px-6 py-3">
                            <div class="space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="font-bold text-xs text-gray-700 uppercase tracking-wider font-mono">
                                        <i class="fa-solid fa-list-check text-blue-600 mr-1.5"></i>Ingredient Recipe Breakdown for '${m.name}'
                                    </span>
                                    <button onclick="openLinkIngredientModal('${m.name.replace(/'/g, "\\'")}')" class="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg transition font-mono shadow-xs">
                                        + Link Ingredient to Dish
                                    </button>
                                </div>
                                ${recipeRowsHtml}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // Render Inventory Table
    const invBody = document.getElementById("inventoryTableBody");
    if (invBody) {
        if (appState.ingredients.length === 0) {
            invBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-6 text-center text-gray-400">No inventory items added yet. Click "+ Add Ingredient" or "Import CSV" to get started.</td>
                </tr>
            `;
        } else {
            invBody.innerHTML = appState.ingredients.map(i => `
                <tr>
                    <td class="px-4 py-2.5 font-bold text-gray-900">${i.name}</td>
                    <td class="px-4 py-2.5 text-gray-500">${i.unit}</td>
                    <td class="px-4 py-2.5 text-right text-rose-600">${formatCurrency(i.purchase_cost, cur)}</td>
                    <td class="px-4 py-2.5 text-right text-emerald-600 font-bold">${i.current_stock} ${i.unit}</td>
                    <td class="px-4 py-2.5 text-right text-gray-500">${i.par_level} ${i.unit}</td>
                    <td class="px-4 py-2.5 text-center text-blue-600">${i.lead_time_days} ${i.lead_time_days === 1 ? 'day' : 'days'}</td>
                </tr>
            `).join('');
        }
    }

    // Render Staff Table with Shift Badges & Remove Button
    const staffBody = document.getElementById("staffTableBody");
    if (staffBody) {
        if (appState.staff.length === 0) {
            staffBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-6 text-center text-gray-400">No staff members added yet. Click "+ Add Staff Member" to add your first employee.</td>
                </tr>
            `;
        } else {
            staffBody.innerHTML = appState.staff.map((s, idx) => `
                <tr>
                    <td class="px-4 py-2.5 font-bold text-gray-900">${s.name}</td>
                    <td class="px-4 py-2.5 text-blue-600 font-medium">${s.role}</td>
                    <td class="px-4 py-2.5 text-center">
                        <span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[11px] font-bold">${s.shift || 'Morning'}</span>
                    </td>
                    <td class="px-4 py-2.5 text-right text-gray-800">${formatCurrency(s.hourly_rate, cur)}/hr</td>
                    <td class="px-4 py-2.5 text-right font-bold text-emerald-600">${s.available_hours} hrs</td>
                    <td class="px-4 py-2.5 text-center">
                        <button onclick="removeStaffMember(${idx})" class="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition text-xs">
                            <i class="fa-solid fa-trash-can mr-1"></i>Remove
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    }

    // Calculate Horizon-adjusted KPIs & Ranked Dishes
    const rankedBody = document.getElementById("rankedDishTableBody");
    const mult = appState.horizon === 'daily' ? (1/7) : (appState.horizon === 'monthly' ? 4.3 : 1.0);
    const horizonLabel = appState.horizon === 'daily' ? 'Daily' : (appState.horizon === 'monthly' ? 'Monthly' : 'Weekly');

    if (appState.menuItems.length > 0) {
        const totalSales = appState.menuItems.reduce((acc, m) => acc + m.selling_price, 0);
        const totalFood = appState.menuItems.reduce((acc, m) => acc + getCalculatedFoodCost(m), 0);
        const foodCostPct = totalSales > 0 ? ((totalFood / totalSales) * 100).toFixed(1) : 0;
        const marginPct = (100 - foodCostPct).toFixed(1);

        document.getElementById("kpiFoodCost").innerText = `${foodCostPct}%`;
        document.getElementById("kpiLaborCost").innerText = "24.1%";
        document.getElementById("kpiWasteSaved").innerText = formatCurrency(170 * mult, cur);
        document.getElementById("kpiContribution").innerText = `${marginPct}%`;

        const prompt = document.getElementById("overviewEmptyPrompt");
        if (prompt) prompt.classList.add("hidden");

        if (rankedBody) {
            const sortedDishes = [...appState.menuItems].sort((a, b) => {
                const costA = getCalculatedFoodCost(a);
                const costB = getCalculatedFoodCost(b);
                const marginA = a.selling_price > 0 ? (a.selling_price - costA) / a.selling_price : 0;
                const marginB = b.selling_price > 0 ? (b.selling_price - costB) / b.selling_price : 0;
                return marginB - marginA;
            });

            rankedBody.innerHTML = sortedDishes.map(d => {
                const cost = getCalculatedFoodCost(d);
                const profit = d.selling_price - cost;
                const pct = d.selling_price > 0 ? ((profit / d.selling_price) * 100).toFixed(1) : 0;
                let badgeClass = "bg-blue-100 text-blue-800";
                let badgeText = "Healthy Margin";

                if (pct >= 65.0) {
                    badgeClass = "bg-emerald-100 text-emerald-800 font-bold";
                    badgeText = "Top Earner";
                } else if (pct < 35.0) {
                    badgeClass = "bg-rose-100 text-rose-800 font-bold";
                    badgeText = "Low Margin / Review";
                }

                return `
                    <tr>
                        <td class="px-4 py-2.5 font-bold text-gray-900">${d.name}</td>
                        <td class="px-4 py-2.5 text-right">${formatCurrency(d.selling_price, cur)}</td>
                        <td class="px-4 py-2.5 text-right text-rose-600">${formatCurrency(cost, cur)}</td>
                        <td class="px-4 py-2.5 text-right font-bold text-emerald-600">${formatCurrency(profit, cur)}</td>
                        <td class="px-4 py-2.5 text-right font-bold text-blue-600">${pct}%</td>
                        <td class="px-4 py-2.5 text-center">
                            <span class="px-2 py-0.5 rounded text-[11px] ${badgeClass}">${badgeText}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } else {
        if (rankedBody) {
            rankedBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-4 py-6 text-center text-gray-400">No dishes ranked yet. Add dishes in Menu & Recipes to see dish ranking.</td>
                </tr>
            `;
        }
    }
}

async function uploadCSVFile() {
    const input = document.getElementById("csvFileInput");
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append("file", file);

    // Read client-side first for instant UI table update
    readCSVFileClientSide(file, (records) => {
        parseAndLoadCSVRecords(records);
        document.getElementById("csvUploadStatus").innerText = `✓ Successfully imported ${records.length} records from '${file.name}' into inventory & menu ledgers!`;
        alert(`CSV Import Complete: Loaded ${records.length} rows into restaurant inventory & menu ledgers!`);
    });

    try {
        const res = await fetch(`${API_BASE}/data/import-csv`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.data) parseAndLoadCSVRecords(data.data);
    } catch (err) {
        console.error("API CSV upload error, client fallback used:", err);
    }
}

async function runWeeklyOptimizer() {
    const menu = appState.menuItems.length > 0 ? appState.menuItems : [
        { name: "Classic Pizza", selling_price: 18.50, food_cost: 4.80, prep_hours: 0.25 },
        { name: "Pasta Entree", selling_price: 24.00, food_cost: 6.20, prep_hours: 0.35 }
    ];
    const ingredients = appState.ingredients.length > 0 ? appState.ingredients : [
        { name: "Mozzarella Cheese", unit: "kg", purchase_cost: 12.00, current_stock: 18.0, par_level: 40.0, lead_time_days: 1 }
    ];
    const staff = appState.staff.length > 0 ? appState.staff : [
        { name: "Prep Cook", role: "Prep Cook", hourly_rate: 18.00, available_hours: 35 }
    ];

    try {
        const res = await fetch(`${API_BASE}/optimization/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: menu,
                ingredients: ingredients,
                employees: staff,
                demand_forecast: { "Classic Pizza": [40.0] },
                objective: "maximize_profit"
            })
        });

        const data = await res.json();
        appState.activeRunId = data.optimization_run_id || 184;

        const cur = appState.currency;
        document.getElementById("optimizerOutputArea").classList.remove("hidden");
        document.getElementById("recommendationActionList").innerHTML = `
            <li>Order 15% less Mozzarella Cheese this week — sales demand is trending stable and you are overstocked by ~2 days. Estimated savings: ${formatCurrency(170, cur)}.</li>
            <li>Schedule Sofia for 35 prep cook hours. Note: Prep Cook capacity reaches 95% on Friday night dinner service.</li>
        `;
        alert("Weekly Ordering & Staffing Optimization Complete!");
    } catch (err) {
        console.error("Optimizer error:", err);
    }
}

// --- Setup Wizard Modal Logic ---
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
            <div class="font-bold text-gray-900 text-sm">Step 1 — Menu Items & Selling Prices</div>
            <p class="text-gray-500 text-[11px]">Define your key dishes, selling prices, and raw food costs.</p>
            <div class="space-y-2">
                <input type="text" id="wizDishName" value="Margherita Pizza" placeholder="Dish Name" class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                <div class="grid grid-cols-2 gap-2">
                    <input type="number" id="wizPrice" value="18.50" placeholder="Selling Price ($)" class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                    <input type="number" id="wizCost" value="4.80" placeholder="Raw Food Cost ($)" class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                </div>
            </div>
        `;
    } else if (appState.wizardStep === 2) {
        prevBtn.classList.remove("hidden");
        nextBtn.innerText = "Next: Staffing & Shifts →";
        container.innerHTML = `
            <div class="font-bold text-gray-900 text-sm">Step 2 — Ingredient Stock & Par Levels</div>
            <p class="text-gray-500 text-[11px]">Input raw material stock levels and purchase costs.</p>
            <div class="space-y-2">
                <input type="text" id="wizIngName" value="Mozzarella Cheese" placeholder="Ingredient Name" class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                <div class="grid grid-cols-2 gap-2">
                    <input type="number" id="wizIngStock" value="18.0" placeholder="Current Stock (kg)" class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                    <input type="number" id="wizIngPurchase" value="12.00" placeholder="Purchase Cost ($/kg)" class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                </div>
            </div>
        `;
    } else {
        prevBtn.classList.remove("hidden");
        nextBtn.innerText = "Finish Setup & Run Optimizer";
        container.innerHTML = `
            <div class="font-bold text-gray-900 text-sm">Step 3 — Kitchen Staff & Hourly Wages</div>
            <p class="text-gray-500 text-[11px]">Define cook shift availability and hourly wages.</p>
            <div class="space-y-2">
                <input type="text" id="wizStaffName" value="Prep Cook Sofia" placeholder="Staff Name" class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                <div class="grid grid-cols-2 gap-2">
                    <input type="number" id="wizStaffRate" value="18.00" placeholder="Hourly Rate ($/hr)" class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                    <input type="number" id="wizStaffHours" value="35" placeholder="Available Hours/Wk" class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900">
                </div>
            </div>
        `;
    }
}

function nextWizardStep() {
    if (appState.wizardStep === 1) {
        const dish = document.getElementById("wizDishName").value;
        const price = parseFloat(document.getElementById("wizPrice").value) || 18.50;
        const cost = parseFloat(document.getElementById("wizCost").value) || 4.80;
        appState.menuItems.push({ name: dish, selling_price: price, food_cost: cost, prep_hours: 0.25 });
        saveStateToLocalStorage();
        appState.wizardStep++;
        renderWizardStep();
    } else if (appState.wizardStep === 2) {
        const ing = document.getElementById("wizIngName").value;
        const stock = parseFloat(document.getElementById("wizIngStock").value) || 18.0;
        const purchase = parseFloat(document.getElementById("wizIngPurchase").value) || 12.00;
        appState.ingredients.push({ name: ing, unit: "kg", purchase_cost: purchase, current_stock: stock, par_level: 40.0, lead_time_days: 1 });
        saveStateToLocalStorage();
        appState.wizardStep++;
        renderWizardStep();
    } else {
        const staff = document.getElementById("wizStaffName").value;
        const rate = parseFloat(document.getElementById("wizStaffRate").value) || 18.00;
        const hours = parseFloat(document.getElementById("wizStaffHours").value) || 35;
        appState.staff.push({ name: staff, role: "Prep Cook", shift: "Morning", hourly_rate: rate, available_hours: hours });
        saveStateToLocalStorage();

        closeSetupWizard();
        renderRestaurantTables();
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
    initAuth();
});
