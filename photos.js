// =============================================
// Iron Faith - Progress Photos + Image Utilities
// =============================================
// (Replaced the legacy on-device pose-detection coach. A single still
//  photo + a 17-keypoint MoveNet model can't reliably analyze form, so
//  the coach photo button now saves to a Progress Photo Timeline instead.)

const PROGRESS_PHOTOS_KEY = 'faithfit_progress_photos';

// --- Image utilities (still used by post composer + progress gallery) ---
function resizeImage(dataUrl, maxWidth) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
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

// --- Progress photo data layer ---
function getProgressPhotos() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_PHOTOS_KEY) || '[]'); }
    catch (e) { return []; }
}
function saveProgressPhotos(arr) {
    try { localStorage.setItem(PROGRESS_PHOTOS_KEY, JSON.stringify(arr)); }
    catch (e) { /* quota — silent */ }
}
function addProgressPhoto({ dataUrl, perspective, weightLbs, notes }) {
    const arr = getProgressPhotos();
    const photo = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        dataUrl,
        perspective: perspective || 'front',
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        weightLbs: weightLbs || null,
        notes: notes || ''
    };
    arr.push(photo);
    saveProgressPhotos(arr);
    return photo;
}
function deleteProgressPhoto(id) {
    const arr = getProgressPhotos().filter(p => p.id !== id);
    saveProgressPhotos(arr);
}
function getProgressPhotoStats() {
    const arr = getProgressPhotos();
    if (arr.length === 0) return { count: 0, lastDate: null, daysSinceLast: null };
    const sorted = arr.slice().sort((a, b) => b.timestamp - a.timestamp);
    const lastDate = sorted[0].date;
    const daysSinceLast = Math.floor((Date.now() - sorted[0].timestamp) / 86400000);
    return { count: arr.length, lastDate, daysSinceLast };
}

// --- Coach photo flow (new behavior: save as progress photo) ---
let _pendingProgressPhotoData = null;

async function handleCoachPhoto(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            // Resize larger for progress photos so the timeline still looks sharp
            _pendingProgressPhotoData = await resizeImage(e.target.result, 900);
            openProgressPhotoSaveModal(_pendingProgressPhotoData);
        } catch (err) {
            console.error('Photo load failed:', err);
            if (typeof showToast === 'function') showToast('Could not load that photo', 'warn');
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

// removeCoachPhoto kept as a no-op alias so legacy onclicks don't crash
function removeCoachPhoto() {
    _pendingProgressPhotoData = null;
    const prev = document.getElementById('coach-photo-preview');
    if (prev) prev.classList.add('hidden');
}

// --- Save modal (perspective + optional notes) ---
function openProgressPhotoSaveModal(dataUrl) {
    const existing = document.getElementById('progress-photo-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'progress-photo-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <h3>Save Progress Photo</h3>
            <p class="modal-sub">Tag the angle so future-you can compare apples to apples.</p>
            <img src="${dataUrl}" class="progress-photo-preview" alt="Preview">
            <label class="form-label">Perspective</label>
            <div class="perspective-row">
                <button type="button" class="perspective-btn active" data-perspective="front">Front</button>
                <button type="button" class="perspective-btn" data-perspective="side">Side</button>
                <button type="button" class="perspective-btn" data-perspective="back">Back</button>
            </div>
            <label class="form-label">Notes (optional)</label>
            <input type="text" id="progress-photo-notes" placeholder="e.g. morning, fasted, post-pump" maxlength="80">
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" id="progress-photo-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="progress-photo-save">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    let chosen = 'front';
    modal.querySelectorAll('.perspective-btn').forEach(btn => {
        btn.onclick = () => {
            modal.querySelectorAll('.perspective-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            chosen = btn.dataset.perspective;
        };
    });
    modal.querySelector('#progress-photo-cancel').onclick = () => {
        _pendingProgressPhotoData = null;
        modal.remove();
    };
    modal.querySelector('#progress-photo-save').onclick = () => {
        const notes = (document.getElementById('progress-photo-notes').value || '').trim();
        const weights = (typeof DB !== 'undefined') ? DB.get('weights', []) : [];
        const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null;
        addProgressPhoto({ dataUrl, perspective: chosen, weightLbs: latestWeight, notes });
        _pendingProgressPhotoData = null;
        modal.remove();
        if (typeof showToast === 'function') showToast('Progress photo saved', 'success');
        if (typeof renderProgressPhotoCard === 'function') renderProgressPhotoCard();
        // If coach is open, drop a confirmation message
        if (typeof addBotMessage === 'function') {
            addBotMessage(progressPhotoSavedMessage(chosen));
        }
    };
}

function progressPhotoSavedMessage(perspective) {
    const stats = getProgressPhotoStats();
    let html = `<h3>Progress Photo Saved</h3>`;
    html += `<p>Tagged as <strong>${perspective}</strong>. You now have <strong>${stats.count}</strong> progress photo${stats.count !== 1 ? 's' : ''} in your timeline.</p>`;
    if (stats.count >= 2) {
        html += `<p>Open your profile and tap <strong>Compare</strong> to put two photos side-by-side.</p>`;
    } else {
        html += `<p>Take another in 2&ndash;4 weeks (same lighting, same angle, same time of day) and you'll start seeing real change.</p>`;
    }
    html += `<h3>Why this beats form analysis</h3>`;
    html += `<ul>`;
    html += `<li><strong>It's measurable.</strong> You can't argue with side-by-side photos taken 8 weeks apart.</li>`;
    html += `<li><strong>It's honest.</strong> The scale lies. The mirror lies (you see yourself daily). Photos don't.</li>`;
    html += `<li><strong>It's the #1 motivator.</strong> Studies on long-term adherence consistently rank visual proof above any other tracking method.</li>`;
    html += `</ul>`;
    return html;
}

// --- Gallery rendering (called from profile tab) ---
function renderProgressPhotoCard() {
    const card = document.getElementById('progress-photos-card');
    if (!card) return;
    const photos = getProgressPhotos();
    if (photos.length === 0) {
        card.innerHTML = `
            <h3>Progress Photos</h3>
            <p class="muted">Take a progress photo every 2&ndash;4 weeks. Same lighting, same angle, same time of day. Future-you will thank you.</p>
            <button class="btn btn-primary" onclick="document.getElementById('progress-photo-input').click()">Add First Photo</button>
            <input type="file" id="progress-photo-input" accept="image/*" style="display:none" onchange="handleCoachPhoto(event)">
        `;
        return;
    }
    const sorted = photos.slice().sort((a, b) => b.timestamp - a.timestamp);
    const recent = sorted.slice(0, 6);
    let html = `<h3>Progress Photos <span class="badge-count">${photos.length}</span></h3>`;
    html += `<div class="progress-photo-grid">`;
    recent.forEach(p => {
        html += `
            <div class="progress-photo-thumb" onclick="openProgressPhotoDetail('${p.id}')">
                <img src="${p.dataUrl}" alt="Progress photo">
                <div class="progress-photo-thumb-meta">
                    <span class="progress-photo-thumb-date">${formatProgressDate(p.date)}</span>
                    <span class="progress-photo-thumb-tag">${p.perspective}</span>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    html += `<div class="progress-photo-actions">`;
    html += `<button class="btn btn-secondary" onclick="document.getElementById('progress-photo-input').click()">+ Add Photo</button>`;
    if (photos.length >= 2) {
        html += `<button class="btn btn-secondary" onclick="openProgressPhotoCompare()">Compare</button>`;
    }
    html += `</div>`;
    html += `<input type="file" id="progress-photo-input" accept="image/*" style="display:none" onchange="handleCoachPhoto(event)">`;
    card.innerHTML = html;
}

function formatProgressDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) { return iso; }
}

function openProgressPhotoDetail(id) {
    const photos = getProgressPhotos();
    const p = photos.find(x => x.id === id);
    if (!p) return;
    const existing = document.getElementById('progress-photo-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'progress-photo-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-card">
            <h3>${formatProgressDate(p.date)} &middot; ${p.perspective}</h3>
            <img src="${p.dataUrl}" class="progress-photo-preview" alt="Progress photo">
            ${p.weightLbs ? `<p class="muted">Weight: ${p.weightLbs} lbs</p>` : ''}
            ${p.notes ? `<p>${escapeHtmlSafe(p.notes)}</p>` : ''}
            <div class="modal-actions">
                <button type="button" class="btn btn-danger" id="progress-photo-delete">Delete</button>
                <button type="button" class="btn btn-secondary" id="progress-photo-close">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#progress-photo-close').onclick = () => modal.remove();
    modal.querySelector('#progress-photo-delete').onclick = async () => {
        const ok = (typeof confirmDialog === 'function')
            ? await confirmDialog('Delete this progress photo?', { danger: true, okText: 'Delete' })
            : confirm('Delete this progress photo?');
        if (!ok) return;
        deleteProgressPhoto(id);
        modal.remove();
        renderProgressPhotoCard();
        if (typeof showToast === 'function') showToast('Photo deleted');
    };
}

function escapeHtmlSafe(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// --- Side-by-side compare ---
function openProgressPhotoCompare() {
    const photos = getProgressPhotos().slice().sort((a, b) => a.timestamp - b.timestamp);
    if (photos.length < 2) return;
    const existing = document.getElementById('progress-compare-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'progress-compare-modal';
    modal.className = 'modal-overlay';
    let optionsHtml = '';
    photos.forEach((p, i) => {
        optionsHtml += `<option value="${p.id}">${formatProgressDate(p.date)} &middot; ${p.perspective}</option>`;
    });
    const earliestId = photos[0].id;
    const latestId = photos[photos.length - 1].id;
    modal.innerHTML = `
        <div class="modal-card modal-card-wide">
            <h3>Compare Progress Photos</h3>
            <div class="compare-controls">
                <div>
                    <label class="form-label">Before</label>
                    <select id="compare-left">${optionsHtml}</select>
                </div>
                <div>
                    <label class="form-label">After</label>
                    <select id="compare-right">${optionsHtml}</select>
                </div>
            </div>
            <div class="compare-grid">
                <div class="compare-side">
                    <img id="compare-img-left" src="" alt="Before">
                    <div class="compare-meta" id="compare-meta-left"></div>
                </div>
                <div class="compare-side">
                    <img id="compare-img-right" src="" alt="After">
                    <div class="compare-meta" id="compare-meta-right"></div>
                </div>
            </div>
            <div class="compare-summary" id="compare-summary"></div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" id="compare-close">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const leftSel = modal.querySelector('#compare-left');
    const rightSel = modal.querySelector('#compare-right');
    leftSel.value = earliestId;
    rightSel.value = latestId;

    function updateCompare() {
        const left = photos.find(p => p.id === leftSel.value);
        const right = photos.find(p => p.id === rightSel.value);
        if (!left || !right) return;
        modal.querySelector('#compare-img-left').src = left.dataUrl;
        modal.querySelector('#compare-img-right').src = right.dataUrl;
        modal.querySelector('#compare-meta-left').innerHTML =
            `<strong>${formatProgressDate(left.date)}</strong><br>${left.perspective}${left.weightLbs ? ` &middot; ${left.weightLbs} lbs` : ''}`;
        modal.querySelector('#compare-meta-right').innerHTML =
            `<strong>${formatProgressDate(right.date)}</strong><br>${right.perspective}${right.weightLbs ? ` &middot; ${right.weightLbs} lbs` : ''}`;
        // Summary
        const days = Math.max(0, Math.round((right.timestamp - left.timestamp) / 86400000));
        let summary = `<strong>${days} day${days !== 1 ? 's' : ''}</strong> apart`;
        if (left.weightLbs && right.weightLbs) {
            const diff = right.weightLbs - left.weightLbs;
            const sign = diff > 0 ? '+' : '';
            summary += ` &middot; <strong>${sign}${diff.toFixed(1)} lbs</strong>`;
        }
        modal.querySelector('#compare-summary').innerHTML = summary;
    }
    leftSel.onchange = updateCompare;
    rightSel.onchange = updateCompare;
    updateCompare();
    modal.querySelector('#compare-close').onclick = () => modal.remove();
}

// --- Stub: legacy entry points the coach used to call ---
// Kept so old code paths don't throw if anything still references them.
async function analyzePoseFromPhoto(_base64, _ctx, _userText) {
    return analyzePhoto();
}
function analyzePhoto() {
    let html = `<h3>Photos Are Now Progress Photos</h3>`;
    html += `<p>I used to try to analyze your form from a single still photo. I'm being honest: it didn't work — one frame and joint angles can't tell me what your bar path looks like or whether your brace held.</p>`;
    html += `<p>Instead, photos you attach now go into your <strong>Progress Photo Timeline</strong> on the Profile tab. Take one every 2&ndash;4 weeks and you'll have undeniable visual proof of your changes.</p>`;
    html += `<p>For real form feedback, ask me about a specific lift &mdash; "<em>bench press form</em>" or "<em>how do I deadlift</em>" &mdash; and I'll give you the cues, common mistakes, and how to film yourself for self-review.</p>`;
    return html;
}
