// =============================================
// Iron & Faith - Coach Photo Integration + Pose Detection
// =============================================

let pendingPhoto = null;
let poseDetector = null;

// --- Photo Handling ---
function handleCoachPhoto(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        pendingPhoto = await resizeImage(e.target.result, 600);
        document.getElementById('coach-preview-img').src = pendingPhoto;
        document.getElementById('coach-photo-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function removeCoachPhoto() {
    pendingPhoto = null;
    document.getElementById('coach-photo-preview').classList.add('hidden');
    document.getElementById('coach-preview-img').src = '';
}

function resizeImage(dataUrl, maxWidth) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = dataUrl;
    });
}

function openLightbox(src) {
    const lb = document.createElement('div');
    lb.className = 'photo-lightbox';
    lb.onclick = () => lb.remove();
    lb.innerHTML = `<img src="${src}" alt="Photo">`;
    document.body.appendChild(lb);
}

// =============================================
// POSE DETECTION ENGINE (TensorFlow.js MoveNet)
// =============================================

async function initPoseDetector() {
    if (poseDetector) return poseDetector;
    try {
        if (typeof poseDetection === 'undefined') return null;
        await tf.ready();
        poseDetector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER }
        );
        return poseDetector;
    } catch (err) {
        console.error('Pose detector failed to load:', err);
        return null;
    }
}

// --- Keypoint indices (COCO) ---
const KP = {
    NOSE: 0, LEFT_EYE: 1, RIGHT_EYE: 2, LEFT_EAR: 3, RIGHT_EAR: 4,
    LEFT_SHOULDER: 5, RIGHT_SHOULDER: 6, LEFT_ELBOW: 7, RIGHT_ELBOW: 8,
    LEFT_WRIST: 9, RIGHT_WRIST: 10, LEFT_HIP: 11, RIGHT_HIP: 12,
    LEFT_KNEE: 13, RIGHT_KNEE: 14, LEFT_ANKLE: 15, RIGHT_ANKLE: 16
};

const MIN_CONF = 0.25;

// --- Math Utilities ---
function angleBetween(a, b, c) {
    const rad = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let deg = Math.abs(rad * 180 / Math.PI);
    if (deg > 180) deg = 360 - deg;
    return Math.round(deg);
}

function kpOk(kp) { return kp && kp.score >= MIN_CONF; }

function getAngle(keypoints, a, b, c) {
    const kpA = keypoints[a], kpB = keypoints[b], kpC = keypoints[c];
    if (!kpOk(kpA) || !kpOk(kpB) || !kpOk(kpC)) return null;
    return angleBetween(kpA, kpB, kpC);
}

function midpoint(kpA, kpB) {
    return { x: (kpA.x + kpB.x) / 2, y: (kpA.y + kpB.y) / 2, score: Math.min(kpA.score, kpB.score) };
}

function verticalAngle(top, bottom) {
    // Angle of the line from bottom to top relative to vertical (0 = perfectly upright)
    const dx = top.x - bottom.x;
    const dy = bottom.y - top.y; // positive = up
    return Math.round(Math.abs(Math.atan2(dx, dy) * 180 / Math.PI));
}

// --- Exercise Detection ---
function detectExercise(text) {
    const t = text.toLowerCase();
    if (/squat|squatting|goblet|front squat|hack squat|leg press/i.test(t)) return 'squat';
    if (/deadlift|rdl|romanian|hip hinge|good morning/i.test(t)) return 'deadlift';
    if (/bench|chest press|push.?up|dumbbell press/i.test(t)) return 'bench';
    if (/overhead|ohp|shoulder press|military press/i.test(t)) return 'overhead_press';
    if (/curl|bicep/i.test(t)) return 'curl';
    if (/row|pull.?up|pullup|chin.?up|lat pull/i.test(t)) return 'row';
    if (/lunge|split squat|step.?up/i.test(t)) return 'lunge';
    if (/plank|core|ab/i.test(t)) return 'plank';
    return 'general';
}

// --- Main Pose Analysis (async) ---
async function analyzePoseFromPhoto(base64, ctx, userText) {
    const detector = await initPoseDetector();
    if (!detector) {
        // TF.js failed to load — fall back to generic
        return analyzePhoto(ctx, userText);
    }

    // Create image and detect pose
    const img = new Image();
    img.src = base64;
    try { await img.decode(); } catch { return analyzePhoto(ctx, userText); }

    let poses;
    try {
        poses = await detector.estimatePoses(img);
    } catch (err) {
        console.error('Pose estimation error:', err);
        return analyzePhoto(ctx, userText);
    }

    if (!poses || poses.length === 0 || !poses[0].keypoints) {
        return noPoseDetected(ctx, userText);
    }

    const keypoints = poses[0].keypoints;
    const confidentCount = keypoints.filter(kp => kp.score >= MIN_CONF).length;

    if (confidentCount < 5) {
        return noPoseDetected(ctx, userText);
    }

    const exercise = detectExercise(userText);

    // Check if user wants non-form feedback (progress/bf/posing)
    const lower = userText.toLowerCase();
    if (/body\s?fat|bf%|percentage|estimate/i.test(lower)) return analyzePhoto(ctx, userText);
    if (/pose|posing|stage|competition/i.test(lower)) return analyzePhoto(ctx, userText);
    if (/progress|transform|before|after/i.test(lower) && exercise === 'general') return analyzePhoto(ctx, userText);

    // Run form analysis
    switch (exercise) {
        case 'squat': return analyzeSquat(keypoints, ctx);
        case 'deadlift': return analyzeDeadlift(keypoints, ctx);
        case 'bench': return analyzeBench(keypoints, ctx);
        case 'overhead_press': return analyzeOHP(keypoints, ctx);
        case 'curl': return analyzeCurl(keypoints, ctx);
        case 'lunge': return analyzeLunge(keypoints, ctx);
        default: return analyzeGeneral(keypoints, ctx, userText);
    }
}

function noPoseDetected(ctx, userText) {
    let html = `<h3>Couldn't Detect Your Pose</h3>`;
    html += `<p>I wasn't able to clearly identify your body position in this photo. For the best analysis:</p>`;
    html += `<ul>`;
    html += `<li><strong>Full body visible</strong> — make sure your whole body (head to feet) is in frame</li>`;
    html += `<li><strong>Good lighting</strong> — avoid dark or backlit environments</li>`;
    html += `<li><strong>Plain background</strong> — busy backgrounds can confuse detection</li>`;
    html += `<li><strong>Side view</strong> works best for squats and deadlifts</li>`;
    html += `<li><strong>One person</strong> in the frame</li>`;
    html += `</ul>`;
    html += `<p>Try again with a clearer photo, or tell me which exercise you're doing and I'll give you form cues to self-check!</p>`;
    // Still fall back to generic advice
    html += `<hr style="border:none;border-top:1px solid var(--border);margin:16px 0">`;
    html += analyzePhoto(ctx, userText);
    return html;
}

// =============================================
// EXERCISE-SPECIFIC ANALYZERS
// =============================================

function feedbackBadge(type) {
    const colors = { good: '#10B981', warning: '#F59E0B', issue: '#EF4444', info: '#4F46E5' };
    const labels = { good: 'GOOD', warning: 'CHECK', issue: 'FIX', info: 'INFO' };
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:${colors[type]}22;color:${colors[type]};margin-right:6px">${labels[type]}</span>`;
}

// --- SQUAT ---
function analyzeSquat(kp, ctx) {
    let html = `<h3>Squat Form Analysis</h3>`;
    html += insightHtml(`Pose detected with ${kp.filter(k => k.score >= MIN_CONF).length}/17 keypoints. Analyzing your squat...`);

    const findings = [];

    // Knee angles
    const lKnee = getAngle(kp, KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE);
    const rKnee = getAngle(kp, KP.RIGHT_HIP, KP.RIGHT_KNEE, KP.RIGHT_ANKLE);
    const kneeAngle = lKnee || rKnee;

    if (kneeAngle !== null) {
        html += `<h3>Depth — Knee Angle: ${kneeAngle}°</h3>`;
        if (kneeAngle < 75) {
            findings.push(feedbackBadge('good') + `<strong>Very deep squat (${kneeAngle}°).</strong> Excellent mobility! Watch for "butt wink" (lower back rounding) at this depth. If your lower back tucks under, stop just above that point.`);
        } else if (kneeAngle < 100) {
            findings.push(feedbackBadge('good') + `<strong>Good depth (${kneeAngle}°).</strong> You're at or below parallel — this is the gold standard for squat depth. Great job.`);
        } else if (kneeAngle < 130) {
            findings.push(feedbackBadge('warning') + `<strong>Slightly above parallel (${kneeAngle}°).</strong> Try to sink 2-3 inches deeper. Cues: "spread the floor with your feet," sit back into your hips more. Work on ankle mobility if your heels rise.`);
        } else {
            findings.push(feedbackBadge('issue') + `<strong>Shallow squat (${kneeAngle}°).</strong> You're well above parallel. This limits quad and glute activation. Work on hip/ankle mobility. Try goblet squats to practice depth, or put small plates under your heels.`);
        }
    }

    // Hip angle (forward lean)
    const lHip = getAngle(kp, KP.LEFT_SHOULDER, KP.LEFT_HIP, KP.LEFT_KNEE);
    const rHip = getAngle(kp, KP.RIGHT_SHOULDER, KP.RIGHT_HIP, KP.RIGHT_KNEE);
    const hipAngle = lHip || rHip;

    if (hipAngle !== null) {
        html += `<h3>Torso — Hip Angle: ${hipAngle}°</h3>`;
        if (hipAngle < 60) {
            findings.push(feedbackBadge('issue') + `<strong>Excessive forward lean (${hipAngle}°).</strong> Your torso is folding too far forward. This puts extra stress on your lower back. Cues: "chest up," "proud chest," brace your core harder. Strengthen your upper back with rows and face pulls.`);
        } else if (hipAngle < 80) {
            findings.push(feedbackBadge('warning') + `<strong>Moderate forward lean (${hipAngle}°).</strong> Some forward lean is normal, especially with low-bar squats. If you're doing high-bar, try to stay more upright. Cue: "elbows under the bar."`);
        } else {
            findings.push(feedbackBadge('good') + `<strong>Good torso position (${hipAngle}°).</strong> Nice and upright. This means good core bracing and ankle mobility.`);
        }
    }

    // Symmetry
    if (lKnee !== null && rKnee !== null) {
        const diff = Math.abs(lKnee - rKnee);
        html += `<h3>Symmetry — L: ${lKnee}° vs R: ${rKnee}°</h3>`;
        if (diff > 15) {
            findings.push(feedbackBadge('issue') + `<strong>Significant asymmetry (${diff}° difference).</strong> Your ${lKnee < rKnee ? 'left' : 'right'} knee is bending more. This could indicate a mobility imbalance or muscle weakness on one side. Try single-leg exercises (Bulgarian split squats) to even it out.`);
        } else if (diff > 8) {
            findings.push(feedbackBadge('warning') + `<strong>Mild asymmetry (${diff}° difference).</strong> Your ${lKnee < rKnee ? 'left' : 'right'} side is going slightly deeper. Keep an eye on this — film from the front to check if one knee caves.`);
        } else {
            findings.push(feedbackBadge('good') + `<strong>Good symmetry (${diff}° difference).</strong> Both sides are working evenly.`);
        }
    }

    // Torso lean via vertical angle
    if (kpOk(kp[KP.LEFT_SHOULDER]) && kpOk(kp[KP.LEFT_HIP])) {
        const lean = verticalAngle(kp[KP.LEFT_SHOULDER], kp[KP.LEFT_HIP]);
        if (lean > 45) {
            findings.push(feedbackBadge('warning') + `<strong>Torso is leaning ${lean}° from vertical.</strong> A slight forward lean is normal, but over 45° means you may need to work on thoracic mobility or ankle flexibility.`);
        }
    }

    html += `<ul>` + findings.map(f => `<li style="margin-bottom:10px;list-style:none">${f}</li>`).join('') + `</ul>`;
    html += buildFormTips('squat');
    html += verseHtml();
    return html;
}

// --- DEADLIFT ---
function analyzeDeadlift(kp, ctx) {
    let html = `<h3>Deadlift Form Analysis</h3>`;
    html += insightHtml(`Pose detected. Analyzing your deadlift...`);
    const findings = [];

    // Hip hinge angle
    const lHip = getAngle(kp, KP.LEFT_SHOULDER, KP.LEFT_HIP, KP.LEFT_KNEE);
    const rHip = getAngle(kp, KP.RIGHT_SHOULDER, KP.RIGHT_HIP, KP.RIGHT_KNEE);
    const hipAngle = lHip || rHip;

    if (hipAngle !== null) {
        html += `<h3>Hip Hinge — Angle: ${hipAngle}°</h3>`;
        if (hipAngle < 70) {
            findings.push(feedbackBadge('good') + `<strong>Deep hip hinge (${hipAngle}°).</strong> Good setup position. Make sure you're not squatting the deadlift — your hips should be higher than your knees.`);
        } else if (hipAngle < 100) {
            findings.push(feedbackBadge('good') + `<strong>Good hip angle (${hipAngle}°).</strong> This looks like a solid hinge position.`);
        } else {
            findings.push(feedbackBadge('warning') + `<strong>Hips may be too high (${hipAngle}°).</strong> If this is at the start of the pull, your hips might be shooting up before the bar moves. Cue: "push the floor away" to engage legs first.`);
        }
    }

    // Back angle (torso lean from vertical)
    const lShoulder = kp[KP.LEFT_SHOULDER], rShoulder = kp[KP.RIGHT_SHOULDER];
    const lHipKp = kp[KP.LEFT_HIP], rHipKp = kp[KP.RIGHT_HIP];
    if ((kpOk(lShoulder) && kpOk(lHipKp)) || (kpOk(rShoulder) && kpOk(rHipKp))) {
        const s = kpOk(lShoulder) ? lShoulder : rShoulder;
        const h = kpOk(lHipKp) ? lHipKp : rHipKp;
        const backLean = verticalAngle(s, h);
        html += `<h3>Back Angle: ${backLean}° from vertical</h3>`;
        if (backLean > 60) {
            findings.push(feedbackBadge('issue') + `<strong>Very horizontal back (${backLean}°).</strong> This puts high stress on your lower back. If this is the starting position, try setting your hips slightly lower. Keep your chest up and lats engaged ("bend the bar around your shins").`);
        } else if (backLean > 40) {
            findings.push(feedbackBadge('good') + `<strong>Normal back angle (${backLean}°).</strong> Some forward lean is expected in a deadlift. Make sure your back is flat (neutral spine), not rounded.`);
        } else {
            findings.push(feedbackBadge('good') + `<strong>Fairly upright (${backLean}°).</strong> If this is at lockout, great. If at the bottom, you may be squatting the weight up — let your hips be a bit higher.`);
        }
    }

    // Knee angle
    const kneeAngle = getAngle(kp, KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE) || getAngle(kp, KP.RIGHT_HIP, KP.RIGHT_KNEE, KP.RIGHT_ANKLE);
    if (kneeAngle !== null) {
        html += `<h3>Knee Angle: ${kneeAngle}°</h3>`;
        if (kneeAngle < 100) {
            findings.push(feedbackBadge('warning') + `<strong>Knees very bent (${kneeAngle}°).</strong> For a conventional deadlift, your knees should be more extended than a squat. You might be "squatting" the deadlift. Hips should be higher than knees at the start.`);
        } else if (kneeAngle < 140) {
            findings.push(feedbackBadge('good') + `<strong>Good knee bend (${kneeAngle}°).</strong> Appropriate amount of knee flexion for the start of a deadlift.`);
        } else {
            findings.push(feedbackBadge('good') + `<strong>Legs nearly straight (${kneeAngle}°).</strong> If this is near lockout, that's perfect. If at the bottom, this looks like a stiff-leg/Romanian deadlift variation.`);
        }
    }

    html += `<ul>` + findings.map(f => `<li style="margin-bottom:10px;list-style:none">${f}</li>`).join('') + `</ul>`;
    html += buildFormTips('deadlift');
    html += verseHtml();
    return html;
}

// --- BENCH PRESS ---
function analyzeBench(kp, ctx) {
    let html = `<h3>Bench Press / Push Form Analysis</h3>`;
    html += insightHtml(`Pose detected. Analyzing your pressing form...`);
    const findings = [];

    // Elbow angles
    const lElbow = getAngle(kp, KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST);
    const rElbow = getAngle(kp, KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW, KP.RIGHT_WRIST);

    if (lElbow !== null || rElbow !== null) {
        const elbow = lElbow || rElbow;
        html += `<h3>Elbow Angle: ${elbow}°</h3>`;
        if (elbow < 60) {
            findings.push(feedbackBadge('good') + `<strong>Deep position (${elbow}°).</strong> If this is the bottom of bench press, you have excellent range of motion. Make sure you're controlling the weight, not bouncing.`);
        } else if (elbow < 100) {
            findings.push(feedbackBadge('good') + `<strong>Good range of motion (${elbow}°).</strong> Solid pressing position.`);
        } else if (elbow < 150) {
            findings.push(feedbackBadge('warning') + `<strong>Partial range (${elbow}°).</strong> If this is the bottom position, you're cutting depth short. Lower the bar until it touches your chest for maximum muscle activation.`);
        } else {
            findings.push(feedbackBadge('info') + `<strong>Arms nearly locked out (${elbow}°).</strong> This is the top/lockout position. Good if you're finishing the rep.`);
        }
    }

    // Elbow symmetry
    if (lElbow !== null && rElbow !== null) {
        const diff = Math.abs(lElbow - rElbow);
        if (diff > 12) {
            findings.push(feedbackBadge('issue') + `<strong>Arm asymmetry (L: ${lElbow}° vs R: ${rElbow}°, ${diff}° diff).</strong> One arm is bending more than the other. This can lead to uneven development and injury. Try dumbbell press to let each arm work independently.`);
        } else {
            findings.push(feedbackBadge('good') + `<strong>Good arm symmetry (L: ${lElbow}° vs R: ${rElbow}°).</strong> Both arms working evenly.`);
        }
    }

    // Wrist over elbow check
    if (kpOk(kp[KP.LEFT_WRIST]) && kpOk(kp[KP.LEFT_ELBOW])) {
        const wristElbowDrift = Math.abs(kp[KP.LEFT_WRIST].x - kp[KP.LEFT_ELBOW].x);
        if (wristElbowDrift > 50) {
            findings.push(feedbackBadge('warning') + `<strong>Wrists may not be stacked over elbows.</strong> For maximum pressing power, keep your wrists directly above your elbows. A drifting wrist puts stress on the joint.`);
        }
    }

    html += `<ul>` + findings.map(f => `<li style="margin-bottom:10px;list-style:none">${f}</li>`).join('') + `</ul>`;
    html += buildFormTips('bench');
    html += verseHtml();
    return html;
}

// --- OVERHEAD PRESS ---
function analyzeOHP(kp, ctx) {
    let html = `<h3>Overhead Press Form Analysis</h3>`;
    html += insightHtml(`Pose detected. Analyzing your OHP...`);
    const findings = [];

    const lElbow = getAngle(kp, KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST);
    const rElbow = getAngle(kp, KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW, KP.RIGHT_WRIST);
    const elbow = lElbow || rElbow;

    if (elbow !== null) {
        html += `<h3>Elbow Angle: ${elbow}°</h3>`;
        if (elbow > 160) {
            findings.push(feedbackBadge('good') + `<strong>Full lockout (${elbow}°).</strong> Great — full extension overhead. Make sure the bar is directly over your shoulders and hips, not out in front.`);
        } else if (elbow > 120) {
            findings.push(feedbackBadge('warning') + `<strong>Partial lockout (${elbow}°).</strong> Try to fully extend your arms at the top. Incomplete lockout means less deltoid activation and less stability.`);
        } else {
            findings.push(feedbackBadge('info') + `<strong>Mid-press position (${elbow}°).</strong> If this is mid-rep, that's fine. Push through the sticking point (around forehead level) by driving your head "through the window" once the bar passes.`);
        }
    }

    // Wrist alignment over shoulders
    if (kpOk(kp[KP.LEFT_WRIST]) && kpOk(kp[KP.LEFT_SHOULDER])) {
        const offsetX = Math.abs(kp[KP.LEFT_WRIST].x - kp[KP.LEFT_SHOULDER].x);
        const overheadY = kp[KP.LEFT_SHOULDER].y - kp[KP.LEFT_WRIST].y;
        if (overheadY > 0 && offsetX > 40) {
            findings.push(feedbackBadge('warning') + `<strong>Bar drifting forward.</strong> At lockout, the bar should be directly over your shoulder joint. If it's out in front, you'll waste energy stabilizing. Cue: push your head through once the bar clears.`);
        } else if (overheadY > 0) {
            findings.push(feedbackBadge('good') + `<strong>Good bar path.</strong> The weight looks well-aligned over your shoulders.`);
        }
    }

    // Back lean
    if (kpOk(kp[KP.LEFT_SHOULDER]) && kpOk(kp[KP.LEFT_HIP])) {
        const lean = verticalAngle(kp[KP.LEFT_SHOULDER], kp[KP.LEFT_HIP]);
        if (lean > 20) {
            findings.push(feedbackBadge('issue') + `<strong>Excessive back lean (${lean}°).</strong> Leaning back turns the OHP into an incline press and stresses your lower back. Squeeze your glutes hard and brace your core to stay upright.`);
        } else {
            findings.push(feedbackBadge('good') + `<strong>Good upright posture (${lean}° lean).</strong> Your core looks engaged.`);
        }
    }

    html += `<ul>` + findings.map(f => `<li style="margin-bottom:10px;list-style:none">${f}</li>`).join('') + `</ul>`;
    html += buildFormTips('ohp');
    html += verseHtml();
    return html;
}

// --- CURL ---
function analyzeCurl(kp, ctx) {
    let html = `<h3>Curl Form Analysis</h3>`;
    html += insightHtml(`Pose detected. Analyzing your curl form...`);
    const findings = [];

    const lElbow = getAngle(kp, KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST);
    const rElbow = getAngle(kp, KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW, KP.RIGHT_WRIST);

    [['Left', lElbow], ['Right', rElbow]].forEach(([side, angle]) => {
        if (angle === null) return;
        if (angle < 40) {
            findings.push(feedbackBadge('good') + `<strong>${side} arm fully contracted (${angle}°).</strong> Great squeeze at the top! Hold for a second for peak contraction.`);
        } else if (angle < 90) {
            findings.push(feedbackBadge('info') + `<strong>${side} arm mid-curl (${angle}°).</strong> Mid-range position. Keep control and avoid swinging.`);
        } else {
            findings.push(feedbackBadge('info') + `<strong>${side} arm extended (${angle}°).</strong> Bottom or near-bottom of the curl.`);
        }
    });

    // Elbow drift - check if elbow moved forward of shoulder
    if (kpOk(kp[KP.LEFT_ELBOW]) && kpOk(kp[KP.LEFT_SHOULDER])) {
        const drift = kp[KP.LEFT_SHOULDER].x - kp[KP.LEFT_ELBOW].x;
        // In a side view, if elbow is significantly in front of shoulder
        if (Math.abs(drift) > 40 && kp[KP.LEFT_ELBOW].y < kp[KP.LEFT_SHOULDER].y) {
            findings.push(feedbackBadge('warning') + `<strong>Elbows drifting forward.</strong> Keep your elbows pinned at your sides. When elbows drift forward, your front delts take over and bicep activation decreases.`);
        } else {
            findings.push(feedbackBadge('good') + `<strong>Elbows look pinned.</strong> Good — this keeps maximum tension on the biceps.`);
        }
    }

    html += `<ul>` + findings.map(f => `<li style="margin-bottom:10px;list-style:none">${f}</li>`).join('') + `</ul>`;
    html += buildFormTips('curl');
    html += verseHtml();
    return html;
}

// --- LUNGE ---
function analyzeLunge(kp, ctx) {
    let html = `<h3>Lunge Form Analysis</h3>`;
    html += insightHtml(`Pose detected. Analyzing your lunge...`);
    const findings = [];

    const lKnee = getAngle(kp, KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE);
    const rKnee = getAngle(kp, KP.RIGHT_HIP, KP.RIGHT_KNEE, KP.RIGHT_ANKLE);

    // Front leg (the more bent one)
    const frontAngle = (lKnee && rKnee) ? Math.min(lKnee, rKnee) : (lKnee || rKnee);
    const backAngle = (lKnee && rKnee) ? Math.max(lKnee, rKnee) : null;
    const frontSide = (lKnee && rKnee && lKnee < rKnee) ? 'left' : 'right';

    if (frontAngle !== null) {
        html += `<h3>Front Knee Angle: ${frontAngle}°</h3>`;
        if (frontAngle < 80) {
            findings.push(feedbackBadge('warning') + `<strong>Front knee very acute (${frontAngle}°).</strong> Your knee might be traveling too far over your toes. Take a longer step to keep shin more vertical.`);
        } else if (frontAngle < 100) {
            findings.push(feedbackBadge('good') + `<strong>Great front knee angle (${frontAngle}°).</strong> Close to 90° is the gold standard for lunges.`);
        } else {
            findings.push(feedbackBadge('warning') + `<strong>Front knee not bent enough (${frontAngle}°).</strong> Try to sink deeper until your front thigh is parallel to the floor.`);
        }
    }

    if (backAngle !== null) {
        html += `<h3>Back Knee Angle: ${backAngle}°</h3>`;
        if (backAngle > 160) {
            findings.push(feedbackBadge('warning') + `<strong>Back leg very straight (${backAngle}°).</strong> Your back knee should bend toward the floor. Step further back to allow proper depth.`);
        } else {
            findings.push(feedbackBadge('good') + `<strong>Back knee bending well (${backAngle}°).</strong>`);
        }
    }

    // Torso upright check
    if (kpOk(kp[KP.LEFT_SHOULDER]) && kpOk(kp[KP.LEFT_HIP])) {
        const lean = verticalAngle(kp[KP.LEFT_SHOULDER], kp[KP.LEFT_HIP]);
        if (lean > 25) {
            findings.push(feedbackBadge('warning') + `<strong>Forward lean detected (${lean}°).</strong> Keep your torso upright during lunges. Cue: "chest up, shoulders back." A forward lean shifts stress to your lower back.`);
        } else {
            findings.push(feedbackBadge('good') + `<strong>Good upright torso (${lean}°).</strong>`);
        }
    }

    html += `<ul>` + findings.map(f => `<li style="margin-bottom:10px;list-style:none">${f}</li>`).join('') + `</ul>`;
    html += buildFormTips('lunge');
    html += verseHtml();
    return html;
}

// --- GENERAL (unknown exercise) ---
function analyzeGeneral(kp, ctx, userText) {
    let html = `<h3>Pose Analysis</h3>`;
    const confidentKps = kp.filter(k => k.score >= MIN_CONF);
    html += insightHtml(`Detected ${confidentKps.length}/17 body points. Here's what I can see:`);
    const findings = [];

    // Overall posture - shoulder-hip alignment
    if (kpOk(kp[KP.LEFT_SHOULDER]) && kpOk(kp[KP.LEFT_HIP])) {
        const lean = verticalAngle(kp[KP.LEFT_SHOULDER], kp[KP.LEFT_HIP]);
        findings.push(`<strong>Torso angle:</strong> ${lean}° from vertical. ${lean < 15 ? 'Very upright posture.' : lean < 35 ? 'Moderate lean — normal for many exercises.' : 'Significant lean — check if this is intentional for your exercise.'}`);
    }

    // Knee angles
    const lKnee = getAngle(kp, KP.LEFT_HIP, KP.LEFT_KNEE, KP.LEFT_ANKLE);
    const rKnee = getAngle(kp, KP.RIGHT_HIP, KP.RIGHT_KNEE, KP.RIGHT_ANKLE);
    if (lKnee || rKnee) {
        findings.push(`<strong>Knee angle:</strong> ${lKnee ? 'L: ' + lKnee + '°' : ''}${lKnee && rKnee ? ' / ' : ''}${rKnee ? 'R: ' + rKnee + '°' : ''}`);
    }

    // Elbow angles
    const lElbow = getAngle(kp, KP.LEFT_SHOULDER, KP.LEFT_ELBOW, KP.LEFT_WRIST);
    const rElbow = getAngle(kp, KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW, KP.RIGHT_WRIST);
    if (lElbow || rElbow) {
        findings.push(`<strong>Elbow angle:</strong> ${lElbow ? 'L: ' + lElbow + '°' : ''}${lElbow && rElbow ? ' / ' : ''}${rElbow ? 'R: ' + rElbow + '°' : ''}`);
    }

    // Hip angles
    const lHip = getAngle(kp, KP.LEFT_SHOULDER, KP.LEFT_HIP, KP.LEFT_KNEE);
    const rHip = getAngle(kp, KP.RIGHT_SHOULDER, KP.RIGHT_HIP, KP.RIGHT_KNEE);
    if (lHip || rHip) {
        findings.push(`<strong>Hip angle:</strong> ${lHip ? 'L: ' + lHip + '°' : ''}${lHip && rHip ? ' / ' : ''}${rHip ? 'R: ' + rHip + '°' : ''}`);
    }

    // Symmetry
    if (lKnee && rKnee) {
        const diff = Math.abs(lKnee - rKnee);
        findings.push(`<strong>Knee symmetry:</strong> ${diff}° difference. ${diff > 12 ? feedbackBadge('warning') + 'Noticeable asymmetry — one side is working harder.' : feedbackBadge('good') + 'Good balance between sides.'}`);
    }

    html += `<ul>` + findings.map(f => `<li style="margin-bottom:8px;list-style:none">${f}</li>`).join('') + `</ul>`;

    html += `<p>For more specific feedback, tell me which exercise you're doing! For example: <strong>"Check my squat form"</strong> or <strong>"How's my deadlift?"</strong></p>`;
    html += verseHtml();
    return html;
}

// --- Form Tips by Exercise ---
function buildFormTips(exercise) {
    const tips = {
        squat: `<h3>Quick Squat Cues</h3><ul>
            <li>Brace your core like you're about to be punched</li>
            <li>Push your knees out over your pinky toes</li>
            <li>Keep your chest up — "proud chest"</li>
            <li>Drive up through your whole foot, not just toes</li>
            <li>Squeeze glutes hard at the top</li></ul>`,
        deadlift: `<h3>Quick Deadlift Cues</h3><ul>
            <li>Bar over mid-foot, shins touching the bar</li>
            <li>Push the floor away — don't pull the bar up</li>
            <li>Keep the bar close — it should scrape your shins</li>
            <li>Hips and shoulders rise at the same rate</li>
            <li>Lock out with glutes — don't hyperextend</li></ul>`,
        bench: `<h3>Quick Bench Cues</h3><ul>
            <li>Retract shoulder blades — "put them in your back pockets"</li>
            <li>Tuck elbows to 45-75° — don't flare to 90°</li>
            <li>Touch the bar to your lower chest/sternum</li>
            <li>Push feet hard into the floor for leg drive</li>
            <li>Press up and slightly back toward the rack</li></ul>`,
        ohp: `<h3>Quick OHP Cues</h3><ul>
            <li>Squeeze glutes to stabilize your base</li>
            <li>Brace core hard — no excessive back lean</li>
            <li>Push your head "through the window" after the bar passes</li>
            <li>Lock out directly over shoulders/ears</li>
            <li>Lower with control back to collarbone</li></ul>`,
        curl: `<h3>Quick Curl Cues</h3><ul>
            <li>Pin elbows at your sides — don't let them drift forward</li>
            <li>Squeeze hard at the top for 1 second</li>
            <li>Lower slowly (3 seconds) for maximum growth</li>
            <li>No swinging — if you swing, the weight is too heavy</li>
            <li>Keep wrists neutral, don't flex them</li></ul>`,
        lunge: `<h3>Quick Lunge Cues</h3><ul>
            <li>Take a long step — front shin should be vertical</li>
            <li>Back knee drops straight down toward the floor</li>
            <li>Keep torso upright — chest up, shoulders back</li>
            <li>Push through the front heel to stand up</li>
            <li>Keep your core braced throughout</li></ul>`,
    };
    return tips[exercise] || '';
}

// --- Fallback (no pose detection / non-form requests) ---
function analyzePhoto(ctx, userText) {
    const unit = wu();
    const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'there';
    const goal = ctx.profile.goal || 'gain';
    const lower = userText.toLowerCase();
    let html = '';

    if (/body\s?fat|bf%|lean|percentage|estimate/.test(lower)) {
        html += `<h3>Body Composition Guide</h3>`;
        html += `<ul>`;
        html += `<li><strong>25-30%:</strong> No visible definition, soft midsection</li>`;
        html += `<li><strong>20-25%:</strong> Some shape visible, slight belly</li>`;
        html += `<li><strong>15-20%:</strong> Arms/shoulders defined, faint upper abs</li>`;
        html += `<li><strong>12-15%:</strong> Visible abs, veins in arms, clear separation</li>`;
        html += `<li><strong>10-12%:</strong> Full six-pack, vascularity, striated shoulders</li>`;
        html += `</ul>`;
        if (ctx.currentWeight > 0) {
            html += insightHtml(`At ${lbsToDisplay(ctx.currentWeight)} ${unit}: ~20% BF = ~${lbsToDisplay(Math.round(ctx.currentWeight * 0.8))} ${unit} lean mass.`);
        }
    } else if (/pose|posing|flex|stage/.test(lower)) {
        html += `<h3>Posing Tips</h3><ul>`;
        html += `<li><strong>Front Double Bicep:</strong> Arms up, flex biceps, flare lats, tighten abs</li>`;
        html += `<li><strong>Side Chest:</strong> Turn sideways, press arms together, flex chest</li>`;
        html += `<li><strong>Back Double Bicep:</strong> Same from behind, shows back width</li>`;
        html += `<li>Flex EVERYTHING, good lighting, practice weekly</li></ul>`;
    } else {
        html += `<h3>Progress Photo Tips</h3>`;
        html += `<p>Great job tracking visually, ${name}!</p>`;
        if (ctx.weights.length >= 2) {
            const diff = ctx.weights[ctx.weights.length-1].weight - ctx.weights[0].weight;
            html += insightHtml(`Weight change: ${diff > 0 ? '+' : ''}${lbsToDisplay(Math.abs(diff))} ${unit} since you started. Photos show what the scale can't!`);
        }
        html += `<ul><li>Same time, lighting, and pose each time</li><li>Front + side + back for full picture</li><li>Weekly or bi-weekly is ideal</li></ul>`;
    }

    html += verseHtml({ text: "Do you not know that your bodies are temples of the Holy Spirit?", ref: "1 Corinthians 6:19" });
    return html;
}
