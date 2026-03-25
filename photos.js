// =============================================
// FaithFit - Coach Photo Integration
// =============================================

let pendingPhoto = null; // base64 data of attached photo

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
            let w = img.width;
            let h = img.height;
            if (w > maxWidth) {
                h = Math.round(h * (maxWidth / w));
                w = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
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

// --- Photo Analysis Engine ---
function analyzePhoto(ctx, userText) {
    const unit = wu();
    const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'there';
    const goal = ctx.profile.goal || 'gain';
    const lower = userText.toLowerCase();

    let html = '';

    // Determine what kind of feedback they want
    const wantsForm = /form|check|technique|doing.*right|correct|posture/.test(lower);
    const wantsProgress = /progress|change|different|transform|before|after|how.*look/.test(lower);
    const wantsPose = /pose|flex|posing|stage|competition/.test(lower);
    const wantsBf = /body\s?fat|bf%|lean|percentage|estimate/.test(lower);

    if (wantsForm) {
        html += `<h3>Form Check Feedback</h3>`;
        html += `<p>I can see you've attached a photo — great initiative checking your form!</p>`;
        html += `<p>Here's what to self-check in your photo:</p>`;
        html += `<ul>`;
        html += `<li><strong>Spine position:</strong> Is your back neutral? Look for rounding in the lower back or excessive arch.</li>`;
        html += `<li><strong>Joint alignment:</strong> Knees tracking over toes? Elbows at the right angle? Wrists straight?</li>`;
        html += `<li><strong>Bar path:</strong> Is the bar/weight in the right position relative to your body?</li>`;
        html += `<li><strong>Depth:</strong> For squats, are you hitting parallel? For bench, is the bar touching your chest?</li>`;
        html += `<li><strong>Bracing:</strong> Does your core look tight? You should see no "soft" midsection during heavy lifts.</li>`;
        html += `</ul>`;
        html += `<h3>Pro Tips</h3>`;
        html += `<ul>`;
        html += `<li>Film from a 45-degree angle for the best view of most lifts</li>`;
        html += `<li>Side view is best for squats and deadlifts</li>`;
        html += `<li>Front view is best for bench press and overhead press</li>`;
        html += `<li>Compare your form to your earlier photos to track improvements</li>`;
        html += `</ul>`;
        html += `<p>Ask me about any specific exercise (e.g., "how should my squat look?") and I'll give detailed cues!</p>`;
    } else if (wantsBf) {
        html += `<h3>Body Composition Assessment Tips</h3>`;
        html += `<p>Thanks for sharing your photo! Here's how to gauge your body fat from progress photos:</p>`;
        html += `<h3>Visual Body Fat Reference (Male)</h3>`;
        html += `<ul>`;
        html += `<li><strong>25-30%:</strong> No visible muscle definition, soft midsection, round face</li>`;
        html += `<li><strong>20-25%:</strong> Some muscle shape visible, slight belly, arms show some definition</li>`;
        html += `<li><strong>15-20%:</strong> Muscle definition visible in arms/shoulders, faint upper abs, V-taper forming</li>`;
        html += `<li><strong>12-15%:</strong> Visible abs (top 2-4), veins in arms, clear muscle separation</li>`;
        html += `<li><strong>10-12%:</strong> Full six-pack, visible obliques, vascularity, striated shoulders</li>`;
        html += `<li><strong>8-10%:</strong> Competition lean, full striations, very vascular, unsustainable long-term</li>`;
        html += `</ul>`;

        if (ctx.currentWeight > 0) {
            html += insightHtml(`At ${lbsToDisplay(ctx.currentWeight)} ${unit}, if you're around 20% body fat, you're carrying ~${lbsToDisplay(Math.round(ctx.currentWeight * 0.2))} ${unit} of fat and ~${lbsToDisplay(Math.round(ctx.currentWeight * 0.8))} ${unit} of lean mass. ${goal === 'lose' ? 'Getting to 15% would mean losing about ' + lbsToDisplay(Math.round(ctx.currentWeight * 0.05)) + ' ' + unit + ' of fat.' : ''}`);
        }

        html += `<h3>Best Practices for Tracking</h3>`;
        html += `<ul>`;
        html += `<li>Take photos at the same time each day (morning, after bathroom, before eating)</li>`;
        html += `<li>Same lighting and same pose every time</li>`;
        html += `<li>Front, side, and back views give the full picture</li>`;
        html += `<li>Photos are more reliable than the scale — muscle is denser than fat</li>`;
        html += `</ul>`;
    } else if (wantsPose) {
        html += `<h3>Posing Guide</h3>`;
        html += `<p>Great photo! Here are the standard physique poses to practice:</p>`;
        html += `<h3>Essential Poses</h3>`;
        html += `<ul>`;
        html += `<li><strong>Front Double Bicep:</strong> Arms up, fists clenched, flex biceps. Flare lats, tighten abs, spread legs slightly.</li>`;
        html += `<li><strong>Front Lat Spread:</strong> Hands on hips, push elbows forward, spread lats wide. Shows your V-taper.</li>`;
        html += `<li><strong>Side Chest:</strong> Turn to the side, press far arm against near arm, flex chest and bicep. Bend near knee slightly.</li>`;
        html += `<li><strong>Back Double Bicep:</strong> Same as front but from behind. Shows back width and rear delt development.</li>`;
        html += `<li><strong>Abs & Thighs:</strong> One arm behind head, crunch abs, flex one leg forward. Shows core definition.</li>`;
        html += `</ul>`;
        html += `<h3>Posing Tips</h3>`;
        html += `<ul>`;
        html += `<li>Practice posing weekly — it's a skill that improves with time</li>`;
        html += `<li>Flex EVERYTHING, not just the target muscle</li>`;
        html += `<li>Good lighting (from above and slightly in front) makes a huge difference</li>`;
        html += `<li>Take a deep breath, exhale, then flex for the best ab shot</li>`;
        html += `</ul>`;
    } else {
        // General progress photo feedback
        html += `<h3>Progress Photo Analysis</h3>`;
        html += `<p>Great job documenting your journey, ${name}! Consistency with photos is one of the best ways to track real changes.</p>`;

        if (ctx.weights.length >= 2) {
            const first = ctx.weights[0];
            const last = ctx.weights[ctx.weights.length - 1];
            const diff = last.weight - first.weight;
            html += insightHtml(`Since you started tracking, you've gone from <strong>${lbsToDisplay(first.weight)} ${unit}</strong> to <strong>${lbsToDisplay(last.weight)} ${unit}</strong> (${diff > 0 ? '+' : ''}${lbsToDisplay(Math.abs(diff))} ${unit}). The photo tells the real story though — the scale doesn't show body composition changes.`);
        }

        html += `<h3>What To Look For</h3>`;
        html += `<ul>`;
        html += `<li><strong>Shoulders:</strong> Are they wider/more defined than before? Capped delts are a sign of solid training.</li>`;
        html += `<li><strong>Arms:</strong> Look for increased separation between bicep and tricep heads.</li>`;
        html += `<li><strong>Midsection:</strong> Tighter waist? More visible ab lines? This is often the last place to lean out.</li>`;
        html += `<li><strong>Back:</strong> V-taper development, visible lats, rear delts showing.</li>`;
        html += `<li><strong>Legs:</strong> Quad sweep, hamstring definition, calf size.</li>`;
        html += `</ul>`;

        html += `<h3>Tips For Better Progress Photos</h3>`;
        html += `<ul>`;
        html += `<li>Same time of day (morning is best, before food/water)</li>`;
        html += `<li>Same lighting and location every time</li>`;
        html += `<li>Take front, side, and back poses</li>`;
        html += `<li>Take one relaxed and one flexed shot</li>`;
        html += `<li>Weekly or bi-weekly is the right frequency — daily changes are too subtle</li>`;
        html += `</ul>`;

        // Goal-specific advice
        if (goal === 'lose') {
            html += `<h3>For Your Fat Loss Goal</h3>`;
            html += `<p>Photos are MORE important than the scale for you. As you lose fat and potentially gain muscle, your weight might not change much but your body will look completely different. Trust the mirror and the photos over the number.</p>`;
        } else if (goal === 'gain') {
            html += `<h3>For Your Muscle Building Goal</h3>`;
            html += `<p>Look for gradual increases in muscle fullness and size. Don't worry about small amounts of fat — that's normal during a bulk. Focus on whether your target muscles are growing proportionally.</p>`;
        }
    }

    html += verseHtml({ text: "Do you not know that your bodies are temples of the Holy Spirit, who is in you, whom you have received from God?", ref: "1 Corinthians 6:19" });
    return html;
}
