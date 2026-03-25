// =============================================
// FaithFit - Progress Photos (IndexedDB)
// =============================================

// --- IndexedDB Setup ---
const PhotoDB = {
    db: null,
    DB_NAME: 'faithfit_photos',
    STORE_NAME: 'photos',

    open() {
        return new Promise((resolve, reject) => {
            if (this.db) { resolve(this.db); return; }
            const req = indexedDB.open(this.DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('label', 'label', { unique: false });
                }
            };
            req.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            req.onerror = () => reject(req.error);
        });
    },

    async add(photo) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);
            const req = store.add(photo);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async getAll() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readonly');
            const store = tx.objectStore(this.STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async get(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readonly');
            const store = tx.objectStore(this.STORE_NAME);
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async delete(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },
};

// --- Photo Upload ---
const dropZone = document.getElementById('photo-drop-zone');
if (dropZone) {
    dropZone.addEventListener('click', () => {
        document.getElementById('photo-input').click();
    });
}

function handlePhotoUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const label = document.getElementById('photo-label').value;
    const note = document.getElementById('photo-note').value.trim();

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            // Resize image to save storage
            const resized = await resizeImage(e.target.result, 800);

            const photo = {
                data: resized,
                date: today(),
                timestamp: Date.now(),
                label: label,
                note: note,
            };

            await PhotoDB.add(photo);
            loadPhotoGallery();
            loadCompareDropdowns();
        };
        reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    event.target.value = '';
    document.getElementById('photo-note').value = '';
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

// --- Gallery ---
let currentFilter = 'all';

async function loadPhotoGallery() {
    const photos = await PhotoDB.getAll();
    const gallery = document.getElementById('photo-gallery');

    const filtered = currentFilter === 'all'
        ? photos
        : photos.filter(p => p.label === currentFilter);

    // Sort newest first
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (filtered.length === 0) {
        gallery.innerHTML = '<p class="empty-state">No photos yet. Add your first progress photo!</p>';
        return;
    }

    gallery.innerHTML = filtered.map(p => `
        <div class="photo-card">
            <img src="${p.data}" alt="Progress photo" onclick="openLightbox('${p.id}')">
            <button class="photo-delete" onclick="deletePhoto(${p.id})" title="Delete">&times;</button>
            <div class="photo-card-info">
                <div class="photo-date">${formatDate(p.date)}</div>
                <span class="photo-tag">${p.label}</span>
                ${p.note ? `<div class="photo-meta">${escapeHtml(p.note)}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function filterPhotos(label) {
    currentFilter = label;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === label || (label === 'all' && btn.textContent === 'All'));
    });
    loadPhotoGallery();
}

async function deletePhoto(id) {
    if (!confirm('Delete this photo?')) return;
    await PhotoDB.delete(id);
    loadPhotoGallery();
    loadCompareDropdowns();
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// --- Lightbox ---
async function openLightbox(id) {
    const photo = await PhotoDB.get(parseInt(id));
    if (!photo) return;

    const lb = document.createElement('div');
    lb.className = 'photo-lightbox';
    lb.onclick = () => lb.remove();
    lb.innerHTML = `<img src="${photo.data}" alt="Progress photo">`;
    document.body.appendChild(lb);
}

// --- Before & After Compare ---
async function loadCompareDropdowns() {
    const photos = await PhotoDB.getAll();
    photos.sort((a, b) => a.timestamp - b.timestamp);

    const beforeSelect = document.getElementById('compare-before');
    const afterSelect = document.getElementById('compare-after');
    const beforeVal = beforeSelect.value;
    const afterVal = afterSelect.value;

    const options = photos.map(p =>
        `<option value="${p.id}">${formatDate(p.date)} — ${p.label}${p.note ? ' (' + escapeHtml(p.note) + ')' : ''}</option>`
    ).join('');

    beforeSelect.innerHTML = '<option value="">-- Select --</option>' + options;
    afterSelect.innerHTML = '<option value="">-- Select --</option>' + options;

    if (beforeVal) beforeSelect.value = beforeVal;
    if (afterVal) afterSelect.value = afterVal;
}

async function updateCompare() {
    const beforeId = parseInt(document.getElementById('compare-before').value);
    const afterId = parseInt(document.getElementById('compare-after').value);
    const view = document.getElementById('compare-view');

    if (!beforeId || !afterId) {
        view.classList.add('hidden');
        return;
    }

    const before = await PhotoDB.get(beforeId);
    const after = await PhotoDB.get(afterId);

    if (!before || !after) {
        view.classList.add('hidden');
        return;
    }

    document.getElementById('compare-before-img').src = before.data;
    document.getElementById('compare-after-img').src = after.data;
    view.classList.remove('hidden');
}

// --- Init Photos ---
(async function initPhotos() {
    await PhotoDB.open();
    loadPhotoGallery();
    loadCompareDropdowns();
})();
