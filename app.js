// =============================================
// Iron Faith - Fitness & Faith Tracker
// =============================================

// --- Data Layer ---
const DB = {
    get(key, fallback = null) {
        try {
            const data = localStorage.getItem('faithfit_' + key);
            return data ? JSON.parse(data) : fallback;
        } catch { return fallback; }
    },
    set(key, value) {
        localStorage.setItem('faithfit_' + key, JSON.stringify(value));
    }
};

function today() {
    return new Date().toISOString().split('T')[0];
}

// --- Theme Toggle ---
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('faithfit_theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '\u263E' : '\u263C';
}

function loadTheme() {
    const saved = localStorage.getItem('faithfit_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

loadTheme();

// --- Units ---
function getUnits() {
    return localStorage.getItem('faithfit_units') || 'imperial';
}

function isMetric() {
    return getUnits() === 'metric';
}

// Display weight in current unit (stored internally as lbs)
function displayWeight(lbs) {
    if (isMetric()) return (lbs * 0.453592).toFixed(1);
    return lbs;
}

// Weight unit label
function wu() {
    return isMetric() ? 'kg' : 'lbs';
}

// Convert user input to lbs for storage
function inputToLbs(value) {
    if (isMetric()) return value / 0.453592;
    return value;
}

// Convert lbs to display value
function lbsToDisplay(lbs) {
    if (isMetric()) return (lbs * 0.453592).toFixed(1);
    return lbs;
}

function setUnits(unit) {
    localStorage.setItem('faithfit_units', unit);
    document.getElementById('unit-imperial').classList.toggle('active', unit === 'imperial');
    document.getElementById('unit-metric').classList.toggle('active', unit === 'metric');
    updateUnitUI();
}

function updateUnitUI() {
    const metric = isMetric();

    // Profile weight label
    document.getElementById('weight-label').textContent = metric ? 'Weight (kg)' : 'Weight (lbs)';

    // Height fields
    document.getElementById('height-imperial').classList.toggle('hidden', metric);
    document.getElementById('height-metric').classList.toggle('hidden', !metric);

    // Dashboard weight input placeholder
    document.getElementById('weight-input').placeholder = metric ? 'Enter weight (kg)' : 'Enter weight (lbs)';

    // Workout set placeholders
    document.querySelectorAll('.set-weight').forEach(el => {
        el.placeholder = metric ? 'Weight (kg)' : 'Weight (lbs)';
    });

    // Convert profile weight field display
    const profileWeightEl = document.getElementById('profile-weight');
    const profile = DB.get('profile', {});
    if (profile.weight) {
        profileWeightEl.value = metric ? (profile.weight * 0.453592).toFixed(1) : profile.weight;
    }

    // Convert height fields
    if (metric && profile.height) {
        document.getElementById('profile-height-cm').value = Math.round(profile.height * 2.54);
    }

    // Refresh all displays
    updateDashboard();
    updateTodaysExercises();
    updateRecentWorkouts();
    drawWeightChart();
    const exercise = document.getElementById('overload-exercise').value;
    if (exercise) showOverloadData();
}

function loadUnits() {
    const unit = getUnits();
    document.getElementById('unit-imperial').classList.toggle('active', unit === 'imperial');
    document.getElementById('unit-metric').classList.toggle('active', unit === 'metric');
    updateUnitUI();
}

// --- Bible Verses ---
const VERSES = [
    { text: "Do you not know that your bodies are temples of the Holy Spirit, who is in you, whom you have received from God?", ref: "1 Corinthians 6:19" },
    { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
    { text: "But those who hope in the LORD will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31" },
    { text: "For physical training is of some value, but godliness has value for all things.", ref: "1 Timothy 4:8" },
    { text: "She sets about her work vigorously; her arms are strong for her tasks.", ref: "Proverbs 31:17" },
    { text: "The LORD is my strength and my shield; my heart trusts in him, and he helps me.", ref: "Psalm 28:7" },
    { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", ref: "Joshua 1:9" },
    { text: "Commit to the LORD whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
    { text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged.", ref: "Joshua 1:9" },
    { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
    { text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" },
    { text: "The joy of the LORD is your strength.", ref: "Nehemiah 8:10" },
    { text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace.", ref: "Hebrews 12:11" },
    { text: "Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God.", ref: "Philippians 4:6" },
    { text: "And let us run with perseverance the race marked out for us, fixing our eyes on Jesus.", ref: "Hebrews 12:1-2" },
    { text: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever.", ref: "Psalm 73:26" },
    { text: "The LORD your God is in your midst, a mighty one who will save; he will rejoice over you with gladness.", ref: "Zephaniah 3:17" },
    { text: "Be on your guard; stand firm in the faith; be courageous; be strong.", ref: "1 Corinthians 16:13" },
    { text: "God is our refuge and strength, an ever-present help in trouble.", ref: "Psalm 46:1" },
    { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
    { text: "The LORD is my light and my salvation — whom shall I fear?", ref: "Psalm 27:1" },
    { text: "For God gave us a spirit not of fear but of power and love and self-control.", ref: "2 Timothy 1:7" },
    { text: "Trust in the LORD with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
    { text: "Blessed is the one who perseveres under trial because, having stood the test, that person will receive the crown of life.", ref: "James 1:12" },
    { text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.", ref: "Galatians 5:22-23" },
    { text: "Create in me a pure heart, O God, and renew a steadfast spirit within me.", ref: "Psalm 51:10" },
    { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
    { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" },
    { text: "I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.", ref: "Philippians 3:14" },
    { text: "The name of the LORD is a fortified tower; the righteous run to it and are safe.", ref: "Proverbs 18:10" },
    { text: "Delight yourself in the LORD, and he will give you the desires of your heart.", ref: "Psalm 37:4" },
];

function getDailyVerse() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return VERSES[dayOfYear % VERSES.length];
}

function displayDailyVerse() {
    const verse = getDailyVerse();
    document.getElementById('daily-verse').textContent = `"${verse.text}"`;
    document.getElementById('verse-ref').textContent = `— ${verse.ref}`;
}

// --- Tab Navigation ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// --- Weight Tracking ---
function logWeight() {
    const input = document.getElementById('weight-input');
    const raw = parseFloat(input.value);
    if (!raw || raw < 20 || raw > 1000) {
        alert('Please enter a valid weight.');
        return;
    }
    const weight = isMetric() ? raw / 0.453592 : raw; // store as lbs
    const weights = DB.get('weights', []);
    weights.push({ date: today(), weight });
    DB.set('weights', weights);
    input.value = '';
    updateDashboard();
    drawWeightChart();
    checkAchievements();
}

function drawWeightChart() {
    const canvas = document.getElementById('weight-chart');
    const ctx = canvas.getContext('2d');
    const weights = DB.get('weights', []);

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400;
    ctx.scale(2, 2);

    const w = canvas.offsetWidth;
    const h = 200;

    ctx.clearRect(0, 0, w, h);

    if (weights.length < 2) {
        ctx.fillStyle = '#64748B';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Log at least 2 weights to see your chart', w / 2, h / 2);
        return;
    }

    const last30 = weights.slice(-30);
    const values = last30.map(w => parseFloat(lbsToDisplay(w.weight)));
    const min = Math.min(...values) - 2;
    const max = Math.max(...values) + 2;
    const range = max - min || 1;

    const padTop = 20, padBot = 40, padLeft = 45, padRight = 15;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBot;

    // Grid lines
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((max - (range / 4) * i).toFixed(1), padLeft - 8, y + 4);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';

    values.forEach((val, i) => {
        const x = padLeft + (chartW / (values.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    values.forEach((val, i) => {
        const x = padLeft + (chartW / (values.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#C0C0C0';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    });

    // Date labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelCount = Math.min(last30.length, 6);
    for (let i = 0; i < labelCount; i++) {
        const idx = Math.round(i * (last30.length - 1) / (labelCount - 1));
        const x = padLeft + (chartW / (last30.length - 1)) * idx;
        const label = last30[idx].date.slice(5);
        ctx.fillText(label, x, h - 8);
    }
}

// --- Workout Logging ---
let setCount = 1;

function addSet() {
    setCount++;
    const container = document.getElementById('sets-container');
    const div = document.createElement('div');
    div.className = 'set-row';
    div.dataset.set = setCount;
    div.innerHTML = `
        <span class="set-label">Set ${setCount}</span>
        <input type="number" class="set-weight" placeholder="Weight (${wu()})" step="2.5">
        <span class="x-label">x</span>
        <input type="number" class="set-reps" placeholder="Reps">
    `;
    container.appendChild(div);
}

function removeSet() {
    if (setCount <= 1) return;
    const container = document.getElementById('sets-container');
    container.removeChild(container.lastElementChild);
    setCount--;
}

function logExercise() {
    const name = document.getElementById('exercise-name').value.trim();
    if (!name) {
        alert('Please enter an exercise name.');
        return;
    }

    const sets = [];
    document.querySelectorAll('.set-row').forEach(row => {
        const rawWeight = parseFloat(row.querySelector('.set-weight').value) || 0;
        const weight = isMetric() ? rawWeight / 0.453592 : rawWeight; // store as lbs
        const reps = parseInt(row.querySelector('.set-reps').value) || 0;
        if (reps > 0) {
            sets.push({ weight, reps });
        }
    });

    if (sets.length === 0) {
        alert('Please enter at least one set with reps.');
        return;
    }

    const workouts = DB.get('workouts', []);
    workouts.push({
        date: today(),
        name,
        sets,
        timestamp: Date.now()
    });
    DB.set('workouts', workouts);

    // Check for PRs
    checkForPR(name, sets, workouts);

    // Check achievements
    checkAchievements();

    // Reset form
    document.getElementById('exercise-name').value = '';
    document.querySelectorAll('.set-weight, .set-reps').forEach(input => input.value = '');

    // Reset to 1 set
    const container = document.getElementById('sets-container');
    while (container.children.length > 1) {
        container.removeChild(container.lastElementChild);
    }
    setCount = 1;

    updateTodaysExercises();
    updateOverloadDropdown();
    updateDashboard();
    updateStreak();
}

function updateTodaysExercises() {
    const workouts = DB.get('workouts', []).filter(w => w.date === today());
    const container = document.getElementById('todays-exercises');

    if (workouts.length === 0) {
        container.innerHTML = '<p class="empty-state">No exercises logged today.</p>';
        return;
    }

    container.innerHTML = workouts.map((w, i) => {
        const setsHtml = w.sets.map((s, j) => `Set ${j + 1}: ${lbsToDisplay(s.weight)} ${wu()} x ${s.reps} reps`).join('<br>');
        const totalVol = w.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        return `
            <div class="exercise-item">
                <h4>${escapeHtml(w.name)}</h4>
                <div class="sets-summary">${setsHtml}</div>
                <div class="total-volume">Total Volume: ${parseFloat(lbsToDisplay(totalVol)).toLocaleString()} ${wu()}</div>
            </div>
        `;
    }).join('');
}

// --- Progressive Overload ---
function updateOverloadDropdown() {
    const workouts = DB.get('workouts', []);
    const exercises = [...new Set(workouts.map(w => w.name))];
    const select = document.getElementById('overload-exercise');
    const current = select.value;

    select.innerHTML = '<option value="">-- Choose Exercise --</option>';
    exercises.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });

    if (current && exercises.includes(current)) {
        select.value = current;
    }
}

function showOverloadData() {
    const exercise = document.getElementById('overload-exercise').value;
    const statsEl = document.getElementById('overload-stats');
    const chartEl = document.getElementById('overload-chart');

    if (!exercise) {
        statsEl.classList.add('hidden');
        chartEl.classList.add('hidden');
        return;
    }

    const workouts = DB.get('workouts', []).filter(w => w.name === exercise);
    if (workouts.length === 0) return;

    // Calculate stats
    const maxWeights = workouts.map(w => Math.max(...w.sets.map(s => s.weight)));
    const first = maxWeights[0];
    const latest = maxWeights[maxWeights.length - 1];
    const best = Math.max(...maxWeights);
    const progress = first > 0 ? (((latest - first) / first) * 100).toFixed(1) : 0;

    document.getElementById('overload-first').textContent = `${lbsToDisplay(first)} ${wu()}`;
    document.getElementById('overload-best').textContent = `${lbsToDisplay(best)} ${wu()}`;
    document.getElementById('overload-latest').textContent = `${lbsToDisplay(latest)} ${wu()}`;
    document.getElementById('overload-progress').textContent = `${progress >= 0 ? '+' : ''}${progress}%`;
    document.getElementById('overload-progress').style.color = progress >= 0 ? '#10B981' : '#EF4444';

    statsEl.classList.remove('hidden');
    chartEl.classList.remove('hidden');

    // Draw overload chart
    drawOverloadChart(workouts);
}

function drawOverloadChart(workouts) {
    const canvas = document.getElementById('overload-chart');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400;
    ctx.scale(2, 2);

    const w = canvas.offsetWidth;
    const h = 200;
    ctx.clearRect(0, 0, w, h);

    const maxWeights = workouts.map(w => Math.max(...w.sets.map(s => s.weight)));
    if (maxWeights.length < 2) {
        ctx.fillStyle = '#64748B';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Need more sessions to show progress', w / 2, h / 2);
        return;
    }

    const min = Math.min(...maxWeights) - 5;
    const max = Math.max(...maxWeights) + 5;
    const range = max - min || 1;

    const padTop = 20, padBot = 40, padLeft = 45, padRight = 15;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBot;

    // Grid
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();
        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((max - (range / 4) * i).toFixed(0), padLeft - 8, y + 4);
    }

    // Area fill
    ctx.beginPath();
    maxWeights.forEach((val, i) => {
        const x = padLeft + (chartW / (maxWeights.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.lineTo(padLeft, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(192, 192, 192, 0.1)';
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    maxWeights.forEach((val, i) => {
        const x = padLeft + (chartW / (maxWeights.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    maxWeights.forEach((val, i) => {
        const x = padLeft + (chartW / (maxWeights.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#C0C0C0';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    });

    // Session labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelCount = Math.min(maxWeights.length, 8);
    for (let i = 0; i < labelCount; i++) {
        const idx = Math.round(i * (maxWeights.length - 1) / (labelCount - 1));
        const x = padLeft + (chartW / (maxWeights.length - 1)) * idx;
        ctx.fillText(`#${idx + 1}`, x, h - 8);
    }
}

// --- Food Database Auto-Suggest ---
let selectedFood = null;

function onFoodSearch(query) {
    const dropdown = document.getElementById('food-suggestions');
    if (!query || query.length < 2) {
        dropdown.innerHTML = '';
        dropdown.style.display = 'none';
        return;
    }

    const lower = query.toLowerCase();
    const results = (typeof FOOD_DB !== 'undefined' ? FOOD_DB : []).filter(f =>
        f.name.toLowerCase().includes(lower)
    ).slice(0, 8);

    if (results.length === 0) {
        dropdown.innerHTML = '';
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = results.map(f =>
        `<div class="food-suggestion-item" onmousedown="selectFood('${f.name.replace(/'/g, "\\'")}')">
            <span class="food-sug-name">${f.name}</span>
            <span class="food-sug-info">${f.calories} cal · ${f.protein}p · ${f.serving}</span>
        </div>`
    ).join('');
    dropdown.style.display = 'block';
}

function selectFood(name) {
    const food = (typeof FOOD_DB !== 'undefined' ? FOOD_DB : []).find(f => f.name === name);
    if (!food) return;

    selectedFood = { ...food };
    document.getElementById('meal-name').value = food.name;
    document.getElementById('food-suggestions').style.display = 'none';

    // Show serving row
    const servingRow = document.getElementById('food-serving-row');
    servingRow.style.display = '';
    document.getElementById('food-serving-label').textContent = `1 serving = ${food.serving}`;
    document.getElementById('food-servings').value = 1;

    // Fill macros
    document.getElementById('meal-calories').value = food.calories;
    document.getElementById('meal-protein').value = food.protein;
    document.getElementById('meal-carbs').value = food.carbs;
    document.getElementById('meal-fat').value = food.fat;
}

function onServingsChange() {
    if (!selectedFood) return;
    const mult = parseFloat(document.getElementById('food-servings').value) || 1;
    document.getElementById('meal-calories').value = Math.round(selectedFood.calories * mult);
    document.getElementById('meal-protein').value = Math.round(selectedFood.protein * mult);
    document.getElementById('meal-carbs').value = Math.round(selectedFood.carbs * mult);
    document.getElementById('meal-fat').value = Math.round(selectedFood.fat * mult);
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('food-suggestions');
    if (dropdown && !e.target.closest('#meal-name') && !e.target.closest('#food-suggestions')) {
        dropdown.style.display = 'none';
    }
});

// --- Barcode Scanner ---
let barcodeScanner = null;

function openBarcodeScanner() {
    const modal = document.getElementById('barcode-modal');
    modal.style.display = 'flex';
    document.getElementById('barcode-status').textContent = 'Starting camera...';
    document.getElementById('barcode-result').style.display = 'none';

    barcodeScanner = new Html5Qrcode('barcode-reader');
    barcodeScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 120 }, formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
        ]},
        (decodedText) => { onBarcodeScanned(decodedText); },
        () => {}
    ).then(() => {
        document.getElementById('barcode-status').textContent = 'Point your camera at a barcode';
    }).catch(err => {
        document.getElementById('barcode-status').textContent = 'Camera access denied. Please allow camera permissions.';
    });
}

function closeBarcodeScanner() {
    const modal = document.getElementById('barcode-modal');
    modal.style.display = 'none';
    if (barcodeScanner) {
        barcodeScanner.stop().catch(() => {});
        barcodeScanner.clear();
        barcodeScanner = null;
    }
}

function onBarcodeScanned(barcode) {
    // Stop scanning
    if (barcodeScanner) {
        barcodeScanner.stop().catch(() => {});
    }

    document.getElementById('barcode-status').textContent = 'Looking up product...';
    document.getElementById('barcode-result').style.display = 'none';

    // Look up on Open Food Facts API
    fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 1 && data.product) {
                const p = data.product;
                const n = p.nutriments || {};
                const name = p.product_name || p.generic_name || 'Unknown Product';
                const servingSize = p.serving_size || p.quantity || '';
                const calories = Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0);
                const protein = Math.round(n.proteins_serving || n.proteins_100g || 0);
                const carbs = Math.round(n.carbohydrates_serving || n.carbohydrates_100g || 0);
                const fat = Math.round(n.fat_serving || n.fat_100g || 0);

                const resultDiv = document.getElementById('barcode-result');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div class="barcode-product">
                        <strong>${escapeHtml(name)}</strong>
                        ${servingSize ? `<span class="barcode-serving">${escapeHtml(servingSize)}</span>` : ''}
                        <div class="barcode-macros">
                            <span>${calories} cal</span>
                            <span>${protein}g protein</span>
                            <span>${carbs}g carbs</span>
                            <span>${fat}g fat</span>
                        </div>
                        <button class="btn btn-primary btn-full" onclick="useBarcodeResult('${escapeHtml(name).replace(/'/g, "\\'")}', ${calories}, ${protein}, ${carbs}, ${fat})">Add This Food</button>
                        <button class="btn btn-secondary btn-full" onclick="retryBarcodeScan()" style="margin-top:6px;">Scan Again</button>
                    </div>`;
                document.getElementById('barcode-status').textContent = 'Product found!';
            } else {
                document.getElementById('barcode-status').textContent = 'Product not found in database.';
                const resultDiv = document.getElementById('barcode-result');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div class="barcode-product">
                        <p>Barcode: <strong>${barcode}</strong></p>
                        <p style="color:var(--text-muted);font-size:13px;">This product isn't in the Open Food Facts database. You can enter the nutrition info manually.</p>
                        <button class="btn btn-secondary btn-full" onclick="retryBarcodeScan()">Scan Again</button>
                        <button class="btn btn-secondary btn-full" onclick="closeBarcodeScanner()" style="margin-top:6px;">Enter Manually</button>
                    </div>`;
            }
        })
        .catch(() => {
            document.getElementById('barcode-status').textContent = 'Network error — check your connection.';
            const resultDiv = document.getElementById('barcode-result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="barcode-product">
                    <p style="color:var(--text-muted);font-size:13px;">Could not reach the food database. Make sure you're online.</p>
                    <button class="btn btn-secondary btn-full" onclick="retryBarcodeScan()">Retry</button>
                </div>`;
        });
}

function useBarcodeResult(name, calories, protein, carbs, fat) {
    document.getElementById('meal-name').value = name;
    document.getElementById('meal-calories').value = calories;
    document.getElementById('meal-protein').value = protein;
    document.getElementById('meal-carbs').value = carbs;
    document.getElementById('meal-fat').value = fat;
    document.getElementById('food-serving-row').style.display = 'none';
    selectedFood = null;
    closeBarcodeScanner();
}

function retryBarcodeScan() {
    document.getElementById('barcode-result').style.display = 'none';
    document.getElementById('barcode-status').textContent = 'Point your camera at a barcode';
    if (barcodeScanner) {
        barcodeScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 280, height: 120 }, formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
            ]},
            (decodedText) => { onBarcodeScanned(decodedText); },
            () => {}
        ).catch(() => {});
    }
}

// --- Nutrition / Calorie Tracking ---
function logMeal() {
    const name = document.getElementById('meal-name').value.trim();
    const calories = parseInt(document.getElementById('meal-calories').value) || 0;
    const protein = parseInt(document.getElementById('meal-protein').value) || 0;
    const carbs = parseInt(document.getElementById('meal-carbs').value) || 0;
    const fat = parseInt(document.getElementById('meal-fat').value) || 0;

    if (!name || calories <= 0) {
        alert('Please enter a meal name and calories.');
        return;
    }

    const meals = DB.get('meals', []);
    meals.push({ date: today(), name, calories, protein, carbs, fat, timestamp: Date.now() });
    DB.set('meals', meals);

    document.getElementById('meal-name').value = '';
    document.getElementById('meal-calories').value = '';
    document.getElementById('meal-protein').value = '';
    document.getElementById('meal-carbs').value = '';
    document.getElementById('meal-fat').value = '';
    document.getElementById('food-serving-row').style.display = 'none';
    document.getElementById('food-servings').value = 1;
    selectedFood = null;

    updateMealsList();
    updateNutritionBars();
    updateDashboard();
    checkAchievements();
}

function deleteMeal(timestamp) {
    let meals = DB.get('meals', []);
    meals = meals.filter(m => m.timestamp !== timestamp);
    DB.set('meals', meals);
    updateMealsList();
    updateNutritionBars();
    updateDashboard();
}

function updateMealsList() {
    const meals = DB.get('meals', []).filter(m => m.date === today());
    const container = document.getElementById('meals-list');

    if (meals.length === 0) {
        container.innerHTML = '<p class="empty-state">No meals logged today.</p>';
        return;
    }

    container.innerHTML = meals.map(m => `
        <div class="meal-item">
            <div class="meal-info">
                <h4>${escapeHtml(m.name)}</h4>
                <p>P: ${m.protein}g | C: ${m.carbs}g | F: ${m.fat}g</p>
            </div>
            <span class="meal-cals">${m.calories}</span>
            <button class="delete-btn" onclick="deleteMeal(${m.timestamp})" title="Delete">&times;</button>
        </div>
    `).join('');
}

function updateNutritionBars() {
    const meals = DB.get('meals', []).filter(m => m.date === today());
    const profile = DB.get('profile', {});
    const calGoal = profile.calorieGoal || 2000;
    const proteinGoal = profile.proteinGoal || 150;

    const totals = meals.reduce((acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    document.getElementById('cal-count').textContent = `${totals.calories} / ${calGoal}`;
    document.getElementById('protein-count').textContent = `${totals.protein}g / ${proteinGoal}g`;
    document.getElementById('carbs-count').textContent = `${totals.carbs}g`;
    document.getElementById('fat-count').textContent = `${totals.fat}g`;

    document.getElementById('cal-bar').style.width = `${Math.min((totals.calories / calGoal) * 100, 100)}%`;
    document.getElementById('protein-bar').style.width = `${Math.min((totals.protein / proteinGoal) * 100, 100)}%`;
    document.getElementById('carbs-bar').style.width = `${Math.min((totals.carbs / 300) * 100, 100)}%`;
    document.getElementById('fat-bar').style.width = `${Math.min((totals.fat / 80) * 100, 100)}%`;
}

// --- Coaching System is now in coach.js ---

// --- Gender ---
let selectedGender = 'male';

function setGender(gender) {
    selectedGender = gender;
    document.getElementById('gender-male').classList.toggle('active', gender === 'male');
    document.getElementById('gender-female').classList.toggle('active', gender === 'female');
}

// --- Profile ---
function saveProfile() {
    const metric = isMetric();
    let totalInches, feet, inches;

    if (metric) {
        const cm = parseFloat(document.getElementById('profile-height-cm').value) || 0;
        totalInches = cm / 2.54;
        feet = Math.floor(totalInches / 12);
        inches = Math.round(totalInches % 12);
    } else {
        feet = parseInt(document.getElementById('profile-height-feet').value) || 0;
        inches = parseInt(document.getElementById('profile-height-inches').value) || 0;
        totalInches = feet * 12 + inches;
    }

    const rawWeight = parseFloat(document.getElementById('profile-weight').value) || 0;
    const weightLbs = metric ? rawWeight / 0.453592 : rawWeight; // store as lbs

    // Also save the weight to the weight log if provided
    if (weightLbs > 0) {
        const weights = DB.get('weights', []);
        const todayStr = today();
        const todayIdx = weights.findIndex(w => w.date === todayStr);
        if (todayIdx >= 0) {
            weights[todayIdx].weight = weightLbs;
        } else {
            weights.push({ date: todayStr, weight: weightLbs });
        }
        DB.set('weights', weights);
    }

    const profile = {
        name: document.getElementById('profile-name').value.trim(),
        gender: selectedGender,
        age: parseInt(document.getElementById('profile-age').value) || 0,
        heightFeet: feet,
        heightInches: inches,
        height: totalInches,
        weight: weightLbs,
        goal: document.getElementById('profile-goal').value,
        activity: document.getElementById('profile-activity').value,
        calorieGoal: parseInt(document.getElementById('profile-calories').value) || 2000,
        proteinGoal: parseInt(document.getElementById('profile-protein').value) || 150
    };
    DB.set('profile', profile);
    alert('Profile saved!');
    updateDashboard();
    updateNutritionBars();
    drawWeightChart();
    checkAchievements();
}

function loadProfile() {
    const profile = DB.get('profile', {});
    if (profile.name) document.getElementById('profile-name').value = profile.name;
    if (profile.gender) setGender(profile.gender);
    if (profile.age) document.getElementById('profile-age').value = profile.age;
    if (profile.heightFeet) document.getElementById('profile-height-feet').value = profile.heightFeet;
    if (profile.heightInches !== undefined && profile.heightInches !== null) document.getElementById('profile-height-inches').value = profile.heightInches;
    if (profile.weight) document.getElementById('profile-weight').value = profile.weight;
    if (profile.goal) document.getElementById('profile-goal').value = profile.goal;
    if (profile.activity) document.getElementById('profile-activity').value = profile.activity;
    if (profile.calorieGoal) document.getElementById('profile-calories').value = profile.calorieGoal;
    if (profile.proteinGoal) document.getElementById('profile-protein').value = profile.proteinGoal;

    // If old profile had height in total inches but no feet/inches, convert it
    if (!profile.heightFeet && profile.height) {
        document.getElementById('profile-height-feet').value = Math.floor(profile.height / 12);
        document.getElementById('profile-height-inches').value = profile.height % 12;
    }
}

function calculateCalories() {
    const metric = isMetric();
    let heightInches;

    if (metric) {
        const cm = parseFloat(document.getElementById('profile-height-cm').value) || 0;
        heightInches = cm / 2.54;
    } else {
        const feet = parseInt(document.getElementById('profile-height-feet').value) || 0;
        const inches = parseInt(document.getElementById('profile-height-inches').value) || 0;
        heightInches = feet * 12 + inches;
    }

    const age = parseInt(document.getElementById('profile-age').value) || 0;
    const rawWeight = parseFloat(document.getElementById('profile-weight').value) || 0;
    const currentWeightLbs = metric ? rawWeight / 0.453592 : rawWeight;
    const weights = DB.get('weights', []);
    const currentWeight = currentWeightLbs || (weights.length > 0 ? weights[weights.length - 1].weight : 0);

    if (!currentWeight || !age || !heightInches) {
        alert('Please fill in your age, height, and weight to auto-calculate.');
        return;
    }

    // Mifflin-St Jeor (gender-adjusted)
    const weightKg = currentWeight * 0.453592;
    const heightCm = heightInches * 2.54;
    const genderOffset = selectedGender === 'female' ? -161 : 5;
    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + genderOffset;

    const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725
    };

    const activity = document.getElementById('profile-activity').value;
    let tdee = Math.round(bmr * (activityMultipliers[activity] || 1.2));

    const goal = document.getElementById('profile-goal').value;
    if (goal === 'lose') tdee -= 400;
    else if (goal === 'gain') tdee += 300;

    document.getElementById('profile-calories').value = tdee;

    // Also suggest protein
    const proteinGoal = Math.round(currentWeight * 0.8);
    document.getElementById('profile-protein').value = proteinGoal;
}

// --- Streak Tracking ---
function updateStreak() {
    const workouts = DB.get('workouts', []);
    const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();

    let streak = 0;
    const todayStr = today();

    // Check if worked out today
    if (dates.includes(todayStr)) {
        streak = 1;
        let checkDate = new Date();
        for (let i = 1; i < 365; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const dateStr = checkDate.toISOString().split('T')[0];
            if (dates.includes(dateStr)) {
                streak++;
            } else {
                break;
            }
        }
    }

    document.getElementById('streak-count').textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
}

// --- Dashboard ---
function updateDashboard() {
    const workouts = DB.get('workouts', []).filter(w => w.date === today());
    const meals = DB.get('meals', []).filter(m => m.date === today());
    const weights = DB.get('weights', []);
    const profile = DB.get('profile', {});

    document.getElementById('today-workouts').textContent = workouts.length;
    document.getElementById('today-calories').textContent = meals.reduce((sum, m) => sum + m.calories, 0);
    document.getElementById('calorie-goal-text').textContent = `Goal: ${profile.calorieGoal || '--'}`;

    if (weights.length > 0) {
        document.getElementById('current-weight').textContent = `${lbsToDisplay(weights[weights.length - 1].weight)} ${wu()}`;
    }

    updateStreak();
    updateRecentWorkouts();
    renderCalendarHeatmap();
    renderMuscleHeatmap();
    renderAchievements();
}

function updateRecentWorkouts() {
    const workouts = DB.get('workouts', []).slice(-10).reverse();
    const container = document.getElementById('recent-workouts');

    if (workouts.length === 0) {
        container.innerHTML = '<p class="empty-state">No workouts logged yet. Start training!</p>';
        return;
    }

    container.innerHTML = workouts.map(w => {
        const totalVol = w.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        const bestSet = w.sets.reduce((best, s) => s.weight > best.weight ? s : best, w.sets[0]);
        return `
            <div class="workout-item">
                <div>
                    <h4>${escapeHtml(w.name)}</h4>
                    <p>${w.date} &middot; ${w.sets.length} sets &middot; Best: ${lbsToDisplay(bestSet.weight)}${wu()} x ${bestSet.reps}</p>
                </div>
                <span style="font-weight:600; color:var(--primary);">${parseFloat(lbsToDisplay(totalVol)).toLocaleString()} ${wu()}</span>
            </div>
        `;
    }).join('');
}

// --- Data Management ---
function exportData() {
    const data = {
        profile: DB.get('profile', {}),
        workouts: DB.get('workouts', []),
        meals: DB.get('meals', []),
        weights: DB.get('weights', []),
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faithfit-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function clearAllData() {
    if (confirm('Are you sure you want to delete ALL your data? This cannot be undone!')) {
        if (confirm('Really? This will erase all workouts, meals, and weight history.')) {
            ['profile', 'workouts', 'meals', 'weights'].forEach(key => {
                localStorage.removeItem('faithfit_' + key);
            });
            location.reload();
        }
    }
}

// --- Utilities ---
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- PWA Install ---
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('install-btn');
    if (btn) btn.style.display = 'inline-flex';
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(result => {
            if (result.outcome === 'accepted') {
                document.getElementById('install-btn').style.display = 'none';
            }
            deferredPrompt = null;
        });
    } else {
        alert('To install Iron Faith:\n\n• iOS: Tap the Share button, then "Add to Home Screen"\n• Android Chrome: Tap the menu (⋮), then "Install app"\n• Desktop: Look for the install icon in the address bar');
    }
}

window.addEventListener('appinstalled', () => {
    document.getElementById('install-btn').style.display = 'none';
    deferredPrompt = null;
});

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

// --- Sharing ---
function shareProgress() {
    const profile = DB.get('profile', {});
    const workouts = DB.get('workouts', []);
    const meals = DB.get('meals', []).filter(m => m.date === today());
    const weights = DB.get('weights', []);
    const todayWorkouts = workouts.filter(w => w.date === today());

    // Calculate streak
    const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
    let streak = 0;
    if (dates.includes(today())) {
        streak = 1;
        const checkDate = new Date();
        for (let i = 1; i < 365; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            if (dates.includes(checkDate.toISOString().split('T')[0])) streak++;
            else break;
        }
    }

    const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
    const currentWeight = weights.length > 0 ? `${lbsToDisplay(weights[weights.length - 1].weight)} ${wu()}` : 'Not tracked';
    const name = profile.name || 'An Iron Faith user';

    const verse = getDailyVerse();

    let text = `💪 ${name}'s Iron Faith Progress\n`;
    text += `📅 ${today()}\n\n`;
    text += `🏋️ Workouts today: ${todayWorkouts.length}\n`;
    text += `🔥 Current streak: ${streak} day${streak !== 1 ? 's' : ''}\n`;
    text += `🍽️ Calories today: ${totalCalories}\n`;
    text += `⚖️ Weight: ${currentWeight}\n`;

    if (todayWorkouts.length > 0) {
        text += `\nToday's exercises:\n`;
        todayWorkouts.forEach(w => {
            const bestSet = w.sets.reduce((best, s) => s.weight > best.weight ? s : best, w.sets[0]);
            text += `  • ${w.name}: ${lbsToDisplay(bestSet.weight)}${wu()} x ${bestSet.reps}\n`;
        });
    }

    text += `\n✨ "${verse.text}" — ${verse.ref}\n`;
    text += `\n📲 Track your fitness journey with Iron Faith!`;

    const shareData = {
        title: 'My Iron Faith Progress',
        text: text
    };

    if (navigator.share) {
        navigator.share(shareData).catch(() => {});
    } else {
        copyToClipboard(text, 'Progress copied to clipboard! Paste it anywhere to share.');
    }
}

function copyToClipboard(text, message) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(message || 'Copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(message || 'Copied to clipboard!');
    });
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Import Data ---
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.profile && !data.workouts && !data.meals && !data.weights) {
                alert('Invalid Iron Faith backup file.');
                return;
            }

            if (!confirm('This will replace all your current data with the imported data. Continue?')) return;

            if (data.profile) DB.set('profile', data.profile);
            if (data.workouts) DB.set('workouts', data.workouts);
            if (data.meals) DB.set('meals', data.meals);
            if (data.weights) DB.set('weights', data.weights);

            alert('Data imported successfully!');
            location.reload();
        } catch {
            alert('Could not read file. Make sure it\'s a valid Iron Faith backup.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// --- Midnight Reset ---
// Refreshes all daily data (meals, workouts, verse) when the date changes
let currentDay = today();

function scheduleMidnightReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // next midnight in user's local timezone
    const msUntilMidnight = midnight - now;

    setTimeout(() => {
        currentDay = today();
        displayDailyVerse();
        updateDashboard();
        updateTodaysExercises();
        updateMealsList();
        updateNutritionBars();
        showToast('New day! Daily stats have been reset.');
        // Schedule the next midnight reset
        scheduleMidnightReset();
    }, msUntilMidnight);
}

// Also check on visibility change (user returns to tab after midnight)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && today() !== currentDay) {
        currentDay = today();
        displayDailyVerse();
        updateDashboard();
        updateTodaysExercises();
        updateMealsList();
        updateNutritionBars();
        showToast('New day! Daily stats have been reset.');
        scheduleMidnightReset();
    }
});

// --- PR Detection ---
function checkForPR(exerciseName, newSets, allWorkouts) {
    const previousLogs = allWorkouts.filter(w => w.name === exerciseName);
    if (previousLogs.length <= 1) return; // need history to compare

    const oldLogs = previousLogs.slice(0, -1);
    const oldMaxWeight = Math.max(...oldLogs.flatMap(w => w.sets.map(s => s.weight)));
    const oldMaxVol = Math.max(...oldLogs.map(w => w.sets.reduce((s, set) => s + set.weight * set.reps, 0)));
    const newMaxWeight = Math.max(...newSets.map(s => s.weight));
    const newVol = newSets.reduce((s, set) => s + set.weight * set.reps, 0);

    const prs = [];
    if (newMaxWeight > oldMaxWeight && newMaxWeight > 0) prs.push(`Weight PR: ${lbsToDisplay(newMaxWeight)} ${wu()}`);
    if (newVol > oldMaxVol && newVol > 0) prs.push(`Volume PR: ${parseFloat(lbsToDisplay(newVol)).toLocaleString()} ${wu()}`);

    if (prs.length > 0) {
        const prList = DB.get('prs', []);
        prs.forEach(pr => {
            prList.push({ exercise: exerciseName, pr, date: today() });
        });
        DB.set('prs', prList);
        showPRToast(exerciseName, prs);
    }
}

function showPRToast(exercise, prs) {
    const el = document.createElement('div');
    el.className = 'pr-toast';
    el.innerHTML = `<span class="pr-trophy">&#x1F3C6;</span><strong>NEW PR!</strong><br>${escapeHtml(exercise)}<br>${prs.join(' | ')}`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3500);
}

// --- Achievement Badges ---
const ACHIEVEMENTS = [
    // Workout milestones
    { id: 'first_workout', name: 'First Rep', desc: 'Log your first workout', icon: '&#x1F4AA;', check: ctx => ctx.total >= 1 },
    { id: 'ten_workouts', name: 'Getting Serious', desc: 'Log 10 workouts', icon: '&#x1F525;', check: ctx => ctx.total >= 10 },
    { id: 'twentyfive_workouts', name: 'Quarter Century', desc: 'Log 25 workouts', icon: '&#x1F4AB;', check: ctx => ctx.total >= 25 },
    { id: 'fifty_workouts', name: 'Iron Regular', desc: 'Log 50 workouts', icon: '&#x2B50;', check: ctx => ctx.total >= 50 },
    { id: 'hundred_workouts', name: 'Centurion', desc: 'Log 100 workouts', icon: '&#x1F451;', check: ctx => ctx.total >= 100 },
    { id: 'twofifty_workouts', name: 'Iron Disciple', desc: 'Log 250 workouts', icon: '&#x1F5E1;', check: ctx => ctx.total >= 250 },
    { id: 'five_hundred', name: 'Legend', desc: 'Log 500 workouts', icon: '&#x1F48E;', check: ctx => ctx.total >= 500 },
    { id: 'thousand_workouts', name: 'Walking Temple', desc: 'Log 1000 workouts', icon: '&#x26EA;', check: ctx => ctx.total >= 1000 },
    // Streaks
    { id: 'three_streak', name: 'Momentum', desc: '3-day workout streak', icon: '&#x26A1;', check: ctx => ctx.streak >= 3 },
    { id: 'week_streak', name: '7-Day Warrior', desc: '7-day workout streak', icon: '&#x1F4A5;', check: ctx => ctx.streak >= 7 },
    { id: 'two_week_streak', name: 'Unstoppable', desc: '14-day workout streak', icon: '&#x1F30A;', check: ctx => ctx.streak >= 14 },
    { id: 'month_streak', name: '30-Day Beast', desc: '30-day workout streak', icon: '&#x1F981;', check: ctx => ctx.streak >= 30 },
    { id: 'sixty_streak', name: 'Iron Will', desc: '60-day workout streak', icon: '&#x1F9CA;', check: ctx => ctx.streak >= 60 },
    { id: 'hundred_streak', name: 'Unbreakable', desc: '100-day workout streak', icon: '&#x1F6E1;', check: ctx => ctx.streak >= 100 },
    // PRs
    { id: 'first_pr', name: 'Record Breaker', desc: 'Hit your first PR', icon: '&#x1F3C6;', check: ctx => ctx.prCount >= 1 },
    { id: 'five_prs', name: 'Climbing', desc: 'Hit 5 personal records', icon: '&#x1F4C8;', check: ctx => ctx.prCount >= 5 },
    { id: 'ten_prs', name: 'PR Machine', desc: 'Hit 10 personal records', icon: '&#x1F3C5;', check: ctx => ctx.prCount >= 10 },
    { id: 'twentyfive_prs', name: 'Relentless', desc: 'Hit 25 personal records', icon: '&#x1F525;', check: ctx => ctx.prCount >= 25 },
    { id: 'fifty_prs', name: 'Elite', desc: 'Hit 50 personal records', icon: '&#x1F396;', check: ctx => ctx.prCount >= 50 },
    // Exercise variety
    { id: 'five_exercises', name: 'Well Rounded', desc: 'Log 5 different exercises', icon: '&#x1F504;', check: ctx => ctx.uniqueExercises >= 5 },
    { id: 'ten_exercises', name: 'Versatile', desc: 'Log 10 different exercises', icon: '&#x1F3AF;', check: ctx => ctx.uniqueExercises >= 10 },
    { id: 'fifteen_exercises', name: 'Arsenal', desc: 'Log 15 different exercises', icon: '&#x2694;', check: ctx => ctx.uniqueExercises >= 15 },
    { id: 'twentyfive_exercises', name: 'Master of All', desc: 'Log 25 different exercises', icon: '&#x1F9E0;', check: ctx => ctx.uniqueExercises >= 25 },
    // Weight tracking
    { id: 'logged_weight', name: 'Accountable', desc: 'Log your body weight', icon: '&#x2696;', check: ctx => ctx.weighIns >= 1 },
    { id: 'ten_weigh_ins', name: 'Consistent Tracker', desc: 'Log body weight 10 times', icon: '&#x1F4CA;', check: ctx => ctx.weighIns >= 10 },
    { id: 'fifty_weigh_ins', name: 'Data Driven', desc: 'Log body weight 50 times', icon: '&#x1F4C9;', check: ctx => ctx.weighIns >= 50 },
    // Nutrition
    { id: 'logged_meal', name: 'Fuel Up', desc: 'Log your first meal', icon: '&#x1F372;', check: ctx => ctx.meals >= 1 },
    { id: 'fifty_meals', name: 'Meal Prepper', desc: 'Log 50 meals', icon: '&#x1F957;', check: ctx => ctx.meals >= 50 },
    { id: 'hundred_meals', name: 'Nutrition Nerd', desc: 'Log 100 meals', icon: '&#x1F468;', check: ctx => ctx.meals >= 100 },
    // Volume milestones (total lbs lifted all time)
    { id: 'ten_k_volume', name: 'Heavy Lifter', desc: 'Lift 10,000 lbs total', icon: '&#x1F3CB;', check: ctx => ctx.totalVolume >= 10000 },
    { id: 'fifty_k_volume', name: 'Iron Mountain', desc: 'Lift 50,000 lbs total', icon: '&#x26F0;', check: ctx => ctx.totalVolume >= 50000 },
    { id: 'hundred_k_volume', name: 'Titan', desc: 'Lift 100,000 lbs total', icon: '&#x1F30D;', check: ctx => ctx.totalVolume >= 100000 },
    { id: 'half_mil_volume', name: 'Demigod', desc: 'Lift 500,000 lbs total', icon: '&#x1FA90;', check: ctx => ctx.totalVolume >= 500000 },
    { id: 'mil_volume', name: 'Million Pound Club', desc: 'Lift 1,000,000 lbs total', icon: '&#x1F4A0;', check: ctx => ctx.totalVolume >= 1000000 },
    // Big three
    { id: 'thousand_club', name: '1000lb Club', desc: 'Bench+Squat+Deadlift total 1000+ lbs', icon: '&#x1F947;', check: ctx => ctx.bigThreeTotal >= 1000 },
    // Muscle coverage
    { id: 'full_body_week', name: 'No Weak Links', desc: 'Hit all 7 muscle groups in one week', icon: '&#x1F9BE;', check: ctx => ctx.muscleGroupsHit >= 7 },
    // Training days in a single week
    { id: 'five_day_week', name: 'Grinder', desc: 'Train 5 days in a single week', icon: '&#x23F1;', check: ctx => ctx.bestWeekDays >= 5 },
    { id: 'six_day_week', name: 'No Days Off', desc: 'Train 6+ days in a single week', icon: '&#x1F525;', check: ctx => ctx.bestWeekDays >= 6 },
    // Early bird / night owl
    { id: 'early_bird', name: 'Early Bird', desc: 'Log a workout before 7am', icon: '&#x1F305;', check: ctx => ctx.earlyWorkout },
    { id: 'night_owl', name: 'Night Owl', desc: 'Log a workout after 9pm', icon: '&#x1F319;', check: ctx => ctx.lateWorkout },
    // Profile setup
    { id: 'profile_complete', name: 'Locked In', desc: 'Complete your profile', icon: '&#x1F512;', check: ctx => ctx.profileComplete },
    // Coach interaction
    { id: 'used_coach', name: 'Coachable', desc: 'Ask the coach a question', icon: '&#x1F4AC;', check: ctx => ctx.coachUsed },
];

function getAchievementContext() {
    const workouts = DB.get('workouts', []);
    const prs = DB.get('prs', []);
    const weights = DB.get('weights', []);
    const meals = DB.get('meals', []);
    const profile = DB.get('profile', {});

    // Calculate streak
    const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
    let streak = 0;
    if (dates.includes(today())) {
        streak = 1;
        let d = new Date();
        for (let i = 1; i < 365; i++) {
            d.setDate(d.getDate() - 1);
            if (dates.includes(d.toISOString().split('T')[0])) streak++;
            else break;
        }
    }

    // Big three total (best weight per lift)
    let bigThreeTotal = 0;
    ['Bench Press', 'Squat', 'Deadlift'].forEach(lift => {
        const logs = workouts.filter(w => w.name === lift);
        if (logs.length > 0) {
            bigThreeTotal += Math.max(...logs.flatMap(w => w.sets.map(s => s.weight)));
        }
    });

    // Total volume (all time)
    const totalVolume = workouts.reduce((sum, w) => sum + w.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);

    // Muscle groups hit this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];
    const weekWorkouts = workouts.filter(w => w.date >= weekStr);
    const muscleMap = {
        chest: ['Bench Press','Incline Bench Press','Decline Bench Press','Dumbbell Bench Press','Incline Dumbbell Press','Dumbbell Fly','Cable Fly','Chest Dips','Push-ups','Machine Chest Press'],
        back: ['Deadlift','Romanian Deadlift','Barbell Row','Dumbbell Row','Lat Pulldown','Pull-ups','Chin-ups','Seated Cable Row','T-Bar Row'],
        shoulders: ['Overhead Press','Seated Dumbbell Press','Arnold Press','Lateral Raises','Front Raises','Rear Delt Fly','Face Pulls'],
        legs: ['Squat','Front Squat','Leg Press','Lunges','Walking Lunges','Leg Extension','Leg Curl','Hip Thrust','Calf Raises'],
        biceps: ['Bicep Curls','Hammer Curls','Preacher Curls','EZ Bar Curl','Cable Curl'],
        triceps: ['Tricep Pushdown','Overhead Tricep Extension','Skull Crushers','Close Grip Bench Press','Tricep Dips'],
        core: ['Plank','Crunches','Hanging Leg Raise','Cable Crunch','Ab Wheel Rollout','Russian Twist','Leg Raises'],
    };
    const muscleGroupsHit = Object.entries(muscleMap).filter(([, exercises]) =>
        weekWorkouts.some(w => exercises.some(e => w.name.toLowerCase() === e.toLowerCase()))
    ).length;

    // Best training days in a single week
    const weekBuckets = {};
    dates.forEach(d => {
        const dt = new Date(d);
        const weekStart = new Date(dt);
        weekStart.setDate(dt.getDate() - dt.getDay());
        const key = weekStart.toISOString().split('T')[0];
        weekBuckets[key] = (weekBuckets[key] || 0) + 1;
    });
    const bestWeekDays = Math.max(0, ...Object.values(weekBuckets));

    // Early bird / night owl
    let earlyWorkout = false;
    let lateWorkout = false;
    workouts.forEach(w => {
        if (w.timestamp) {
            const hour = new Date(w.timestamp).getHours();
            if (hour < 7) earlyWorkout = true;
            if (hour >= 21) lateWorkout = true;
        }
    });

    // Profile complete
    const profileComplete = !!(profile.name && profile.age && profile.weight && profile.goal);

    // Coach used
    const coachUsed = DB.get('coachUsed', false);

    return {
        total: workouts.length,
        streak,
        prCount: prs.length,
        uniqueExercises: new Set(workouts.map(w => w.name)).size,
        weighIns: weights.length,
        meals: meals.length,
        bigThreeTotal,
        totalVolume,
        muscleGroupsHit,
        bestWeekDays,
        earlyWorkout,
        lateWorkout,
        profileComplete,
        coachUsed,
    };
}

function checkAchievements() {
    const unlocked = DB.get('achievements', []);
    const ctx = getAchievementContext();
    let newUnlock = false;

    ACHIEVEMENTS.forEach(a => {
        if (!unlocked.includes(a.id) && a.check(ctx)) {
            unlocked.push(a.id);
            newUnlock = true;
            showToast(`${a.icon} Achievement Unlocked: ${a.name}!`);
        }
    });

    if (newUnlock) DB.set('achievements', unlocked);
}

function renderAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    const unlocked = DB.get('achievements', []);

    container.innerHTML = ACHIEVEMENTS.map(a => {
        const earned = unlocked.includes(a.id);
        return `<div class="badge ${earned ? 'earned' : 'locked'}" title="${a.desc}">
            <span class="badge-icon">${a.icon}</span>
            <span class="badge-name">${a.name}</span>
        </div>`;
    }).join('');
}

// --- Calendar Heatmap ---
function renderCalendarHeatmap() {
    const container = document.getElementById('calendar-heatmap');
    if (!container) return;
    const workouts = DB.get('workouts', []);

    // Count workouts per day for last 90 days
    const counts = {};
    workouts.forEach(w => { counts[w.date] = (counts[w.date] || 0) + 1; });

    const now = new Date();
    const days = [];
    for (let i = 89; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({ date: dateStr, count: counts[dateStr] || 0, day: d.getDay() });
    }

    // Build grid — weeks as columns, days as rows
    const weeks = [];
    let currentWeek = [];
    days.forEach((d, i) => {
        if (i === 0) {
            // Pad first week
            for (let p = 0; p < d.day; p++) currentWeek.push(null);
        }
        currentWeek.push(d);
        if (d.day === 6 || i === days.length - 1) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    let html = '<div class="heatmap-grid">';
    // Day labels
    html += '<div class="heatmap-labels"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>';
    html += '<div class="heatmap-weeks">';
    weeks.forEach(week => {
        html += '<div class="heatmap-week">';
        for (let r = 0; r < 7; r++) {
            const cell = week[r];
            if (!cell) {
                html += '<div class="heatmap-cell empty"></div>';
            } else {
                const level = cell.count === 0 ? 0 : cell.count <= 2 ? 1 : cell.count <= 4 ? 2 : 3;
                html += `<div class="heatmap-cell level-${level}" title="${cell.date}: ${cell.count} exercises"></div>`;
            }
        }
        html += '</div>';
    });
    html += '</div></div>';

    // Month labels
    const months = [];
    let lastMonth = -1;
    days.forEach((d, i) => {
        const m = new Date(d.date).getMonth();
        if (m !== lastMonth) {
            months.push({ name: new Date(d.date).toLocaleString('en', { month: 'short' }), index: i });
            lastMonth = m;
        }
    });
    html += '<div class="heatmap-months">' + months.map(m => `<span>${m.name}</span>`).join('') + '</div>';

    container.innerHTML = html;
}

// --- Muscle Heatmap (SVG Body Mannequin) ---
function renderMuscleHeatmap() {
    const container = document.getElementById('muscle-heatmap');
    if (!container) return;

    const workouts = DB.get('workouts', []);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];
    const weekWorkouts = workouts.filter(w => w.date >= weekStr);

    // Detailed sub-group muscle map
    const muscleMap = {
        upper_chest:    ['Incline Bench Press','Incline Dumbbell Press','Low Incline Dumbbell Press'],
        mid_chest:      ['Bench Press','Dumbbell Bench Press','Machine Chest Press','Dumbbell Fly','Cable Fly','Pec Deck','Push-ups'],
        lower_chest:    ['Decline Bench Press','Chest Dips'],
        front_delts:    ['Overhead Press','Seated Dumbbell Press','Arnold Press','Front Raises','Machine Shoulder Press'],
        side_delts:     ['Lateral Raises','Cable Lateral Raise','Upright Row'],
        rear_delts:     ['Rear Delt Fly','Face Pulls','Reverse Pec Deck'],
        traps:          ['Shrugs','Barbell Shrugs','Upright Row','Face Pulls'],
        lats:           ['Lat Pulldown','Pull-ups','Chin-ups','Straight Arm Pulldown'],
        upper_back:     ['Barbell Row','Dumbbell Row','Pendlay Row','T-Bar Row','Seated Cable Row'],
        lower_back:     ['Deadlift','Romanian Deadlift','Sumo Deadlift','Hyperextensions','Good Mornings'],
        biceps:         ['Bicep Curls','Hammer Curls','Preacher Curls','Concentration Curls','Incline Dumbbell Curl','EZ Bar Curl','Cable Curl','Spider Curls'],
        triceps:        ['Tricep Pushdown','Overhead Tricep Extension','Skull Crushers','Close Grip Bench Press','Tricep Dips','Tricep Kickbacks','Cable Overhead Extension','Diamond Push-ups'],
        forearms:       ['Hammer Curls','Wrist Curls','Reverse Curls','Farmer Carries'],
        abs:            ['Crunches','Hanging Leg Raise','Cable Crunch','Ab Wheel Rollout','Bicycle Crunches','Leg Raises','Dead Bug','Mountain Climbers'],
        obliques:       ['Russian Twist','Woodchoppers','Pallof Press','Side Plank'],
        quads:          ['Squat','Front Squat','Goblet Squat','Bulgarian Split Squat','Hack Squat','Leg Press','Lunges','Walking Lunges','Reverse Lunges','Leg Extension','Step-ups','Box Jumps'],
        hamstrings:     ['Romanian Deadlift','Leg Curl','Seated Leg Curl','Sumo Deadlift','Good Mornings','Nordic Curl'],
        glutes:         ['Hip Thrust','Glute Bridge','Bulgarian Split Squat','Squat','Lunges','Walking Lunges','Reverse Lunges','Step-ups','Cable Pull-through'],
        calves:         ['Calf Raises','Seated Calf Raise','Standing Calf Raise','Single-Leg Calf Raise'],
    };

    // Calculate volume per sub-group
    const volume = {};
    Object.keys(muscleMap).forEach(g => volume[g] = 0);
    weekWorkouts.forEach(w => {
        for (const [group, exercises] of Object.entries(muscleMap)) {
            if (exercises.some(e => w.name.toLowerCase() === e.toLowerCase())) {
                volume[group] += w.sets.length;
            }
        }
    });

    const maxVol = Math.max(...Object.values(volume), 1);

    // Color function: 0 = base gray, then green gradient
    function heatColor(group) {
        const v = volume[group] || 0;
        if (v === 0) return 'rgba(255,255,255,0.06)';
        const ratio = v / maxVol;
        if (ratio > 0.7) return 'rgba(74,222,128,0.85)';
        if (ratio > 0.4) return 'rgba(74,222,128,0.5)';
        return 'rgba(74,222,128,0.25)';
    }

    function strokeColor(group) {
        const v = volume[group] || 0;
        if (v === 0) return 'rgba(255,255,255,0.1)';
        return 'rgba(74,222,128,0.4)';
    }

    // Build SVG mannequin — front and back views
    // Each muscle region is a path/shape that gets colored by volume
    let html = '<div class="muscle-map-body">';

    // --- FRONT VIEW ---
    html += `<div class="mannequin-view"><div class="mannequin-label">Front</div>`;
    html += `<svg viewBox="0 0 200 420" class="mannequin-svg" xmlns="http://www.w3.org/2000/svg">`;

    // Head
    html += `<ellipse cx="100" cy="30" rx="18" ry="22" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`;
    // Neck
    html += `<rect x="92" y="50" width="16" height="14" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;

    // Traps (front visible portion)
    html += `<path d="M80,64 L92,60 L100,64 L108,60 L120,64 L116,74 L84,74 Z" fill="${heatColor('traps')}" stroke="${strokeColor('traps')}" stroke-width="0.7" data-muscle="traps" data-sets="${volume.traps}"><title>Traps: ${volume.traps} sets</title></path>`;

    // Front Delts
    html += `<path d="M64,74 L80,68 L84,74 L84,96 L68,92 Z" fill="${heatColor('front_delts')}" stroke="${strokeColor('front_delts')}" stroke-width="0.7" data-muscle="front_delts"><title>Front Delts: ${volume.front_delts} sets</title></path>`;
    html += `<path d="M136,74 L120,68 L116,74 L116,96 L132,92 Z" fill="${heatColor('front_delts')}" stroke="${strokeColor('front_delts')}" stroke-width="0.7" data-muscle="front_delts"><title>Front Delts: ${volume.front_delts} sets</title></path>`;

    // Side Delts
    html += `<path d="M58,78 L64,74 L68,92 L60,94 Z" fill="${heatColor('side_delts')}" stroke="${strokeColor('side_delts')}" stroke-width="0.7"><title>Side Delts: ${volume.side_delts} sets</title></path>`;
    html += `<path d="M142,78 L136,74 L132,92 L140,94 Z" fill="${heatColor('side_delts')}" stroke="${strokeColor('side_delts')}" stroke-width="0.7"><title>Side Delts: ${volume.side_delts} sets</title></path>`;

    // Upper Chest
    html += `<path d="M84,74 L100,78 L116,74 L116,90 L100,94 L84,90 Z" fill="${heatColor('upper_chest')}" stroke="${strokeColor('upper_chest')}" stroke-width="0.7"><title>Upper Chest: ${volume.upper_chest} sets</title></path>`;

    // Mid Chest
    html += `<path d="M84,90 L100,94 L116,90 L116,110 L100,114 L84,110 Z" fill="${heatColor('mid_chest')}" stroke="${strokeColor('mid_chest')}" stroke-width="0.7"><title>Mid Chest: ${volume.mid_chest} sets</title></path>`;

    // Lower Chest
    html += `<path d="M84,110 L100,114 L116,110 L114,122 L100,124 L86,122 Z" fill="${heatColor('lower_chest')}" stroke="${strokeColor('lower_chest')}" stroke-width="0.7"><title>Lower Chest: ${volume.lower_chest} sets</title></path>`;

    // Biceps
    html += `<path d="M60,94 L68,92 L66,140 L56,138 Z" fill="${heatColor('biceps')}" stroke="${strokeColor('biceps')}" stroke-width="0.7"><title>Biceps: ${volume.biceps} sets</title></path>`;
    html += `<path d="M140,94 L132,92 L134,140 L144,138 Z" fill="${heatColor('biceps')}" stroke="${strokeColor('biceps')}" stroke-width="0.7"><title>Biceps: ${volume.biceps} sets</title></path>`;

    // Triceps (front visible inner arm)
    html += `<path d="M68,92 L84,96 L82,140 L66,140 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;
    html += `<path d="M132,92 L116,96 L118,140 L134,140 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;

    // Forearms
    html += `<path d="M56,138 L66,140 L62,188 L52,184 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M82,140 L66,140 L62,188 L76,188 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M144,138 L134,140 L138,188 L148,184 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M118,140 L134,140 L138,188 L124,188 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;

    // Abs
    html += `<path d="M88,124 L100,126 L112,124 L112,180 L100,182 L88,180 Z" fill="${heatColor('abs')}" stroke="${strokeColor('abs')}" stroke-width="0.7"><title>Abs: ${volume.abs} sets</title></path>`;

    // Obliques
    html += `<path d="M84,122 L88,124 L88,180 L82,178 L80,140 Z" fill="${heatColor('obliques')}" stroke="${strokeColor('obliques')}" stroke-width="0.7"><title>Obliques: ${volume.obliques} sets</title></path>`;
    html += `<path d="M116,122 L112,124 L112,180 L118,178 L120,140 Z" fill="${heatColor('obliques')}" stroke="${strokeColor('obliques')}" stroke-width="0.7"><title>Obliques: ${volume.obliques} sets</title></path>`;

    // Quads
    html += `<path d="M82,190 L100,194 L100,290 L80,286 Z" fill="${heatColor('quads')}" stroke="${strokeColor('quads')}" stroke-width="0.7"><title>Quads: ${volume.quads} sets</title></path>`;
    html += `<path d="M118,190 L100,194 L100,290 L120,286 Z" fill="${heatColor('quads')}" stroke="${strokeColor('quads')}" stroke-width="0.7"><title>Quads: ${volume.quads} sets</title></path>`;

    // Calves (front - tibialis area + calves)
    html += `<path d="M82,296 L98,298 L96,370 L78,366 Z" fill="${heatColor('calves')}" stroke="${strokeColor('calves')}" stroke-width="0.7"><title>Calves: ${volume.calves} sets</title></path>`;
    html += `<path d="M118,296 L102,298 L104,370 L122,366 Z" fill="${heatColor('calves')}" stroke="${strokeColor('calves')}" stroke-width="0.7"><title>Calves: ${volume.calves} sets</title></path>`;

    html += `</svg></div>`;

    // --- BACK VIEW ---
    html += `<div class="mannequin-view"><div class="mannequin-label">Back</div>`;
    html += `<svg viewBox="0 0 200 420" class="mannequin-svg" xmlns="http://www.w3.org/2000/svg">`;

    // Head
    html += `<ellipse cx="100" cy="30" rx="18" ry="22" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`;
    // Neck
    html += `<rect x="92" y="50" width="16" height="14" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;

    // Traps (back - larger)
    html += `<path d="M76,64 L92,56 L100,62 L108,56 L124,64 L120,82 L80,82 Z" fill="${heatColor('traps')}" stroke="${strokeColor('traps')}" stroke-width="0.7"><title>Traps: ${volume.traps} sets</title></path>`;

    // Rear Delts
    html += `<path d="M60,74 L76,68 L80,82 L80,98 L64,94 Z" fill="${heatColor('rear_delts')}" stroke="${strokeColor('rear_delts')}" stroke-width="0.7"><title>Rear Delts: ${volume.rear_delts} sets</title></path>`;
    html += `<path d="M140,74 L124,68 L120,82 L120,98 L136,94 Z" fill="${heatColor('rear_delts')}" stroke="${strokeColor('rear_delts')}" stroke-width="0.7"><title>Rear Delts: ${volume.rear_delts} sets</title></path>`;

    // Upper Back / Rhomboids
    html += `<path d="M80,82 L100,86 L120,82 L120,120 L100,124 L80,120 Z" fill="${heatColor('upper_back')}" stroke="${strokeColor('upper_back')}" stroke-width="0.7"><title>Upper Back: ${volume.upper_back} sets</title></path>`;

    // Lats
    html += `<path d="M80,98 L80,120 L100,124 L100,160 L78,150 L74,110 Z" fill="${heatColor('lats')}" stroke="${strokeColor('lats')}" stroke-width="0.7"><title>Lats: ${volume.lats} sets</title></path>`;
    html += `<path d="M120,98 L120,120 L100,124 L100,160 L122,150 L126,110 Z" fill="${heatColor('lats')}" stroke="${strokeColor('lats')}" stroke-width="0.7"><title>Lats: ${volume.lats} sets</title></path>`;

    // Lower Back / Erectors
    html += `<path d="M86,150 L100,160 L114,150 L114,186 L100,190 L86,186 Z" fill="${heatColor('lower_back')}" stroke="${strokeColor('lower_back')}" stroke-width="0.7"><title>Lower Back: ${volume.lower_back} sets</title></path>`;

    // Triceps (back view - more visible)
    html += `<path d="M56,94 L64,94 L66,140 L54,138 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;
    html += `<path d="M64,94 L80,98 L78,140 L66,140 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;
    html += `<path d="M144,94 L136,94 L134,140 L146,138 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;
    html += `<path d="M136,94 L120,98 L122,140 L134,140 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;

    // Forearms (back)
    html += `<path d="M54,138 L66,140 L62,188 L50,184 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M78,140 L66,140 L62,188 L74,188 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M146,138 L134,140 L138,188 L150,184 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M122,140 L134,140 L138,188 L126,188 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;

    // Glutes
    html += `<path d="M80,186 L100,190 L100,218 L78,214 Z" fill="${heatColor('glutes')}" stroke="${strokeColor('glutes')}" stroke-width="0.7"><title>Glutes: ${volume.glutes} sets</title></path>`;
    html += `<path d="M120,186 L100,190 L100,218 L122,214 Z" fill="${heatColor('glutes')}" stroke="${strokeColor('glutes')}" stroke-width="0.7"><title>Glutes: ${volume.glutes} sets</title></path>`;

    // Hamstrings
    html += `<path d="M78,218 L100,222 L100,296 L80,290 Z" fill="${heatColor('hamstrings')}" stroke="${strokeColor('hamstrings')}" stroke-width="0.7"><title>Hamstrings: ${volume.hamstrings} sets</title></path>`;
    html += `<path d="M122,218 L100,222 L100,296 L120,290 Z" fill="${heatColor('hamstrings')}" stroke="${strokeColor('hamstrings')}" stroke-width="0.7"><title>Hamstrings: ${volume.hamstrings} sets</title></path>`;

    // Calves (back)
    html += `<path d="M80,296 L98,300 L96,370 L76,366 Z" fill="${heatColor('calves')}" stroke="${strokeColor('calves')}" stroke-width="0.7"><title>Calves: ${volume.calves} sets</title></path>`;
    html += `<path d="M120,296 L102,300 L104,370 L124,366 Z" fill="${heatColor('calves')}" stroke="${strokeColor('calves')}" stroke-width="0.7"><title>Calves: ${volume.calves} sets</title></path>`;

    html += `</svg></div>`;

    html += '</div>';

    // --- Legend + detail grid ---
    html += '<div class="muscle-heatmap-legend">';
    html += '<span class="legend-item"><span class="legend-swatch" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1)"></span> Not trained</span>';
    html += '<span class="legend-item"><span class="legend-swatch" style="background:rgba(74,222,128,0.25)"></span> Low</span>';
    html += '<span class="legend-item"><span class="legend-swatch" style="background:rgba(74,222,128,0.5)"></span> Moderate</span>';
    html += '<span class="legend-item"><span class="legend-swatch" style="background:rgba(74,222,128,0.85)"></span> High</span>';
    html += '</div>';

    // Detail grid showing all sub-groups with set counts
    const detailGroups = [
        { label: 'Upper Chest', key: 'upper_chest' },
        { label: 'Mid Chest', key: 'mid_chest' },
        { label: 'Lower Chest', key: 'lower_chest' },
        { label: 'Front Delts', key: 'front_delts' },
        { label: 'Side Delts', key: 'side_delts' },
        { label: 'Rear Delts', key: 'rear_delts' },
        { label: 'Traps', key: 'traps' },
        { label: 'Lats', key: 'lats' },
        { label: 'Upper Back', key: 'upper_back' },
        { label: 'Lower Back', key: 'lower_back' },
        { label: 'Biceps', key: 'biceps' },
        { label: 'Triceps', key: 'triceps' },
        { label: 'Forearms', key: 'forearms' },
        { label: 'Abs', key: 'abs' },
        { label: 'Obliques', key: 'obliques' },
        { label: 'Quads', key: 'quads' },
        { label: 'Hamstrings', key: 'hamstrings' },
        { label: 'Glutes', key: 'glutes' },
        { label: 'Calves', key: 'calves' },
    ];

    html += '<div class="muscle-detail-grid">';
    detailGroups.forEach(g => {
        const v = volume[g.key] || 0;
        const ratio = v / maxVol;
        let lvl = 'none';
        if (v > 0 && ratio > 0.7) lvl = 'high';
        else if (v > 0 && ratio > 0.4) lvl = 'med';
        else if (v > 0) lvl = 'low';
        html += `<div class="muscle-detail-item level-${lvl}">
            <span class="muscle-detail-name">${g.label}</span>
            <span class="muscle-detail-sets">${v} sets</span>
        </div>`;
    });
    html += '</div>';

    container.innerHTML = html;
}

// --- Initialize ---
function init() {
    displayDailyVerse();
    loadProfile();
    loadUnits();
    updateDashboard();
    updateTodaysExercises();
    updateOverloadDropdown();
    updateMealsList();
    updateNutritionBars();
    drawWeightChart();
    renderAchievements();
    renderCalendarHeatmap();
    renderMuscleHeatmap();
    scheduleMidnightReset();

    // Redraw charts on resize
    window.addEventListener('resize', () => {
        drawWeightChart();
        const exercise = document.getElementById('overload-exercise').value;
        if (exercise) showOverloadData();
    });
}

init();
