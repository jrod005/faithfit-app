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

    return {
        profile, workouts, meals, weights, todayWorkouts, todayMeals,
        weekWorkouts, weekDays, monthWorkouts, exerciseFreq, weekMuscleVolume,
        muscleMap, weightTrend, weekNutrition, exercisePRs, stagnant,
        exercisesByName, hasProfile: !!profile.name, currentWeight: weights.length > 0 ? weights[weights.length - 1].weight : 0
    };
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

// --- Keyword-based Response Engine ---
const TOPIC_RESPONSES = {
    // Each topic: array of { keywords: [], handler: function }
    topics: [
        {
            id: 'plan_my_week',
            keywords: ['plan my week', '7-day', '7 day', 'weekly schedule', 'weekly plan', 'this week.*plan', 'week.*schedule', 'schedule.*week'],
            handler: (ctx) => generateWeeklySchedule(ctx),
        },
        {
            id: 'workout_plan',
            keywords: ['workout plan', 'training plan', 'program', 'routine', 'split', 'generate.*plan', 'create.*plan', 'make.*plan', 'give me a plan', 'workout for me', 'what should i do.*gym'],
            handler: (ctx) => generateWorkoutPlan(ctx),
        },
        {
            id: 'meal_plan',
            keywords: ['meal plan', 'diet plan', 'what.*eat', 'food plan', 'eating plan', 'nutrition plan', 'create.*meal', 'generate.*meal', 'meal prep', 'what should i eat'],
            handler: (ctx) => generateMealPlan(ctx),
        },
        {
            id: 'fill_macros',
            keywords: ['fill.*macro', 'hit.*macro', 'reach.*goal', 'remaining.*cal', 'left.*eat', 'still need', 'short on', 'how.*fill', 'what.*eat.*now', 'hungry', 'snack idea', 'finish.*day', 'close.*goal', 'almost.*goal', 'need more protein', 'need more cal', 'recommend.*food', 'suggest.*food', 'food.*recommend', 'what.*can.*eat'],
            handler: (ctx) => {
                const calGoal = ctx.profile.calorieGoal || 2000;
                const protGoal = ctx.profile.proteinGoal || 150;
                const carbGoal = Math.round(calGoal * 0.40 / 4);
                const fatGoal = Math.round(calGoal * 0.30 / 9);

                // Today's intake
                const todayMeals = ctx.todayMeals;
                const eaten = { calories: 0, protein: 0, carbs: 0, fat: 0 };
                todayMeals.forEach(m => {
                    eaten.calories += m.calories;
                    eaten.protein += m.protein;
                    eaten.carbs += m.carbs;
                    eaten.fat += m.fat;
                });

                const remaining = {
                    calories: Math.max(0, calGoal - eaten.calories),
                    protein: Math.max(0, protGoal - eaten.protein),
                    carbs: Math.max(0, carbGoal - eaten.carbs),
                    fat: Math.max(0, fatGoal - eaten.fat),
                };

                let html = `<h3>&#x1F37D; What to Eat Now</h3>`;

                if (todayMeals.length === 0) {
                    html += insightHtml(`You haven't logged any meals today. Here's what you need to hit your full daily targets.`);
                } else {
                    html += insightHtml(`You've eaten <strong>${eaten.calories} cal</strong> and <strong>${eaten.protein}g protein</strong> today. Here's what's left.`);
                }

                // Remaining macros display
                html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:12px 0;">`;
                html += `<div style="background:var(--card);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:700;color:${remaining.calories > 200 ? 'var(--accent)' : '#4ade80'};">${remaining.calories}</div>
                    <div style="font-size:11px;color:var(--text-muted);">cal left</div></div>`;
                html += `<div style="background:var(--card);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:700;color:${remaining.protein > 20 ? '#f87171' : '#4ade80'};">${remaining.protein}g</div>
                    <div style="font-size:11px;color:var(--text-muted);">protein</div></div>`;
                html += `<div style="background:var(--card);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:700;">${remaining.carbs}g</div>
                    <div style="font-size:11px;color:var(--text-muted);">carbs</div></div>`;
                html += `<div style="background:var(--card);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:700;">${remaining.fat}g</div>
                    <div style="font-size:11px;color:var(--text-muted);">fat</div></div>`;
                html += `</div>`;

                if (remaining.calories <= 50 && remaining.protein <= 10) {
                    html += `<p style="color:#4ade80;font-weight:600;">&#x2705; You've hit your targets for today! Great work.</p>`;
                    html += verseHtml();
                    return html;
                }

                // --- Smart food matching from FOOD_DB ---
                const db = (typeof FOOD_DB !== 'undefined') ? FOOD_DB : [];

                // Score each food by how well it fills the remaining macros
                function scoreFood(f) {
                    if (f.calories > remaining.calories + 100) return -1;
                    let score = 0;
                    // Prioritize protein if that's the biggest gap
                    if (remaining.protein > 20) score += (f.protein / Math.max(remaining.protein, 1)) * 40;
                    // Calorie fit
                    if (f.calories <= remaining.calories) score += 15;
                    // Penalize foods that blow the budget
                    if (f.calories > remaining.calories) score -= 10;
                    // Bonus for balanced macros
                    score += Math.min(f.carbs, remaining.carbs) * 0.1;
                    score += Math.min(f.fat, remaining.fat) * 0.1;
                    return score;
                }

                const scored = db.map(f => ({ ...f, score: scoreFood(f) }))
                    .filter(f => f.score > 0)
                    .sort((a, b) => b.score - a.score);

                // --- Categorize recommendations ---
                const highProtein = scored.filter(f => f.protein >= 15).slice(0, 6);
                const quickSnacks = scored.filter(f => f.calories <= 300).slice(0, 6);
                const fullMeals = scored.filter(f => f.calories >= 300 && f.calories <= remaining.calories).slice(0, 6);

                // Emoji map for food visualization
                const foodEmoji = {
                    'chicken': '&#x1F357;', 'turkey': '&#x1F357;', 'steak': '&#x1F969;', 'beef': '&#x1F969;', 'bison': '&#x1F969;',
                    'salmon': '&#x1F41F;', 'tuna': '&#x1F41F;', 'tilapia': '&#x1F41F;', 'shrimp': '&#x1F990;', 'cod': '&#x1F41F;',
                    'egg': '&#x1F95A;', 'yogurt': '&#x1F95B;', 'milk': '&#x1F95B;', 'cheese': '&#x1F9C0;', 'cottage': '&#x1F9C0;',
                    'rice': '&#x1F35A;', 'oat': '&#x1F35A;', 'pasta': '&#x1F35D;', 'bread': '&#x1F35E;', 'bagel': '&#x1F96F;', 'tortilla': '&#x1FAD3;', 'quinoa': '&#x1F35A;',
                    'banana': '&#x1F34C;', 'apple': '&#x1F34E;', 'blueberr': '&#x1FAD0;', 'strawberr': '&#x1F353;', 'grape': '&#x1F347;', 'orange': '&#x1F34A;', 'mango': '&#x1F96D;', 'avocado': '&#x1F951;', 'watermelon': '&#x1F349;', 'pineapple': '&#x1F34D;', 'peach': '&#x1F351;',
                    'broccoli': '&#x1F966;', 'salad': '&#x1F957;', 'lettuce': '&#x1F957;', 'spinach': '&#x1F96C;', 'kale': '&#x1F96C;', 'carrot': '&#x1F955;', 'corn': '&#x1F33D;', 'potato': '&#x1F954;', 'sweet potato': '&#x1F360;',
                    'peanut': '&#x1F95C;', 'almond': '&#x1F95C;', 'walnut': '&#x1F95C;', 'cashew': '&#x1F95C;', 'nut': '&#x1F95C;',
                    'protein shake': '&#x1F964;', 'protein bar': '&#x1F36B;', 'whey': '&#x1F964;', 'casein': '&#x1F964;',
                    'pizza': '&#x1F355;', 'burger': '&#x1F354;', 'taco': '&#x1F32E;', 'burrito': '&#x1F32F;', 'sandwich': '&#x1F96A;', 'wrap': '&#x1F32F;',
                    'pancake': '&#x1F95E;', 'waffle': '&#x1F9C7;', 'bacon': '&#x1F953;', 'sausage': '&#x1F953;',
                    'cookie': '&#x1F36A;', 'chocolate': '&#x1F36B;', 'ice cream': '&#x1F368;', 'popcorn': '&#x1F37F;',
                    'coffee': '&#x2615;', 'latte': '&#x2615;', 'juice': '&#x1F9C3;', 'smoothie': '&#x1F964;', 'beer': '&#x1F37A;', 'wine': '&#x1F377;',
                    'honey': '&#x1F36F;', 'hummus': '&#x1F958;', 'soup': '&#x1F372;', 'ramen': '&#x1F35C;',
                };

                function getEmoji(name) {
                    const lower = name.toLowerCase();
                    for (const [key, emoji] of Object.entries(foodEmoji)) {
                        if (lower.includes(key)) return emoji;
                    }
                    return '&#x1F374;';
                }

                function renderFoodCards(foods, sectionTitle) {
                    if (foods.length === 0) return '';
                    let s = `<h3>${sectionTitle}</h3>`;
                    s += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 16px;">`;
                    foods.forEach(f => {
                        s += `<div style="background:var(--card);padding:10px;border-radius:8px;border:1px solid var(--border);">`;
                        s += `<div style="font-size:22px;margin-bottom:4px;">${getEmoji(f.name)}</div>`;
                        s += `<div style="font-size:13px;font-weight:600;">${f.name}</div>`;
                        s += `<div style="font-size:11px;color:var(--text-muted);margin:2px 0;">${f.serving}</div>`;
                        s += `<div style="font-size:12px;margin-top:4px;">`;
                        s += `<span style="color:var(--accent);">${f.calories} cal</span> &middot; `;
                        s += `<span style="color:#f87171;">${f.protein}g P</span> &middot; `;
                        s += `<span>${f.carbs}g C</span> &middot; `;
                        s += `<span>${f.fat}g F</span>`;
                        s += `</div></div>`;
                    });
                    s += `</div>`;
                    return s;
                }

                // Show recommendations based on what they need
                if (remaining.protein > 20 && highProtein.length > 0) {
                    html += renderFoodCards(highProtein, '&#x1F4AA; High Protein — You Need ' + remaining.protein + 'g More');
                }

                if (remaining.calories >= 300 && fullMeals.length > 0) {
                    html += renderFoodCards(fullMeals, '&#x1F37D; Full Meals That Fit Your Remaining Budget');
                }

                if (remaining.calories > 0 && remaining.calories < 600 && quickSnacks.length > 0) {
                    html += renderFoodCards(quickSnacks, '&#x26A1; Quick Snacks to Close the Gap');
                }

                // --- Combo meal suggestions that add up to fill the gap ---
                html += `<h3>&#x1F468;&#x200D;&#x1F373; Meal Combos to Fill Your Remaining Macros</h3>`;

                // Build smart combos
                const combos = [];

                // Helper: find foods in a category
                function pick(keyword, maxCal) {
                    return db.filter(f => f.name.toLowerCase().includes(keyword) && f.calories <= maxCal);
                }

                if (remaining.calories >= 400 && remaining.protein >= 25) {
                    // High protein meal combo
                    const proteins = pick('chicken', remaining.calories).concat(pick('salmon', remaining.calories), pick('turkey', remaining.calories), pick('steak', remaining.calories));
                    const carbs = pick('rice', 300).concat(pick('potato', 300), pick('pasta', 300));
                    const vegs = pick('broccoli', 100).concat(pick('spinach', 100), pick('asparagus', 100));
                    if (proteins.length > 0 && carbs.length > 0) {
                        const p = proteins[Math.floor(Math.random() * proteins.length)];
                        const c = carbs[Math.floor(Math.random() * carbs.length)];
                        const v = vegs.length > 0 ? vegs[Math.floor(Math.random() * vegs.length)] : null;
                        const total = { cal: p.calories + c.calories + (v ? v.calories : 0), prot: p.protein + c.protein + (v ? v.protein : 0) };
                        combos.push({ name: `${p.name} + ${c.name}${v ? ' + ' + v.name : ''}`, calories: total.cal, protein: total.prot, emoji: getEmoji(p.name),
                            recipe: `Season ${p.serving} of ${p.name.toLowerCase()} with salt, pepper, and garlic powder. Cook on medium-high heat 4-5 min per side. Serve with ${c.serving} of ${c.name.toLowerCase()}${v ? ' and a side of ' + v.name.toLowerCase() + ' (steamed or roasted at 400°F for 15 min)' : ''}.` });
                    }
                }

                if (remaining.calories >= 250 && remaining.protein >= 15) {
                    // Shake/snack combo
                    const shakes = pick('protein', 300).concat(pick('whey', 300));
                    const fruits = pick('banana', 150).concat(pick('blueberr', 150), pick('apple', 150));
                    const fats = pick('peanut butter', 200).concat(pick('almond butter', 200));
                    if (shakes.length > 0) {
                        const s = shakes[Math.floor(Math.random() * shakes.length)];
                        const fr = fruits.length > 0 ? fruits[Math.floor(Math.random() * fruits.length)] : null;
                        const fa = fats.length > 0 ? fats[Math.floor(Math.random() * fats.length)] : null;
                        const total = { cal: s.calories + (fr ? fr.calories : 0) + (fa ? fa.calories : 0), prot: s.protein + (fr ? fr.protein : 0) + (fa ? fa.protein : 0) };
                        combos.push({ name: `Protein Shake Combo`, calories: total.cal, protein: total.prot, emoji: '&#x1F964;',
                            recipe: `Blend 1 scoop of whey protein with ${fr ? fr.serving + ' ' + fr.name.toLowerCase() + ', ' : ''}${fa ? fa.serving + ' ' + fa.name.toLowerCase() + ', ' : ''}8oz water or milk, and ice. Blend until smooth. Quick, easy, and packed with protein.` });
                    }
                }

                if (remaining.calories >= 300) {
                    // Egg-based meal
                    const eggs = db.find(f => f.name === 'Egg (Whole)');
                    const toast = db.find(f => f.name.toLowerCase().includes('wheat bread') || f.name.toLowerCase().includes('bread'));
                    const avo = db.find(f => f.name.toLowerCase().includes('avocado'));
                    if (eggs) {
                        const eggCount = Math.min(4, Math.floor(remaining.protein / eggs.protein));
                        const total = { cal: eggs.calories * eggCount + (toast ? toast.calories : 0) + (avo ? Math.round(avo.calories/2) : 0),
                                        prot: eggs.protein * eggCount + (toast ? toast.protein : 0) + (avo ? Math.round(avo.protein/2) : 0) };
                        combos.push({ name: `${eggCount} Eggs${toast ? ' + Toast' : ''}${avo ? ' + Avocado' : ''}`, calories: total.cal, protein: total.prot, emoji: '&#x1F95A;',
                            recipe: `Scramble ${eggCount} eggs with salt and pepper in a non-stick pan over medium heat. ${toast ? 'Toast ' + toast.serving + ' of bread.' : ''} ${avo ? 'Slice half an avocado on top or on the side.' : ''} Simple, fast, and hits your protein.` });
                    }
                }

                if (remaining.calories >= 200 && remaining.protein >= 10) {
                    // Greek yogurt bowl
                    const yogurt = db.find(f => f.name.toLowerCase().includes('greek yogurt') && f.name.toLowerCase().includes('plain'));
                    const honey = db.find(f => f.name.toLowerCase().includes('honey'));
                    const granola = db.find(f => f.name.toLowerCase().includes('granola'));
                    const berries = db.find(f => f.name.toLowerCase().includes('blueberr') || f.name.toLowerCase().includes('strawberr'));
                    if (yogurt) {
                        const total = { cal: yogurt.calories + (honey ? honey.calories : 0) + (berries ? berries.calories : 0),
                                        prot: yogurt.protein + (berries ? berries.protein : 0) };
                        combos.push({ name: `Greek Yogurt Bowl`, calories: total.cal, protein: total.prot, emoji: '&#x1F963;',
                            recipe: `Scoop ${yogurt.serving} plain Greek yogurt into a bowl. Top with ${berries ? berries.serving + ' ' + berries.name.toLowerCase() + ', ' : 'fresh berries, '}${honey ? 'a drizzle of honey, ' : ''}and a sprinkle of granola or nuts. High protein, creamy, and satisfying.` });
                    }
                }

                if (combos.length > 0) {
                    combos.forEach(combo => {
                        html += `<div style="background:var(--card);padding:12px;border-radius:8px;border:1px solid var(--border);margin:8px 0;">`;
                        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">`;
                        html += `<span style="font-size:26px;">${combo.emoji}</span>`;
                        html += `<div><div style="font-size:14px;font-weight:700;">${combo.name}</div>`;
                        html += `<div style="font-size:12px;color:var(--text-muted);">${combo.calories} cal &middot; ${combo.protein}g protein</div></div>`;
                        html += `</div>`;
                        html += `<div style="font-size:13px;color:var(--text-secondary);line-height:1.5;border-top:1px solid var(--border);padding-top:8px;margin-top:4px;">${combo.recipe}</div>`;
                        html += `</div>`;
                    });
                } else {
                    html += `<p>Log some meals first and I'll suggest combos to fill the gap!</p>`;
                }

                // Tip based on what's missing
                html += `<h3>&#x1F4A1; Tips</h3><ul>`;
                if (remaining.protein > 30) {
                    html += `<li><strong>Protein is your priority.</strong> You're ${remaining.protein}g short — lean meats, Greek yogurt, protein shakes, and eggs are your best friends right now.</li>`;
                }
                if (remaining.calories > 0 && remaining.calories < 300) {
                    html += `<li><strong>Almost there!</strong> A quick snack like a protein bar, Greek yogurt, or handful of nuts will close the gap.</li>`;
                }
                if (remaining.fat > 20) {
                    html += `<li><strong>Healthy fats remaining:</strong> Add avocado, nuts, olive oil, or peanut butter to your next meal.</li>`;
                }
                if (remaining.carbs > 50) {
                    html += `<li><strong>Carbs to fill:</strong> Rice, oats, fruit, or a sweet potato will get you there.</li>`;
                }
                html += `<li>Remember: hitting your protein goal matters most for body composition. Calories second, then carbs/fat.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" });
                return html;
            },
        },
        {
            id: 'progress',
            keywords: ['progress', 'analyze', 'how am i doing', 'my stats', 'report', 'summary', 'overview', 'review'],
            handler: (ctx) => analyzeProgress(ctx),
        },
        {
            id: 'what_next',
            keywords: ['what.*next', 'what should.*work', 'what.*train', 'which muscle', 'what.*focus', 'suggest.*exercise', 'recommend'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>What To Work On Next</h3>`;
                // Find least-trained muscle groups this week
                const sorted = Object.entries(ctx.weekMuscleVolume).sort((a,b) => a[1] - b[1]);
                const neglected = sorted.filter(([,v]) => v === 0);
                const low = sorted.filter(([,v]) => v > 0 && v < 6);

                if (neglected.length > 0) {
                    html += `<p>These muscle groups haven't been hit this week — prioritize them:</p><ul>`;
                    neglected.forEach(([group]) => {
                        const exercises = ctx.muscleMap[group].slice(0, 3);
                        html += `<li><strong>${group.charAt(0).toUpperCase() + group.slice(1)}:</strong> Try ${exercises.join(', ')}</li>`;
                    });
                    html += `</ul>`;
                } else if (low.length > 0) {
                    html += `<p>These muscle groups could use more volume this week:</p><ul>`;
                    low.forEach(([group, sets]) => {
                        html += `<li><strong>${group.charAt(0).toUpperCase() + group.slice(1)}:</strong> ${sets} sets — aim for at least 10</li>`;
                    });
                    html += `</ul>`;
                } else {
                    html += `<p>Great job — you've trained all major muscle groups this week! Consider a rest day or light recovery session.</p>`;
                }

                if (ctx.todayWorkouts.length === 0) {
                    html += insightHtml(`You haven't logged any exercises today. It's a great day to train!`);
                } else {
                    html += insightHtml(`You've already done ${ctx.todayWorkouts.length} exercises today. Nice work!`);
                }

                html += verseHtml();
                return html;
            },
        },
        {
            id: 'plateau',
            keywords: ['plateau', 'stuck', 'not progressing', 'stalled', 'can\'t increase', 'not gaining', 'weight.*same', 'no progress'],
            handler: (ctx) => {
                let html = `<h3>Breaking Through Your Plateau</h3>`;

                if (ctx.stagnant.length > 0) {
                    html += insightHtml(`I can see these exercises have stagnated: <strong>${ctx.stagnant.join(', ')}</strong>`);
                    html += `<p>Here are specific strategies for each:</p><ul>`;
                    ctx.stagnant.forEach(name => {
                        html += `<li><strong>${name}:</strong> `;
                        if (name.includes('Bench') || name.includes('Press')) {
                            html += `Try paused reps (2 sec pause at chest), switch grip width, or add close-grip bench as an accessory`;
                        } else if (name.includes('Squat')) {
                            html += `Try box squats, add pause squats, or switch to front squats for 2-3 weeks`;
                        } else if (name.includes('Deadlift')) {
                            html += `Try deficit deadlifts, add rack pulls, or switch stance (sumo vs conventional)`;
                        } else {
                            html += `Drop weight by 10%, increase reps to 10-12, then build back up. Or try a close variation.`;
                        }
                        html += `</li>`;
                    });
                    html += `</ul>`;
                }

                html += `<h3>General Plateau-Busting Strategies</h3><ul>`;
                html += `<li><strong>Deload Week:</strong> Drop to 50-60% of your working weight for 1 week. Your body needs recovery to break through.</li>`;
                html += `<li><strong>Microload:</strong> Use fractional plates (1.25 lbs per side). Small jumps compound over weeks.</li>`;
                html += `<li><strong>Change Rep Scheme:</strong> If you've been doing 5x5, try 4x8 or 3x10 for 3-4 weeks.</li>`;
                html += `<li><strong>Increase Frequency:</strong> Hit the lift 2x per week instead of 1x — more practice = faster progress.</li>`;
                html += `<li><strong>Check Sleep & Nutrition:</strong> You can't out-train a bad diet or poor sleep. 7+ hours sleep, 1g protein per lb bodyweight.</li>`;
                html += `<li><strong>Add Accessories:</strong> Weak points hold back main lifts. Add 2-3 sets of targeted accessory work.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" });
                return html;
            },
        },
        {
            id: 'nutrition_check',
            keywords: ['nutrition', 'calories', 'protein', 'macros', 'how.*nutrition', 'am i eating', 'food.*check', 'diet.*check', 'eating enough'],
            handler: (ctx) => {
                let html = `<h3>Nutrition Analysis</h3>`;
                const calGoal = ctx.profile.calorieGoal || 2000;
                const protGoal = ctx.profile.proteinGoal || 150;

                if (ctx.weekNutrition.days === 0) {
                    html += `<p>You haven't logged any meals recently. Start tracking your food to get personalized nutrition feedback!</p>`;
                    html += `<h3>Quick Guide</h3><ul>`;
                    html += `<li><strong>Protein:</strong> Aim for ${protGoal}g/day (your goal)</li>`;
                    html += `<li><strong>Calories:</strong> Target ${calGoal}/day based on your profile</li>`;
                    html += `<li><strong>Carbs:</strong> 40-50% of calories for active people</li>`;
                    html += `<li><strong>Fat:</strong> At least 0.3g per lb bodyweight for hormones</li>`;
                    html += `</ul>`;
                } else {
                    const avgCal = ctx.weekNutrition.calories;
                    const avgProt = ctx.weekNutrition.protein;
                    const calDiff = avgCal - calGoal;
                    const protDiff = avgProt - protGoal;

                    html += insightHtml(`7-Day Average: <strong>${avgCal} cal</strong> (target: ${calGoal}) | <strong>${avgProt}g protein</strong> (target: ${protGoal}g)`);

                    html += `<h3>Assessment</h3><ul>`;
                    if (Math.abs(calDiff) < 100) {
                        html += `<li>Calories: On target. Great consistency!</li>`;
                    } else if (calDiff > 0) {
                        html += `<li>Calories: You're averaging ${calDiff} cal over your goal. ${ctx.profile.goal === 'gain' ? 'This is fine for building muscle, just don\'t go too far over.' : 'Consider reducing portions slightly or cutting a snack.'}</li>`;
                    } else {
                        html += `<li>Calories: You're averaging ${Math.abs(calDiff)} cal under your goal. ${ctx.profile.goal === 'lose' ? 'A moderate deficit is good, but don\'t drop too low or you\'ll lose muscle.' : 'Try adding a protein shake or extra carbs to your meals.'}</li>`;
                    }

                    if (protDiff >= 0) {
                        html += `<li>Protein: Excellent! You're hitting your target. This is key for ${ctx.profile.goal === 'lose' ? 'preserving muscle on a cut' : 'building muscle'}.</li>`;
                    } else {
                        html += `<li>Protein: You're ${Math.abs(protDiff)}g short. Add protein-dense foods: chicken breast (31g/4oz), Greek yogurt (15g/cup), protein shake (25g/scoop).</li>`;
                    }

                    if (ctx.weekNutrition.days < 5) {
                        html += `<li>Consistency: You only tracked ${ctx.weekNutrition.days}/7 days. The days you don't track are usually the worst. Try to log everything.</li>`;
                    } else {
                        html += `<li>Consistency: ${ctx.weekNutrition.days}/7 days tracked. Solid effort!</li>`;
                    }
                    html += `</ul>`;
                }

                html += verseHtml({ text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" });
                return html;
            },
        },
        {
            id: 'form',
            keywords: ['form', 'technique', 'how to do', 'how do i', 'proper way', 'correct form', 'cue'],
            handler: (ctx, input) => {
                const exerciseForms = {
                    'squat': { title: 'Squat Form Guide', cues: ['Feet shoulder-width apart, toes slightly outward (15-30 degrees)', 'Take a deep breath and brace your core hard before descending', 'Push knees out over your toes — don\'t let them cave in', 'Go to at least parallel (hip crease at or below knee level)', 'Drive up through your whole foot — heel should never leave the ground', 'Keep your chest up and eyes forward throughout', 'Squeeze glutes at the top to fully lock out'], common_mistakes: ['Heels coming up off the ground (work on ankle mobility)', 'Knees caving inward (push them out, strengthen glutes)', '"Butt wink" at the bottom (don\'t go deeper than mobility allows)', 'Leaning too far forward (strengthen upper back, try front squats)'] },
                    'bench': { title: 'Bench Press Form Guide', cues: ['Retract and depress shoulder blades — "put them in your back pockets"', 'Maintain a slight arch in your lower back (natural, not extreme)', 'Grip the bar just outside shoulder width', 'Unrack and position the bar over your shoulders', 'Lower the bar to your lower chest/sternum with control', 'Touch the chest gently — don\'t bounce', 'Press up and slightly back toward the rack', 'Push your feet hard into the floor for leg drive'], common_mistakes: ['Flaring elbows out to 90 degrees (tuck to about 45-75 degrees)', 'Bouncing the bar off your chest', 'Lifting hips off the bench', 'Not retracting shoulder blades (leads to shoulder injuries)'] },
                    'deadlift': { title: 'Deadlift Form Guide', cues: ['Stand with feet hip-width apart, bar over mid-foot', 'Hinge at the hips and grip the bar just outside your shins', 'Drop your hips until shins touch the bar', 'Take a deep breath, brace hard, and pull the slack out of the bar', 'Push the floor away from you rather than pulling the bar up', 'Keep the bar close to your body the entire lift — it should scrape your shins', 'Lock out by squeezing your glutes — don\'t hyperextend your back', 'Lower the bar by hinging at the hips first, then bending knees'], common_mistakes: ['Rounding the lower back (keep it neutral, brace harder)', 'Jerking the bar off the floor (pull the slack out first)', 'Bar drifting away from the body (keep it close)', 'Hyperextending at the top (just stand straight)'] },
                    'overhead press': { title: 'Overhead Press Form Guide', cues: ['Stand with feet shoulder-width apart', 'Bar starts at collarbone/front rack position', 'Squeeze your glutes and brace your core', 'Press straight up — move your head back then forward through the "window"', 'Lock out directly overhead, slightly behind your ears', 'Lower with control back to collarbone'], common_mistakes: ['Excessive back lean (squeeze glutes harder, use less weight)', 'Pressing the bar out in front instead of straight up', 'Not locking out fully overhead', 'Not bracing core (can hurt lower back)'] },
                    'row': { title: 'Barbell Row Form Guide', cues: ['Hinge forward to about 45-60 degrees', 'Grip slightly wider than shoulder width', 'Pull the bar to your lower chest/upper abdomen', 'Squeeze your shoulder blades together at the top', 'Lower with control — 2-3 second eccentric', 'Keep your core tight and back neutral throughout'], common_mistakes: ['Using too much body English/momentum', 'Not going heavy enough (rows should be challenging)', 'Pulling to the belly button instead of lower chest', 'Rounding the upper back'] },
                    'hip thrust': { title: 'Hip Thrust Form Guide', cues: ['Upper back against a bench, feet flat on floor', 'Bar across your hip crease (use a pad)', 'Drive through your heels and squeeze glutes to lift hips', 'At the top, your shins should be vertical', 'Hold the top for 1 second with a hard glute squeeze', 'Lower slowly — 2-3 seconds'], common_mistakes: ['Pushing through toes instead of heels', 'Hyperextending the lower back at the top', 'Not squeezing glutes hard enough at lockout', 'Feet too close or too far from the bench'] },
                    'pull-up': { title: 'Pull-up Form Guide', cues: ['Grip the bar slightly wider than shoulder width', 'Start from a dead hang with arms fully extended', 'Pull your elbows down and back — imagine pulling the bar to your chest', 'Get your chin over the bar at the top', 'Lower slowly and with control to full extension', 'Avoid swinging — if you need to swing, use a band for assistance'], common_mistakes: ['Not going to full extension at bottom (half reps)', 'Kipping or swinging for momentum', 'Only getting forehead to bar level', 'Ignoring pull-ups because they\'re hard (use bands or lat pulldown)'] },
                    'curl': { title: 'Bicep Curl Form Guide', cues: ['Stand tall with elbows pinned at your sides', 'Curl the weight up with control — no swinging', 'Squeeze the bicep hard at the top', 'Lower slowly (3 seconds) for maximum growth', 'Keep your wrists neutral — don\'t flex them'], common_mistakes: ['Swinging the weight with your body', 'Moving your elbows forward (keeps tension off biceps)', 'Going too heavy and using momentum', 'Rushing the lowering phase'] },
                };

                const lower = input.toLowerCase();
                let matched = null;
                for (const [key, data] of Object.entries(exerciseForms)) {
                    if (lower.includes(key)) { matched = data; break; }
                }
                // Fuzzy match
                if (!matched) {
                    if (lower.includes('press') && (lower.includes('overhead') || lower.includes('ohp') || lower.includes('shoulder'))) matched = exerciseForms['overhead press'];
                    else if (lower.includes('bench') || lower.includes('chest press')) matched = exerciseForms['bench'];
                    else if (lower.includes('pull-up') || lower.includes('pullup') || lower.includes('chin')) matched = exerciseForms['pull-up'];
                    else if (lower.includes('row')) matched = exerciseForms['row'];
                    else if (lower.includes('thrust') || lower.includes('glute')) matched = exerciseForms['hip thrust'];
                }

                if (matched) {
                    let html = `<h3>${matched.title}</h3>`;
                    html += `<h3>Key Cues</h3><ol>`;
                    matched.cues.forEach(c => html += `<li>${c}</li>`);
                    html += `</ol><h3>Common Mistakes</h3><ul>`;
                    matched.common_mistakes.forEach(m => html += `<li>${m}</li>`);
                    html += `</ul>`;
                    html += verseHtml({ text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" });
                    return html;
                }

                // Generic form advice
                let html = `<h3>General Form Tips</h3>`;
                html += `<p>I have detailed form guides for these exercises — ask me about any of them:</p><ul>`;
                html += `<li><strong>Squat</strong> — "How do I squat properly?"</li>`;
                html += `<li><strong>Bench Press</strong> — "Bench form tips"</li>`;
                html += `<li><strong>Deadlift</strong> — "How to deadlift"</li>`;
                html += `<li><strong>Overhead Press</strong> — "OHP form"</li>`;
                html += `<li><strong>Barbell Row</strong> — "Row technique"</li>`;
                html += `<li><strong>Pull-ups</strong> — "How to do pull-ups"</li>`;
                html += `<li><strong>Hip Thrust</strong> — "Hip thrust form"</li>`;
                html += `<li><strong>Bicep Curls</strong> — "Curl form"</li>`;
                html += `</ul>`;
                html += `<h3>Universal Rules</h3><ul>`;
                html += `<li>Always warm up with light sets before working weight</li>`;
                html += `<li>Control the weight — if you can't control it, it's too heavy</li>`;
                html += `<li>Full range of motion > heavier weight with partial reps</li>`;
                html += `<li>Brace your core on every compound lift</li>`;
                html += `<li>Film yourself occasionally to check your form</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'motivation',
            keywords: ['motivat', 'tired', 'don\'t feel like', 'giving up', 'quit', 'lazy', 'unmotivated', 'burnout', 'burned out', 'discouraged'],
            handler: (ctx) => {
                let html = `<h3>Keep Going — You've Got This</h3>`;
                const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'friend';

                if (ctx.workouts.length > 0) {
                    const uniqueDays = [...new Set(ctx.workouts.map(w => w.date))].length;
                    const topExercise = Object.entries(ctx.exerciseFreq).sort((a,b) => b[1]-a[1])[0];
                    html += insightHtml(`${name}, look at what you've already accomplished: <strong>${ctx.workouts.length} exercises logged</strong> across <strong>${uniqueDays} training days</strong>. Your most dedicated exercise is <strong>${topExercise[0]}</strong> with ${topExercise[1]} sessions. That's not nothing — that's discipline.`);
                }

                const motivations = [
                    `<p>Here's the truth: motivation is a feeling. It comes and goes like the weather. <strong>Discipline is a decision.</strong> You don't need to feel like working out. You just need to show up.</p>`,
                    `<p>The hardest part of any workout is the first 5 minutes. Put on your shoes, get to the gym, do one warm-up set. That's it. Once you're moving, momentum takes over.</p>`,
                    `<p>Remember: every single person you admire for their fitness had days where they didn't want to train. The difference isn't motivation — it's that they went anyway.</p>`,
                ];
                html += motivations[Math.floor(Math.random() * motivations.length)];

                html += `<h3>Practical Steps for Today</h3><ul>`;
                html += `<li><strong>Scale it down:</strong> Don't skip entirely. Even 20 minutes is better than nothing.</li>`;
                html += `<li><strong>Change it up:</strong> If the gym sounds awful, go for a walk, do bodyweight exercises at home, or try a new activity.</li>`;
                html += `<li><strong>Remove friction:</strong> Lay out your gym clothes tonight. Pack your bag. Make it easy to go.</li>`;
                html += `<li><strong>Find your why:</strong> Write down 3 reasons you started. Put them on your phone wallpaper.</li>`;
                html += `<li><strong>Call a friend:</strong> Accountability partners make showing up feel less optional.</li>`;
                html += `<li><strong>Pray on it:</strong> Ask God for the strength to be a good steward of the body He gave you.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" });
                return html;
            },
        },
        {
            id: 'recovery',
            keywords: ['recover', 'rest', 'sore', 'soreness', 'sleep', 'tired', 'overtraining', 'injury', 'hurt', 'pain', 'deload'],
            handler: (ctx) => {
                let html = `<h3>Recovery & Rest Guide</h3>`;

                if (ctx.weekDays >= 6) {
                    html += insightHtml(`You've trained ${ctx.weekDays} days this week — that's a lot. Your body likely needs more rest to grow and adapt. Consider taking tomorrow off.`);
                }

                html += `<h3>Recovery Essentials</h3><ul>`;
                html += `<li><strong>Sleep 7-9 hours:</strong> This is #1. Growth hormone spikes during deep sleep. No supplement replaces good sleep.</li>`;
                html += `<li><strong>Eat enough protein:</strong> Your muscles repair with protein. Aim for ${ctx.profile.proteinGoal || 150}g daily, spread across meals.</li>`;
                html += `<li><strong>Hydrate:</strong> Aim for half your bodyweight in ounces of water. Dehydration impairs recovery.</li>`;
                html += `<li><strong>Active recovery:</strong> Light walking, stretching, or yoga on rest days helps blood flow without taxing your muscles.</li>`;
                html += `<li><strong>Manage stress:</strong> Cortisol (stress hormone) breaks down muscle. Prayer, meditation, and time outdoors help.</li>`;
                html += `</ul>`;

                html += `<h3>When to Deload</h3><ul>`;
                html += `<li>Every 4-6 weeks, or when weights start feeling heavier than usual</li>`;
                html += `<li>Drop to 50-60% of working weights for 1 week</li>`;
                html += `<li>Keep the same exercises and sets, just reduce the weight</li>`;
                html += `<li>You'll come back feeling stronger — this is backed by science</li>`;
                html += `</ul>`;

                html += `<h3>Soreness vs. Injury</h3><ul>`;
                html += `<li><strong>Normal soreness:</strong> Dull, achy feeling in the muscle belly. Goes away in 24-72 hours. Safe to train through (lightly).</li>`;
                html += `<li><strong>Warning signs:</strong> Sharp or stabbing pain, pain in joints (not muscles), pain that gets worse during exercise, numbness or tingling. <strong>Stop and see a doctor.</strong></li>`;
                html += `</ul>`;
                html += verseHtml({ text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" });
                return html;
            },
        },
        {
            id: 'beginner',
            keywords: ['beginner', 'start', 'new to', 'never lifted', 'first time', 'getting started', 'just starting', 'newbie', 'no experience'],
            handler: (ctx) => {
                let html = `<h3>Welcome to Your Fitness Journey!</h3>`;
                html += `<p>Starting is the hardest and most important step. Here's your roadmap to build a strong foundation.</p>`;

                html += `<h3>The First 4 Weeks</h3><ol>`;
                html += `<li><strong>Week 1-2:</strong> Learn the movements with just the bar or light dumbbells. Form is everything.</li>`;
                html += `<li><strong>Week 3-4:</strong> Start adding weight in small increments (5 lbs per session for compounds).</li>`;
                html += `</ol>`;

                html += `<h3>Your Starter Exercises (learn these first)</h3>`;
                html += `<table class="plan-table"><tr><th>Exercise</th><th>Why</th><th>Start With</th></tr>`;
                html += `<tr><td>Squat</td><td>Best overall lower body builder</td><td>Bodyweight, then empty bar</td></tr>`;
                html += `<tr><td>Bench Press</td><td>Primary chest & push strength</td><td>Empty bar (45 lbs)</td></tr>`;
                html += `<tr><td>Deadlift</td><td>Full body strength, posterior chain</td><td>95 lbs (empty bar + 25s)</td></tr>`;
                html += `<tr><td>Overhead Press</td><td>Shoulder strength & stability</td><td>Empty bar</td></tr>`;
                html += `<tr><td>Barbell Row</td><td>Back strength, posture</td><td>Empty bar or 65 lbs</td></tr>`;
                html += `</table>`;

                html += `<h3>Key Rules</h3><ul>`;
                html += `<li><strong>3 days per week</strong> is plenty. Mon/Wed/Fri with rest days between.</li>`;
                html += `<li><strong>Track everything</strong> in this app — you can't improve what you don't measure</li>`;
                html += `<li><strong>Eat protein:</strong> 0.7-1g per pound of body weight</li>`;
                html += `<li><strong>Sleep 7-9 hours:</strong> This is when muscles actually grow</li>`;
                html += `<li><strong>Don't compare yourself</strong> to others. Compare to who you were yesterday.</li>`;
                html += `<li><strong>Be patient:</strong> Real results take 3-6 months. You WILL see them if you stay consistent.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" });
                return html;
            },
        },
        {
            id: 'weight_loss',
            keywords: ['lose weight', 'weight loss', 'fat loss', 'cutting', 'cut', 'slim', 'lean', 'shred', 'burn fat', 'belly fat', 'lose fat'],
            handler: (ctx) => {
                let html = `<h3>Smart Fat Loss Strategy</h3>`;
                const calGoal = ctx.profile.calorieGoal || 2000;

                if (ctx.currentWeight > 0) {
                    const maintenanceCal = Math.round(ctx.currentWeight * 15);
                    const cutCal = maintenanceCal - 400;
                    html += insightHtml(`At ${lbsToDisplay(ctx.currentWeight)} ${wu()}, your estimated maintenance is ~${maintenanceCal} cal. A safe cut would be ~<strong>${cutCal} cal/day</strong> (400 cal deficit).`);
                }

                html += `<h3>The Rules of Sustainable Fat Loss</h3><ol>`;
                html += `<li><strong>Moderate deficit (300-500 cal):</strong> Bigger deficits = more muscle loss, worse workouts, and eventual binge eating.</li>`;
                html += `<li><strong>High protein (1g/lb bodyweight):</strong> This is THE most important rule for preserving muscle while losing fat.</li>`;
                html += `<li><strong>Keep lifting heavy:</strong> Don't switch to "toning" (high rep, low weight). Your muscles need a reason to stick around.</li>`;
                html += `<li><strong>Be patient:</strong> 0.5-1 lb per week is healthy and sustainable. That's 25-50 lbs in a year.</li>`;
                html += `<li><strong>Track your food:</strong> Use the Nutrition tab. People underestimate calories by 30-50% when not tracking.</li>`;
                html += `<li><strong>Weigh daily, track weekly:</strong> Your weight fluctuates 2-5 lbs day-to-day. Look at the weekly average.</li>`;
                html += `<li><strong>Drink water:</strong> Often what feels like hunger is thirst. Half your bodyweight in ounces daily.</li>`;
                html += `</ol>`;

                html += `<h3>Foods That Help</h3><ul>`;
                html += `<li>High protein + high volume = full and satisfied (chicken breast, Greek yogurt, egg whites, fish)</li>`;
                html += `<li>Vegetables with every meal (fiber, micronutrients, very low calorie)</li>`;
                html += `<li>Avoid liquid calories (sodas, juice, fancy coffees)</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "No discipline seems pleasant at the time, but painful. Later on it produces a harvest of righteousness.", ref: "Hebrews 12:11" });
                return html;
            },
        },
        {
            id: 'muscle_gain',
            keywords: ['build muscle', 'gain muscle', 'bulk', 'bulking', 'get big', 'hypertrophy', 'mass', 'size', 'grow', 'muscle gain'],
            handler: (ctx) => {
                let html = `<h3>Building Muscle Effectively</h3>`;

                if (ctx.currentWeight > 0) {
                    const surplusCal = Math.round(ctx.currentWeight * 16) + 300;
                    const proteinTarget = Math.round(ctx.currentWeight * 0.9);
                    html += insightHtml(`At ${lbsToDisplay(ctx.currentWeight)} ${wu()}, aim for ~<strong>${surplusCal} cal/day</strong> (slight surplus) and <strong>${proteinTarget}g protein</strong>.`);
                }

                html += `<h3>The 5 Pillars of Muscle Growth</h3><ol>`;
                html += `<li><strong>Progressive Overload:</strong> Add weight or reps every session. Use the Overload Tracker to monitor this!</li>`;
                html += `<li><strong>Caloric Surplus:</strong> You MUST eat more than you burn. A 200-400 cal surplus is the sweet spot — enough to grow, not enough to get fat.</li>`;
                html += `<li><strong>High Protein:</strong> 0.8-1g per lb of bodyweight, spread across 4-5 meals.</li>`;
                html += `<li><strong>Volume:</strong> 10-20 sets per muscle group per week. More isn't always better — quality matters.</li>`;
                html += `<li><strong>Recovery:</strong> Sleep 7-9 hours. Growth hormone peaks during deep sleep. Training breaks muscle down; sleep builds it back stronger.</li>`;
                html += `</ol>`;

                html += `<h3>Common Bulking Mistakes</h3><ul>`;
                html += `<li>"Dirty bulking" (eating everything) — you'll gain more fat than muscle. Keep it clean.</li>`;
                html += `<li>Skipping legs — your body releases more growth hormone from big compound leg exercises</li>`;
                html += `<li>Not tracking — "I eat a lot" isn't specific enough. Track for at least 2 weeks to calibrate.</li>`;
                html += `<li>Changing programs every 2 weeks — stick with a program for 8-12 weeks minimum.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "She sets about her work vigorously; her arms are strong for her tasks.", ref: "Proverbs 31:17" });
                return html;
            },
        },
        {
            id: 'one_rep_max',
            keywords: ['1rm', 'one rep max', 'my.*max', 'estimated.*max', 'max.*bench', 'max.*squat', 'max.*deadlift', 'max.*press', 'how much can i', 'how much do i', 'e1rm', 'rep max', 'strongest', 'heaviest'],
            handler: (ctx, input) => {
                const unit = wu();
                let html = `<h3>Estimated 1RM</h3>`;
                if (ctx.workouts.length === 0) {
                    html += `<p>You don't have any workout data logged yet. Head over to the <strong>Workout</strong> tab and log some exercises with weights and reps — then come back and I'll calculate your estimated one-rep max for each lift!</p>`;
                    html += verseHtml();
                    return html;
                }
                // Find which exercise user is asking about, or show top lifts
                const lower = input.toLowerCase();
                const compounds = ['Bench Press','Squat','Deadlift','Overhead Press','Barbell Row'];
                let targets = compounds;
                for (const c of compounds) {
                    if (lower.includes(c.toLowerCase().split(' ')[0])) { targets = [c]; break; }
                }
                let found = false;
                targets.forEach(name => {
                    const logs = ctx.exercisesByName[name];
                    if (!logs || logs.length === 0) return;
                    const last = logs[logs.length - 1];
                    const bestSet = last.sets.reduce((a, b) => (a.weight > b.weight ? a : b), last.sets[0]);
                    if (bestSet.weight > 0 && bestSet.reps > 0) {
                        // Epley formula: 1RM = weight × (1 + reps/30)
                        const e1rm = Math.round(bestSet.weight * (1 + bestSet.reps / 30));
                        found = true;
                        html += insightHtml(`<strong>${name}:</strong> ${lbsToDisplay(bestSet.weight)} ${unit} x ${bestSet.reps} reps → Est. 1RM: <strong>${lbsToDisplay(e1rm)} ${unit}</strong>`);
                    }
                });
                if (!found) {
                    html += `<p>You have workout data, but no logged sets for the main compound lifts (Bench Press, Squat, Deadlift, Overhead Press, Barbell Row) with weight and reps. Log some sets for these exercises and I'll crunch the numbers!</p>`;
                } else {
                    html += `<p style="font-size:13px;color:var(--text-secondary)">Calculated using the Epley formula. Test your actual 1RM with a spotter for accuracy.</p>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'warmup',
            keywords: ['warm up', 'warmup', 'warm-up', 'stretching', 'stretch', 'before workout', 'pre workout routine', 'dynamic stretch'],
            handler: (ctx) => {
                let html = `<h3>Dynamic Warm-Up</h3>`;
                // Check what they've trained today or suggest general
                const todayMuscles = new Set();
                ctx.todayWorkouts.forEach(w => {
                    for (const [group, exercises] of Object.entries(ctx.muscleMap)) {
                        if (exercises.some(e => w.name.toLowerCase() === e.toLowerCase())) todayMuscles.add(group);
                    }
                });
                const warmups = {
                    chest: ['Arm circles (20 each direction)', 'Band pull-aparts (15)', 'Push-ups (2×10 light)'],
                    back: ['Cat-cow stretches (10)', 'Band pull-aparts (15)', 'Light lat pulldown (2×12)'],
                    shoulders: ['Arm circles (20 each direction)', 'Band dislocates (15)', 'Empty bar press (2×10)'],
                    legs: ['Bodyweight squats (15)', 'Leg swings front/side (10 each)', 'Walking lunges (10 steps)', 'Hip circles (10 each)'],
                    biceps: ['Arm circles (15)', 'Light curls (15 reps)', 'Wrist circles (10 each)'],
                    triceps: ['Arm circles (15)', 'Light pushdowns (15)', 'Overhead stretch (15s each)'],
                    core: ['Cat-cow (10)', 'Dead bug (10)', 'Bird dog (10 each side)'],
                };
                if (todayMuscles.size > 0) {
                    html += `<p>Based on today's training:</p>`;
                    todayMuscles.forEach(g => {
                        if (warmups[g]) {
                            html += `<p><strong>${g.charAt(0).toUpperCase() + g.slice(1)}:</strong></p><ul>`;
                            warmups[g].forEach(w => html += `<li>${w}</li>`);
                            html += `</ul>`;
                        }
                    });
                } else {
                    html += `<p>Full-body warm-up (5 min):</p><ol>`;
                    html += `<li>Jumping jacks or light jog — 2 min</li>`;
                    html += `<li>Arm circles — 15 each direction</li>`;
                    html += `<li>Bodyweight squats — 15 reps</li>`;
                    html += `<li>Leg swings (front & side) — 10 each leg</li>`;
                    html += `<li>Hip circles — 10 each direction</li>`;
                    html += `<li>Band pull-aparts — 15 reps</li>`;
                    html += `<li>Cat-cow stretches — 10 reps</li>`;
                    html += `</ol>`;
                    html += `<p>Then do 2 light warm-up sets of your first exercise before working weight.</p>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'supplements',
            keywords: ['supplement', 'creatine', 'protein powder', 'pre.?workout', 'bcaa', 'vitamins', 'whey', 'casein'],
            handler: (ctx) => {
                let html = `<h3>Evidence-Based Supplements</h3>`;
                html += `<p><strong>Tier 1 — Actually works:</strong></p><ul>`;
                html += `<li><strong>Creatine monohydrate</strong> (5g/day) — Most studied supplement in history. Increases strength, muscle size, and recovery. Take daily, no need to cycle.</li>`;
                html += `<li><strong>Protein powder</strong> — Not magic, just convenient protein. Use it if you struggle to hit ${ctx.profile.proteinGoal || 150}g/day from food alone.</li>`;
                html += `<li><strong>Caffeine</strong> (200mg pre-workout) — Improves performance 3-5%. Coffee works fine.</li>`;
                html += `</ul>`;
                html += `<p><strong>Tier 2 — Helpful for some:</strong></p><ul>`;
                html += `<li><strong>Vitamin D</strong> — If you're low on sun exposure. Get bloodwork to check.</li>`;
                html += `<li><strong>Fish oil</strong> — If you don't eat fatty fish 2x/week.</li>`;
                html += `<li><strong>Magnesium</strong> — Helps sleep quality. Take before bed.</li>`;
                html += `</ul>`;
                html += `<p><strong>Skip these:</strong> BCAAs (waste of money if you eat protein), fat burners, testosterone boosters, most pre-workout blends (just drink coffee).</p>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'weekly_recap',
            keywords: ['weekly recap', 'week.*summary', 'this week.*vs', 'compare.*week', 'weekly report', 'how was my week', 'week review'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>Weekly Recap</h3>`;
                if (ctx.workouts.length === 0) {
                    html += `<p>No workout data yet! Log some exercises in the <strong>Workout</strong> tab this week, then come back for your weekly recap.</p>`;
                    html += verseHtml();
                    return html;
                }
                // This week
                const thisWeekDays = ctx.weekDays;
                const thisWeekSets = ctx.weekWorkouts.reduce((s, w) => s + w.sets.length, 0);
                // Last week
                const twoWeeksAgo = new Date();
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                const twoWeekStr = twoWeeksAgo.toISOString().split('T')[0];
                const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                const lastWeekWorkouts = ctx.workouts.filter(w => w.date >= twoWeekStr && w.date < weekAgoStr);
                const lastWeekDays = [...new Set(lastWeekWorkouts.map(w => w.date))].length;
                const lastWeekSets = lastWeekWorkouts.reduce((s, w) => s + w.sets.length, 0);

                html += `<table class="plan-table"><tr><th></th><th>This Week</th><th>Last Week</th><th>Change</th></tr>`;
                const daysDiff = thisWeekDays - lastWeekDays;
                const setsDiff = thisWeekSets - lastWeekSets;
                html += `<tr><td>Training Days</td><td>${thisWeekDays}</td><td>${lastWeekDays}</td><td>${daysDiff > 0 ? '+' : ''}${daysDiff}</td></tr>`;
                html += `<tr><td>Total Sets</td><td>${thisWeekSets}</td><td>${lastWeekSets}</td><td>${setsDiff > 0 ? '+' : ''}${setsDiff}</td></tr>`;

                if (ctx.weekNutrition.days > 0) {
                    html += `<tr><td>Avg Calories</td><td>${ctx.weekNutrition.calories}</td><td>—</td><td>—</td></tr>`;
                    html += `<tr><td>Avg Protein</td><td>${ctx.weekNutrition.protein}g</td><td>—</td><td>—</td></tr>`;
                }
                html += `</table>`;

                // Muscle coverage
                const hitGroups = Object.entries(ctx.weekMuscleVolume).filter(([,v]) => v > 0).length;
                const totalGroups = Object.keys(ctx.weekMuscleVolume).length;
                html += insightHtml(`Muscle coverage: <strong>${hitGroups}/${totalGroups}</strong> groups trained this week.`);

                if (thisWeekSets > lastWeekSets) html += `<p>Volume is up — great progress!</p>`;
                else if (thisWeekSets < lastWeekSets && lastWeekSets > 0) html += `<p>Volume is down from last week. Life happens — just stay consistent.</p>`;

                html += verseHtml();
                return html;
            },
        },
        {
            id: 'rest_timer',
            keywords: ['rest time', 'rest period', 'how long.*rest', 'rest between', 'rest timer', 'break between'],
            handler: (ctx) => {
                let html = `<h3>Rest Period Guide</h3>`;
                html += `<table class="plan-table"><tr><th>Goal</th><th>Rest Time</th><th>Why</th></tr>`;
                html += `<tr><td><strong>Strength</strong> (1-5 reps)</td><td>3-5 min</td><td>Full ATP recovery for max effort</td></tr>`;
                html += `<tr><td><strong>Hypertrophy</strong> (6-12 reps)</td><td>60-90 sec</td><td>Metabolic stress drives muscle growth</td></tr>`;
                html += `<tr><td><strong>Endurance</strong> (12+ reps)</td><td>30-60 sec</td><td>Keeps heart rate up, builds stamina</td></tr>`;
                html += `<tr><td><strong>Compounds</strong> (squat, dead, bench)</td><td>2-4 min</td><td>Heavier loads need more recovery</td></tr>`;
                html += `<tr><td><strong>Isolation</strong> (curls, raises)</td><td>60-90 sec</td><td>Smaller muscles recover faster</td></tr>`;
                html += `</table>`;
                html += `<p>When in doubt: rest until your breathing normalizes and you feel ready to give the next set full effort.</p>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'exercise_swap',
            keywords: ['swap', 'alternative', 'instead of', 'replace', 'substitute', 'can\'t do', 'replacement', 'variation'],
            handler: (ctx, input) => {
                const swaps = {
                    'bench press': ['Dumbbell Bench Press', 'Machine Chest Press', 'Push-ups (weighted)', 'Floor Press'],
                    'squat': ['Leg Press', 'Goblet Squat', 'Hack Squat', 'Bulgarian Split Squat'],
                    'deadlift': ['Romanian Deadlift', 'Trap Bar Deadlift', 'Hip Thrust', 'Good Mornings'],
                    'overhead press': ['Seated Dumbbell Press', 'Arnold Press', 'Machine Shoulder Press', 'Landmine Press'],
                    'pull-ups': ['Lat Pulldown', 'Assisted Pull-ups', 'Chin-ups', 'Band-assisted Pull-ups'],
                    'barbell row': ['Dumbbell Row', 'Seated Cable Row', 'T-Bar Row', 'Chest-Supported Row'],
                    'leg press': ['Squat', 'Hack Squat', 'Bulgarian Split Squat', 'Goblet Squat'],
                    'bicep curls': ['Hammer Curls', 'EZ Bar Curl', 'Cable Curl', 'Concentration Curls'],
                    'tricep pushdown': ['Overhead Tricep Extension', 'Skull Crushers', 'Diamond Push-ups', 'Tricep Dips'],
                    'lateral raises': ['Cable Lateral Raise', 'Machine Lateral Raise', 'Upright Row', 'Band Lateral Raise'],
                    'hip thrust': ['Glute Bridge', 'Cable Pull-through', 'Romanian Deadlift', 'Step-ups'],
                };
                const lower = input.toLowerCase();
                let html = `<h3>Exercise Alternatives</h3>`;
                let found = false;
                for (const [exercise, alts] of Object.entries(swaps)) {
                    if (lower.includes(exercise) || lower.includes(exercise.split(' ')[0])) {
                        html += `<p>Instead of <strong>${exercise.charAt(0).toUpperCase() + exercise.slice(1)}</strong>, try:</p><ol>`;
                        alts.forEach(a => html += `<li><strong>${a}</strong></li>`);
                        html += `</ol>`;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    html += `<p>Tell me which exercise you want to swap and I'll suggest alternatives. For example:</p><ul>`;
                    html += `<li>"Alternative to bench press"</li>`;
                    html += `<li>"What can I do instead of squats?"</li>`;
                    html += `<li>"Swap for pull-ups"</li>`;
                    html += `</ul>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'goal_timeline',
            keywords: ['timeline', 'how long.*until', 'when will i', 'how long.*take', 'predict', 'projection', 'goal.*date', 'reach.*goal'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>Progress Projection</h3>`;
                if (ctx.workouts.length === 0 && ctx.weights.length === 0) {
                    html += `<p>I need some data to project your progress. Start logging workouts and body weight in the app, and after a couple weeks I'll be able to estimate timelines for your goals!</p>`;
                    html += verseHtml();
                    return html;
                }
                // Weight goal projection
                if (ctx.weights.length >= 4) {
                    const recent = ctx.weights.slice(-8);
                    const first = recent[0];
                    const last = recent[recent.length - 1];
                    const days = Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / 86400000));
                    const ratePerWeek = ((last.weight - first.weight) / days) * 7;
                    if (Math.abs(ratePerWeek) > 0.1) {
                        const goalWeight = ctx.profile.goal === 'lose' ? ctx.currentWeight - 20 : ctx.currentWeight + 15;
                        const diff = goalWeight - ctx.currentWeight;
                        const weeksNeeded = Math.abs(diff / ratePerWeek);
                        const targetDate = new Date();
                        targetDate.setDate(targetDate.getDate() + weeksNeeded * 7);
                        html += insightHtml(`At your current rate of <strong>${ratePerWeek > 0 ? '+' : ''}${(parseFloat(lbsToDisplay(Math.abs(ratePerWeek)))).toFixed(1)} ${unit}/week</strong>, you'd reach <strong>${lbsToDisplay(goalWeight)} ${unit}</strong> by approximately <strong>${targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>.`);
                    } else {
                        html += `<p>Your weight has been stable. Set a clear goal in your profile to get a timeline.</p>`;
                    }
                }
                // Lift projections
                const compounds = ['Bench Press', 'Squat', 'Deadlift'];
                let liftProjections = false;
                compounds.forEach(name => {
                    const logs = ctx.exercisesByName[name];
                    if (!logs || logs.length < 4) return;
                    const early = logs.slice(0, Math.min(3, logs.length));
                    const late = logs.slice(-3);
                    const earlyMax = Math.max(...early.map(l => Math.max(...l.sets.map(s => s.weight))));
                    const lateMax = Math.max(...late.map(l => Math.max(...l.sets.map(s => s.weight))));
                    const sessions = logs.length;
                    const gainPerSession = (lateMax - earlyMax) / Math.max(1, sessions - 1);
                    if (gainPerSession > 0) {
                        if (!liftProjections) { html += `<h3>Lift Projections</h3>`; liftProjections = true; }
                        const nextMilestone = Math.ceil(lateMax / 25) * 25 + 25;
                        const sessionsNeeded = Math.ceil((nextMilestone - lateMax) / gainPerSession);
                        html += insightHtml(`<strong>${name}:</strong> Current best ${lbsToDisplay(lateMax)} ${unit} → <strong>${lbsToDisplay(nextMilestone)} ${unit}</strong> in ~${sessionsNeeded} sessions`);
                    }
                });
                if (ctx.weights.length < 4 && !liftProjections) {
                    html += `<p>I need more data to project timelines. Keep logging workouts and weight for 2+ weeks!</p>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'streak',
            keywords: ['streak', 'consistency', 'how consistent', 'how many days.*row', 'discipline', 'attendance'],
            handler: (ctx) => {
                let html = `<h3>Consistency Tracker</h3>`;
                if (ctx.workouts.length === 0) {
                    html += `<p>No workouts yet. Start your streak today!</p>`;
                    return html + verseHtml();
                }
                // Calculate weekly streak
                const workoutDates = [...new Set(ctx.workouts.map(w => w.date))].sort();
                const weeks = {};
                workoutDates.forEach(d => {
                    const dt = new Date(d);
                    const weekStart = new Date(dt);
                    weekStart.setDate(dt.getDate() - dt.getDay());
                    const key = weekStart.toISOString().split('T')[0];
                    weeks[key] = (weeks[key] || 0) + 1;
                });
                const weekKeys = Object.keys(weeks).sort().reverse();
                let weekStreak = 0;
                for (const k of weekKeys) {
                    if (weeks[k] > 0) weekStreak++;
                    else break;
                }
                const totalDays = workoutDates.length;
                const firstDate = workoutDates[0];
                const daysSinceStart = Math.max(1, Math.round((Date.now() - new Date(firstDate)) / 86400000));
                const avgPerWeek = (totalDays / daysSinceStart * 7).toFixed(1);

                html += insightHtml(`
                    Training days total: <strong>${totalDays}</strong><br>
                    Active weeks in a row: <strong>${weekStreak} week${weekStreak !== 1 ? 's' : ''}</strong><br>
                    Average: <strong>${avgPerWeek} days/week</strong> since you started
                `);
                if (weekStreak >= 4) html += `<p>Incredible consistency! You're building something real.</p>`;
                else if (weekStreak >= 2) html += `<p>Solid streak going. Keep showing up!</p>`;
                else html += `<p>Every journey starts with day one. Build the habit, one week at a time.</p>`;
                html += verseHtml({ text: "Let us not become weary in doing good, for at the proper time we will reap a harvest.", ref: "Galatians 6:9" });
                return html;
            },
        },
        {
            id: 'cardio',
            keywords: ['cardio', 'running', 'hiit', 'liss', 'treadmill', 'cycling', 'heart rate', 'conditioning', 'endurance', 'stamina'],
            handler: (ctx) => {
                const goal = ctx.profile.goal || 'maintain';
                let html = `<h3>Cardio Guide</h3>`;
                html += `<table class="plan-table"><tr><th>Type</th><th>What</th><th>When</th></tr>`;
                html += `<tr><td><strong>LISS</strong></td><td>Walking, light cycling (can hold a conversation)</td><td>Rest days, post-workout</td></tr>`;
                html += `<tr><td><strong>HIIT</strong></td><td>Sprints, intervals (20-30 sec hard, 60-90 sec rest)</td><td>1-2x/week max, not on leg day</td></tr>`;
                html += `<tr><td><strong>Moderate</strong></td><td>Jogging, swimming, rowing (moderate effort)</td><td>2-3x/week, separate from lifting</td></tr>`;
                html += `</table>`;
                html += `<h3>Recommendation for Your Goal</h3>`;
                if (goal === 'lose') {
                    html += `<p>Focus on <strong>LISS (walking)</strong> — 3-4 times per week, 30 min. Add 1 HIIT session if progress stalls. Walking burns fat without killing recovery.</p>`;
                } else if (goal === 'gain') {
                    html += `<p>Keep cardio <strong>minimal</strong> — 2 walks per week. Every calorie burned is a calorie not building muscle. Save your energy for the weights.</p>`;
                } else {
                    html += `<p>Mix it up — 2-3 sessions of whatever you enjoy. Consistency matters more than the type. Heart health is part of the mission.</p>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'meal_timing',
            keywords: ['meal timing', 'pre.?workout.*meal', 'post.?workout.*meal', 'when.*eat', 'eat before', 'eat after', 'nutrient timing', 'anabolic window'],
            handler: (ctx) => {
                let html = `<h3>Workout Nutrition Timing</h3>`;
                html += `<p><strong>Pre-Workout</strong> (1-2 hours before):</p><ul>`;
                html += `<li>Moderate carbs + moderate protein, low fat</li>`;
                html += `<li>Examples: rice + chicken, oatmeal + protein shake, banana + PB toast</li>`;
                html += `<li>Avoid heavy fat — slows digestion and can cause nausea</li>`;
                html += `</ul>`;
                html += `<p><strong>Post-Workout</strong> (within 2 hours after):</p><ul>`;
                html += `<li>Protein (30-40g) + fast carbs to replenish glycogen</li>`;
                html += `<li>Examples: protein shake + fruit, chicken + rice, eggs + toast</li>`;
                html += `</ul>`;
                html += `<p><strong>The truth about the "anabolic window":</strong> It's not as tight as people think. Just eat a solid meal within 2 hours of training and you're fine. Total daily protein matters way more than timing.</p>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'weak_point',
            keywords: ['weak point', 'weak.?point', 'imbalance', 'lagging', 'underdeveloped', 'asymmetr', 'weak muscle', 'physique.*weak', 'aesthetic.*weak', 'performance.*weak', 'weak.*analysis', 'eliminate.*weak', 'fix.*weak'],
            handler: (ctx, input) => {
                // --- Corrective exercise database by muscle group ---
                const correctiveDB = {
                    chest: { muscle: 'Chest', exercises: [
                        { name: 'Low Incline Dumbbell Press (15-30°)', sets: '4×8-10', tempo: '3-1-1-0', cues: 'Set bench to 1-2 clicks. Flare elbows ~60°. Lower to upper chest, drive up and slightly inward.' },
                        { name: 'Cable Fly (various angles)', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Adjust pulley height to target weak area. Squeeze for 2 seconds at peak contraction.' },
                        { name: 'Dumbbell Bench Press (deep stretch)', sets: '3×10-12', tempo: '3-0-1-0', cues: 'Go slightly deeper than barbell allows. Slow eccentric builds pec strength through greater ROM.' }
                    ], timeline: '6-8 weeks for improved fullness; 12-16 weeks for visible change.', markers: 'Press weight increases 10-15%, visible chest development in relaxed pose.' },
                    back: { muscle: 'Back', exercises: [
                        { name: 'Wide-Grip Lat Pulldown', sets: '4×10-12', tempo: '2-0-1-2', cues: 'Lean back slightly, pull elbows DOWN and INTO your sides. Think "pull with elbows, not hands."' },
                        { name: 'Straight-Arm Pulldown', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Isolates lats with zero bicep involvement. Arc the bar from face-height to thighs.' },
                        { name: 'Chest-Supported Row', sets: '3×10-12', tempo: '2-0-1-2', cues: 'Eliminates momentum. Squeeze shoulder blades together at the top. 2 sec hold.' }
                    ], timeline: '6-8 weeks for mind-muscle connection; 12-16 weeks for visible V-taper.', markers: 'Pulldown/row weight increases 15%+, visible lat spread in relaxed pose.' },
                    shoulders: { muscle: 'Shoulders', exercises: [
                        { name: 'Face Pulls', sets: '4×15-20', tempo: '2-0-1-2', cues: 'Pull to forehead height, externally rotate so thumbs point behind you. Elbows high.' },
                        { name: 'Cable Lateral Raise', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Constant tension from the cable. Lead with elbows, not hands. Slight lean away.' },
                        { name: 'Prone Incline Rear Delt Fly', sets: '3×15-20', tempo: '2-0-1-2', cues: 'Lie chest-down on 30° incline. Light dumbbells, lead with pinkies, hold the squeeze.' }
                    ], timeline: '4-6 weeks for visible rounding; 10-12 weeks for structural change.', markers: 'Shoulder "cap" visible from front, face pull weight increases 20%+.' },
                    legs: { muscle: 'Legs', exercises: [
                        { name: 'Romanian Deadlift', sets: '4×8-10', tempo: '3-1-1-0', cues: 'Push hips BACK. Bar glides down thighs. Stop at deep hamstring stretch. Squeeze glutes to return.' },
                        { name: 'Bulgarian Split Squat', sets: '3×10-12 per leg', tempo: '3-0-1-0', cues: 'Lean torso slightly forward to bias glutes. 3-second eccentric. Deep stretch at bottom.' },
                        { name: 'Leg Curl (seated or lying)', sets: '4×10-12', tempo: '2-0-1-2', cues: 'Squeeze at full contraction for 2 seconds. Control the eccentric — no dropping.' }
                    ], timeline: '6-8 weeks for strength gains; 12 weeks for visible development.', markers: 'RDL weight increases 15%+, visible hamstring/quad separation.' },
                    biceps: { muscle: 'Biceps', exercises: [
                        { name: 'Incline Dumbbell Curl', sets: '3×10-12', tempo: '2-0-1-2', cues: 'Set bench to 45°. Arms hang straight down. Curl without swinging — targets long head for peak.' },
                        { name: 'Hammer Curls', sets: '3×10-12', tempo: '2-0-1-1', cues: 'Builds brachialis and forearm thickness. Neutral grip, no swinging.' },
                        { name: 'Cable Curl (low pulley)', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Constant tension. Squeeze hard at top. Keep elbows pinned.' }
                    ], timeline: '6-8 weeks for arm fullness; 12 weeks for measurable size.', markers: 'Arm circumference +0.25-0.5 inches, visible peak when flexed.' },
                    triceps: { muscle: 'Triceps', exercises: [
                        { name: 'Overhead Cable Tricep Extension', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Stretch hard at the bottom, squeeze at lockout. Elbows stay pointed forward.' },
                        { name: 'Close-Grip Bench Press', sets: '3×8-10', tempo: '3-0-1-0', cues: 'Hands shoulder-width. Tuck elbows. Builds tricep mass and pressing power.' },
                        { name: 'Tricep Dips (weighted)', sets: '3×8-12', tempo: '2-0-1-0', cues: 'Lean slightly forward for chest, stay upright for tricep focus. Full lockout at top.' }
                    ], timeline: '6-8 weeks for visible horseshoe; 12 weeks for measurable size.', markers: 'Tricep horseshoe visible from the side, close-grip bench increases 10%+.' },
                    core: { muscle: 'Core', exercises: [
                        { name: 'Hanging Leg Raise', sets: '3×10-15', tempo: '2-0-1-1', cues: 'Curl pelvis up, don\'t just swing legs. Control the descent. Progress to straight legs.' },
                        { name: 'Cable Crunch', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Crunch ribs toward hips, not just hinge at the hip. Squeeze at the bottom.' },
                        { name: 'Pallof Press', sets: '3×10-12 per side', tempo: '2-2-2-0', cues: 'Anti-rotation — resist the cable pulling you. Press out, hold 2 sec, return. Builds real core stability.' }
                    ], timeline: '4-6 weeks for strength; 8-12 weeks with low body fat for visibility.', markers: 'Plank hold time increases, improved brace on compound lifts, reduced lower back fatigue.' }
                };

                // --- Stagnation corrective database by lift type ---
                const stagnationDB = {
                    press: { lift: 'Pressing Movements (Bench/OHP)', cause: 'Weak pecs at full stretch, tricep lockout weakness, or loss of upper back tightness.', exercises: [
                        { name: 'Spoto Press / Pause Press', sets: '4×4-6 @ 70-80%', tempo: '3-2-1-0', cues: 'Lower to 1 inch above chest, hold 2 seconds. Builds strength at the sticking point.' },
                        { name: 'Close-Grip Bench Press', sets: '3×6-8', tempo: '3-0-1-0', cues: 'Overloads triceps for lockout strength. Hands shoulder-width.' },
                        { name: 'Pin Press (at sticking point)', sets: '3×3-5', tempo: '1-1-1-0', cues: 'Set pins at your sticking point. Dead-stop press eliminates momentum.' }
                    ], timeline: '4-6 weeks for improved bar speed through sticking point; 8-12 weeks for PR.', markers: 'Pause press reaches 85%+ of competition lift, bar speed at sticking point improves visibly.' },
                    squat: { lift: 'Squat', cause: 'Quad weakness at depth, poor bracing, or hip/ankle mobility limitations.', exercises: [
                        { name: 'Pause Squat (3-sec pause)', sets: '4×4-6 @ 65-75%', tempo: '3-3-1-0', cues: 'Hold motionless at the bottom for 3 seconds while maintaining brace. No bounce on the way up.' },
                        { name: 'Front Squat', sets: '3×6-8', tempo: '3-0-1-0', cues: 'Forces upright torso and quad dominance. Fixes forward collapse.' },
                        { name: 'Goblet Squat to Box', sets: '3×10-12', tempo: '3-1-1-0', cues: 'Sit back to box, pause, drive up. Teaches you to own the bottom position.' }
                    ], timeline: '4-6 weeks for confidence in the hole; 8-12 weeks for measurable strength gains.', markers: 'Pause squat reaches 80%+ of back squat, no forward lean at the bottom.' },
                    deadlift: { lift: 'Deadlift', cause: 'Weak glutes/upper back, or hips shooting up too fast leaving the back to finish the lift.', exercises: [
                        { name: 'Block/Rack Pulls (knee height)', sets: '4×3-5 (heavy)', tempo: '1-0-1-0', cues: 'Overloads the lockout. Go 10-20% heavier than full deadlift. Brace hard.' },
                        { name: 'Deficit Deadlift', sets: '3×4-6 @ 70-80%', tempo: '2-0-1-0', cues: 'Stand on 1-2 inch platform. Forces better positioning off the floor.' },
                        { name: 'Barbell Hip Thrust (heavy)', sets: '3×6-8', tempo: '2-0-1-2', cues: 'Builds lockout-specific glute power. Squeeze HARD at top for 2 seconds.' }
                    ], timeline: '4-6 weeks for smoother lockout; 8-12 weeks for hitch elimination.', markers: 'Rack pull exceeds deadlift by 15%+, no visible hitch on heavy singles.' },
                    row: { lift: 'Rowing / Pull Movements', cause: 'Weak mid-back, bicep fatigue limiting volume, or poor scapular control.', exercises: [
                        { name: 'Chest-Supported Row', sets: '4×8-10', tempo: '2-0-1-2', cues: 'Removes momentum. Focus purely on squeezing shoulder blades. 2 sec hold at top.' },
                        { name: 'Straight-Arm Pulldown', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Isolates lats without bicep fatigue. Great for building the mind-muscle connection.' },
                        { name: 'Face Pulls', sets: '3×15-20', tempo: '2-0-1-2', cues: 'Builds rear delts and mid-traps. Externally rotate at the end of each rep.' }
                    ], timeline: '4-6 weeks for improved mind-muscle connection; 8-12 weeks for weight increases.', markers: 'Row weight increases 10-15%, improved upper back tightness on compounds.' },
                    curl: { lift: 'Curl Movements', cause: 'Momentum compensation, insufficient time under tension, or relying on compounds for bicep growth.', exercises: [
                        { name: 'Incline Dumbbell Curl', sets: '3×10-12', tempo: '2-0-1-3', cues: 'Set bench to 45°. 3-second eccentric. No swinging — the incline prevents cheating.' },
                        { name: 'Preacher Curl', sets: '3×10-12', tempo: '2-0-1-2', cues: 'Eliminates momentum completely. Squeeze hard at the top.' },
                        { name: 'Cable Curl (constant tension)', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Cables keep tension throughout the whole range. Slow and controlled.' }
                    ], timeline: '4-6 weeks for improved strength; 8-12 weeks for visible growth.', markers: 'Curl weight increases 15%+, visible bicep peak when flexed.' }
                };

                // Helper: classify an exercise name into a lift category for stagnation fixes
                function getLiftCategory(exerciseName) {
                    const n = exerciseName.toLowerCase();
                    if (n.includes('bench') || n.includes('overhead') || n.includes('ohp') || n.includes('incline press') || n.includes('shoulder press') || n.includes('dumbbell press') || n.includes('machine press') || n.includes('chest press')) return 'press';
                    if (n.includes('squat') || n.includes('leg press') || n.includes('hack')) return 'squat';
                    if (n.includes('deadlift') || n.includes('rdl') || n.includes('romanian')) return 'deadlift';
                    if (n.includes('row') || n.includes('pull-up') || n.includes('pullup') || n.includes('chin-up') || n.includes('pulldown') || n.includes('lat pull')) return 'row';
                    if (n.includes('curl')) return 'curl';
                    return null;
                }

                // =============================================
                // AUTO-DETECT weak points from user's data
                // =============================================
                let html = `<h3>Weak Point Analysis</h3>`;
                html += `<p style="opacity:0.8;font-style:italic;">Auto-detected from your logged workouts and training history.</p>`;

                const totalWorkouts = ctx.workouts.length;
                if (totalWorkouts === 0) {
                    html += `<p>You haven't logged any workouts yet, so I can't auto-detect your weak points. Start logging your exercises and come back — I'll analyze your data to find:</p><ul>`;
                    html += `<li><strong>Neglected muscle groups</strong> that aren't getting enough volume</li>`;
                    html += `<li><strong>Stalled lifts</strong> where your weight hasn't increased in 4+ sessions</li>`;
                    html += `<li><strong>Volume imbalances</strong> between push/pull, upper/lower, etc.</li>`;
                    html += `</ul>`;
                    html += `<p>Log at least 2-3 weeks of training for the best analysis.</p>`;
                    html += verseHtml();
                    return html;
                }

                let priority = 1;
                const findings = { neglected: [], undertrained: [], stagnating: [], imbalanced: [] };

                // --- 1. NEGLECTED muscle groups (zero sets in last 30 days) ---
                const monthMuscleVolume = {};
                Object.keys(ctx.muscleMap).forEach(group => { monthMuscleVolume[group] = 0; });
                ctx.monthWorkouts.forEach(w => {
                    for (const [group, exercises] of Object.entries(ctx.muscleMap)) {
                        if (exercises.some(e => w.name.toLowerCase() === e.toLowerCase())) {
                            monthMuscleVolume[group] += w.sets.length;
                        }
                    }
                });

                const sortedVolume = Object.entries(monthMuscleVolume).sort((a, b) => a[1] - b[1]);
                const totalSets = sortedVolume.reduce((sum, [, v]) => sum + v, 0);
                const avgSetsPerGroup = totalSets / sortedVolume.length;

                sortedVolume.forEach(([group, sets]) => {
                    if (sets === 0) {
                        findings.neglected.push(group);
                    } else if (sets < avgSetsPerGroup * 0.4) {
                        findings.undertrained.push({ group, sets, avg: Math.round(avgSetsPerGroup) });
                    }
                });

                // --- 2. STAGNATING lifts (weight hasn't increased in 4+ sessions) ---
                const stagnatingLifts = [];
                ctx.stagnant.forEach(name => {
                    const category = getLiftCategory(name);
                    stagnatingLifts.push({ name, category });
                });

                // --- 3. PUSH/PULL and UPPER/LOWER imbalance detection ---
                const pushVolume = (monthMuscleVolume.chest || 0) + (monthMuscleVolume.shoulders || 0) + (monthMuscleVolume.triceps || 0);
                const pullVolume = (monthMuscleVolume.back || 0) + (monthMuscleVolume.biceps || 0);
                const upperVolume = pushVolume + pullVolume;
                const lowerVolume = (monthMuscleVolume.legs || 0);
                const pushPullRatio = pullVolume > 0 ? (pushVolume / pullVolume) : 0;
                const upperLowerRatio = lowerVolume > 0 ? (upperVolume / lowerVolume) : 0;

                if (pushPullRatio > 1.8 && pushVolume > 0 && pullVolume > 0) {
                    findings.imbalanced.push({ type: 'Push vs Pull', detail: `Your push volume (${pushVolume} sets) is ${pushPullRatio.toFixed(1)}× your pull volume (${pullVolume} sets). This can lead to rounded shoulders and shoulder injuries. Aim for a 1:1 to 1:1.5 push-to-pull ratio.` });
                } else if (pushPullRatio < 0.55 && pushVolume > 0 && pullVolume > 0) {
                    findings.imbalanced.push({ type: 'Pull vs Push', detail: `Your pull volume (${pullVolume} sets) far exceeds your push volume (${pushVolume} sets). Add more pressing work for balanced development.` });
                }
                if (upperLowerRatio > 2.5 && upperVolume > 0 && lowerVolume > 0) {
                    findings.imbalanced.push({ type: 'Upper vs Lower', detail: `Your upper body volume (${upperVolume} sets) is ${upperLowerRatio.toFixed(1)}× your lower body volume (${lowerVolume} sets). Don't skip leg day — lower body training drives total-body growth and hormonal response.` });
                } else if (upperLowerRatio < 0.8 && upperVolume > 0 && lowerVolume > 0) {
                    findings.imbalanced.push({ type: 'Lower vs Upper', detail: `Your lower body volume (${lowerVolume} sets) significantly exceeds upper body (${upperVolume} sets). Add more upper body pressing and pulling for balanced development.` });
                }

                // --- BUILD THE REPORT ---
                const hasFindings = findings.neglected.length > 0 || findings.undertrained.length > 0 || stagnatingLifts.length > 0 || findings.imbalanced.length > 0;

                if (!hasFindings) {
                    html += insightHtml(`Looking good — no major weak points detected in your training data. Your volume is balanced across muscle groups and none of your lifts are stagnating.`);
                    html += `<p>Keep training consistently. Come back and check again in a few weeks, or if you feel something is lagging.</p>`;
                    html += verseHtml({ text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" });
                    return html;
                }

                // Monthly volume overview
                html += `<h3>Your 30-Day Volume Breakdown</h3>`;
                html += `<table class="plan-table"><tr><th>Muscle Group</th><th>Total Sets</th><th>Status</th></tr>`;
                sortedVolume.forEach(([group, sets]) => {
                    const name = group.charAt(0).toUpperCase() + group.slice(1);
                    let status = '&#x2705; On Track';
                    if (sets === 0) status = '&#x1F534; Neglected';
                    else if (sets < avgSetsPerGroup * 0.4) status = '&#x1F7E1; Undertrained';
                    html += `<tr><td>${name}</td><td>${sets}</td><td>${status}</td></tr>`;
                });
                html += `</table>`;

                // NEGLECTED muscle groups
                if (findings.neglected.length > 0) {
                    html += `<h3>Priority #${priority}: Neglected Muscle Groups</h3>`;
                    html += insightHtml(`These muscles have <strong>ZERO</strong> sets logged in the past 30 days. This is your biggest opportunity for improvement.`);
                    findings.neglected.forEach(group => {
                        const fix = correctiveDB[group];
                        if (!fix) return;
                        html += `<div style="background:var(--card);padding:1rem;border-radius:8px;margin:0.75rem 0;">`;
                        html += `<h3>${fix.muscle}</h3>`;
                        html += `<p><strong>Root Cause:</strong> This group is completely absent from your program — likely a programming gap, not a conscious choice.</p>`;
                        html += `<table class="plan-table"><tr><th>Exercise</th><th>Sets × Reps</th><th>Tempo</th><th>Coaching Cues</th></tr>`;
                        fix.exercises.forEach(ex => {
                            html += `<tr><td>${ex.name}</td><td>${ex.sets}</td><td>${ex.tempo}</td><td>${ex.cues}</td></tr>`;
                        });
                        html += `</table>`;
                        html += `<p><strong>Timeline:</strong> ${fix.timeline}</p>`;
                        html += `<p><strong>Measurable Markers:</strong> ${fix.markers}</p>`;
                        html += `</div>`;
                    });
                    priority++;
                }

                // UNDERTRAINED muscle groups
                if (findings.undertrained.length > 0) {
                    html += `<h3>Priority #${priority}: Undertrained Muscle Groups</h3>`;
                    html += insightHtml(`These muscles are getting some work but significantly less than your other groups (avg: ${Math.round(avgSetsPerGroup)} sets/month).`);
                    findings.undertrained.forEach(({ group, sets, avg }) => {
                        const fix = correctiveDB[group];
                        if (!fix) return;
                        const name = group.charAt(0).toUpperCase() + group.slice(1);
                        html += `<div style="background:var(--card);padding:1rem;border-radius:8px;margin:0.75rem 0;">`;
                        html += `<h3>${fix.muscle} — ${sets} sets vs ${avg} avg</h3>`;
                        html += `<p><strong>Root Cause:</strong> Volume imbalance — ${name} is getting less than half the attention of your other muscle groups. This will show up as a visual weak point over time.</p>`;
                        html += `<p><strong>Quick Fix:</strong> Add ${Math.max(2, Math.round((avg - sets) / 4))} more sets of ${name} work per week. Here are the best exercises to add:</p>`;
                        html += `<table class="plan-table"><tr><th>Exercise</th><th>Sets × Reps</th><th>Tempo</th><th>Coaching Cues</th></tr>`;
                        fix.exercises.slice(0, 2).forEach(ex => {
                            html += `<tr><td>${ex.name}</td><td>${ex.sets}</td><td>${ex.tempo}</td><td>${ex.cues}</td></tr>`;
                        });
                        html += `</table>`;
                        html += `</div>`;
                    });
                    priority++;
                }

                // STAGNATING lifts
                if (stagnatingLifts.length > 0) {
                    html += `<h3>Priority #${priority}: Stalled Lifts</h3>`;
                    html += insightHtml(`These exercises haven't increased in weight over your last 4+ sessions — you've hit a plateau.`);
                    const processedCategories = new Set();
                    stagnatingLifts.forEach(({ name, category }) => {
                        html += `<div style="background:var(--card);padding:1rem;border-radius:8px;margin:0.75rem 0;">`;
                        html += `<h3>${name} — Stalled</h3>`;
                        const maxWeight = ctx.exercisePRs[name] || 0;
                        const unit = ctx.profile.unit === 'metric' ? 'kg' : 'lbs';
                        if (maxWeight > 0) {
                            html += `<p>Current best: <strong>${maxWeight} ${unit}</strong> (unchanged for 4+ sessions)</p>`;
                        }
                        if (category && stagnationDB[category] && !processedCategories.has(category)) {
                            processedCategories.add(category);
                            const fix = stagnationDB[category];
                            html += `<p><strong>Root Cause:</strong> ${fix.cause}</p>`;
                            html += `<table class="plan-table"><tr><th>Exercise</th><th>Sets × Reps</th><th>Tempo</th><th>Coaching Cues</th></tr>`;
                            fix.exercises.forEach(ex => {
                                html += `<tr><td>${ex.name}</td><td>${ex.sets}</td><td>${ex.tempo}</td><td>${ex.cues}</td></tr>`;
                            });
                            html += `</table>`;
                            html += `<p><strong>Timeline:</strong> ${fix.timeline}</p>`;
                            html += `<p><strong>Measurable Markers:</strong> ${fix.markers}</p>`;
                        } else if (!category) {
                            html += `<p><strong>General Fix:</strong> Drop weight by 10%, increase reps to 10-12, build back up over 3-4 weeks. Or try a close variation of this exercise.</p>`;
                        }
                        html += `</div>`;
                    });
                    priority++;
                }

                // VOLUME IMBALANCES
                if (findings.imbalanced.length > 0) {
                    html += `<h3>Priority #${priority}: Volume Imbalances</h3>`;
                    findings.imbalanced.forEach(({ type, detail }) => {
                        html += `<div style="background:var(--card);padding:1rem;border-radius:8px;margin:0.75rem 0;">`;
                        html += `<h3>${type} Imbalance</h3>`;
                        html += `<p>${detail}</p>`;
                        html += `</div>`;
                    });
                    priority++;
                }

                // Integration advice
                html += `<h3>Your Action Plan — Start This Week</h3><ul>`;
                html += `<li><strong>Add, don't replace:</strong> Slot corrective exercises at the END of the relevant training day.</li>`;
                html += `<li><strong>2-3 exercises per weak point, 2× per week:</strong> Frequency beats volume. Spread the work across the week.</li>`;
                html += `<li><strong>Fatigue management:</strong> Keep corrective work at RPE 7-8 (2-3 reps in reserve). These are builders, not grinders.</li>`;
                html += `<li><strong>Track everything:</strong> Log these corrective exercises here in Iron Faith so you can see progression over time.</li>`;
                html += `<li><strong>Reassess in 8 weeks:</strong> Come back to this analysis and compare. Take progress photos now so you have a baseline.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" });
                return html;
            },
        },
        {
            id: 'get_stronger',
            keywords: ['stronger', 'get strong', 'build strength', 'increase strength', 'strength training', 'strength program', 'powerlifting', 'power lifting', 'how.*strong', 'gain strength', 'more strength', 'strength gains', 'raw strength', 'absolute strength'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>How to Actually Get Stronger</h3>`;

                // Personalized hook based on current data
                if (ctx.workouts.length === 0) {
                    html += insightHtml(`I don't see any logged workouts yet. Start by logging your big lifts (squat, bench, deadlift, overhead press) for 2 weeks so I can track real progression for you.`);
                } else {
                    // Find the user's strongest big lift
                    const bigLifts = ['Bench Press','Squat','Deadlift','Overhead Press','Barbell Row','Front Squat','Romanian Deadlift'];
                    let topLift = null;
                    bigLifts.forEach(name => {
                        const sets = ctx.workouts.filter(w => w.name === name).flatMap(w => w.sets);
                        if (sets.length === 0) return;
                        const best = sets.reduce((b, s) => (s.weight > (b ? b.weight : 0) ? s : b), null);
                        if (best && (!topLift || best.weight > topLift.weight)) {
                            topLift = { name, weight: best.weight, reps: best.reps };
                        }
                    });
                    if (topLift) {
                        // Brzycki 1RM estimate
                        const e1rm = Math.round(topLift.weight * (36 / (37 - Math.min(topLift.reps, 10))));
                        html += insightHtml(`Your top recorded lift is <strong>${escapeHtml(topLift.name)}</strong> at ${lbsToDisplay(topLift.weight)}${unit} \u00d7 ${topLift.reps} (\u2248 ${lbsToDisplay(e1rm)}${unit} 1RM). The plan below is built around pushing that number up.`);
                    }
                }

                html += `<h3>The 4 Rules of Getting Stronger</h3><ol>`;
                html += `<li><strong>Progressive overload, every session.</strong> Add 2.5\u20135${unit} or one rep to your top set every workout. Tiny jumps compound fast.</li>`;
                html += `<li><strong>Train in low reps for max strength.</strong> 3\u20135 reps per set on your main lifts. Higher reps build size; low reps build raw force.</li>`;
                html += `<li><strong>Rest LONG between heavy sets.</strong> 3\u20135 minutes. Cutting rest sabotages strength \u2014 your nervous system needs the recovery to lift heavy again.</li>`;
                html += `<li><strong>Focus on the big 5.</strong> Squat, bench, deadlift, overhead press, row. Everything else is accessory.</li>`;
                html += `</ol>`;

                html += `<h3>A Proven Weekly Layout</h3><ul>`;
                html += `<li><strong>Day 1 \u2014 Heavy lower:</strong> Squat 5\u00d75, RDL 4\u00d76, walking lunges 3\u00d710/leg</li>`;
                html += `<li><strong>Day 2 \u2014 Heavy upper:</strong> Bench 5\u00d75, barbell row 5\u00d75, overhead press 4\u00d76, chin-ups 3\u00d7max</li>`;
                html += `<li><strong>Day 3 \u2014 Pull/posterior:</strong> Deadlift 3\u00d73, pull-ups 4\u00d78, hip thrust 4\u00d78, face pulls 3\u00d715</li>`;
                html += `<li><strong>Day 4 \u2014 Volume upper:</strong> Incline bench 4\u00d78, dumbbell row 4\u00d78, lateral raises 4\u00d712, dips 3\u00d7max</li>`;
                html += `</ul>`;

                html += `<h3>The Loading Scheme that Works</h3><ul>`;
                html += `<li><strong>Top set:</strong> 1 set of 3\u20135 reps at the heaviest weight you can move with good form. This is the strength driver.</li>`;
                html += `<li><strong>Back-off sets:</strong> 3\u20134 sets at 85\u201390% of that weight for 5 reps. Builds work capacity.</li>`;
                html += `<li><strong>Add weight when you complete all reps with 1 rep in reserve.</strong> If the top set felt grindy, repeat the weight next session.</li>`;
                html += `</ul>`;

                html += `<h3>The Stuff That Wrecks Strength</h3><ul>`;
                html += `<li><strong>Skipping sleep</strong> \u2014 less than 7 hrs and your CNS is fried. Sleep is a strength supplement.</li>`;
                html += `<li><strong>Eating in a deficit</strong> \u2014 you can't get meaningfully stronger while losing weight aggressively. Eat at maintenance or slight surplus.</li>`;
                html += `<li><strong>Random programs</strong> \u2014 stick with one for at least 8\u201312 weeks. Program hopping = no progress.</li>`;
                html += `<li><strong>Form breakdown</strong> \u2014 a missed rep or rounded back deload week. Pull back to 90% and rebuild.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" });
                return html;
            },
        },
        {
            id: 'mobility',
            keywords: ['mobility', 'flexibility', 'flexible', 'tight hip', 'tight shoulder', 'tight ankle', 'stiff', 'range of motion', 'rom', 'stretching routine', 'limber', 'loosen up', 'mobility work'],
            handler: () => {
                let html = `<h3>Mobility That Actually Helps Lifts</h3>`;
                html += `<p>Ignore the influencer stretching circus. Lifters need <strong>specific</strong> mobility \u2014 the kind that unlocks better positions in the squat, bench, and overhead press.</p>`;

                html += `<h3>The 5-Minute Daily Routine</h3><ol>`;
                html += `<li><strong>90/90 hip switches</strong> \u2014 2 minutes. Fixes tight hips, opens squat depth.</li>`;
                html += `<li><strong>Couch stretch</strong> \u2014 60 sec each side. Lengthens hip flexors, fixes anterior pelvic tilt.</li>`;
                html += `<li><strong>Thoracic spine extensions over a foam roller</strong> \u2014 10 reps. Unlocks overhead pressing.</li>`;
                html += `<li><strong>Wall slides</strong> \u2014 10 reps. Restores shoulder mechanics.</li>`;
                html += `<li><strong>Ankle wall mobs</strong> \u2014 10 each side. Bigger ankle ROM = deeper squat.</li>`;
                html += `</ol>`;

                html += `<h3>Pre-Workout Mobility (lift-specific)</h3><ul>`;
                html += `<li><strong>Squat day:</strong> 90/90 hip switches + ankle mobs + bodyweight squats x10</li>`;
                html += `<li><strong>Bench day:</strong> band pull-aparts x20 + wall slides x10 + scap push-ups x10</li>`;
                html += `<li><strong>Deadlift day:</strong> cat-cow x10 + hip airplanes x5/leg + light RDLs x10</li>`;
                html += `<li><strong>Overhead day:</strong> thoracic extensions + wall slides + dead hang 30 sec</li>`;
                html += `</ul>`;

                html += `<h3>What NOT to Do</h3><ul>`;
                html += `<li><strong>Don't static stretch before lifting</strong> \u2014 reduces force output. Save it for after.</li>`;
                html += `<li><strong>Don't chase mobility you don't need.</strong> If your squat is fine, you don't need to do the splits.</li>`;
                html += `<li><strong>Don't expect overnight changes.</strong> Mobility is a 4-8 week project, not a one-session fix.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "It is God who arms me with strength and keeps my way secure. He makes my feet like the feet of a deer.", ref: "Psalm 18:32-33" });
                return html;
            },
        },
        {
            id: 'sleep',
            keywords: ['sleep', 'insomnia', 'can\'t sleep', 'sleep quality', 'sleep better', 'how much sleep', 'sleep tips', 'rest at night', 'sleeping'],
            handler: () => {
                let html = `<h3>Sleep: The Most Underrated Performance Lever</h3>`;
                html += insightHtml(`Lifters who sleep 5\u20136 hrs lose strength <strong>2x faster</strong> in cuts and gain muscle <strong>~30% slower</strong> in bulks. Sleep isn't optional.`);

                html += `<h3>Targets</h3><ul>`;
                html += `<li><strong>7\u20139 hours</strong> per night, every night.</li>`;
                html += `<li><strong>Same bedtime \u00b1 30 min</strong>, even on weekends.</li>`;
                html += `<li><strong>Cool, dark, quiet</strong> room. 65\u201368\u00b0F is ideal.</li>`;
                html += `</ul>`;

                html += `<h3>Things That Crush Your Sleep</h3><ul>`;
                html += `<li><strong>Caffeine after 2 PM</strong> \u2014 half-life is 6 hours. Your "I sleep fine on coffee" is a lie your body tells you.</li>`;
                html += `<li><strong>Late workouts</strong> \u2014 if you train past 8 PM, give yourself 90 min to wind down.</li>`;
                html += `<li><strong>Phone in bed</strong> \u2014 blue light + dopamine hits = trash sleep.</li>`;
                html += `<li><strong>Alcohol</strong> \u2014 puts you out fast, wrecks REM and deep sleep stages.</li>`;
                html += `</ul>`;

                html += `<h3>Things That Help</h3><ul>`;
                html += `<li><strong>Magnesium glycinate (300\u2013400 mg)</strong> 1 hr before bed.</li>`;
                html += `<li><strong>10-min wind-down ritual</strong> \u2014 dim lights, read, journal.</li>`;
                html += `<li><strong>Morning sunlight</strong> within 30 min of waking sets your circadian rhythm.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "In peace I will lie down and sleep, for you alone, LORD, make me dwell in safety.", ref: "Psalm 4:8" });
                return html;
            },
        },
        {
            id: 'hydration',
            keywords: ['hydrat', 'water intake', 'how much water', 'drink water', 'electrolyte', 'thirsty', 'dehydrat'],
            handler: (ctx) => {
                const lbs = ctx.currentWeight || 180;
                const oz = Math.round(lbs * 0.6);
                const liters = (oz * 0.0295735).toFixed(1);
                let html = `<h3>Hydration for Lifters</h3>`;
                html += insightHtml(`At your bodyweight, target roughly <strong>${oz} oz (${liters} L)</strong> of water per day, plus 16\u201320 oz extra for every hour of training.`);

                html += `<h3>The Rules</h3><ul>`;
                html += `<li><strong>Pee should be pale yellow.</strong> Clear = overhydrated. Dark = behind.</li>`;
                html += `<li><strong>Pre-workout:</strong> 16 oz, 30 min before lifting.</li>`;
                html += `<li><strong>During workout:</strong> sip 16\u201324 oz over the session.</li>`;
                html += `<li><strong>Post-workout:</strong> drink another 16 oz with electrolytes if you sweat heavily.</li>`;
                html += `</ul>`;

                html += `<h3>Why It Matters for Lifting</h3><ul>`;
                html += `<li><strong>2% dehydration</strong> drops strength output measurably. You'll feel weaker without knowing why.</li>`;
                html += `<li><strong>Cramps</strong> are usually electrolyte deficits (sodium + potassium), not just water.</li>`;
                html += `<li><strong>Joint comfort</strong> \u2014 hydrated cartilage = less crackly knees and shoulders.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "Whoever believes in me, as Scripture has said, rivers of living water will flow from within them.", ref: "John 7:38" });
                return html;
            },
        },
        {
            id: 'core_abs',
            keywords: ['ab workout', 'six pack', 'six.pack', 'abs', 'core training', 'how.*abs', 'flatter stomach', 'midsection', 'six-pack'],
            handler: () => {
                let html = `<h3>Building Visible Abs</h3>`;
                html += insightHtml(`Hard truth: abs are revealed by body fat %, not by how many crunches you do. You need <strong>~12% body fat (men)</strong> or <strong>~20% (women)</strong> for them to show.`);

                html += `<h3>The Two-Lever Approach</h3><ol>`;
                html += `<li><strong>Build the muscle</strong> \u2014 train abs 2\u20133x/week with weighted, progressive moves.</li>`;
                html += `<li><strong>Lower body fat</strong> \u2014 the kitchen, not the gym, is where your six-pack lives.</li>`;
                html += `</ol>`;

                html += `<h3>The Best Ab Exercises</h3><ul>`;
                html += `<li><strong>Hanging leg raises</strong> \u2014 the king. 3\u00d78\u201312.</li>`;
                html += `<li><strong>Cable crunches</strong> \u2014 weighted, progressive. 3\u00d710\u201315.</li>`;
                html += `<li><strong>Ab wheel rollouts</strong> \u2014 brutal, builds anti-extension strength. 3\u00d75\u201310.</li>`;
                html += `<li><strong>Pallof press</strong> \u2014 anti-rotation, fixes obliques. 3\u00d710/side.</li>`;
                html += `<li><strong>Plank variations</strong> \u2014 endurance, not size. 3\u00d745\u201360 sec.</li>`;
                html += `</ul>`;

                html += `<h3>Skip These</h3><ul>`;
                html += `<li><strong>1000 crunches a day</strong> \u2014 no carryover, hurts your back.</li>`;
                html += `<li><strong>"Spot reduction"</strong> \u2014 you can't burn belly fat by training abs. Doesn't work, never has.</li>`;
                html += `<li><strong>Sit-ups with arched back</strong> \u2014 wrecks your lumbar. Use crunches or leg raises instead.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'home_workout',
            keywords: ['no gym', 'home workout', 'no equipment', 'bodyweight', 'home gym', 'travel workout', 'hotel workout', 'workout at home', 'work out at home', 'no weights'],
            handler: () => {
                let html = `<h3>Train Hard With Zero Equipment</h3>`;
                html += `<p>You don't need a gym to get strong. You need progressive overload \u2014 and bodyweight work scales further than people think.</p>`;

                html += `<h3>The Full-Body Routine (30 min)</h3><ol>`;
                html += `<li><strong>Push-ups</strong> \u2014 4 sets, AMRAP. Progress: incline \u2192 standard \u2192 decline \u2192 archer \u2192 one-arm.</li>`;
                html += `<li><strong>Bulgarian split squats</strong> \u2014 4\u00d710/leg. Hold a backpack for load.</li>`;
                html += `<li><strong>Inverted rows (under a table)</strong> \u2014 4\u00d78\u201312. Or use a pull-up bar.</li>`;
                html += `<li><strong>Pike push-ups</strong> \u2014 3\u00d78. Builds shoulders without weights.</li>`;
                html += `<li><strong>Walking lunges</strong> \u2014 3\u00d720 steps.</li>`;
                html += `<li><strong>Hollow body holds</strong> \u2014 3\u00d730 sec. Crushes core.</li>`;
                html += `</ol>`;

                html += `<h3>Bodyweight Progression Tricks</h3><ul>`;
                html += `<li><strong>Tempo:</strong> slow the eccentric to 4 seconds. Suddenly push-ups feel brutal.</li>`;
                html += `<li><strong>Pause reps:</strong> 2-second pause at the bottom. Removes momentum.</li>`;
                html += `<li><strong>Unilateral progressions:</strong> two legs \u2192 one leg, two arms \u2192 archer \u2192 one arm.</li>`;
                html += `<li><strong>Density:</strong> same workout in less time = more intensity.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'fasting',
            keywords: ['intermittent fasting', 'fasting', '16:8', '16/8', 'omad', 'skip breakfast', 'fasted', 'fasted training', 'fasted cardio', 'eating window'],
            handler: () => {
                let html = `<h3>Intermittent Fasting + Lifting</h3>`;
                html += insightHtml(`IF is a calorie-control tool, not a magic fat-loss switch. It works because you eat less, not because of metabolic voodoo.`);

                html += `<h3>What it's good for</h3><ul>`;
                html += `<li><strong>Cutting:</strong> easier to hit a deficit when you skip a meal.</li>`;
                html += `<li><strong>Simplicity:</strong> fewer decisions about food.</li>`;
                html += `<li><strong>Digestive comfort:</strong> some people just feel better not eating early.</li>`;
                html += `</ul>`;

                html += `<h3>Where it gets you in trouble</h3><ul>`;
                html += `<li><strong>Bulking on IF is hard.</strong> Eating 3500+ calories in an 8-hour window is uncomfortable.</li>`;
                html += `<li><strong>Heavy strength training fasted</strong> usually feels worse than fed. Try eating 1\u20132 hrs pre-lift.</li>`;
                html += `<li><strong>Protein distribution suffers</strong> \u2014 you want 4\u20135 protein hits across the day; IF cuts you to 2\u20133.</li>`;
                html += `</ul>`;

                html += `<h3>If you want to try it</h3><ul>`;
                html += `<li>Start with <strong>14:10</strong> (skip breakfast, eat 10am\u20138pm). Easier than jumping straight to 16:8.</li>`;
                html += `<li>Time your eating window so you can <strong>eat post-workout</strong>.</li>`;
                html += `<li>Hit your protein. 0.8\u20131g per lb bodyweight, no exceptions.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'injury_prevention',
            keywords: ['avoid injury', 'prevent injury', 'lifting safe', 'safe lift', 'tweaked', 'tweak.*back', 'tweak.*knee', 'low.?back pain', 'shoulder pain', 'knee pain', 'elbow pain', 'wrist pain', 'lifting hurt'],
            handler: () => {
                let html = `<h3>Lift for the Long Game</h3>`;
                html += `<p>Your goal is <strong>40+ years of lifting</strong>, not crushing yourself this month. The strongest lifters are the ones still healthy in their 50s and 60s.</p>`;

                html += `<h3>The Non-Negotiables</h3><ul>`;
                html += `<li><strong>Warm up properly</strong> \u2014 2\u20133 ramping sets before your top weight, every time.</li>`;
                html += `<li><strong>Leave 1\u20132 reps in the tank</strong> on most working sets. Save the all-out grinders for once a week.</li>`;
                html += `<li><strong>Track form fatigue.</strong> If your bar speed drops or form breaks down, the set is over.</li>`;
                html += `<li><strong>Deload every 6\u20138 weeks</strong> \u2014 a full week at 60\u201370% intensity. Your joints will thank you.</li>`;
                html += `</ul>`;

                html += `<h3>If Something Hurts</h3><ol>`;
                html += `<li><strong>Sharp pain = stop.</strong> Dull soreness = train through, but lighter.</li>`;
                html += `<li><strong>Swap, don't skip.</strong> Sore back? Swap deadlift for hip thrust. Bad shoulder? Swap overhead press for landmine press.</li>`;
                html += `<li><strong>3+ days of pain = see a physio.</strong> Don't tough it out. Cheap injuries become chronic problems.</li>`;
                html += `<li><strong>Return at 50%.</strong> When you come back, start at half your pre-injury weight and rebuild over 3\u20134 weeks.</li>`;
                html += `</ol>`;

                html += `<h3>The Most Underrated Tip</h3>`;
                html += insightHtml(`<strong>Strengthen the weak link, don't just rest it.</strong> Sore knees? Build your VMO with split squats. Sore lower back? Build it with hyperextensions and RDLs. Rest alone rarely fixes anything.`);

                html += verseHtml({ text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" });
                return html;
            },
        },
        {
            id: 'greeting',
            keywords: ['hello', 'hi', 'hey', 'sup', 'what\'s up', 'good morning', 'good evening', 'howdy'],
            handler: (ctx) => {
                const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'there';
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

                let html = `<p>${greeting}, ${name}! I'm your Iron Faith Coach. Here's a quick snapshot:</p>`;

                html += `<ul>`;
                if (ctx.todayWorkouts.length > 0) {
                    html += `<li>You've logged ${ctx.todayWorkouts.length} exercises today. Nice work!</li>`;
                } else {
                    html += `<li>No workout logged today yet. Ready to train?</li>`;
                }
                if (ctx.todayMeals.length > 0) {
                    const todayCals = ctx.todayMeals.reduce((s,m) => s + m.calories, 0);
                    html += `<li>Nutrition: ${todayCals} calories logged today.</li>`;
                }
                html += `<li>Training days this week: ${ctx.weekDays}</li>`;
                html += `</ul>`;

                html += `<p>Ask me anything — workout plans, nutrition advice, form tips, progress analysis, or just some motivation!</p>`;
                html += verseHtml();
                return html;
            },
        },
    ],

    // Fallback for unrecognized input
    fallback: (ctx, input) => {
        const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'there';
        let html = `<p>Hey ${name}, I'm not sure I understood that, but I'm here to help! Here's what I can do:</p>`;
        html += `<ul>`;
        html += `<li><strong>"Generate a workout plan"</strong> — personalized training split based on your goals</li>`;
        html += `<li><strong>"Create a meal plan"</strong> — daily nutrition plan tailored to your targets</li>`;
        html += `<li><strong>"Analyze my progress"</strong> — detailed report on your training and weight trends</li>`;
        html += `<li><strong>"What should I work on next?"</strong> — finds your weak points this week</li>`;
        html += `<li><strong>"How do I squat / bench / deadlift?"</strong> — detailed form guides</li>`;
        html += `<li><strong>"Help me lose weight / build muscle"</strong> — goal-specific strategies</li>`;
        html += `<li><strong>"I've hit a plateau"</strong> — specific strategies to break through</li>`;
        html += `<li><strong>"I need motivation"</strong> — a kick in the pants with love</li>`;
        html += `<li><strong>"How is my nutrition?"</strong> — analysis of your logged meals</li>`;
        html += `<li><strong>"Recovery tips"</strong> — rest, sleep, deload guidance</li>`;
        html += `<li><strong>"What's my max?"</strong> — estimated 1RM from your lifts</li>`;
        html += `<li><strong>"Warm-up routine"</strong> — dynamic warm-up for your session</li>`;
        html += `<li><strong>"Supplements"</strong> — what actually works, what to skip</li>`;
        html += `<li><strong>"Weekly recap"</strong> — this week vs last week comparison</li>`;
        html += `<li><strong>"Rest periods"</strong> — how long to rest between sets</li>`;
        html += `<li><strong>"Alternative to bench"</strong> — exercise swap suggestions</li>`;
        html += `<li><strong>"When will I hit 225?"</strong> — progress timeline projections</li>`;
        html += `<li><strong>"My streak"</strong> — consistency and attendance tracking</li>`;
        html += `<li><strong>"Cardio guide"</strong> — HIIT vs LISS, what's right for you</li>`;
        html += `<li><strong>"Pre/post workout meal"</strong> — nutrient timing tips</li>`;
        html += `<li><strong>"What should I eat?"</strong> — smart food recs based on your remaining macros today</li>`;
        html += `<li><strong>"Weak point analysis"</strong> — identify and fix lagging muscles & lift sticking points</li>`;
        html += `</ul>`;
        html += verseHtml();
        return html;
    },
};

// --- Chat Interface ---
let coachInitialized = false;
const COACH_HISTORY_KEY = 'coachHistory';
const COACH_HISTORY_MAX = 80;
window._coachPlans = window._coachPlans || {};

function loadCoachHistoryEntries() {
    return DB.get(COACH_HISTORY_KEY, []);
}

function saveCoachHistoryEntry(entry) {
    const list = loadCoachHistoryEntries();
    list.push(entry);
    while (list.length > COACH_HISTORY_MAX) list.shift();
    DB.set(COACH_HISTORY_KEY, list);
}

function clearCoachChat() {
    confirmDialog('Clear all chat history with Coach?', { okText: 'Clear', danger: true }).then(ok => {
        if (!ok) return;
        DB.set(COACH_HISTORY_KEY, []);
        window._coachPlans = {};
        const container = document.getElementById('coach-messages');
        if (container) container.innerHTML = '';
        coachInitialized = false;
        initCoach();
        showToast('Chat cleared', 'success');
    });
}

function formatCoachTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const opts = { hour: 'numeric', minute: '2-digit' };
    if (sameDay) return d.toLocaleTimeString([], opts);
    const dayDiff = Math.floor((now - d) / 86400000);
    if (dayDiff < 7) return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], opts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function initCoach() {
    if (coachInitialized) return;
    coachInitialized = true;

    const history = loadCoachHistoryEntries();
    if (history.length > 0) {
        // Rehydrate previous conversation
        history.forEach(entry => {
            if (entry.role === 'bot') {
                renderBotMessage(entry.html, entry.time, false, entry.suggestions, entry.planId);
                if (entry.planId && entry.planRoutine) {
                    window._coachPlans[entry.planId] = entry.planRoutine;
                }
            } else if (entry.role === 'user') {
                renderUserMessage(entry.text, entry.time, entry.photo);
            }
        });
        const container = document.getElementById('coach-messages');
        if (container) container.scrollTop = container.scrollHeight;
        return;
    }

    const ctx = getCoachContext();
    const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    let welcome = `<p>${greeting}, ${name}! I'm your Iron Faith Coach.</p>`;
    welcome += `<p>I analyze your workouts, nutrition, and weight data to give you personalized advice. Ask me anything or tap a quick action above!</p>`;
    welcome += verseHtml();

    const starterChips = ['Generate a workout plan for me', 'How is my nutrition looking?', 'Analyze my progress'];
    addBotMessage(welcome, { suggestions: starterChips });
}

function renderBotMessage(html, time, animate, suggestions, planId) {
    const container = document.getElementById('coach-messages');
    if (!container) return;
    const wrap = document.createElement('div');
    wrap.className = 'coach-msg-wrap bot';

    const msg = document.createElement('div');
    msg.className = 'coach-msg bot' + (animate ? ' streaming' : '');
    msg.innerHTML = html;

    // Inject "Save as routine" button when a plan is attached
    if (planId && window._coachPlans[planId]) {
        const saveBar = document.createElement('div');
        saveBar.className = 'coach-plan-actions';
        saveBar.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="saveCoachPlanToRoutines('${planId}')">&#x2B; Save as routine</button>`;
        msg.appendChild(saveBar);
    }

    // Stagger-reveal children for streaming feel
    if (animate) {
        Array.from(msg.children).forEach((child, i) => {
            child.style.animationDelay = (i * 90) + 'ms';
            child.classList.add('stream-in');
        });
    }

    wrap.appendChild(msg);

    const meta = document.createElement('div');
    meta.className = 'coach-msg-time';
    meta.textContent = formatCoachTime(time);
    wrap.appendChild(meta);

    if (suggestions && suggestions.length) {
        const chips = document.createElement('div');
        chips.className = 'coach-suggestions';
        suggestions.forEach(s => {
            const b = document.createElement('button');
            b.className = 'coach-chip';
            b.textContent = s;
            b.onclick = () => coachAsk(s);
            chips.appendChild(b);
        });
        wrap.appendChild(chips);
    }

    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

function renderUserMessage(text, time, photoData) {
    const container = document.getElementById('coach-messages');
    if (!container) return;
    const wrap = document.createElement('div');
    wrap.className = 'coach-msg-wrap user';

    const msg = document.createElement('div');
    msg.className = 'coach-msg user';
    if (photoData) {
        const img = document.createElement('img');
        img.className = 'chat-photo';
        img.src = photoData;
        img.onclick = function() { openLightbox(this.src); };
        msg.appendChild(img);
        if (text) {
            const t = document.createElement('div');
            t.textContent = text;
            msg.appendChild(t);
        }
    } else {
        msg.textContent = text;
    }
    wrap.appendChild(msg);

    const meta = document.createElement('div');
    meta.className = 'coach-msg-time';
    meta.textContent = formatCoachTime(time);
    wrap.appendChild(meta);

    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

function addBotMessage(html, opts) {
    opts = opts || {};
    const time = Date.now();
    const suggestions = opts.suggestions || null;
    const planId = opts.planId || null;
    renderBotMessage(html, time, true, suggestions, planId);
    const entry = { role: 'bot', html, time, suggestions };
    if (planId) {
        entry.planId = planId;
        entry.planRoutine = window._coachPlans[planId] || null;
    }
    saveCoachHistoryEntry(entry);
}

function addUserMessage(text) {
    const time = Date.now();
    renderUserMessage(text, time, null);
    saveCoachHistoryEntry({ role: 'user', text, time });
}

// Pick 2-3 follow-up suggestions based on topic + context
function suggestFollowUps(text, ctx) {
    const lower = (text || '').toLowerCase();
    if (/workout plan|routine|program|split/.test(lower)) {
        return ['How long should I rest between sets?', 'Warm-up routine', 'How is my consistency?'];
    }
    if (/meal plan|what.*eat|food/.test(lower)) {
        return ['How is my nutrition looking?', 'Pre/post workout meal', 'What is my protein target?'];
    }
    if (/progress|recap|how am i doing|analyze/.test(lower)) {
        return ['Weak point analysis', 'What should I work on next?', 'How is my consistency?'];
    }
    if (/plateau|stuck|stall/.test(lower)) {
        return ['Weak point analysis', 'How is my recovery?', 'Cardio guide'];
    }
    if (/1rm|max|estimated/.test(lower)) {
        return ['Weak point analysis', 'How can I get stronger?', 'Generate a workout plan for me'];
    }
    if (/streak|consistency/.test(lower)) {
        return ['What should I work on next?', 'Analyze my progress', 'Weekly recap'];
    }
    if (/warm.?up/.test(lower)) {
        return ['Generate a workout plan for me', 'How can I improve mobility?', 'Cardio guide'];
    }
    if (/weak point|lagging/.test(lower)) {
        return ['Generate a workout plan for me', 'How can I get stronger?', 'Analyze my progress'];
    }
    return ['Analyze my progress', 'Generate a workout plan for me', 'How is my nutrition looking?'];
}

// Convert a coach-generated plan into a saveable routine
function saveCoachPlanToRoutines(planId) {
    const routine = window._coachPlans && window._coachPlans[planId];
    if (!routine) return showToast('Plan no longer available', 'warn');
    const my = (typeof getMyRoutines === 'function') ? getMyRoutines() : DB.get('myRoutines', []);
    if (my.some(r => r.id === routine.id)) return showToast('Already saved', 'info');
    my.push(JSON.parse(JSON.stringify(routine)));
    if (typeof setMyRoutines === 'function') setMyRoutines(my);
    else DB.set('myRoutines', my);
    showToast('Saved to My Routines', 'success');
    if (typeof haptic === 'function') haptic(20);
}

// Build a routine object from the structured plan used by generateWorkoutPlan
function buildRoutineFromCoachPlan(plan, level, goal) {
    const id = 'coach_' + Date.now();
    const days = plan.split.map(d => {
        const exercises = d.exercises.map(ex => {
            // sets like "3x8", "4x5", "3x10/leg", "3x30s"
            const m = String(ex.sets).match(/^(\d+)\s*x\s*([\w\/-]+)/i);
            const setCount = m ? parseInt(m[1], 10) : 3;
            const repStr = m ? m[2] : '8-10';
            return { name: ex.name, sets: setCount, reps: repStr, rest: 90, note: ex.note || '' };
        });
        return { name: d.day, dayType: (d.focus || '').toLowerCase().includes('lower') ? 'legs' : 'mixed', exercises };
    });
    return {
        id,
        name: plan.title,
        type: 'Coach',
        level: level || 'intermediate',
        category: 'gym',
        description: 'Auto-generated by your Iron Faith Coach.',
        days,
    };
}

function showTyping() {
    const container = document.getElementById('coach-messages');
    const typing = document.createElement('div');
    typing.className = 'coach-msg bot';
    typing.id = 'typing-indicator';
    typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
}

function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

function coachAsk(text) {
    document.getElementById('coach-input').value = '';
    processCoachInput(text);
}

// --- Voice input (Web Speech API) ---
let _coachRecognition = null;
let _coachRecognizing = false;
function toggleCoachVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        showToast('Voice input not supported on this device');
        return;
    }
    const btn = document.getElementById('coach-mic-btn');
    if (_coachRecognizing && _coachRecognition) {
        try { _coachRecognition.stop(); } catch (e) {}
        return;
    }
    try {
        _coachRecognition = new SR();
        _coachRecognition.lang = 'en-US';
        _coachRecognition.interimResults = true;
        _coachRecognition.maxAlternatives = 1;
        _coachRecognition.continuous = false;

        _coachRecognition.onstart = () => {
            _coachRecognizing = true;
            if (btn) btn.classList.add('listening');
            showToast('Listening...');
        };
        _coachRecognition.onresult = (ev) => {
            let transcript = '';
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
                transcript += ev.results[i][0].transcript;
            }
            const input = document.getElementById('coach-input');
            if (input) input.value = transcript;
            if (ev.results[ev.results.length - 1].isFinal && transcript.trim()) {
                setTimeout(() => sendCoachMessage(), 200);
            }
        };
        _coachRecognition.onerror = (ev) => {
            console.error('Speech recognition error:', ev.error);
            if (ev.error === 'not-allowed') showToast('Microphone permission denied');
            else if (ev.error !== 'aborted') showToast('Voice error: ' + ev.error);
        };
        _coachRecognition.onend = () => {
            _coachRecognizing = false;
            if (btn) btn.classList.remove('listening');
        };
        _coachRecognition.start();
    } catch (e) {
        console.error('Voice init failed:', e);
        showToast('Voice input failed to start');
        _coachRecognizing = false;
        if (btn) btn.classList.remove('listening');
    }
}

function sendCoachMessage() {
    const input = document.getElementById('coach-input');
    const text = input.value.trim();
    const hasPhoto = !!pendingPhoto;

    if (!text && !hasPhoto) return;
    input.value = '';

    const photoData = pendingPhoto;
    if (hasPhoto) removeCoachPhoto();

    processCoachInput(text || 'Check out my photo', photoData);
}

function processCoachInput(text, photoData) {
    initCoach();
    DB.set('coachUsed', true);

    // Show user message with optional photo
    if (photoData) {
        addUserMessageWithPhoto(text, photoData);
    } else {
        addUserMessage(text);
    }

    showTyping();

    // If photo is attached, run pose detection (async)
    if (photoData) {
        // Update typing indicator to show we're analyzing
        const typingEl = document.getElementById('typing-indicator');
        if (typingEl) typingEl.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div> <span style="font-size:12px;color:var(--text-light);margin-left:4px">Analyzing your pose...</span>';

        const ctx = getCoachContext();
        analyzePoseFromPhoto(photoData, ctx, text).then(response => {
            removeTyping();
            addBotMessage(response, { suggestions: ['Weak point analysis', 'Generate a workout plan for me', 'Warm-up routine'] });
        }).catch(() => {
            removeTyping();
            addBotMessage(analyzePhoto(getCoachContext(), text));
        });
        return;
    }

    // Non-photo messages — brief delay for natural feel
    setTimeout(() => {
        removeTyping();
        const ctx = getCoachContext();

        // Reset plan capture before handler runs
        window._lastCoachPlanId = null;

        // Score every topic against the question and pick the best match.
        // This is much more forgiving than the old "first regex hit wins" loop.
        const best = scoreCoachIntent(text);
        let response = null;
        if (best && best.topic) {
            response = best.topic.handler(ctx, text);
        }

        if (!response) {
            response = TOPIC_RESPONSES.fallback(ctx, text);
        }

        const suggestions = suggestFollowUps(text, ctx);
        const planId = window._lastCoachPlanId || null;
        addBotMessage(response, { suggestions, planId });
        window._lastCoachPlanId = null;
    }, 400 + Math.random() * 600);
}

// ========== INTENT SCORING ==========
// Synonym groups: any token in a group counts as a hit for any other token in
// the same group. This lets the matcher catch paraphrases like "get jacked"
// → "build muscle", "loosen up" → "mobility", etc.
const COACH_SYNONYMS = [
    ['stronger','strength','strong','powerful','power','jacked','beast','force','strongman','powerlift','powerlifting'],
    ['build','gain','grow','increase','add','boost','more','bigger','growing','building','gaining'],
    ['muscle','muscles','mass','size','hypertrophy','swole','jacked','gains','bulk','bulking'],
    ['lose','cut','cutting','shred','lean','slim','drop','burn','trim'],
    ['fat','weight','pounds','lbs','belly','gut','flab','chub'],
    ['workout','training','program','routine','split','plan','session','lift','lifting'],
    ['food','eat','eating','meal','diet','nutrition','calories','macros','protein','carbs','carb','fats'],
    ['rest','recovery','recover','sleep','sore','soreness','tired','exhausted','overtraining','deload'],
    ['cardio','running','run','hiit','liss','treadmill','bike','cycling','endurance','stamina','conditioning'],
    ['form','technique','how to','proper','correct','cue','setup','position'],
    ['warm','warmup','warm-up','warm up','prime','prep'],
    ['mobility','flexibility','flexible','stretch','stretching','tight','stiff','loosen','limber','range'],
    ['progress','progression','improve','improving','better','gains','results','analyze','analysis','review','recap','report','summary','overview'],
    ['plateau','stuck','stalled','stall','frozen','flat'],
    ['motivation','motivated','tired','lazy','quit','giving up','discouraged','burnout','burned out','unmotivated'],
    ['weak','weakness','lagging','imbalance','underdeveloped','behind','asymmetry','asymmetric','weak point','weakpoint'],
    ['1rm','max','maximum','heaviest','top','best','pr','personal record','one rep'],
    ['hydrate','hydration','water','drink','thirsty','dehydrated','electrolyte'],
    ['streak','consistency','consistent','discipline','habits','attendance','show up'],
    ['supplement','supplements','creatine','whey','bcaa','preworkout','pre-workout','vitamin','vitamins'],
    ['plan','planning','schedule','week','weekly','this week'],
    ['ab','abs','core','six pack','six-pack','sixpack','midsection','stomach','tummy'],
    ['home','no gym','no equipment','bodyweight','travel','hotel','garage'],
    ['fasting','fasted','intermittent','16:8','omad','eating window','skip meals'],
    ['injury','hurt','pain','tweaked','tweak','sharp pain','sore back','sore knee','sore shoulder','prevent','safe'],
    ['shoulders','shoulder','delt','delts','overhead'],
    ['chest','pec','pecs','bench','pectoral'],
    ['back','lat','lats','row','rowing','pull','traps','trap'],
    ['legs','leg','quad','quads','squat','lunge','hamstring','hams','glute','glutes','calf','calves','butt'],
    ['biceps','bicep','curl','curls','arm','arms'],
    ['triceps','tricep','pushdown','dip','dips'],
];

const COACH_SYNONYM_INDEX = (() => {
    const map = {};
    COACH_SYNONYMS.forEach((group, idx) => {
        group.forEach(word => {
            if (!map[word]) map[word] = new Set();
            map[word].add(idx);
        });
    });
    return map;
})();

const COACH_STOPWORDS = new Set([
    'a','an','and','are','as','at','be','but','by','can','do','does','for','from','get',
    'have','how','i','if','in','is','it','its','just','me','my','no','not','of','on','or',
    'should','so','that','the','this','to','was','we','what','when','where','which','will',
    'with','you','your','yours','am','any','do','doing','done','please','tell','give','about',
    'really','some','more','some','need','want','help','best','good','better','want','wants',
    'good','great','tip','tips','way','ways'
]);

function tokenizeForCoach(text) {
    if (!text) return [];
    return String(text).toLowerCase()
        .replace(/[^a-z0-9\s\-:/]/g, ' ')
        .split(/\s+/)
        .filter(t => t && !COACH_STOPWORDS.has(t));
}

function expandTokensWithSynonyms(tokens) {
    const groupHits = new Set();
    const wordHits = new Set(tokens);
    tokens.forEach(t => {
        const groups = COACH_SYNONYM_INDEX[t];
        if (groups) groups.forEach(g => groupHits.add(g));
    });
    return { wordHits, groupHits };
}

function scoreCoachIntent(text) {
    if (!text || !TOPIC_RESPONSES || !TOPIC_RESPONSES.topics) return null;
    const lower = text.toLowerCase();
    const tokens = tokenizeForCoach(text);
    if (tokens.length === 0) return null;
    const { wordHits, groupHits } = expandTokensWithSynonyms(tokens);

    let bestTopic = null;
    let bestScore = 0;

    TOPIC_RESPONSES.topics.forEach(topic => {
        let score = 0;
        for (const kw of topic.keywords) {
            // Strong signal: full keyword/phrase appears literally
            try {
                if (new RegExp(kw, 'i').test(lower)) score += 5;
            } catch (e) { /* invalid regex — skip */ }
            // Token-level overlap
            const kwTokens = tokenizeForCoach(kw.replace(/[\\.*+?^${}()|[\]]/g, ' '));
            kwTokens.forEach(kt => {
                if (wordHits.has(kt)) score += 2;
                const groups = COACH_SYNONYM_INDEX[kt];
                if (groups) groups.forEach(g => { if (groupHits.has(g)) score += 1; });
            });
        }
        // Slight penalty for the greeting topic so it doesn't steal questions
        // that happen to contain "hi" inside another word.
        if (topic.id === 'greeting' && tokens.length > 2) score -= 4;
        if (score > bestScore) {
            bestScore = score;
            bestTopic = topic;
        }
    });

    // Threshold: at least one solid signal (literal match worth 5, or 3+ token overlaps)
    if (bestScore >= 3) return { topic: bestTopic, score: bestScore };
    return null;
}

function addUserMessageWithPhoto(text, photoData) {
    const time = Date.now();
    renderUserMessage(text, time, photoData);
    saveCoachHistoryEntry({ role: 'user', text, time, photo: photoData });
}
