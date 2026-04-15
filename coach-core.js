// =============================================
// Iron Faith Smart Coach Engine
// Personalized fitness coaching without API calls
// =============================================

// --- Data Analysis Helpers ---
function getCoachContext() {
    const profile = DB.get('profile', {});
    const workouts = DB.get('workouts', []);
    const meals = DB.get('meals', []);
    const weights = DB.get('weights', []);
    const todayStr = today();

    const todayWorkouts = workouts.filter(w => w.date === todayStr);
    const todayMeals = meals.filter(m => m.date === todayStr);

    // Last 7 days workouts
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];
    const weekWorkouts = workouts.filter(w => w.date >= weekStr);
    const weekMeals = meals.filter(m => m.date >= weekStr);

    // Last 30 days
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthStr = monthAgo.toISOString().split('T')[0];
    const monthWorkouts = workouts.filter(w => w.date >= monthStr);

    // Unique workout days this week
    const weekDays = [...new Set(weekWorkouts.map(w => w.date))].length;

    // Exercise frequency
    const exerciseFreq = {};
    workouts.forEach(w => {
        exerciseFreq[w.name] = (exerciseFreq[w.name] || 0) + 1;
    });

    // Muscle group mapping
    const muscleMap = {
        chest: ['Bench Press','Incline Bench Press','Decline Bench Press','Dumbbell Bench Press','Incline Dumbbell Press','Dumbbell Fly','Cable Fly','Chest Dips','Push-ups','Machine Chest Press','Pec Deck'],
        back: ['Deadlift','Romanian Deadlift','Sumo Deadlift','Barbell Row','Dumbbell Row','Pendlay Row','T-Bar Row','Seated Cable Row','Lat Pulldown','Pull-ups','Chin-ups','Straight Arm Pulldown','Hyperextensions','Good Mornings'],
        shoulders: ['Overhead Press','Seated Dumbbell Press','Arnold Press','Lateral Raises','Front Raises','Rear Delt Fly','Cable Lateral Raise','Upright Row','Shrugs','Barbell Shrugs','Face Pulls','Machine Shoulder Press'],
        legs: ['Squat','Front Squat','Goblet Squat','Bulgarian Split Squat','Hack Squat','Leg Press','Lunges','Walking Lunges','Reverse Lunges','Leg Extension','Leg Curl','Seated Leg Curl','Hip Thrust','Glute Bridge','Calf Raises','Seated Calf Raise','Step-ups','Box Jumps'],
        biceps: ['Bicep Curls','Hammer Curls','Preacher Curls','Concentration Curls','Incline Dumbbell Curl','EZ Bar Curl','Cable Curl','Spider Curls'],
        triceps: ['Tricep Pushdown','Overhead Tricep Extension','Skull Crushers','Close Grip Bench Press','Tricep Dips','Tricep Kickbacks','Cable Overhead Extension','Diamond Push-ups'],
        core: ['Plank','Crunches','Hanging Leg Raise','Cable Crunch','Ab Wheel Rollout','Russian Twist','Bicycle Crunches','Leg Raises','Woodchoppers','Pallof Press','Dead Bug','Mountain Climbers']
    };

    // Calculate muscle group volume this week
    const weekMuscleVolume = {};
    Object.keys(muscleMap).forEach(group => { weekMuscleVolume[group] = 0; });
    weekWorkouts.forEach(w => {
        for (const [group, exercises] of Object.entries(muscleMap)) {
            if (exercises.some(e => w.name.toLowerCase() === e.toLowerCase())) {
                weekMuscleVolume[group] += w.sets.length;
            }
        }
    });

    // Weight trend
    let weightTrend = 'stable';
    if (weights.length >= 4) {
        const recent = weights.slice(-4);
        const first2 = (recent[0].weight + recent[1].weight) / 2;
        const last2 = (recent[2].weight + recent[3].weight) / 2;
        const diff = last2 - first2;
        if (diff > 1) weightTrend = 'gaining';
        else if (diff < -1) weightTrend = 'losing';
    }

    // Nutrition averages this week
    const weekNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, days: 0 };
    const mealsByDay = {};
    weekMeals.forEach(m => {
        if (!mealsByDay[m.date]) mealsByDay[m.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        mealsByDay[m.date].calories += m.calories;
        mealsByDay[m.date].protein += m.protein;
        mealsByDay[m.date].carbs += m.carbs;
        mealsByDay[m.date].fat += m.fat;
    });
    const nutritionDays = Object.values(mealsByDay);
    if (nutritionDays.length > 0) {
        weekNutrition.days = nutritionDays.length;
        weekNutrition.calories = Math.round(nutritionDays.reduce((s, d) => s + d.calories, 0) / nutritionDays.length);
        weekNutrition.protein = Math.round(nutritionDays.reduce((s, d) => s + d.protein, 0) / nutritionDays.length);
        weekNutrition.carbs = Math.round(nutritionDays.reduce((s, d) => s + d.carbs, 0) / nutritionDays.length);
        weekNutrition.fat = Math.round(nutritionDays.reduce((s, d) => s + d.fat, 0) / nutritionDays.length);
    }

    // PR detection - best weight per exercise
    const exercisePRs = {};
    workouts.forEach(w => {
        const maxW = Math.max(...w.sets.map(s => s.weight));
        if (!exercisePRs[w.name] || maxW > exercisePRs[w.name]) {
            exercisePRs[w.name] = maxW;
        }
    });

    // Stagnation detection per exercise
    const stagnant = [];
    const exercisesByName = {};
    workouts.forEach(w => {
        if (!exercisesByName[w.name]) exercisesByName[w.name] = [];
        exercisesByName[w.name].push(w);
    });
    for (const [name, logs] of Object.entries(exercisesByName)) {
        if (logs.length >= 4) {
            const last4 = logs.slice(-4);
            const maxes = last4.map(l => Math.max(...l.sets.map(s => s.weight)));
            const allSame = maxes.every(m => m === maxes[0]);
            if (allSame) stagnant.push(name);
        }
    }

    const progressPhotos = (typeof getProgressPhotoStats === 'function')
        ? getProgressPhotoStats()
        : { count: 0, lastDate: null, daysSinceLast: null };

    // Progressive overload readiness detection
    const overloadReady = [];
    for (const [name, logs] of Object.entries(exercisesByName)) {
        if (logs.length < 3) continue;
        const last2 = logs.slice(-2);
        const allRepsHit = last2.every(l =>
            l.sets.every(s => s.reps >= 8)
        );
        const lastMax = Math.max(...last2[1].sets.map(s => s.weight));
        const prevMax = Math.max(...last2[0].sets.map(s => s.weight));
        if (allRepsHit && lastMax === prevMax && !stagnant.includes(name)) {
            overloadReady.push({ name, currentMax: lastMax, suggestedIncrease: lastMax <= 100 ? 5 : 10 });
        }
    }

    return {
        profile, workouts, meals, weights, todayWorkouts, todayMeals,
        weekWorkouts, weekDays, monthWorkouts, exerciseFreq, weekMuscleVolume,
        muscleMap, weightTrend, weekNutrition, exercisePRs, stagnant,
        exercisesByName, progressPhotos, overloadReady,
        equipment: DB.get('equipment', 'gym'),
        experience: DB.get('experience', null),
        hasProfile: !!profile.name, currentWeight: weights.length > 0 ? weights[weights.length - 1].weight : 0
    };
}

// --- Shared Helpers ---
function getUserLevel(ctx) {
    if (ctx.experience) return ctx.experience;
    if (ctx.workouts.length > 100) return 'advanced';
    if (ctx.workouts.length > 30) return 'intermediate';
    return 'beginner';
}

function computeTDEE(ctx) {
    const wt = ctx.currentWeight || 180;
    const kg = wt / 2.20462;
    const age = ctx.profile.age || 30;
    const heightIn = (ctx.profile.heightFeet || 5) * 12 + (ctx.profile.heightInches || 9);
    const cm = heightIn * 2.54;
    const isFemale = (ctx.profile.gender || '').toLowerCase().startsWith('f');
    const bmr = isFemale
        ? Math.round(10 * kg + 6.25 * cm - 5 * age - 161)
        : Math.round(10 * kg + 6.25 * cm - 5 * age + 5);
    const activityFactor = ctx.weekDays >= 5 ? 1.55 : ctx.weekDays >= 3 ? 1.45 : 1.35;
    return { bmr, tdee: Math.round(bmr * activityFactor), kg, wt };
}

// --- Verse Pool for Coach ---
const COACH_VERSES = [
    { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
    { text: "But those who hope in the LORD will renew their strength.", ref: "Isaiah 40:31" },
    { text: "The LORD is my strength and my shield; my heart trusts in him.", ref: "Psalm 28:7" },
    { text: "Be strong and courageous. Do not be afraid, for the LORD your God will be with you.", ref: "Joshua 1:9" },
    { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
    { text: "No discipline seems pleasant at the time, but later it produces a harvest of righteousness.", ref: "Hebrews 12:11" },
    { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest.", ref: "Galatians 6:9" },
    { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
    { text: "The joy of the LORD is your strength.", ref: "Nehemiah 8:10" },
    { text: "She sets about her work vigorously; her arms are strong for her tasks.", ref: "Proverbs 31:17" },
    { text: "Commit to the LORD whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
    { text: "For physical training is of some value, but godliness has value for all things.", ref: "1 Timothy 4:8" },
    { text: "I press on toward the goal to win the prize for which God has called me heavenward.", ref: "Philippians 3:14" },
    { text: "Do you not know that your bodies are temples of the Holy Spirit?", ref: "1 Corinthians 6:19" },
    { text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" },
    { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
    { text: "For God gave us a spirit not of fear but of power and love and self-control.", ref: "2 Timothy 1:7" },
    { text: "Blessed is the one who perseveres under trial.", ref: "James 1:12" },
    { text: "Trust in the LORD with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
    { text: "And let us run with perseverance the race marked out for us, fixing our eyes on Jesus.", ref: "Hebrews 12:1-2" },
];

function randomVerse() {
    return COACH_VERSES[Math.floor(Math.random() * COACH_VERSES.length)];
}

function verseHtml(v) {
    if (!v) v = randomVerse();
    const text = typeof getTranslatedVerse === 'function' ? getTranslatedVerse(v.ref, v.text) : v.text;
    const version = typeof getBibleVersion === 'function' ? getBibleVersion() : 'NIV';
    return `<div class="verse-inline">"${text}" — <strong>${v.ref} (${version})</strong></div>`;
}

function insightHtml(text) {
    return `<div class="data-insight">${text}</div>`;
}

// --- Workout Plan Generator ---
function generateWorkoutPlan(ctx) {
    const goal = ctx.profile.goal || 'gain';
    const name = ctx.profile.name || 'there';
    const unit = wu();

    // Determine experience level from data
    let level = 'beginner';
    if (ctx.workouts.length > 100) level = 'advanced';
    else if (ctx.workouts.length > 30) level = 'intermediate';

    const plans = {
        beginner: {
            lose: {
                title: 'Beginner Fat Loss Program',
                days: 3,
                split: [
                    { day: 'Day A', focus: 'Full Body Strength', exercises: [
                        { name: 'Squat', sets: '3x8', note: 'Focus on form, go to parallel' },
                        { name: 'Bench Press', sets: '3x8', note: 'Control the descent' },
                        { name: 'Barbell Row', sets: '3x8', note: 'Squeeze shoulder blades' },
                        { name: 'Overhead Press', sets: '3x8', note: 'Brace your core tight' },
                        { name: 'Plank', sets: '3x30s', note: 'Build up to 60s' },
                    ]},
                    { day: 'Day B', focus: 'Full Body Metabolic', exercises: [
                        { name: 'Deadlift', sets: '3x6', note: 'Hinge at hips, flat back' },
                        { name: 'Dumbbell Bench Press', sets: '3x10', note: 'Full range of motion' },
                        { name: 'Lat Pulldown', sets: '3x10', note: 'Pull to upper chest' },
                        { name: 'Lunges', sets: '3x10/leg', note: 'Step long, knee over ankle' },
                        { name: 'Mountain Climbers', sets: '3x20', note: 'Keep hips level' },
                    ]},
                ],
                schedule: 'Alternate A/B with at least 1 rest day between. Example: Mon A, Wed B, Fri A',
                cardio: '20-30 min walking on rest days. Add 10 min post-workout if progress stalls.',
            },
            maintain: {
                title: 'Beginner Maintenance Program',
                days: 3,
                split: [
                    { day: 'Day A', focus: 'Upper Body', exercises: [
                        { name: 'Bench Press', sets: '3x8', note: 'Steady weight, good form' },
                        { name: 'Barbell Row', sets: '3x8', note: 'Pull to lower chest' },
                        { name: 'Overhead Press', sets: '3x8', note: 'Full lockout at top' },
                        { name: 'Bicep Curls', sets: '2x12', note: 'No swinging' },
                        { name: 'Tricep Pushdown', sets: '2x12', note: 'Squeeze at bottom' },
                    ]},
                    { day: 'Day B', focus: 'Lower Body + Core', exercises: [
                        { name: 'Squat', sets: '3x8', note: 'Below parallel if mobile enough' },
                        { name: 'Romanian Deadlift', sets: '3x10', note: 'Feel the hamstring stretch' },
                        { name: 'Leg Press', sets: '3x10', note: 'Full range of motion' },
                        { name: 'Calf Raises', sets: '3x15', note: 'Pause at the top' },
                        { name: 'Hanging Leg Raise', sets: '3x10', note: 'Control the movement' },
                    ]},
                ],
                schedule: 'A, B, A one week — B, A, B the next. Rest days between sessions.',
                cardio: '2-3 days of 20 min light cardio (walking, cycling) to stay active.',
            },
            gain: {
                title: 'Beginner Muscle Building Program',
                days: 3,
                split: [
                    { day: 'Day A', focus: 'Squat Focus', exercises: [
                        { name: 'Squat', sets: '3x5', note: 'Add 5 lbs each session' },
                        { name: 'Bench Press', sets: '3x5', note: 'Add 5 lbs each session' },
                        { name: 'Barbell Row', sets: '3x5', note: 'Add 5 lbs each session' },
                    ]},
                    { day: 'Day B', focus: 'Deadlift Focus', exercises: [
                        { name: 'Squat', sets: '3x5', note: 'Same weight as Day A' },
                        { name: 'Overhead Press', sets: '3x5', note: 'Add 5 lbs each session' },
                        { name: 'Deadlift', sets: '1x5', note: 'Add 10 lbs each session' },
                    ]},
                ],
                schedule: 'Alternate A/B, 3x per week. Mon A, Wed B, Fri A, next week: Mon B, Wed A, Fri B',
                cardio: 'Minimal — 1-2 days of light walking. Focus on eating and recovering.',
            },
        },
        intermediate: {
            lose: {
                title: 'Intermediate Cut Program (4-day Upper/Lower)',
                days: 4,
                split: [
                    { day: 'Upper A (Mon)', focus: 'Strength', exercises: [
                        { name: 'Bench Press', sets: '4x5', note: 'Heavy — RPE 8' },
                        { name: 'Barbell Row', sets: '4x5', note: 'Match bench weight if you can' },
                        { name: 'Overhead Press', sets: '3x8', note: 'Moderate weight' },
                        { name: 'Face Pulls', sets: '3x15', note: 'Light, focus on rear delts' },
                        { name: 'Bicep Curls', sets: '2x12', note: 'Pump work' },
                    ]},
                    { day: 'Lower A (Tue)', focus: 'Strength', exercises: [
                        { name: 'Squat', sets: '4x5', note: 'Heavy — RPE 8' },
                        { name: 'Romanian Deadlift', sets: '3x8', note: 'Moderate, feel the stretch' },
                        { name: 'Leg Press', sets: '3x12', note: 'Higher rep pump' },
                        { name: 'Calf Raises', sets: '4x12', note: 'Slow eccentrics' },
                        { name: 'Hanging Leg Raise', sets: '3x12', note: 'Core work' },
                    ]},
                    { day: 'Upper B (Thu)', focus: 'Volume', exercises: [
                        { name: 'Incline Dumbbell Press', sets: '3x10', note: 'Squeeze at top' },
                        { name: 'Lat Pulldown', sets: '3x10', note: 'Wide grip' },
                        { name: 'Lateral Raises', sets: '4x15', note: 'Light, high reps' },
                        { name: 'Tricep Pushdown', sets: '3x12', note: 'Squeeze at bottom' },
                        { name: 'Hammer Curls', sets: '3x12', note: 'Forearm work too' },
                    ]},
                    { day: 'Lower B (Fri)', focus: 'Volume', exercises: [
                        { name: 'Front Squat', sets: '3x8', note: 'Stay upright' },
                        { name: 'Hip Thrust', sets: '3x12', note: 'Squeeze glutes hard' },
                        { name: 'Leg Curl', sets: '3x12', note: 'Slow eccentrics' },
                        { name: 'Walking Lunges', sets: '3x12/leg', note: 'Long steps' },
                        { name: 'Plank', sets: '3x45s', note: 'Finish strong' },
                    ]},
                ],
                schedule: 'Mon/Tue/Thu/Fri. Wed + weekends off. Add 20 min cardio after 2 sessions per week.',
                cardio: '2-3 sessions of 25 min moderate cardio. Walking is king.',
            },
            maintain: {
                title: 'Intermediate Maintenance (4-day Upper/Lower)',
                days: 4,
                split: [
                    { day: 'Upper A (Mon)', focus: 'Push Focus', exercises: [
                        { name: 'Bench Press', sets: '4x6', note: 'Maintain your numbers' },
                        { name: 'Seated Cable Row', sets: '3x10', note: 'Squeeze back' },
                        { name: 'Overhead Press', sets: '3x8', note: 'Strict form' },
                        { name: 'Lateral Raises', sets: '3x15', note: 'Light and controlled' },
                        { name: 'Tricep Pushdown', sets: '3x12', note: 'Isolation finish' },
                    ]},
                    { day: 'Lower A (Tue)', focus: 'Quad Focus', exercises: [
                        { name: 'Squat', sets: '4x6', note: 'Maintain strength' },
                        { name: 'Romanian Deadlift', sets: '3x10', note: 'Hamstring work' },
                        { name: 'Leg Extension', sets: '3x12', note: 'Quad isolation' },
                        { name: 'Calf Raises', sets: '4x15', note: 'Pause at top and bottom' },
                        { name: 'Ab Wheel Rollout', sets: '3x10', note: 'Keep back flat' },
                    ]},
                    { day: 'Upper B (Thu)', focus: 'Pull Focus', exercises: [
                        { name: 'Pull-ups', sets: '4x6-8', note: 'Add weight if easy' },
                        { name: 'Incline Dumbbell Press', sets: '3x10', note: 'Upper chest focus' },
                        { name: 'Dumbbell Row', sets: '3x10', note: 'One arm at a time' },
                        { name: 'Face Pulls', sets: '3x15', note: 'Rear delt health' },
                        { name: 'EZ Bar Curl', sets: '3x12', note: 'Bicep finisher' },
                    ]},
                    { day: 'Lower B (Fri)', focus: 'Hip Focus', exercises: [
                        { name: 'Deadlift', sets: '3x5', note: 'Keep it heavy' },
                        { name: 'Bulgarian Split Squat', sets: '3x10/leg', note: 'Single leg work' },
                        { name: 'Hip Thrust', sets: '3x12', note: 'Glute builder' },
                        { name: 'Seated Leg Curl', sets: '3x12', note: 'Hamstring isolation' },
                        { name: 'Plank', sets: '3x45s', note: 'Core stability' },
                    ]},
                ],
                schedule: 'Mon/Tue/Thu/Fri. Stay consistent and match your current intensity.',
                cardio: '2 days of 20 min light activity. Keep active but don\'t overdo it.',
            },
            gain: {
                title: 'Intermediate Hypertrophy (Push/Pull/Legs)',
                days: 5,
                split: [
                    { day: 'Push (Mon)', focus: 'Chest & Shoulders & Triceps', exercises: [
                        { name: 'Bench Press', sets: '4x6', note: 'Progressive overload!' },
                        { name: 'Incline Dumbbell Press', sets: '3x10', note: 'Upper chest' },
                        { name: 'Overhead Press', sets: '3x8', note: 'Shoulder builder' },
                        { name: 'Lateral Raises', sets: '4x15', note: 'Capped shoulders' },
                        { name: 'Tricep Pushdown', sets: '3x12', note: 'Arm size' },
                        { name: 'Overhead Tricep Extension', sets: '3x12', note: 'Long head focus' },
                    ]},
                    { day: 'Pull (Tue)', focus: 'Back & Biceps', exercises: [
                        { name: 'Deadlift', sets: '3x5', note: 'Heaviest lift of the week' },
                        { name: 'Barbell Row', sets: '4x8', note: 'Back thickness' },
                        { name: 'Lat Pulldown', sets: '3x10', note: 'Back width' },
                        { name: 'Face Pulls', sets: '3x15', note: 'Rear delts + health' },
                        { name: 'Bicep Curls', sets: '3x12', note: 'Arm builder' },
                        { name: 'Hammer Curls', sets: '3x12', note: 'Brachialis + forearms' },
                    ]},
                    { day: 'Legs (Wed)', focus: 'Quads & Hams & Glutes', exercises: [
                        { name: 'Squat', sets: '4x6', note: 'King of exercises' },
                        { name: 'Romanian Deadlift', sets: '3x10', note: 'Posterior chain' },
                        { name: 'Leg Press', sets: '3x12', note: 'Volume for quads' },
                        { name: 'Leg Curl', sets: '3x12', note: 'Hamstring isolation' },
                        { name: 'Calf Raises', sets: '4x15', note: 'High reps for calves' },
                        { name: 'Hip Thrust', sets: '3x10', note: 'Glute development' },
                    ]},
                    { day: 'Upper (Fri)', focus: 'Chest & Back & Arms', exercises: [
                        { name: 'Incline Bench Press', sets: '3x8', note: 'Different angle' },
                        { name: 'Pull-ups', sets: '4x6-8', note: 'Add weight when ready' },
                        { name: 'Dumbbell Row', sets: '3x10', note: 'Per arm' },
                        { name: 'Cable Fly', sets: '3x12', note: 'Chest squeeze' },
                        { name: 'EZ Bar Curl', sets: '3x10', note: 'Biceps' },
                        { name: 'Skull Crushers', sets: '3x10', note: 'Triceps' },
                    ]},
                    { day: 'Legs/Core (Sat)', focus: 'Volume & Weak Points', exercises: [
                        { name: 'Front Squat', sets: '3x8', note: 'Quad focus' },
                        { name: 'Walking Lunges', sets: '3x12/leg', note: 'Functional strength' },
                        { name: 'Leg Extension', sets: '3x15', note: 'Pump finisher' },
                        { name: 'Seated Calf Raise', sets: '4x15', note: 'Soleus focus' },
                        { name: 'Hanging Leg Raise', sets: '3x12', note: 'Core strength' },
                        { name: 'Cable Crunch', sets: '3x15', note: 'Ab definition' },
                    ]},
                ],
                schedule: 'Mon/Tue/Wed off Thu, Fri/Sat off Sun. Eat in a 200-400 cal surplus.',
                cardio: 'Keep it light. 1-2 walks per week. Don\'t burn muscle-building calories.',
            },
        },
        advanced: {
            lose: {
                title: 'Advanced Cutting Program (5-day)',
                days: 5,
                split: [
                    { day: 'Push A (Mon)', focus: 'Heavy Push', exercises: [
                        { name: 'Bench Press', sets: '5x5', note: 'Maintain strength on a cut' },
                        { name: 'Overhead Press', sets: '4x6', note: 'Heavy compound' },
                        { name: 'Incline Dumbbell Press', sets: '3x10', note: 'Volume work' },
                        { name: 'Lateral Raises', sets: '4x15', note: 'Keep shoulders full' },
                        { name: 'Tricep Pushdown', sets: '3x12', note: 'Pump to finish' },
                    ]},
                    { day: 'Pull A (Tue)', focus: 'Heavy Pull', exercises: [
                        { name: 'Deadlift', sets: '4x4', note: 'Maintain your max' },
                        { name: 'Barbell Row', sets: '4x6', note: 'Row heavy' },
                        { name: 'Lat Pulldown', sets: '3x10', note: 'Width work' },
                        { name: 'Face Pulls', sets: '3x15', note: 'Rear delts' },
                        { name: 'Bicep Curls', sets: '3x12', note: 'Keep arms full' },
                    ]},
                    { day: 'Legs (Wed)', focus: 'Full Legs', exercises: [
                        { name: 'Squat', sets: '5x5', note: 'Don\'t let squat drop' },
                        { name: 'Romanian Deadlift', sets: '3x8', note: 'Hamstrings' },
                        { name: 'Leg Press', sets: '3x12', note: 'Quad volume' },
                        { name: 'Leg Curl', sets: '3x12', note: 'Isolation' },
                        { name: 'Calf Raises', sets: '4x12', note: 'Don\'t forget calves' },
                    ]},
                    { day: 'Push B (Fri)', focus: 'Volume Push', exercises: [
                        { name: 'Dumbbell Bench Press', sets: '4x8', note: 'Different stimulus' },
                        { name: 'Arnold Press', sets: '3x10', note: 'Full ROM' },
                        { name: 'Cable Fly', sets: '3x12', note: 'Chest squeeze' },
                        { name: 'Cable Lateral Raise', sets: '3x15', note: 'Constant tension' },
                        { name: 'Overhead Tricep Extension', sets: '3x12', note: 'Long head' },
                    ]},
                    { day: 'Pull B (Sat)', focus: 'Volume Pull', exercises: [
                        { name: 'Pull-ups', sets: '4xmax', note: 'Bodyweight is lighter on a cut!' },
                        { name: 'T-Bar Row', sets: '3x10', note: 'Back thickness' },
                        { name: 'Straight Arm Pulldown', sets: '3x12', note: 'Lat isolation' },
                        { name: 'Rear Delt Fly', sets: '3x15', note: 'Balance shoulders' },
                        { name: 'Hammer Curls', sets: '3x12', note: 'Forearms too' },
                    ]},
                ],
                schedule: 'Mon/Tue/Wed/off/Fri/Sat/off. High protein, moderate deficit (300-500 cal).',
                cardio: '3-4 sessions of 20-30 min. Mix LISS walking and 1 HIIT session.',
            },
            maintain: { title: 'Advanced Maintenance', days: 4, split: [], schedule: 'Use your intermediate plan at current intensity. Deload every 4-6 weeks.', cardio: '2-3 light sessions.' },
            gain: {
                title: 'Advanced Hypertrophy (PPL 6-Day)',
                days: 6,
                split: [
                    { day: 'Push A (Mon)', focus: 'Strength Push', exercises: [
                        { name: 'Bench Press', sets: '5x5', note: 'Add 2.5 lbs/week' },
                        { name: 'Overhead Press', sets: '4x6', note: 'Strict form' },
                        { name: 'Incline Dumbbell Press', sets: '3x10', note: 'Stretch at bottom' },
                        { name: 'Lateral Raises', sets: '5x15', note: 'Boulder shoulders' },
                        { name: 'Skull Crushers', sets: '3x10', note: 'Tricep mass' },
                        { name: 'Tricep Pushdown', sets: '3x12', note: 'Pump finish' },
                    ]},
                    { day: 'Pull A (Tue)', focus: 'Strength Pull', exercises: [
                        { name: 'Deadlift', sets: '4x4', note: 'Top set + back-offs' },
                        { name: 'Barbell Row', sets: '4x6', note: 'Heavy rows' },
                        { name: 'Pull-ups', sets: '4x6-8', note: 'Weighted if possible' },
                        { name: 'Face Pulls', sets: '4x15', note: 'Shoulder health' },
                        { name: 'Preacher Curls', sets: '3x10', note: 'Bicep peak' },
                        { name: 'Hammer Curls', sets: '3x12', note: 'Brachialis' },
                    ]},
                    { day: 'Legs A (Wed)', focus: 'Quad Dominant', exercises: [
                        { name: 'Squat', sets: '5x5', note: 'The foundation' },
                        { name: 'Leg Press', sets: '4x12', note: 'High foot = glutes, low = quads' },
                        { name: 'Leg Extension', sets: '3x15', note: 'Quad isolation' },
                        { name: 'Romanian Deadlift', sets: '3x10', note: 'Hamstring balance' },
                        { name: 'Calf Raises', sets: '5x15', note: 'Calves need volume' },
                    ]},
                    { day: 'Push B (Thu)', focus: 'Hypertrophy Push', exercises: [
                        { name: 'Dumbbell Bench Press', sets: '4x10', note: 'Squeeze and stretch' },
                        { name: 'Arnold Press', sets: '3x10', note: 'Full ROM' },
                        { name: 'Cable Fly', sets: '4x12', note: 'Peak contraction' },
                        { name: 'Cable Lateral Raise', sets: '4x15', note: 'Side delt isolation' },
                        { name: 'Close Grip Bench Press', sets: '3x8', note: 'Compound tricep' },
                        { name: 'Overhead Tricep Extension', sets: '3x12', note: 'Long head stretch' },
                    ]},
                    { day: 'Pull B (Fri)', focus: 'Hypertrophy Pull', exercises: [
                        { name: 'Pendlay Row', sets: '4x8', note: 'Explosive from floor' },
                        { name: 'Lat Pulldown', sets: '4x10', note: 'Wide grip for width' },
                        { name: 'Seated Cable Row', sets: '3x12', note: 'Close grip, squeeze back' },
                        { name: 'Rear Delt Fly', sets: '4x15', note: '3D shoulders' },
                        { name: 'EZ Bar Curl', sets: '3x10', note: 'Heavy curls' },
                        { name: 'Incline Dumbbell Curl', sets: '3x12', note: 'Long head stretch' },
                    ]},
                    { day: 'Legs B (Sat)', focus: 'Hip Dominant', exercises: [
                        { name: 'Front Squat', sets: '4x6', note: 'Upright torso' },
                        { name: 'Hip Thrust', sets: '4x10', note: 'Glute king' },
                        { name: 'Bulgarian Split Squat', sets: '3x10/leg', note: 'Unilateral work' },
                        { name: 'Leg Curl', sets: '4x12', note: 'Hamstring focus' },
                        { name: 'Seated Calf Raise', sets: '5x15', note: 'Soleus focus' },
                        { name: 'Hanging Leg Raise', sets: '3x15', note: 'Core strength' },
                    ]},
                ],
                schedule: 'Mon-Sat, Sunday off. Eat in 200-400 cal surplus. Sleep 8+ hours.',
                cardio: 'Minimal. 1-2 walks per week max. Calories go toward growth.',
            },
        },
    };

    const plan = plans[level]?.[goal] || plans.beginner.gain;

    // Register plan as a saveable routine
    try {
        const routine = buildRoutineFromCoachPlan(plan, level, goal);
        window._coachPlans = window._coachPlans || {};
        window._coachPlans[routine.id] = routine;
        window._lastCoachPlanId = routine.id;
    } catch (e) { window._lastCoachPlanId = null; }

    let html = `<h3>Your Personalized Plan: ${plan.title}</h3>`;
    html += insightHtml(`Based on your ${ctx.workouts.length} logged workouts, I'm classifying you as <strong>${level}</strong> level with a <strong>${goal === 'lose' ? 'fat loss' : goal === 'gain' ? 'muscle building' : 'maintenance'}</strong> goal.`);

    if (plan.split.length > 0) {
        plan.split.forEach(day => {
            html += `<h3>${day.day} — ${day.focus}</h3>`;
            html += `<table class="plan-table"><tr><th>Exercise</th><th>Sets x Reps</th><th>Notes</th></tr>`;
            day.exercises.forEach(ex => {
                html += `<tr><td><strong>${ex.name}</strong></td><td>${ex.sets}</td><td>${ex.note}</td></tr>`;
            });
            html += `</table>`;
        });
    }

    html += `<h3>Schedule</h3><p>${plan.schedule}</p>`;
    html += `<h3>Cardio</h3><p>${plan.cardio}</p>`;

    if (ctx.currentWeight > 0 && goal === 'gain') {
        const targetProtein = Math.round(ctx.currentWeight * 0.9);
        html += insightHtml(`At your current weight of ${lbsToDisplay(ctx.currentWeight)} ${unit}, aim for at least <strong>${targetProtein}g protein</strong> daily to maximize muscle growth.`);
    }

    html += verseHtml();
    return html;
}

// --- Weekly Schedule Generator ---
function generateWeeklySchedule(ctx) {
    const goal = ctx.profile.goal || 'gain';
    let level = 'beginner';
    if (ctx.workouts.length > 100) level = 'advanced';
    else if (ctx.workouts.length > 30) level = 'intermediate';

    // Decide training days/week based on level
    const cfg = {
        beginner:    { days: 3, pattern: ['Workout A', 'Rest', 'Workout B', 'Rest', 'Workout A', 'Rest', 'Active Recovery'] },
        intermediate:{ days: 4, pattern: ['Upper', 'Lower', 'Rest', 'Push', 'Pull', 'Rest', 'Active Recovery'] },
        advanced:    { days: 5, pattern: ['Push', 'Pull', 'Legs', 'Rest', 'Upper', 'Lower', 'Active Recovery'] },
    }[level];

    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0

    let html = `<h3>&#x1F4C5; Your Week at a Glance</h3>`;
    html += insightHtml(`Based on your <strong>${level}</strong> level and <strong>${goal}</strong> goal — ${cfg.days} training days this week.`);

    html += `<div style="display:flex;flex-direction:column;gap:6px;margin:12px 0;">`;
    cfg.pattern.forEach((label, i) => {
        const isToday = i === todayIdx;
        const isRest = /rest|recovery/i.test(label);
        const bg = isToday ? 'var(--primary)' : 'var(--card)';
        const fg = isToday ? '#000' : 'var(--text)';
        const tag = isRest ? '&#x1F634;' : '&#x1F4AA;';
        html += `<div style="display:flex;align-items:center;justify-content:space-between;background:${bg};color:${fg};padding:10px 14px;border-radius:10px;border:1px solid var(--border);">
            <span style="font-weight:600">${days[i]}${isToday ? ' &middot; Today' : ''}</span>
            <span style="opacity:0.85">${tag} ${label}</span>
        </div>`;
    });
    html += `</div>`;

    html += insightHtml(`Tap <strong>Workout Plan</strong> below for the actual exercises, sets and reps for each session.`);

    // Suggest verse on a rest day for faith link
    const restToday = /rest|recovery/i.test(cfg.pattern[todayIdx]);
    if (restToday) {
        html += `<div class="data-insight">Today is a rest day — recovery is when growth happens. Use the time to read, pray, or stretch.</div>`;
    }

    html += verseHtml();
    return html;
}

// --- Meal Plan Generator ---
function generateMealPlan(ctx) {
    const goal = ctx.profile.goal || 'maintain';
    const calTarget = ctx.profile.calorieGoal || 2000;
    const protTarget = ctx.profile.proteinGoal || 150;
    const name = ctx.profile.name || 'there';

    const mealPlans = {
        lose: [
            { meal: 'Breakfast (7am)', foods: '3 eggs scrambled, 1 slice whole wheat toast, 1/2 avocado', cals: 420, protein: 24, carbs: 22, fat: 28 },
            { meal: 'Snack (10am)', foods: 'Greek yogurt (1 cup) + handful of almonds', cals: 250, protein: 18, carbs: 15, fat: 12 },
            { meal: 'Lunch (12:30pm)', foods: 'Grilled chicken breast (6oz), mixed greens salad, olive oil dressing, brown rice (1/2 cup)', cals: 480, protein: 45, carbs: 30, fat: 16 },
            { meal: 'Pre-workout (3:30pm)', foods: 'Apple + 2 tbsp peanut butter', cals: 280, protein: 8, carbs: 32, fat: 16 },
            { meal: 'Dinner (7pm)', foods: 'Salmon fillet (6oz), roasted broccoli, sweet potato (medium)', cals: 520, protein: 42, carbs: 38, fat: 18 },
        ],
        maintain: [
            { meal: 'Breakfast (7am)', foods: '4 eggs, 2 slices toast, avocado, orange juice', cals: 620, protein: 30, carbs: 45, fat: 34 },
            { meal: 'Snack (10am)', foods: 'Protein shake + banana', cals: 320, protein: 28, carbs: 38, fat: 4 },
            { meal: 'Lunch (12:30pm)', foods: 'Turkey & cheese sandwich, side salad, apple', cals: 580, protein: 35, carbs: 55, fat: 20 },
            { meal: 'Pre-workout (3:30pm)', foods: 'Rice cakes + peanut butter + honey', cals: 300, protein: 8, carbs: 42, fat: 12 },
            { meal: 'Dinner (7pm)', foods: 'Steak (8oz), baked potato with butter, steamed veggies', cals: 680, protein: 52, carbs: 40, fat: 28 },
        ],
        gain: [
            { meal: 'Breakfast (7am)', foods: '4 eggs, 3 slices toast with butter, banana, glass of whole milk', cals: 780, protein: 36, carbs: 68, fat: 38 },
            { meal: 'Snack (10am)', foods: 'Protein shake with oats, peanut butter, and banana blended', cals: 550, protein: 38, carbs: 52, fat: 18 },
            { meal: 'Lunch (12:30pm)', foods: '8oz chicken thighs, 1.5 cups white rice, mixed veggies, olive oil', cals: 720, protein: 50, carbs: 65, fat: 24 },
            { meal: 'Pre-workout (3:30pm)', foods: 'Bagel with cream cheese + protein shake', cals: 480, protein: 32, carbs: 50, fat: 14 },
            { meal: 'Dinner (7pm)', foods: '8oz ground beef (90/10), pasta (2 cups), marinara, parmesan, side salad', cals: 820, protein: 52, carbs: 75, fat: 30 },
            { meal: 'Before Bed (9:30pm)', foods: 'Cottage cheese (1 cup) + handful of walnuts + honey drizzle', cals: 350, protein: 28, carbs: 18, fat: 18 },
        ],
    };

    const plan = mealPlans[goal] || mealPlans.maintain;
    const totalCals = plan.reduce((s, m) => s + m.cals, 0);
    const totalProt = plan.reduce((s, m) => s + m.protein, 0);

    let html = `<h3>Your Personalized Meal Plan</h3>`;
    html += insightHtml(`Goal: <strong>${goal === 'lose' ? 'Fat Loss' : goal === 'gain' ? 'Muscle Building' : 'Maintenance'}</strong> | Target: ~${calTarget} cal, ${protTarget}g protein`);

    html += `<table class="plan-table"><tr><th>Meal</th><th>Foods</th><th>Cal</th><th>Prot</th></tr>`;
    plan.forEach(m => {
        html += `<tr><td><strong>${m.meal}</strong></td><td>${m.foods}</td><td>${m.cals}</td><td>${m.protein}g</td></tr>`;
    });
    html += `<tr><td><strong>TOTAL</strong></td><td></td><td><strong>${totalCals}</strong></td><td><strong>${totalProt}g</strong></td></tr>`;
    html += `</table>`;

    html += `<h3>Tips</h3><ul>`;
    if (goal === 'lose') {
        html += `<li>Drink a full glass of water before each meal to help control portions</li>`;
        html += `<li>High protein keeps you full and preserves muscle on a cut</li>`;
        html += `<li>If you're hungrier on workout days, add an extra 100-200 cal from carbs</li>`;
    } else if (goal === 'gain') {
        html += `<li>If this is too much food, blend meals into shakes — easier to drink calories</li>`;
        html += `<li>White rice > brown rice for easy digestion when bulking</li>`;
        html += `<li>The bedtime meal provides slow-digesting protein for overnight recovery</li>`;
    } else {
        html += `<li>Adjust portions up/down based on weekly weight trends</li>`;
        html += `<li>This is a template — swap proteins and carbs to keep it varied</li>`;
    }
    html += `<li>Prep 3-4 days of protein in advance to stay consistent</li>`;
    html += `<li>Treat this as a framework, not a prison — flexibility builds sustainability</li>`;
    html += `</ul>`;

    html += verseHtml({ text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" });
    return html;
}

// --- Progress Analyzer ---
function analyzeProgress(ctx) {
    let html = `<h3>Your Progress Report</h3>`;
    const name = ctx.profile.name || 'there';
    const unit = wu();

    if (ctx.workouts.length === 0 && ctx.weights.length === 0) {
        html += `<p>Hey ${escapeHtml(name)}, I don't have any data to analyze yet! Start logging workouts and your weight, and I'll be able to give you detailed insights.</p>`;
        html += verseHtml({ text: "For I know the plans I have for you, declares the LORD, plans to prosper you.", ref: "Jeremiah 29:11" });
        return html;
    }

    // Weight analysis
    if (ctx.weights.length >= 2) {
        const first = ctx.weights[0];
        const last = ctx.weights[ctx.weights.length - 1];
        const diff = last.weight - first.weight;
        const daysBetween = Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / 86400000));
        const weeklyRate = (diff / daysBetween * 7);

        html += `<h3>Weight Trend</h3>`;
        html += insightHtml(`
            Starting: <strong>${lbsToDisplay(first.weight)} ${unit}</strong> (${first.date})<br>
            Current: <strong>${lbsToDisplay(last.weight)} ${unit}</strong> (${last.date})<br>
            Change: <strong>${diff > 0 ? '+' : ''}${lbsToDisplay(Math.abs(diff))} ${unit}</strong> over ${daysBetween} days (~${(parseFloat(lbsToDisplay(Math.abs(weeklyRate)))).toFixed(1)} ${unit}/week)<br>
            Trend: <strong>${ctx.weightTrend === 'gaining' ? 'Gaining' : ctx.weightTrend === 'losing' ? 'Losing' : 'Stable'}</strong>
        `);

        const goal = ctx.profile.goal;
        if (goal === 'lose' && ctx.weightTrend === 'losing') {
            html += `<p>You're on track with your weight loss goal. Keep it up!</p>`;
        } else if (goal === 'lose' && ctx.weightTrend !== 'losing') {
            html += `<p>Your weight isn't trending down yet. Consider reducing calories by 200 or adding more activity.</p>`;
        } else if (goal === 'gain' && ctx.weightTrend === 'gaining') {
            html += `<p>Great — you're gaining weight as planned. Make sure it's not too fast (0.5-1 ${unit}/week max) to minimize fat gain.</p>`;
        } else if (goal === 'gain' && ctx.weightTrend !== 'gaining') {
            html += `<p>You're trying to build muscle but weight isn't going up. Try adding 200-300 more calories daily.</p>`;
        }
    }

    // Workout analysis
    if (ctx.workouts.length > 0) {
        const uniqueDays = [...new Set(ctx.workouts.map(w => w.date))].length;
        html += `<h3>Training Summary</h3>`;
        html += insightHtml(`
            Total sessions logged: <strong>${ctx.workouts.length} exercises</strong> across <strong>${uniqueDays} days</strong><br>
            This week: <strong>${ctx.weekDays} training days</strong><br>
            Most trained: <strong>${Object.entries(ctx.exerciseFreq).sort((a,b) => b[1]-a[1]).slice(0,3).map(([n,c]) => `${n} (${c}x)`).join(', ')}</strong>
        `);

        // Muscle balance check
        const volumeEntries = Object.entries(ctx.weekMuscleVolume).filter(([,v]) => v > 0);
        if (volumeEntries.length > 0) {
            html += `<h3>Weekly Muscle Balance</h3>`;
            const neglected = Object.entries(ctx.weekMuscleVolume).filter(([,v]) => v === 0).map(([g]) => g);
            if (neglected.length > 0) {
                html += `<p>You haven't hit <strong>${neglected.join(', ')}</strong> this week. Consider adding exercises for these groups.</p>`;
            }
            volumeEntries.sort((a,b) => b[1]-a[1]);
            html += `<ul>`;
            volumeEntries.forEach(([group, sets]) => {
                const status = sets >= 10 ? 'Great volume' : sets >= 5 ? 'Moderate' : 'Could use more';
                html += `<li><strong>${group.charAt(0).toUpperCase() + group.slice(1)}:</strong> ${sets} sets (${status})</li>`;
            });
            html += `</ul>`;
        }

        // Stagnation warnings
        if (ctx.stagnant.length > 0) {
            html += `<h3>Plateau Alert</h3>`;
            html += `<p>These exercises haven't increased in weight over your last 4 sessions:</p><ul>`;
            ctx.stagnant.forEach(name => {
                html += `<li><strong>${name}</strong> — try adding 2.5 ${unit}, doing an extra rep, or switching to a variation</li>`;
            });
            html += `</ul>`;
        }

        // PRs
        const prEntries = Object.entries(ctx.exercisePRs).sort((a,b) => b[1]-a[1]).slice(0, 5);
        if (prEntries.length > 0) {
            html += `<h3>Your Top Lifts (Personal Records)</h3><ul>`;
            prEntries.forEach(([name, weight]) => {
                html += `<li><strong>${name}:</strong> ${lbsToDisplay(weight)} ${unit}</li>`;
            });
            html += `</ul>`;
        }
    }

    // Nutrition check
    if (ctx.weekNutrition.days > 0) {
        html += `<h3>Nutrition (7-Day Average)</h3>`;
        const calGoal = ctx.profile.calorieGoal || 2000;
        const calDiff = ctx.weekNutrition.calories - calGoal;
        html += insightHtml(`
            Avg Calories: <strong>${ctx.weekNutrition.calories}</strong> (goal: ${calGoal}, ${calDiff > 0 ? '+' : ''}${calDiff})<br>
            Avg Protein: <strong>${ctx.weekNutrition.protein}g</strong><br>
            Avg Carbs: <strong>${ctx.weekNutrition.carbs}g</strong> | Avg Fat: <strong>${ctx.weekNutrition.fat}g</strong><br>
            Tracking days: ${ctx.weekNutrition.days}/7
        `);
        if (ctx.weekNutrition.days < 5) {
            html += `<p>You're only logging ${ctx.weekNutrition.days} out of 7 days. Try to track more consistently — what gets measured gets managed.</p>`;
        }
    }

    html += verseHtml();
    return html;
}

