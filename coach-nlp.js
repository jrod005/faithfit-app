
// ========== CONVERSATION MEMORY ==========
// Tracks last 5 exchanges so follow-ups like "what about for legs?" or "how many sets?" work
const _coachMemory = {
    turns: [],       // last N { input, exercise, muscleGroup, pattern, topicId }
    maxTurns: 5,

    push(entry) {
        this.turns.push(entry);
        if (this.turns.length > this.maxTurns) this.turns.shift();
    },
    lastExercise() {
        for (let i = this.turns.length - 1; i >= 0; i--) {
            if (this.turns[i].exercise) return this.turns[i].exercise;
        }
        return null;
    },
    lastMuscleGroup() {
        for (let i = this.turns.length - 1; i >= 0; i--) {
            if (this.turns[i].muscleGroup) return this.turns[i].muscleGroup;
        }
        return null;
    },
    lastPattern() {
        for (let i = this.turns.length - 1; i >= 0; i--) {
            if (this.turns[i].pattern) return this.turns[i].pattern;
        }
        return null;
    },
};

// ========== FUZZY MATCHING (Levenshtein) ==========
function _levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            const cost = b[i - 1] === a[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[b.length][a.length];
}

// Fuzzy-match a word against a list, return best match if within threshold
function _fuzzyMatch(word, candidates, maxDist) {
    if (!word || word.length < 3) return null;
    let best = null, bestDist = maxDist + 1;
    for (const c of candidates) {
        // Quick reject: length difference > maxDist
        if (Math.abs(word.length - c.length) > maxDist) continue;
        const d = _levenshtein(word, c);
        if (d < bestDist) { bestDist = d; best = c; }
    }
    return bestDist <= maxDist ? best : null;
}

// ========== COMMON TYPO / MISSPELLING DICTIONARY ==========
const _TYPO_MAP = {
    // Exercise typos
    'benchpress': 'bench press', 'bech press': 'bench press', 'benchh': 'bench', 'benhc': 'bench',
    'sqaut': 'squat', 'squaat': 'squat', 'squatt': 'squat', 'sqats': 'squat',
    'deadlif': 'deadlift', 'deadift': 'deadlift', 'deadlit': 'deadlift', 'dedlift': 'deadlift',
    'pullups': 'pull ups', 'pushups': 'push ups', 'chinups': 'chin ups',
    'dumbel': 'dumbbell', 'dumbell': 'dumbbell', 'dumbbel': 'dumbbell', 'barbell': 'barbell',
    'trisep': 'tricep', 'triseps': 'triceps', 'bisep': 'bicep', 'biseps': 'biceps',
    'exersize': 'exercise', 'exercize': 'exercise', 'excercise': 'exercise', 'excersize': 'exercise',
    // Nutrition typos
    'protien': 'protein', 'protine': 'protein', 'proteen': 'protein', 'protean': 'protein',
    'calroies': 'calories', 'caloreis': 'calories', 'caloris': 'calories', 'caloires': 'calories',
    'carbohydrat': 'carbohydrate', 'carbohidrate': 'carbohydrate', 'carbohidrates': 'carbohydrates',
    'nutrtion': 'nutrition', 'nutriton': 'nutrition', 'nurtition': 'nutrition',
    'supplment': 'supplement', 'suppliment': 'supplement', 'supliment': 'supplement',
    'creatine': 'creatine', 'creatien': 'creatine', 'creatin': 'creatine', 'kreatine': 'creatine',
    // Fitness concept typos
    'hypertorphy': 'hypertrophy', 'hipertrophy': 'hypertrophy', 'hypertropy': 'hypertrophy',
    'strenght': 'strength', 'strengh': 'strength', 'stength': 'strength',
    'musle': 'muscle', 'muscl': 'muscle', 'mucsle': 'muscle', 'muscel': 'muscle',
    'wieght': 'weight', 'weigth': 'weight', 'wight': 'weight', 'weght': 'weight',
    'trainning': 'training', 'trianing': 'training', 'traning': 'training',
    'workou': 'workout', 'wrokout': 'workout', 'workut': 'workout', 'workoit': 'workout',
    'recovry': 'recovery', 'recoverey': 'recovery', 'recoverry': 'recovery',
    'streching': 'stretching', 'strethcing': 'stretching', 'strentching': 'stretching',
    'flexability': 'flexibility', 'flexibilty': 'flexibility',
    'endurnace': 'endurance', 'endurace': 'endurance',
    'cardoi': 'cardio', 'cardo': 'cardio', 'caridio': 'cardio',
    'condtioning': 'conditioning', 'conditoning': 'conditioning',
    'overwieght': 'overweight', 'overweigt': 'overweight',
    'obiesity': 'obesity', 'obseity': 'obesity',
    'diabtes': 'diabetes', 'diabeties': 'diabetes',
    'plateua': 'plateau', 'plataeu': 'plateau', 'plateu': 'plateau',
    'periodzation': 'periodization', 'periodisation': 'periodization',
    'testoterone': 'testosterone', 'testosteron': 'testosterone', 'testostorone': 'testosterone',
    'metebolism': 'metabolism', 'metablism': 'metabolism', 'metabolsim': 'metabolism',
    'defecit': 'deficit', 'defict': 'deficit', 'deficet': 'deficit',
    'surpluss': 'surplus', 'surpuls': 'surplus',
    'maintence': 'maintenance', 'maintenace': 'maintenance', 'maintainance': 'maintenance',
    'overtraning': 'overtraining', 'overtaining': 'overtraining',
    'progresion': 'progression', 'progession': 'progression',
    'deit': 'diet', 'deiting': 'dieting',
    'loosing': 'losing', 'lossing': 'losing',
    'gainnig': 'gaining', 'ganing': 'gaining',
    'buliking': 'bulking', 'bukking': 'bulking',
    'cuting': 'cutting', 'cutitng': 'cutting',
    'recomp': 'recomp', 'recomposition': 'recomposition',
    'suplementation': 'supplementation',
    'starimaster': 'stairmaster', 'stairmaseter': 'stairmaster',
    'tredmill': 'treadmill', 'treadmil': 'treadmill', 'tredmil': 'treadmill',
    'eliptical': 'elliptical', 'elipitcal': 'elliptical',
};

// Apply typo corrections and fuzzy matching to input text
function _correctTypos(text) {
    let corrected = text.toLowerCase();
    // Direct typo dictionary
    for (const [typo, fix] of Object.entries(_TYPO_MAP)) {
        if (corrected.includes(typo)) {
            corrected = corrected.replace(new RegExp(typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix);
        }
    }
    // Fuzzy match individual words against exercise aliases
    const allAliases = Object.keys(_EXERCISE_ALIASES);
    const words = corrected.split(/\s+/);
    const fuzzyWords = words.map(w => {
        if (w.length < 4) return w;
        // Try 2-word combinations with next word
        const idx = words.indexOf(w);
        if (idx < words.length - 1) {
            const twoWord = w + ' ' + words[idx + 1];
            const match2 = _fuzzyMatch(twoWord, allAliases, 2);
            if (match2) return w; // keep as-is, the 2-word will match naturally
        }
        const match = _fuzzyMatch(w, allAliases, 2);
        if (match && match !== w) return match;
        return w;
    });
    return fuzzyWords.join(' ');
}

// ========== MUSCLE GROUP Q&A ENGINE ==========
const _MUSCLE_GROUPS = {
    'chest': {
        muscles: 'pectoralis major (upper, mid, lower), pectoralis minor',
        bestExercises: ['Bench Press', 'Incline Dumbbell Press', 'Cable Fly', 'Dips (chest-focused)', 'Push-ups'],
        sets: '12-20 sets/week', frequency: '2x/week',
        tips: 'Hit from multiple angles: flat for mid-chest, incline for upper, decline/dips for lower. Cable flies for stretch-mediated hypertrophy.',
    },
    'back': {
        muscles: 'lats, traps, rhomboids, teres major, erector spinae',
        bestExercises: ['Barbell Row', 'Pull-ups/Lat Pulldown', 'Seated Cable Row', 'Face Pulls', 'Deadlift'],
        sets: '12-20 sets/week', frequency: '2x/week',
        tips: 'Vertical pulls (pulldowns/pull-ups) emphasize lats. Horizontal rows build thickness. Face pulls for rear delts and shoulder health.',
    },
    'shoulders': {
        muscles: 'anterior (front) delt, lateral (side) delt, posterior (rear) delt',
        bestExercises: ['Overhead Press', 'Lateral Raises', 'Face Pulls', 'Arnold Press', 'Rear Delt Fly'],
        sets: '12-18 sets/week (including pressing)', frequency: '2-3x/week',
        tips: 'Front delts get hit on all pressing. Focus extra volume on side and rear delts — lateral raises and face pulls are essential.',
    },
    'arms': {
        muscles: 'biceps (long & short head), triceps (long, lateral, medial head), brachialis, forearms',
        bestExercises: ['Barbell Curl', 'Hammer Curl', 'Tricep Pushdown', 'Skull Crushers', 'Overhead Tricep Extension'],
        sets: '10-16 sets/week per biceps and triceps', frequency: '2-3x/week',
        tips: 'Triceps are 2/3 of arm size. Overhead extensions hit the long head (the one that makes your arm look big from the side). Compound pressing already trains triceps; compound pulling trains biceps.',
    },
    'biceps': {
        muscles: 'biceps brachii (long & short head), brachialis, brachioradialis',
        bestExercises: ['Barbell Curl', 'Incline Dumbbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl'],
        sets: '10-14 sets/week', frequency: '2-3x/week',
        tips: 'Incline curls target the long head (peak). Hammer curls hit brachialis (arm width). Don\'t forget that rows and pulldowns already train biceps.',
    },
    'triceps': {
        muscles: 'triceps brachii (long, lateral, medial head)',
        bestExercises: ['Close-Grip Bench Press', 'Tricep Pushdown', 'Overhead Extension', 'Skull Crushers', 'Dips'],
        sets: '10-14 sets/week', frequency: '2-3x/week',
        tips: 'Overhead movements hit the long head hardest (biggest head). Pushdowns target lateral head. Pressing movements already count toward tricep volume.',
    },
    'legs': {
        muscles: 'quads, hamstrings, glutes, calves, adductors',
        bestExercises: ['Squat', 'Romanian Deadlift', 'Leg Press', 'Lunges', 'Leg Curl', 'Calf Raises'],
        sets: '14-22 sets/week', frequency: '2x/week',
        tips: 'Squat patterns hit quads and glutes. Hinge patterns (RDL) hit hamstrings and glutes. Don\'t skip calves — they need high frequency (3-5x/week) and volume (4-6 sets).',
    },
    'quads': {
        muscles: 'rectus femoris, vastus lateralis, vastus medialis, vastus intermedius',
        bestExercises: ['Squat', 'Front Squat', 'Leg Press', 'Leg Extension', 'Bulgarian Split Squat'],
        sets: '10-16 sets/week', frequency: '2x/week',
        tips: 'Deep squats hit all four heads. Leg extensions isolate quads without lower back fatigue. Front squats shift load to quads over glutes.',
    },
    'hamstrings': {
        muscles: 'biceps femoris, semitendinosus, semimembranosus',
        bestExercises: ['Romanian Deadlift', 'Leg Curl (lying/seated)', 'Stiff-Leg Deadlift', 'Nordic Curl', 'Good Morning'],
        sets: '8-14 sets/week', frequency: '2x/week',
        tips: 'RDLs train the hip-extension function. Leg curls train the knee-flexion function. You need BOTH for complete hamstring development.',
    },
    'glutes': {
        muscles: 'gluteus maximus, gluteus medius, gluteus minimus',
        bestExercises: ['Hip Thrust', 'Squat', 'Romanian Deadlift', 'Bulgarian Split Squat', 'Cable Kickback'],
        sets: '10-16 sets/week', frequency: '2-3x/week',
        tips: 'Hip thrusts produce the highest glute EMG. Deep squats work glutes hard too. Bret Contreras research: hip thrusts + squats together outperform either alone.',
    },
    'calves': {
        muscles: 'gastrocnemius (upper calf), soleus (lower calf)',
        bestExercises: ['Standing Calf Raise', 'Seated Calf Raise', 'Leg Press Calf Raise', 'Single-Leg Calf Raise'],
        sets: '12-20 sets/week', frequency: '3-5x/week',
        tips: 'Calves are stubborn. High frequency + full ROM (deep stretch at bottom, hard squeeze at top) is key. Standing = gastrocnemius, seated = soleus.',
    },
    'abs': {
        muscles: 'rectus abdominis, obliques, transverse abdominis',
        bestExercises: ['Hanging Leg Raise', 'Cable Crunch', 'Ab Wheel Rollout', 'Pallof Press', 'Plank'],
        sets: '8-14 sets/week', frequency: '3-4x/week',
        tips: 'Abs are built in the gym, revealed in the kitchen. Heavy compounds already train core. Add 2-3 direct exercises for hypertrophy. Vispute 2011: ab exercises alone don\'t reduce belly fat.',
    },
    'core': {
        muscles: 'rectus abdominis, obliques, transverse abdominis, erector spinae, hip flexors',
        bestExercises: ['Plank', 'Ab Wheel Rollout', 'Pallof Press', 'Dead Bug', 'Hanging Leg Raise', 'Bird Dog'],
        sets: '8-14 sets/week', frequency: '3-4x/week',
        tips: 'Core = more than abs. Anti-rotation (Pallof press) and anti-extension (plank, ab wheel) build functional stability. Squats and deadlifts already train core heavily.',
    },
    'forearms': {
        muscles: 'wrist flexors, wrist extensors, brachioradialis',
        bestExercises: ['Wrist Curls', 'Reverse Curls', 'Farmer\'s Walks', 'Dead Hangs', 'Hammer Curls'],
        sets: '6-10 sets/week', frequency: '2-3x/week',
        tips: 'Heavy pulling (deadlifts, rows) trains forearms passively. Add direct work only if grip is a limiting factor or forearm size is a priority.',
    },
    'traps': {
        muscles: 'upper traps, middle traps, lower traps',
        bestExercises: ['Shrugs', 'Face Pulls', 'Barbell Row', 'Farmer\'s Walks', 'Deadlift'],
        sets: '8-12 sets/week', frequency: '2x/week',
        tips: 'Heavy deadlifts and rows already build traps. Shrugs add upper trap mass. Face pulls and Y-raises hit the often-neglected lower traps.',
    },
};

// Muscle group aliases for detection
const _MUSCLE_ALIASES = {
    'chest': 'chest', 'pecs': 'chest', 'pec': 'chest', 'pectoral': 'chest', 'pectorals': 'chest', 'titties': 'chest',
    'back': 'back', 'lats': 'back', 'lat': 'back', 'upper back': 'back', 'mid back': 'back', 'lower back': 'back', 'rhomboids': 'back',
    'shoulders': 'shoulders', 'shoulder': 'shoulders', 'delts': 'shoulders', 'delt': 'shoulders', 'deltoids': 'shoulders',
    'arms': 'arms', 'arm': 'arms', 'guns': 'arms',
    'biceps': 'biceps', 'bicep': 'biceps', 'bis': 'biceps',
    'triceps': 'triceps', 'tricep': 'triceps', 'tris': 'triceps',
    'legs': 'legs', 'leg': 'legs', 'lower body': 'legs', 'leg day': 'legs',
    'quads': 'quads', 'quad': 'quads', 'quadriceps': 'quads', 'thighs': 'quads', 'thigh': 'quads',
    'hamstrings': 'hamstrings', 'hamstring': 'hamstrings', 'hams': 'hamstrings',
    'glutes': 'glutes', 'glute': 'glutes', 'butt': 'glutes', 'booty': 'glutes', 'bum': 'glutes', 'buttocks': 'glutes', 'ass': 'glutes',
    'calves': 'calves', 'calf': 'calves',
    'abs': 'abs', 'abdominals': 'abs', 'six pack': 'abs', 'sixpack': 'abs', 'stomach': 'abs', 'tummy': 'abs', 'belly': 'abs', 'midsection': 'abs',
    'core': 'core',
    'forearms': 'forearms', 'forearm': 'forearms', 'grip': 'forearms', 'wrist': 'forearms', 'wrists': 'forearms',
    'traps': 'traps', 'trap': 'traps', 'trapezius': 'traps',
};

function _detectMuscleGroup(lower) {
    const sorted = Object.keys(_MUSCLE_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of sorted) {
        if (lower.includes(alias)) {
            const key = _MUSCLE_ALIASES[alias];
            return { key, ..._MUSCLE_GROUPS[key] };
        }
    }
    return null;
}

// ========== MUSCLE GROUP Q&A PATTERNS ==========
function _tryMuscleGroupQA(input, ctx) {
    const lower = input.toLowerCase();
    const mg = _detectMuscleGroup(lower);
    if (!mg) return null;

    // What pattern?
    const name = mg.key.charAt(0).toUpperCase() + mg.key.slice(1);

    // "best exercises for X" / "how to grow X" / "X workout" / "exercises for X"
    if (/best\s*(?:exercise|lift|movement)|exercise.*for|workout.*for|how\s*(?:to|do\s*i)\s*(?:grow|build|train|work|hit|target)|for\s*(?:bigger|growing|building)|(?:grow|build|train|hit|target|develop|work)\s*(?:my|the|your)?/.test(lower)) {
        let html = `<h3>Best Exercises for ${name}</h3>`;
        html += `<p><strong>Muscles involved:</strong> ${mg.muscles}.</p>`;
        html += `<p><strong>Top exercises:</strong></p><ol>`;
        mg.bestExercises.forEach(e => { html += `<li><strong>${e}</strong></li>`; });
        html += `</ol>`;
        html += `<p><strong>Volume:</strong> ${mg.sets} for optimal growth (Schoenfeld 2017).</p>`;
        html += `<p><strong>Frequency:</strong> ${mg.frequency}.</p>`;
        html += insightHtml(mg.tips);
        html += verseHtml();
        _coachMemory.push({ input, muscleGroup: mg.key, pattern: 'best_exercises' });
        return html;
    }

    // "how many sets for X" / "volume for X"
    if (/how\s*many\s*sets|volume|sets?\s*(?:per|for|should)|how\s*much.*(?:train|work|do)/.test(lower)) {
        let html = `<h3>${name} Volume Guide</h3>`;
        html += `<p><strong>Optimal weekly volume:</strong> ${mg.sets}.</p>`;
        html += `<p><strong>Frequency:</strong> ${mg.frequency}.</p>`;
        html += `<table class="plan-table"><tr><th>Level</th><th>Sets/week</th></tr>`;
        html += `<tr><td>Beginner</td><td>8-12</td></tr>`;
        html += `<tr><td>Intermediate</td><td>12-18</td></tr>`;
        html += `<tr><td>Advanced</td><td>16-22+</td></tr>`;
        html += `</table>`;
        html += insightHtml(mg.tips);
        html += verseHtml();
        _coachMemory.push({ input, muscleGroup: mg.key, pattern: 'volume' });
        return html;
    }

    // Generic "X" mention with a question word — give overview
    if (/how|what|best|should|can|which|why|does|do|is|are|will/.test(lower)) {
        let html = `<h3>${name} Training Guide</h3>`;
        html += `<p><strong>Muscles:</strong> ${mg.muscles}.</p>`;
        html += `<p><strong>Best exercises:</strong></p><ol>`;
        mg.bestExercises.slice(0, 4).forEach(e => { html += `<li><strong>${e}</strong></li>`; });
        html += `</ol>`;
        html += `<p><strong>Volume:</strong> ${mg.sets} | <strong>Frequency:</strong> ${mg.frequency}.</p>`;
        html += insightHtml(mg.tips);
        html += verseHtml();
        _coachMemory.push({ input, muscleGroup: mg.key, pattern: 'overview' });
        return html;
    }

    return null;
}

// ========== FOLLOW-UP / CONTEXT-AWARE HANDLER ==========
function _tryFollowUp(input, ctx) {
    const lower = input.toLowerCase();

    // Detect if this is a follow-up (short message referencing prior context)
    const isFollowUp = /^(?:what about|and for|how about|ok (?:and|but)|same (?:for|thing|question)|for\s+\w+\??$)/i.test(lower)
        || (lower.split(/\s+/).length <= 5 && /^(?:and|but|also|what|how)\b/i.test(lower));

    if (!isFollowUp && lower.split(/\s+/).length > 6) return null;

    // Check if there's a new muscle group or exercise mentioned
    const newMuscle = _detectMuscleGroup(lower);
    const newExercise = _detectExercise(lower);

    // If new entity + last pattern → rebuild answer with new entity
    const lastPattern = _coachMemory.lastPattern();
    const lastExercise = _coachMemory.lastExercise();

    if (newExercise && lastPattern) {
        _coachMemory.push({ input, exercise: newExercise.name, pattern: lastPattern });
        const result = _buildExerciseAnswer(newExercise, lastPattern, ctx);
        if (result) return result;
    }

    if (newMuscle) {
        // Re-answer the last pattern for the new muscle group
        const name = newMuscle.key.charAt(0).toUpperCase() + newMuscle.key.slice(1);
        let html = `<h3>${name} Training Guide</h3>`;
        html += `<p><strong>Muscles:</strong> ${newMuscle.muscles}.</p>`;
        html += `<p><strong>Best exercises:</strong></p><ol>`;
        newMuscle.bestExercises.slice(0, 4).forEach(e => { html += `<li><strong>${e}</strong></li>`; });
        html += `</ol>`;
        html += `<p><strong>Volume:</strong> ${newMuscle.sets} | <strong>Frequency:</strong> ${newMuscle.frequency}.</p>`;
        html += insightHtml(newMuscle.tips);
        html += verseHtml();
        _coachMemory.push({ input, muscleGroup: newMuscle.key, pattern: lastPattern || 'overview' });
        return html;
    }

    // Pattern-only follow-up on last exercise: "how many sets?" after discussing bench
    if (lastExercise && !newExercise) {
        const pattern = _detectQuestionPattern(lower);
        if (pattern) {
            const exercise = _detectExercise(lastExercise) || (function() {
                const data = _EXERCISE_MAP[lastExercise];
                return data ? { name: lastExercise, ...data } : null;
            })();
            if (exercise) {
                _coachMemory.push({ input, exercise: exercise.name, pattern });
                return _buildExerciseAnswer(exercise, pattern, ctx);
            }
        }
    }

    return null;
}

// --- General Knowledge lookup (extracted so it can be called early) ---
function _tryGeneralKnowledge(input, ctx) {
    const lower = input.toLowerCase();
    const gk = TOPIC_RESPONSES.generalKnowledge;
    if (!gk) return null;
    for (let i = 0; i < gk.length; i++) {
        for (let j = 0; j < gk[i].triggers.length; j++) {
            try {
                if (new RegExp(gk[i].triggers[j], 'i').test(lower)) {
                    return gk[i].answer(ctx);
                }
            } catch (e) { /* skip invalid regex */ }
        }
    }
    return null;
}

// --- Exercise-specific Q&A engine ---
// Catches natural questions like "should I bench press every day",
// "is deadlift good for back", "how many sets of squats", "can I do curls daily"
function _tryExerciseQA(input, ctx) {
    const lower = input.toLowerCase();

    // Detect the exercise being asked about
    const exercise = _detectExercise(lower);
    if (!exercise) return null;

    // Detect the question pattern
    const pattern = _detectQuestionPattern(lower);
    if (!pattern) return null;

    return _buildExerciseAnswer(exercise, pattern, ctx);
}

const _EXERCISE_MAP = {
    'bench press': { muscles: 'chest, front delts, triceps', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-5', reps: '5-12', category: 'press' },
    'squat': { muscles: 'quads, glutes, core', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-5', reps: '5-10', category: 'squat' },
    'deadlift': { muscles: 'posterior chain (back, glutes, hamstrings)', type: 'compound', frequency: '1-2x/week', minRest: 72, sets: '3-5', reps: '3-8', category: 'hinge' },
    'overhead press': { muscles: 'shoulders, triceps, upper chest', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-4', reps: '5-10', category: 'press' },
    'barbell row': { muscles: 'lats, rhomboids, biceps, rear delts', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-5', reps: '5-12', category: 'pull' },
    'pull-up': { muscles: 'lats, biceps, rear delts, core', type: 'compound', frequency: '3-5x/week', minRest: 24, sets: '3-5', reps: '5-15', category: 'pull' },
    'chin-up': { muscles: 'lats, biceps, forearms', type: 'compound', frequency: '3-5x/week', minRest: 24, sets: '3-5', reps: '5-15', category: 'pull' },
    'dip': { muscles: 'chest, triceps, front delts', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-4', reps: '6-15', category: 'press' },
    'bicep curl': { muscles: 'biceps', type: 'isolation', frequency: '2-4x/week', minRest: 24, sets: '3-4', reps: '8-15', category: 'isolation' },
    'tricep pushdown': { muscles: 'triceps', type: 'isolation', frequency: '2-4x/week', minRest: 24, sets: '3-4', reps: '10-15', category: 'isolation' },
    'lateral raise': { muscles: 'side delts', type: 'isolation', frequency: '3-5x/week', minRest: 24, sets: '3-5', reps: '12-20', category: 'isolation' },
    'face pull': { muscles: 'rear delts, rotator cuff', type: 'isolation', frequency: '3-5x/week', minRest: 24, sets: '3-4', reps: '15-25', category: 'isolation' },
    'leg press': { muscles: 'quads, glutes', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-4', reps: '8-15', category: 'squat' },
    'romanian deadlift': { muscles: 'hamstrings, glutes, lower back', type: 'compound', frequency: '2x/week', minRest: 48, sets: '3-4', reps: '8-12', category: 'hinge' },
    'hip thrust': { muscles: 'glutes, hamstrings', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-4', reps: '8-12', category: 'hinge' },
    'push-up': { muscles: 'chest, triceps, front delts', type: 'compound', frequency: '4-6x/week', minRest: 24, sets: '3-5', reps: '10-30', category: 'press' },
    'plank': { muscles: 'core, shoulders', type: 'isolation', frequency: '5-7x/week', minRest: 0, sets: '3-4', reps: '30-60s', category: 'core' },
    'crunch': { muscles: 'abs', type: 'isolation', frequency: '3-5x/week', minRest: 24, sets: '3-4', reps: '15-25', category: 'core' },
    'leg curl': { muscles: 'hamstrings', type: 'isolation', frequency: '2-3x/week', minRest: 24, sets: '3-4', reps: '10-15', category: 'isolation' },
    'leg extension': { muscles: 'quads', type: 'isolation', frequency: '2-3x/week', minRest: 24, sets: '3-4', reps: '10-15', category: 'isolation' },
    'calf raise': { muscles: 'calves', type: 'isolation', frequency: '3-5x/week', minRest: 24, sets: '4-6', reps: '12-20', category: 'isolation' },
    'cable fly': { muscles: 'chest (stretch emphasis)', type: 'isolation', frequency: '2-3x/week', minRest: 24, sets: '3-4', reps: '10-15', category: 'isolation' },
    'lat pulldown': { muscles: 'lats, biceps', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-4', reps: '8-12', category: 'pull' },
    'incline press': { muscles: 'upper chest, front delts, triceps', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-4', reps: '6-12', category: 'press' },
    'front squat': { muscles: 'quads, core, upper back', type: 'compound', frequency: '2x/week', minRest: 48, sets: '3-4', reps: '5-8', category: 'squat' },
    'lunges': { muscles: 'quads, glutes, balance', type: 'compound', frequency: '2-3x/week', minRest: 48, sets: '3-4', reps: '8-12 each', category: 'squat' },
    'hammer curl': { muscles: 'brachialis, biceps, forearms', type: 'isolation', frequency: '2-4x/week', minRest: 24, sets: '3-4', reps: '8-15', category: 'isolation' },
    'skull crusher': { muscles: 'triceps (long head)', type: 'isolation', frequency: '2-3x/week', minRest: 24, sets: '3-4', reps: '8-12', category: 'isolation' },
    'shrug': { muscles: 'upper traps', type: 'isolation', frequency: '2-3x/week', minRest: 24, sets: '3-4', reps: '10-15', category: 'isolation' },
};

// Aliases that map to canonical exercise names
const _EXERCISE_ALIASES = {
    'bench': 'bench press', 'flat bench': 'bench press', 'chest press': 'bench press', 'barbell bench': 'bench press',
    'squat': 'squat', 'back squat': 'squat', 'barbell squat': 'squat', 'squats': 'squat',
    'deadlift': 'deadlift', 'deadlifts': 'deadlift', 'dead lift': 'deadlift', 'conventional deadlift': 'deadlift', 'sumo deadlift': 'deadlift',
    'ohp': 'overhead press', 'shoulder press': 'overhead press', 'military press': 'overhead press', 'press overhead': 'overhead press',
    'row': 'barbell row', 'rows': 'barbell row', 'bent over row': 'barbell row', 'barbell row': 'barbell row', 'dumbbell row': 'barbell row',
    'pull up': 'pull-up', 'pullup': 'pull-up', 'pull-up': 'pull-up', 'pullups': 'pull-up', 'pull ups': 'pull-up',
    'chin up': 'chin-up', 'chinup': 'chin-up', 'chin-up': 'chin-up', 'chinups': 'chin-up', 'chin ups': 'chin-up',
    'dip': 'dip', 'dips': 'dip', 'chest dip': 'dip', 'tricep dip': 'dip',
    'curl': 'bicep curl', 'curls': 'bicep curl', 'bicep curl': 'bicep curl', 'bicep curls': 'bicep curl', 'barbell curl': 'bicep curl', 'dumbbell curl': 'bicep curl',
    'pushdown': 'tricep pushdown', 'pushdowns': 'tricep pushdown', 'tricep pushdown': 'tricep pushdown', 'rope pushdown': 'tricep pushdown',
    'lateral raise': 'lateral raise', 'lateral raises': 'lateral raise', 'side raise': 'lateral raise', 'side raises': 'lateral raise', 'side delts': 'lateral raise',
    'face pull': 'face pull', 'face pulls': 'face pull', 'facepull': 'face pull', 'facepulls': 'face pull',
    'leg press': 'leg press',
    'rdl': 'romanian deadlift', 'romanian deadlift': 'romanian deadlift', 'stiff leg deadlift': 'romanian deadlift',
    'hip thrust': 'hip thrust', 'hip thrusts': 'hip thrust', 'glute bridge': 'hip thrust',
    'push up': 'push-up', 'pushup': 'push-up', 'push-up': 'push-up', 'pushups': 'push-up', 'push ups': 'push-up',
    'plank': 'plank', 'planks': 'plank',
    'crunch': 'crunch', 'crunches': 'crunch', 'sit up': 'crunch', 'situp': 'crunch', 'sit-up': 'crunch',
    'leg curl': 'leg curl', 'leg curls': 'leg curl', 'hamstring curl': 'leg curl',
    'leg extension': 'leg extension', 'leg extensions': 'leg extension',
    'calf raise': 'calf raise', 'calf raises': 'calf raise', 'calves': 'calf raise',
    'cable fly': 'cable fly', 'cable flies': 'cable fly', 'pec fly': 'cable fly', 'chest fly': 'cable fly',
    'lat pulldown': 'lat pulldown', 'lat pull down': 'lat pulldown', 'pulldown': 'lat pulldown',
    'incline bench': 'incline press', 'incline press': 'incline press', 'incline dumbbell press': 'incline press',
    'front squat': 'front squat', 'front squats': 'front squat',
    'lunge': 'lunges', 'lunges': 'lunges', 'walking lunge': 'lunges', 'walking lunges': 'lunges', 'split squat': 'lunges', 'bulgarian split squat': 'lunges',
    'hammer curl': 'hammer curl', 'hammer curls': 'hammer curl',
    'skull crusher': 'skull crusher', 'skull crushers': 'skull crusher', 'skullcrusher': 'skull crusher',
    'shrug': 'shrug', 'shrugs': 'shrug',
};

function _detectExercise(lower) {
    // Try longest alias match first (multi-word)
    const sortedAliases = Object.keys(_EXERCISE_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
        if (lower.includes(alias)) {
            const canonical = _EXERCISE_ALIASES[alias];
            return { name: canonical, ..._EXERCISE_MAP[canonical] };
        }
    }
    // Try canonical names directly
    for (const [name, data] of Object.entries(_EXERCISE_MAP)) {
        if (lower.includes(name)) return { name, ...data };
    }
    return null;
}

function _detectQuestionPattern(lower) {
    // Frequency: "every day", "daily", "how often", "times per week", "x per week"
    if (/every\s*day|daily|everyday|too\s*much|too\s*often|over\s*train/i.test(lower)) return 'frequency_daily';
    if (/how\s*often|how\s*many\s*times|times?\s*(?:per|a)\s*week|days?\s*(?:per|a)\s*week|how\s*frequent/i.test(lower)) return 'frequency';
    // Volume: "how many sets", "how many reps", "sets and reps"
    if (/how\s*many\s*sets|sets?\s*(?:should|do|for)|volume\s*for/i.test(lower)) return 'sets';
    if (/how\s*many\s*reps|reps?\s*(?:should|do|for)|rep\s*range/i.test(lower)) return 'reps';
    if (/sets?\s*and\s*reps|reps?\s*and\s*sets/i.test(lower)) return 'sets_and_reps';
    // Benefit: "is X good for", "does X work", "will X help", "benefits of X"
    if (/good\s*for|help\s*(?:with|me|build|grow|lose)|benefit|effective|worth|useful/i.test(lower)) return 'benefit';
    // Safety: "safe", "bad for", "hurt", "dangerous", "risk"
    if (/safe|dangerous|bad\s*for|hurt|injur|risk|harmful|damage/i.test(lower)) return 'safety';
    // Technique/how: "how to", "proper form", "correct way", "tips for"
    if (/how\s*(?:to|do\s*i)|proper\s*(?:form|way|technique)|correct\s*(?:form|way)|tips?\s*for|form\s*(?:on|for|check)/i.test(lower)) return 'form';
    // Alternatives: "alternative", "substitute", "replace", "instead of"
    if (/alternative|substitute|replace|instead\s*of|swap|switch.*from/i.test(lower)) return 'alternative';
    // Should I: "should I", "can I", "is it okay"
    if (/should\s*i|can\s*i|is\s*it\s*(?:ok|okay|fine|good)|do\s*i\s*need/i.test(lower)) return 'should';
    // What muscles: "what muscles", "which muscles", "what does X work"
    if (/what\s*muscle|which\s*muscle|what\s*does.*work|muscles?\s*(?:does|do)/i.test(lower)) return 'muscles';
    return null;
}

function _buildExerciseAnswer(exercise, pattern, ctx) {
    const name = exercise.name.charAt(0).toUpperCase() + exercise.name.slice(1);
    let html = '';

    switch (pattern) {
        case 'frequency_daily':
            html += `<h3>Should You ${name} Every Day?</h3>`;
            if (exercise.type === 'compound') {
                html += `<p><strong>No.</strong> ${name} is a ${exercise.type} movement hitting <strong>${exercise.muscles}</strong>. These muscles need <strong>${exercise.minRest}+ hours</strong> to recover between hard sessions.</p>`;
                html += `<p><strong>Optimal frequency:</strong> ${exercise.frequency}. Training the same compound lift daily leads to accumulated fatigue, form breakdown, and eventually injury or plateau.</p>`;
                html += insightHtml(`Schoenfeld 2016 frequency meta: 2\u20133× per muscle per week is the sweet spot. Beyond that, diminishing returns and recovery debt. ${exercise.minRest === 72 ? 'Deadlifts are especially taxing on the CNS — most programs only program them heavy 1×/week.' : ''}`);
            } else {
                html += `<p><strong>It depends.</strong> ${name} is an isolation movement for <strong>${exercise.muscles}</strong>. Isolation exercises are less fatiguing, so higher frequency is possible.</p>`;
                html += `<p><strong>Optimal frequency:</strong> ${exercise.frequency}. You <em>can</em> do light sets daily, but hard sets still need recovery. Rotating intensity (heavy one day, light the next) works if you insist on daily.</p>`;
            }
            html += `<p><strong>Better approach:</strong> Train ${name.toLowerCase()} ${exercise.frequency} with proper intensity (${exercise.sets} sets of ${exercise.reps} reps), then hit different muscle groups on other days. You'll grow faster with rest than without it.</p>`;
            html += verseHtml();
            return html;

        case 'frequency':
            html += `<h3>How Often Should You ${name}?</h3>`;
            html += `<p><strong>${exercise.frequency}</strong> is optimal for most people.</p>`;
            html += `<p>${name} targets <strong>${exercise.muscles}</strong>. Allow at least <strong>${exercise.minRest} hours</strong> between sessions hitting the same muscle group.</p>`;
            html += `<table class="plan-table"><tr><th>Level</th><th>Frequency</th></tr>`;
            html += `<tr><td>Beginner</td><td>${exercise.type === 'compound' ? '2×/week' : '2-3×/week'}</td></tr>`;
            html += `<tr><td>Intermediate</td><td>${exercise.frequency}</td></tr>`;
            html += `<tr><td>Advanced</td><td>${exercise.type === 'compound' ? '2-4×/week (varying intensity)' : exercise.frequency}</td></tr>`;
            html += `</table>`;
            html += verseHtml();
            return html;

        case 'sets':
        case 'reps':
        case 'sets_and_reps':
            html += `<h3>${name} \u2014 Sets & Reps</h3>`;
            html += `<p><strong>Recommended:</strong> ${exercise.sets} sets of ${exercise.reps} reps.</p>`;
            // Personalize with their PR
            if (ctx && ctx.exercisePRs) {
                const pr = ctx.exercisePRs[exercise.name] || ctx.exercisePRs[name] || 0;
                if (pr > 0) {
                    const unit = wu();
                    html += insightHtml(`Your PR for ${name} is <strong>${lbsToDisplay(pr)} ${unit}</strong>. For hypertrophy, work at ~${lbsToDisplay(Math.round(pr * 0.7 / 5) * 5)}-${lbsToDisplay(Math.round(pr * 0.8 / 5) * 5)} ${unit}. For strength, work at ~${lbsToDisplay(Math.round(pr * 0.85 / 5) * 5)} ${unit}.`);
                }
            }
            html += `<table class="plan-table"><tr><th>Goal</th><th>Sets \u00d7 Reps</th><th>Rest</th></tr>`;
            if (exercise.type === 'compound') {
                html += `<tr><td>Strength</td><td>4-5 \u00d7 3-5</td><td>3-5 min</td></tr>`;
                html += `<tr><td>Hypertrophy</td><td>3-4 \u00d7 8-12</td><td>60-90 sec</td></tr>`;
                html += `<tr><td>Endurance</td><td>3 \u00d7 15-20</td><td>45-60 sec</td></tr>`;
            } else {
                html += `<tr><td>Hypertrophy</td><td>3-4 \u00d7 10-15</td><td>60-90 sec</td></tr>`;
                html += `<tr><td>Endurance/pump</td><td>3 \u00d7 15-25</td><td>30-45 sec</td></tr>`;
            }
            html += `</table>`;
            html += insightHtml(`Schoenfeld 2017 dose-response meta: 10\u201320+ sets per muscle per week drives the most hypertrophy. Count all exercises for that muscle group, not just ${name.toLowerCase()}.`);
            html += verseHtml();
            return html;

        case 'benefit':
            html += `<h3>Is ${name} Worth Doing?</h3>`;
            html += `<p><strong>Yes.</strong> ${name} is a ${exercise.type} exercise targeting <strong>${exercise.muscles}</strong>.</p>`;
            if (exercise.type === 'compound') {
                html += `<p>Compound lifts like ${name.toLowerCase()} are the foundation of any serious program because they:</p><ul>`;
                html += `<li>Work multiple muscle groups simultaneously</li>`;
                html += `<li>Allow heavier loads = stronger strength signal</li>`;
                html += `<li>Have the best strength-to-time ratio</li>`;
                html += `<li>Increase anabolic hormone response (Kraemer 1999)</li></ul>`;
            } else {
                html += `<p>As an isolation exercise, ${name.toLowerCase()} is best used to:</p><ul>`;
                html += `<li>Target a specific weak point</li>`;
                html += `<li>Add volume to a lagging muscle without systemic fatigue</li>`;
                html += `<li>Achieve a strong mind-muscle connection</li></ul>`;
            }
            html += verseHtml();
            return html;

        case 'safety':
            html += `<h3>Is ${name} Safe?</h3>`;
            html += `<p><strong>Yes, when performed correctly.</strong> No exercise is inherently dangerous — bad form and ego loading are.</p>`;
            html += `<p><strong>Key safety rules for ${name.toLowerCase()}:</strong></p><ul>`;
            html += `<li>Warm up with 2-3 lighter sets before working sets</li>`;
            html += `<li>Use a weight you can control through the full range of motion</li>`;
            html += `<li>Stop if you feel sharp or unusual pain (discomfort ≠ pain)</li>`;
            if (exercise.category === 'squat' || exercise.category === 'hinge') {
                html += `<li>Keep a neutral spine — brace your core like someone's about to punch you</li>`;
                html += `<li>Use a belt for heavy sets (85%+ 1RM) if it feels right</li>`;
            }
            if (exercise.category === 'press') {
                html += `<li>Don't bounce the bar or use momentum</li>`;
                html += `<li>Use a spotter or safety pins for heavy sets</li>`;
            }
            html += `</ul>`;
            html += verseHtml();
            return html;

        case 'form':
            // Delegate to the existing form topic handler
            return null; // Let the topic system handle this

        case 'alternative':
            html += `<h3>Alternatives to ${name}</h3>`;
            const altMap = {
                'bench press': ['Dumbbell Bench Press', 'Machine Chest Press', 'Push-ups (weighted)', 'Floor Press'],
                'squat': ['Leg Press', 'Hack Squat', 'Bulgarian Split Squat', 'Goblet Squat'],
                'deadlift': ['Romanian Deadlift', 'Trap Bar Deadlift', 'Cable Pull-Through', 'Hip Thrust'],
                'overhead press': ['Dumbbell Shoulder Press', 'Arnold Press', 'Landmine Press', 'Machine Press'],
                'pull-up': ['Lat Pulldown', 'Assisted Pull-ups', 'Inverted Rows', 'Band-assisted Pull-ups'],
            };
            const alts = altMap[exercise.name] || ['Dumbbell variation', 'Machine variation', 'Cable variation', 'Bodyweight variation'];
            html += `<p>Good alternatives that hit the same muscles (<strong>${exercise.muscles}</strong>):</p><ol>`;
            alts.forEach(a => { html += `<li><strong>${a}</strong></li>`; });
            html += `</ol>`;
            html += verseHtml();
            return html;

        case 'should':
            html += `<h3>${name} \u2014 Quick Answer</h3>`;
            html += `<p><strong>Yes, ${name.toLowerCase()} is a great exercise.</strong> It targets <strong>${exercise.muscles}</strong> and is a ${exercise.type} movement.</p>`;
            html += `<p><strong>Program it:</strong> ${exercise.frequency}, ${exercise.sets} sets of ${exercise.reps} reps. Allow ${exercise.minRest}+ hours between sessions.</p>`;
            if (exercise.type === 'compound') {
                html += `<p>As a compound lift, it should be one of the first exercises in your workout when you're freshest.</p>`;
            }
            html += verseHtml();
            return html;

        case 'muscles':
            html += `<h3>What Does ${name} Work?</h3>`;
            html += `<p><strong>Primary muscles:</strong> ${exercise.muscles}.</p>`;
            html += `<p><strong>Type:</strong> ${exercise.type} (${exercise.type === 'compound' ? 'multi-joint, works multiple muscle groups' : 'single-joint, isolates one muscle group'}).</p>`;
            html += `<p><strong>Programming:</strong> ${exercise.sets} sets of ${exercise.reps} reps, ${exercise.frequency}.</p>`;
            html += verseHtml();
            return html;

        default:
            return null;
    }
}

// Convert a topic id to a human-friendly suggestion phrase
const COACH_TOPIC_PHRASES = {
    get_stronger: 'How can I get stronger?',
    build_muscle: 'How do I build muscle?',
    lose_weight: 'Help me lose weight',
    workout_plan: 'Generate a workout plan for me',
    meal_plan: 'Create a meal plan',
    progress: 'Analyze my progress',
    next_focus: 'What should I work on next?',
    plateau: 'I\u2019ve hit a plateau',
    nutrition: 'How is my nutrition looking?',
    form: 'Form tips',
    motivation: 'I need motivation',
    recovery: 'How is my recovery?',
    beginner: 'I\u2019m new to lifting',
    one_rep_max: 'What\u2019s my estimated max?',
    warmup: 'Warm-up routine',
    supplements: 'Supplement advice',
    weekly_recap: 'Weekly recap',
    rest_periods: 'Rest between sets',
    swap: 'Suggest an alternative exercise',
    timeline: 'When will I hit my goal?',
    streak: 'How is my consistency?',
    cardio: 'Cardio guide',
    meal_timing: 'Pre/post workout meal',
    weak_point: 'Weak point analysis',
    mobility: 'How can I improve mobility?',
    sleep: 'How can I sleep better?',
    hydration: 'How much water should I drink?',
    core_abs: 'Best ab exercises?',
    home_workout: 'Workout with no equipment',
    fasting: 'Should I try intermittent fasting?',
    injury_prevention: 'How do I lift without getting hurt?',
    fill_macros: 'What should I eat to hit my macros?',
    weekly_split_plan: 'Plan my training week',
    progress_photos: 'How do progress photos work?',
};

function topicPhrase(topic) {
    if (!topic) return null;
    return COACH_TOPIC_PHRASES[topic.id] || null;
}

function buildDidYouMeanChips(ranked, startIdx) {
    const out = [];
    for (let i = startIdx; i < ranked.length && out.length < 3; i++) {
        const phrase = topicPhrase(ranked[i].topic);
        if (phrase && !out.includes(phrase)) out.push(phrase);
    }
    while (out.length < 3) {
        const filler = ['Analyze my progress', 'Generate a workout plan for me', 'How is my nutrition looking?'].find(p => !out.includes(p));
        if (!filler) break;
        out.push(filler);
    }
    return out.slice(0, 3);
}

function buildDidYouMeanResponse(text, ranked, ctx) {
    let html = `<p>I'm not 100% sure what you're asking, but I can help with one of these. Tap a chip below or rephrase your question.</p>`;
    html += `<ul>`;
    for (let i = 0; i < Math.min(ranked.length, 3); i++) {
        const phrase = topicPhrase(ranked[i].topic);
        if (phrase) html += `<li>${escapeHtml(phrase)}</li>`;
    }
    html += `</ul>`;
    html += `<p style="color:var(--text-muted);font-size:13px">Or try: <em>"how can I get stronger"</em>, <em>"plan my week"</em>, <em>"what should I eat?"</em></p>`;
    return html;
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

function rankCoachIntents(text) {
    if (!text || !TOPIC_RESPONSES || !TOPIC_RESPONSES.topics) return [];
    const lower = text.toLowerCase();
    const tokens = tokenizeForCoach(text);
    if (tokens.length === 0) return [];
    const { wordHits, groupHits } = expandTokensWithSynonyms(tokens);

    const scored = [];
    TOPIC_RESPONSES.topics.forEach(topic => {
        let score = 0;
        for (const kw of topic.keywords) {
            try {
                if (new RegExp(kw, 'i').test(lower)) score += 5;
            } catch (e) { /* invalid regex — skip */ }
            const kwTokens = tokenizeForCoach(kw.replace(/[\\.*+?^${}()|[\]]/g, ' '));
            kwTokens.forEach(kt => {
                if (wordHits.has(kt)) score += 2;
                const groups = COACH_SYNONYM_INDEX[kt];
                if (groups) groups.forEach(g => { if (groupHits.has(g)) score += 1; });
            });
        }
        if (topic.id === 'greeting' && tokens.length > 2) score -= 4;
        if (score > 0) scored.push({ topic, score });
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
}

