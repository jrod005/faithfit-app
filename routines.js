// =============================================
// Iron Faith - Preset Routine Library
// =============================================

const IRON_FAITH_ROUTINES = [
    // ============ PUSH PULL LEGS ============
    {
        id: 'ppl_beginner_gym',
        name: 'PPL — Beginner',
        type: 'PPL',
        level: 'beginner',
        category: 'gym',
        description: '6-day Push/Pull/Legs split. Focus on form and progressive overload.',
        days: [
            { name: 'Push A', dayType: 'push', exercises: [
                { name: 'Bench Press', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Overhead Press', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Tricep Pushdown', sets: 3, reps: '10-12', rest: 60 },
            ]},
            { name: 'Pull A', dayType: 'pull', exercises: [
                { name: 'Deadlift', sets: 3, reps: '5-6', rest: 180 },
                { name: 'Pull-ups', sets: 3, reps: '6-10', rest: 120 },
                { name: 'Barbell Row', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Face Pulls', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Bicep Curls', sets: 3, reps: '10-12', rest: 60 },
            ]},
            { name: 'Legs A', dayType: 'legs', exercises: [
                { name: 'Squat', sets: 3, reps: '8-10', rest: 180 },
                { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Leg Press', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Leg Curl', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Calf Raises', sets: 4, reps: '12-15', rest: 60 },
            ]},
        ]
    },
    {
        id: 'ppl_intermediate_gym',
        name: 'PPL — Intermediate',
        type: 'PPL',
        level: 'intermediate',
        category: 'gym',
        description: '6-day high volume PPL with isolation accessories.',
        days: [
            { name: 'Push (Heavy)', dayType: 'push', exercises: [
                { name: 'Bench Press', sets: 4, reps: '5-6', rest: 180 },
                { name: 'Overhead Press', sets: 4, reps: '6-8', rest: 150 },
                { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Cable Fly', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Lateral Raises', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Skull Crushers', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest: 60 },
            ]},
            { name: 'Pull (Heavy)', dayType: 'pull', exercises: [
                { name: 'Deadlift', sets: 4, reps: '5', rest: 180 },
                { name: 'Pull-ups', sets: 4, reps: '6-10', rest: 150 },
                { name: 'Barbell Row', sets: 4, reps: '6-8', rest: 120 },
                { name: 'Seated Cable Row', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Face Pulls', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Bicep Curls', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Hammer Curls', sets: 3, reps: '10-12', rest: 60 },
            ]},
            { name: 'Legs (Heavy)', dayType: 'legs', exercises: [
                { name: 'Squat', sets: 4, reps: '5-6', rest: 180 },
                { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest: 150 },
                { name: 'Bulgarian Split Squat', sets: 3, reps: '8-10', rest: 90 },
                { name: 'Leg Press', sets: 3, reps: '12-15', rest: 90 },
                { name: 'Leg Curl', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Calf Raises', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Hanging Leg Raise', sets: 3, reps: '10-15', rest: 60 },
            ]},
            { name: 'Push (Volume)', dayType: 'push', exercises: [
                { name: 'Incline Bench Press', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Seated Dumbbell Press', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Pec Deck', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Cable Lateral Raise', sets: 4, reps: '12-15', rest: 45 },
                { name: 'Tricep Dips', sets: 3, reps: '8-12', rest: 90 },
                { name: 'Diamond Push-ups', sets: 3, reps: '10-15', rest: 60 },
            ]},
            { name: 'Pull (Volume)', dayType: 'pull', exercises: [
                { name: 'Lat Pulldown', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Dumbbell Row', sets: 4, reps: '8-10', rest: 90 },
                { name: 'T-Bar Row', sets: 3, reps: '8-10', rest: 90 },
                { name: 'Straight Arm Pulldown', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Rear Delt Fly', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Preacher Curls', sets: 3, reps: '8-12', rest: 60 },
                { name: 'Cable Curl', sets: 3, reps: '12-15', rest: 60 },
            ]},
            { name: 'Legs (Volume)', dayType: 'legs', exercises: [
                { name: 'Front Squat', sets: 4, reps: '6-8', rest: 150 },
                { name: 'Hip Thrust', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Walking Lunges', sets: 3, reps: '12-15', rest: 90 },
                { name: 'Leg Extension', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Seated Leg Curl', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Seated Calf Raise', sets: 4, reps: '15-20', rest: 45 },
                { name: 'Cable Crunch', sets: 3, reps: '12-15', rest: 60 },
            ]},
        ]
    },
    {
        id: 'ppl_advanced_gym',
        name: 'PPL — Advanced',
        type: 'PPL',
        level: 'advanced',
        category: 'gym',
        description: 'High-volume 6-day PPL with heavy compounds and accessories.',
        days: [
            { name: 'Push Power', dayType: 'push', exercises: [
                { name: 'Bench Press', sets: 5, reps: '3-5', rest: 240 },
                { name: 'Overhead Press', sets: 5, reps: '5', rest: 180 },
                { name: 'Incline Bench Press', sets: 4, reps: '6-8', rest: 150 },
                { name: 'Dumbbell Fly', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Lateral Raises', sets: 5, reps: '12-15', rest: 60 },
                { name: 'Close Grip Bench Press', sets: 4, reps: '6-8', rest: 120 },
                { name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', rest: 60 },
            ]},
            { name: 'Pull Power', dayType: 'pull', exercises: [
                { name: 'Deadlift', sets: 5, reps: '3-5', rest: 240 },
                { name: 'Weighted Pull-ups', sets: 5, reps: '5-8', rest: 180 },
                { name: 'Pendlay Row', sets: 4, reps: '6-8', rest: 150 },
                { name: 'T-Bar Row', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Face Pulls', sets: 4, reps: '15', rest: 60 },
                { name: 'EZ Bar Curl', sets: 4, reps: '8-10', rest: 60 },
                { name: 'Spider Curls', sets: 3, reps: '10-12', rest: 60 },
            ]},
            { name: 'Legs Power', dayType: 'legs', exercises: [
                { name: 'Squat', sets: 5, reps: '3-5', rest: 240 },
                { name: 'Romanian Deadlift', sets: 4, reps: '6-8', rest: 180 },
                { name: 'Hack Squat', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Leg Curl', sets: 4, reps: '10-12', rest: 90 },
                { name: 'Standing Calf Raise', sets: 5, reps: '10-12', rest: 60 },
                { name: 'Ab Wheel Rollout', sets: 4, reps: '10-15', rest: 60 },
            ]},
            { name: 'Push Volume', dayType: 'push', exercises: [
                { name: 'Incline Dumbbell Press', sets: 5, reps: '8-10', rest: 120 },
                { name: 'Arnold Press', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Cable Fly', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Cable Lateral Raise', sets: 5, reps: '12-15', rest: 45 },
                { name: 'Tricep Pushdown', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Tricep Kickbacks', sets: 3, reps: '12-15', rest: 60 },
            ]},
            { name: 'Pull Volume', dayType: 'pull', exercises: [
                { name: 'Lat Pulldown', sets: 5, reps: '10-12', rest: 90 },
                { name: 'Seated Cable Row', sets: 4, reps: '10-12', rest: 90 },
                { name: 'Dumbbell Row', sets: 4, reps: '10-12', rest: 90 },
                { name: 'Reverse Pec Deck', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Concentration Curls', sets: 4, reps: '10-12', rest: 60 },
                { name: 'Hammer Curls', sets: 4, reps: '10-12', rest: 60 },
            ]},
            { name: 'Legs Volume', dayType: 'legs', exercises: [
                { name: 'Front Squat', sets: 5, reps: '6-8', rest: 180 },
                { name: 'Hip Thrust', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Bulgarian Split Squat', sets: 4, reps: '10-12', rest: 90 },
                { name: 'Leg Extension', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Seated Leg Curl', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Seated Calf Raise', sets: 5, reps: '15-20', rest: 45 },
            ]},
        ]
    },

    // ============ UPPER / LOWER ============
    {
        id: 'ul_beginner_gym',
        name: 'Upper/Lower — Beginner',
        type: 'UL',
        level: 'beginner',
        category: 'gym',
        description: '4-day upper/lower split, perfect for new lifters.',
        days: [
            { name: 'Upper A', dayType: 'upper', exercises: [
                { name: 'Bench Press', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Barbell Row', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Overhead Press', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Bicep Curls', sets: 2, reps: '12', rest: 60 },
                { name: 'Tricep Pushdown', sets: 2, reps: '12', rest: 60 },
            ]},
            { name: 'Lower A', dayType: 'lower', exercises: [
                { name: 'Squat', sets: 3, reps: '8-10', rest: 180 },
                { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest: 150 },
                { name: 'Leg Press', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Leg Curl', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Calf Raises', sets: 4, reps: '12-15', rest: 60 },
            ]},
            { name: 'Upper B', dayType: 'upper', exercises: [
                { name: 'Incline Bench Press', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Pull-ups', sets: 3, reps: 'AMRAP', rest: 120 },
                { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Seated Cable Row', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Hammer Curls', sets: 2, reps: '12', rest: 60 },
            ]},
            { name: 'Lower B', dayType: 'lower', exercises: [
                { name: 'Deadlift', sets: 3, reps: '5-6', rest: 180 },
                { name: 'Front Squat', sets: 3, reps: '8-10', rest: 150 },
                { name: 'Walking Lunges', sets: 3, reps: '10', rest: 90 },
                { name: 'Leg Extension', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Seated Calf Raise', sets: 4, reps: '15', rest: 60 },
            ]},
        ]
    },
    {
        id: 'ul_intermediate_gym',
        name: 'Upper/Lower — Intermediate',
        type: 'UL',
        level: 'intermediate',
        category: 'gym',
        description: '4-day strength + hypertrophy upper/lower.',
        days: [
            { name: 'Upper Strength', dayType: 'upper', exercises: [
                { name: 'Bench Press', sets: 4, reps: '5-6', rest: 180 },
                { name: 'Pendlay Row', sets: 4, reps: '5-6', rest: 180 },
                { name: 'Overhead Press', sets: 3, reps: '6-8', rest: 150 },
                { name: 'Pull-ups', sets: 3, reps: '6-10', rest: 120 },
                { name: 'EZ Bar Curl', sets: 3, reps: '8-10', rest: 60 },
                { name: 'Skull Crushers', sets: 3, reps: '8-10', rest: 60 },
            ]},
            { name: 'Lower Strength', dayType: 'lower', exercises: [
                { name: 'Squat', sets: 4, reps: '5-6', rest: 180 },
                { name: 'Romanian Deadlift', sets: 3, reps: '6-8', rest: 150 },
                { name: 'Leg Press', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Leg Curl', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Standing Calf Raise', sets: 4, reps: '10-12', rest: 60 },
            ]},
            { name: 'Upper Hypertrophy', dayType: 'upper', exercises: [
                { name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Lat Pulldown', sets: 4, reps: '8-10', rest: 90 },
                { name: 'Seated Dumbbell Press', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Dumbbell Row', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Cable Fly', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Lateral Raises', sets: 4, reps: '12-15', rest: 45 },
                { name: 'Bicep Curls', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Tricep Pushdown', sets: 3, reps: '10-12', rest: 60 },
            ]},
            { name: 'Lower Hypertrophy', dayType: 'lower', exercises: [
                { name: 'Front Squat', sets: 4, reps: '8-10', rest: 150 },
                { name: 'Hip Thrust', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Leg Extension', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Seated Leg Curl', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Seated Calf Raise', sets: 4, reps: '15-20', rest: 45 },
            ]},
        ]
    },

    // ============ FULL BODY ============
    {
        id: 'fb_beginner_gym',
        name: 'Full Body — Beginner',
        type: 'FB',
        level: 'beginner',
        category: 'gym',
        description: '3-day full body. Best starting routine for new lifters.',
        days: [
            { name: 'Full Body A', dayType: 'full', exercises: [
                { name: 'Squat', sets: 3, reps: '8-10', rest: 150 },
                { name: 'Bench Press', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Barbell Row', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Overhead Press', sets: 2, reps: '10', rest: 90 },
                { name: 'Bicep Curls', sets: 2, reps: '12', rest: 60 },
            ]},
            { name: 'Full Body B', dayType: 'full', exercises: [
                { name: 'Deadlift', sets: 3, reps: '5-6', rest: 180 },
                { name: 'Incline Bench Press', sets: 3, reps: '8-10', rest: 120 },
                { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Seated Dumbbell Press', sets: 2, reps: '10', rest: 90 },
                { name: 'Tricep Pushdown', sets: 2, reps: '12', rest: 60 },
            ]},
            { name: 'Full Body C', dayType: 'full', exercises: [
                { name: 'Front Squat', sets: 3, reps: '8-10', rest: 150 },
                { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Pull-ups', sets: 3, reps: 'AMRAP', rest: 120 },
                { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Plank', sets: 3, reps: '30-60s', rest: 60 },
            ]},
        ]
    },
    {
        id: 'fb_intermediate_gym',
        name: 'Full Body — Intermediate',
        type: 'FB',
        level: 'intermediate',
        category: 'gym',
        description: '3-day full body with main lifts and accessories.',
        days: [
            { name: 'FB Heavy', dayType: 'full', exercises: [
                { name: 'Squat', sets: 4, reps: '5-6', rest: 180 },
                { name: 'Bench Press', sets: 4, reps: '5-6', rest: 180 },
                { name: 'Barbell Row', sets: 4, reps: '6-8', rest: 150 },
                { name: 'Overhead Press', sets: 3, reps: '6-8', rest: 120 },
                { name: 'Hanging Leg Raise', sets: 3, reps: '10-15', rest: 60 },
            ]},
            { name: 'FB Volume', dayType: 'full', exercises: [
                { name: 'Front Squat', sets: 4, reps: '8-10', rest: 150 },
                { name: 'Incline Dumbbell Press', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Lat Pulldown', sets: 4, reps: '10-12', rest: 90 },
                { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: 60 },
                { name: 'EZ Bar Curl', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Tricep Pushdown', sets: 3, reps: '10-12', rest: 60 },
            ]},
            { name: 'FB Power', dayType: 'full', exercises: [
                { name: 'Deadlift', sets: 4, reps: '5', rest: 240 },
                { name: 'Weighted Pull-ups', sets: 4, reps: '6-8', rest: 150 },
                { name: 'Dumbbell Bench Press', sets: 4, reps: '8-10', rest: 120 },
                { name: 'Bulgarian Split Squat', sets: 3, reps: '10', rest: 90 },
                { name: 'Face Pulls', sets: 3, reps: '15', rest: 60 },
            ]},
        ]
    },

    // ============ HOME / BODYWEIGHT ============
    {
        id: 'home_bodyweight',
        name: 'Bodyweight Builder',
        type: 'FB',
        level: 'beginner',
        category: 'bodyweight',
        description: 'No equipment needed. Build muscle and endurance from home.',
        days: [
            { name: 'Push Day', dayType: 'push', exercises: [
                { name: 'Push-ups', sets: 4, reps: '10-20', rest: 60 },
                { name: 'Diamond Push-ups', sets: 3, reps: '8-15', rest: 60 },
                { name: 'Pike Push-ups', sets: 3, reps: '8-12', rest: 60 },
                { name: 'Tricep Dips', sets: 3, reps: '10-15', rest: 60 },
                { name: 'Plank', sets: 3, reps: '30-60s', rest: 45 },
            ]},
            { name: 'Pull Day', dayType: 'pull', exercises: [
                { name: 'Pull-ups', sets: 4, reps: '5-10', rest: 90 },
                { name: 'Chin-ups', sets: 3, reps: '6-10', rest: 90 },
                { name: 'Inverted Row', sets: 3, reps: '10-15', rest: 60 },
                { name: 'Superman Hold', sets: 3, reps: '20-30s', rest: 45 },
            ]},
            { name: 'Legs Day', dayType: 'legs', exercises: [
                { name: 'Bodyweight Squat', sets: 4, reps: '20-30', rest: 60 },
                { name: 'Walking Lunges', sets: 3, reps: '20', rest: 60 },
                { name: 'Bulgarian Split Squat', sets: 3, reps: '10', rest: 60 },
                { name: 'Glute Bridge', sets: 3, reps: '15-20', rest: 45 },
                { name: 'Calf Raises', sets: 4, reps: '20', rest: 45 },
            ]},
        ]
    },
    {
        id: 'home_dumbbell',
        name: 'Dumbbell Only — Full Body',
        type: 'FB',
        level: 'beginner',
        category: 'dumbbell',
        description: 'Just one pair of dumbbells. Train anywhere.',
        days: [
            { name: 'DB Upper', dayType: 'upper', exercises: [
                { name: 'Dumbbell Bench Press', sets: 4, reps: '8-12', rest: 90 },
                { name: 'Dumbbell Row', sets: 4, reps: '10-12', rest: 90 },
                { name: 'Seated Dumbbell Press', sets: 3, reps: '10-12', rest: 90 },
                { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Hammer Curls', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Tricep Kickbacks', sets: 3, reps: '12-15', rest: 60 },
            ]},
            { name: 'DB Lower', dayType: 'lower', exercises: [
                { name: 'Goblet Squat', sets: 4, reps: '10-15', rest: 90 },
                { name: 'Romanian Deadlift', sets: 4, reps: '10-12', rest: 90 },
                { name: 'Bulgarian Split Squat', sets: 3, reps: '10', rest: 90 },
                { name: 'Walking Lunges', sets: 3, reps: '12', rest: 60 },
                { name: 'Calf Raises', sets: 4, reps: '15-20', rest: 45 },
            ]},
            { name: 'DB Full Body', dayType: 'full', exercises: [
                { name: 'Goblet Squat', sets: 3, reps: '12', rest: 60 },
                { name: 'Dumbbell Bench Press', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Dumbbell Row', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: 60 },
                { name: 'Arnold Press', sets: 3, reps: '10-12', rest: 60 },
                { name: 'Plank', sets: 3, reps: '45s', rest: 45 },
            ]},
        ]
    },
    {
        id: 'travel_minimal',
        name: 'Travel Workout',
        type: 'FB',
        level: 'beginner',
        category: 'travel',
        description: 'Hotel room friendly. Minimal space, no equipment.',
        days: [
            { name: 'Travel Day 1', dayType: 'full', exercises: [
                { name: 'Push-ups', sets: 4, reps: '10-20', rest: 45 },
                { name: 'Bodyweight Squat', sets: 4, reps: '20', rest: 45 },
                { name: 'Mountain Climbers', sets: 3, reps: '30s', rest: 30 },
                { name: 'Plank', sets: 3, reps: '45s', rest: 30 },
                { name: 'Burpees', sets: 3, reps: '10', rest: 60 },
            ]},
            { name: 'Travel Day 2', dayType: 'full', exercises: [
                { name: 'Walking Lunges', sets: 4, reps: '20', rest: 45 },
                { name: 'Diamond Push-ups', sets: 3, reps: '10-15', rest: 45 },
                { name: 'Glute Bridge', sets: 3, reps: '20', rest: 45 },
                { name: 'Bicycle Crunches', sets: 3, reps: '20', rest: 30 },
                { name: 'Jump Squats', sets: 3, reps: '15', rest: 60 },
            ]},
        ]
    },
    {
        id: 'band_full',
        name: 'Resistance Band Full Body',
        type: 'FB',
        level: 'beginner',
        category: 'band',
        description: 'Resistance bands only. Great for travel or home.',
        days: [
            { name: 'Band Upper', dayType: 'upper', exercises: [
                { name: 'Band Chest Press', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Band Row', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Band Overhead Press', sets: 3, reps: '12-15', rest: 60 },
                { name: 'Band Pull-Apart', sets: 3, reps: '15-20', rest: 45 },
                { name: 'Band Bicep Curl', sets: 3, reps: '12-15', rest: 45 },
                { name: 'Band Tricep Pushdown', sets: 3, reps: '12-15', rest: 45 },
            ]},
            { name: 'Band Lower', dayType: 'lower', exercises: [
                { name: 'Band Squat', sets: 4, reps: '15-20', rest: 60 },
                { name: 'Band Romanian Deadlift', sets: 4, reps: '12-15', rest: 60 },
                { name: 'Band Lateral Walk', sets: 3, reps: '15/side', rest: 45 },
                { name: 'Band Glute Bridge', sets: 3, reps: '15-20', rest: 45 },
                { name: 'Band Calf Raise', sets: 3, reps: '20', rest: 45 },
            ]},
        ]
    },
    {
        id: 'cardio_hiit',
        name: 'HIIT Cardio Burner',
        type: 'HIIT',
        level: 'intermediate',
        category: 'hiit',
        description: 'Fast-paced fat burner. 20 minutes, no equipment.',
        days: [
            { name: 'HIIT Circuit A', dayType: 'cardio', exercises: [
                { name: 'Burpees', sets: 4, reps: '30s on / 30s off', rest: 30 },
                { name: 'Mountain Climbers', sets: 4, reps: '30s on / 30s off', rest: 30 },
                { name: 'Jump Squats', sets: 4, reps: '30s on / 30s off', rest: 30 },
                { name: 'High Knees', sets: 4, reps: '30s on / 30s off', rest: 30 },
                { name: 'Jumping Jacks', sets: 4, reps: '30s on / 30s off', rest: 30 },
            ]},
            { name: 'HIIT Circuit B', dayType: 'cardio', exercises: [
                { name: 'Jump Rope', sets: 5, reps: '60s', rest: 30 },
                { name: 'Burpees', sets: 5, reps: '10', rest: 30 },
                { name: 'Push-ups', sets: 5, reps: '15', rest: 30 },
                { name: 'Bodyweight Squat', sets: 5, reps: '20', rest: 30 },
            ]},
        ]
    },
    {
        id: 'suspension_full',
        name: 'Suspension Trainer Full Body',
        type: 'FB',
        level: 'intermediate',
        category: 'suspension',
        description: 'TRX or suspension straps. Full body workout.',
        days: [
            { name: 'TRX Day 1', dayType: 'full', exercises: [
                { name: 'TRX Row', sets: 4, reps: '10-15', rest: 60 },
                { name: 'TRX Chest Press', sets: 4, reps: '10-15', rest: 60 },
                { name: 'TRX Squat', sets: 3, reps: '15-20', rest: 60 },
                { name: 'TRX Hamstring Curl', sets: 3, reps: '12-15', rest: 60 },
                { name: 'TRX Plank', sets: 3, reps: '30-45s', rest: 45 },
            ]},
            { name: 'TRX Day 2', dayType: 'full', exercises: [
                { name: 'TRX Pull-up', sets: 4, reps: '8-12', rest: 60 },
                { name: 'TRX Push-up', sets: 4, reps: '10-15', rest: 60 },
                { name: 'TRX Lunge', sets: 3, reps: '12/side', rest: 60 },
                { name: 'TRX Bicep Curl', sets: 3, reps: '12', rest: 45 },
                { name: 'TRX Tricep Press', sets: 3, reps: '12', rest: 45 },
            ]},
        ]
    },
];

// Map weekday → recommended day type for finding "Today's Workout"
// 0 = Sunday
const DAY_RECOMMENDATIONS = {
    0: 'rest',
    1: 'push',    // Mon
    2: 'pull',    // Tue
    3: 'legs',    // Wed
    4: 'push',    // Thu
    5: 'pull',    // Fri
    6: 'legs',    // Sat
};

const CATEGORIES = [
    { id: 'gym', name: 'Gym', icon: '&#x1F3CB;' },
    { id: 'bodyweight', name: 'Bodyweight', icon: '&#x1F4AA;' },
    { id: 'dumbbell', name: 'Dumbbell', icon: '&#x1F3CB;' },
    { id: 'band', name: 'Resistance Band', icon: '&#x1F535;' },
    { id: 'travel', name: 'Travel', icon: '&#x2708;' },
    { id: 'hiit', name: 'HIIT / Cardio', icon: '&#x1F525;' },
    { id: 'suspension', name: 'Suspension', icon: '&#x26D3;' },
];
