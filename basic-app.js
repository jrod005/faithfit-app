// =============================================
// Iron Faith Basic - Clean & Simple
// =============================================

// --- Data Layer (shared with Pro) ---
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

// --- Theme ---
function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('faithfit_theme', next);
    document.getElementById('theme-toggle').textContent = next === 'dark' ? '\u263E' : '\u263C';
}

(function loadTheme() {
    const saved = localStorage.getItem('faithfit_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = saved === 'dark' ? '\u263E' : '\u263C';
})();

// --- Units ---
function getUnits() { return localStorage.getItem('faithfit_units') || 'imperial'; }
function isMetric() { return getUnits() === 'metric'; }
function wu() { return isMetric() ? 'kg' : 'lbs'; }
function lbsToDisplay(lbs) { return isMetric() ? (lbs * 0.453592).toFixed(1) : lbs; }

function setUnits(unit) {
    localStorage.setItem('faithfit_units', unit);
    document.getElementById('unit-imperial').classList.toggle('active', unit === 'imperial');
    document.getElementById('unit-metric').classList.toggle('active', unit === 'metric');
    document.getElementById('weight-label').textContent = `Weight (${wu()})`;
    const hImp = document.getElementById('height-imperial');
    const hMet = document.getElementById('height-metric');
    if (hImp && hMet) {
        hImp.classList.toggle('hidden', unit === 'metric');
        hMet.classList.toggle('hidden', unit !== 'metric');
    }
    updateDashboard();
    drawWeightChart();
}

function loadUnits() {
    const unit = getUnits();
    setUnits(unit);
}

// --- Escape HTML ---
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- Toast ---
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// --- Bible Verse ---
const VERSES = [
    { text: "Do you not know that your bodies are temples of the Holy Spirit, who is in you, whom you have received from God?", ref: "1 Corinthians 6:19" },
    { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
    { text: "But those who hope in the LORD will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31" },
    { text: "For physical training is of some value, but godliness has value for all things.", ref: "1 Timothy 4:8" },
    { text: "She sets about her work vigorously; her arms are strong for her tasks.", ref: "Proverbs 31:17" },
    { text: "The LORD is my strength and my shield; my heart trusts in him, and he helps me.", ref: "Psalm 28:7" },
    { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", ref: "Joshua 1:9" },
    { text: "Commit to the LORD whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
    { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
    { text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" },
    { text: "The joy of the LORD is your strength.", ref: "Nehemiah 8:10" },
    { text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace.", ref: "Hebrews 12:11" },
    { text: "And let us run with perseverance the race marked out for us, fixing our eyes on Jesus.", ref: "Hebrews 12:1-2" },
    { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
    { text: "Trust in the LORD with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
    { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" },
    { text: "I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.", ref: "Philippians 3:14" },
    { text: "Delight yourself in the LORD, and he will give you the desires of your heart.", ref: "Psalm 37:4" },
];

function displayDailyVerse() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const verse = VERSES[dayOfYear % VERSES.length];
    document.getElementById('daily-verse').textContent = `"${verse.text}"`;
    document.getElementById('verse-ref').textContent = `\u2014 ${verse.ref} (NIV)`;
}

// --- Tab Navigation ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

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

function updateStreak() {
    const workouts = DB.get('workouts', []);
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
    document.getElementById('streak-count').textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
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
        return `<div class="workout-item">
            <div>
                <h4>${escapeHtml(w.name)}</h4>
                <p>${w.date} &middot; ${w.sets.length} sets &middot; Best: ${lbsToDisplay(bestSet.weight)}${wu()} x ${bestSet.reps}</p>
            </div>
            <span style="font-weight:600; color:var(--primary);">${parseFloat(lbsToDisplay(totalVol)).toLocaleString()} ${wu()}</span>
        </div>`;
    }).join('');
}

// --- Weight Chart ---
function logWeight() {
    const input = document.getElementById('weight-input');
    const raw = parseFloat(input.value);
    if (!raw || raw < 20 || raw > 1000) { alert('Please enter a valid weight.'); return; }
    const weight = isMetric() ? raw / 0.453592 : raw;
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
    const w = canvas.offsetWidth, h = 200;
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
    const min = Math.min(...values) - 2, max = Math.max(...values) + 2;
    const range = max - min || 1;
    const padTop = 20, padBot = 40, padLeft = 45, padRight = 15;
    const chartW = w - padLeft - padRight, chartH = h - padTop - padBot;

    ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(w - padRight, y); ctx.stroke();
        ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText((max - (range / 4) * i).toFixed(1), padLeft - 8, y + 4);
    }

    ctx.beginPath(); ctx.strokeStyle = '#C0C0C0'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    values.forEach((val, i) => {
        const x = padLeft + (chartW / (values.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    values.forEach((val, i) => {
        const x = padLeft + (chartW / (values.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#C0C0C0'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill();
    });

    ctx.fillStyle = '#94A3B8'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    const labelCount = Math.min(last30.length, 6);
    for (let i = 0; i < labelCount; i++) {
        const idx = Math.round(i * (last30.length - 1) / (labelCount - 1));
        const x = padLeft + (chartW / (last30.length - 1)) * idx;
        ctx.fillText(last30[idx].date.slice(5), x, h - 8);
    }
}

// --- Workout Logging ---
let setCount = 1;

function addSet() {
    setCount++;
    const container = document.getElementById('sets-container');
    const div = document.createElement('div');
    div.className = 'set-row';
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
    document.getElementById('sets-container').removeChild(document.getElementById('sets-container').lastElementChild);
    setCount--;
}

function logExercise() {
    const name = document.getElementById('exercise-name').value.trim();
    if (!name) { alert('Please enter an exercise name.'); return; }

    const sets = [];
    document.querySelectorAll('.set-row').forEach(row => {
        const rawWeight = parseFloat(row.querySelector('.set-weight').value) || 0;
        const weight = isMetric() ? rawWeight / 0.453592 : rawWeight;
        const reps = parseInt(row.querySelector('.set-reps').value) || 0;
        if (reps > 0) sets.push({ weight, reps });
    });

    if (sets.length === 0) { alert('Please enter at least one set with reps.'); return; }

    const workouts = DB.get('workouts', []);
    workouts.push({ date: today(), name, sets, timestamp: Date.now() });
    DB.set('workouts', workouts);

    // Check for PR
    const maxWeight = Math.max(...sets.map(s => s.weight));
    const priorMax = workouts.filter(w => w.name === name && w.timestamp !== workouts[workouts.length - 1].timestamp)
        .reduce((best, w) => Math.max(best, ...w.sets.map(s => s.weight)), 0);
    if (maxWeight > priorMax && priorMax > 0) {
        const prs = DB.get('prs', []);
        prs.push({ name, weight: maxWeight, date: today() });
        DB.set('prs', prs);
        showToast(`New PR! ${name}: ${lbsToDisplay(maxWeight)} ${wu()}`);
    }

    // Reset form
    document.getElementById('exercise-name').value = '';
    document.querySelectorAll('.set-weight, .set-reps').forEach(input => input.value = '');
    const container = document.getElementById('sets-container');
    while (container.children.length > 1) container.removeChild(container.lastElementChild);
    setCount = 1;

    updateTodaysExercises();
    updateDashboard();
}

function updateTodaysExercises() {
    const workouts = DB.get('workouts', []).filter(w => w.date === today());
    const container = document.getElementById('todays-exercises');
    if (workouts.length === 0) {
        container.innerHTML = '<p class="empty-state">No exercises logged today.</p>';
        return;
    }
    container.innerHTML = workouts.map(w => {
        const setsHtml = w.sets.map((s, j) => `Set ${j + 1}: ${lbsToDisplay(s.weight)} ${wu()} x ${s.reps} reps`).join('<br>');
        const totalVol = w.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        return `<div class="exercise-item">
            <h4>${escapeHtml(w.name)}</h4>
            <div class="sets-summary">${setsHtml}</div>
            <div class="total-volume">Total Volume: ${parseFloat(lbsToDisplay(totalVol)).toLocaleString()} ${wu()}</div>
        </div>`;
    }).join('');
}

// --- Nutrition ---
function logMeal() {
    const name = document.getElementById('meal-name').value.trim();
    const calories = parseInt(document.getElementById('meal-calories').value) || 0;
    const protein = parseInt(document.getElementById('meal-protein').value) || 0;
    const carbs = parseInt(document.getElementById('meal-carbs').value) || 0;
    const fat = parseInt(document.getElementById('meal-fat').value) || 0;

    if (!name || calories <= 0) { alert('Please enter a meal name and calories.'); return; }

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
            <button class="delete-btn" onclick="deleteMeal(${m.timestamp})">&times;</button>
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

// --- Profile ---
let selectedGender = 'male';

function setGender(gender) {
    selectedGender = gender;
    document.getElementById('gender-male').classList.toggle('active', gender === 'male');
    document.getElementById('gender-female').classList.toggle('active', gender === 'female');
}

function saveProfile() {
    const metric = isMetric();
    let feet, inches;

    if (metric) {
        const cm = parseFloat(document.getElementById('profile-height-cm').value) || 0;
        const totalInches = cm / 2.54;
        feet = Math.floor(totalInches / 12);
        inches = Math.round(totalInches % 12);
    } else {
        feet = parseInt(document.getElementById('profile-height-feet').value) || 0;
        inches = parseInt(document.getElementById('profile-height-inches').value) || 0;
    }

    const rawWeight = parseFloat(document.getElementById('profile-weight').value) || 0;
    const weightLbs = metric ? rawWeight / 0.453592 : rawWeight;

    if (weightLbs > 0) {
        const weights = DB.get('weights', []);
        const todayStr = today();
        const todayIdx = weights.findIndex(w => w.date === todayStr);
        if (todayIdx >= 0) weights[todayIdx].weight = weightLbs;
        else weights.push({ date: todayStr, weight: weightLbs });
        DB.set('weights', weights);
    }

    const profile = {
        name: document.getElementById('profile-name').value.trim(),
        gender: selectedGender,
        age: parseInt(document.getElementById('profile-age').value) || 0,
        heightFeet: feet,
        heightInches: inches,
        height: feet * 12 + inches,
        weight: weightLbs,
        goal: document.getElementById('profile-goal').value,
        activity: document.getElementById('profile-activity').value,
        calorieGoal: parseInt(document.getElementById('profile-calories').value) || 2000,
        proteinGoal: parseInt(document.getElementById('profile-protein').value) || 150
    };
    DB.set('profile', profile);
    showToast('Profile saved!');
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
    if (profile.heightInches !== undefined) document.getElementById('profile-height-inches').value = profile.heightInches;
    if (profile.weight) document.getElementById('profile-weight').value = isMetric() ? (profile.weight * 0.453592).toFixed(1) : profile.weight;
    if (profile.goal) document.getElementById('profile-goal').value = profile.goal;
    if (profile.activity) document.getElementById('profile-activity').value = profile.activity;
    if (profile.calorieGoal) document.getElementById('profile-calories').value = profile.calorieGoal;
    if (profile.proteinGoal) document.getElementById('profile-protein').value = profile.proteinGoal;
    if (!profile.heightFeet && profile.height) {
        document.getElementById('profile-height-feet').value = Math.floor(profile.height / 12);
        document.getElementById('profile-height-inches').value = profile.height % 12;
    }
}

function calculateCalories() {
    const metric = isMetric();
    let heightInches;
    if (metric) {
        heightInches = (parseFloat(document.getElementById('profile-height-cm').value) || 0) / 2.54;
    } else {
        heightInches = (parseInt(document.getElementById('profile-height-feet').value) || 0) * 12 +
                       (parseInt(document.getElementById('profile-height-inches').value) || 0);
    }
    const age = parseInt(document.getElementById('profile-age').value) || 0;
    const rawWeight = parseFloat(document.getElementById('profile-weight').value) || 0;
    const currentWeight = metric ? rawWeight / 0.453592 : rawWeight;

    if (!currentWeight || !age || !heightInches) {
        alert('Please fill in age, height, and weight to auto-calculate.');
        return;
    }

    const weightKg = currentWeight * 0.453592;
    const heightCm = heightInches * 2.54;
    const genderOffset = selectedGender === 'female' ? -161 : 5;
    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + genderOffset;

    const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
    let tdee = Math.round(bmr * (multipliers[document.getElementById('profile-activity').value] || 1.2));

    const goal = document.getElementById('profile-goal').value;
    if (goal === 'lose') tdee -= 400;
    else if (goal === 'gain') tdee += 300;

    document.getElementById('profile-calories').value = tdee;
    document.getElementById('profile-protein').value = Math.round(currentWeight * 0.8);
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

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.profile) DB.set('profile', data.profile);
            if (data.workouts) DB.set('workouts', data.workouts);
            if (data.meals) DB.set('meals', data.meals);
            if (data.weights) DB.set('weights', data.weights);
            showToast('Data imported successfully!');
            location.reload();
        } catch {
            alert('Invalid backup file.');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('Are you sure you want to delete ALL your data? This cannot be undone!')) {
        if (confirm('Really? This will erase all workouts, meals, and weight history.')) {
            ['profile', 'workouts', 'meals', 'weights', 'prs'].forEach(key => {
                localStorage.removeItem('faithfit_' + key);
            });
            location.reload();
        }
    }
}

// --- Midnight Reset ---
function scheduleMidnightReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ms = midnight - now;
    setTimeout(() => {
        updateDashboard();
        updateTodaysExercises();
        updateMealsList();
        updateNutritionBars();
        displayDailyVerse();
        scheduleMidnightReset();
    }, ms);
}

// --- Init ---
function init() {
    displayDailyVerse();
    loadProfile();
    loadUnits();
    updateDashboard();
    updateTodaysExercises();
    updateMealsList();
    updateNutritionBars();
    drawWeightChart();
    scheduleMidnightReset();
}

init();
