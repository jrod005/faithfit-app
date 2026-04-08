// =============================================
// Iron Faith Social - Supabase Integration
// =============================================

const SUPABASE_URL = 'https://cmlmkgdkoqeafmpmbxhl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbG1rZ2Rrb3FlYWZtcG1ieGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjM5MDIsImV4cCI6MjA5MDk5OTkwMn0.8xnXFow6vyu1hCyIYZplfC2yzzdZ2dtxcFtTBZ8n3hQ';

let sb = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false,
                storage: window.localStorage,
                storageKey: 'ironfaith-auth',
            }
        });
    } else {
        console.error('Supabase library failed to load');
    }
} catch (e) {
    console.error('Supabase init failed:', e);
}

let currentUser = null;
let userProfile = null;
let socialView = 'feed';

// ========== BIBLE VERSES ==========
const BIBLE_VERSES = [
    { ref: "Philippians 4:13", text: "I can do all things through Christ who strengthens me." },
    { ref: "Isaiah 40:31", text: "But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
    { ref: "1 Corinthians 9:24", text: "Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize." },
    { ref: "1 Corinthians 9:27", text: "I discipline my body and keep it under control, lest after preaching to others I myself should be disqualified." },
    { ref: "1 Timothy 4:8", text: "For physical training is of some value, but godliness has value for all things, holding promise for both the present life and the life to come." },
    { ref: "Hebrews 12:1", text: "Let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us." },
    { ref: "Hebrews 12:11", text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it." },
    { ref: "Romans 5:3-4", text: "We also glory in our sufferings, because we know that suffering produces perseverance; perseverance, character; and character, hope." },
    { ref: "Colossians 3:23", text: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters." },
    { ref: "Proverbs 27:17", text: "As iron sharpens iron, so one person sharpens another." },
    { ref: "Psalm 18:32", text: "It is God who arms me with strength and keeps my way secure." },
    { ref: "Psalm 28:7", text: "The LORD is my strength and my shield; my heart trusts in him, and he helps me." },
    { ref: "Psalm 73:26", text: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever." },
    { ref: "2 Timothy 4:7", text: "I have fought the good fight, I have finished the race, I have kept the faith." },
    { ref: "Galatians 6:9", text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up." },
    { ref: "Joshua 1:9", text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go." },
    { ref: "Deuteronomy 31:6", text: "Be strong and courageous. Do not be afraid or terrified because of them, for the LORD your God goes with you; he will never leave you nor forsake you." },
    { ref: "Isaiah 41:10", text: "So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you." },
    { ref: "Nehemiah 8:10", text: "The joy of the LORD is your strength." },
    { ref: "2 Corinthians 12:9", text: "My grace is sufficient for you, for my power is made perfect in weakness." },
    { ref: "Romans 8:37", text: "In all these things we are more than conquerors through him who loved us." },
    { ref: "Philippians 3:14", text: "I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus." },
    { ref: "James 1:2-4", text: "Consider it pure joy whenever you face trials of many kinds, because the testing of your faith produces perseverance." },
    { ref: "1 Corinthians 6:19-20", text: "Do you not know that your bodies are temples of the Holy Spirit? Therefore honor God with your bodies." },
    { ref: "Psalm 144:1", text: "Praise be to the LORD my Rock, who trains my hands for war, my fingers for battle." },
    { ref: "Ephesians 6:10", text: "Finally, be strong in the Lord and in his mighty power." },
    { ref: "Matthew 19:26", text: "With man this is impossible, but with God all things are possible." },
    { ref: "Psalm 46:1", text: "God is our refuge and strength, an ever-present help in trouble." },
    { ref: "Habakkuk 3:19", text: "The Sovereign LORD is my strength; he makes my feet like the feet of a deer, he enables me to tread on the heights." },
    { ref: "Mark 10:27", text: "With man it is impossible, but not with God; all things are possible with God." }
];

// ========== AUTH ==========

async function socialSignUp() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pass = document.getElementById('signup-password').value;
    if (!name || !email || !pass) return showToast('Fill in all fields');
    if (pass.length < 6) return showToast('Password must be 6+ characters');

    const { error } = await sb.auth.signUp({
        email, password: pass,
        options: { data: { display_name: name } }
    });
    if (error) return showToast(error.message);
    showToast('Account created! Check your email to confirm, or log in if confirmation is disabled.');
}

async function socialSignIn() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    if (!email || !pass) return showToast('Fill in all fields');

    // Try the library first with a short timeout; fall back to direct REST
    // if it hangs (the library has been observed to hang on some iOS PWAs).
    const libSignin = (async () => {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw new Error(error.message);
    })();
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('LIB_TIMEOUT')), 6000));

    try {
        await Promise.race([libSignin, timeout]);
        return; // success via library
    } catch (e) {
        console.warn('Library signin failed/timed out, falling back to direct REST:', e.message);
        // Fall through to direct
    }

    await directSignIn(email, pass);
}

// Direct REST sign-in. Bypasses supabase-js when its auth flow hangs.
async function directSignIn(email, pass) {
    showToast('Signing in (direct)...');
    try {
        const resp = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password: pass }),
            cache: 'no-store',
        });
        const body = await resp.json();
        if (!resp.ok) {
            showToast(body.error_description || body.msg || ('Login failed: HTTP ' + resp.status));
            return;
        }

        // Manually store the session in the same key supabase-js uses, so the
        // library picks it up on the next load.
        const session = {
            access_token: body.access_token,
            refresh_token: body.refresh_token,
            expires_in: body.expires_in,
            expires_at: Math.floor(Date.now() / 1000) + (body.expires_in || 3600),
            token_type: body.token_type || 'bearer',
            user: body.user,
        };
        try {
            localStorage.setItem('ironfaith-auth', JSON.stringify({ currentSession: session, expiresAt: session.expires_at }));
        } catch (e) {}

        currentUser = body.user;

        // Try to attach to sb for future calls
        try {
            if (sb && sb.auth && sb.auth.setSession) {
                await Promise.race([
                    sb.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }),
                    new Promise(r => setTimeout(r, 2000))
                ]);
            }
        } catch (e) { console.warn('setSession failed:', e); }

        // Now attempt to fetch/create profile via direct REST too
        showToast('Signed in! Loading your profile...');
        await directProfileSetup();

        // Trigger pending cloud restore if flagged from onboarding
        if (typeof checkPendingRestore === 'function') {
            setTimeout(() => checkPendingRestore(), 500);
        }
    } catch (e) {
        console.error('directSignIn crashed:', e);
        showToast('Login failed: ' + (e.message || 'unknown'));
    }
}

async function socialGoogleSignIn() {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google' });
    if (error) showToast(error.message);
}

async function socialSignOut() {
    await sb.auth.signOut();
    currentUser = null;
    userProfile = null;
    renderSocialTab();
}

// Fetch profile with retry — don't wipe an existing userProfile on transient errors
async function fetchProfileWithRetry(uid, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
        try {
            const { data, error } = await sb.from('profiles').select().eq('id', uid).maybeSingle();
            if (error) {
                console.error(`Profile fetch attempt ${i + 1} error:`, error);
            } else {
                return { data, error: null };
            }
        } catch (e) {
            console.error(`Profile fetch attempt ${i + 1} crashed:`, e);
        }
        await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
    return { data: null, error: new Error('Profile fetch failed after retries') };
}

// Auto-create a profile row for a signed-in user who doesn't have one yet.
// Skips the username setup prompt entirely; user can rename later from Profile.
async function ensureProfileExists() {
    if (!sb || !currentUser) return null;
    try {
        // Build a default username from the email prefix, sanitized
        const emailPrefix = (currentUser.email || '').split('@')[0]
            .toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14);
        let base = emailPrefix || 'lifter';
        if (base.length < 3) base = 'lifter';

        // Try a few candidates until one isn't taken
        let username = base;
        for (let attempt = 0; attempt < 5; attempt++) {
            const { data: clash } = await sb.from('profiles')
                .select('id').eq('username', username).maybeSingle();
            if (!clash || clash.id === currentUser.id) break;
            username = base + Math.floor(Math.random() * 9000 + 1000);
        }

        const displayName = currentUser.user_metadata?.display_name
            || currentUser.email?.split('@')[0]
            || username;

        let stats = {};
        try { stats = getPublicStats(); } catch (e) { console.error('getPublicStats failed:', e); }

        const { data, error } = await sb.from('profiles').upsert({
            id: currentUser.id,
            username,
            display_name: displayName,
            bio: '',
            stats,
            friends: [],
        }, { onConflict: 'id' }).select().maybeSingle();

        if (error) {
            console.error('ensureProfileExists upsert error:', error);
            return null;
        }
        return data;
    } catch (e) {
        console.error('ensureProfileExists crashed:', e);
        return null;
    }
}

// Auth state listener
if (sb) sb.auth.onAuthStateChange(async (event, session) => {
    try {
        if (session?.user) {
            currentUser = session.user;
            const { data } = await fetchProfileWithRetry(currentUser.id);
            if (data) {
                userProfile = data;
                syncStatsToSupabase();
            } else {
                // No profile row yet — auto-create one so the user is never stuck on setup
                const created = await ensureProfileExists();
                if (created) userProfile = created;
            }
            subscribeToFriendRequests();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userProfile = null;
        }
    } catch (e) {
        console.error('onAuthStateChange handler crashed:', e);
    }
    renderSocialTab();
});

// Also check on load
(async () => {
    if (!sb) {
        renderSocialTab();
        return;
    }
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
            currentUser = session.user;
            const { data } = await fetchProfileWithRetry(currentUser.id);
            if (data) {
                userProfile = data;
                syncStatsToSupabase();
            } else {
                const created = await ensureProfileExists();
                if (created) userProfile = created;
            }
            subscribeToFriendRequests();
        }
    } catch (e) {
        console.error('Initial auth check failed', e);
    }
    renderSocialTab();
})();

// ========== REALTIME SOCIAL ACTIVITY ==========
let _friendReqChannel = null;
let _activityChannel = null;
function subscribeToFriendRequests() {
    if (!sb || !currentUser) return;
    try {
        if (!_friendReqChannel) {
            _friendReqChannel = sb.channel('friend-reqs-' + currentUser.id)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'friend_requests',
                    filter: `to_uid=eq.${currentUser.id}`
                }, () => {
                    if (typeof renderFriendsView === 'function') {
                        try { renderFriendsView(); } catch (e) { console.error(e); }
                    }
                    if (typeof showToast === 'function') showToast('New friend request!');
                })
                .subscribe();
        }

        // New comments on the user's own posts
        if (!_activityChannel) {
            _activityChannel = sb.channel('activity-' + currentUser.id)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'comments'
                }, async (payload) => {
                    try {
                        const c = payload.new;
                        if (!c || c.uid === currentUser.id) return; // ignore own comments
                        // Only notify if the comment is on a post owned by current user
                        const { data: post } = await sb.from('posts').select('uid').eq('id', c.post_id).maybeSingle();
                        if (post && post.uid === currentUser.id) {
                            showToast(`@${c.username} commented on your post`);
                            if (socialView === 'feed' && typeof loadFeed === 'function') loadFeed();
                        }
                    } catch (e) { console.error(e); }
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'posts',
                    filter: `uid=eq.${currentUser.id}`
                }, (payload) => {
                    try {
                        const before = payload.old?.likes || [];
                        const after = payload.new?.likes || [];
                        if (after.length > before.length) {
                            const newLiker = after.find(u => !before.includes(u));
                            if (newLiker && newLiker !== currentUser.id) {
                                showToast('Someone liked your post');
                                if (socialView === 'feed' && typeof loadFeed === 'function') loadFeed();
                            }
                        }
                    } catch (e) { console.error(e); }
                })
                .subscribe();
        }
    } catch (e) {
        console.error('subscribeToFriendRequests failed:', e);
    }
}

// Also re-render whenever the user opens the Social tab (defensive).
// If we have a signed-in user but no profile yet, try once more to create one.
function attachSocialTabHook() {
    const socialBtn = document.querySelector('.tab-btn[data-tab="social"]');
    if (socialBtn && !socialBtn.dataset.socialHooked) {
        socialBtn.dataset.socialHooked = '1';
        socialBtn.addEventListener('click', async () => {
            try {
                if (currentUser && !userProfile) {
                    const created = await ensureProfileExists();
                    if (created) userProfile = created;
                }
                if (typeof renderSocialTab === 'function') renderSocialTab();
            } catch (e) { console.error('Social tab click handler failed', e); }
        });
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachSocialTabHook);
} else {
    attachSocialTabHook();
}

// ========== PROFILE ==========

// Recovery: try to find an existing profile attached to this auth account
// (handles the case where the row exists but the initial fetch failed/timed out
// and the user is being shown the setup screen incorrectly).
// Direct REST profile setup — bypasses supabase-js entirely.
// Use this when the library is in a broken state (queries hanging, etc).
async function directProfileSetup() {
    if (!sb) return showToast('Supabase not loaded');
    showToast('Connecting directly...');
    try {
        // Get the current access token from supabase-js (this part doesn't hang)
        const { data: sess } = await sb.auth.getSession();
        const token = sess?.session?.access_token;
        const uid = sess?.session?.user?.id || currentUser?.id;
        const email = sess?.session?.user?.email || currentUser?.email;
        if (!token || !uid) {
            showToast('Not signed in — please log in first');
            return;
        }

        const headers = {
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
        };
        const base = SUPABASE_URL + '/rest/v1/profiles';

        // 1) Look up by id directly
        const lookupResp = await fetch(`${base}?id=eq.${encodeURIComponent(uid)}&select=*`, { headers, cache: 'no-store' });
        if (!lookupResp.ok) {
            showToast('Lookup HTTP ' + lookupResp.status);
            return;
        }
        const lookupRows = await lookupResp.json();
        if (Array.isArray(lookupRows) && lookupRows.length > 0) {
            userProfile = lookupRows[0];
            renderSocialTab();
            showToast('Welcome back, @' + userProfile.username);
            return;
        }

        // 2) No row — create one with a username derived from email
        const emailPrefix = (email || '').split('@')[0]
            .toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'lifter';
        let username = emailPrefix;
        // Try a few candidates if taken
        for (let i = 0; i < 5; i++) {
            const checkResp = await fetch(`${base}?username=eq.${encodeURIComponent(username)}&select=id`, { headers, cache: 'no-store' });
            const rows = await checkResp.json();
            if (!Array.isArray(rows) || rows.length === 0) break;
            if (rows[0].id === uid) break; // already mine
            username = emailPrefix + Math.floor(Math.random() * 9000 + 1000);
        }

        let stats = {};
        try { stats = getPublicStats(); } catch (e) {}

        const insertResp = await fetch(base, {
            method: 'POST',
            headers: { ...headers, Prefer: 'return=representation,resolution=merge-duplicates' },
            body: JSON.stringify({
                id: uid,
                username,
                display_name: email?.split('@')[0] || username,
                bio: '',
                stats,
                friends: [],
            }),
        });
        if (!insertResp.ok) {
            const txt = await insertResp.text();
            console.error('Direct insert failed:', insertResp.status, txt);
            showToast('Create failed: HTTP ' + insertResp.status);
            return;
        }
        const created = await insertResp.json();
        userProfile = Array.isArray(created) ? created[0] : created;
        renderSocialTab();
        showToast('Profile created as @' + userProfile.username);
    } catch (e) {
        console.error('directProfileSetup crashed:', e);
        showToast('Direct setup failed: ' + (e.message || 'unknown'));
    }
}

async function recoverExistingProfile() {
    if (!sb) return showToast('Cannot connect to server');
    if (!currentUser) return showToast('Sign in first');
    showToast('Looking up your account...');
    const withTimeout = (p, ms) => Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))
    ]);
    try {
        const { data, error } = await withTimeout(
            sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
            8000
        );
        if (error) {
            console.error('Recover error:', error);
            showToast('Lookup failed: ' + error.message);
            return;
        }
        if (data) {
            userProfile = data;
            renderSocialTab();
            showToast('Welcome back, @' + data.username);
            return;
        }
        showToast('No profile found for this email — pick a username to create one');
    } catch (e) {
        console.error('recoverExistingProfile crashed:', e);
        if (e.message === 'TIMEOUT') {
            showToast('Timed out — old app cache is blocking. Tap Run Diagnostics.');
        } else {
            showToast('Error: ' + (e.message || 'unknown'));
        }
    }
}

// Direct fetch to Supabase REST endpoint, bypassing the supabase-js client.
// If THIS works but the client doesn't, the issue is library/auth state.
// If this also fails, the issue is network/service-worker.
async function runSocialDiagnostics() {
    const lines = [];
    const log = (s) => { lines.push(s); console.log('[diag]', s); };

    log('SW controller: ' + (navigator.serviceWorker?.controller ? 'yes' : 'no'));
    if (navigator.serviceWorker?.getRegistration) {
        const reg = await navigator.serviceWorker.getRegistration();
        log('SW scope: ' + (reg?.scope || 'none'));
        log('SW state: ' + (reg?.active?.state || 'none'));
    }
    log('Online: ' + navigator.onLine);
    log('sb client: ' + (sb ? 'ok' : 'missing'));
    log('currentUser: ' + (currentUser?.email || currentUser?.id?.slice(0,8) || 'none'));

    // Direct REST fetch (bypasses supabase-js)
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const resp = await fetch(
            SUPABASE_URL + '/rest/v1/profiles?select=id&limit=1',
            { headers: { apikey: SUPABASE_ANON_KEY }, signal: ctrl.signal, cache: 'no-store' }
        );
        clearTimeout(t);
        log('Direct REST status: ' + resp.status);
    } catch (e) {
        log('Direct REST FAILED: ' + e.message);
    }

    // Show results in a modal-like banner
    const existing = document.getElementById('diag-results');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'diag-results';
    div.style.cssText = 'position:fixed;left:12px;right:12px;top:12px;z-index:9999;background:#1a1a1a;color:#fff;border:1px solid #d4af37;border-radius:10px;padding:14px;font-family:monospace;font-size:12px;max-height:60vh;overflow:auto;white-space:pre-wrap';
    div.textContent = lines.join('\n') + '\n\n[tap to dismiss]';
    div.onclick = () => div.remove();
    document.body.appendChild(div);
}

async function setupUsername() {
    if (!sb) return showToast('Cannot connect to server');
    if (!currentUser) return showToast('Not signed in');
    const input = document.getElementById('setup-username');
    if (!input) return;
    const raw = input.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (raw.length < 3) return showToast('Username must be 3+ characters');
    if (raw.length > 20) return showToast('Username must be under 20 characters');

    // Find the button and set a loading state so the user sees feedback
    const btn = document.querySelector('#social-setup button.btn-primary');
    const oldLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

    // Hard timeout so the button can never appear "frozen"
    const withTimeout = (p, ms, label) => Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timed out')), ms))
    ]);

    try {
        let stats = {};
        try { stats = getPublicStats(); } catch (e) { console.error('getPublicStats failed:', e); }

        // First check if THIS user already has a profile (e.g. re-launch lost session, fetched stale)
        const { data: mine } = await withTimeout(
            sb.from('profiles').select().eq('id', currentUser.id).maybeSingle(),
            12000, 'Profile lookup'
        );
        if (mine) {
            // Profile already exists for this account — just use it, no duplicate insert
            userProfile = mine;
            renderSocialTab();
            showToast('Welcome back, @' + mine.username);
            return;
        }

        // Username availability check
        const { data: existing, error: checkErr } = await withTimeout(
            sb.from('profiles').select('id').eq('username', raw).maybeSingle(),
            12000, 'Username check'
        );
        if (checkErr) {
            console.error('Username check error:', checkErr);
            showToast('Check failed: ' + checkErr.message);
            return;
        }
        if (existing && existing.id !== currentUser.id) { showToast('Username taken'); return; }

        const displayName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || raw;

        // Use upsert so a leftover row from a previous attempt won't cause a PK conflict
        const { error } = await withTimeout(
            sb.from('profiles').upsert({
                id: currentUser.id,
                username: raw,
                display_name: displayName,
                bio: '',
                stats,
                friends: [],
            }, { onConflict: 'id' }),
            12000, 'Create profile'
        );

        if (error) {
            console.error('Upsert profile error:', error);
            const hint = /relation|does not exist|column/i.test(error.message)
                ? ' (Run supabase-setup.sql in your Supabase project)'
                : '';
            showToast('Save failed: ' + error.message + hint);
            return;
        }

        const { data } = await sb.from('profiles').select().eq('id', currentUser.id).maybeSingle();
        userProfile = data || null;
        renderSocialTab();
        showToast('Profile created!');
    } catch (e) {
        console.error('setupUsername crashed:', e);
        showToast('Error: ' + (e.message || 'unknown'));
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = oldLabel || "Let's Go"; }
    }
}

function getPublicStats() {
    const workouts = DB.get('workouts', []);
    const prs = DB.get('prs', []);
    const weights = DB.get('weights', []);

    const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
    let streak = 0;
    if (dates.includes(today())) {
        streak = 1;
        let d = new Date();
        for (let i = 1; i < 365; i++) {
            d.setDate(d.getDate() - 1);
            if (dates.includes(d.toISOString().split('T')[0])) streak++;
            else break;
        }
    }

    const totalVolume = workouts.reduce((sum, w) =>
        sum + w.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);

    const exerciseCounts = {};
    workouts.forEach(w => { exerciseCounts[w.name] = (exerciseCounts[w.name] || 0) + 1; });
    const favorite = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0];

    return {
        totalWorkouts: workouts.length,
        streak,
        totalVolume,
        prsHit: prs.length,
        uniqueExercises: new Set(workouts.map(w => w.name)).size,
        favoriteExercise: favorite ? favorite[0] : '',
        currentWeight: weights.length > 0 ? weights[weights.length - 1].weight : 0
    };
}

async function syncStatsToSupabase() {
    if (!currentUser || !userProfile) return;
    const stats = getPublicStats();
    await sb.from('profiles').update({ stats }).eq('id', currentUser.id);
    userProfile.stats = stats;
}

async function updateBio() {
    const bio = document.getElementById('profile-bio-input').value.trim().slice(0, 150);
    await sb.from('profiles').update({ bio }).eq('id', currentUser.id);
    userProfile.bio = bio;
    showToast('Bio updated');
}

// ========== PROFILE PICTURE ==========

async function uploadProfilePic(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!sb) return showToast('Cannot connect to server');
    if (!currentUser) return showToast('Sign in first');

    showToast('Uploading...');
    try {
        const compressed = await compressImage(file);
        const path = `${currentUser.id}/avatar.jpg`;
        const { error: upErr } = await sb.storage.from('avatars').upload(path, compressed, {
            contentType: 'image/jpeg',
            upsert: true
        });
        if (upErr) {
            console.error('Avatar upload error:', upErr);
            const msg = (upErr.message || '').toLowerCase();
            if (msg.includes('bucket') || msg.includes('not found')) {
                showToast('Avatars bucket missing — run supabase-setup.sql');
            } else if (msg.includes('row-level') || msg.includes('policy')) {
                showToast('Permission denied — re-run supabase-setup.sql');
            } else {
                showToast('Upload failed: ' + upErr.message);
            }
            return;
        }

        const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
        const profile_pic = urlData.publicUrl + '?t=' + Date.now();

        const { error: updErr } = await sb.from('profiles').update({ profile_pic }).eq('id', currentUser.id);
        if (updErr) {
            console.error('Profile update error:', updErr);
            showToast('Saved photo but profile update failed: ' + updErr.message);
            return;
        }
        userProfile.profile_pic = profile_pic;
        renderProfileView();
        showToast('Profile picture updated!');
    } catch (e) {
        console.error('uploadProfilePic crashed:', e);
        showToast('Upload failed: ' + (e.message || 'unknown'));
    }
}

// ========== PRIVACY ==========

async function toggleAccountPrivacy(isPublic) {
    await sb.from('profiles').update({ is_public: isPublic }).eq('id', currentUser.id);
    userProfile.is_public = isPublic;
    showToast(isPublic ? 'Account set to public' : 'Account set to private');
}

// ========== VERSE / MESSAGE ==========

function showVerseTab(tab) {
    document.getElementById('verse-picker').classList.toggle('hidden', tab !== 'verse');
    document.getElementById('message-input-area').classList.toggle('hidden', tab !== 'message');
    document.getElementById('verse-tab-btn').classList.toggle('active', tab === 'verse');
    document.getElementById('message-tab-btn').classList.toggle('active', tab === 'message');
}

function populateVerseSelect(verses) {
    const sel = document.getElementById('verse-select');
    sel.innerHTML = '<option value="">-- Select a verse (optional) --</option>';
    verses.forEach((v, i) => {
        sel.innerHTML += `<option value="${i}">${v.ref} - ${v.text.slice(0, 60)}...</option>`;
    });
}

function filterVerses(query) {
    const q = query.toLowerCase();
    const filtered = q ? BIBLE_VERSES.filter(v =>
        v.ref.toLowerCase().includes(q) || v.text.toLowerCase().includes(q)
    ) : BIBLE_VERSES;
    populateVerseSelect(filtered);
    document.getElementById('verse-select')._filtered = filtered;
}

function previewVerse() {
    const sel = document.getElementById('verse-select');
    const preview = document.getElementById('verse-preview');
    const idx = sel.value;
    if (idx === '') {
        preview.classList.add('hidden');
        return;
    }
    const verses = sel._filtered || BIBLE_VERSES;
    const v = verses[parseInt(idx)];
    preview.innerHTML = `<strong>${v.ref}</strong><br>${v.text}`;
    preview.classList.remove('hidden');
}

function getVerseOrMessage() {
    const verseVisible = !document.getElementById('verse-picker').classList.contains('hidden');
    if (verseVisible) {
        const sel = document.getElementById('verse-select');
        if (sel.value === '') return null;
        const verses = sel._filtered || BIBLE_VERSES;
        const v = verses[parseInt(sel.value)];
        return { type: 'verse', reference: v.ref, text: v.text };
    } else {
        const msg = document.getElementById('post-message').value.trim();
        if (!msg) return null;
        return { type: 'message', text: msg };
    }
}

// ========== FRIENDS ==========

async function searchUsers() {
    const query = document.getElementById('friend-search').value.trim().toLowerCase();
    if (query.length < 2) return;
    const container = document.getElementById('search-results');

    const { data, error } = await sb.from('profiles')
        .select('id, username, display_name, is_public, profile_pic')
        .ilike('username', `${query}%`)
        .neq('id', currentUser.id)
        .limit(10);

    if (error || !data || data.length === 0) {
        container.innerHTML = '<p class="empty-state">No users found</p>';
        return;
    }

    const friends = userProfile.friends || [];
    container.innerHTML = data.map(u => {
        const isFriend = friends.includes(u.id);
        const privIcon = u.is_public === false ? ' &#x1F512;' : '';
        const uAvatar = u.profile_pic
            ? `<img class="post-avatar" src="${u.profile_pic}" alt="">`
            : `<div class="post-avatar-letter">${(u.display_name || '?')[0].toUpperCase()}</div>`;
        return `<div class="friend-item">
            <div class="friend-info" style="flex-direction:row;align-items:center;gap:10px">
                ${uAvatar}
                <div>
                    <strong>@${escapeHtml(u.username)}${privIcon}</strong>
                    <span style="display:block">${escapeHtml(u.display_name)}</span>
                </div>
            </div>
            ${isFriend
                ? '<span class="friend-badge">Friends</span>'
                : `<button class="btn btn-primary btn-sm" onclick="sendFriendRequest('${u.id}','${escapeHtml(u.username)}')">Add</button>`
            }
        </div>`;
    }).join('');
}

async function sendFriendRequest(toUid, toUsername) {
    // Check for existing pending request
    const { data: existing } = await sb.from('friend_requests')
        .select('id')
        .eq('from_uid', currentUser.id)
        .eq('to_uid', toUid)
        .eq('status', 'pending');

    if (existing && existing.length > 0) return showToast('Request already sent');

    // Check if they sent us one — auto-accept
    const { data: reverse } = await sb.from('friend_requests')
        .select('id')
        .eq('from_uid', toUid)
        .eq('to_uid', currentUser.id)
        .eq('status', 'pending');

    if (reverse && reverse.length > 0) {
        await sbAcceptFriendRequest(reverse[0].id);
        return;
    }

    const { error } = await sb.from('friend_requests').insert({
        from_uid: currentUser.id,
        to_uid: toUid,
        from_username: userProfile.username,
        from_display_name: userProfile.display_name
    });

    if (error) return showToast(error.message);
    showToast(`Request sent to @${toUsername}`);
}

async function sbAcceptFriendRequest(requestId) {
    const { error } = await sb.rpc('accept_friend_request', { request_id: requestId });
    if (error) return showToast(error.message);

    // Reload profile to get updated friends
    const { data } = await sb.from('profiles').select().eq('id', currentUser.id).single();
    userProfile = data;
    showToast('Friend added!');
    renderFriendsView();
}

async function sbDeclineFriendRequest(requestId) {
    await sb.from('friend_requests').update({ status: 'declined' }).eq('id', requestId);
    showToast('Request declined');
    renderFriendsView();
}

async function sbRemoveFriend(friendUid) {
    if (!confirm('Remove this friend?')) return;
    const { error } = await sb.rpc('remove_friend', { friend_uid: friendUid });
    if (error) return showToast(error.message);

    const { data } = await sb.from('profiles').select().eq('id', currentUser.id).single();
    userProfile = data;
    renderFriendsView();
    showToast('Friend removed');
}

// ========== POSTS / FEED ==========

function getTodayWorkoutStats() {
    const workouts = DB.get('workouts', []).filter(w => w.date === today());
    if (workouts.length === 0) return null;
    const totalVol = workouts.reduce((sum, w) =>
        sum + w.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);
    let topLift = { name: '', weight: 0, reps: 0 };
    workouts.forEach(w => {
        w.sets.forEach(s => {
            if (s.weight > topLift.weight) topLift = { name: w.name, weight: s.weight, reps: s.reps };
        });
    });
    return {
        exercises: workouts.map(w => w.name),
        totalVolume: totalVol,
        topLift,
        setCount: workouts.reduce((s, w) => s + w.sets.length, 0)
    };
}

function compressImage(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > 800) { h = (800 / w) * h; w = 800; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(resolve, 'image/jpeg', 0.7);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function openPostModal() {
    const modal = document.getElementById('post-modal');
    const stats = getTodayWorkoutStats();
    const statsHtml = stats
        ? `<div class="post-auto-stats">
            <p><strong>${stats.exercises.length} exercise${stats.exercises.length > 1 ? 's' : ''}</strong> &middot; ${stats.setCount} sets &middot; ${parseFloat(lbsToDisplay(stats.totalVolume)).toLocaleString()} ${wu()}</p>
            ${stats.topLift.name ? `<p>Top lift: ${stats.topLift.name} ${lbsToDisplay(stats.topLift.weight)}${wu()} x ${stats.topLift.reps}</p>` : ''}
           </div>`
        : '<p class="empty-state" style="padding:10px 0">No workout logged today — stats attach when you train</p>';

    document.getElementById('post-stats-preview').innerHTML = statsHtml;
    document.getElementById('post-caption').value = '';
    document.getElementById('post-photo-preview').innerHTML = '';
    document.getElementById('post-photo-input').value = '';
    document.getElementById('post-submit-btn').disabled = false;
    document.getElementById('post-submit-btn').textContent = 'Post';
    // Reset verse/message
    populateVerseSelect(BIBLE_VERSES);
    document.getElementById('verse-select')._filtered = BIBLE_VERSES;
    document.getElementById('verse-search').value = '';
    document.getElementById('verse-preview').classList.add('hidden');
    document.getElementById('post-message').value = '';
    showVerseTab('verse');
    modal.classList.remove('hidden');
}

function closePostModal() {
    document.getElementById('post-modal').classList.add('hidden');
}

function previewPostPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('post-photo-preview').innerHTML = `<img src="${e.target.result}" style="width:100%;border-radius:var(--radius-sm);margin-top:10px;">`;
    };
    reader.readAsDataURL(file);
}

async function submitPost() {
    const fileInput = document.getElementById('post-photo-input');
    const caption = document.getElementById('post-caption').value.trim();
    const file = fileInput.files[0];

    if (!file && !caption) return showToast('Add a photo or caption');

    const btn = document.getElementById('post-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Posting...';

    try {
        let photo_url = '';
        if (file) {
            const compressed = await compressImage(file);
            const path = `${currentUser.id}/${Date.now()}.jpg`;
            const { error: upErr } = await sb.storage.from('posts').upload(path, compressed, {
                contentType: 'image/jpeg'
            });
            if (upErr) throw upErr;
            const { data: urlData } = sb.storage.from('posts').getPublicUrl(path);
            photo_url = urlData.publicUrl;
        }

        const stats = getTodayWorkoutStats();
        const verseOrMessage = getVerseOrMessage();
        const { error } = await sb.from('posts').insert({
            uid: currentUser.id,
            username: userProfile.username,
            display_name: userProfile.display_name,
            photo_url,
            caption,
            workout: stats,
            likes: [],
            verse_or_message: verseOrMessage
        });

        if (error) throw error;

        closePostModal();
        showToast('Posted!');
        loadFeed();
    } catch (e) {
        showToast('Failed: ' + e.message);
    }
    btn.disabled = false;
    btn.textContent = 'Post';
}

async function loadFeed() {
    const container = document.getElementById('feed-posts');
    if (!container) return;

    const friends = userProfile.friends || [];
    const uids = [currentUser.id, ...friends];

    const { data: posts, error } = await sb.from('posts')
        .select()
        .in('uid', uids.slice(0, 30))
        .order('created_at', { ascending: false })
        .limit(30);

    if (error || !posts || posts.length === 0) {
        container.innerHTML = '<p class="empty-state">No posts yet. Be the first — post a lift!</p>';
        return;
    }

    // Batch-fetch profile pics for post authors
    const uniqueUids = [...new Set(posts.map(p => p.uid))];
    const { data: authorProfiles } = await sb.from('profiles')
        .select('id, profile_pic')
        .in('id', uniqueUids);
    const avatarMap = {};
    if (authorProfiles) authorProfiles.forEach(a => { avatarMap[a.id] = a.profile_pic; });

    container.innerHTML = posts.map(p => {
        const time = timeAgo(new Date(p.created_at).getTime());
        const liked = p.likes && p.likes.includes(currentUser.id);
        const likeCount = p.likes ? p.likes.length : 0;
        const isOwn = p.uid === currentUser.id;

        let statsHtml = '';
        if (p.workout) {
            statsHtml = `<div class="post-workout-stats">
                <span>${p.workout.exercises.join(', ')}</span>
                <span>${parseFloat(lbsToDisplay(p.workout.totalVolume)).toLocaleString()} ${wu()} total</span>
                ${p.workout.topLift && p.workout.topLift.name
                    ? `<span class="post-top-lift">${p.workout.topLift.name}: ${lbsToDisplay(p.workout.topLift.weight)}${wu()} x ${p.workout.topLift.reps}</span>`
                    : ''}
            </div>`;
        }

        const authorPic = avatarMap[p.uid];
        const avatarHtml = authorPic
            ? `<img class="post-avatar" src="${authorPic}" alt="">`
            : `<div class="post-avatar-letter">${(p.display_name || '?')[0].toUpperCase()}</div>`;

        let verseHtml = '';
        if (p.verse_or_message) {
            if (p.verse_or_message.type === 'verse') {
                verseHtml = `<div class="post-verse">
                    <span class="post-verse-ref">${escapeHtml(p.verse_or_message.reference)}</span>
                    <span class="post-verse-text">${escapeHtml(p.verse_or_message.text)}</span>
                </div>`;
            } else if (p.verse_or_message.type === 'message') {
                verseHtml = `<div class="post-message-block">${escapeHtml(p.verse_or_message.text)}</div>`;
            }
        }

        return `<div class="feed-post">
            <div class="post-header">
                <div class="post-user">
                    ${avatarHtml}
                    <div>
                        <strong>@${escapeHtml(p.username)}</strong>
                        <span class="post-time">${time}</span>
                    </div>
                </div>
                ${isOwn ? `<button class="delete-btn" onclick="deletePost('${p.id}')">&times;</button>` : ''}
            </div>
            ${p.photo_url ? `<img class="post-photo" src="${p.photo_url}" loading="lazy">` : ''}
            ${statsHtml}
            ${p.caption ? `<p class="post-caption">${escapeHtml(p.caption)}</p>` : ''}
            ${verseHtml}
            <div class="post-actions">
                <button class="post-like-btn ${liked ? 'liked' : ''}" onclick="sbToggleLike('${p.id}')">
                    ${liked ? '&#x2764;' : '&#x2661;'} ${likeCount > 0 ? likeCount : ''}
                </button>
                <button class="post-comment-btn" onclick="toggleComments('${p.id}')">
                    &#x1F4AC; Comments
                </button>
            </div>
            <div id="comments-wrap-${p.id}" class="comments-wrap hidden">
                <div id="comments-${p.id}" class="comments-list"></div>
                <div class="comment-input-row">
                    <input type="text" id="comment-input-${p.id}" placeholder="Add a comment..." maxlength="280" onkeydown="if(event.key==='Enter')submitComment('${p.id}')">
                    <button class="btn btn-primary btn-sm" onclick="submitComment('${p.id}')">Post</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function sbToggleLike(postId) {
    const { error } = await sb.rpc('toggle_like', { post_id: postId });
    if (error) return showToast(error.message);
    loadFeed();
}

async function deletePost(postId) {
    if (!confirm('Delete this post?')) return;
    await sb.from('posts').delete().eq('id', postId);
    loadFeed();
    showToast('Post deleted');
}

// ========== COMMENTS ==========

async function loadComments(postId) {
    const container = document.getElementById('comments-' + postId);
    if (!container) return;
    const { data: comments } = await sb.from('comments')
        .select()
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (!comments || comments.length === 0) {
        container.innerHTML = '<p class="comments-empty">Be the first to comment</p>';
        return;
    }
    container.innerHTML = comments.map(c => {
        const isOwn = c.uid === currentUser.id;
        return `<div class="comment-item">
            <div class="comment-body">
                <strong>@${escapeHtml(c.username)}</strong>
                <span>${escapeHtml(c.text)}</span>
            </div>
            ${isOwn ? `<button class="comment-delete" onclick="deleteComment('${c.id}','${postId}')">&times;</button>` : ''}
        </div>`;
    }).join('');
}

async function toggleComments(postId) {
    const wrap = document.getElementById('comments-wrap-' + postId);
    if (!wrap) return;
    const isHidden = wrap.classList.contains('hidden');
    wrap.classList.toggle('hidden');
    if (isHidden) loadComments(postId);
}

async function submitComment(postId) {
    const input = document.getElementById('comment-input-' + postId);
    const text = input.value.trim();
    if (!text) return;
    const { error } = await sb.from('comments').insert({
        post_id: postId,
        uid: currentUser.id,
        username: userProfile.username,
        display_name: userProfile.display_name,
        text
    });
    if (error) return showToast(error.message);
    input.value = '';
    loadComments(postId);
}

async function deleteComment(commentId, postId) {
    await sb.from('comments').delete().eq('id', commentId);
    loadComments(postId);
}

// ========== SHARE FROM WORKOUT ==========

function openPostModalFromWorkout(prefillCaption) {
    if (!currentUser || !userProfile) {
        // Switch to social tab so they can sign up
        if (typeof switchTab === 'function') switchTab('social');
        showToast('Sign in to share your workout');
        return;
    }
    openPostModal();
    if (prefillCaption) {
        document.getElementById('post-caption').value = prefillCaption;
    }
}

// ========== UI RENDERING ==========

function renderSocialTab() {
    const authEl = document.getElementById('social-auth');
    const setupEl = document.getElementById('social-setup');
    const mainEl = document.getElementById('social-main');
    if (!authEl) return;

    authEl.classList.add('hidden');
    setupEl.classList.add('hidden');
    mainEl.classList.add('hidden');

    if (!currentUser) {
        authEl.classList.remove('hidden');
        return;
    }

    if (!userProfile) {
        setupEl.classList.remove('hidden');
        const name = currentUser.user_metadata?.display_name || currentUser.email || '';
        document.getElementById('setup-display-name').textContent = name;
        const emailEl = document.getElementById('setup-account-email');
        if (emailEl) emailEl.textContent = currentUser.email || currentUser.id.slice(0, 8);
        return;
    }

    mainEl.classList.remove('hidden');
    document.getElementById('social-username').textContent = `@${userProfile.username}`;
    document.getElementById('social-display-name').textContent = userProfile.display_name;
    showSocialView(socialView);
}

function showAuthTab(tab) {
    document.getElementById('auth-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('auth-signup').classList.toggle('hidden', tab !== 'signup');
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.auth-tab[onclick*="${tab}"]`).classList.add('active');
}

function showSocialView(view) {
    socialView = view;
    document.querySelectorAll('.social-view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.social-nav-btn').forEach(b => b.classList.remove('active'));

    const viewEl = document.getElementById('social-' + view);
    if (viewEl) viewEl.classList.remove('hidden');

    const btn = document.querySelector(`.social-nav-btn[onclick*="${view}"]`);
    if (btn) btn.classList.add('active');

    if (view === 'feed') loadFeed();
    if (view === 'friends') renderFriendsView();
    if (view === 'profile') renderProfileView();
}

async function renderFriendsView() {
    const container = document.getElementById('social-friends');
    if (!container) return;

    // Pending requests to me
    const { data: requests } = await sb.from('friend_requests')
        .select()
        .eq('to_uid', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    let html = '';

    if (requests && requests.length > 0) {
        html += '<div class="card"><h2>Friend Requests</h2>';
        requests.forEach(r => {
            html += `<div class="friend-item">
                <div class="friend-info">
                    <strong>@${escapeHtml(r.from_username)}</strong>
                    <span>${escapeHtml(r.from_display_name)}</span>
                </div>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-primary btn-sm" onclick="sbAcceptFriendRequest('${r.id}')">Accept</button>
                    <button class="btn btn-secondary btn-sm" onclick="sbDeclineFriendRequest('${r.id}')">Decline</button>
                </div>
            </div>`;
        });
        html += '</div>';
    }

    // Badge
    const badge = document.getElementById('request-badge');
    if (badge) {
        if (requests && requests.length > 0) {
            badge.textContent = requests.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Search
    html += `<div class="card">
        <h2>Find Friends</h2>
        <div style="display:flex;gap:8px">
            <input type="text" id="friend-search" placeholder="Search by username" onkeydown="if(event.key==='Enter')searchUsers()">
            <button class="btn btn-primary" onclick="searchUsers()" style="white-space:nowrap">Search</button>
        </div>
        <div id="search-results" style="margin-top:10px"></div>
    </div>`;

    // Friends list
    const friends = userProfile.friends || [];
    html += '<div class="card"><h2>My Friends</h2>';
    if (friends.length === 0) {
        html += '<p class="empty-state">No friends yet. Search for users above!</p>';
    } else {
        const { data: friendProfiles } = await sb.from('profiles')
            .select('id, username, display_name, stats, profile_pic')
            .in('id', friends);

        if (friendProfiles) {
            friendProfiles.forEach(f => {
                const s = f.stats || {};
                const fAvatar = f.profile_pic
                    ? `<img class="post-avatar" src="${f.profile_pic}" alt="">`
                    : `<div class="post-avatar-letter">${(f.display_name || '?')[0].toUpperCase()}</div>`;
                html += `<div class="friend-item">
                    <div class="friend-info" style="flex-direction:row;align-items:center;gap:10px">
                        ${fAvatar}
                        <div>
                            <strong>@${escapeHtml(f.username)}</strong>
                            <span style="display:block">${s.totalWorkouts || 0} workouts${s.streak > 0 ? ' &middot; ' + s.streak + ' day streak' : ''}</span>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="sbRemoveFriend('${f.id}')">Remove</button>
                </div>`;
            });
        }
    }
    html += '</div>';

    container.innerHTML = html;
}

function renderProfileView() {
    const container = document.getElementById('social-profile');
    if (!container || !userProfile) return;

    const s = userProfile.stats || {};
    const avatarContent = userProfile.profile_pic
        ? `<img class="profile-avatar-img" src="${userProfile.profile_pic}" alt="">`
        : `<div class="profile-avatar">${(userProfile.display_name || '?')[0].toUpperCase()}</div>`;

    container.innerHTML = `
        <div class="card profile-card">
            <div class="profile-header-row">
                <div class="profile-avatar-wrapper" onclick="document.getElementById('avatar-upload').click()">
                    ${avatarContent}
                    <div class="profile-avatar-edit" aria-label="Change photo"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></div>
                    <input type="file" id="avatar-upload" accept="image/*" onchange="uploadProfilePic(event)" style="display:none">
                </div>
                <div>
                    <h2 style="margin:0">@${escapeHtml(userProfile.username)}</h2>
                    <p style="color:var(--text-muted);font-size:13px;margin-top:2px">${escapeHtml(userProfile.display_name)}</p>
                </div>
            </div>
            <p class="profile-bio">${userProfile.bio ? escapeHtml(userProfile.bio) : '<em style="color:var(--text-muted)">No bio yet</em>'}</p>
            <div style="display:flex;gap:6px;margin:12px 0">
                <input type="text" id="profile-bio-input" placeholder="Write a short bio..." value="${escapeHtml(userProfile.bio || '')}" maxlength="150" style="flex:1">
                <button class="btn btn-secondary btn-sm" onclick="updateBio()" style="margin-top:0">Save</button>
            </div>
        </div>

        <div class="card">
            <h2>Public Stats</h2>
            <div class="profile-stats-grid">
                <div class="profile-stat">
                    <span class="profile-stat-val">${s.totalWorkouts || 0}</span>
                    <span class="profile-stat-label">Workouts</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-val">${s.streak || 0}</span>
                    <span class="profile-stat-label">Day Streak</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-val">${s.prsHit || 0}</span>
                    <span class="profile-stat-label">PRs Hit</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-val">${s.uniqueExercises || 0}</span>
                    <span class="profile-stat-label">Exercises</span>
                </div>
                <div class="profile-stat" style="grid-column:1/-1">
                    <span class="profile-stat-val">${s.totalVolume ? parseFloat(lbsToDisplay(s.totalVolume)).toLocaleString() + ' ' + wu() : '0'}</span>
                    <span class="profile-stat-label">Total Volume</span>
                </div>
                ${s.favoriteExercise ? `<div class="profile-stat" style="grid-column:1/-1">
                    <span class="profile-stat-val">${escapeHtml(s.favoriteExercise)}</span>
                    <span class="profile-stat-label">Favorite Exercise</span>
                </div>` : ''}
            </div>
        </div>

        <div class="card">
            <h2>Account</h2>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">${currentUser.email}</p>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Friends: ${(userProfile.friends || []).length}</p>
            <div class="privacy-toggle-row">
                <span>Public Account</span>
                <label class="toggle-switch">
                    <input type="checkbox" ${userProfile.is_public !== false ? 'checked' : ''} onchange="toggleAccountPrivacy(this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <p class="privacy-hint">When private, only friends can see your posts</p>
            <button class="btn btn-secondary btn-full" style="margin-top:12px" onclick="syncStatsToSupabase().then(()=>{showToast('Stats synced!');renderProfileView();})">Sync Stats Now</button>
            <button class="btn btn-danger btn-full" style="margin-top:8px" onclick="socialSignOut()">Sign Out</button>
        </div>
    `;
}

function timeAgo(ms) {
    const seconds = Math.floor((Date.now() - ms) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(ms).toLocaleDateString();
}
