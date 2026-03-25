// =============================================
// FaithFit - Fitness & Faith Tracker
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
    const saved = localStorage.getItem('faithfit_theme') || 'light';
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
    ctx.strokeStyle = '#4F46E5';
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
        ctx.fillStyle = '#4F46E5';
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
    ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#4F46E5';
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
        ctx.fillStyle = '#4F46E5';
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

    updateMealsList();
    updateNutritionBars();
    updateDashboard();
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
        alert('To install FaithFit:\n\n• iOS: Tap the Share button, then "Add to Home Screen"\n• Android Chrome: Tap the menu (⋮), then "Install app"\n• Desktop: Look for the install icon in the address bar');
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
    const name = profile.name || 'A FaithFit user';

    const verse = getDailyVerse();

    let text = `💪 ${name}'s FaithFit Progress\n`;
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
    text += `\n📲 Track your fitness journey with FaithFit!`;

    const shareData = {
        title: 'My FaithFit Progress',
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
                alert('Invalid FaithFit backup file.');
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
            alert('Could not read file. Make sure it\'s a valid FaithFit backup.');
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
    scheduleMidnightReset();

    // Redraw charts on resize
    window.addEventListener('resize', () => {
        drawWeightChart();
        const exercise = document.getElementById('overload-exercise').value;
        if (exercise) showOverloadData();
    });
}

init();
