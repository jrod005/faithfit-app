// =============================================
// Iron Faith - Cloud Backup & Sync
// Snapshot-style sync to Supabase user_data table
// =============================================

const CLOUD_SYNC_KEY = 'cloudSyncEnabled';
const LAST_SYNC_KEY = 'lastCloudSync';
const LOCAL_MODIFIED_KEY = 'localLastModified';
let cloudSyncTimer = null;
let cloudSyncInProgress = false;

function isCloudSyncEnabled() {
    return DB.get(CLOUD_SYNC_KEY, false) === true;
}

function setCloudSyncEnabled(enabled) {
    localStorage.setItem('faithfit_' + CLOUD_SYNC_KEY, JSON.stringify(!!enabled));
}

function getLocalSnapshot() {
    const snapshot = {};
    SYNCED_KEYS.forEach(key => {
        const raw = localStorage.getItem('faithfit_' + key);
        if (raw !== null) {
            try { snapshot[key] = JSON.parse(raw); } catch (e) {}
        }
    });
    return snapshot;
}

function applySnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    Object.keys(snapshot).forEach(key => {
        if (SYNCED_KEYS.has(key)) {
            try {
                localStorage.setItem('faithfit_' + key, JSON.stringify(snapshot[key]));
            } catch (e) {}
        }
    });
}

function bumpLocalModified() {
    localStorage.setItem('faithfit_' + LOCAL_MODIFIED_KEY, String(Date.now()));
}

function getLocalModified() {
    return parseInt(localStorage.getItem('faithfit_' + LOCAL_MODIFIED_KEY) || '0', 10);
}

function setLastSync(ts) {
    localStorage.setItem('faithfit_' + LAST_SYNC_KEY, String(ts));
}

function getLastSync() {
    return parseInt(localStorage.getItem('faithfit_' + LAST_SYNC_KEY) || '0', 10);
}

// Debounced upload — called whenever a synced key changes
function scheduleCloudSync() {
    bumpLocalModified();
    updateCloudSyncStatusUI();
    if (!isCloudSyncEnabled()) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => { pushToCloud(); }, 3000);
}

async function pushToCloud(silent) {
    if (typeof sb === 'undefined' || !sb) return;
    if (typeof currentUser === 'undefined' || !currentUser) {
        if (!silent) showToast('Sign in to enable cloud backup', 'warn');
        return;
    }
    if (cloudSyncInProgress) return;
    cloudSyncInProgress = true;
    updateCloudSyncStatusUI('Syncing\u2026');
    try {
        const snapshot = getLocalSnapshot();
        const localModified = getLocalModified() || Date.now();
        const { error } = await sb.from('user_data').upsert({
            user_id: currentUser.id,
            data: snapshot,
            local_modified: localModified,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        if (error) throw error;
        setLastSync(Date.now());
        updateCloudSyncStatusUI();
        if (!silent) showToast('Backed up to cloud', 'success');
    } catch (e) {
        console.error('Cloud sync push failed', e);
        updateCloudSyncStatusUI();
        if (!silent) showToast('Backup failed: ' + (e.message || 'unknown'), 'error');
    } finally {
        cloudSyncInProgress = false;
    }
}

async function pullFromCloud(silent) {
    if (typeof sb === 'undefined' || !sb) return;
    if (typeof currentUser === 'undefined' || !currentUser) {
        if (!silent) showToast('Sign in to restore from cloud', 'warn');
        return;
    }
    if (cloudSyncInProgress) return;
    cloudSyncInProgress = true;
    updateCloudSyncStatusUI('Restoring\u2026');
    try {
        const { data, error } = await sb.from('user_data')
            .select('data, local_modified, updated_at')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        if (error) throw error;
        if (!data) {
            if (!silent) showToast('No cloud backup found', 'info');
            return null;
        }
        applySnapshot(data.data || {});
        setLastSync(Date.now());
        if (data.local_modified) {
            localStorage.setItem('faithfit_' + LOCAL_MODIFIED_KEY, String(data.local_modified));
        }
        updateCloudSyncStatusUI();
        if (!silent) showToast('Restored from cloud', 'success');
        // Refresh UI everywhere
        if (typeof loadProfile === 'function') loadProfile();
        if (typeof loadUnits === 'function') loadUnits();
        if (typeof loadHapticsToggle === 'function') loadHapticsToggle();
        if (typeof loadNotifToggle === 'function') loadNotifToggle();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof renderRoutinesList === 'function') renderRoutinesList();
        if (typeof updateMealsList === 'function') updateMealsList();
        if (typeof updateNutritionBars === 'function') updateNutritionBars();
        if (typeof drawWeightChart === 'function') drawWeightChart();
        return data;
    } catch (e) {
        console.error('Cloud sync pull failed', e);
        updateCloudSyncStatusUI();
        if (!silent) showToast('Restore failed: ' + (e.message || 'unknown'), 'error');
        return null;
    } finally {
        cloudSyncInProgress = false;
    }
}

// On login, decide whether to push or pull based on timestamps
async function reconcileOnLogin() {
    if (typeof sb === 'undefined' || !sb) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    if (!isCloudSyncEnabled()) return;
    try {
        const { data, error } = await sb.from('user_data')
            .select('local_modified, updated_at')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        if (error) throw error;
        const localMod = getLocalModified();
        const remoteMod = data?.local_modified || 0;
        const hasLocal = localStorage.getItem('faithfit_workouts') || localStorage.getItem('faithfit_profile');

        if (!data) {
            // No cloud backup yet — push current state
            if (hasLocal) await pushToCloud(true);
            return;
        }
        if (remoteMod > localMod) {
            // Cloud is newer — confirm before overwriting if local also has data
            if (hasLocal && localMod > 0) {
                const ok = await confirmDialog(
                    'Cloud backup is newer than your local data. Restore from cloud? Your local changes will be replaced.',
                    { okText: 'Restore', danger: false }
                );
                if (!ok) { await pushToCloud(true); return; }
            }
            await pullFromCloud(true);
        } else if (localMod > remoteMod) {
            await pushToCloud(true);
        }
    } catch (e) {
        console.error('Reconcile failed', e);
    }
}

async function enableCloudSync() {
    if (typeof currentUser === 'undefined' || !currentUser) {
        showToast('Sign in on the Social tab first', 'warn');
        const tabBtn = document.querySelector('.tab-btn[data-tab="social"]');
        if (tabBtn) tabBtn.click();
        return;
    }
    setCloudSyncEnabled(true);
    loadCloudSyncToggle();
    showToast('Cloud backup enabled', 'success');
    await reconcileOnLogin();
}

function disableCloudSync() {
    setCloudSyncEnabled(false);
    loadCloudSyncToggle();
    showToast('Cloud backup disabled', 'info');
}

async function manualSyncNow() {
    if (typeof currentUser === 'undefined' || !currentUser) {
        showToast('Sign in to sync', 'warn');
        return;
    }
    await pushToCloud();
}

async function manualRestoreNow() {
    if (typeof currentUser === 'undefined' || !currentUser) {
        showToast('Sign in to restore', 'warn');
        return;
    }
    const ok = await confirmDialog(
        'Replace your local data with the cloud backup? This cannot be undone.',
        { okText: 'Restore', danger: true }
    );
    if (!ok) return;
    await pullFromCloud();
}

function loadCloudSyncToggle() {
    const enabled = isCloudSyncEnabled();
    const onBtn = document.getElementById('cloud-on');
    const offBtn = document.getElementById('cloud-off');
    const settingsBox = document.getElementById('cloud-settings');
    if (onBtn) onBtn.classList.toggle('active', enabled);
    if (offBtn) offBtn.classList.toggle('active', !enabled);
    if (settingsBox) settingsBox.classList.toggle('hidden', !enabled);
    updateCloudSyncStatusUI();
}

function updateCloudSyncStatusUI(overrideText) {
    const el = document.getElementById('cloud-sync-status');
    if (!el) return;
    if (overrideText) { el.textContent = overrideText; return; }
    const last = getLastSync();
    const signedIn = (typeof currentUser !== 'undefined' && currentUser);
    if (!signedIn) { el.textContent = 'Sign in on the Social tab to back up'; return; }
    if (!isCloudSyncEnabled()) { el.textContent = 'Cloud backup off'; return; }
    if (!last) { el.textContent = 'Not synced yet'; return; }
    const diff = Date.now() - last;
    let when;
    if (diff < 60000) when = 'just now';
    else if (diff < 3600000) when = Math.floor(diff / 60000) + 'm ago';
    else if (diff < 86400000) when = Math.floor(diff / 3600000) + 'h ago';
    else when = Math.floor(diff / 86400000) + 'd ago';
    el.textContent = 'Last backup: ' + when;
}

// Hook into existing supabase auth state — wait for sb to be defined
function initCloudSyncAuthHook() {
    if (typeof sb === 'undefined') {
        setTimeout(initCloudSyncAuthHook, 200);
        return;
    }
    sb.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            // Wait a tick for currentUser to be set by social.js
            setTimeout(() => {
                loadCloudSyncToggle();
                checkPendingRestore();
                if (isCloudSyncEnabled()) reconcileOnLogin();
            }, 700);
        } else {
            updateCloudSyncStatusUI();
        }
    });
    // Initial check
    sb.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
            setTimeout(() => {
                loadCloudSyncToggle();
                checkPendingRestore();
                if (isCloudSyncEnabled()) reconcileOnLogin();
            }, 700);
        }
    });
}

initCloudSyncAuthHook();

// =============================================
// Fresh-install restore prompt
// On a brand-new PWA install (or fresh browser), if there is no local
// onboarding data, offer to restore from cloud before onboarding starts.
// =============================================
const RESTORE_PROMPT_DISMISSED_KEY = 'restorePromptDismissed';

function isStandalonePWA() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

function isFreshInstall() {
    // No onboarding completed, no workouts, no profile name
    const onboarded = DB.get('onboarded', false);
    const workouts = DB.get('workouts', []);
    const profile = DB.get('profile', {});
    return !onboarded && (!workouts || workouts.length === 0) && !(profile && profile.name);
}

function showRestorePrompt() {
    if (document.getElementById('restore-prompt-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'restore-prompt-banner';
    banner.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(80px + env(safe-area-inset-bottom));background:var(--card-bg,#1a1a1a);color:var(--text,#fff);border:1px solid var(--border,#333);border-radius:14px;padding:16px;z-index:9998;box-shadow:0 8px 24px rgba(0,0,0,0.4);font-size:14px';
    banner.innerHTML = `
        <div style="font-weight:600;margin-bottom:6px">Welcome to Iron Faith</div>
        <div style="opacity:0.85;margin-bottom:12px">Returning user? Sign in to restore your workouts, stats, and faith data from the cloud.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button id="restore-prompt-signin" style="flex:1;min-width:120px;background:var(--primary,#d4af37);color:#000;border:0;padding:10px 14px;border-radius:10px;font-weight:600;cursor:pointer">Sign in & restore</button>
            <button id="restore-prompt-skip" style="flex:1;min-width:120px;background:transparent;color:var(--text,#fff);border:1px solid var(--border,#333);padding:10px 14px;border-radius:10px;cursor:pointer">Start fresh</button>
        </div>
    `;
    document.body.appendChild(banner);
    document.getElementById('restore-prompt-signin').onclick = () => {
        DB.set(RESTORE_PROMPT_DISMISSED_KEY, true);
        banner.remove();
        // Hide onboarding so user can sign in first
        const ob = document.getElementById('onboarding');
        if (ob) ob.classList.add('hidden');
        const tabBtn = document.querySelector('.tab-btn[data-tab="social"]');
        if (tabBtn) tabBtn.click();
        if (typeof showToast === 'function') showToast('Sign in, then enable Cloud Backup in Profile to restore');
    };
    document.getElementById('restore-prompt-skip').onclick = () => {
        DB.set(RESTORE_PROMPT_DISMISSED_KEY, true);
        banner.remove();
    };
}

// Called from the first onboarding slide. Sends the user to Social/Cloud
// sign-in, then auto-pulls their backup and dismisses onboarding.
async function onboardingRestoreFromCloud() {
    // Mark onboarding as complete so the user never loops back here
    DB.set('onboarded', true);
    DB.set('pendingCloudRestore', true);
    DB.set(RESTORE_PROMPT_DISMISSED_KEY, true);

    // Hide onboarding overlay
    const ob = document.getElementById('onboarding');
    if (ob) ob.classList.add('hidden');

    // Jump to Social tab so they can sign in
    const tabBtn = document.querySelector('.tab-btn[data-tab="social"]');
    if (tabBtn) tabBtn.click();
    if (typeof showToast === 'function') {
        showToast('Sign in below to restore your data');
    }
}

// Watch for sign-in after a pending restore was requested.
// Uses direct REST so it works even when supabase-js is hung.
async function checkPendingRestore() {
    if (!DB.get('pendingCloudRestore', false)) return;
    if (typeof currentUser === 'undefined' || !currentUser) return;
    if (typeof sb === 'undefined' || !sb) return;
    try {
        // Pull access token from supabase-js (this part doesn't hang)
        const { data: sess } = await sb.auth.getSession();
        const token = sess?.session?.access_token;
        const uid = sess?.session?.user?.id || currentUser.id;
        if (!token || !uid) return;

        const resp = await fetch(
            SUPABASE_URL + '/rest/v1/user_data?user_id=eq.' + encodeURIComponent(uid) + '&select=snapshot,local_modified',
            {
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: 'Bearer ' + token,
                },
                cache: 'no-store',
            }
        );
        if (!resp.ok) {
            console.error('Pending restore HTTP', resp.status);
            if (typeof showToast === 'function') showToast('Restore failed: HTTP ' + resp.status);
            return;
        }
        const rows = await resp.json();
        const data = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

        if (data && data.snapshot && Object.keys(data.snapshot).length > 0) {
            applySnapshot(data.snapshot);
            setLastSync(Date.now());
            setCloudSyncEnabled(true);
            DB.set('pendingCloudRestore', false);
            DB.set('onboarded', true);
            if (typeof showToast === 'function') showToast('Data restored from cloud!');
            if (typeof loadProfile === 'function') loadProfile();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof loadCloudSyncToggle === 'function') loadCloudSyncToggle();
            setTimeout(() => window.location.reload(), 1200);
        } else {
            DB.set('pendingCloudRestore', false);
            if (typeof showToast === 'function') {
                showToast('No cloud backup found for this account');
            }
        }
    } catch (e) {
        console.error('checkPendingRestore failed:', e);
        if (typeof showToast === 'function') showToast('Restore error: ' + (e.message || 'unknown'));
    }
}

// Hook into the cloud-sync auth state listener
const _origInit = initCloudSyncAuthHook;
function maybeShowRestorePrompt() {
    try {
        if (DB.get(RESTORE_PROMPT_DISMISSED_KEY, false)) return;
        if (!isStandalonePWA()) return;
        if (!isFreshInstall()) return;
        // Wait a moment for the app to settle
        setTimeout(showRestorePrompt, 800);
    } catch (e) { console.error('maybeShowRestorePrompt failed:', e); }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeShowRestorePrompt);
} else {
    maybeShowRestorePrompt();
}
