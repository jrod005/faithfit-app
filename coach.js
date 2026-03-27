// =============================================
// Iron & Faith Smart Coach Engine
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
    return `<div class="verse-inline">"${v.text}" — <strong>${v.ref}</strong></div>`;
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
            keywords: ['1rm', 'one rep max', 'max.*bench', 'max.*squat', 'max.*deadlift', 'max.*press', 'how much can i', 'my max', 'estimated max', 'e1rm'],
            handler: (ctx, input) => {
                const unit = wu();
                let html = `<h3>Estimated 1RM</h3>`;
                if (ctx.workouts.length === 0) {
                    html += `<p>No workout data yet. Log some exercises and I'll calculate your estimated maxes!</p>`;
                    return html + verseHtml();
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
                        html += insightHtml(`<strong>${name}:</strong> ${lbsToDisplay(bestSet.weight)} ${unit} × ${bestSet.reps} reps → Est. 1RM: <strong>${lbsToDisplay(e1rm)} ${unit}</strong>`);
                    }
                });
                if (!found) html += `<p>No data for those exercises yet. Log some sets first!</p>`;
                else html += `<p style="font-size:13px;color:var(--text-secondary)">Calculated using the Epley formula. Test your actual 1RM with a spotter for accuracy.</p>`;
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
            id: 'greeting',
            keywords: ['hello', 'hi', 'hey', 'sup', 'what\'s up', 'good morning', 'good evening', 'howdy'],
            handler: (ctx) => {
                const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'there';
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

                let html = `<p>${greeting}, ${name}! I'm your Iron & Faith Coach. Here's a quick snapshot:</p>`;

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
        html += `</ul>`;
        html += verseHtml();
        return html;
    },
};

// --- Chat Interface ---
let coachInitialized = false;

function initCoach() {
    if (coachInitialized) return;
    coachInitialized = true;
    const ctx = getCoachContext();
    const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'there';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    let welcome = `<p>${greeting}, ${name}! I'm your Iron & Faith Coach.</p>`;
    welcome += `<p>I analyze your workouts, nutrition, and weight data to give you personalized advice. Ask me anything or tap a quick action above!</p>`;
    welcome += verseHtml();

    addBotMessage(welcome);
}

function addBotMessage(html) {
    const container = document.getElementById('coach-messages');
    const msg = document.createElement('div');
    msg.className = 'coach-msg bot';
    msg.innerHTML = html;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

function addUserMessage(text) {
    const container = document.getElementById('coach-messages');
    const msg = document.createElement('div');
    msg.className = 'coach-msg user';
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
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
            addBotMessage(response);
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
        const lower = text.toLowerCase();

        // Find matching topic
        let response = null;
        for (const topic of TOPIC_RESPONSES.topics) {
            for (const kw of topic.keywords) {
                const regex = new RegExp(kw, 'i');
                if (regex.test(lower)) {
                    response = topic.handler(ctx, text);
                    break;
                }
            }
            if (response) break;
        }

        if (!response) {
            response = TOPIC_RESPONSES.fallback(ctx, text);
        }

        addBotMessage(response);
    }, 400 + Math.random() * 600);
}

function addUserMessageWithPhoto(text, photoData) {
    const container = document.getElementById('coach-messages');
    const msg = document.createElement('div');
    msg.className = 'coach-msg user';
    msg.innerHTML = `<img class="chat-photo" src="${photoData}" onclick="openLightbox('${photoData.substring(0, 50)}')">` +
        (text ? `<div>${escapeHtml(text)}</div>` : '');
    // Fix lightbox for inline photos
    msg.querySelector('img').onclick = function() { openLightbox(this.src); };
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}
