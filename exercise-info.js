// Exercise instructions database
// Each entry: target muscles, equipment, how-to cues, common mistakes
const EXERCISE_INFO = {
    // ─── CHEST ─────────────────────────────────────────
    'bench press': {
        muscles: ['Chest', 'Front Delts', 'Triceps'],
        equipment: 'Barbell, bench',
        cues: [
            'Plant feet flat, arch upper back, retract shoulder blades',
            'Grip just outside shoulder width',
            'Lower the bar to mid-chest with control',
            'Drive feet into the floor as you press',
            'Keep wrists stacked over elbows'
        ],
        mistakes: [
            'Bouncing the bar off your chest',
            'Flaring elbows out 90° (use ~45-75°)',
            'Lifting hips off the bench',
            'Half-repping'
        ]
    },
    'incline bench press': {
        muscles: ['Upper Chest', 'Front Delts', 'Triceps'],
        equipment: 'Barbell or dumbbells, incline bench (30-45°)',
        cues: [
            'Set incline between 30° and 45° — steeper hits delts more',
            'Same setup as flat bench: scapulae back and down',
            'Lower bar to upper chest, just below collarbones',
            'Press up and slightly back over shoulders'
        ],
        mistakes: [
            'Setting the incline too high (becomes a shoulder press)',
            'Lowering to your stomach instead of upper chest'
        ]
    },
    'dumbbell bench press': {
        muscles: ['Chest', 'Front Delts', 'Triceps'],
        equipment: 'Dumbbells, bench',
        cues: [
            'Kick the dumbbells up with your knees',
            'Keep wrists straight, dumbbells over shoulders at top',
            'Lower to a deep stretch at chest level',
            'Press up in a slight arc, not straight up'
        ],
        mistakes: ['Banging the dumbbells together at the top', 'Letting the wrists collapse back']
    },
    'push up': {
        muscles: ['Chest', 'Front Delts', 'Triceps', 'Core'],
        equipment: 'Bodyweight',
        cues: [
            'Hands slightly wider than shoulders',
            'Body in a straight line from head to heels',
            'Lower until chest nearly touches floor',
            'Squeeze glutes and brace core throughout'
        ],
        mistakes: ['Sagging hips', 'Flaring elbows wide', 'Half range of motion']
    },
    'dips': {
        muscles: ['Chest', 'Triceps', 'Front Delts'],
        equipment: 'Parallel bars',
        cues: [
            'Lean forward to bias chest, stay upright for triceps',
            'Lower until shoulders are slightly below elbows',
            'Keep elbows tracking back, not flaring'
        ],
        mistakes: ['Going too deep with poor shoulder mobility', 'Swinging or kipping']
    },
    'cable fly': {
        muscles: ['Chest'],
        equipment: 'Cable machine',
        cues: [
            'Slight bend in elbows, lock the angle',
            'Bring hands together in front of you in an arc',
            'Squeeze chest at the peak for 1 second'
        ],
        mistakes: ['Bending elbows to turn it into a press', 'Using too much weight and losing the stretch']
    },

    // ─── BACK ─────────────────────────────────────────
    'deadlift': {
        muscles: ['Hamstrings', 'Glutes', 'Lower Back', 'Lats', 'Traps'],
        equipment: 'Barbell',
        cues: [
            'Bar over mid-foot, shoulders just in front of bar',
            'Brace core like you\'re about to be punched',
            'Push the floor away — drive through your heels',
            'Lock out hips and shoulders together',
            'Lower with the same control you used to lift'
        ],
        mistakes: [
            'Rounding the lower back',
            'Letting the bar drift away from your body',
            'Hyperextending at the top',
            'Jerking the weight off the floor'
        ]
    },
    'pull up': {
        muscles: ['Lats', 'Biceps', 'Upper Back', 'Rear Delts'],
        equipment: 'Pull-up bar',
        cues: [
            'Grip slightly wider than shoulders, palms forward',
            'Start from a dead hang with shoulders engaged',
            'Pull chest to the bar, drive elbows down and back',
            'Control the descent'
        ],
        mistakes: ['Kipping or swinging', 'Half reps that never reach full extension']
    },
    'chin up': {
        muscles: ['Lats', 'Biceps', 'Upper Back'],
        equipment: 'Pull-up bar',
        cues: [
            'Underhand grip, shoulder width',
            'Pull until chin clears the bar',
            'Squeeze biceps and lats at the top'
        ],
        mistakes: ['Using momentum', 'Stopping short of full lockout at the bottom']
    },
    'barbell row': {
        muscles: ['Lats', 'Upper Back', 'Rear Delts', 'Biceps'],
        equipment: 'Barbell',
        cues: [
            'Hinge at hips, torso 45° or lower',
            'Pull bar to lower chest / upper abs',
            'Drive elbows back, squeeze shoulder blades',
            'Keep neck neutral'
        ],
        mistakes: ['Standing up to cheat the weight', 'Rounding the back', 'Pulling to the wrong spot']
    },
    'dumbbell row': {
        muscles: ['Lats', 'Upper Back', 'Biceps'],
        equipment: 'Dumbbell, bench',
        cues: [
            'One knee and one hand on the bench',
            'Pull dumbbell to your hip in an arc',
            'Squeeze at the top, control the negative'
        ],
        mistakes: ['Twisting the torso to lift heavier', 'Pulling with the arm instead of the back']
    },
    'lat pulldown': {
        muscles: ['Lats', 'Upper Back', 'Biceps'],
        equipment: 'Cable machine',
        cues: [
            'Slight backward lean, chest up',
            'Pull bar to upper chest, not behind the neck',
            'Drive elbows down toward your hips'
        ],
        mistakes: ['Using momentum', 'Pulling behind the neck (shoulder risk)']
    },
    'seated cable row': {
        muscles: ['Mid Back', 'Lats', 'Rear Delts', 'Biceps'],
        equipment: 'Cable machine',
        cues: [
            'Sit tall, slight forward lean to start',
            'Pull handle to your belly button',
            'Squeeze shoulder blades together at the end'
        ],
        mistakes: ['Rocking with the lower back', 'Shrugging instead of squeezing']
    },
    'face pull': {
        muscles: ['Rear Delts', 'Upper Back', 'Rotator Cuff'],
        equipment: 'Cable machine, rope',
        cues: [
            'Cable at face height, rope grip',
            'Pull to your forehead, elbows high',
            'Externally rotate at the end (thumbs back)'
        ],
        mistakes: ['Going too heavy and losing the rotation', 'Pulling to the chin instead of the face']
    },

    // ─── LEGS ─────────────────────────────────────────
    'squat': {
        muscles: ['Quads', 'Glutes', 'Hamstrings', 'Core'],
        equipment: 'Barbell, rack',
        cues: [
            'Bar on upper traps (high bar) or rear delts (low bar)',
            'Feet shoulder width, toes slightly out',
            'Brace core, sit back and down',
            'Knees track over toes',
            'Drive through whole foot to stand'
        ],
        mistakes: [
            'Knees caving inward',
            'Heels coming off the floor',
            'Not hitting depth (parallel or below)',
            'Folding forward at the bottom'
        ]
    },
    'front squat': {
        muscles: ['Quads', 'Core', 'Glutes', 'Upper Back'],
        equipment: 'Barbell, rack',
        cues: [
            'Bar rests on front delts, fingertips under bar',
            'Elbows high — chest stays up',
            'More upright torso than back squat',
            'Drive elbows up out of the hole'
        ],
        mistakes: ['Dropping elbows (bar rolls off)', 'Letting the upper back round']
    },
    'romanian deadlift': {
        muscles: ['Hamstrings', 'Glutes', 'Lower Back'],
        equipment: 'Barbell or dumbbells',
        cues: [
            'Soft knees, hips back',
            'Bar slides down the thighs',
            'Lower until you feel a deep hamstring stretch',
            'Drive hips forward to stand'
        ],
        mistakes: ['Bending the knees like a squat', 'Rounding the lower back at the bottom']
    },
    'leg press': {
        muscles: ['Quads', 'Glutes', 'Hamstrings'],
        equipment: 'Leg press machine',
        cues: [
            'Feet shoulder width on the platform',
            'Lower until knees reach about 90°',
            'Don\'t let your lower back round off the pad'
        ],
        mistakes: ['Locking out the knees aggressively', 'Hips rolling under at the bottom']
    },
    'lunge': {
        muscles: ['Quads', 'Glutes', 'Hamstrings'],
        equipment: 'Bodyweight or dumbbells',
        cues: [
            'Long step, front shin vertical at the bottom',
            'Drop the back knee toward the floor',
            'Drive through the front heel to stand'
        ],
        mistakes: ['Front knee caving in', 'Stepping too short and overloading the knee']
    },
    'bulgarian split squat': {
        muscles: ['Quads', 'Glutes', 'Hamstrings'],
        equipment: 'Bench, dumbbells optional',
        cues: [
            'Rear foot on bench, front foot far enough out',
            'Drop straight down — torso slightly forward',
            'Drive through front heel'
        ],
        mistakes: ['Front foot too close (knee dives forward)', 'Twisting the hips']
    },
    'leg curl': {
        muscles: ['Hamstrings'],
        equipment: 'Leg curl machine',
        cues: ['Pad sits just above the heels', 'Curl with control, squeeze at the top', 'Slow on the way down'],
        mistakes: ['Lifting hips off the pad', 'Using momentum']
    },
    'leg extension': {
        muscles: ['Quads'],
        equipment: 'Leg extension machine',
        cues: ['Pad on top of the ankles', 'Extend until knees are nearly straight', 'Squeeze quads at the top'],
        mistakes: ['Slamming the weight back down', 'Using too much weight and arching the back']
    },
    'calf raise': {
        muscles: ['Calves'],
        equipment: 'Bodyweight, machine, or dumbbells',
        cues: ['Press up to the ball of the foot', 'Pause at the top', 'Full stretch at the bottom'],
        mistakes: ['Bouncing through reps', 'Half range of motion']
    },
    'hip thrust': {
        muscles: ['Glutes', 'Hamstrings'],
        equipment: 'Bench, barbell',
        cues: [
            'Upper back on bench, feet flat',
            'Drive through heels, squeeze glutes at top',
            'Rib cage down, neutral spine'
        ],
        mistakes: ['Hyperextending the lower back instead of using glutes', 'Feet too far out or too close']
    },

    // ─── SHOULDERS ─────────────────────────────────────────
    'overhead press': {
        muscles: ['Front Delts', 'Side Delts', 'Triceps', 'Upper Chest'],
        equipment: 'Barbell',
        cues: [
            'Bar on front delts, grip just outside shoulders',
            'Brace core, squeeze glutes',
            'Press up, move head through at lockout',
            'Finish with bar over mid-foot'
        ],
        mistakes: ['Excessive lower back arch', 'Pressing in front instead of overhead']
    },
    'dumbbell shoulder press': {
        muscles: ['Front Delts', 'Side Delts', 'Triceps'],
        equipment: 'Dumbbells, bench',
        cues: ['Start with dumbbells at ear height', 'Press up and slightly together', 'Lower with control'],
        mistakes: ['Banging dumbbells at the top', 'Going too heavy and arching the back']
    },
    'lateral raise': {
        muscles: ['Side Delts'],
        equipment: 'Dumbbells',
        cues: [
            'Slight bend in elbows, locked angle',
            'Lead with the elbows, not the hands',
            'Raise to shoulder height — no higher',
            'Slow eccentric'
        ],
        mistakes: ['Swinging the weight up', 'Going too heavy', 'Shrugging at the top']
    },
    'rear delt fly': {
        muscles: ['Rear Delts', 'Upper Back'],
        equipment: 'Dumbbells or cables',
        cues: ['Hinge at hips, slight elbow bend', 'Pull arms out wide', 'Squeeze shoulder blades together'],
        mistakes: ['Using the lower back to swing', 'Letting the arms come too far back']
    },
    'arnold press': {
        muscles: ['Front Delts', 'Side Delts', 'Triceps'],
        equipment: 'Dumbbells',
        cues: ['Start with palms facing you', 'Rotate as you press up', 'Reverse the rotation on the way down'],
        mistakes: ['Rotating too fast', 'Going too heavy and losing form']
    },

    // ─── ARMS ─────────────────────────────────────────
    'barbell curl': {
        muscles: ['Biceps'],
        equipment: 'Barbell',
        cues: ['Elbows pinned to your sides', 'Curl up with control', 'Full stretch at the bottom'],
        mistakes: ['Swinging with the lower back', 'Bringing elbows forward to cheat']
    },
    'dumbbell curl': {
        muscles: ['Biceps'],
        equipment: 'Dumbbells',
        cues: ['Supinate (turn palms up) as you curl', 'Squeeze biceps at the top', 'Slow eccentric'],
        mistakes: ['Using body english', 'Not getting full extension at the bottom']
    },
    'hammer curl': {
        muscles: ['Biceps', 'Brachialis', 'Forearms'],
        equipment: 'Dumbbells',
        cues: ['Neutral grip (palms facing each other)', 'Curl straight up', 'Control the negative'],
        mistakes: ['Swinging', 'Not pausing at the top']
    },
    'tricep pushdown': {
        muscles: ['Triceps'],
        equipment: 'Cable machine',
        cues: ['Elbows pinned to ribs', 'Push down until arms lock out', 'Squeeze triceps at the bottom'],
        mistakes: ['Letting elbows drift forward', 'Leaning over to use bodyweight']
    },
    'skull crusher': {
        muscles: ['Triceps'],
        equipment: 'EZ bar or dumbbells, bench',
        cues: ['Elbows stay pointed at the ceiling', 'Lower bar toward forehead', 'Extend without flaring elbows'],
        mistakes: ['Elbows flaring out wide', 'Using shoulders to press the weight']
    },
    'overhead tricep extension': {
        muscles: ['Triceps'],
        equipment: 'Dumbbell or cable',
        cues: ['Keep elbows close to your head', 'Lower behind your head with control', 'Full lockout at the top'],
        mistakes: ['Elbows flaring out', 'Going too heavy and losing the stretch']
    },

    // ─── CORE ─────────────────────────────────────────
    'plank': {
        muscles: ['Core', 'Abs', 'Obliques'],
        equipment: 'Bodyweight',
        cues: [
            'Forearms on floor, elbows under shoulders',
            'Body in a straight line from head to heels',
            'Squeeze glutes and brace abs',
            'Breathe normally'
        ],
        mistakes: ['Sagging hips', 'Hiking hips up', 'Holding breath']
    },
    'crunch': {
        muscles: ['Abs'],
        equipment: 'Bodyweight',
        cues: ['Lower back stays on the floor', 'Curl shoulders up toward your knees', 'Exhale on the way up'],
        mistakes: ['Pulling on the neck', 'Using momentum']
    },
    'leg raise': {
        muscles: ['Lower Abs', 'Hip Flexors'],
        equipment: 'Bodyweight or hanging',
        cues: ['Lower back stays glued to the floor', 'Lift legs to vertical', 'Lower with control'],
        mistakes: ['Lower back arching off the floor', 'Swinging the legs']
    },
    'russian twist': {
        muscles: ['Obliques', 'Abs'],
        equipment: 'Bodyweight or weight',
        cues: ['Lean back ~45°, feet up', 'Rotate from the torso, not just the arms', 'Touch the floor on each side'],
        mistakes: ['Just moving the hands', 'Rounding the lower back']
    },
    'hanging leg raise': {
        muscles: ['Lower Abs', 'Hip Flexors'],
        equipment: 'Pull-up bar',
        cues: ['Hang fully, no swing', 'Curl knees or straight legs to chest', 'Lower with control'],
        mistakes: ['Kipping', 'Using momentum from a previous rep']
    },
};

// Aliases — common name variants → canonical key
const EXERCISE_ALIASES = {
    'bb bench': 'bench press',
    'flat bench': 'bench press',
    'barbell bench': 'bench press',
    'barbell bench press': 'bench press',
    'flat bench press': 'bench press',
    'incline barbell press': 'incline bench press',
    'incline dumbbell press': 'incline bench press',
    'incline db press': 'incline bench press',
    'db bench': 'dumbbell bench press',
    'db bench press': 'dumbbell bench press',
    'pushup': 'push up',
    'push-up': 'push up',
    'pushups': 'push up',
    'push ups': 'push up',
    'pull-up': 'pull up',
    'pullup': 'pull up',
    'pullups': 'pull up',
    'pull ups': 'pull up',
    'chinup': 'chin up',
    'chin-up': 'chin up',
    'chinups': 'chin up',
    'chin ups': 'chin up',
    'bb row': 'barbell row',
    'bent over row': 'barbell row',
    'bent-over row': 'barbell row',
    'pendlay row': 'barbell row',
    'db row': 'dumbbell row',
    'one arm row': 'dumbbell row',
    'single arm row': 'dumbbell row',
    'pulldown': 'lat pulldown',
    'lat pull down': 'lat pulldown',
    'cable row': 'seated cable row',
    'facepull': 'face pull',
    'back squat': 'squat',
    'barbell squat': 'squat',
    'high bar squat': 'squat',
    'low bar squat': 'squat',
    'rdl': 'romanian deadlift',
    'romanian dl': 'romanian deadlift',
    'split squat': 'bulgarian split squat',
    'bss': 'bulgarian split squat',
    'bulgarian squat': 'bulgarian split squat',
    'hamstring curl': 'leg curl',
    'lying leg curl': 'leg curl',
    'seated leg curl': 'leg curl',
    'quad extension': 'leg extension',
    'standing calf raise': 'calf raise',
    'seated calf raise': 'calf raise',
    'glute bridge': 'hip thrust',
    'barbell hip thrust': 'hip thrust',
    'ohp': 'overhead press',
    'military press': 'overhead press',
    'standing press': 'overhead press',
    'shoulder press': 'dumbbell shoulder press',
    'db shoulder press': 'dumbbell shoulder press',
    'seated db press': 'dumbbell shoulder press',
    'side raise': 'lateral raise',
    'side lateral raise': 'lateral raise',
    'db lateral raise': 'lateral raise',
    'reverse fly': 'rear delt fly',
    'rear delt raise': 'rear delt fly',
    'bb curl': 'barbell curl',
    'db curl': 'dumbbell curl',
    'bicep curl': 'dumbbell curl',
    'pushdown': 'tricep pushdown',
    'cable pushdown': 'tricep pushdown',
    'rope pushdown': 'tricep pushdown',
    'lying tricep extension': 'skull crusher',
    'skullcrusher': 'skull crusher',
    'french press': 'overhead tricep extension',
    'tricep extension': 'overhead tricep extension',
    'sit up': 'crunch',
    'situp': 'crunch',
    'sit-up': 'crunch',
    'lying leg raise': 'leg raise',
};

function lookupExerciseInfo(name) {
    if (!name) return null;
    const norm = name.toLowerCase().trim();
    if (EXERCISE_INFO[norm]) return { key: norm, ...EXERCISE_INFO[norm] };
    if (EXERCISE_ALIASES[norm]) {
        const k = EXERCISE_ALIASES[norm];
        return { key: k, ...EXERCISE_INFO[k] };
    }
    // Loose contains match
    for (const k of Object.keys(EXERCISE_INFO)) {
        if (norm.includes(k) || k.includes(norm)) return { key: k, ...EXERCISE_INFO[k] };
    }
    for (const [alias, k] of Object.entries(EXERCISE_ALIASES)) {
        if (norm.includes(alias) || alias.includes(norm)) return { key: k, ...EXERCISE_INFO[k] };
    }
    return null;
}
