// =============================================
// Iron Faith Coach — Claude Haiku fallback
// Routes open-ended / low-confidence queries to Claude with
// full user context, streams the response, sanitizes HTML.
// If no API key or the call fails, callers fall back to the
// local keyword engine.
// =============================================

const COACH_LLM_KEY_STORAGE = 'coachApiKey';
const COACH_LLM_MODEL = 'claude-haiku-4-5-20251001';
const COACH_LLM_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const COACH_LLM_TIMEOUT_MS = 25000;
const COACH_LLM_MAX_TOKENS = 900;

function getCoachApiKey() {
    try { return localStorage.getItem('faithfit_' + COACH_LLM_KEY_STORAGE) || ''; }
    catch (_) { return ''; }
}

function setCoachApiKey(key) {
    const trimmed = (key || '').trim();
    try {
        if (trimmed) localStorage.setItem('faithfit_' + COACH_LLM_KEY_STORAGE, trimmed);
        else localStorage.removeItem('faithfit_' + COACH_LLM_KEY_STORAGE);
    } catch (_) {}
}

function coachLLMAvailable() {
    return !!getCoachApiKey();
}

// Static instructions — cacheable across requests so repeat calls are cheap.
const COACH_LLM_SYSTEM_PROMPT = `You are the Iron Faith AI coach — a fitness and faith companion embedded in the Iron Faith app (PWA).

ROLE
- Help the user train smarter and stay spiritually grounded.
- You are not a medical professional. For sharp / persistent / radiating pain or suspected injury, defer to a clinician.

VOICE
- Direct, warm, encouraging. No hedging, no filler, no pep-talk preamble.
- 1–4 short paragraphs OR a tight bulleted list. Never a wall of text.
- Jump straight to the answer. Skip greetings ("Hey!", "Sure!", "Great question!").
- When faith is genuinely relevant, you MAY include one short Bible verse with citation. Never force it.

DATA USAGE — NON-NEGOTIABLE
- The USER CONTEXT block is live data from their app (profile, workouts, weights, PRs, nutrition). Treat it as ground truth.
- Whenever a question touches their training, cite specific numbers ("your bench has held 185 for 3 sessions", "you're averaging 142g protein, short of your 170 target"). Prove you're paying attention.
- If a question is abstract ("why do we deload?"), answer abstractly — do NOT force-fit their data.
- If their message contradicts the data (says they haven't squatted in months, but logs show a squat yesterday), gently point it out.

OUTPUT FORMAT — STRICT
- Output simple HTML only. Allowed tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>.
- NO headings (<h1>–<h6>), NO code blocks, NO <script>/<style>, NO links, NO images.
- Bold the numbers that matter: <strong>185 lbs</strong>, <strong>3 sessions</strong>.
- Verse format: <em>"...verse text..."</em> — Reference.

SAFETY
- Injury / pain that sounds non-trivial → recommend a clinician.
- Never prescribe supplement / medication doses.
- Respect stated experience level and equipment — don't tell a bodyweight-only user to barbell squat.`;

// Dynamic context — rebuilt every turn. Kept concise; Haiku handles
// long contexts fine but shorter = faster + cheaper.
function buildCoachLLMUserContext(ctx) {
    const p = ctx.profile || {};
    const lines = [];
    lines.push('USER CONTEXT (live app data — ground truth):');
    lines.push('');
    lines.push('Profile:');
    if (p.name) lines.push(`  Name: ${p.name}`);
    if (p.age) lines.push(`  Age: ${p.age}`);
    if (p.gender) lines.push(`  Gender: ${p.gender}`);
    if (ctx.currentWeight) lines.push(`  Weight: ${ctx.currentWeight} lbs`);
    if (p.heightFeet || p.heightInches) lines.push(`  Height: ${p.heightFeet || 0}'${p.heightInches || 0}"`);
    if (p.goal) lines.push(`  Goal: ${p.goal}`);
    if (p.activity) lines.push(`  Activity: ${p.activity}`);
    if (ctx.experience) lines.push(`  Experience: ${ctx.experience}`);
    if (ctx.equipment) lines.push(`  Equipment: ${ctx.equipment}`);
    const tdee = (typeof computeTDEE === 'function') ? computeTDEE(ctx) : null;
    if (tdee) lines.push(`  Est. TDEE: ${tdee} kcal`);

    lines.push('');
    lines.push(`Training: ${ctx.workouts.length} total sets logged, ${ctx.weekWorkouts.length} this week across ${ctx.weekDays} distinct day(s).`);
    lines.push(`Bodyweight trend: ${ctx.weightTrend}.`);

    // Recent workouts — last 15
    const recent = (ctx.workouts || []).slice(-15);
    if (recent.length) {
        lines.push('');
        lines.push('Recent sets (oldest → newest):');
        recent.forEach(w => {
            const best = w.sets?.length ? Math.max(...w.sets.map(s => s.weight || 0)) : 0;
            const reps = w.sets?.length ? w.sets.map(s => s.reps).join('/') : '';
            const rpes = w.sets?.length && w.sets.some(s => s.rpe) ? ' @ RPE ' + w.sets.map(s => s.rpe || '-').join('/') : '';
            lines.push(`  ${w.date} ${w.name}: top ${best}×${reps}${rpes}`);
        });
    }

    // PRs — top 10
    const prs = ctx.exercisePRs || {};
    const prEntries = Object.entries(prs).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (prEntries.length) {
        lines.push('');
        lines.push('Current PRs (top 10 by load):');
        prEntries.forEach(([n, w]) => lines.push(`  ${n}: ${w} lbs`));
    }

    if (ctx.stagnant?.length) {
        lines.push('');
        lines.push(`Stalled lifts (same top weight 4+ sessions): ${ctx.stagnant.join(', ')}`);
    }
    if (ctx.overloadReady?.length) {
        lines.push('');
        lines.push('Ready for load increase:');
        ctx.overloadReady.forEach(o => lines.push(`  ${o.name}: ${o.currentMax} → try ${o.currentMax + o.suggestedIncrease}`));
    }

    if (ctx.weekMuscleVolume) {
        const vols = Object.entries(ctx.weekMuscleVolume).filter(([, v]) => v > 0);
        if (vols.length) {
            lines.push('');
            lines.push('Weekly muscle volume (sets):');
            vols.forEach(([g, v]) => lines.push(`  ${g}: ${v}`));
        }
    }

    const weights = ctx.weights || [];
    if (weights.length) {
        const last8 = weights.slice(-8);
        lines.push('');
        lines.push('Bodyweight log (last 8):');
        last8.forEach(w => lines.push(`  ${w.date}: ${w.weight} lbs`));
    }

    const n = ctx.weekNutrition;
    if (n && n.days > 0) {
        lines.push('');
        lines.push(`Nutrition avg (last ${n.days} logged days): ${n.calories} kcal, ${n.protein}p / ${n.carbs}c / ${n.fat}f.`);
    }

    lines.push('');
    lines.push(`Today: ${ctx.todayWorkouts.length} set(s) logged, ${ctx.todayMeals.length} meal(s) logged.`);

    return lines.join('\n');
}

// Pull recent user/bot exchanges from persistent history. The last entry
// is the user turn we're about to answer (already saved by addUserMessage).
function buildCoachLLMMessages() {
    const history = (typeof loadCoachHistoryEntries === 'function') ? loadCoachHistoryEntries() : [];
    const tail = history.slice(-12);
    const messages = [];
    for (const entry of tail) {
        if (entry.role === 'user' && entry.text) {
            messages.push({ role: 'user', content: entry.text });
        } else if (entry.role === 'bot' && entry.html) {
            const plain = stripHtmlForLLM(entry.html);
            if (plain) messages.push({ role: 'assistant', content: plain });
        }
    }
    while (messages.length && messages[0].role === 'assistant') messages.shift();
    const out = [];
    for (const m of messages) {
        if (out.length && out[out.length - 1].role === m.role) {
            out[out.length - 1].content += '\n\n' + m.content;
        } else out.push({ ...m });
    }
    return out;
}

function stripHtmlForLLM(html) {
    return String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

const COACH_LLM_ALLOWED_TAGS = new Set(['p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'b', 'i']);
function sanitizeLLMHtml(raw) {
    const dirty = String(raw || '').trim();
    if (!dirty) return '';
    let clean = dirty.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
    clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag) => {
        const t = tag.toLowerCase();
        if (!COACH_LLM_ALLOWED_TAGS.has(t)) return '';
        const isClosing = match.startsWith('</');
        if (isClosing) return `</${t === 'b' ? 'strong' : t === 'i' ? 'em' : t}>`;
        const selfClose = t === 'br';
        const outTag = t === 'b' ? 'strong' : t === 'i' ? 'em' : t;
        return selfClose ? `<${outTag} />` : `<${outTag}>`;
    });
    if (!/<\w/.test(clean)) {
        clean = '<p>' + clean.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br />') + '</p>';
    }
    return clean;
}

// Call Claude. If onDelta is provided, streams; otherwise returns the
// full sanitized HTML in one shot. Returns { html } on success,
// { error, message } on failure, or null if no key.
async function askCoachLLM({ text, ctx, imageDataUrl, onDelta } = {}) {
    const apiKey = getCoachApiKey();
    if (!apiKey) return null;

    const userContext = buildCoachLLMUserContext(ctx || (typeof getCoachContext === 'function' ? getCoachContext() : {}));
    const systemBlocks = [
        { type: 'text', text: COACH_LLM_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: userContext },
    ];

    let messages;
    if (imageDataUrl) {
        const m = imageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (!m) return { error: 'bad_image' };
        messages = [{
            role: 'user',
            content: [
                { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
                { type: 'text', text: text || 'Form check please — identify the movement and give 2–4 specific cues.' },
            ],
        }];
    } else {
        messages = buildCoachLLMMessages();
        if (!messages.length || messages[messages.length - 1].role !== 'user') {
            messages.push({ role: 'user', content: text });
        }
    }

    const body = {
        model: COACH_LLM_MODEL,
        max_tokens: COACH_LLM_MAX_TOKENS,
        system: systemBlocks,
        messages,
    };
    if (onDelta) body.stream = true;

    return await _callClaudeWithRetry(apiKey, body, onDelta);
}

async function _callClaudeWithRetry(apiKey, body, onDelta, attempt = 0) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), COACH_LLM_TIMEOUT_MS);
    try {
        const resp = await fetch(COACH_LLM_ENDPOINT, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify(body),
            signal: ac.signal,
        });

        if (!resp.ok) {
            const errBody = await resp.text().catch(() => '');
            // Retry once on 429 / 529 overloaded
            if ((resp.status === 429 || resp.status === 529) && attempt === 0) {
                clearTimeout(timer);
                await new Promise(r => setTimeout(r, 1500));
                return _callClaudeWithRetry(apiKey, body, onDelta, attempt + 1);
            }
            console.error('Coach LLM HTTP', resp.status, errBody.slice(0, 300));
            return { error: `http_${resp.status}`, message: _extractLLMError(errBody) };
        }

        if (body.stream) {
            const accumulated = await _consumeStream(resp, onDelta);
            return { html: sanitizeLLMHtml(accumulated) };
        }
        const data = await resp.json();
        const raw = data?.content?.find(b => b.type === 'text')?.text || '';
        return raw ? { html: sanitizeLLMHtml(raw) } : { error: 'empty_response' };
    } catch (e) {
        if (e.name === 'AbortError') {
            console.warn('Coach LLM timed out');
            return { error: 'timeout' };
        }
        console.error('Coach LLM network error:', e);
        return { error: 'network', message: e.message };
    } finally {
        clearTimeout(timer);
    }
}

async function _consumeStream(resp, onDelta) {
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let accumulated = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6);
            if (!payload || payload === '[DONE]') continue;
            try {
                const ev = JSON.parse(payload);
                if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
                    accumulated += ev.delta.text;
                    try { onDelta && onDelta(ev.delta.text, accumulated); } catch (_) {}
                }
            } catch (_) { /* ignore parse errors on partial lines */ }
        }
    }
    return accumulated;
}

function _extractLLMError(body) {
    try { return JSON.parse(body)?.error?.message || body.slice(0, 160); }
    catch (_) { return String(body || '').slice(0, 160); }
}

// Minimal ping to validate the key. Used by the settings "Test" button.
async function testCoachApiKey(key) {
    if (!key) return { ok: false, message: 'No key entered' };
    try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 10000);
        const resp = await fetch(COACH_LLM_ENDPOINT, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: COACH_LLM_MODEL,
                max_tokens: 4,
                messages: [{ role: 'user', content: 'ok' }],
            }),
            signal: ac.signal,
        });
        clearTimeout(timer);
        if (resp.ok) return { ok: true };
        const errBody = await resp.text().catch(() => '');
        return { ok: false, message: _extractLLMError(errBody) || ('HTTP ' + resp.status) };
    } catch (e) {
        return { ok: false, message: e.name === 'AbortError' ? 'Timeout' : (e.message || 'Network error') };
    }
}

// --- Settings UI wiring (Profile tab) ---
function loadCoachApiKeyUI() {
    const onBtn = document.getElementById('coach-ai-on');
    const offBtn = document.getElementById('coach-ai-off');
    const settings = document.getElementById('coach-ai-settings');
    const status = document.getElementById('coach-ai-status');
    const keyInput = document.getElementById('coach-ai-key');
    if (!onBtn || !offBtn || !settings) return;
    const hasKey = coachLLMAvailable();
    onBtn.classList.toggle('active', hasKey);
    offBtn.classList.toggle('active', !hasKey);
    settings.classList.toggle('hidden', !hasKey);
    if (status) status.textContent = hasKey ? 'Connected \u2014 Claude Haiku' : 'Not connected';
    if (keyInput && hasKey) {
        const k = getCoachApiKey();
        keyInput.placeholder = 'Key saved (' + k.slice(0, 10) + '\u2026) \u2014 paste to replace';
        keyInput.value = '';
    }
}

function showCoachApiKeyInput() {
    const settings = document.getElementById('coach-ai-settings');
    const onBtn = document.getElementById('coach-ai-on');
    const offBtn = document.getElementById('coach-ai-off');
    if (settings) settings.classList.remove('hidden');
    if (onBtn) onBtn.classList.add('active');
    if (offBtn) offBtn.classList.remove('active');
    const input = document.getElementById('coach-ai-key');
    if (input) setTimeout(() => input.focus(), 50);
}

function saveCoachApiKeyFromInput() {
    const input = document.getElementById('coach-ai-key');
    if (!input) return;
    const key = input.value.trim();
    if (!key) return (typeof showToast === 'function' ? showToast('Paste a key first', 'warn') : null);
    if (!/^sk-ant-/.test(key)) {
        if (typeof showToast === 'function') showToast('Key should start with sk-ant-', 'warn');
        return;
    }
    setCoachApiKey(key);
    input.value = '';
    loadCoachApiKeyUI();
    if (typeof showToast === 'function') showToast('Key saved', 'success');
}

async function testCoachApiKeyFromInput() {
    const input = document.getElementById('coach-ai-key');
    const status = document.getElementById('coach-ai-status');
    const pasted = input?.value.trim();
    const key = pasted || getCoachApiKey();
    if (!key) {
        if (status) status.textContent = 'Paste a key first';
        return;
    }
    if (status) status.textContent = 'Testing\u2026';
    const result = await testCoachApiKey(key);
    if (result.ok) {
        if (status) status.textContent = 'Key works \u2014 Claude Haiku ready';
        if (pasted) {
            setCoachApiKey(pasted);
            if (input) input.value = '';
            loadCoachApiKeyUI();
        }
        if (typeof showToast === 'function') showToast('Key works', 'success');
    } else {
        if (status) status.textContent = 'Test failed: ' + (result.message || 'unknown');
        if (typeof showToast === 'function') showToast('Test failed: ' + (result.message || 'unknown'), 'error');
    }
}

function clearCoachApiKeyAndHide() {
    setCoachApiKey('');
    const settings = document.getElementById('coach-ai-settings');
    const onBtn = document.getElementById('coach-ai-on');
    const offBtn = document.getElementById('coach-ai-off');
    const status = document.getElementById('coach-ai-status');
    const input = document.getElementById('coach-ai-key');
    if (settings) settings.classList.add('hidden');
    if (onBtn) onBtn.classList.remove('active');
    if (offBtn) offBtn.classList.add('active');
    if (status) status.textContent = 'Not connected';
    if (input) { input.value = ''; input.placeholder = 'Paste your Claude API key (sk-ant-...)'; }
    if (typeof showToast === 'function') showToast('AI coach disabled', 'info');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCoachApiKeyUI);
} else {
    setTimeout(loadCoachApiKeyUI, 0);
}

// Resize a File to max 1024px jpeg for vision calls. Keeps payloads small.
async function coachResizeImage(file, maxDim = 1024, quality = 0.85) {
    const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
}
