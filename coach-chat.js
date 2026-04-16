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

function exportCoachChat() {
    const history = loadCoachHistoryEntries();
    if (!history.length) { showToast('No chat history to export'); return; }
    const lines = history.map(e => {
        const ts = e.time ? new Date(e.time).toLocaleString() : '';
        if (e.role === 'user') return `[${ts}] You:\n${e.text || ''}`;
        const plain = (e.html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
            .replace(/<li>/gi, '• ').replace(/<\/li>/gi, '\n').replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n').trim();
        return `[${ts}] Coach:\n${plain}`;
    });
    const text = 'Iron Faith Coach — Chat Export\n' + '='.repeat(40) + '\n\n' + lines.join('\n\n---\n\n');
    if (navigator.share) {
        navigator.share({ title: 'Coach Chat Export', text }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
            () => showToast('Chat copied to clipboard', 'success'),
            () => showToast('Could not copy', 'error')
        );
    } else {
        showToast('Share not available on this device', 'error');
    }
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

    addBotMessage(welcome, { suggestions: getSmartStarterChips(ctx) });
}

// Pick starter suggestions based on the user's actual state — what's most
// useful right now beats a static list.
function getSmartStarterChips(ctx) {
    const chips = [];
    const totalWorkouts = ctx.workouts.length;
    const todayHasWorkout = ctx.todayWorkouts.length > 0;
    const todayHasMeal = ctx.todayMeals.length > 0;
    const hour = new Date().getHours();

    if (totalWorkouts === 0) {
        // Brand-new user
        chips.push('Generate a workout plan for me');
        chips.push('How do I get started lifting?');
        chips.push('Set my calorie target');
        return chips;
    }
    if (totalWorkouts < 5) {
        chips.push('Generate a workout plan for me');
        chips.push('How can I get stronger?');
        chips.push('Warm-up routine');
        return chips;
    }
    // Established user — recommend based on time and gaps
    if (!todayHasWorkout && hour < 20) {
        chips.push('What should I work on next?');
    } else if (todayHasWorkout) {
        chips.push('Analyze my progress');
    }
    if (!todayHasMeal) {
        chips.push('What should I eat today?');
    } else {
        chips.push('How is my nutrition looking?');
    }
    if (ctx.weekDays >= 4) {
        chips.push('How is my recovery?');
    } else if (ctx.weekDays <= 2) {
        chips.push('How can I stay consistent?');
    } else {
        chips.push('Weak point analysis');
    }
    // Nudge a progress photo if it's been a while (or never)
    const pp = ctx.progressPhotos;
    if (pp && (pp.count === 0 || (pp.daysSinceLast !== null && pp.daysSinceLast >= 14))) {
        chips.push('How do progress photos work?');
    }
    // Ensure 3 chips
    const fallback = ['How can I get stronger?', 'Generate a workout plan for me', 'Weekly recap'];
    while (chips.length < 3) {
        const next = fallback.find(c => !chips.includes(c));
        if (!next) break;
        chips.push(next);
    }
    return chips.slice(0, 3);
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

// Streaming bot bubble: creates an empty message, exposes appendText to
// grow it as LLM deltas arrive, and finalize() to swap in sanitized HTML
// + suggestions and persist to history.
function appendStreamingBotMessage() {
    const container = document.getElementById('coach-messages');
    const wrap = document.createElement('div');
    wrap.className = 'coach-msg-wrap bot';
    const msg = document.createElement('div');
    msg.className = 'coach-msg bot streaming';
    msg.textContent = '';
    wrap.appendChild(msg);
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    const time = Date.now();

    return {
        appendText(txt) {
            msg.textContent += txt;
            container.scrollTop = container.scrollHeight;
        },
        finalize(finalHtml, suggestions, planId) {
            msg.classList.remove('streaming');
            msg.innerHTML = finalHtml;
            if (planId && window._coachPlans && window._coachPlans[planId]) {
                const saveBar = document.createElement('div');
                saveBar.className = 'coach-plan-actions';
                saveBar.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="saveCoachPlanToRoutines('${planId}')">&#x2B; Save as routine</button>`;
                msg.appendChild(saveBar);
            }
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
            container.scrollTop = container.scrollHeight;
            const entry = { role: 'bot', html: finalHtml, time, suggestions };
            if (planId) {
                entry.planId = planId;
                entry.planRoutine = window._coachPlans?.[planId] || null;
            }
            saveCoachHistoryEntry(entry);
        },
        remove() { wrap.remove(); },
    };
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
        return ['How long should I rest between sets?', 'Check my progressive overload', 'Calculate my macros'];
    }
    if (/meal plan|what.*eat|food|macro|calorie|protein/.test(lower)) {
        return ['Calculate my macros', 'How is my nutrition looking?', 'Pre/post workout meal'];
    }
    if (/progress|recap|how am i doing|analyze/.test(lower)) {
        return ['Check my progressive overload', 'Weak point analysis', 'Calculate my macros'];
    }
    if (/plateau|stuck|stall/.test(lower)) {
        return ['Check my progressive overload', 'Give me a PPL split', 'How is my recovery?'];
    }
    if (/1rm|max|estimated/.test(lower)) {
        return ['Check my progressive overload', 'How can I get stronger?', 'Give me a program'];
    }
    if (/streak|consistency/.test(lower)) {
        return ['What should I work on next?', 'Analyze my progress', 'Weekly recap'];
    }
    if (/warm.?up/.test(lower)) {
        return ['Give me a program', 'Tempo & rep speed guide', 'Cardio guide'];
    }
    if (/weak point|lagging/.test(lower)) {
        return ['Give me a PPL split', 'Check my progressive overload', 'Analyze my progress'];
    }
    if (/hurt|pain|injury|sore/.test(lower)) {
        return ['Exercise alternatives', 'How is my recovery?', 'When should I see a doctor?'];
    }
    if (/equipment|home|no gym|bodyweight/.test(lower)) {
        return ['Home workout routine', 'Bodyweight exercises', 'Give me a program'];
    }
    if (/overload|increase|progression/.test(lower)) {
        return ['Give me a program', 'Calculate my macros', 'Analyze my progress'];
    }
    return ['Analyze my progress', 'Calculate my macros', 'Give me a PPL split'];
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
    if (!text) return;
    input.value = '';
    processCoachInput(text);
}

// --- Form-check photo upload ---
function coachPickPhoto() {
    if (typeof coachLLMAvailable !== 'function' || !coachLLMAvailable()) {
        showToast('Form check needs your Claude API key \u2014 set it in Profile', 'warn');
        return;
    }
    const seen = localStorage.getItem('faithfit_photoTipsSeen');
    if (!seen) {
        showPhotoTipsOverlay();
        return;
    }
    const input = document.getElementById('coach-photo-file');
    if (input) input.click();
}

function showPhotoTipsOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'photo-tips-overlay';
    overlay.innerHTML = `
        <div class="photo-tips-dialog">
            <div class="photo-tips-icon">&#x1F4F7;</div>
            <h3>Form Check Tips</h3>
            <ul class="photo-tips-list">
                <li><strong>Side angle</strong> — gives the best view of your spine and joint positions</li>
                <li><strong>Full body in frame</strong> — head to feet so Coach can see everything</li>
                <li><strong>Good lighting</strong> — avoid backlit or dark gym corners</li>
                <li><strong>Mid-rep capture</strong> — the bottom of a squat or the lockout tells the most</li>
                <li><strong>Fitted clothing</strong> — loose shirts hide posture cues</li>
            </ul>
            <button class="btn btn-primary btn-full" onclick="dismissPhotoTips(this)">Got it — choose photo</button>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
}

function dismissPhotoTips(btn) {
    localStorage.setItem('faithfit_photoTipsSeen', '1');
    const overlay = btn.closest('.photo-tips-overlay');
    if (overlay) { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 250); }
    const input = document.getElementById('coach-photo-file');
    if (input) input.click();
}

async function coachHandlePhotoSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await sendCoachPhoto(file);
}

async function sendCoachPhoto(file) {
    if (typeof coachLLMAvailable !== 'function' || !coachLLMAvailable()) {
        showToast('Form check needs your Claude API key', 'warn');
        return;
    }
    initCoach();
    DB.set('coachUsed', true);

    let dataUrl;
    try {
        dataUrl = await coachResizeImage(file, 1024, 0.85);
    } catch (e) {
        console.error('Image resize failed', e);
        showToast('Could not read that image', 'error');
        return;
    }

    const time = Date.now();
    const promptText = 'Form check \u2014 what should I fix?';
    renderUserMessage(promptText, time, dataUrl);
    saveCoachHistoryEntry({ role: 'user', text: promptText, time, photo: dataUrl });

    const ctx = getCoachContext();
    const bubble = appendStreamingBotMessage();
    const llm = await askCoachLLM({
        text: 'The user attached a photo of themselves performing an exercise. (1) Identify the movement. (2) Give 2\u20134 specific, actionable form cues \u2014 call out what is off AND what looks solid. (3) If something looks concerning (rounded back on deadlift, knees caving on squat, etc.), say so plainly. (4) If the image is blurry / obscured / not an exercise, say that instead of guessing. Cite visible details to prove you saw the image.',
        ctx,
        imageDataUrl: dataUrl,
        onDelta: (chunk) => bubble.appendText(chunk),
    });

    if (llm?.html) {
        bubble.finalize(llm.html, ['Cues for next set', 'Alternate exercises for this movement', 'How to progress this lift'], null);
        _coachMemory.push({ input: '[photo]', pattern: 'form_check' });
    } else {
        bubble.remove();
        addBotMessage('<p>I could not analyze that image \u2014 ' + (llm?.error || 'unknown error') + '. Try again, or check your API key in Profile.</p>');
    }
}

function processCoachInput(text) {
    initCoach();
    DB.set('coachUsed', true);

    addUserMessage(text);
    showTyping();

    setTimeout(async () => {
        const ctx = getCoachContext();
        window._lastCoachPlanId = null;

        const corrected = _correctTypos(text);

        // --- 1) Local handlers: fast, free, high-confidence paths first.
        let response = _tryFollowUp(corrected, ctx);
        if (!response) {
            const gk = _tryGeneralKnowledge(corrected, ctx);
            if (gk) { response = gk; _coachMemory.push({ input: corrected, pattern: 'general_knowledge' }); }
        }
        if (!response) {
            const mg = _tryMuscleGroupQA(corrected, ctx);
            if (mg) response = mg;
        }
        if (!response) {
            const exR = _tryExerciseQA(corrected, ctx);
            if (exR) {
                response = exR;
                const exd = _detectExercise(corrected.toLowerCase());
                const pat = _detectQuestionPattern(corrected.toLowerCase());
                _coachMemory.push({ input: corrected, exercise: exd ? exd.name : null, pattern: pat || 'exercise_qa' });
            }
        }
        let ranked = null;
        if (!response) {
            ranked = rankCoachIntents(corrected);
            if (ranked.length > 0 && ranked[0].score >= 5) {
                response = ranked[0].topic.handler(ctx, corrected);
                _coachMemory.push({ input: corrected, topicId: ranked[0].topic.id });
                window._coachLastTopicId = ranked[0].topic.id;
            }
        }

        if (response) {
            removeTyping();
            const planId = window._lastCoachPlanId || null;
            addBotMessage(response, { suggestions: suggestFollowUps(corrected, ctx), planId });
            window._lastCoachPlanId = null;
            return;
        }

        // --- 2) LLM fallback (streaming). Only when a key is configured.
        if (typeof coachLLMAvailable === 'function' && coachLLMAvailable()) {
            removeTyping();
            const bubble = appendStreamingBotMessage();
            const llm = await askCoachLLM({
                text: corrected,
                ctx,
                onDelta: (chunk) => bubble.appendText(chunk),
            });
            if (llm?.html) {
                bubble.finalize(llm.html, suggestFollowUps(corrected, ctx), null);
                _coachMemory.push({ input: corrected, pattern: 'llm' });
                return;
            }
            bubble.remove();
            console.warn('Coach LLM failed, falling back to local:', llm?.error, llm?.message);
        } else {
            removeTyping();
        }

        // --- 3) Low-confidence local fallback: did-you-mean / generic.
        let finalResponse, finalSuggestions = null;
        let lowConfidence = false;
        if (ranked && ranked.length > 0 && ranked[0].score >= 3) {
            finalResponse = ranked[0].topic.handler(ctx, corrected);
            finalSuggestions = buildDidYouMeanChips(ranked, 1);
            _coachMemory.push({ input: corrected, topicId: ranked[0].topic.id });
            window._coachLastTopicId = ranked[0].topic.id;
        } else if (ranked && ranked.length > 0) {
            finalResponse = buildDidYouMeanResponse(corrected, ranked, ctx);
            finalSuggestions = buildDidYouMeanChips(ranked, 0);
            lowConfidence = true;
        } else {
            finalResponse = TOPIC_RESPONSES.fallback(ctx, corrected);
            lowConfidence = true;
        }

        // Soft upsell: if we fell through to low-confidence local and the LLM
        // isn't configured, nudge the user to enable it (once per session).
        const keyMissing = !(typeof coachLLMAvailable === 'function' && coachLLMAvailable());
        if (lowConfidence && keyMissing && !window._coachUpsellShown) {
            window._coachUpsellShown = true;
            finalResponse += '<div class="coach-upsell"><strong>Want a smarter answer?</strong><p>Enable the AI Coach (Claude) for deep questions like this. You bring your own API key &mdash; no subscription, no markup. It takes 60 seconds.</p><button class="btn btn-primary btn-sm" onclick="switchTab(\'profile\');setTimeout(()=>{const b=document.getElementById(\'coach-ai-on\');if(b)b.click();const i=document.getElementById(\'coach-ai-key\');if(i)i.focus();},300)">Enable AI Coach</button></div>';
        }

        const planId = window._lastCoachPlanId || null;
        addBotMessage(finalResponse, {
            suggestions: finalSuggestions || suggestFollowUps(corrected, ctx),
            planId,
        });
        window._lastCoachPlanId = null;
    }, 400 + Math.random() * 600);
}
