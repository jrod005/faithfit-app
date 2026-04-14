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

    // Direct REST signup so it works even when supabase-js is hung
    try {
        const resp = await fetch(SUPABASE_URL + '/auth/v1/signup', {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password: pass,
                data: { display_name: name },
            }),
            cache: 'no-store',
        });
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            return showToast(body.error_description || body.msg || ('Signup failed: HTTP ' + resp.status));
        }
        // If a session came back (confirmations disabled), persist it and sign in
        if (body.access_token) {
            const session = {
                access_token: body.access_token,
                refresh_token: body.refresh_token,
                expires_in: body.expires_in,
                expires_at: Math.floor(Date.now() / 1000) + (body.expires_in || 3600),
                token_type: body.token_type || 'bearer',
                user: body.user,
            };
            try {
                localStorage.setItem('ironfaith-direct-session', JSON.stringify(session));
            } catch (e) {}
            currentUser = body.user;
            showToast('Account created!');
            await directProfileSetup();
        } else {
            showToast('Account created! Check your email to confirm, then log in.');
        }
    } catch (e) {
        showToast('Signup failed: ' + (e.message || 'unknown'));
    }
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
        // Store under our own key that supabase-js doesn't touch, so it
        // can't be cleared by the library re-init on next load.
        try {
            localStorage.setItem('ironfaith-direct-session', JSON.stringify(session));
            localStorage.setItem('ironfaith-auth', JSON.stringify({ currentSession: session, expiresAt: session.expires_at }));
        } catch (e) { console.warn('Session save failed:', e); }

        currentUser = body.user;

        // Try to attach to sb for future calls but don't await it — if the
        // library is hung this can never resolve.
        try {
            if (sb && sb.auth && sb.auth.setSession) {
                sb.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
                    .catch(e => console.warn('setSession failed:', e));
            }
        } catch (e) { console.warn('setSession threw:', e); }

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
    // Wipe direct session immediately so we're not depending on the lib
    try { localStorage.removeItem('ironfaith-direct-session'); } catch (e) {}
    try { localStorage.removeItem('ironfaith-auth'); } catch (e) {}
    // Best-effort lib signOut, but don't await it
    try {
        if (sb && sb.auth && sb.auth.signOut) {
            sb.auth.signOut().catch(() => {});
        }
    } catch (e) {}
    currentUser = null;
    userProfile = null;
    renderSocialTab();
    showToast('Signed out');
}

// Fetch profile with retry — direct REST so it works when supabase-js is hung
async function fetchProfileWithRetry(uid, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
        const profile = await directFetchProfile(uid);
        if (profile) return { data: profile, error: null };
        await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
    return { data: null, error: new Error('Profile fetch failed after retries') };
}

// Auto-create a profile row for a signed-in user who doesn't have one yet.
// Skips the username setup prompt entirely; user can rename later from Profile.
async function ensureProfileExists() {
    if (!currentUser) return null;
    try {
        const emailPrefix = (currentUser.email || '').split('@')[0]
            .toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14);
        let base = emailPrefix || 'lifter';
        if (base.length < 3) base = 'lifter';

        // Try a few candidates until one isn't taken — direct REST
        let username = base;
        for (let attempt = 0; attempt < 5; attempt++) {
            const clash = await directSelect(
                'profiles?username=eq.' + encodeURIComponent(username) + '&select=id'
            );
            if (!clash || clash.length === 0 || clash[0].id === currentUser.id) break;
            username = base + Math.floor(Math.random() * 9000 + 1000);
        }

        const displayName = currentUser.user_metadata?.display_name
            || currentUser.email?.split('@')[0]
            || username;

        let stats = {};
        try { stats = getPublicStats(); } catch (e) { console.error('getPublicStats failed:', e); }

        // Direct REST upsert via Prefer: resolution=merge-duplicates
        const headers = await directHeaders({
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation',
        });
        if (!headers) return null;
        // Only set id, username, display_name, stats — do NOT include friends
        // or bio so that merge-duplicates won't overwrite existing values.
        const resp = await fetch(SUPABASE_URL + '/rest/v1/profiles?on_conflict=id', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                id: currentUser.id,
                username,
                display_name: displayName,
                stats,
            }),
            cache: 'no-store',
        });
        if (!resp.ok) {
            console.error('ensureProfileExists HTTP', resp.status);
            return null;
        }
        const rows = await resp.json();
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
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
            // Persist to our own key so it survives PWA kill even if the
            // library is hung on next launch. Written from EVERY sign-in path.
            try {
                const directSess = {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_in: session.expires_in,
                    expires_at: session.expires_at || (Math.floor(Date.now() / 1000) + (session.expires_in || 3600)),
                    token_type: session.token_type || 'bearer',
                    user: session.user,
                };
                localStorage.setItem('ironfaith-direct-session', JSON.stringify(directSess));
            } catch (e) { console.warn('Failed to persist direct session:', e); }
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

// Bootstrap on load — defer to avoid racing with app.js's DOM bindings
function ironfaithSocialBootstrap() {
    if (!sb) {
        try { renderSocialTab(); } catch (e) {}
        return;
    }

    // FAST PATH: restore currentUser from localStorage synchronously.
    try {
        const stored = readStoredSession();
        if (stored?.user) {
            currentUser = stored.user;
            try { renderSocialTab(); } catch (e) {}
            // Background profile fetch via direct REST
            directFetchProfile(currentUser.id).then(profile => {
                if (profile) {
                    userProfile = profile;
                    try { renderSocialTab(); } catch (e) {}
                    try { pullSocialNameToLocal(); } catch (e) {}
                    if (typeof syncStatsToSupabase === 'function') {
                        try { syncStatsToSupabase(); } catch (e) {}
                    }
                }
            }).catch(e => console.error('directFetchProfile failed:', e));
        }
    } catch (e) {
        console.error('Fast-path session restore failed:', e);
    }

    // SLOW PATH: also try the library on a 2s race
    (async () => {
        try {
            const result = await Promise.race([
                sb.auth.getSession(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 2000))
            ]);
            const session = result?.data?.session;
            if (session?.user && !currentUser) {
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
            console.error('Initial auth check (lib) failed/timed out:', e);
        }
        try { renderSocialTab(); } catch (e) {}
    })();

    // Proactive token refresh: every 60s, check if the stored session is
    // close to expiring and refresh it preemptively. Without this, a long
    // idle session would die and the next user action would have to wait
    // for a refresh round-trip.
    setInterval(() => {
        try {
            const stored = readStoredSession();
            if (!stored?.refresh_token) return;
            // Refresh if expiring within the next 5 minutes
            const now = Math.floor(Date.now() / 1000);
            if (stored.expires_at && stored.expires_at - now < 300) {
                directRefreshToken();
            }
        } catch (e) {}
    }, 60000);

    // Belt-and-suspenders: every 5 seconds, if currentUser is set, persist
    // the session to our own key so it can survive PWA kill regardless of
    // which sign-in path was used.
    setInterval(() => {
        try {
            if (!currentUser) return;
            // Try lib session first
            if (sb && sb.auth && sb.auth.getSession) {
                Promise.race([
                    sb.auth.getSession(),
                    new Promise((_, rej) => setTimeout(() => rej(), 1000))
                ]).then(result => {
                    const s = result?.data?.session;
                    if (s?.access_token) {
                        const directSess = {
                            access_token: s.access_token,
                            refresh_token: s.refresh_token,
                            expires_in: s.expires_in,
                            expires_at: s.expires_at || (Math.floor(Date.now() / 1000) + (s.expires_in || 3600)),
                            token_type: s.token_type || 'bearer',
                            user: s.user,
                        };
                        localStorage.setItem('ironfaith-direct-session', JSON.stringify(directSess));
                    }
                }).catch(() => {});
            }
        } catch (e) {}
    }, 5000);
}

// Run after DOM is parsed so app.js has bound its handlers first
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ironfaithSocialBootstrap);
} else {
    setTimeout(ironfaithSocialBootstrap, 0);
}

// Generic direct-REST SELECT. `path` is everything after /rest/v1/.
// Example: directSelect('posts?uid=in.(uid1,uid2)&order=created_at.desc&limit=30')
// Refresh an expired access token via direct REST. Returns new session or null.
async function directRefreshToken() {
    try {
        const stored = readStoredSession();
        if (!stored?.refresh_token) return null;
        const resp = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
            method: 'POST',
            headers: {
                apikey: SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: stored.refresh_token }),
            cache: 'no-store',
        });
        if (!resp.ok) {
            console.error('directRefreshToken HTTP', resp.status);
            return null;
        }
        const body = await resp.json();
        const newSession = {
            access_token: body.access_token,
            refresh_token: body.refresh_token,
            expires_in: body.expires_in,
            expires_at: Math.floor(Date.now() / 1000) + (body.expires_in || 3600),
            token_type: body.token_type || 'bearer',
            user: body.user || stored.user,
        };
        try {
            localStorage.setItem('ironfaith-direct-session', JSON.stringify(newSession));
        } catch (e) {}
        return newSession;
    } catch (e) {
        console.error('directRefreshToken crashed:', e);
        return null;
    }
}

// Common headers for direct REST calls
async function directHeaders(extra) {
    let sessInfo = await getAccessTokenSafely();
    // If token is missing or expired, try to refresh
    if (!sessInfo?.token) {
        const refreshed = await directRefreshToken();
        if (refreshed) sessInfo = { token: refreshed.access_token, user: refreshed.user };
    }
    if (!sessInfo?.token) return null;
    return Object.assign({
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + sessInfo.token,
    }, extra || {});
}

// Map raw HTTP statuses to user-friendly toasts.
function friendlyHttpError(op, status, body) {
    const b = (body || '').toLowerCase();
    if (!navigator.onLine) return "You're offline — try again when reconnected";
    if (status === 401 || status === 403) {
        if (b.includes('jwt') || b.includes('expired')) return 'Session expired — please sign in again';
        if (b.includes('row-level security') || b.includes('policy')) return "You don't have permission for that";
        return 'Not authorized — please sign in again';
    }
    if (status === 404) return 'Not found';
    if (status === 409) {
        if (b.includes('duplicate') || b.includes('unique')) return 'That already exists';
        return 'Conflict — try refreshing';
    }
    if (status === 413) return 'File too large';
    if (status === 429) return 'Too many requests — slow down a sec';
    if (status >= 500) return 'Server hiccup — try again in a moment';
    if (status === 400) {
        if (b.includes('username')) return 'That username is taken or invalid';
        return 'Something was off with that request';
    }
    return 'Couldn’t ' + op + ' — please try again';
}

// Direct REST INSERT. Returns inserted row(s) or null on error.
async function directInsert(table, body) {
    try {
        const headers = await directHeaders({
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        });
        if (!headers) {
            if (typeof showToast === 'function') showToast('Not signed in');
            return null;
        }
        const resp = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            cache: 'no-store',
        });
        if (!resp.ok) {
            const err = await resp.text().catch(() => '');
            console.error('directInsert HTTP', resp.status, table, err);
            if (typeof logClientError === 'function') logClientError('insert:' + table, resp.status + ' ' + err.slice(0, 200));
            if (typeof showToast === 'function') showToast(friendlyHttpError('save', resp.status, err));
            return null;
        }
        return await resp.json();
    } catch (e) {
        console.error('directInsert crashed:', table, e);
        return null;
    }
}

// Direct REST UPDATE. `filter` is a PostgREST query string like 'id=eq.xyz'.
async function directUpdate(table, filter, body) {
    try {
        const headers = await directHeaders({
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        });
        if (!headers) return null;
        const resp = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + filter, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
            cache: 'no-store',
        });
        if (!resp.ok) {
            const err = await resp.text().catch(() => '');
            console.error('directUpdate HTTP', resp.status, table, err);
            if (typeof logClientError === 'function') logClientError('update:' + table, resp.status + ' ' + err.slice(0, 200));
            if (typeof showToast === 'function') showToast(friendlyHttpError('update', resp.status, err));
            return null;
        }
        return await resp.json();
    } catch (e) {
        console.error('directUpdate crashed:', e);
        return null;
    }
}

// Direct REST DELETE.
async function directDelete(table, filter) {
    try {
        const headers = await directHeaders();
        if (!headers) return false;
        const resp = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + filter, {
            method: 'DELETE',
            headers,
            cache: 'no-store',
        });
        if (!resp.ok) {
            console.error('directDelete HTTP', resp.status, table);
            if (typeof showToast === 'function') showToast(friendlyHttpError('delete', resp.status, ''));
            return false;
        }
        return true;
    } catch (e) {
        console.error('directDelete crashed:', e);
        return false;
    }
}

// Direct REST RPC call (Postgres function).
async function directRpc(fnName, args) {
    try {
        const headers = await directHeaders({
            'Content-Type': 'application/json',
        });
        if (!headers) return null;
        const resp = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fnName, {
            method: 'POST',
            headers,
            body: JSON.stringify(args || {}),
            cache: 'no-store',
        });
        if (!resp.ok) {
            const err = await resp.text().catch(() => '');
            console.error('directRpc HTTP', resp.status, fnName, err);
            if (typeof logClientError === 'function') logClientError('rpc:' + fnName, resp.status + ' ' + err.slice(0, 200));
            if (typeof showToast === 'function') showToast(friendlyHttpError('do that', resp.status, err));
            return null;
        }
        const text = await resp.text();
        // Many of our RPCs RETURN void → empty body. Treat success-with-empty-body as truthy.
        if (!text) return true;
        try { return JSON.parse(text); } catch (e) { return text; }
    } catch (e) {
        console.error('directRpc crashed:', fnName, e);
        return null;
    }
}

// Direct upload to Supabase storage. `file` is a Blob/File.
async function directStorageUpload(bucket, path, file, contentType) {
    try {
        const headers = await directHeaders({
            'Content-Type': contentType || 'application/octet-stream',
            'x-upsert': 'true',
        });
        if (!headers) return null;
        const resp = await fetch(SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + path, {
            method: 'POST',
            headers,
            body: file,
            cache: 'no-store',
        });
        if (!resp.ok) {
            const err = await resp.text().catch(() => '');
            console.error('directStorageUpload HTTP', resp.status, err);
            if (typeof showToast === 'function') showToast(friendlyHttpError('upload', resp.status, err));
            return null;
        }
        // Public URL convention for public buckets
        return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + path;
    } catch (e) {
        console.error('directStorageUpload crashed:', e);
        return null;
    }
}

async function directSelect(path) {
    try {
        const sessInfo = await getAccessTokenSafely();
        if (!sessInfo?.token) {
            if (typeof showToast === 'function') showToast('Please sign in to continue');
            return null;
        }
        const resp = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
            headers: {
                apikey: SUPABASE_ANON_KEY,
                Authorization: 'Bearer ' + sessInfo.token,
            },
            cache: 'no-store',
        });
        if (!resp.ok) {
            const body = await resp.text().catch(() => '');
            console.error('directSelect HTTP', resp.status, path, body);
            // Skip noisy "no rows" 406 toasts
            if (resp.status !== 406 && typeof showToast === 'function') {
                showToast(friendlyHttpError('load', resp.status, body));
            }
            return null;
        }
        return await resp.json();
    } catch (e) {
        console.error('directSelect crashed:', path, e);
        if (typeof showToast === 'function') {
            showToast(navigator.onLine ? "Couldn't load — please try again" : "You're offline");
        }
        return null;
    }
}

// Direct REST profile fetch — works when supabase-js is hung
async function directFetchProfile(uid) {
    try {
        const sessInfo = await getAccessTokenSafely();
        const token = sessInfo?.token;
        if (!token || !uid) return null;
        const resp = await fetch(
            SUPABASE_URL + '/rest/v1/profiles?id=eq.' + encodeURIComponent(uid) + '&select=*',
            {
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: 'Bearer ' + token,
                },
                cache: 'no-store',
            }
        );
        if (!resp.ok) {
            console.error('directFetchProfile HTTP', resp.status);
            return null;
        }
        const rows = await resp.json();
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } catch (e) {
        console.error('directFetchProfile crashed:', e);
        return null;
    }
}

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
                        const rows = await directSelect('posts?id=eq.' + encodeURIComponent(c.post_id) + '&select=uid');
                        const post = (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
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
// Read the supabase session straight from localStorage. Doesn't touch
// supabase-js, so it works even when the library is hung.
// Read whatever's in localStorage, even if expired (refresh handled separately)
function readStoredSession() {
    try {
        const direct = localStorage.getItem('ironfaith-direct-session');
        if (direct) {
            const parsed = JSON.parse(direct);
            if (parsed && parsed.access_token) return parsed;
        }
    } catch (e) {}
    try {
        const raw = localStorage.getItem('ironfaith-auth');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const sess = parsed.currentSession || parsed;
        if (sess && sess.access_token) return sess;
    } catch (e) {}
    return null;
}

function isSessionExpired(sess) {
    if (!sess?.expires_at) return false;
    // 60-second buffer so we refresh before the token actually dies
    return sess.expires_at <= Math.floor(Date.now() / 1000) + 60;
}

async function getAccessTokenSafely() {
    // Prefer localStorage (instant, never hangs)
    let stored = readStoredSession();
    if (stored?.access_token && !isSessionExpired(stored)) {
        return { token: stored.access_token, user: stored.user };
    }
    // Token expired or missing — try to refresh via direct REST
    if (stored?.refresh_token) {
        const refreshed = await directRefreshToken();
        if (refreshed?.access_token) {
            return { token: refreshed.access_token, user: refreshed.user };
        }
    }
    // Last resort: try the library with a tight timeout
    if (sb && sb.auth && sb.auth.getSession) {
        try {
            const result = await Promise.race([
                sb.auth.getSession(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 1500))
            ]);
            const s = result?.data?.session;
            if (s?.access_token) return { token: s.access_token, user: s.user };
        } catch (e) { /* fall through */ }
    }
    if (stored?.access_token) return { token: stored.access_token, user: stored.user };
    return null;
}

// Direct REST profile setup — bypasses supabase-js entirely.
// Use this when the library is in a broken state (queries hanging, etc).
async function directProfileSetup() {
    showToast('Connecting directly...');
    try {
        const sessInfo = await getAccessTokenSafely();
        const token = sessInfo?.token;
        const uid = sessInfo?.user?.id || currentUser?.id;
        const email = sessInfo?.user?.email || currentUser?.email;
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
    if (!currentUser) return showToast('Sign in first');
    showToast('Looking up your account...');
    try {
        const profile = await directFetchProfile(currentUser.id);
        if (profile) {
            userProfile = profile;
            renderSocialTab();
            showToast('Welcome back, @' + profile.username);
            return;
        }
        showToast('No profile found for this email — pick a username to create one');
    } catch (e) {
        console.error('recoverExistingProfile crashed:', e);
        showToast('Error: ' + (e.message || 'unknown'));
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

    try {
        let stats = {};
        try { stats = getPublicStats(); } catch (e) { console.error('getPublicStats failed:', e); }

        // If THIS user already has a profile, just use it
        const mine = await directFetchProfile(currentUser.id);
        if (mine) {
            userProfile = mine;
            renderSocialTab();
            showToast('Welcome back, @' + mine.username);
            return;
        }

        // Username availability check via direct REST
        const existing = await directSelect(
            'profiles?username=eq.' + encodeURIComponent(raw) + '&select=id'
        );
        if (existing && existing.length > 0 && existing[0].id !== currentUser.id) {
            showToast('Username taken');
            return;
        }

        const displayName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || raw;

        // Direct REST upsert
        const headers = await directHeaders({
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation',
        });
        if (!headers) { showToast('No auth token'); return; }
        const resp = await fetch(SUPABASE_URL + '/rest/v1/profiles?on_conflict=id', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                id: currentUser.id,
                username: raw,
                display_name: displayName,
                bio: '',
                stats,
                friends: [],
            }),
            cache: 'no-store',
        });
        if (!resp.ok) {
            const body = await resp.text().catch(() => '');
            const hint = /relation|does not exist|column/i.test(body)
                ? ' (Run supabase-setup.sql in your Supabase project)'
                : '';
            showToast('Save failed: HTTP ' + resp.status + hint);
            return;
        }
        const rows = await resp.json();
        userProfile = (Array.isArray(rows) && rows.length > 0) ? rows[0] : null;
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
    await directUpdate('profiles', 'id=eq.' + encodeURIComponent(currentUser.id), { stats });
    userProfile.stats = stats;
}

// Debounced version — called from DB.set whenever a stat-relevant key changes
let _statsSyncTimer = null;
function scheduleSocialStatsSync() {
    if (!currentUser || !userProfile) return;
    if (_statsSyncTimer) clearTimeout(_statsSyncTimer);
    _statsSyncTimer = setTimeout(() => {
        syncStatsToSupabase().catch(e => console.error('scheduleSocialStatsSync:', e));
    }, 2500);
}

// Push the local profile.name to the social profile's display_name
// (called from saveProfile in app.js when the local name changes)
async function syncLocalNameToSocial(localName) {
    if (!currentUser || !userProfile || !localName) return;
    if (userProfile.display_name === localName) return;
    const ok = await directUpdate(
        'profiles',
        'id=eq.' + encodeURIComponent(currentUser.id),
        { display_name: localName }
    );
    if (ok) {
        userProfile.display_name = localName;
        if (typeof renderSocialTab === 'function') renderSocialTab();
    }
}

// Pull the social display_name into the local profile if local profile has no name
function pullSocialNameToLocal() {
    if (!userProfile?.display_name) return;
    try {
        const local = JSON.parse(localStorage.getItem('faithfit_profile') || '{}');
        if (!local.name) {
            local.name = userProfile.display_name;
            localStorage.setItem('faithfit_profile', JSON.stringify(local));
            if (typeof loadProfile === 'function') loadProfile();
        }
    } catch (e) {}
}

async function updateBio() {
    const bio = document.getElementById('profile-bio-input').value.trim().slice(0, 150);
    const ok = await directUpdate('profiles', 'id=eq.' + encodeURIComponent(currentUser.id), { bio });
    if (!ok) return;
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
        const path = currentUser.id + '/avatar.jpg';
        const baseUrl = await directStorageUpload('avatars', path, compressed, 'image/jpeg');
        if (!baseUrl) return;
        const profile_pic = baseUrl + '?t=' + Date.now();

        const ok = await directUpdate(
            'profiles',
            'id=eq.' + encodeURIComponent(currentUser.id),
            { profile_pic }
        );
        if (!ok) {
            showToast('Saved photo but profile update failed');
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
    const ok = await directUpdate(
        'profiles',
        'id=eq.' + encodeURIComponent(currentUser.id),
        { is_public: isPublic }
    );
    if (!ok) return;
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

    const data = await directSelect(
        'profiles?username=ilike.' + encodeURIComponent(query + '*') +
        '&id=neq.' + encodeURIComponent(currentUser.id) +
        '&select=id,username,display_name,is_public,profile_pic&limit=10'
    );

    if (!data || data.length === 0) {
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
    const existing = await directSelect(
        'friend_requests?from_uid=eq.' + encodeURIComponent(currentUser.id) +
        '&to_uid=eq.' + encodeURIComponent(toUid) +
        '&status=eq.pending&select=id'
    );
    if (existing && existing.length > 0) return showToast('Request already sent');

    const reverse = await directSelect(
        'friend_requests?from_uid=eq.' + encodeURIComponent(toUid) +
        '&to_uid=eq.' + encodeURIComponent(currentUser.id) +
        '&status=eq.pending&select=id'
    );
    if (reverse && reverse.length > 0) {
        await sbAcceptFriendRequest(reverse[0].id);
        return;
    }

    // Defensive: schema requires from_username + from_display_name NOT NULL.
    // Older accounts may have an empty display_name — fall back so we don't 400.
    const fromUsername = (userProfile && userProfile.username) ? userProfile.username : '';
    const fromDisplay = (userProfile && userProfile.display_name && userProfile.display_name.trim())
        ? userProfile.display_name
        : (fromUsername || 'User');
    if (!fromUsername) {
        return showToast('Finish setting up your profile first');
    }
    const result = await directInsert('friend_requests', {
        from_uid: currentUser.id,
        to_uid: toUid,
        from_username: fromUsername,
        from_display_name: fromDisplay,
    });
    if (!result) return;
    showToast('Request sent to @' + toUsername);
}

async function sbAcceptFriendRequest(requestId) {
    const result = await directRpc('accept_friend_request', { request_id: requestId });
    if (result === null) return;
    // Reload profile via direct REST
    const fresh = await directFetchProfile(currentUser.id);
    if (fresh) userProfile = fresh;
    showToast('Friend added!');
    renderFriendsView();
}

async function sbDeclineFriendRequest(requestId) {
    const ok = await directUpdate(
        'friend_requests',
        'id=eq.' + encodeURIComponent(requestId),
        { status: 'declined' }
    );
    if (!ok) return;
    showToast('Request declined');
    renderFriendsView();
}

async function sbRemoveFriend(friendUid) {
    const ok = (typeof confirmDialog === 'function')
        ? await confirmDialog('Remove this friend?', { danger: true, okText: 'Remove' })
        : confirm('Remove this friend?');
    if (!ok) return;
    const result = await directRpc('remove_friend', { friend_uid: friendUid });
    if (result === null) return;
    const fresh = await directFetchProfile(currentUser.id);
    if (fresh) userProfile = fresh;
    renderFriendsView();
    showToast('Friend removed');
}

// ========== POSTS / FEED ==========

// A "real" set has at least one of weight/reps actually entered.
function _setIsReal(s) {
    return (s && ((s.weight || 0) > 0 || (s.reps || 0) > 0));
}

// Get today's logged exercises that actually have non-empty sets.
function getTodayLoggedExercises() {
    const workouts = DB.get('workouts', []).filter(w => w.date === today());
    return workouts
        .map(w => ({ ...w, sets: (w.sets || []).filter(_setIsReal) }))
        .filter(w => w.sets.length > 0);
}

// Group exercises into sessions. Exercises within 3 hours of each other
// are treated as one session — same logic the history share card uses.
function groupIntoSessions(exercises) {
    if (exercises.length === 0) return [];
    const sorted = exercises.slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const windowMs = 3 * 60 * 60 * 1000;
    const sessions = [];
    let current = { exercises: [sorted[0]], anchor: sorted[0].timestamp || 0 };
    for (let i = 1; i < sorted.length; i++) {
        const ts = sorted[i].timestamp || 0;
        if (ts - current.anchor <= windowMs) {
            current.exercises.push(sorted[i]);
        } else {
            sessions.push(current);
            current = { exercises: [sorted[i]], anchor: ts };
        }
    }
    sessions.push(current);
    // Label each session
    return sessions.map((s, i) => {
        const names = s.exercises.map(e => e.name);
        const label = s.exercises.length === 1
            ? names[0]
            : `${s.exercises.length} exercises`;
        const startTime = new Date(s.anchor);
        const timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return { ...s, label, timeStr, index: i };
    });
}

// Build stats from a specific list of workout entries (used by the post composer).
function buildStatsFromWorkouts(workouts) {
    if (!workouts || workouts.length === 0) return null;
    const totalVol = workouts.reduce((sum, w) =>
        sum + w.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0);
    let topLift = { name: '', weight: 0, reps: 0 };
    workouts.forEach(w => {
        w.sets.forEach(s => {
            if ((s.weight || 0) > topLift.weight) topLift = { name: w.name, weight: s.weight, reps: s.reps };
        });
    });
    const byName = {};
    workouts.forEach(w => {
        if (!byName[w.name]) byName[w.name] = { name: w.name, sets: 0, reps: 0, volume: 0, best: { weight: 0, reps: 0 } };
        const ex = byName[w.name];
        w.sets.forEach(s => {
            ex.sets += 1;
            ex.reps += (s.reps || 0);
            ex.volume += (s.weight || 0) * (s.reps || 0);
            if ((s.weight || 0) > ex.best.weight) ex.best = { weight: s.weight, reps: s.reps };
        });
    });
    return {
        exercises: workouts.map(w => w.name),
        totalVolume: totalVol,
        topLift,
        setCount: workouts.reduce((s, w) => s + w.sets.length, 0),
        breakdown: Object.values(byName),
    };
}

// Backwards-compatible: returns stats for today's *non-empty* workouts only.
function getTodayWorkoutStats() {
    return buildStatsFromWorkouts(getTodayLoggedExercises());
}

// Stashed sessions list for the currently-open post modal
let _postSessions = [];

// Read which exercises the user selected in the post composer.
function getSelectedPostWorkouts() {
    const boxes = document.querySelectorAll('#post-lift-picker input[type="checkbox"]:checked');
    if (boxes.length === 0) return [];
    const tsSet = new Set();
    boxes.forEach(b => tsSet.add(Number(b.value)));
    return getTodayLoggedExercises().filter(w => tsSet.has(w.timestamp));
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

function _renderPostStatsPreview() {
    const selected = getSelectedPostWorkouts();
    const stats = buildStatsFromWorkouts(selected);
    const el = document.getElementById('post-stats-summary');
    if (!el) return;
    if (stats) {
        el.innerHTML = `<div class="post-auto-stats">
            <p><strong>${stats.exercises.length} exercise${stats.exercises.length > 1 ? 's' : ''}</strong> &middot; ${stats.setCount} sets &middot; ${parseFloat(lbsToDisplay(stats.totalVolume)).toLocaleString()} ${wu()}</p>
            ${stats.topLift.name ? `<p>Top lift: ${stats.topLift.name} ${lbsToDisplay(stats.topLift.weight)}${wu()} x ${stats.topLift.reps}</p>` : ''}
           </div>`;
    } else {
        el.innerHTML = '<p class="muted" style="padding:4px 0;font-size:13px">No exercises selected</p>';
    }
}

// Render the exercise checkboxes for a given session index
function _renderSessionExercises(sessionIdx) {
    const session = _postSessions[sessionIdx];
    if (!session) return;
    const container = document.getElementById('post-lift-picker');
    if (!container) return;
    let html = '';
    session.exercises.forEach(w => {
        const best = w.sets.reduce((b, s) => (s.weight || 0) > (b.weight || 0) ? s : b, w.sets[0]);
        const meta = `${w.sets.length} set${w.sets.length !== 1 ? 's' : ''} · best ${lbsToDisplay(best.weight)}${wu()} × ${best.reps}`;
        html += `
            <label class="post-lift-option">
                <input type="checkbox" value="${w.timestamp}" checked onchange="_renderPostStatsPreview()">
                <span class="post-lift-name">${escapeHtml(w.name)}</span>
                <span class="post-lift-meta">${meta}</span>
            </label>`;
    });
    container.innerHTML = html;
    _renderPostStatsPreview();
}

function openPostModal() {
    const modal = document.getElementById('post-modal');
    const exercises = getTodayLoggedExercises();
    _postSessions = groupIntoSessions(exercises);

    let pickerHtml = '';
    if (_postSessions.length === 0) {
        pickerHtml = '<p class="empty-state" style="padding:10px 0">No workout logged today — stats attach when you train</p>';
        pickerHtml += '<div id="post-lift-picker"></div><div id="post-stats-summary"></div>';
    } else {
        // Session selector (only shown when > 1 session)
        if (_postSessions.length > 1) {
            pickerHtml += '<label class="form-label">Which workout?</label>';
            pickerHtml += '<select id="post-session-select" class="post-session-select" onchange="_renderSessionExercises(Number(this.value))">';
            _postSessions.forEach((s, i) => {
                const names = s.exercises.map(e => e.name).join(', ');
                const truncated = names.length > 50 ? names.slice(0, 47) + '...' : names;
                pickerHtml += `<option value="${i}"${i === _postSessions.length - 1 ? ' selected' : ''}>${s.timeStr} — ${truncated}</option>`;
            });
            pickerHtml += '</select>';
        }
        pickerHtml += '<div id="post-lift-picker" class="post-lift-picker"></div>';
        pickerHtml += '<div id="post-stats-summary"></div>';
    }

    document.getElementById('post-stats-preview').innerHTML = pickerHtml;

    // Populate exercises for the default session (latest)
    if (_postSessions.length > 0) {
        _renderSessionExercises(_postSessions.length - 1);
    }
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
        document.getElementById('post-photo-preview').innerHTML = `
            <div class="post-photo-preview-wrap">
                <img src="${e.target.result}">
                <button type="button" class="post-photo-remove" onclick="removePostPhoto()" title="Remove photo">&times;</button>
            </div>`;
    };
    reader.readAsDataURL(file);
}

function removePostPhoto() {
    document.getElementById('post-photo-preview').innerHTML = '';
    document.getElementById('post-photo-input').value = '';
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
            const path = currentUser.id + '/' + Date.now() + '.jpg';
            const url = await directStorageUpload('posts', path, compressed, 'image/jpeg');
            if (!url) throw new Error('Upload failed');
            photo_url = url;
        }

        const stats = buildStatsFromWorkouts(getSelectedPostWorkouts());
        const verseOrMessage = getVerseOrMessage();
        const result = await directInsert('posts', {
            uid: currentUser.id,
            username: userProfile.username,
            display_name: userProfile.display_name,
            photo_url,
            caption,
            workout: stats,
            likes: [],
            verse_or_message: verseOrMessage,
        });
        if (!result) throw new Error('Insert failed');

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

    // Skeleton loader (3 placeholder cards)
    container.innerHTML = Array(3).fill(0).map(() => `
        <div class="post-card skeleton-post">
            <div class="skeleton-row">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex:1">
                    <div class="skeleton skeleton-line" style="width:40%"></div>
                    <div class="skeleton skeleton-line" style="width:25%;margin-top:6px"></div>
                </div>
            </div>
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton skeleton-line" style="width:80%;margin-top:12px"></div>
            <div class="skeleton skeleton-line" style="width:60%;margin-top:6px"></div>
        </div>
    `).join('');

    const friends = (userProfile && userProfile.friends) || [];
    const uids = [currentUser.id, ...friends].slice(0, 30);
    // PostgREST in.() takes raw UUIDs without quotes for uuid columns
    const uidsList = uids.join(',');

    const posts = await directSelect(
        'posts?uid=in.(' + uidsList + ')&order=created_at.desc&limit=30&select=*'
    );

    if (posts === null) {
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon">&#x26A0;</div>
                <p class="empty-state-title">Couldn&rsquo;t load your feed</p>
                <p class="empty-state-sub">Check your connection and tap below to try again.</p>
                <button class="btn btn-secondary btn-sm" onclick="loadFeed()" style="margin-top:10px">Retry</button>
            </div>`;
        return;
    }
    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-state-icon">&#x1F4F8;</div>
                <p class="empty-state-title">Your feed is quiet</p>
                <p class="empty-state-sub">Add friends or post your first workout &mdash; everything you share here only goes to people you connect with.</p>
            </div>`;
        return;
    }

    // Batch-fetch profile pics for post authors via direct REST
    const uniqueUids = [...new Set(posts.map(p => p.uid))];
    const authorProfiles = await directSelect(
        'profiles?id=in.(' + uniqueUids.join(',') + ')&select=id,profile_pic'
    );
    const avatarMap = {};
    if (authorProfiles) authorProfiles.forEach(a => { avatarMap[a.id] = a.profile_pic; });

    // Batch-fetch comment counts so we can show "Comments (3)" without opening
    const postIds = posts.map(p => p.id);
    const commentRows = await directSelect(
        'comments?post_id=in.(' + postIds.join(',') + ')&select=post_id'
    );
    const commentCounts = {};
    if (commentRows) commentRows.forEach(r => { commentCounts[r.post_id] = (commentCounts[r.post_id] || 0) + 1; });

    container.innerHTML = posts.map(p => {
        const time = timeAgo(new Date(p.created_at).getTime());
        const liked = p.likes && p.likes.includes(currentUser.id);
        const likeCount = p.likes ? p.likes.length : 0;
        const isOwn = p.uid === currentUser.id;

        let statsHtml = '';
        if (p.workout) {
            const w = p.workout;
            const exCount = w.breakdown ? w.breakdown.length : (w.exercises ? w.exercises.length : 0);
            const setCount = w.setCount || 0;
            const totalVolStr = parseFloat(lbsToDisplay(w.totalVolume || 0)).toLocaleString() + ' ' + wu();
            // Header row of pill stats
            const pills = `
                <div class="post-stats-pills">
                    <div class="post-stat-pill"><span class="psp-num">${exCount}</span><span class="psp-lbl">exercise${exCount !== 1 ? 's' : ''}</span></div>
                    <div class="post-stat-pill"><span class="psp-num">${setCount}</span><span class="psp-lbl">set${setCount !== 1 ? 's' : ''}</span></div>
                    <div class="post-stat-pill"><span class="psp-num">${totalVolStr}</span><span class="psp-lbl">volume</span></div>
                </div>`;
            // Per-exercise breakdown if we have it (new posts)
            let breakdownHtml = '';
            if (w.breakdown && w.breakdown.length) {
                const rows = w.breakdown.map(ex => `
                    <div class="post-ex-row">
                        <span class="post-ex-name">${escapeHtml(ex.name)}</span>
                        <span class="post-ex-meta">${ex.sets}\u00d7 &middot; best ${lbsToDisplay(ex.best.weight)}${wu()} \u00d7 ${ex.best.reps}</span>
                    </div>
                `).join('');
                breakdownHtml = `<div class="post-ex-list">${rows}</div>`;
            } else if (w.exercises && w.exercises.length) {
                // Legacy posts: just list exercise names
                breakdownHtml = `<div class="post-ex-list-legacy">${escapeHtml(w.exercises.join(', '))}</div>`;
            }
            const topLift = w.topLift && w.topLift.name
                ? `<div class="post-top-lift-banner">&#x1F3C6; Top lift: <strong>${escapeHtml(w.topLift.name)}</strong> &middot; ${lbsToDisplay(w.topLift.weight)}${wu()} \u00d7 ${w.topLift.reps}</div>`
                : '';
            statsHtml = `<div class="post-workout-card">${pills}${topLift}${breakdownHtml}</div>`;
        }
        const cmtCount = commentCounts[p.id] || 0;

        const authorPic = avatarMap[p.uid];
        const avatarHtml = authorPic
            ? `<img class="post-avatar" src="${authorPic}" alt="" loading="lazy" decoding="async">`
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
                <div class="post-user" onclick="viewUserProfile('${p.uid}')" style="cursor:pointer">
                    ${avatarHtml}
                    <div>
                        <strong>@${escapeHtml(p.username)}</strong>
                        <span class="post-time">${time}</span>
                    </div>
                </div>
                ${isOwn ? `<button class="delete-btn" onclick="deletePost('${p.id}')">&times;</button>` : ''}
            </div>
            ${p.photo_url ? `<img class="post-photo" src="${p.photo_url}" loading="lazy" decoding="async" onload="this.classList.add('loaded')">` : ''}
            ${statsHtml}
            ${p.caption ? `<p class="post-caption">${linkifyMentions(escapeHtml(p.caption))}</p>` : ''}
            ${verseHtml}
            <div class="post-actions">
                <button class="post-like-btn ${liked ? 'liked' : ''}" id="like-btn-${p.id}" data-liked="${liked ? '1' : '0'}" data-count="${likeCount}" onclick="sbToggleLike('${p.id}')">
                    <span class="like-icon">${liked ? '&#x2764;' : '&#x2661;'}</span>
                    <span class="like-count">${likeCount > 0 ? likeCount : ''}</span>
                </button>
                <button class="post-comment-btn" onclick="toggleComments('${p.id}')">
                    &#x1F4AC; Comments${cmtCount > 0 ? ' (' + cmtCount + ')' : ''}
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
    const btn = document.getElementById('like-btn-' + postId);
    if (!btn) return;
    // Optimistic toggle
    const wasLiked = btn.dataset.liked === '1';
    let count = parseInt(btn.dataset.count || '0', 10) || 0;
    const nowLiked = !wasLiked;
    count += nowLiked ? 1 : -1;
    if (count < 0) count = 0;
    btn.dataset.liked = nowLiked ? '1' : '0';
    btn.dataset.count = String(count);
    btn.classList.toggle('liked', nowLiked);
    const iconEl = btn.querySelector('.like-icon');
    const countEl = btn.querySelector('.like-count');
    if (iconEl) iconEl.innerHTML = nowLiked ? '&#x2764;' : '&#x2661;';
    if (countEl) countEl.textContent = count > 0 ? String(count) : '';
    // Tiny pop animation
    btn.classList.remove('like-pop');
    void btn.offsetWidth;
    btn.classList.add('like-pop');
    if (typeof haptic === 'function') haptic(10);

    const result = await directRpc('toggle_like', { post_id: postId });
    if (result === null) {
        // Rollback
        btn.dataset.liked = wasLiked ? '1' : '0';
        const rollbackCount = wasLiked ? count + 1 : count - 1;
        btn.dataset.count = String(rollbackCount < 0 ? 0 : rollbackCount);
        btn.classList.toggle('liked', wasLiked);
        if (iconEl) iconEl.innerHTML = wasLiked ? '&#x2764;' : '&#x2661;';
        if (countEl) countEl.textContent = rollbackCount > 0 ? String(rollbackCount) : '';
    }
}

async function deletePost(postId) {
    const ok = (typeof confirmDialog === 'function')
        ? await confirmDialog('Delete this post? This cannot be undone.', { danger: true, okText: 'Delete' })
        : confirm('Delete this post?');
    if (!ok) return;
    const result = await directDelete('posts', 'id=eq.' + encodeURIComponent(postId));
    if (!result) return;
    loadFeed();
    showToast('Post deleted');
}

// ========== COMMENTS ==========

async function loadComments(postId) {
    const container = document.getElementById('comments-' + postId);
    if (!container) return;
    const comments = await directSelect(
        'comments?post_id=eq.' + encodeURIComponent(postId) +
        '&order=created_at.asc&select=*'
    );

    if (!comments || comments.length === 0) {
        container.innerHTML = '<p class="comments-empty">Be the first to comment</p>';
        return;
    }
    container.innerHTML = comments.map(c => {
        const isOwn = c.uid === currentUser.id;
        return `<div class="comment-item">
            <div class="comment-body">
                <strong class="mention-link" onclick="viewUserProfileByUsername('${escapeHtml(c.username)}')">@${escapeHtml(c.username)}</strong>
                <span>${linkifyMentions(escapeHtml(c.text))}</span>
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
    const result = await directInsert('comments', {
        post_id: postId,
        uid: currentUser.id,
        username: userProfile.username,
        display_name: userProfile.display_name,
        text,
    });
    if (!result) return;
    input.value = '';
    loadComments(postId);
}

async function deleteComment(commentId, postId) {
    await directDelete('comments', 'id=eq.' + encodeURIComponent(commentId));
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

    // Pending requests to me — direct REST
    const requests = await directSelect(
        'friend_requests?to_uid=eq.' + encodeURIComponent(currentUser.id) +
        '&status=eq.pending&order=created_at.desc&select=*'
    );

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
        html += `
            <div class="empty-state-card">
                <div class="empty-state-icon">&#x1F91D;</div>
                <p class="empty-state-title">No friends yet</p>
                <p class="empty-state-sub">Search by username above to send your first friend request and start sharing workouts.</p>
            </div>`;
    } else {
        const friendProfiles = await directSelect(
            'profiles?id=in.(' + friends.join(',') +
            ')&select=id,username,display_name,stats,profile_pic'
        );

        if (friendProfiles) {
            friendProfiles.forEach(f => {
                const s = f.stats || {};
                const fAvatar = f.profile_pic
                    ? `<img class="post-avatar" src="${f.profile_pic}" alt="">`
                    : `<div class="post-avatar-letter">${(f.display_name || '?')[0].toUpperCase()}</div>`;
                html += `<div class="friend-item">
                    <div class="friend-info" style="flex-direction:row;align-items:center;gap:10px;cursor:pointer" onclick="viewUserProfile('${f.id}')">
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
                    <h2 style="margin:0;display:flex;align-items:center;gap:6px">@${escapeHtml(userProfile.username)}<button class="username-edit-btn" aria-label="Change username" onclick="changeUsernamePrompt()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button></h2>
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
            <button class="btn btn-secondary btn-full" style="margin-top:12px" onclick="changeUsernamePrompt()">Change Username</button>
            <button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="syncStatsToSupabase().then(()=>{showToast('Stats synced!');renderProfileView();})">Sync Stats Now</button>
            <button class="btn btn-danger btn-full" style="margin-top:8px" onclick="socialSignOut()">Sign Out</button>
        </div>

        <div class="card share-app-card">
            <h2>Spread the word</h2>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Know someone who'd love Iron Faith? Send them the app.</p>
            <button class="btn btn-primary btn-full share-app-btn" onclick="shareApp()">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Share Iron Faith
            </button>
        </div>
    `;
}

// ========== @MENTION LINKING ==========
// Takes already-escaped text, returns HTML with clickable @mentions.
function linkifyMentions(text) {
    return text.replace(/@([A-Za-z0-9_]{3,20})/g, '<span class="mention-link" onclick="viewUserProfileByUsername(\'$1\')">@$1</span>');
}

async function viewUserProfileByUsername(username) {
    if (!username || !currentUser) return;
    // Check if it's the current user
    if (userProfile && userProfile.username === username) {
        showSocialView('profile');
        return;
    }
    const rows = await directSelect(
        'profiles?username=eq.' + encodeURIComponent(username) + '&select=id'
    );
    if (rows && rows.length > 0) {
        viewUserProfile(rows[0].id);
    } else {
        showToast('User @' + username + ' not found');
    }
}

// ========== VIEW USER PROFILE ==========
async function viewUserProfile(uid) {
    if (!uid || !currentUser) return;
    // If it's the current user, just switch to their profile tab
    if (uid === currentUser.id) { showSocialView('profile'); return; }

    // Remove existing modal if open
    const old = document.getElementById('user-profile-modal');
    if (old) old.remove();

    // Show loading modal immediately
    const modal = document.createElement('div');
    modal.id = 'user-profile-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-card modal-card-wide"><p class="muted" style="text-align:center;padding:24px">Loading profile...</p></div>`;
    document.body.appendChild(modal);

    try {
        // Fetch profile + recent posts in parallel
        const [profiles, posts] = await Promise.all([
            directSelect('profiles?id=eq.' + encodeURIComponent(uid) + '&select=id,username,display_name,bio,stats,profile_pic'),
            directSelect('posts?uid=eq.' + encodeURIComponent(uid) + '&order=created_at.desc&limit=10&select=*')
        ]);

        const prof = profiles && profiles[0];
        if (!prof) {
            modal.innerHTML = `<div class="modal-card"><p>Could not load this profile.</p><div class="modal-actions"><button class="btn btn-secondary" onclick="document.getElementById('user-profile-modal').remove()">Close</button></div></div>`;
            return;
        }

        const s = prof.stats || {};
        const avatarHtml = prof.profile_pic
            ? `<img class="profile-avatar-img" src="${prof.profile_pic}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover">`
            : `<div class="profile-avatar" style="width:64px;height:64px;font-size:28px">${(prof.display_name || '?')[0].toUpperCase()}</div>`;

        const isFriend = userProfile && (userProfile.friends || []).includes(uid);

        let html = `<div class="modal-card modal-card-wide" style="max-height:85vh;overflow-y:auto">`;
        html += `<button class="share-modal-close" onclick="document.getElementById('user-profile-modal').remove()">&times;</button>`;

        // Header
        html += `<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">`;
        html += avatarHtml;
        html += `<div>
            <h2 style="margin:0">@${escapeHtml(prof.username)}</h2>
            <p style="color:var(--text-muted);font-size:13px;margin:2px 0 0">${escapeHtml(prof.display_name || '')}</p>
        </div></div>`;

        if (prof.bio) {
            html += `<p class="profile-bio">${escapeHtml(prof.bio)}</p>`;
        }

        // Stats grid
        html += `<div class="profile-stats-grid" style="margin:14px 0">`;
        html += `<div class="profile-stat"><span class="profile-stat-val">${s.totalWorkouts || 0}</span><span class="profile-stat-label">Workouts</span></div>`;
        html += `<div class="profile-stat"><span class="profile-stat-val">${s.streak || 0}</span><span class="profile-stat-label">Day Streak</span></div>`;
        html += `<div class="profile-stat"><span class="profile-stat-val">${s.prsHit || 0}</span><span class="profile-stat-label">PRs Hit</span></div>`;
        html += `<div class="profile-stat"><span class="profile-stat-val">${s.uniqueExercises || 0}</span><span class="profile-stat-label">Exercises</span></div>`;
        if (s.totalVolume) {
            html += `<div class="profile-stat" style="grid-column:1/-1"><span class="profile-stat-val">${parseFloat(lbsToDisplay(s.totalVolume)).toLocaleString()} ${wu()}</span><span class="profile-stat-label">Total Volume</span></div>`;
        }
        if (s.favoriteExercise) {
            html += `<div class="profile-stat" style="grid-column:1/-1"><span class="profile-stat-val">${escapeHtml(s.favoriteExercise)}</span><span class="profile-stat-label">Favorite Exercise</span></div>`;
        }
        html += `</div>`;

        // Friend action
        if (isFriend) {
            html += `<p style="color:var(--accent);font-size:13px;margin:8px 0">You're friends</p>`;
        } else {
            html += `<button class="btn btn-primary btn-full" id="profile-add-friend-btn" onclick="sendFriendRequestFromProfile('${uid}')">Send Friend Request</button>`;
        }

        // Recent posts
        if (posts && posts.length > 0) {
            html += `<h3 style="margin-top:18px">Recent Posts</h3>`;
            posts.forEach(p => {
                const time = timeAgo(new Date(p.created_at).getTime());
                let postHtml = `<div class="user-profile-post">`;
                postHtml += `<span class="post-time">${time}</span>`;
                if (p.photo_url) {
                    postHtml += `<img src="${p.photo_url}" style="width:100%;border-radius:var(--radius-sm);margin:8px 0" loading="lazy">`;
                }
                if (p.workout) {
                    const w = p.workout;
                    const exCount = w.breakdown ? w.breakdown.length : (w.exercises ? w.exercises.length : 0);
                    postHtml += `<p class="muted" style="font-size:12px">${exCount} exercise${exCount !== 1 ? 's' : ''} · ${w.setCount || 0} sets</p>`;
                }
                if (p.caption) postHtml += `<p style="font-size:13px;margin:4px 0">${linkifyMentions(escapeHtml(p.caption))}</p>`;
                postHtml += `</div>`;
                html += postHtml;
            });
        }

        html += `<div class="modal-actions" style="margin-top:16px"><button class="btn btn-secondary" onclick="document.getElementById('user-profile-modal').remove()">Close</button></div>`;
        html += `</div>`;
        modal.innerHTML = html;
    } catch (e) {
        console.error('viewUserProfile error:', e);
        modal.innerHTML = `<div class="modal-card"><p>Error loading profile.</p><div class="modal-actions"><button class="btn btn-secondary" onclick="document.getElementById('user-profile-modal').remove()">Close</button></div></div>`;
    }
}

async function sendFriendRequestFromProfile(uid) {
    const btn = document.getElementById('profile-add-friend-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    try {
        await directInsert('friend_requests', {
            from_uid: currentUser.id,
            from_username: userProfile.username,
            from_display_name: userProfile.display_name,
            to_uid: uid,
            status: 'pending'
        });
        if (btn) { btn.textContent = 'Request Sent'; btn.classList.remove('btn-primary'); btn.classList.add('btn-secondary'); }
        showToast('Friend request sent!');
    } catch (e) {
        showToast('Could not send request');
        if (btn) { btn.disabled = false; btn.textContent = 'Send Friend Request'; }
    }
}

// ========== CHANGE USERNAME ==========
async function changeUsernamePrompt() {
    if (!currentUser || !userProfile) return showToast('Sign in first');
    const current = userProfile.username || '';
    const next = prompt(
        'Choose a new username (3–20 chars, letters/numbers/underscore only):',
        current
    );
    if (next === null) return; // cancelled
    const cleaned = next.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleaned === current) return; // no change
    if (cleaned.length < 3) return showToast('Username must be 3+ characters');
    if (cleaned.length > 20) return showToast('Username must be under 20 characters');

    // Availability check
    const existing = await directSelect(
        'profiles?username=eq.' + encodeURIComponent(cleaned) + '&select=id'
    );
    if (existing && existing.length > 0 && existing[0].id !== currentUser.id) {
        return showToast('That username is taken');
    }

    const ok = await directUpdate(
        'profiles',
        'id=eq.' + encodeURIComponent(currentUser.id),
        { username: cleaned }
    );
    if (!ok) return; // toast already shown by directUpdate
    userProfile.username = cleaned;
    showToast('Username changed to @' + cleaned, 'success');
    renderSocialTab();
}

function timeAgo(ms) {
    const seconds = Math.floor((Date.now() - ms) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(ms).toLocaleDateString();
}
