// =============================================
// Iron Faith - Fitness & Faith Tracker
// =============================================

// --- Data Layer ---
const DB = {
    get(key, fallback = null) {
        try {
            const data = localStorage.getItem('faithfit_' + key);
            return data ? JSON.parse(data) : fallback;
        } catch { return fallback; }
    },
    set(key, value) {
        localStorage.setItem('faithfit_' + key, JSON.stringify(value));
    }
};

function today() {
    return new Date().toISOString().split('T')[0];
}

// --- Theme Toggle ---
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('faithfit_theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '\u263E' : '\u263C';
}

function loadTheme() {
    const saved = localStorage.getItem('faithfit_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
}

loadTheme();

// --- Units ---
function getUnits() {
    return localStorage.getItem('faithfit_units') || 'imperial';
}

function isMetric() {
    return getUnits() === 'metric';
}

// Display weight in current unit (stored internally as lbs)
function displayWeight(lbs) {
    if (isMetric()) return (lbs * 0.453592).toFixed(1);
    return lbs;
}

// Weight unit label
function wu() {
    return isMetric() ? 'kg' : 'lbs';
}

// Convert user input to lbs for storage
function inputToLbs(value) {
    if (isMetric()) return value / 0.453592;
    return value;
}

// Convert lbs to display value
function lbsToDisplay(lbs) {
    if (isMetric()) return (lbs * 0.453592).toFixed(1);
    return lbs;
}

function setUnits(unit) {
    localStorage.setItem('faithfit_units', unit);
    document.getElementById('unit-imperial').classList.toggle('active', unit === 'imperial');
    document.getElementById('unit-metric').classList.toggle('active', unit === 'metric');
    updateUnitUI();
}

function updateUnitUI() {
    const metric = isMetric();

    // Profile weight label
    document.getElementById('weight-label').textContent = metric ? 'Weight (kg)' : 'Weight (lbs)';

    // Height fields
    document.getElementById('height-imperial').classList.toggle('hidden', metric);
    document.getElementById('height-metric').classList.toggle('hidden', !metric);

    // Dashboard weight input placeholder
    document.getElementById('weight-input').placeholder = metric ? 'Enter weight (kg)' : 'Enter weight (lbs)';

    // Workout set placeholders
    document.querySelectorAll('.set-weight').forEach(el => {
        el.placeholder = metric ? 'Weight (kg)' : 'Weight (lbs)';
    });

    // Convert profile weight field display
    const profileWeightEl = document.getElementById('profile-weight');
    const profile = DB.get('profile', {});
    if (profile.weight) {
        profileWeightEl.value = metric ? (profile.weight * 0.453592).toFixed(1) : profile.weight;
    }

    // Convert height fields
    if (metric && profile.height) {
        document.getElementById('profile-height-cm').value = Math.round(profile.height * 2.54);
    }

    // Refresh all displays
    updateDashboard();
    updateTodaysExercises();
    updateRecentWorkouts();
    drawWeightChart();
    const exercise = document.getElementById('overload-exercise').value;
    if (exercise) showOverloadData();
}

function loadUnits() {
    const unit = getUnits();
    document.getElementById('unit-imperial').classList.toggle('active', unit === 'imperial');
    document.getElementById('unit-metric').classList.toggle('active', unit === 'metric');
    updateUnitUI();
}

// --- Bible Version Preference ---
function getBibleVersion() {
    return localStorage.getItem('faithfit_bible') || 'NIV';
}

function setBibleVersion(version) {
    localStorage.setItem('faithfit_bible', version);
    document.getElementById('bible-version').value = version;
    displayDailyVerse();
}

function loadBibleVersion() {
    const v = getBibleVersion();
    const sel = document.getElementById('bible-version');
    if (sel) sel.value = v;
}

// Translation lookup: keyed by reference, each has text per version.
// NIV is the default/fallback stored in the VERSES arrays.
const BIBLE_TRANSLATIONS = {
    "1 Corinthians 6:19": {
        KJV: "What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own?",
        ESV: "Or do you not know that your body is a temple of the Holy Spirit within you, whom you have from God? You are not your own.",
        NKJV: "Or do you not know that your body is the temple of the Holy Spirit who is in you, whom you have from God, and you are not your own?",
        NLT: "Don't you realize that your body is the temple of the Holy Spirit, who lives in you and was given to you by God? You do not belong to yourself.",
        NASB: "Or do you not know that your body is a temple of the Holy Spirit within you, whom you have from God, and that you are not your own?"
    },
    "Philippians 4:13": {
        KJV: "I can do all things through Christ which strengtheneth me.",
        ESV: "I can do all things through him who strengthens me.",
        NKJV: "I can do all things through Christ who strengthens me.",
        NLT: "For I can do everything through Christ, who gives me strength.",
        NASB: "I can do all things through Him who strengthens me."
    },
    "Isaiah 40:31": {
        KJV: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles.",
        ESV: "But they who wait for the LORD shall renew their strength; they shall mount up with wings like eagles.",
        NKJV: "But those who wait on the LORD shall renew their strength; they shall mount up with wings like eagles.",
        NLT: "But those who trust in the LORD will find new strength. They will soar high on wings like eagles.",
        NASB: "Yet those who wait for the LORD will gain new strength; they will mount up with wings like eagles."
    },
    "1 Timothy 4:8": {
        KJV: "For bodily exercise profiteth little: but godliness is profitable unto all things.",
        ESV: "For while bodily training is of some value, godliness is of value in every way.",
        NKJV: "For bodily exercise profits a little, but godliness is profitable for all things.",
        NLT: "Physical training is good, but training for godliness is much better, promising benefits in this life and in the life to come.",
        NASB: "For bodily training is only of little profit, but godliness is profitable for all things."
    },
    "Proverbs 31:17": {
        KJV: "She girdeth her loins with strength, and strengtheneth her arms.",
        ESV: "She dresses herself with strength and makes her arms strong.",
        NKJV: "She girds herself with strength, and strengthens her arms.",
        NLT: "She is energetic and strong, a hard worker.",
        NASB: "She girds herself with strength and makes her arms strong."
    },
    "Psalm 28:7": {
        KJV: "The LORD is my strength and my shield; my heart trusted in him, and I am helped.",
        ESV: "The LORD is my strength and my shield; in him my heart trusts, and I am helped.",
        NKJV: "The LORD is my strength and my shield; my heart trusted in Him, and I am helped.",
        NLT: "The LORD is my strength and shield. I trust him with all my heart. He helps me, and my heart is filled with joy.",
        NASB: "The LORD is my strength and my shield; my heart trusts in Him, and I am helped."
    },
    "Joshua 1:9": {
        KJV: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
        ESV: "Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed, for the LORD your God is with you wherever you go.",
        NKJV: "Have I not commanded you? Be strong and of good courage; do not be afraid, nor be dismayed, for the LORD your God is with you wherever you go.",
        NLT: "This is my command—be strong and courageous! Do not be afraid or discouraged. For the LORD your God is with you wherever you go.",
        NASB: "Have I not commanded you? Be strong and courageous! Do not be terrified nor dismayed, for the LORD your God is with you wherever you go."
    },
    "Proverbs 16:3": {
        KJV: "Commit thy works unto the LORD, and thy thoughts shall be established.",
        ESV: "Commit your work to the LORD, and your plans will be established.",
        NKJV: "Commit your works to the LORD, and your thoughts will be established.",
        NLT: "Commit your actions to the LORD, and your plans will succeed.",
        NASB: "Commit your works to the LORD and your plans will be established."
    },
    "Isaiah 40:29": {
        KJV: "He giveth power to the faint; and to them that have no might he increaseth strength.",
        ESV: "He gives power to the faint, and to him who has no might he increases strength.",
        NKJV: "He gives power to the weak, and to those who have no might He increases strength.",
        NLT: "He gives power to the weak and strength to the powerless.",
        NASB: "He gives strength to the weary, and to the one who lacks might He increases power."
    },
    "1 Corinthians 10:31": {
        KJV: "Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God.",
        ESV: "So, whether you eat or drink, or whatever you do, do all to the glory of God.",
        NKJV: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.",
        NLT: "So whether you eat or drink, or whatever you do, do it all for the glory of God.",
        NASB: "Whether, then, you eat or drink, or whatever you do, do all things for the glory of God."
    },
    "Nehemiah 8:10": {
        KJV: "The joy of the LORD is your strength.",
        ESV: "The joy of the LORD is your strength.",
        NKJV: "The joy of the LORD is your strength.",
        NLT: "The joy of the LORD is your strength!",
        NASB: "The joy of the LORD is your strength."
    },
    "Hebrews 12:11": {
        KJV: "Now no chastening for the present seemeth to be joyous, but grievous: nevertheless afterward it yieldeth the peaceable fruit of righteousness.",
        ESV: "For the moment all discipline seems painful rather than pleasant, but later it yields the peaceful fruit of righteousness to those who have been trained by it.",
        NKJV: "Now no chastening seems to be joyful for the present, but painful; nevertheless, afterward it yields the peaceable fruit of righteousness.",
        NLT: "No discipline is enjoyable while it is happening—it's painful! But afterward there will be a peaceful harvest of right living for those who are trained in this way.",
        NASB: "All discipline for the moment seems not to be joyful, but sorrowful; yet to those who have been trained by it, afterwards it yields the peaceful fruit of righteousness."
    },
    "Philippians 4:6": {
        KJV: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.",
        ESV: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.",
        NKJV: "Be anxious for nothing, but in everything by prayer and supplication, with thanksgiving, let your requests be made known to God.",
        NLT: "Don't worry about anything; instead, pray about everything. Tell God what you need, and thank him for all he has done.",
        NASB: "Do not be anxious about anything, but in everything by prayer and pleading with thanksgiving let your requests be made known to God."
    },
    "Hebrews 12:1-2": {
        KJV: "Let us run with patience the race that is set before us, looking unto Jesus the author and finisher of our faith.",
        ESV: "Let us run with endurance the race that is set before us, looking to Jesus, the founder and perfecter of our faith.",
        NKJV: "Let us run with endurance the race that is set before us, looking unto Jesus, the author and finisher of our faith.",
        NLT: "Let us run with endurance the race God has set before us. We do this by keeping our eyes on Jesus, the champion who initiates and perfects our faith.",
        NASB: "Let us run with endurance the race that is set before us, looking only at Jesus, the originator and perfecter of the faith."
    },
    "Psalm 73:26": {
        KJV: "My flesh and my heart faileth: but God is the strength of my heart, and my portion for ever.",
        ESV: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever.",
        NKJV: "My flesh and my heart fail; but God is the strength of my heart and my portion forever.",
        NLT: "My health may fail, and my spirit may grow weak, but God remains the strength of my heart; he is mine forever.",
        NASB: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever."
    },
    "Zephaniah 3:17": {
        KJV: "The LORD thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy.",
        ESV: "The LORD your God is in your midst, a mighty one who will save; he will rejoice over you with gladness.",
        NKJV: "The LORD your God in your midst, the Mighty One, will save; He will rejoice over you with gladness.",
        NLT: "For the LORD your God is living among you. He is a mighty savior. He will take delight in you with gladness.",
        NASB: "The LORD your God is in your midst, a victorious warrior. He will rejoice over you with joy."
    },
    "1 Corinthians 16:13": {
        KJV: "Watch ye, stand fast in the faith, quit you like men, be strong.",
        ESV: "Be watchful, stand firm in the faith, act like men, be strong.",
        NKJV: "Watch, stand fast in the faith, be brave, be strong.",
        NLT: "Be on guard. Stand firm in the faith. Be courageous. Be strong.",
        NASB: "Be on the alert, stand firm in the faith, act like men, be strong."
    },
    "Psalm 46:1": {
        KJV: "God is our refuge and strength, a very present help in trouble.",
        ESV: "God is our refuge and strength, a very present help in trouble.",
        NKJV: "God is our refuge and strength, a very present help in trouble.",
        NLT: "God is our refuge and strength, always ready to help in times of trouble.",
        NASB: "God is our refuge and strength, a very ready help in trouble."
    },
    "Colossians 3:23": {
        KJV: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.",
        ESV: "Whatever you do, work heartily, as for the Lord and not for men.",
        NKJV: "And whatever you do, do it heartily, as to the Lord and not to men.",
        NLT: "Work willingly at whatever you do, as though you were working for the Lord rather than for people.",
        NASB: "Whatever you do, do your work heartily, as for the Lord and not for people."
    },
    "Psalm 27:1": {
        KJV: "The LORD is my light and my salvation; whom shall I fear?",
        ESV: "The LORD is my light and my salvation; whom shall I fear?",
        NKJV: "The LORD is my light and my salvation; whom shall I fear?",
        NLT: "The LORD is my light and my salvation—so why should I be afraid?",
        NASB: "The LORD is my light and my salvation; whom should I fear?"
    },
    "2 Timothy 1:7": {
        KJV: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.",
        ESV: "For God gave us a spirit not of fear but of power and love and self-control.",
        NKJV: "For God has not given us a spirit of fear, but of power and of love and of a sound mind.",
        NLT: "For God has not given us a spirit of fear and timidity, but of power, love, and self-discipline.",
        NASB: "For God has not given us a spirit of timidity, but of power and love and discipline."
    },
    "Proverbs 3:5": {
        KJV: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
        ESV: "Trust in the LORD with all your heart, and do not lean on your own understanding.",
        NKJV: "Trust in the LORD with all your heart, and lean not on your own understanding.",
        NLT: "Trust in the LORD with all your heart; do not depend on your own understanding.",
        NASB: "Trust in the LORD with all your heart and do not lean on your own understanding."
    },
    "James 1:12": {
        KJV: "Blessed is the man that endureth temptation: for when he is tried, he shall receive the crown of life.",
        ESV: "Blessed is the man who remains steadfast under trial, for when he has stood the test he will receive the crown of life.",
        NKJV: "Blessed is the man who endures temptation; for when he has been approved, he will receive the crown of life.",
        NLT: "God blesses those who patiently endure testing and temptation. Afterward they will receive the crown of life.",
        NASB: "Blessed is the man who perseveres under trial; for once he has been approved, he will receive the crown of life."
    },
    "Galatians 5:22-23": {
        KJV: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance.",
        ESV: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.",
        NKJV: "But the fruit of the Spirit is love, joy, peace, longsuffering, kindness, goodness, faithfulness, gentleness, self-control.",
        NLT: "But the Holy Spirit produces this kind of fruit in our lives: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control.",
        NASB: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control."
    },
    "Psalm 51:10": {
        KJV: "Create in me a clean heart, O God; and renew a right spirit within me.",
        ESV: "Create in me a clean heart, O God, and renew a right spirit within me.",
        NKJV: "Create in me a clean heart, O God, and renew a steadfast spirit within me.",
        NLT: "Create in me a clean heart, O God. Renew a loyal spirit within me.",
        NASB: "Create in me a clean heart, O God, and renew a steadfast spirit within me."
    },
    "Romans 8:28": {
        KJV: "And we know that all things work together for good to them that love God.",
        ESV: "And we know that for those who love God all things work together for good.",
        NKJV: "And we know that all things work together for good to those who love God.",
        NLT: "And we know that God causes everything to work together for the good of those who love God.",
        NASB: "And we know that God causes all things to work together for good to those who love God."
    },
    "Galatians 6:9": {
        KJV: "And let us not be weary in well doing: for in due season we shall reap, if we faint not.",
        ESV: "And let us not grow weary of doing good, for in due season we will reap, if we do not give up.",
        NKJV: "And let us not grow weary while doing good, for in due season we shall reap if we do not lose heart.",
        NLT: "So let's not get tired of doing what is good. At just the right time we will reap a harvest of blessing if we don't give up.",
        NASB: "Let us not lose heart in doing good, for in due time we will reap, if we do not grow weary."
    },
    "Philippians 3:14": {
        KJV: "I press toward the mark for the prize of the high calling of God in Christ Jesus.",
        ESV: "I press on toward the goal for the prize of the upward call of God in Christ Jesus.",
        NKJV: "I press toward the goal for the prize of the upward call of God in Christ Jesus.",
        NLT: "I press on to reach the end of the race and receive the heavenly prize for which God, through Christ Jesus, is calling us.",
        NASB: "I press on toward the goal for the prize of the upward call of God in Christ Jesus."
    },
    "Proverbs 18:10": {
        KJV: "The name of the LORD is a strong tower: the righteous runneth into it, and is safe.",
        ESV: "The name of the LORD is a strong tower; the righteous man runs into it and is safe.",
        NKJV: "The name of the LORD is a strong tower; the righteous run to it and are safe.",
        NLT: "The name of the LORD is a strong fortress; the godly run to him and are safe.",
        NASB: "The name of the LORD is a strong tower; the righteous runs into it and is safe."
    },
    "Psalm 37:4": {
        KJV: "Delight thyself also in the LORD; and he shall give thee the desires of thine heart.",
        ESV: "Delight yourself in the LORD, and he will give you the desires of your heart.",
        NKJV: "Delight yourself also in the LORD, and He shall give you the desires of your heart.",
        NLT: "Take delight in the LORD, and he will give you your heart's desires.",
        NASB: "Delight yourself in the LORD; and He will give you the desires of your heart."
    },
    "Matthew 11:28": {
        KJV: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
        ESV: "Come to me, all who labor and are heavy laden, and I will give you rest.",
        NKJV: "Come to Me, all you who labor and are heavy laden, and I will give you rest.",
        NLT: "Then Jesus said, 'Come to me, all of you who are weary and carry heavy burdens, and I will give you rest.'",
        NASB: "Come to Me, all who are weary and burdened, and I will give you rest."
    },
    "Hebrews 12:1": {
        KJV: "Let us run with patience the race that is set before us.",
        ESV: "Let us run with endurance the race that is set before us.",
        NKJV: "Let us run with endurance the race that is set before us.",
        NLT: "Let us run with endurance the race God has set before us.",
        NASB: "Let us run with endurance the race that is set before us."
    },
    "2 Timothy 4:7": {
        KJV: "I have fought a good fight, I have finished my course, I have kept the faith.",
        ESV: "I have fought the good fight, I have finished the race, I have kept the faith.",
        NKJV: "I have fought the good fight, I have finished the race, I have kept the faith.",
        NLT: "I have fought the good fight, I have finished the race, and I have remained faithful.",
        NASB: "I have fought the good fight, I have finished the course, I have kept the faith."
    },
    "Matthew 25:21": {
        KJV: "Well done, thou good and faithful servant.",
        ESV: "Well done, good and faithful servant.",
        NKJV: "Well done, good and faithful servant.",
        NLT: "Well done, my good and faithful servant.",
        NASB: "Well done, good and faithful servant."
    },
    "Romans 8:31": {
        KJV: "If God be for us, who can be against us?",
        ESV: "If God is for us, who can be against us?",
        NKJV: "If God is for us, who can be against us?",
        NLT: "If God is for us, who can ever be against us?",
        NASB: "If God is for us, who is against us?"
    },
    "Proverbs 27:17": {
        KJV: "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.",
        ESV: "Iron sharpens iron, and one man sharpens another.",
        NKJV: "As iron sharpens iron, so a man sharpens the countenance of his friend.",
        NLT: "As iron sharpens iron, so a friend sharpens a friend.",
        NASB: "As iron sharpens iron, so one person sharpens another."
    },
    "Philippians 3:13-14": {
        KJV: "Forgetting those things which are behind, and reaching forth unto those things which are before, I press toward the mark.",
        ESV: "Forgetting what lies behind and straining forward to what lies ahead, I press on toward the goal.",
        NKJV: "Forgetting those things which are behind and reaching forward to those things which are ahead, I press toward the goal.",
        NLT: "Forgetting the past and looking forward to what lies ahead, I press on to reach the end of the race.",
        NASB: "Forgetting what lies behind and reaching forward to what lies ahead, I press on toward the goal."
    },
    "Psalm 18:33": {
        KJV: "He maketh my feet like hinds' feet, and setteth me upon my high places.",
        ESV: "He made my feet like the feet of a deer and set me secure on the heights.",
        NKJV: "He makes my feet like the feet of deer, and sets me on my high places.",
        NLT: "He makes me as surefooted as a deer, enabling me to stand on mountain heights.",
        NASB: "He makes my feet like hinds' feet, and sets me upon my high places."
    },
    "Psalm 84:7": {
        KJV: "They go from strength to strength, every one of them in Zion appeareth before God.",
        ESV: "They go from strength to strength; each one appears before God in Zion.",
        NKJV: "They go from strength to strength; each one appears before God in Zion.",
        NLT: "They will continue to grow stronger, and each of them will appear before God in Jerusalem.",
        NASB: "They go from strength to strength; every one of them appears before God in Zion."
    },
    "Deuteronomy 28:13": {
        KJV: "And the LORD shall make thee the head, and not the tail.",
        ESV: "And the LORD will make you the head and not the tail.",
        NKJV: "And the LORD will make you the head and not the tail.",
        NLT: "The LORD will make you the head and not the tail.",
        NASB: "The LORD will make you the head and not the tail."
    },
    "1 Corinthians 12:4": {
        KJV: "Now there are diversities of gifts, but the same Spirit.",
        ESV: "Now there are varieties of gifts, but the same Spirit.",
        NKJV: "There are diversities of gifts, but the same Spirit.",
        NLT: "There are different kinds of spiritual gifts, but the same Spirit is the source of them all.",
        NASB: "Now there are varieties of gifts, but the same Spirit."
    },
    "1 Corinthians 9:22": {
        KJV: "I am made all things to all men, that I might by all means save some.",
        ESV: "I have become all things to all people, that by all means I might save some.",
        NKJV: "I have become all things to all men, that I might by all means save some.",
        NLT: "Yes, I try to find common ground with everyone, doing everything I can to save some.",
        NASB: "I have become all things to all people, so that I may by all means save some."
    },
    "Ephesians 6:11": {
        KJV: "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.",
        ESV: "Put on the whole armor of God, that you may be able to stand against the schemes of the devil.",
        NKJV: "Put on the whole armor of God, that you may be able to stand against the wiles of the devil.",
        NLT: "Put on all of God's armor so that you will be able to stand firm against all strategies of the devil.",
        NASB: "Put on the full armor of God, so that you will be able to stand firm against the schemes of the devil."
    },
    "Ecclesiastes 9:10": {
        KJV: "Whatsoever thy hand findeth to do, do it with thy might.",
        ESV: "Whatever your hand finds to do, do it with your might.",
        NKJV: "Whatever your hand finds to do, do it with your might.",
        NLT: "Whatever you do, do well.",
        NASB: "Whatever your hand finds to do, do it with all your might."
    },
    "Proverbs 11:1": {
        KJV: "A false balance is abomination to the LORD: but a just weight is his delight.",
        ESV: "A false balance is an abomination to the LORD, but a just weight is his delight.",
        NKJV: "Dishonest scales are an abomination to the LORD, but a just weight is His delight.",
        NLT: "The LORD detests the use of dishonest scales, but he delights in accurate weights.",
        NASB: "A false balance is an abomination to the LORD, but a just weight is His delight."
    },
    "Proverbs 21:5": {
        KJV: "The thoughts of the diligent tend only to plenteousness.",
        ESV: "The plans of the diligent lead surely to abundance.",
        NKJV: "The plans of the diligent lead surely to plenty.",
        NLT: "Good planning and hard work lead to prosperity.",
        NASB: "The plans of the diligent lead certainly to advantage."
    },
    "Luke 14:28": {
        KJV: "For which of you, intending to build a tower, sitteth not down first, and counteth the cost?",
        ESV: "For which of you, desiring to build a tower, does not first sit down and count the cost?",
        NKJV: "For which of you, intending to build a tower, does not sit down first and count the cost?",
        NLT: "But don't begin until you count the cost. For who would begin construction of a building without first calculating the cost?",
        NASB: "For which one of you, when he wants to build a tower, does not first sit down and calculate the cost?"
    },
    "Matthew 6:11": {
        KJV: "Give us this day our daily bread.",
        ESV: "Give us this day our daily bread.",
        NKJV: "Give us this day our daily bread.",
        NLT: "Give us today the food we need.",
        NASB: "Give us this day our daily bread."
    },
    "Ecclesiastes 4:12": {
        KJV: "A threefold cord is not quickly broken.",
        ESV: "A threefold cord is not quickly broken.",
        NKJV: "A threefold cord is not quickly broken.",
        NLT: "A triple-braided cord is not easily broken.",
        NASB: "A cord of three strands is not quickly torn apart."
    },
    "Genesis 2:2": {
        KJV: "And on the seventh day God ended his work which he had made.",
        ESV: "And on the seventh day God finished his work that he had done.",
        NKJV: "And on the seventh day God ended His work which He had done.",
        NLT: "On the seventh day God had finished his work of creation.",
        NASB: "By the seventh day God completed His work which He had done."
    },
    "Exodus 20:9": {
        KJV: "Six days shalt thou labour, and do all thy work.",
        ESV: "Six days you shall labor, and do all your work.",
        NKJV: "Six days you shall labor and do all your work.",
        NLT: "You have six days each week for your ordinary work.",
        NASB: "For six days you shall labor and do all your work."
    },
    "Mark 1:35": {
        KJV: "And in the morning, rising up a great while before day, he went out, and departed into a solitary place, and there prayed.",
        ESV: "And rising very early in the morning, while it was still dark, he departed and went out to a desolate place, and there he prayed.",
        NKJV: "Now in the morning, having risen a long while before daylight, He went out and departed to a solitary place; and there He prayed.",
        NLT: "Before daybreak the next morning, Jesus got up and went out to an isolated place to pray.",
        NASB: "In the early morning, while it was still dark, Jesus got up, left the house, and went away to a secluded place, and prayed there."
    },
    "Song of Solomon 3:1": {
        KJV: "By night on my bed I sought him whom my soul loveth.",
        ESV: "On my bed by night I sought him whom my soul loves.",
        NKJV: "By night on my bed I sought the one I love.",
        NLT: "One night as I lay in bed, I yearned for my lover.",
        NASB: "On my bed night after night I sought him whom my soul loves."
    },
    "Jeremiah 29:11": {
        KJV: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
        ESV: "For I know the plans I have for you, declares the LORD, plans for welfare and not for evil, to give you a future and a hope.",
        NKJV: "For I know the thoughts that I think toward you, says the LORD, thoughts of peace and not of evil, to give you a future and a hope.",
        NLT: "For I know the plans I have for you, says the LORD. They are plans for good and not for disaster, to give you a future and a hope.",
        NASB: "'For I know the plans that I have for you,' declares the LORD, 'plans for prosperity and not for disaster, to give you a future and a hope.'"
    },
    "Proverbs 15:22": {
        KJV: "Without counsel purposes are disappointed: but in the multitude of counsellors they are established.",
        ESV: "Without counsel plans fail, but with many advisers they succeed.",
        NKJV: "Without counsel, plans go awry, but in the multitude of counselors they are established.",
        NLT: "Plans go wrong for lack of advice; many advisers bring success.",
        NASB: "Without consultation, plans are frustrated, but with many counselors they succeed."
    },
    "Proverbs 12:24": {
        KJV: "The hand of the diligent shall bear rule.",
        ESV: "The hand of the diligent will rule.",
        NKJV: "The hand of the diligent will rule.",
        NLT: "Work hard and become a leader.",
        NASB: "The hand of the diligent will rule."
    },
    "1 Corinthians 12:14": {
        KJV: "For the body is not one member, but many.",
        ESV: "For the body does not consist of one member but of many.",
        NKJV: "For in fact the body is not one member but many.",
        NLT: "Yes, the body has many different parts, not just one part.",
        NASB: "For the body is not one member, but many."
    },
    "Matthew 19:26": {
        KJV: "With men this is impossible; but with God all things are possible.",
        ESV: "With man this is impossible, but with God all things are possible.",
        NKJV: "With men this is impossible, but with God all things are possible.",
        NLT: "Humanly speaking, it is impossible. But with God everything is possible.",
        NASB: "With people this is impossible, but with God all things are possible."
    },
    "Psalm 18:2": {
        KJV: "The LORD is my rock, and my fortress, and my deliverer.",
        ESV: "The LORD is my rock and my fortress and my deliverer.",
        NKJV: "The LORD is my rock and my fortress and my deliverer.",
        NLT: "The LORD is my rock, my fortress, and my savior.",
        NASB: "The LORD is my rock and my fortress and my deliverer."
    },
    "Psalm 145:3": {
        KJV: "Great is the LORD, and greatly to be praised; and his greatness is unsearchable.",
        ESV: "Great is the LORD, and greatly to be praised, and his greatness is unsearchable.",
        NKJV: "Great is the LORD, and greatly to be praised; and His greatness is unsearchable.",
        NLT: "Great is the LORD! He is most worthy of praise! No one can measure his greatness.",
        NASB: "Great is the LORD, and highly to be praised, and His greatness is unsearchable."
    },
    "Psalm 121:1": {
        KJV: "I will lift up mine eyes unto the hills, from whence cometh my help.",
        ESV: "I lift up my eyes to the hills. From where does my help come?",
        NKJV: "I will lift up my eyes to the hills—from whence comes my help?",
        NLT: "I look up to the mountains—does my help come from there?",
        NASB: "I will raise my eyes to the mountains; from where will my help come?"
    },
};

// Look up a verse in the selected Bible translation
function getTranslatedVerse(ref, nivText) {
    const version = getBibleVersion();
    if (version === 'NIV') return nivText;
    const entry = BIBLE_TRANSLATIONS[ref];
    if (entry && entry[version]) return entry[version];
    return nivText; // fallback to NIV
}

// --- Bible Verses ---
const VERSES = [
    { text: "Do you not know that your bodies are temples of the Holy Spirit, who is in you, whom you have received from God?", ref: "1 Corinthians 6:19" },
    { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
    { text: "But those who hope in the LORD will renew their strength. They will soar on wings like eagles.", ref: "Isaiah 40:31" },
    { text: "For physical training is of some value, but godliness has value for all things.", ref: "1 Timothy 4:8" },
    { text: "She sets about her work vigorously; her arms are strong for her tasks.", ref: "Proverbs 31:17" },
    { text: "The LORD is my strength and my shield; my heart trusts in him, and he helps me.", ref: "Psalm 28:7" },
    { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", ref: "Joshua 1:9" },
    { text: "Commit to the LORD whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
    { text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged.", ref: "Joshua 1:9" },
    { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
    { text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" },
    { text: "The joy of the LORD is your strength.", ref: "Nehemiah 8:10" },
    { text: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace.", ref: "Hebrews 12:11" },
    { text: "Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God.", ref: "Philippians 4:6" },
    { text: "And let us run with perseverance the race marked out for us, fixing our eyes on Jesus.", ref: "Hebrews 12:1-2" },
    { text: "My flesh and my heart may fail, but God is the strength of my heart and my portion forever.", ref: "Psalm 73:26" },
    { text: "The LORD your God is in your midst, a mighty one who will save; he will rejoice over you with gladness.", ref: "Zephaniah 3:17" },
    { text: "Be on your guard; stand firm in the faith; be courageous; be strong.", ref: "1 Corinthians 16:13" },
    { text: "God is our refuge and strength, an ever-present help in trouble.", ref: "Psalm 46:1" },
    { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
    { text: "The LORD is my light and my salvation — whom shall I fear?", ref: "Psalm 27:1" },
    { text: "For God gave us a spirit not of fear but of power and love and self-control.", ref: "2 Timothy 1:7" },
    { text: "Trust in the LORD with all your heart and lean not on your own understanding.", ref: "Proverbs 3:5" },
    { text: "Blessed is the one who perseveres under trial because, having stood the test, that person will receive the crown of life.", ref: "James 1:12" },
    { text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.", ref: "Galatians 5:22-23" },
    { text: "Create in me a pure heart, O God, and renew a steadfast spirit within me.", ref: "Psalm 51:10" },
    { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
    { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" },
    { text: "I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.", ref: "Philippians 3:14" },
    { text: "The name of the LORD is a fortified tower; the righteous run to it and are safe.", ref: "Proverbs 18:10" },
    { text: "Delight yourself in the LORD, and he will give you the desires of your heart.", ref: "Psalm 37:4" },
];

function getDailyVerse() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return VERSES[dayOfYear % VERSES.length];
}

function displayDailyVerse() {
    const verse = getDailyVerse();
    const text = getTranslatedVerse(verse.ref, verse.text);
    const version = getBibleVersion();
    document.getElementById('daily-verse').textContent = `"${text}"`;
    document.getElementById('verse-ref').textContent = `— ${verse.ref} (${version})`;
}

// --- Tab Navigation ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        updateRestTimerVisibility();
    });
});

// --- Weight Tracking ---
function logWeight() {
    const input = document.getElementById('weight-input');
    const raw = parseFloat(input.value);
    if (!raw || raw < 20 || raw > 1000) {
        alert('Please enter a valid weight.');
        return;
    }
    const weight = isMetric() ? raw / 0.453592 : raw; // store as lbs
    const weights = DB.get('weights', []);
    weights.push({ date: today(), weight });
    DB.set('weights', weights);
    input.value = '';
    updateDashboard();
    drawWeightChart();
    checkAchievements();
}

function drawWeightChart() {
    const canvas = document.getElementById('weight-chart');
    const ctx = canvas.getContext('2d');
    const weights = DB.get('weights', []);

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400;
    ctx.scale(2, 2);

    const w = canvas.offsetWidth;
    const h = 200;

    ctx.clearRect(0, 0, w, h);

    if (weights.length < 2) {
        ctx.fillStyle = '#64748B';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Log at least 2 weights to see your chart', w / 2, h / 2);
        return;
    }

    const last30 = weights.slice(-30);
    const values = last30.map(w => parseFloat(lbsToDisplay(w.weight)));
    const min = Math.min(...values) - 2;
    const max = Math.max(...values) + 2;
    const range = max - min || 1;

    const padTop = 20, padBot = 40, padLeft = 45, padRight = 15;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBot;

    // Grid lines
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((max - (range / 4) * i).toFixed(1), padLeft - 8, y + 4);
    }

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';

    values.forEach((val, i) => {
        const x = padLeft + (chartW / (values.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    values.forEach((val, i) => {
        const x = padLeft + (chartW / (values.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#C0C0C0';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    });

    // Date labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelCount = Math.min(last30.length, 6);
    for (let i = 0; i < labelCount; i++) {
        const idx = Math.round(i * (last30.length - 1) / (labelCount - 1));
        const x = padLeft + (chartW / (last30.length - 1)) * idx;
        const label = last30[idx].date.slice(5);
        ctx.fillText(label, x, h - 8);
    }
}

// --- Prayer Journal ---
function getPrayerEntries() {
    return DB.get('prayerEntries', []);
}

function savePrayerEntry() {
    const input = document.getElementById('prayer-journal-input');
    const text = input.value.trim();
    if (!text) {
        alert('Please write something before saving.');
        return;
    }
    const entries = getPrayerEntries();
    entries.push({ date: today(), text, timestamp: Date.now() });
    DB.set('prayerEntries', entries);
    input.value = '';
    showToast('Entry saved &#x1F64F;');
    renderPrayerHistory();
}

function deletePrayerEntry(timestamp) {
    if (!confirm('Delete this entry?')) return;
    const entries = getPrayerEntries().filter(e => e.timestamp !== timestamp);
    DB.set('prayerEntries', entries);
    renderPrayerHistory();
}

function togglePrayerHistory() {
    const wrap = document.getElementById('prayer-journal-history');
    if (!wrap) return;
    wrap.classList.toggle('hidden');
    if (!wrap.classList.contains('hidden')) renderPrayerHistory();
}

function renderPrayerHistory() {
    const wrap = document.getElementById('prayer-journal-history');
    if (!wrap || wrap.classList.contains('hidden')) return;
    const entries = getPrayerEntries().slice().reverse();
    if (entries.length === 0) {
        wrap.innerHTML = '<p class="empty-state">No entries yet.</p>';
        return;
    }
    wrap.innerHTML = entries.map(e => `
        <div class="prayer-entry">
            <div class="prayer-entry-head">
                <span class="prayer-entry-date">${e.date}</span>
                <button class="prayer-entry-del" onclick="deletePrayerEntry(${e.timestamp})">&times;</button>
            </div>
            <p class="prayer-entry-text">${escapeHtml(e.text)}</p>
        </div>
    `).join('');
}

// --- Progress Charts ---
// Epley 1RM estimate: weight * (1 + reps/30)
function estimate1RM(weight, reps) {
    if (reps <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
}

function getStrengthSeries(exerciseName) {
    const workouts = DB.get('workouts', []).filter(w => w.name === exerciseName);
    // group by date, take max e1RM per day
    const byDate = {};
    workouts.forEach(w => {
        const top = w.sets.reduce((mx, s) => Math.max(mx, estimate1RM(s.weight, s.reps)), 0);
        if (!byDate[w.date] || top > byDate[w.date]) byDate[w.date] = top;
    });
    return Object.entries(byDate)
        .map(([date, e1rm]) => ({ date, e1rm }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

function populateStrengthSelect() {
    const sel = document.getElementById('strength-exercise-select');
    if (!sel) return;
    const workouts = DB.get('workouts', []);
    // Count occurrences to sort by most-logged
    const counts = {};
    workouts.forEach(w => { counts[w.name] = (counts[w.name] || 0) + 1; });
    const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (names.length === 0) {
        sel.innerHTML = '<option value="">No exercises logged yet</option>';
        return;
    }
    const prev = sel.value;
    sel.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    if (prev && names.includes(prev)) sel.value = prev;
    sel.onchange = drawStrengthChart;
}

function drawStrengthChart() {
    const canvas = document.getElementById('strength-chart');
    const summary = document.getElementById('strength-pr-summary');
    if (!canvas) return;
    const sel = document.getElementById('strength-exercise-select');
    const name = sel && sel.value;
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400;
    ctx.scale(2, 2);
    const w = canvas.offsetWidth;
    const h = 200;
    ctx.clearRect(0, 0, w, h);

    if (!name) {
        ctx.fillStyle = '#64748B';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Log a workout to see strength progress', w / 2, h / 2);
        if (summary) summary.innerHTML = '';
        return;
    }

    const series = getStrengthSeries(name);
    if (series.length < 2) {
        ctx.fillStyle = '#64748B';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Log this exercise at least twice to see a trend', w / 2, h / 2);
        if (summary && series.length === 1) {
            const e = series[0];
            summary.innerHTML = `<span>Best e1RM: <b>${lbsToDisplay(e.e1rm)} ${wu()}</b></span>`;
        } else if (summary) summary.innerHTML = '';
        return;
    }

    const values = series.map(s => parseFloat(lbsToDisplay(s.e1rm)));
    const min = Math.min(...values) - 2;
    const max = Math.max(...values) + 2;
    const range = max - min || 1;

    const padTop = 20, padBot = 40, padLeft = 45, padRight = 15;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBot;

    // Grid
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();
        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((max - (range / 4) * i).toFixed(0), padLeft - 8, y + 4);
    }

    // Filled area
    ctx.beginPath();
    values.forEach((val, i) => {
        const x = padLeft + (chartW / (values.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.lineTo(padLeft, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(192, 192, 192, 0.15)';
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    values.forEach((val, i) => {
        const x = padLeft + (chartW / (values.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    values.forEach((val, i) => {
        const x = padLeft + (chartW / (values.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#C0C0C0';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    });

    // Date labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelCount = Math.min(series.length, 6);
    for (let i = 0; i < labelCount; i++) {
        const idx = Math.round(i * (series.length - 1) / (labelCount - 1));
        const x = padLeft + (chartW / (series.length - 1)) * idx;
        ctx.fillText(series[idx].date.slice(5), x, h - 8);
    }

    if (summary) {
        const first = values[0];
        const last = values[values.length - 1];
        const delta = last - first;
        const pct = first > 0 ? ((delta / first) * 100).toFixed(1) : '0';
        const arrow = delta >= 0 ? '&#x25B2;' : '&#x25BC;';
        const cls = delta >= 0 ? 'pr-up' : 'pr-down';
        summary.innerHTML = `
            <span>Current e1RM: <b>${last.toFixed(1)} ${wu()}</b></span>
            <span class="${cls}">${arrow} ${Math.abs(delta).toFixed(1)} ${wu()} (${pct}%)</span>
        `;
    }
}

function getWeeklyVolume(weeks = 12) {
    const workouts = DB.get('workouts', []);
    const buckets = [];
    const now = new Date();
    // Start of this week (Sunday)
    const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    for (let i = weeks - 1; i >= 0; i--) {
        const start = new Date(startOfThisWeek);
        start.setDate(start.getDate() - i * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        buckets.push({ start, end, volume: 0, label: `${start.getMonth() + 1}/${start.getDate()}` });
    }
    workouts.forEach(w => {
        const ts = w.timestamp ? new Date(w.timestamp) : new Date(w.date);
        for (const b of buckets) {
            if (ts >= b.start && ts < b.end) {
                w.sets.forEach(s => { b.volume += (s.weight || 0) * (s.reps || 0); });
                break;
            }
        }
    });
    return buckets;
}

function drawVolumeChart() {
    const canvas = document.getElementById('volume-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400;
    ctx.scale(2, 2);
    const w = canvas.offsetWidth;
    const h = 200;
    ctx.clearRect(0, 0, w, h);

    const buckets = getWeeklyVolume(12);
    const values = buckets.map(b => parseFloat(lbsToDisplay(b.volume)));
    const max = Math.max(...values, 1);
    const totalVol = values.reduce((a, b) => a + b, 0);
    const avgVol = totalVol / values.length;

    const caption = document.getElementById('volume-caption');
    if (caption) {
        if (totalVol === 0) {
            caption.textContent = 'No workouts logged in this window yet.';
        } else {
            caption.innerHTML = `12-week avg: <b>${avgVol.toFixed(0)} ${wu()}</b> per week`;
        }
    }

    const padTop = 20, padBot = 30, padLeft = 45, padRight = 15;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBot;

    // Y grid + labels
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();
        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(((max / 4) * (4 - i)).toFixed(0), padLeft - 8, y + 4);
    }

    // Bars
    const barGap = 4;
    const barW = (chartW / values.length) - barGap;
    values.forEach((v, i) => {
        const barH = max > 0 ? (v / max) * chartH : 0;
        const x = padLeft + i * (barW + barGap) + barGap / 2;
        const y = padTop + chartH - barH;
        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, '#C0C0C0');
        grad.addColorStop(1, 'rgba(192,192,192,0.3)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, barH);
    });

    // X labels (every other)
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    buckets.forEach((b, i) => {
        if (i % 2 === 0 || i === buckets.length - 1) {
            const x = padLeft + i * (barW + barGap) + barW / 2 + barGap / 2;
            ctx.fillText(b.label, x, h - 8);
        }
    });
}

function renderProgressCharts() {
    populateStrengthSelect();
    drawStrengthChart();
    drawVolumeChart();
}

// --- Workout Logging ---
let setCount = 1;

function addSet() {
    setCount++;
    const container = document.getElementById('sets-container');
    const div = document.createElement('div');
    div.className = 'set-row';
    div.dataset.set = setCount;
    div.innerHTML = `
        <span class="set-label">Set ${setCount}</span>
        <input type="number" class="set-weight" placeholder="Weight (${wu()})" step="2.5">
        <span class="x-label">x</span>
        <input type="number" class="set-reps" placeholder="Reps">
    `;
    container.appendChild(div);
}

function removeSet() {
    if (setCount <= 1) return;
    const container = document.getElementById('sets-container');
    container.removeChild(container.lastElementChild);
    setCount--;
}

function logExercise() {
    const name = document.getElementById('exercise-name').value.trim();
    if (!name) {
        alert('Please enter an exercise name.');
        return;
    }

    const sets = [];
    document.querySelectorAll('.set-row').forEach(row => {
        const rawWeight = parseFloat(row.querySelector('.set-weight').value) || 0;
        const weight = isMetric() ? rawWeight / 0.453592 : rawWeight; // store as lbs
        const reps = parseInt(row.querySelector('.set-reps').value) || 0;
        if (reps > 0) {
            sets.push({ weight, reps });
        }
    });

    if (sets.length === 0) {
        alert('Please enter at least one set with reps.');
        return;
    }

    const workouts = DB.get('workouts', []);
    workouts.push({
        date: today(),
        name,
        sets,
        timestamp: Date.now()
    });
    DB.set('workouts', workouts);

    // Check for PRs
    checkForPR(name, sets, workouts);

    // Check achievements
    checkAchievements();

    // Reset form
    document.getElementById('exercise-name').value = '';
    document.querySelectorAll('.set-weight, .set-reps').forEach(input => input.value = '');

    // Reset to 1 set
    const container = document.getElementById('sets-container');
    while (container.children.length > 1) {
        container.removeChild(container.lastElementChild);
    }
    setCount = 1;

    updateTodaysExercises();
    updateOverloadDropdown();
    updateDashboard();
    updateStreak();
}

function updateTodaysExercises() {
    const workouts = DB.get('workouts', []).filter(w => w.date === today());
    const container = document.getElementById('todays-exercises');

    if (workouts.length === 0) {
        container.innerHTML = '<p class="empty-state">No exercises logged today.</p>';
        return;
    }

    container.innerHTML = workouts.map((w, i) => {
        const setsHtml = w.sets.map((s, j) => `Set ${j + 1}: ${lbsToDisplay(s.weight)} ${wu()} x ${s.reps} reps`).join('<br>');
        const totalVol = w.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        return `
            <div class="exercise-item">
                <h4>${escapeHtml(w.name)}</h4>
                <div class="sets-summary">${setsHtml}</div>
                <div class="total-volume">Total Volume: ${parseFloat(lbsToDisplay(totalVol)).toLocaleString()} ${wu()}</div>
            </div>
        `;
    }).join('');
    updateSaveTemplateBtn();
}

// --- Progressive Overload ---
function updateOverloadDropdown() {
    const workouts = DB.get('workouts', []);
    const exercises = [...new Set(workouts.map(w => w.name))];
    const select = document.getElementById('overload-exercise');
    const current = select.value;

    select.innerHTML = '<option value="">-- Choose Exercise --</option>';
    exercises.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });

    if (current && exercises.includes(current)) {
        select.value = current;
    }
}

function showOverloadData() {
    const exercise = document.getElementById('overload-exercise').value;
    const statsEl = document.getElementById('overload-stats');
    const chartEl = document.getElementById('overload-chart');

    if (!exercise) {
        statsEl.classList.add('hidden');
        chartEl.classList.add('hidden');
        return;
    }

    const workouts = DB.get('workouts', []).filter(w => w.name === exercise);
    if (workouts.length === 0) return;

    // Calculate stats
    const maxWeights = workouts.map(w => Math.max(...w.sets.map(s => s.weight)));
    const first = maxWeights[0];
    const latest = maxWeights[maxWeights.length - 1];
    const best = Math.max(...maxWeights);
    const progress = first > 0 ? (((latest - first) / first) * 100).toFixed(1) : 0;

    document.getElementById('overload-first').textContent = `${lbsToDisplay(first)} ${wu()}`;
    document.getElementById('overload-best').textContent = `${lbsToDisplay(best)} ${wu()}`;
    document.getElementById('overload-latest').textContent = `${lbsToDisplay(latest)} ${wu()}`;
    document.getElementById('overload-progress').textContent = `${progress >= 0 ? '+' : ''}${progress}%`;
    document.getElementById('overload-progress').style.color = progress >= 0 ? '#10B981' : '#EF4444';

    statsEl.classList.remove('hidden');
    chartEl.classList.remove('hidden');

    // Draw overload chart
    drawOverloadChart(workouts);
}

function drawOverloadChart(workouts) {
    const canvas = document.getElementById('overload-chart');
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400;
    ctx.scale(2, 2);

    const w = canvas.offsetWidth;
    const h = 200;
    ctx.clearRect(0, 0, w, h);

    const maxWeights = workouts.map(w => Math.max(...w.sets.map(s => s.weight)));
    if (maxWeights.length < 2) {
        ctx.fillStyle = '#64748B';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Need more sessions to show progress', w / 2, h / 2);
        return;
    }

    const min = Math.min(...maxWeights) - 5;
    const max = Math.max(...maxWeights) + 5;
    const range = max - min || 1;

    const padTop = 20, padBot = 40, padLeft = 45, padRight = 15;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBot;

    // Grid
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const y = padTop + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.stroke();
        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((max - (range / 4) * i).toFixed(0), padLeft - 8, y + 4);
    }

    // Area fill
    ctx.beginPath();
    maxWeights.forEach((val, i) => {
        const x = padLeft + (chartW / (maxWeights.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.lineTo(padLeft, padTop + chartH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(192, 192, 192, 0.1)';
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    maxWeights.forEach((val, i) => {
        const x = padLeft + (chartW / (maxWeights.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    maxWeights.forEach((val, i) => {
        const x = padLeft + (chartW / (maxWeights.length - 1)) * i;
        const y = padTop + chartH - ((val - min) / range) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#C0C0C0';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    });

    // Session labels
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelCount = Math.min(maxWeights.length, 8);
    for (let i = 0; i < labelCount; i++) {
        const idx = Math.round(i * (maxWeights.length - 1) / (labelCount - 1));
        const x = padLeft + (chartW / (maxWeights.length - 1)) * idx;
        ctx.fillText(`#${idx + 1}`, x, h - 8);
    }
}

// --- Food Database Auto-Suggest ---
let selectedFood = null;

function onFoodSearch(query) {
    const dropdown = document.getElementById('food-suggestions');
    if (!query || query.length < 2) {
        dropdown.innerHTML = '';
        dropdown.style.display = 'none';
        return;
    }

    const lower = query.toLowerCase();
    const results = (typeof FOOD_DB !== 'undefined' ? FOOD_DB : []).filter(f =>
        f.name.toLowerCase().includes(lower)
    ).slice(0, 8);

    if (results.length === 0) {
        dropdown.innerHTML = '';
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = results.map(f =>
        `<div class="food-suggestion-item" onmousedown="selectFood('${f.name.replace(/'/g, "\\'")}')">
            <span class="food-sug-name">${f.name}</span>
            <span class="food-sug-info">${f.calories} cal · ${f.protein}p · ${f.serving}</span>
        </div>`
    ).join('');
    dropdown.style.display = 'block';
}

function selectFood(name) {
    const food = (typeof FOOD_DB !== 'undefined' ? FOOD_DB : []).find(f => f.name === name);
    if (!food) return;

    selectedFood = { ...food };
    document.getElementById('meal-name').value = food.name;
    document.getElementById('food-suggestions').style.display = 'none';

    // Show serving row
    const servingRow = document.getElementById('food-serving-row');
    servingRow.style.display = '';
    document.getElementById('food-serving-label').textContent = `1 serving = ${food.serving}`;
    document.getElementById('food-servings').value = 1;

    // Fill macros
    document.getElementById('meal-calories').value = food.calories;
    document.getElementById('meal-protein').value = food.protein;
    document.getElementById('meal-carbs').value = food.carbs;
    document.getElementById('meal-fat').value = food.fat;
}

function onServingsChange() {
    if (!selectedFood) return;
    const mult = parseFloat(document.getElementById('food-servings').value) || 1;
    document.getElementById('meal-calories').value = Math.round(selectedFood.calories * mult);
    document.getElementById('meal-protein').value = Math.round(selectedFood.protein * mult);
    document.getElementById('meal-carbs').value = Math.round(selectedFood.carbs * mult);
    document.getElementById('meal-fat').value = Math.round(selectedFood.fat * mult);
}

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('food-suggestions');
    if (dropdown && !e.target.closest('#meal-name') && !e.target.closest('#food-suggestions')) {
        dropdown.style.display = 'none';
    }
});

// --- Barcode Scanner ---
let barcodeScanner = null;

function openBarcodeScanner() {
    const modal = document.getElementById('barcode-modal');
    modal.style.display = 'flex';
    document.getElementById('barcode-status').textContent = 'Starting camera...';
    document.getElementById('barcode-result').style.display = 'none';

    barcodeScanner = new Html5Qrcode('barcode-reader');
    barcodeScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 280, height: 120 }, formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
        ]},
        (decodedText) => { onBarcodeScanned(decodedText); },
        () => {}
    ).then(() => {
        document.getElementById('barcode-status').textContent = 'Point your camera at a barcode';
    }).catch(err => {
        document.getElementById('barcode-status').textContent = 'Camera access denied. Please allow camera permissions.';
    });
}

function closeBarcodeScanner() {
    const modal = document.getElementById('barcode-modal');
    modal.style.display = 'none';
    if (barcodeScanner) {
        barcodeScanner.stop().catch(() => {});
        barcodeScanner.clear();
        barcodeScanner = null;
    }
}

function onBarcodeScanned(barcode) {
    // Stop scanning
    if (barcodeScanner) {
        barcodeScanner.stop().catch(() => {});
    }

    document.getElementById('barcode-status').textContent = 'Looking up product...';
    document.getElementById('barcode-result').style.display = 'none';

    // Look up on Open Food Facts API
    fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 1 && data.product) {
                const p = data.product;
                const n = p.nutriments || {};
                const name = p.product_name || p.generic_name || 'Unknown Product';
                const servingSize = p.serving_size || p.quantity || '';
                const calories = Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0);
                const protein = Math.round(n.proteins_serving || n.proteins_100g || 0);
                const carbs = Math.round(n.carbohydrates_serving || n.carbohydrates_100g || 0);
                const fat = Math.round(n.fat_serving || n.fat_100g || 0);

                const resultDiv = document.getElementById('barcode-result');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div class="barcode-product">
                        <strong>${escapeHtml(name)}</strong>
                        ${servingSize ? `<span class="barcode-serving">${escapeHtml(servingSize)}</span>` : ''}
                        <div class="barcode-macros">
                            <span>${calories} cal</span>
                            <span>${protein}g protein</span>
                            <span>${carbs}g carbs</span>
                            <span>${fat}g fat</span>
                        </div>
                        <button class="btn btn-primary btn-full" onclick="useBarcodeResult('${escapeHtml(name).replace(/'/g, "\\'")}', ${calories}, ${protein}, ${carbs}, ${fat})">Add This Food</button>
                        <button class="btn btn-secondary btn-full" onclick="retryBarcodeScan()" style="margin-top:6px;">Scan Again</button>
                    </div>`;
                document.getElementById('barcode-status').textContent = 'Product found!';
            } else {
                document.getElementById('barcode-status').textContent = 'Product not found in database.';
                const resultDiv = document.getElementById('barcode-result');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = `
                    <div class="barcode-product">
                        <p>Barcode: <strong>${barcode}</strong></p>
                        <p style="color:var(--text-muted);font-size:13px;">This product isn't in the Open Food Facts database. You can enter the nutrition info manually.</p>
                        <button class="btn btn-secondary btn-full" onclick="retryBarcodeScan()">Scan Again</button>
                        <button class="btn btn-secondary btn-full" onclick="closeBarcodeScanner()" style="margin-top:6px;">Enter Manually</button>
                    </div>`;
            }
        })
        .catch(() => {
            document.getElementById('barcode-status').textContent = 'Network error — check your connection.';
            const resultDiv = document.getElementById('barcode-result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="barcode-product">
                    <p style="color:var(--text-muted);font-size:13px;">Could not reach the food database. Make sure you're online.</p>
                    <button class="btn btn-secondary btn-full" onclick="retryBarcodeScan()">Retry</button>
                </div>`;
        });
}

function useBarcodeResult(name, calories, protein, carbs, fat) {
    document.getElementById('meal-name').value = name;
    document.getElementById('meal-calories').value = calories;
    document.getElementById('meal-protein').value = protein;
    document.getElementById('meal-carbs').value = carbs;
    document.getElementById('meal-fat').value = fat;
    document.getElementById('food-serving-row').style.display = 'none';
    selectedFood = null;
    closeBarcodeScanner();
}

function retryBarcodeScan() {
    document.getElementById('barcode-result').style.display = 'none';
    document.getElementById('barcode-status').textContent = 'Point your camera at a barcode';
    if (barcodeScanner) {
        barcodeScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 280, height: 120 }, formatsToSupport: [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
            ]},
            (decodedText) => { onBarcodeScanned(decodedText); },
            () => {}
        ).catch(() => {});
    }
}

// --- Nutrition / Calorie Tracking ---
function logMeal() {
    const name = document.getElementById('meal-name').value.trim();
    const calories = parseInt(document.getElementById('meal-calories').value) || 0;
    const protein = parseInt(document.getElementById('meal-protein').value) || 0;
    const carbs = parseInt(document.getElementById('meal-carbs').value) || 0;
    const fat = parseInt(document.getElementById('meal-fat').value) || 0;

    if (!name || calories <= 0) {
        alert('Please enter a meal name and calories.');
        return;
    }

    const meals = DB.get('meals', []);
    meals.push({ date: today(), name, calories, protein, carbs, fat, timestamp: Date.now() });
    DB.set('meals', meals);

    document.getElementById('meal-name').value = '';
    document.getElementById('meal-calories').value = '';
    document.getElementById('meal-protein').value = '';
    document.getElementById('meal-carbs').value = '';
    document.getElementById('meal-fat').value = '';
    document.getElementById('food-serving-row').style.display = 'none';
    document.getElementById('food-servings').value = 1;
    selectedFood = null;

    updateMealsList();
    updateNutritionBars();
    updateDashboard();
    checkAchievements();
}

function deleteMeal(timestamp) {
    let meals = DB.get('meals', []);
    meals = meals.filter(m => m.timestamp !== timestamp);
    DB.set('meals', meals);
    updateMealsList();
    updateNutritionBars();
    updateDashboard();
}

function updateMealsList() {
    const meals = DB.get('meals', []).filter(m => m.date === today());
    const container = document.getElementById('meals-list');

    if (meals.length === 0) {
        container.innerHTML = '<p class="empty-state">No meals logged today.</p>';
        return;
    }

    container.innerHTML = meals.map(m => `
        <div class="meal-item">
            <div class="meal-info">
                <h4>${escapeHtml(m.name)}</h4>
                <p>P: ${m.protein}g | C: ${m.carbs}g | F: ${m.fat}g</p>
            </div>
            <span class="meal-cals">${m.calories}</span>
            <button class="delete-btn" onclick="deleteMeal(${m.timestamp})" title="Delete">&times;</button>
        </div>
    `).join('');
}

function updateNutritionBars() {
    const meals = DB.get('meals', []).filter(m => m.date === today());
    const profile = DB.get('profile', {});
    const calGoal = profile.calorieGoal || 2000;
    const proteinGoal = profile.proteinGoal || 150;

    const totals = meals.reduce((acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    document.getElementById('cal-count').textContent = `${totals.calories} / ${calGoal}`;
    document.getElementById('protein-count').textContent = `${totals.protein}g / ${proteinGoal}g`;
    document.getElementById('carbs-count').textContent = `${totals.carbs}g`;
    document.getElementById('fat-count').textContent = `${totals.fat}g`;

    document.getElementById('cal-bar').style.width = `${Math.min((totals.calories / calGoal) * 100, 100)}%`;
    document.getElementById('protein-bar').style.width = `${Math.min((totals.protein / proteinGoal) * 100, 100)}%`;
    document.getElementById('carbs-bar').style.width = `${Math.min((totals.carbs / 300) * 100, 100)}%`;
    document.getElementById('fat-bar').style.width = `${Math.min((totals.fat / 80) * 100, 100)}%`;
}

// --- Coaching System is now in coach.js ---

// --- Gender ---
let selectedGender = 'male';

function setGender(gender) {
    selectedGender = gender;
    document.getElementById('gender-male').classList.toggle('active', gender === 'male');
    document.getElementById('gender-female').classList.toggle('active', gender === 'female');
}

// --- Profile ---
function saveProfile() {
    const metric = isMetric();
    let totalInches, feet, inches;

    if (metric) {
        const cm = parseFloat(document.getElementById('profile-height-cm').value) || 0;
        totalInches = cm / 2.54;
        feet = Math.floor(totalInches / 12);
        inches = Math.round(totalInches % 12);
    } else {
        feet = parseInt(document.getElementById('profile-height-feet').value) || 0;
        inches = parseInt(document.getElementById('profile-height-inches').value) || 0;
        totalInches = feet * 12 + inches;
    }

    const rawWeight = parseFloat(document.getElementById('profile-weight').value) || 0;
    const weightLbs = metric ? rawWeight / 0.453592 : rawWeight; // store as lbs

    // Also save the weight to the weight log if provided
    if (weightLbs > 0) {
        const weights = DB.get('weights', []);
        const todayStr = today();
        const todayIdx = weights.findIndex(w => w.date === todayStr);
        if (todayIdx >= 0) {
            weights[todayIdx].weight = weightLbs;
        } else {
            weights.push({ date: todayStr, weight: weightLbs });
        }
        DB.set('weights', weights);
    }

    const profile = {
        name: document.getElementById('profile-name').value.trim(),
        gender: selectedGender,
        age: parseInt(document.getElementById('profile-age').value) || 0,
        heightFeet: feet,
        heightInches: inches,
        height: totalInches,
        weight: weightLbs,
        goal: document.getElementById('profile-goal').value,
        activity: document.getElementById('profile-activity').value,
        calorieGoal: parseInt(document.getElementById('profile-calories').value) || 2000,
        proteinGoal: parseInt(document.getElementById('profile-protein').value) || 150
    };
    DB.set('profile', profile);
    alert('Profile saved!');
    updateDashboard();
    updateNutritionBars();
    drawWeightChart();
    checkAchievements();
}

function loadProfile() {
    const profile = DB.get('profile', {});
    if (profile.name) document.getElementById('profile-name').value = profile.name;
    if (profile.gender) setGender(profile.gender);
    if (profile.age) document.getElementById('profile-age').value = profile.age;
    if (profile.heightFeet) document.getElementById('profile-height-feet').value = profile.heightFeet;
    if (profile.heightInches !== undefined && profile.heightInches !== null) document.getElementById('profile-height-inches').value = profile.heightInches;
    if (profile.weight) document.getElementById('profile-weight').value = profile.weight;
    if (profile.goal) document.getElementById('profile-goal').value = profile.goal;
    if (profile.activity) document.getElementById('profile-activity').value = profile.activity;
    if (profile.calorieGoal) document.getElementById('profile-calories').value = profile.calorieGoal;
    if (profile.proteinGoal) document.getElementById('profile-protein').value = profile.proteinGoal;

    // If old profile had height in total inches but no feet/inches, convert it
    if (!profile.heightFeet && profile.height) {
        document.getElementById('profile-height-feet').value = Math.floor(profile.height / 12);
        document.getElementById('profile-height-inches').value = profile.height % 12;
    }
}

function calculateCalories() {
    const metric = isMetric();
    let heightInches;

    if (metric) {
        const cm = parseFloat(document.getElementById('profile-height-cm').value) || 0;
        heightInches = cm / 2.54;
    } else {
        const feet = parseInt(document.getElementById('profile-height-feet').value) || 0;
        const inches = parseInt(document.getElementById('profile-height-inches').value) || 0;
        heightInches = feet * 12 + inches;
    }

    const age = parseInt(document.getElementById('profile-age').value) || 0;
    const rawWeight = parseFloat(document.getElementById('profile-weight').value) || 0;
    const currentWeightLbs = metric ? rawWeight / 0.453592 : rawWeight;
    const weights = DB.get('weights', []);
    const currentWeight = currentWeightLbs || (weights.length > 0 ? weights[weights.length - 1].weight : 0);

    if (!currentWeight || !age || !heightInches) {
        alert('Please fill in your age, height, and weight to auto-calculate.');
        return;
    }

    // Mifflin-St Jeor (gender-adjusted)
    const weightKg = currentWeight * 0.453592;
    const heightCm = heightInches * 2.54;
    const genderOffset = selectedGender === 'female' ? -161 : 5;
    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + genderOffset;

    const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725
    };

    const activity = document.getElementById('profile-activity').value;
    let tdee = Math.round(bmr * (activityMultipliers[activity] || 1.2));

    const goal = document.getElementById('profile-goal').value;
    if (goal === 'lose') tdee -= 400;
    else if (goal === 'gain') tdee += 300;

    document.getElementById('profile-calories').value = tdee;

    // Also suggest protein
    const proteinGoal = Math.round(currentWeight * 0.8);
    document.getElementById('profile-protein').value = proteinGoal;
}

// --- Streak Tracking ---
function updateStreak() {
    const workouts = DB.get('workouts', []);
    const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();

    let streak = 0;
    const todayStr = today();

    // Check if worked out today
    if (dates.includes(todayStr)) {
        streak = 1;
        let checkDate = new Date();
        for (let i = 1; i < 365; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const dateStr = checkDate.toISOString().split('T')[0];
            if (dates.includes(dateStr)) {
                streak++;
            } else {
                break;
            }
        }
    }

    document.getElementById('streak-count').textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
}

// --- Dashboard ---
function updateDashboard() {
    const workouts = DB.get('workouts', []).filter(w => w.date === today());
    const meals = DB.get('meals', []).filter(m => m.date === today());
    const weights = DB.get('weights', []);
    const profile = DB.get('profile', {});

    document.getElementById('today-workouts').textContent = workouts.length;
    document.getElementById('today-calories').textContent = meals.reduce((sum, m) => sum + m.calories, 0);
    document.getElementById('calorie-goal-text').textContent = `Goal: ${profile.calorieGoal || '--'}`;

    if (weights.length > 0) {
        document.getElementById('current-weight').textContent = `${lbsToDisplay(weights[weights.length - 1].weight)} ${wu()}`;
    }

    updateStreak();
    updateRecentWorkouts();
    renderProgressCharts();
    renderCalendarHeatmap();
    renderMuscleHeatmap();
    renderAchievements();
    renderWeeklyReport();
}

function updateRecentWorkouts() {
    const workouts = DB.get('workouts', []).slice(-10).reverse();
    const container = document.getElementById('recent-workouts');

    if (workouts.length === 0) {
        container.innerHTML = '<p class="empty-state">No workouts logged yet. Start training!</p>';
        return;
    }

    container.innerHTML = workouts.map(w => {
        const totalVol = w.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        const bestSet = w.sets.reduce((best, s) => s.weight > best.weight ? s : best, w.sets[0]);
        const ts = w.timestamp || 0;
        return `
            <div class="workout-item">
                <div class="workout-item-main">
                    <h4>${escapeHtml(w.name)}</h4>
                    <p>${w.date} &middot; ${w.sets.length} sets &middot; Best: ${lbsToDisplay(bestSet.weight)}${wu()} x ${bestSet.reps}</p>
                </div>
                <div class="workout-item-actions">
                    <span class="workout-item-vol">${parseFloat(lbsToDisplay(totalVol)).toLocaleString()} ${wu()}</span>
                    <button class="workout-item-del" title="Delete" onclick="deleteWorkout(${ts})">&times;</button>
                </div>
            </div>
        `;
    }).join('');
}

function deleteWorkout(timestamp) {
    if (!timestamp) return;
    if (!confirm('Delete this workout? This cannot be undone.')) return;
    const workouts = DB.get('workouts', []).filter(w => w.timestamp !== timestamp);
    DB.set('workouts', workouts);
    updateDashboard();
    if (typeof updateTodaysExercises === 'function') updateTodaysExercises();
    if (typeof updateOverloadDropdown === 'function') updateOverloadDropdown();
    showToast('Workout deleted');
}

// --- Data Management ---
function exportData() {
    const data = {
        profile: DB.get('profile', {}),
        workouts: DB.get('workouts', []),
        meals: DB.get('meals', []),
        weights: DB.get('weights', []),
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faithfit-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function clearAllData() {
    if (confirm('Are you sure you want to delete ALL your data? This cannot be undone!')) {
        if (confirm('Really? This will erase all workouts, meals, and weight history.')) {
            ['profile', 'workouts', 'meals', 'weights'].forEach(key => {
                localStorage.removeItem('faithfit_' + key);
            });
            location.reload();
        }
    }
}

// --- Utilities ---
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- PWA Install ---
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('install-btn');
    if (btn) btn.style.display = 'inline-flex';
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(result => {
            if (result.outcome === 'accepted') {
                document.getElementById('install-btn').style.display = 'none';
            }
            deferredPrompt = null;
        });
    } else {
        alert('To install Iron Faith:\n\n• iOS: Tap the Share button, then "Add to Home Screen"\n• Android Chrome: Tap the menu (⋮), then "Install app"\n• Desktop: Look for the install icon in the address bar');
    }
}

window.addEventListener('appinstalled', () => {
    document.getElementById('install-btn').style.display = 'none';
    deferredPrompt = null;
});

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

// --- Sharing ---
function shareProgress() {
    openShareModal();
}

function copyToClipboard(text, message) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(message || 'Copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(message || 'Copied to clipboard!');
    });
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- Import Data ---
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.profile && !data.workouts && !data.meals && !data.weights) {
                alert('Invalid Iron Faith backup file.');
                return;
            }

            if (!confirm('This will replace all your current data with the imported data. Continue?')) return;

            if (data.profile) DB.set('profile', data.profile);
            if (data.workouts) DB.set('workouts', data.workouts);
            if (data.meals) DB.set('meals', data.meals);
            if (data.weights) DB.set('weights', data.weights);

            alert('Data imported successfully!');
            location.reload();
        } catch {
            alert('Could not read file. Make sure it\'s a valid Iron Faith backup.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// --- Midnight Reset ---
// Refreshes all daily data (meals, workouts, verse) when the date changes
let currentDay = today();

function scheduleMidnightReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // next midnight in user's local timezone
    const msUntilMidnight = midnight - now;

    setTimeout(() => {
        currentDay = today();
        displayDailyVerse();
        updateDashboard();
        updateTodaysExercises();
        updateMealsList();
        updateNutritionBars();
        showToast('New day! Daily stats have been reset.');
        // Schedule the next midnight reset
        scheduleMidnightReset();
    }, msUntilMidnight);
}

// Also check on visibility change (user returns to tab after midnight)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && today() !== currentDay) {
        currentDay = today();
        displayDailyVerse();
        updateDashboard();
        updateTodaysExercises();
        updateMealsList();
        updateNutritionBars();
        showToast('New day! Daily stats have been reset.');
        scheduleMidnightReset();
    }
});

// --- PR Detection ---
function checkForPR(exerciseName, newSets, allWorkouts) {
    const previousLogs = allWorkouts.filter(w => w.name === exerciseName);
    if (previousLogs.length <= 1) return; // need history to compare

    const oldLogs = previousLogs.slice(0, -1);
    const oldMaxWeight = Math.max(...oldLogs.flatMap(w => w.sets.map(s => s.weight)));
    const oldMaxVol = Math.max(...oldLogs.map(w => w.sets.reduce((s, set) => s + set.weight * set.reps, 0)));
    const newMaxWeight = Math.max(...newSets.map(s => s.weight));
    const newVol = newSets.reduce((s, set) => s + set.weight * set.reps, 0);

    const prs = [];
    if (newMaxWeight > oldMaxWeight && newMaxWeight > 0) prs.push(`Weight PR: ${lbsToDisplay(newMaxWeight)} ${wu()}`);
    if (newVol > oldMaxVol && newVol > 0) prs.push(`Volume PR: ${parseFloat(lbsToDisplay(newVol)).toLocaleString()} ${wu()}`);

    if (prs.length > 0) {
        const prList = DB.get('prs', []);
        prs.forEach(pr => {
            prList.push({ exercise: exerciseName, pr, date: today() });
        });
        DB.set('prs', prList);
        showPRToast(exerciseName, prs);
    }
}

function showPRToast(exercise, prs) {
    const el = document.createElement('div');
    el.className = 'pr-toast';
    el.innerHTML = `<span class="pr-trophy">&#x1F3C6;</span><strong>NEW PR!</strong><br>${escapeHtml(exercise)}<br>${prs.join(' | ')}`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3500);
}

// --- Achievement Badges ---
const ACHIEVEMENTS = [
    // Workout milestones
    { id: 'first_workout', name: 'First Rep', desc: 'Log your first workout', icon: '&#x1F4AA;', verse: 'The journey of a thousand miles begins with a single step. — Proverbs 4:26', check: ctx => ctx.total >= 1, progress: ctx => ({ cur: ctx.total, goal: 1 }) },
    { id: 'ten_workouts', name: 'Getting Serious', desc: 'Log 10 workouts', icon: '&#x1F525;', verse: 'Whatever you do, work at it with all your heart. — Colossians 3:23', check: ctx => ctx.total >= 10, progress: ctx => ({ cur: ctx.total, goal: 10 }) },
    { id: 'twentyfive_workouts', name: 'Quarter Century', desc: 'Log 25 workouts', icon: '&#x1F4AB;', verse: 'Commit to the LORD whatever you do, and he will establish your plans. — Proverbs 16:3', check: ctx => ctx.total >= 25, progress: ctx => ({ cur: ctx.total, goal: 25 }) },
    { id: 'fifty_workouts', name: 'Iron Regular', desc: 'Log 50 workouts', icon: '&#x2B50;', verse: 'She sets about her work vigorously; her arms are strong for her tasks. — Proverbs 31:17', check: ctx => ctx.total >= 50, progress: ctx => ({ cur: ctx.total, goal: 50 }) },
    { id: 'hundred_workouts', name: 'Centurion', desc: 'Log 100 workouts', icon: '&#x1F451;', verse: 'I have fought the good fight, I have finished the race, I have kept the faith. — 2 Timothy 4:7', check: ctx => ctx.total >= 100, progress: ctx => ({ cur: ctx.total, goal: 100 }) },
    { id: 'twofifty_workouts', name: 'Iron Disciple', desc: 'Log 250 workouts', icon: '&#x1F5E1;', verse: 'No discipline seems pleasant at the time, but later it produces a harvest of righteousness. — Hebrews 12:11', check: ctx => ctx.total >= 250, progress: ctx => ({ cur: ctx.total, goal: 250 }) },
    { id: 'five_hundred', name: 'Legend', desc: 'Log 500 workouts', icon: '&#x1F48E;', verse: 'Well done, good and faithful servant. — Matthew 25:21', check: ctx => ctx.total >= 500, progress: ctx => ({ cur: ctx.total, goal: 500 }) },
    { id: 'thousand_workouts', name: 'Walking Temple', desc: 'Log 1000 workouts', icon: '&#x26EA;', verse: 'Do you not know that your bodies are temples of the Holy Spirit? — 1 Corinthians 6:19', check: ctx => ctx.total >= 1000, progress: ctx => ({ cur: ctx.total, goal: 1000 }) },
    // Streaks
    { id: 'three_streak', name: 'Momentum', desc: '3-day workout streak', icon: '&#x26A1;', verse: 'A cord of three strands is not quickly broken. — Ecclesiastes 4:12', check: ctx => ctx.streak >= 3, progress: ctx => ({ cur: ctx.streak, goal: 3 }) },
    { id: 'week_streak', name: '7-Day Warrior', desc: '7-day workout streak', icon: '&#x1F4A5;', verse: 'On the seventh day God had finished his work. — Genesis 2:2', check: ctx => ctx.streak >= 7, progress: ctx => ({ cur: ctx.streak, goal: 7 }) },
    { id: 'two_week_streak', name: 'Unstoppable', desc: '14-day workout streak', icon: '&#x1F30A;', verse: 'If God is for us, who can be against us? — Romans 8:31', check: ctx => ctx.streak >= 14, progress: ctx => ({ cur: ctx.streak, goal: 14 }) },
    { id: 'month_streak', name: '30-Day Beast', desc: '30-day workout streak', icon: '&#x1F981;', verse: 'Be strong and courageous. Do not be afraid. — Joshua 1:9', check: ctx => ctx.streak >= 30, progress: ctx => ({ cur: ctx.streak, goal: 30 }) },
    { id: 'sixty_streak', name: 'Iron Will', desc: '60-day workout streak', icon: '&#x1F9CA;', verse: 'As iron sharpens iron, so one person sharpens another. — Proverbs 27:17', check: ctx => ctx.streak >= 60, progress: ctx => ({ cur: ctx.streak, goal: 60 }) },
    { id: 'hundred_streak', name: 'Unbreakable', desc: '100-day workout streak', icon: '&#x1F6E1;', verse: 'I can do all things through Christ who strengthens me. — Philippians 4:13', check: ctx => ctx.streak >= 100, progress: ctx => ({ cur: ctx.streak, goal: 100 }) },
    // PRs
    { id: 'first_pr', name: 'Record Breaker', desc: 'Hit your first PR', icon: '&#x1F3C6;', verse: 'Forgetting what is behind, I press on toward the goal. — Philippians 3:13-14', check: ctx => ctx.prCount >= 1, progress: ctx => ({ cur: ctx.prCount, goal: 1 }) },
    { id: 'five_prs', name: 'Climbing', desc: 'Hit 5 personal records', icon: '&#x1F4C8;', verse: 'He makes my feet like the feet of a deer and sets me on the heights. — Psalm 18:33', check: ctx => ctx.prCount >= 5, progress: ctx => ({ cur: ctx.prCount, goal: 5 }) },
    { id: 'ten_prs', name: 'PR Machine', desc: 'Hit 10 personal records', icon: '&#x1F3C5;', verse: 'From strength to strength, each one appears before God. — Psalm 84:7', check: ctx => ctx.prCount >= 10, progress: ctx => ({ cur: ctx.prCount, goal: 10 }) },
    { id: 'twentyfive_prs', name: 'Relentless', desc: 'Hit 25 personal records', icon: '&#x1F525;', verse: 'Let us run with perseverance the race marked out for us. — Hebrews 12:1', check: ctx => ctx.prCount >= 25, progress: ctx => ({ cur: ctx.prCount, goal: 25 }) },
    { id: 'fifty_prs', name: 'Elite', desc: 'Hit 50 personal records', icon: '&#x1F396;', verse: 'The LORD will make you the head, not the tail. — Deuteronomy 28:13', check: ctx => ctx.prCount >= 50, progress: ctx => ({ cur: ctx.prCount, goal: 50 }) },
    // Exercise variety
    { id: 'five_exercises', name: 'Well Rounded', desc: 'Log 5 different exercises', icon: '&#x1F504;', verse: 'There are different kinds of gifts, but the same Spirit distributes them. — 1 Corinthians 12:4', check: ctx => ctx.uniqueExercises >= 5, progress: ctx => ({ cur: ctx.uniqueExercises, goal: 5 }) },
    { id: 'ten_exercises', name: 'Versatile', desc: 'Log 10 different exercises', icon: '&#x1F3AF;', verse: 'I have become all things to all people so that I might save some. — 1 Corinthians 9:22', check: ctx => ctx.uniqueExercises >= 10, progress: ctx => ({ cur: ctx.uniqueExercises, goal: 10 }) },
    { id: 'fifteen_exercises', name: 'Arsenal', desc: 'Log 15 different exercises', icon: '&#x2694;', verse: 'Put on the full armor of God. — Ephesians 6:11', check: ctx => ctx.uniqueExercises >= 15, progress: ctx => ({ cur: ctx.uniqueExercises, goal: 15 }) },
    { id: 'twentyfive_exercises', name: 'Master of All', desc: 'Log 25 different exercises', icon: '&#x1F9E0;', verse: 'Whatever your hand finds to do, do it with all your might. — Ecclesiastes 9:10', check: ctx => ctx.uniqueExercises >= 25, progress: ctx => ({ cur: ctx.uniqueExercises, goal: 25 }) },
    // Weight tracking
    { id: 'logged_weight', name: 'Accountable', desc: 'Log your body weight', icon: '&#x2696;', verse: 'A just balance is a delight to the LORD. — Proverbs 11:1', check: ctx => ctx.weighIns >= 1, progress: ctx => ({ cur: ctx.weighIns, goal: 1 }) },
    { id: 'ten_weigh_ins', name: 'Consistent Tracker', desc: 'Log body weight 10 times', icon: '&#x1F4CA;', verse: 'The plans of the diligent lead surely to abundance. — Proverbs 21:5', check: ctx => ctx.weighIns >= 10, progress: ctx => ({ cur: ctx.weighIns, goal: 10 }) },
    { id: 'fifty_weigh_ins', name: 'Data Driven', desc: 'Log body weight 50 times', icon: '&#x1F4C9;', verse: 'For which of you, desiring to build a tower, does not first count the cost? — Luke 14:28', check: ctx => ctx.weighIns >= 50, progress: ctx => ({ cur: ctx.weighIns, goal: 50 }) },
    // Nutrition
    { id: 'logged_meal', name: 'Fuel Up', desc: 'Log your first meal', icon: '&#x1F372;', verse: 'Whether you eat or drink, do all to the glory of God. — 1 Corinthians 10:31', check: ctx => ctx.meals >= 1, progress: ctx => ({ cur: ctx.meals, goal: 1 }) },
    { id: 'fifty_meals', name: 'Meal Prepper', desc: 'Log 50 meals', icon: '&#x1F957;', verse: 'Give us this day our daily bread. — Matthew 6:11', check: ctx => ctx.meals >= 50, progress: ctx => ({ cur: ctx.meals, goal: 50 }) },
    { id: 'hundred_meals', name: 'Nutrition Nerd', desc: 'Log 100 meals', icon: '&#x1F468;', verse: 'So whether you eat or drink, do it all for the glory of God. — 1 Corinthians 10:31', check: ctx => ctx.meals >= 100, progress: ctx => ({ cur: ctx.meals, goal: 100 }) },
    // Volume milestones
    { id: 'ten_k_volume', name: 'Heavy Lifter', desc: 'Lift 10,000 lbs total', icon: '&#x1F3CB;', verse: 'He gives strength to the weary and increases the power of the weak. — Isaiah 40:29', check: ctx => ctx.totalVolume >= 10000, progress: ctx => ({ cur: ctx.totalVolume, goal: 10000, fmt: true }) },
    { id: 'fifty_k_volume', name: 'Iron Mountain', desc: 'Lift 50,000 lbs total', icon: '&#x26F0;', verse: 'I lift up my eyes to the mountains — where does my help come from? — Psalm 121:1', check: ctx => ctx.totalVolume >= 50000, progress: ctx => ({ cur: ctx.totalVolume, goal: 50000, fmt: true }) },
    { id: 'hundred_k_volume', name: 'Titan', desc: 'Lift 100,000 lbs total', icon: '&#x1F30D;', verse: 'With God all things are possible. — Matthew 19:26', check: ctx => ctx.totalVolume >= 100000, progress: ctx => ({ cur: ctx.totalVolume, goal: 100000, fmt: true }) },
    { id: 'half_mil_volume', name: 'Demigod', desc: 'Lift 500,000 lbs total', icon: '&#x1FA90;', verse: 'The LORD is my rock, my fortress, and my deliverer. — Psalm 18:2', check: ctx => ctx.totalVolume >= 500000, progress: ctx => ({ cur: ctx.totalVolume, goal: 500000, fmt: true }) },
    { id: 'mil_volume', name: 'Million Pound Club', desc: 'Lift 1,000,000 lbs total', icon: '&#x1F4A0;', verse: 'Great is the LORD and most worthy of praise; his greatness no one can fathom. — Psalm 145:3', check: ctx => ctx.totalVolume >= 1000000, progress: ctx => ({ cur: ctx.totalVolume, goal: 1000000, fmt: true }) },
    // Big three
    { id: 'thousand_club', name: '1000lb Club', desc: 'Bench+Squat+Deadlift total 1000+ lbs', icon: '&#x1F947;', verse: 'The LORD is my strength and my shield; my heart trusts in him. — Psalm 28:7', check: ctx => ctx.bigThreeTotal >= 1000, progress: ctx => ({ cur: ctx.bigThreeTotal, goal: 1000, fmt: true }) },
    // Muscle coverage
    { id: 'full_body_week', name: 'No Weak Links', desc: 'Hit all 7 muscle groups in one week', icon: '&#x1F9BE;', verse: 'The body is not made up of one part but of many. — 1 Corinthians 12:14', check: ctx => ctx.muscleGroupsHit >= 7, progress: ctx => ({ cur: ctx.muscleGroupsHit, goal: 7 }) },
    // Training days in a single week
    { id: 'five_day_week', name: 'Grinder', desc: 'Train 5 days in a single week', icon: '&#x23F1;', verse: 'The hand of the diligent will rule. — Proverbs 12:24', check: ctx => ctx.bestWeekDays >= 5, progress: ctx => ({ cur: ctx.bestWeekDays, goal: 5 }) },
    { id: 'six_day_week', name: 'No Days Off', desc: 'Train 6+ days in a single week', icon: '&#x1F525;', verse: 'Six days you shall labor and do all your work. — Exodus 20:9', check: ctx => ctx.bestWeekDays >= 6, progress: ctx => ({ cur: ctx.bestWeekDays, goal: 6 }) },
    // Early bird / night owl
    { id: 'early_bird', name: 'Early Bird', desc: 'Log a workout before 7am', icon: '&#x1F305;', verse: 'Very early in the morning, while it was still dark, Jesus got up and prayed. — Mark 1:35', check: ctx => ctx.earlyWorkout },
    { id: 'night_owl', name: 'Night Owl', desc: 'Log a workout after 9pm', icon: '&#x1F319;', verse: 'By night I sought him whom my soul loveth. — Song of Solomon 3:1', check: ctx => ctx.lateWorkout },
    // Profile setup
    { id: 'profile_complete', name: 'Locked In', desc: 'Complete your profile', icon: '&#x1F512;', verse: 'For I know the plans I have for you, declares the LORD. — Jeremiah 29:11', check: ctx => ctx.profileComplete },
    // Coach interaction
    { id: 'used_coach', name: 'Coachable', desc: 'Ask the coach a question', icon: '&#x1F4AC;', verse: 'Plans fail for lack of counsel, but with many advisers they succeed. — Proverbs 15:22', check: ctx => ctx.coachUsed },
];

function getAchievementContext() {
    const workouts = DB.get('workouts', []);
    const prs = DB.get('prs', []);
    const weights = DB.get('weights', []);
    const meals = DB.get('meals', []);
    const profile = DB.get('profile', {});

    // Calculate streak
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

    // Big three total (best weight per lift)
    let bigThreeTotal = 0;
    ['Bench Press', 'Squat', 'Deadlift'].forEach(lift => {
        const logs = workouts.filter(w => w.name === lift);
        if (logs.length > 0) {
            bigThreeTotal += Math.max(...logs.flatMap(w => w.sets.map(s => s.weight)));
        }
    });

    // Total volume (all time)
    const totalVolume = workouts.reduce((sum, w) => sum + w.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0);

    // Muscle groups hit this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];
    const weekWorkouts = workouts.filter(w => w.date >= weekStr);
    const achMuscleMap = getFullMuscleMap();
    const muscleGroupsHit = Object.entries(achMuscleMap).filter(([, exercises]) =>
        weekWorkouts.some(w => exercises.some(e => w.name.toLowerCase() === e.toLowerCase()))
    ).length;

    // Best training days in a single week
    const weekBuckets = {};
    dates.forEach(d => {
        const dt = new Date(d);
        const weekStart = new Date(dt);
        weekStart.setDate(dt.getDate() - dt.getDay());
        const key = weekStart.toISOString().split('T')[0];
        weekBuckets[key] = (weekBuckets[key] || 0) + 1;
    });
    const bestWeekDays = Math.max(0, ...Object.values(weekBuckets));

    // Early bird / night owl
    let earlyWorkout = false;
    let lateWorkout = false;
    workouts.forEach(w => {
        if (w.timestamp) {
            const hour = new Date(w.timestamp).getHours();
            if (hour < 7) earlyWorkout = true;
            if (hour >= 21) lateWorkout = true;
        }
    });

    // Profile complete
    const profileComplete = !!(profile.name && profile.age && profile.weight && profile.goal);

    // Coach used
    const coachUsed = DB.get('coachUsed', false);

    return {
        total: workouts.length,
        streak,
        prCount: prs.length,
        uniqueExercises: new Set(workouts.map(w => w.name)).size,
        weighIns: weights.length,
        meals: meals.length,
        bigThreeTotal,
        totalVolume,
        muscleGroupsHit,
        bestWeekDays,
        earlyWorkout,
        lateWorkout,
        profileComplete,
        coachUsed,
    };
}

function checkAchievements() {
    const unlocked = DB.get('achievements', []);
    const ctx = getAchievementContext();
    let newUnlock = false;

    ACHIEVEMENTS.forEach(a => {
        if (!unlocked.includes(a.id) && a.check(ctx)) {
            unlocked.push(a.id);
            newUnlock = true;
            showToast(`${a.icon} Achievement Unlocked: ${a.name}!`);
        }
    });

    if (newUnlock) DB.set('achievements', unlocked);
}

function renderAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    const unlocked = DB.get('achievements', []);
    const ctx = getAchievementContext();

    container.innerHTML = ACHIEVEMENTS.map(a => {
        const earned = unlocked.includes(a.id);
        let progressHtml = '';
        if (!earned && a.progress) {
            const p = a.progress(ctx);
            const cur = Math.min(p.cur, p.goal);
            const pct = Math.round((cur / p.goal) * 100);
            const curStr = p.fmt ? cur.toLocaleString() : cur;
            const goalStr = p.fmt ? p.goal.toLocaleString() : p.goal;
            progressHtml = `<span class="badge-progress">${curStr} / ${goalStr}</span>
                <div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${pct}%"></div></div>`;
        }
        if (earned) {
            progressHtml = '<span class="badge-progress badge-done">Complete</span>';
        }
        return `<div class="badge ${earned ? 'earned' : 'locked'}" title="${a.desc}">
            <span class="badge-icon">${a.icon}</span>
            <span class="badge-name">${a.name}</span>
            ${progressHtml}
        </div>`;
    }).join('');
}

// --- Calendar Heatmap ---
function renderCalendarHeatmap() {
    const container = document.getElementById('calendar-heatmap');
    if (!container) return;
    const workouts = DB.get('workouts', []);

    // Count workouts per day for last 90 days
    const counts = {};
    workouts.forEach(w => { counts[w.date] = (counts[w.date] || 0) + 1; });

    const now = new Date();
    const days = [];
    for (let i = 89; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({ date: dateStr, count: counts[dateStr] || 0, day: d.getDay() });
    }

    // Build grid — weeks as columns, days as rows
    const weeks = [];
    let currentWeek = [];
    days.forEach((d, i) => {
        if (i === 0) {
            // Pad first week
            for (let p = 0; p < d.day; p++) currentWeek.push(null);
        }
        currentWeek.push(d);
        if (d.day === 6 || i === days.length - 1) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    let html = '<div class="heatmap-grid">';
    // Day labels
    html += '<div class="heatmap-labels"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>';
    html += '<div class="heatmap-weeks">';
    weeks.forEach(week => {
        html += '<div class="heatmap-week">';
        for (let r = 0; r < 7; r++) {
            const cell = week[r];
            if (!cell) {
                html += '<div class="heatmap-cell empty"></div>';
            } else {
                const level = cell.count === 0 ? 0 : cell.count <= 2 ? 1 : cell.count <= 4 ? 2 : 3;
                html += `<div class="heatmap-cell level-${level}" title="${cell.date}: ${cell.count} exercises"></div>`;
            }
        }
        html += '</div>';
    });
    html += '</div></div>';

    // Month labels
    const months = [];
    let lastMonth = -1;
    days.forEach((d, i) => {
        const m = new Date(d.date).getMonth();
        if (m !== lastMonth) {
            months.push({ name: new Date(d.date).toLocaleString('en', { month: 'short' }), index: i });
            lastMonth = m;
        }
    });
    html += '<div class="heatmap-months">' + months.map(m => `<span>${m.name}</span>`).join('') + '</div>';

    container.innerHTML = html;
}

// --- Muscle Heatmap (SVG Body Mannequin) ---
function renderMuscleHeatmap() {
    const container = document.getElementById('muscle-heatmap');
    if (!container) return;

    const workouts = DB.get('workouts', []);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];
    const weekWorkouts = workouts.filter(w => w.date >= weekStr);

    const muscleMap = getFullMuscleMap();

    // Calculate volume per sub-group
    const volume = {};
    Object.keys(muscleMap).forEach(g => volume[g] = 0);
    weekWorkouts.forEach(w => {
        for (const [group, exercises] of Object.entries(muscleMap)) {
            if (exercises.some(e => w.name.toLowerCase() === e.toLowerCase())) {
                volume[group] += w.sets.length;
            }
        }
    });

    const maxVol = Math.max(...Object.values(volume), 1);

    // Color function: 0 = base gray, then green gradient
    function heatColor(group) {
        const v = volume[group] || 0;
        if (v === 0) return 'rgba(255,255,255,0.06)';
        const ratio = v / maxVol;
        if (ratio > 0.7) return 'rgba(74,222,128,0.85)';
        if (ratio > 0.4) return 'rgba(74,222,128,0.5)';
        return 'rgba(74,222,128,0.25)';
    }

    function strokeColor(group) {
        const v = volume[group] || 0;
        if (v === 0) return 'rgba(255,255,255,0.1)';
        return 'rgba(74,222,128,0.4)';
    }

    // Build SVG mannequin — front and back views
    // Each muscle region is a path/shape that gets colored by volume
    let html = '<div class="muscle-map-body">';

    // --- FRONT VIEW ---
    html += `<div class="mannequin-view"><div class="mannequin-label">Front</div>`;
    html += `<svg viewBox="0 0 200 420" class="mannequin-svg" xmlns="http://www.w3.org/2000/svg">`;

    // Head
    html += `<ellipse cx="100" cy="30" rx="18" ry="22" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`;
    // Neck
    html += `<rect x="92" y="50" width="16" height="14" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;

    // Traps (front visible portion)
    html += `<path d="M80,64 L92,60 L100,64 L108,60 L120,64 L116,74 L84,74 Z" fill="${heatColor('traps')}" stroke="${strokeColor('traps')}" stroke-width="0.7" data-muscle="traps" data-sets="${volume.traps}"><title>Traps: ${volume.traps} sets</title></path>`;

    // Front Delts
    html += `<path d="M64,74 L80,68 L84,74 L84,96 L68,92 Z" fill="${heatColor('front_delts')}" stroke="${strokeColor('front_delts')}" stroke-width="0.7" data-muscle="front_delts"><title>Front Delts: ${volume.front_delts} sets</title></path>`;
    html += `<path d="M136,74 L120,68 L116,74 L116,96 L132,92 Z" fill="${heatColor('front_delts')}" stroke="${strokeColor('front_delts')}" stroke-width="0.7" data-muscle="front_delts"><title>Front Delts: ${volume.front_delts} sets</title></path>`;

    // Side Delts
    html += `<path d="M58,78 L64,74 L68,92 L60,94 Z" fill="${heatColor('side_delts')}" stroke="${strokeColor('side_delts')}" stroke-width="0.7"><title>Side Delts: ${volume.side_delts} sets</title></path>`;
    html += `<path d="M142,78 L136,74 L132,92 L140,94 Z" fill="${heatColor('side_delts')}" stroke="${strokeColor('side_delts')}" stroke-width="0.7"><title>Side Delts: ${volume.side_delts} sets</title></path>`;

    // Upper Chest
    html += `<path d="M84,74 L100,78 L116,74 L116,90 L100,94 L84,90 Z" fill="${heatColor('upper_chest')}" stroke="${strokeColor('upper_chest')}" stroke-width="0.7"><title>Upper Chest: ${volume.upper_chest} sets</title></path>`;

    // Mid Chest
    html += `<path d="M84,90 L100,94 L116,90 L116,110 L100,114 L84,110 Z" fill="${heatColor('mid_chest')}" stroke="${strokeColor('mid_chest')}" stroke-width="0.7"><title>Mid Chest: ${volume.mid_chest} sets</title></path>`;

    // Lower Chest
    html += `<path d="M84,110 L100,114 L116,110 L114,122 L100,124 L86,122 Z" fill="${heatColor('lower_chest')}" stroke="${strokeColor('lower_chest')}" stroke-width="0.7"><title>Lower Chest: ${volume.lower_chest} sets</title></path>`;

    // Biceps
    html += `<path d="M60,94 L68,92 L66,140 L56,138 Z" fill="${heatColor('biceps')}" stroke="${strokeColor('biceps')}" stroke-width="0.7"><title>Biceps: ${volume.biceps} sets</title></path>`;
    html += `<path d="M140,94 L132,92 L134,140 L144,138 Z" fill="${heatColor('biceps')}" stroke="${strokeColor('biceps')}" stroke-width="0.7"><title>Biceps: ${volume.biceps} sets</title></path>`;

    // Triceps (front visible inner arm)
    html += `<path d="M68,92 L84,96 L82,140 L66,140 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;
    html += `<path d="M132,92 L116,96 L118,140 L134,140 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;

    // Forearms
    html += `<path d="M56,138 L66,140 L62,188 L52,184 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M82,140 L66,140 L62,188 L76,188 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M144,138 L134,140 L138,188 L148,184 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M118,140 L134,140 L138,188 L124,188 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;

    // Abs
    html += `<path d="M88,124 L100,126 L112,124 L112,180 L100,182 L88,180 Z" fill="${heatColor('abs')}" stroke="${strokeColor('abs')}" stroke-width="0.7"><title>Abs: ${volume.abs} sets</title></path>`;

    // Obliques
    html += `<path d="M84,122 L88,124 L88,180 L82,178 L80,140 Z" fill="${heatColor('obliques')}" stroke="${strokeColor('obliques')}" stroke-width="0.7"><title>Obliques: ${volume.obliques} sets</title></path>`;
    html += `<path d="M116,122 L112,124 L112,180 L118,178 L120,140 Z" fill="${heatColor('obliques')}" stroke="${strokeColor('obliques')}" stroke-width="0.7"><title>Obliques: ${volume.obliques} sets</title></path>`;

    // Quads
    html += `<path d="M82,190 L100,194 L100,290 L80,286 Z" fill="${heatColor('quads')}" stroke="${strokeColor('quads')}" stroke-width="0.7"><title>Quads: ${volume.quads} sets</title></path>`;
    html += `<path d="M118,190 L100,194 L100,290 L120,286 Z" fill="${heatColor('quads')}" stroke="${strokeColor('quads')}" stroke-width="0.7"><title>Quads: ${volume.quads} sets</title></path>`;

    // Calves (front - tibialis area + calves)
    html += `<path d="M82,296 L98,298 L96,370 L78,366 Z" fill="${heatColor('calves')}" stroke="${strokeColor('calves')}" stroke-width="0.7"><title>Calves: ${volume.calves} sets</title></path>`;
    html += `<path d="M118,296 L102,298 L104,370 L122,366 Z" fill="${heatColor('calves')}" stroke="${strokeColor('calves')}" stroke-width="0.7"><title>Calves: ${volume.calves} sets</title></path>`;

    html += `</svg></div>`;

    // --- BACK VIEW ---
    html += `<div class="mannequin-view"><div class="mannequin-label">Back</div>`;
    html += `<svg viewBox="0 0 200 420" class="mannequin-svg" xmlns="http://www.w3.org/2000/svg">`;

    // Head
    html += `<ellipse cx="100" cy="30" rx="18" ry="22" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`;
    // Neck
    html += `<rect x="92" y="50" width="16" height="14" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>`;

    // Traps (back - larger)
    html += `<path d="M76,64 L92,56 L100,62 L108,56 L124,64 L120,82 L80,82 Z" fill="${heatColor('traps')}" stroke="${strokeColor('traps')}" stroke-width="0.7"><title>Traps: ${volume.traps} sets</title></path>`;

    // Rear Delts
    html += `<path d="M60,74 L76,68 L80,82 L80,98 L64,94 Z" fill="${heatColor('rear_delts')}" stroke="${strokeColor('rear_delts')}" stroke-width="0.7"><title>Rear Delts: ${volume.rear_delts} sets</title></path>`;
    html += `<path d="M140,74 L124,68 L120,82 L120,98 L136,94 Z" fill="${heatColor('rear_delts')}" stroke="${strokeColor('rear_delts')}" stroke-width="0.7"><title>Rear Delts: ${volume.rear_delts} sets</title></path>`;

    // Upper Back / Rhomboids
    html += `<path d="M80,82 L100,86 L120,82 L120,120 L100,124 L80,120 Z" fill="${heatColor('upper_back')}" stroke="${strokeColor('upper_back')}" stroke-width="0.7"><title>Upper Back: ${volume.upper_back} sets</title></path>`;

    // Lats
    html += `<path d="M80,98 L80,120 L100,124 L100,160 L78,150 L74,110 Z" fill="${heatColor('lats')}" stroke="${strokeColor('lats')}" stroke-width="0.7"><title>Lats: ${volume.lats} sets</title></path>`;
    html += `<path d="M120,98 L120,120 L100,124 L100,160 L122,150 L126,110 Z" fill="${heatColor('lats')}" stroke="${strokeColor('lats')}" stroke-width="0.7"><title>Lats: ${volume.lats} sets</title></path>`;

    // Lower Back / Erectors
    html += `<path d="M86,150 L100,160 L114,150 L114,186 L100,190 L86,186 Z" fill="${heatColor('lower_back')}" stroke="${strokeColor('lower_back')}" stroke-width="0.7"><title>Lower Back: ${volume.lower_back} sets</title></path>`;

    // Triceps (back view - more visible)
    html += `<path d="M56,94 L64,94 L66,140 L54,138 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;
    html += `<path d="M64,94 L80,98 L78,140 L66,140 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;
    html += `<path d="M144,94 L136,94 L134,140 L146,138 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;
    html += `<path d="M136,94 L120,98 L122,140 L134,140 Z" fill="${heatColor('triceps')}" stroke="${strokeColor('triceps')}" stroke-width="0.7"><title>Triceps: ${volume.triceps} sets</title></path>`;

    // Forearms (back)
    html += `<path d="M54,138 L66,140 L62,188 L50,184 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M78,140 L66,140 L62,188 L74,188 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M146,138 L134,140 L138,188 L150,184 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;
    html += `<path d="M122,140 L134,140 L138,188 L126,188 Z" fill="${heatColor('forearms')}" stroke="${strokeColor('forearms')}" stroke-width="0.7"><title>Forearms: ${volume.forearms} sets</title></path>`;

    // Glutes
    html += `<path d="M80,186 L100,190 L100,218 L78,214 Z" fill="${heatColor('glutes')}" stroke="${strokeColor('glutes')}" stroke-width="0.7"><title>Glutes: ${volume.glutes} sets</title></path>`;
    html += `<path d="M120,186 L100,190 L100,218 L122,214 Z" fill="${heatColor('glutes')}" stroke="${strokeColor('glutes')}" stroke-width="0.7"><title>Glutes: ${volume.glutes} sets</title></path>`;

    // Hamstrings
    html += `<path d="M78,218 L100,222 L100,296 L80,290 Z" fill="${heatColor('hamstrings')}" stroke="${strokeColor('hamstrings')}" stroke-width="0.7"><title>Hamstrings: ${volume.hamstrings} sets</title></path>`;
    html += `<path d="M122,218 L100,222 L100,296 L120,290 Z" fill="${heatColor('hamstrings')}" stroke="${strokeColor('hamstrings')}" stroke-width="0.7"><title>Hamstrings: ${volume.hamstrings} sets</title></path>`;

    // Calves (back)
    html += `<path d="M80,296 L98,300 L96,370 L76,366 Z" fill="${heatColor('calves')}" stroke="${strokeColor('calves')}" stroke-width="0.7"><title>Calves: ${volume.calves} sets</title></path>`;
    html += `<path d="M120,296 L102,300 L104,370 L124,366 Z" fill="${heatColor('calves')}" stroke="${strokeColor('calves')}" stroke-width="0.7"><title>Calves: ${volume.calves} sets</title></path>`;

    html += `</svg></div>`;

    html += '</div>';

    // --- Legend + detail grid ---
    html += '<div class="muscle-heatmap-legend">';
    html += '<span class="legend-item"><span class="legend-swatch" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1)"></span> Not trained</span>';
    html += '<span class="legend-item"><span class="legend-swatch" style="background:rgba(74,222,128,0.25)"></span> Low</span>';
    html += '<span class="legend-item"><span class="legend-swatch" style="background:rgba(74,222,128,0.5)"></span> Moderate</span>';
    html += '<span class="legend-item"><span class="legend-swatch" style="background:rgba(74,222,128,0.85)"></span> High</span>';
    html += '</div>';

    // Detail grid showing all sub-groups with set counts
    const detailGroups = [
        { label: 'Upper Chest', key: 'upper_chest' },
        { label: 'Mid Chest', key: 'mid_chest' },
        { label: 'Lower Chest', key: 'lower_chest' },
        { label: 'Front Delts', key: 'front_delts' },
        { label: 'Side Delts', key: 'side_delts' },
        { label: 'Rear Delts', key: 'rear_delts' },
        { label: 'Traps', key: 'traps' },
        { label: 'Lats', key: 'lats' },
        { label: 'Upper Back', key: 'upper_back' },
        { label: 'Lower Back', key: 'lower_back' },
        { label: 'Biceps', key: 'biceps' },
        { label: 'Triceps', key: 'triceps' },
        { label: 'Forearms', key: 'forearms' },
        { label: 'Abs', key: 'abs' },
        { label: 'Obliques', key: 'obliques' },
        { label: 'Quads', key: 'quads' },
        { label: 'Hamstrings', key: 'hamstrings' },
        { label: 'Glutes', key: 'glutes' },
        { label: 'Calves', key: 'calves' },
    ];

    html += '<div class="muscle-detail-grid">';
    detailGroups.forEach(g => {
        const v = volume[g.key] || 0;
        const ratio = v / maxVol;
        let lvl = 'none';
        if (v > 0 && ratio > 0.7) lvl = 'high';
        else if (v > 0 && ratio > 0.4) lvl = 'med';
        else if (v > 0) lvl = 'low';
        html += `<div class="muscle-detail-item level-${lvl}">
            <span class="muscle-detail-name">${g.label}</span>
            <span class="muscle-detail-sets">${v} sets</span>
        </div>`;
    });
    html += '</div>';

    container.innerHTML = html;
}

// =============================================
// FEATURE: Workout Templates / Routines
// =============================================

function getTemplates() { return DB.get('templates', []); }
function saveTemplates(t) { DB.set('templates', t); }

function renderRoutinesList() {
    const container = document.getElementById('routines-list');
    const templates = getTemplates();
    if (templates.length === 0) {
        container.innerHTML = '<p class="empty-state">No routines saved yet. Complete a session and save it as a routine!</p>';
        return;
    }
    container.innerHTML = templates.map((t, i) => `
        <div class="routine-item">
            <div class="routine-info">
                <h4>${escapeHtml(t.name)}</h4>
                <p>${t.exercises.length} exercises${t.lastUsed ? ' &middot; Last: ' + t.lastUsed : ''}</p>
            </div>
            <div class="routine-actions">
                <button class="btn btn-primary btn-sm" onclick="startTemplate(${i})">Start</button>
                <button class="btn btn-secondary btn-sm" onclick="renameTemplate(${i})">Rename</button>
                <button class="delete-btn" onclick="deleteTemplate(${i})" title="Delete">&times;</button>
            </div>
        </div>
    `).join('');
}

function saveAsTemplate() {
    const workouts = DB.get('workouts', []).filter(w => w.date === today());
    if (workouts.length === 0) return;
    const name = prompt('Name this routine (e.g., "Push Day", "Full Body A"):');
    if (!name || !name.trim()) return;
    const templates = getTemplates();
    templates.push({
        id: Date.now(),
        name: name.trim(),
        exercises: workouts.map(w => ({ name: w.name, sets: w.sets.map(s => ({ weight: s.weight, reps: s.reps })) })),
        created: today(),
        lastUsed: null
    });
    saveTemplates(templates);
    renderRoutinesList();
    showToast('Routine saved!');
}

function startTemplate(index) {
    const templates = getTemplates();
    const tmpl = templates[index];
    if (!tmpl) return;

    // Get last logged weights for each exercise
    const allWorkouts = DB.get('workouts', []);
    const container = document.getElementById('template-exercises');
    container.innerHTML = tmpl.exercises.map((ex, ei) => {
        const lastLog = [...allWorkouts].reverse().find(w => w.name === ex.name);
        const sets = lastLog ? lastLog.sets : ex.sets;
        return `
            <div class="template-exercise-block" data-exercise="${escapeHtml(ex.name)}">
                <h4>${escapeHtml(ex.name)}</h4>
                ${sets.map((s, si) => `
                    <div class="template-set-row">
                        <span class="set-label">Set ${si + 1}</span>
                        <input type="number" class="tmpl-weight" value="${isMetric() ? (s.weight * 0.453592).toFixed(1) : s.weight}" step="2.5" placeholder="${wu()}">
                        <span class="x-label">x</span>
                        <input type="number" class="tmpl-reps" value="${s.reps}" placeholder="Reps">
                    </div>
                `).join('')}
                <div class="btn-row"><button class="btn btn-secondary btn-sm" onclick="addTemplateSet(this)">+ Set</button></div>
            </div>`;
    }).join('');

    document.getElementById('template-session').classList.remove('hidden');
    document.getElementById('template-session-title').textContent = tmpl.name;
    document.getElementById('template-session').dataset.templateIndex = index;
    document.getElementById('log-workout-card').classList.add('hidden');

    templates[index].lastUsed = today();
    saveTemplates(templates);
    renderRoutinesList();
}

function addTemplateSet(btn) {
    const block = btn.closest('.template-exercise-block');
    const rows = block.querySelectorAll('.template-set-row');
    const num = rows.length + 1;
    const div = document.createElement('div');
    div.className = 'template-set-row';
    div.innerHTML = `<span class="set-label">Set ${num}</span><input type="number" class="tmpl-weight" step="2.5" placeholder="${wu()}"><span class="x-label">x</span><input type="number" class="tmpl-reps" placeholder="Reps">`;
    btn.closest('.btn-row').before(div);
}

function cancelTemplateSession() {
    document.getElementById('template-session').classList.add('hidden');
    document.getElementById('log-workout-card').classList.remove('hidden');
}

function finishTemplateSession() {
    const blocks = document.querySelectorAll('.template-exercise-block');
    const workouts = DB.get('workouts', []);
    let count = 0;
    blocks.forEach(block => {
        const name = block.dataset.exercise;
        const sets = [];
        block.querySelectorAll('.template-set-row').forEach(row => {
            const rawW = parseFloat(row.querySelector('.tmpl-weight').value) || 0;
            const weight = isMetric() ? rawW / 0.453592 : rawW;
            const reps = parseInt(row.querySelector('.tmpl-reps').value) || 0;
            if (reps > 0) sets.push({ weight, reps });
        });
        if (sets.length > 0) {
            workouts.push({ date: today(), name, sets, timestamp: Date.now() });
            count++;
        }
    });
    DB.set('workouts', workouts);
    document.getElementById('template-session').classList.add('hidden');
    document.getElementById('log-workout-card').classList.remove('hidden');
    updateTodaysExercises();
    updateOverloadDropdown();
    updateDashboard();
    updateStreak();
    checkAchievements();
    showToast(`${count} exercises logged!`);
}

function renameTemplate(index) {
    const templates = getTemplates();
    const newName = prompt('Rename routine:', templates[index].name);
    if (!newName || !newName.trim()) return;
    templates[index].name = newName.trim();
    saveTemplates(templates);
    renderRoutinesList();
}

function deleteTemplate(index) {
    if (!confirm('Delete this routine?')) return;
    const templates = getTemplates();
    templates.splice(index, 1);
    saveTemplates(templates);
    renderRoutinesList();
}

function updateSaveTemplateBtn() {
    const btn = document.getElementById('save-template-btn');
    const workouts = DB.get('workouts', []).filter(w => w.date === today());
    btn.style.display = workouts.length > 0 ? 'block' : 'none';
}

// =============================================
// FEATURE: Rest Timer
// =============================================

let restTimerInterval = null;
let restTimerTotal = 0;
let restTimerRemaining = 0;
let restTimerPanelOpen = false;

function toggleRestTimer() {
    const panel = document.querySelector('.rest-timer-panel');
    restTimerPanelOpen = !restTimerPanelOpen;
    panel.classList.toggle('hidden', !restTimerPanelOpen);
}

function startRestTimer(seconds) {
    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerTotal = seconds;
    restTimerRemaining = seconds;
    document.getElementById('stop-timer-btn').style.display = 'block';
    document.getElementById('rest-timer-mini').classList.remove('hidden');
    updateRestTimerDisplay();
    restTimerInterval = setInterval(() => {
        restTimerRemaining--;
        if (restTimerRemaining <= 0) {
            restTimerRemaining = 0;
            clearInterval(restTimerInterval);
            restTimerInterval = null;
            onRestTimerComplete();
        }
        updateRestTimerDisplay();
    }, 1000);
}

function stopRestTimer() {
    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = null;
    restTimerRemaining = 0;
    restTimerTotal = 0;
    document.getElementById('timer-time').textContent = '0:00';
    document.getElementById('rest-timer-mini').classList.add('hidden');
    document.getElementById('rest-timer-mini').textContent = '';
    document.getElementById('stop-timer-btn').style.display = 'none';
    const ring = document.getElementById('timer-ring-progress');
    ring.style.strokeDashoffset = 282.74;
}

function updateRestTimerDisplay() {
    const m = Math.floor(restTimerRemaining / 60);
    const s = restTimerRemaining % 60;
    const str = `${m}:${s.toString().padStart(2, '0')}`;
    document.getElementById('timer-time').textContent = str;
    document.getElementById('rest-timer-mini').textContent = str;
    const ring = document.getElementById('timer-ring-progress');
    const circumference = 282.74;
    const progress = restTimerTotal > 0 ? restTimerRemaining / restTimerTotal : 0;
    ring.style.strokeDashoffset = circumference * (1 - progress);
}

function onRestTimerComplete() {
    document.getElementById('stop-timer-btn').style.display = 'none';
    document.getElementById('rest-timer-mini').classList.add('hidden');
    // Vibrate
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    // Beep via Web Audio API
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.25, 0.5].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.3;
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.15);
        });
    } catch (e) {}
    showToast('Rest complete! Time to lift!');
}

function updateRestTimerVisibility() {
    const el = document.getElementById('rest-timer');
    const workoutActive = document.getElementById('workout').classList.contains('active');
    el.style.display = workoutActive ? 'block' : 'none';
}

// =============================================
// FEATURE: Food Search Database
// =============================================

let currentServings = 1;

function searchFood(query) {
    const results = document.getElementById('food-search-results');
    if (!query || query.length < 2 || typeof FOOD_DB === 'undefined') {
        results.classList.add('hidden');
        return;
    }
    const q = query.toLowerCase();
    const matches = FOOD_DB.filter(f => f.name.toLowerCase().includes(q)).slice(0, 10);
    if (matches.length === 0) {
        results.classList.add('hidden');
        return;
    }
    results.innerHTML = matches.map((f, i) => `
        <div class="food-result" onclick="selectFood(${FOOD_DB.indexOf(f)})">
            <span class="food-result-name">${escapeHtml(f.name)}</span>
            <span class="food-result-info">${f.serving} &middot; ${f.calories} cal</span>
        </div>
    `).join('');
    results.classList.remove('hidden');
}

function selectFood(index) {
    const food = FOOD_DB[index];
    selectedFood = food;
    currentServings = 1;
    document.getElementById('meal-name').value = food.name;
    document.getElementById('meal-calories').value = food.calories;
    document.getElementById('meal-protein').value = food.protein;
    document.getElementById('meal-carbs').value = food.carbs;
    document.getElementById('meal-fat').value = food.fat;
    document.getElementById('food-search-results').classList.add('hidden');
    document.getElementById('servings-group').style.display = 'block';
    document.getElementById('serving-count').textContent = '1';
    document.getElementById('serving-desc').textContent = food.serving;
}

function adjustServings(delta) {
    if (!selectedFood) return;
    currentServings = Math.max(0.5, currentServings + delta);
    document.getElementById('serving-count').textContent = currentServings;
    document.getElementById('meal-calories').value = Math.round(selectedFood.calories * currentServings);
    document.getElementById('meal-protein').value = Math.round(selectedFood.protein * currentServings);
    document.getElementById('meal-carbs').value = Math.round(selectedFood.carbs * currentServings);
    document.getElementById('meal-fat').value = Math.round(selectedFood.fat * currentServings);
}

// Close food search on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.food-search-wrap')) {
        const r = document.getElementById('food-search-results');
        if (r) r.classList.add('hidden');
    }
});

// =============================================
// FEATURE: Shareable Progress Cards
// =============================================

function generateProgressCard() {
    const canvas = document.getElementById('progress-card-canvas');
    const ctx = canvas.getContext('2d');
    const w = 600, h = 800;
    canvas.width = w; canvas.height = h;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a0a');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('IRON FAITH', w / 2, 80);

    // Tagline
    ctx.fillStyle = '#666';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText('Forge your body. Strengthen your spirit.', w / 2, 105);

    // Date
    ctx.fillStyle = '#888';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(today(), w / 2, 135);

    // Divider
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, 155); ctx.lineTo(w - 60, 155); ctx.stroke();

    // Stats
    const profile = DB.get('profile', {});
    const workouts = DB.get('workouts', []);
    const meals = DB.get('meals', []).filter(m => m.date === today());
    const weights = DB.get('weights', []);
    const todayWorkouts = workouts.filter(w => w.date === today());
    const totalCal = meals.reduce((s, m) => s + m.calories, 0);
    const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
    let streak = 0;
    if (dates.includes(today())) {
        streak = 1;
        const d = new Date();
        for (let i = 1; i < 365; i++) { d.setDate(d.getDate() - 1); if (dates.includes(d.toISOString().split('T')[0])) streak++; else break; }
    }
    const currentWeight = weights.length > 0 ? `${lbsToDisplay(weights[weights.length - 1].weight)} ${wu()}` : '--';

    const stats = [
        { label: 'WORKOUTS', value: `${todayWorkouts.length}`, y: 195 },
        { label: 'STREAK', value: `${streak} days`, y: 195 },
        { label: 'CALORIES', value: `${totalCal}`, y: 305 },
        { label: 'WEIGHT', value: currentWeight, y: 305 }
    ];

    // Draw stat boxes
    const boxW = 230, boxH = 80, gap = 20;
    const startX = (w - boxW * 2 - gap) / 2;
    stats.forEach((stat, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = startX + col * (boxW + gap);
        const y = stat.y;
        ctx.fillStyle = '#141414';
        ctx.beginPath();
        ctx.roundRect(x, y, boxW, boxH, 12);
        ctx.fill();
        ctx.strokeStyle = '#2a2a2a';
        ctx.stroke();
        ctx.fillStyle = '#666';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(stat.label, x + boxW / 2, y + 28);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillText(stat.value, x + boxW / 2, y + 60);
    });

    // Today's exercises
    let yPos = 410;
    if (todayWorkouts.length > 0) {
        ctx.fillStyle = '#888';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("TODAY'S TRAINING", w / 2, yPos);
        yPos += 20;
        ctx.textAlign = 'left';
        ctx.font = '15px Inter, sans-serif';
        todayWorkouts.slice(0, 6).forEach(wo => {
            const best = wo.sets.reduce((b, s) => s.weight > b.weight ? s : b, wo.sets[0]);
            ctx.fillStyle = '#ccc';
            ctx.fillText(`${wo.name}`, 80, yPos);
            ctx.fillStyle = '#666';
            ctx.textAlign = 'right';
            ctx.fillText(`${lbsToDisplay(best.weight)}${wu()} x ${best.reps}`, w - 80, yPos);
            ctx.textAlign = 'left';
            yPos += 28;
        });
    }

    // Verse
    const verse = getDailyVerse();
    yPos = Math.max(yPos + 30, 620);
    ctx.strokeStyle = '#333';
    ctx.beginPath(); ctx.moveTo(60, yPos - 15); ctx.lineTo(w - 60, yPos - 15); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font = 'italic 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    // Word wrap the verse
    const verseText = getTranslatedVerse(verse.ref, verse.text);
    const words = verseText.split(' ');
    let line = '';
    const lines = [];
    words.forEach(word => {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > w - 120) { lines.push(line.trim()); line = word + ' '; }
        else line = test;
    });
    if (line.trim()) lines.push(line.trim());
    lines.forEach((l, i) => {
        ctx.fillText(`"${i === 0 ? '' : ''}${l}${i === lines.length - 1 ? '"' : ''}`, w / 2, yPos + i * 22);
    });
    yPos += lines.length * 22 + 10;
    ctx.fillStyle = '#555';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(`— ${verse.ref}`, w / 2, yPos);

    // Footer
    ctx.fillStyle = '#444';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('ironfa.it', w / 2, h - 40);
}

function openShareModal() {
    generateProgressCard();
    document.getElementById('share-modal').classList.remove('hidden');
}

function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
}

function shareCardImage() {
    const canvas = document.getElementById('progress-card-canvas');
    canvas.toBlob(blob => {
        if (navigator.share && navigator.canShare) {
            const file = new File([blob], 'iron-faith-progress.png', { type: 'image/png' });
            const shareData = { files: [file], title: 'My Iron Faith Progress' };
            if (navigator.canShare(shareData)) {
                navigator.share(shareData).catch(() => {});
                return;
            }
        }
        downloadCard();
    }, 'image/png');
}

function downloadCard() {
    const canvas = document.getElementById('progress-card-canvas');
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `iron-faith-${today()}.png`;
    a.click();
    showToast('Progress card downloaded!');
}

// =============================================
// FEATURE: 30-Day Faith + Fitness Challenges
// =============================================

// Each challenge has 30 days. Each day is either a workout session or a rest/active-recovery day.
// Workouts follow a real training split with progressive volume across the 4 weeks.
// Day format: { focus: 'Label', exercises: [...] } or { focus: 'Rest', rest: true }

const CHALLENGE_DAYS = {
    // ─── IRON FOUNDATIONS: Beginner bodyweight, 4 days on / 1 rest / 2 on / 1 rest ───
    foundations: [
        // WEEK 1 — Learn the movements, low volume
        { focus: 'Full Body A', exercises: [
            { name: 'Push-ups (Knees OK)', sets: 2, reps: 8, note: 'Chest to floor, push through palms' },
            { name: 'Bodyweight Squat', sets: 2, reps: 12, note: 'Sit back, knees track toes' },
            { name: 'Plank', sets: 2, reps: '20s', note: 'Tight core, flat back' },
            { name: 'Glute Bridge', sets: 2, reps: 12, note: 'Squeeze glutes at top 2 sec' },
        ]},
        { focus: 'Cardio + Core', exercises: [
            { name: 'Jumping Jacks', sets: 3, reps: 30, note: 'Light and rhythmic' },
            { name: 'Mountain Climbers', sets: 2, reps: 16, note: 'Controlled pace' },
            { name: 'Dead Bug', sets: 2, reps: '8/side', note: 'Press lower back into floor' },
            { name: 'Bird Dog', sets: 2, reps: '8/side', note: 'Extend opposite arm and leg' },
        ]},
        { focus: 'Full Body B', exercises: [
            { name: 'Incline Push-ups (Counter)', sets: 2, reps: 10, note: 'Hands on counter or bench' },
            { name: 'Reverse Lunges', sets: 2, reps: '8/leg', note: 'Step back, front knee 90 degrees' },
            { name: 'Superman Hold', sets: 2, reps: '15s', note: 'Squeeze glutes and upper back' },
            { name: 'Wall Sit', sets: 2, reps: '20s', note: 'Thighs parallel to floor' },
        ]},
        { focus: 'Rest & Reflect', rest: true },
        { focus: 'Upper Body Focus', exercises: [
            { name: 'Push-ups', sets: 3, reps: 8, note: 'Full range of motion' },
            { name: 'Doorway Rows (Towel)', sets: 2, reps: 10, note: 'Lean back, pull chest to hands' },
            { name: 'Pike Push-ups', sets: 2, reps: 6, note: 'Hips high, head toward floor' },
            { name: 'Plank Shoulder Taps', sets: 2, reps: '8/side', note: 'Keep hips square' },
        ]},
        { focus: 'Lower Body Focus', exercises: [
            { name: 'Bodyweight Squat', sets: 3, reps: 15, note: 'Controlled 3-sec descent' },
            { name: 'Glute Bridge', sets: 3, reps: 15, note: 'Pause at top' },
            { name: 'Step-ups (Stair/Chair)', sets: 2, reps: '10/leg', note: 'Drive through the heel' },
            { name: 'Calf Raises', sets: 2, reps: 20, note: 'Slow up, slow down' },
        ]},
        { focus: 'Rest & Reflect', rest: true },
        // WEEK 2 — Add volume
        { focus: 'Full Body A', exercises: [
            { name: 'Push-ups', sets: 3, reps: 10, note: 'Add 2 reps from week 1' },
            { name: 'Bodyweight Squat', sets: 3, reps: 15, note: 'Deeper this week' },
            { name: 'Plank', sets: 3, reps: '30s', note: '10 sec more than week 1' },
            { name: 'Glute Bridge', sets: 3, reps: 15, note: 'Single-leg if too easy' },
        ]},
        { focus: 'Cardio + Core', exercises: [
            { name: 'Burpees', sets: 3, reps: 6, note: 'Full extension at top' },
            { name: 'High Knees', sets: 3, reps: 30, note: '15 per leg' },
            { name: 'Bicycle Crunches', sets: 3, reps: 20, note: 'Elbow to opposite knee' },
            { name: 'Plank', sets: 2, reps: '30s', note: 'Tight everything' },
        ]},
        { focus: 'Full Body B', exercises: [
            { name: 'Diamond Push-ups', sets: 2, reps: 6, note: 'Hands close together' },
            { name: 'Bulgarian Split Squat', sets: 2, reps: '8/leg', note: 'Rear foot on chair' },
            { name: 'Superman Raises', sets: 3, reps: 10, note: 'Lift and lower with control' },
            { name: 'Reverse Lunges', sets: 3, reps: '10/leg', note: 'Longer step for more glute' },
        ]},
        { focus: 'Rest & Reflect', rest: true },
        { focus: 'Push Day', exercises: [
            { name: 'Push-ups', sets: 3, reps: 12, note: 'Chest to floor every rep' },
            { name: 'Pike Push-ups', sets: 3, reps: 8, note: 'Shoulders burning = working' },
            { name: 'Tricep Dips (Chair)', sets: 3, reps: 10, note: 'Elbows back, not flared' },
            { name: 'Plank to Push-up', sets: 2, reps: 8, note: 'Forearm to hand position' },
        ]},
        { focus: 'Leg Day', exercises: [
            { name: 'Jump Squats', sets: 3, reps: 10, note: 'Land soft, explode up' },
            { name: 'Walking Lunges', sets: 3, reps: '10/leg', note: 'Long stride' },
            { name: 'Single-Leg Glute Bridge', sets: 3, reps: '8/leg', note: 'Level hips' },
            { name: 'Wall Sit', sets: 3, reps: '30s', note: 'Challenge: 40s if you can' },
        ]},
        { focus: 'Rest & Reflect', rest: true },
        // WEEK 3 — Intensity increases
        { focus: 'Full Body Strength', exercises: [
            { name: 'Push-ups', sets: 3, reps: 15, note: 'Can you hit all 15 unbroken?' },
            { name: 'Bodyweight Squat', sets: 3, reps: 20, note: '3-sec pause at bottom' },
            { name: 'Plank', sets: 3, reps: '40s', note: 'Breathe steadily' },
            { name: 'Reverse Lunges', sets: 3, reps: '12/leg', note: 'Add a jump if ready' },
        ]},
        { focus: 'HIIT Circuit', exercises: [
            { name: 'Burpees', sets: 4, reps: 8, note: '30 sec rest between sets' },
            { name: 'Mountain Climbers', sets: 4, reps: 24, note: 'Fast pace' },
            { name: 'Squat Jumps', sets: 4, reps: 10, note: 'Full depth before jump' },
            { name: 'Plank', sets: 2, reps: '45s', note: 'Finisher — hold strong' },
        ]},
        { focus: 'Upper Body Push + Pull', exercises: [
            { name: 'Push-ups (Slow Negative)', sets: 3, reps: 8, note: '4 sec down, explode up' },
            { name: 'Doorway Rows', sets: 3, reps: 12, note: 'Squeeze for 2 sec at top' },
            { name: 'Pike Push-ups', sets: 3, reps: 10, note: 'Aim for forehead to floor' },
            { name: 'Plank Shoulder Taps', sets: 3, reps: '12/side', note: 'Slow and controlled' },
        ]},
        { focus: 'Rest & Reflect', rest: true },
        { focus: 'Lower Body Power', exercises: [
            { name: 'Jump Squats', sets: 4, reps: 10, note: 'Max height each rep' },
            { name: 'Bulgarian Split Squat', sets: 3, reps: '10/leg', note: 'Go deeper than last time' },
            { name: 'Glute Bridge March', sets: 3, reps: '10/leg', note: 'Hold bridge, alternate legs' },
            { name: 'Calf Raises', sets: 3, reps: 25, note: 'Pause at peak contraction' },
        ]},
        { focus: 'Full Body Circuit', exercises: [
            { name: 'Push-ups', sets: 3, reps: 12, note: 'No rest between exercises' },
            { name: 'Bodyweight Squat', sets: 3, reps: 15, note: 'Circuit: do all 4 back-to-back' },
            { name: 'Mountain Climbers', sets: 3, reps: 20, note: 'Then rest 60 sec, repeat' },
            { name: 'Plank', sets: 3, reps: '30s', note: '3 rounds total' },
        ]},
        { focus: 'Rest & Reflect', rest: true },
        // WEEK 4 — Peak and test
        { focus: 'Max Effort Push', exercises: [
            { name: 'Push-ups (Max Reps)', sets: 3, reps: 'Max', note: 'Go until form breaks, rest 90 sec' },
            { name: 'Diamond Push-ups', sets: 3, reps: 10, note: 'Triceps are on fire' },
            { name: 'Pike Push-ups', sets: 3, reps: 10, note: 'Shoulders should be screaming' },
            { name: 'Plank', sets: 3, reps: '45s', note: 'Mental toughness set' },
        ]},
        { focus: 'Max Effort Legs', exercises: [
            { name: 'Bodyweight Squat (Max Reps)', sets: 2, reps: 'Max', note: 'How many can you do? Write it down' },
            { name: 'Walking Lunges', sets: 3, reps: '12/leg', note: 'Longest stride possible' },
            { name: 'Jump Squats', sets: 3, reps: 12, note: 'Power output' },
            { name: 'Wall Sit', sets: 2, reps: '45s', note: 'Fight through the burn' },
        ]},
        { focus: 'Core & Conditioning', exercises: [
            { name: 'Mountain Climbers', sets: 4, reps: 20, note: 'Fast, explosive' },
            { name: 'Bicycle Crunches', sets: 3, reps: 20, note: 'Slow and controlled' },
            { name: 'Plank', sets: 3, reps: '45s', note: 'Tight core entire time' },
            { name: 'Glute Bridge March', sets: 3, reps: '10/leg', note: 'Hold bridge, alternate' },
        ]},
        { focus: 'Upper Body Blast', exercises: [
            { name: 'Push-ups', sets: 4, reps: 15, note: 'Every rep clean' },
            { name: 'Diamond Push-ups', sets: 3, reps: 10, note: 'Tricep burnout' },
            { name: 'Pike Push-ups', sets: 3, reps: 10, note: 'Shoulders on fire' },
            { name: 'Doorway Rows', sets: 3, reps: 12, note: 'Pull hard, squeeze' },
        ]},
        { focus: 'Lower Body Blast', exercises: [
            { name: 'Jump Squats', sets: 4, reps: 12, note: 'Max height' },
            { name: 'Bulgarian Split Squat', sets: 3, reps: '10/leg', note: 'Deep, controlled' },
            { name: 'Wall Sit', sets: 3, reps: '45s', note: 'Mental toughness' },
            { name: 'Calf Raises', sets: 3, reps: 25, note: 'Burn through it' },
        ]},
        { focus: 'Rest & Reflect', rest: true },
        { focus: 'Full Body Blitz', exercises: [
            { name: 'Burpees', sets: 4, reps: 10, note: 'Every rep with full extension' },
            { name: 'Push-ups', sets: 4, reps: 15, note: 'Chest to floor' },
            { name: 'Bodyweight Squat', sets: 4, reps: 20, note: 'Deep and controlled' },
            { name: 'Plank', sets: 3, reps: '60s', note: 'You can do this. Believe it.' },
        ]},
        { focus: 'The Final Test', exercises: [
            { name: 'Push-ups (Max Reps)', sets: 1, reps: 'Max', note: 'Compare to day 1 — how far have you come?' },
            { name: 'Bodyweight Squat (Max Reps)', sets: 1, reps: 'Max', note: 'Count every single one' },
            { name: 'Plank (Max Hold)', sets: 1, reps: 'Max', note: 'Time yourself. Beat your best.' },
            { name: 'Burpees', sets: 1, reps: 'Max in 2 min', note: 'Leave everything on the floor. You did it.' },
        ]},
        { focus: 'Victory Lap', exercises: [
            { name: 'Your Favorite Exercise', sets: 3, reps: 'Your Choice', note: 'Pick whatever you love most and enjoy it' },
            { name: 'Stretching', sets: 1, reps: '10 min', note: 'Full body. You earned this. Reflect on 30 days of growth' },
        ]},
    ],

    // ─── WARRIOR'S PATH: Intermediate PPL, gym required ───
    warrior: [
        // WEEK 1 — Moderate volume, establish working weights
        { focus: 'Push (Chest/Shoulders/Triceps)', exercises: [
            { name: 'Bench Press', sets: 4, reps: 8, note: 'Find a challenging but clean 8-rep weight' },
            { name: 'Overhead Press', sets: 3, reps: 10, note: 'Brace core, no leg drive' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: 10, note: 'Full stretch at bottom' },
            { name: 'Lateral Raises', sets: 3, reps: 15, note: 'Light weight, control the arc' },
            { name: 'Tricep Pushdown', sets: 3, reps: 12, note: 'Squeeze at full extension' },
        ]},
        { focus: 'Pull (Back/Biceps)', exercises: [
            { name: 'Barbell Row', sets: 4, reps: 8, note: 'Pull to lower chest, squeeze shoulder blades' },
            { name: 'Lat Pulldown', sets: 3, reps: 10, note: 'Pull to upper chest, lean back slightly' },
            { name: 'Seated Cable Row', sets: 3, reps: 10, note: 'Pull elbows back, chest up' },
            { name: 'Face Pulls', sets: 3, reps: 15, note: 'High pull, externally rotate' },
            { name: 'Bicep Curls', sets: 3, reps: 12, note: 'No swinging' },
        ]},
        { focus: 'Legs (Quad/Ham/Glute)', exercises: [
            { name: 'Squat', sets: 4, reps: 8, note: 'Below parallel, brace hard' },
            { name: 'Romanian Deadlift', sets: 3, reps: 10, note: 'Feel the hamstring stretch' },
            { name: 'Leg Press', sets: 3, reps: 12, note: 'Full depth, controlled' },
            { name: 'Walking Lunges', sets: 3, reps: '10/leg', note: 'Long stride, upright torso' },
            { name: 'Calf Raises', sets: 4, reps: 15, note: 'Full ROM, pause at top' },
        ]},
        { focus: 'Rest & Recover', rest: true },
        { focus: 'Push (Volume)', exercises: [
            { name: 'Dumbbell Bench Press', sets: 4, reps: 10, note: 'Full stretch at bottom' },
            { name: 'Arnold Press', sets: 3, reps: 10, note: 'Rotate through the press' },
            { name: 'Cable Fly', sets: 3, reps: 12, note: 'Squeeze chest at center' },
            { name: 'Overhead Tricep Extension', sets: 3, reps: 12, note: 'Deep stretch, full lockout' },
        ]},
        { focus: 'Pull (Volume)', exercises: [
            { name: 'Pull-ups', sets: 4, reps: 6, note: 'Dead hang to chin over bar. Assisted OK' },
            { name: 'Dumbbell Row', sets: 3, reps: '10/arm', note: 'Row to hip, squeeze lat' },
            { name: 'Straight Arm Pulldown', sets: 3, reps: 12, note: 'Feel the lats stretch and contract' },
            { name: 'Hammer Curls', sets: 3, reps: 12, note: 'Neutral grip, controlled' },
        ]},
        { focus: 'Rest & Recover', rest: true },
        // WEEK 2 — Add weight or reps to compound lifts
        { focus: 'Push (Strength)', exercises: [
            { name: 'Bench Press', sets: 4, reps: 6, note: 'Heavier than week 1. RPE 7-8' },
            { name: 'Overhead Press', sets: 4, reps: 8, note: 'Add 5 lbs from last week' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: 10, note: 'Go heavier if reps felt easy' },
            { name: 'Lateral Raises', sets: 4, reps: 15, note: 'Extra set this week' },
            { name: 'Skull Crushers', sets: 3, reps: 10, note: 'Elbows in, deep stretch' },
        ]},
        { focus: 'Pull (Strength)', exercises: [
            { name: 'Deadlift', sets: 4, reps: 5, note: 'Hinge at hips, flat back, lock out' },
            { name: 'Barbell Row', sets: 4, reps: 8, note: 'Match or beat last week' },
            { name: 'Lat Pulldown', sets: 3, reps: 10, note: 'Slow negative (3 sec)' },
            { name: 'Face Pulls', sets: 3, reps: 15, note: 'Keep these light — it is prehab' },
            { name: 'EZ Bar Curl', sets: 3, reps: 10, note: 'Strict form, full ROM' },
        ]},
        { focus: 'Legs (Strength)', exercises: [
            { name: 'Squat', sets: 4, reps: 6, note: 'Heavier than week 1' },
            { name: 'Romanian Deadlift', sets: 4, reps: 8, note: 'Add weight, keep hamstring tension' },
            { name: 'Bulgarian Split Squat', sets: 3, reps: '8/leg', note: 'Dumbbells in hands' },
            { name: 'Leg Curl', sets: 3, reps: 12, note: 'Squeeze at contraction' },
            { name: 'Calf Raises', sets: 4, reps: 15, note: 'Heavier this week' },
        ]},
        { focus: 'Rest & Recover', rest: true },
        { focus: 'Push (Hypertrophy)', exercises: [
            { name: 'Dumbbell Bench Press', sets: 4, reps: 12, note: 'Higher reps, mind-muscle connection' },
            { name: 'Seated Dumbbell Press', sets: 3, reps: 12, note: 'No momentum' },
            { name: 'Pec Deck', sets: 3, reps: 15, note: 'Squeeze hard at center' },
            { name: 'Lateral Raises', sets: 3, reps: 15, note: 'Drop set on final set' },
            { name: 'Tricep Pushdown', sets: 3, reps: 15, note: 'Burn it out' },
        ]},
        { focus: 'Pull (Hypertrophy)', exercises: [
            { name: 'Chin-ups', sets: 4, reps: 6, note: 'Underhand grip, feel the biceps too' },
            { name: 'T-Bar Row', sets: 3, reps: 10, note: 'Pull to sternum' },
            { name: 'Seated Cable Row', sets: 3, reps: 12, note: 'Pause at contraction' },
            { name: 'Rear Delt Fly', sets: 3, reps: 15, note: 'Light, lots of squeeze' },
            { name: 'Preacher Curls', sets: 3, reps: 12, note: 'Full stretch at bottom' },
        ]},
        { focus: 'Rest & Recover', rest: true },
        // WEEK 3 — Peak volume
        { focus: 'Push (Heavy)', exercises: [
            { name: 'Bench Press', sets: 5, reps: 5, note: 'Heaviest bench yet. Own the weight' },
            { name: 'Overhead Press', sets: 4, reps: 6, note: 'Strict. Fight for each rep' },
            { name: 'Incline Dumbbell Press', sets: 4, reps: 10, note: 'Heavier dumbbells' },
            { name: 'Cable Lateral Raise', sets: 4, reps: 12, note: 'Constant tension' },
            { name: 'Close Grip Bench Press', sets: 3, reps: 8, note: 'Tricep destroyer' },
        ]},
        { focus: 'Pull (Heavy)', exercises: [
            { name: 'Deadlift', sets: 5, reps: 3, note: 'Heavy triples. Focus on each rep' },
            { name: 'Barbell Row', sets: 4, reps: 6, note: 'Heaviest rows yet' },
            { name: 'Pull-ups', sets: 4, reps: 'Max', note: 'Go to near failure each set' },
            { name: 'Face Pulls', sets: 3, reps: 15, note: 'Always keep these in' },
            { name: 'Barbell Curl', sets: 3, reps: 10, note: 'Controlled cheat on last 2 reps is ok' },
        ]},
        { focus: 'Legs (Heavy)', exercises: [
            { name: 'Squat', sets: 5, reps: 5, note: 'Heaviest squats yet. Brace like your life depends on it' },
            { name: 'Romanian Deadlift', sets: 4, reps: 8, note: 'Hamstrings should be screaming' },
            { name: 'Leg Press', sets: 4, reps: 12, note: 'Deep. Full ROM. No half reps' },
            { name: 'Leg Extension', sets: 3, reps: 15, note: 'Squeeze at top, 2-sec hold' },
            { name: 'Seated Calf Raise', sets: 4, reps: 20, note: 'Burn through it' },
        ]},
        { focus: 'Rest & Recover', rest: true },
        { focus: 'Push (Pump)', exercises: [
            { name: 'Machine Chest Press', sets: 4, reps: 12, note: 'Slow and smooth' },
            { name: 'Arnold Press', sets: 3, reps: 12, note: 'Feel the rotation' },
            { name: 'Cable Fly', sets: 4, reps: 15, note: 'Squeeze every single rep' },
            { name: 'Tricep Dips', sets: 3, reps: 'Max', note: 'Bodyweight to failure' },
        ]},
        { focus: 'Pull (Pump)', exercises: [
            { name: 'Lat Pulldown (Wide)', sets: 4, reps: 12, note: 'Pull wide to upper chest' },
            { name: 'Dumbbell Row', sets: 4, reps: '12/arm', note: 'Higher reps, feel the squeeze' },
            { name: 'Cable Curl', sets: 3, reps: 15, note: 'Constant tension' },
            { name: 'Rear Delt Fly', sets: 3, reps: 15, note: 'Light and controlled' },
        ]},
        { focus: 'Rest & Recover', rest: true },
        // WEEK 4 — Deload & Test
        { focus: 'Push (Deload)', exercises: [
            { name: 'Bench Press', sets: 3, reps: 8, note: 'Lighter — 70% of your best. Recover' },
            { name: 'Overhead Press', sets: 3, reps: 8, note: 'Easy weight, perfect reps' },
            { name: 'Lateral Raises', sets: 3, reps: 12, note: 'Light. Moving blood' },
            { name: 'Tricep Pushdown', sets: 3, reps: 12, note: 'Easy. Stay fresh' },
        ]},
        { focus: 'Pull (Deload)', exercises: [
            { name: 'Barbell Row', sets: 3, reps: 8, note: '70% effort. Perfect form reps' },
            { name: 'Lat Pulldown', sets: 3, reps: 10, note: 'Light and smooth' },
            { name: 'Face Pulls', sets: 3, reps: 15, note: 'Prehab, keep the shoulders healthy' },
            { name: 'Bicep Curls', sets: 3, reps: 12, note: 'Just moving weight, not grinding' },
        ]},
        { focus: 'Legs (Deload)', exercises: [
            { name: 'Squat', sets: 3, reps: 8, note: '70% of your heavy. Crisp reps' },
            { name: 'Romanian Deadlift', sets: 3, reps: 10, note: 'Light, feel the stretch' },
            { name: 'Walking Lunges', sets: 2, reps: '8/leg', note: 'Bodyweight only, easy' },
            { name: 'Calf Raises', sets: 3, reps: 15, note: 'Light and easy' },
        ]},
        { focus: 'Weak Point Day', exercises: [
            { name: 'Incline Dumbbell Press', sets: 3, reps: 10, note: 'Address any lagging push muscles' },
            { name: 'Dumbbell Row', sets: 3, reps: '10/arm', note: 'Unilateral work for balance' },
            { name: 'Leg Curl', sets: 3, reps: 12, note: 'Hamstrings often underdeveloped' },
            { name: 'Lateral Raises', sets: 3, reps: 15, note: 'Cap those delts' },
        ]},
        { focus: 'Active Recovery', exercises: [
            { name: 'Walking or Light Jog', sets: 1, reps: '20 min', note: 'Get blood flowing, nothing intense' },
            { name: 'Foam Rolling', sets: 1, reps: '10 min', note: 'Hit quads, hamstrings, back, lats' },
            { name: 'Stretching', sets: 1, reps: '10 min', note: 'Hip flexors, chest, shoulders, hamstrings' },
        ]},
        { focus: 'Rest Before Test Day', rest: true },
        { focus: 'Mental Prep Day', exercises: [
            { name: 'Squat (Openers)', sets: 3, reps: 3, note: 'Light — practice your walkout and setup' },
            { name: 'Bench Press (Openers)', sets: 3, reps: 3, note: 'Light — rehearse your cues' },
            { name: 'Deadlift (Openers)', sets: 3, reps: 2, note: 'Light — dial in your starting position' },
        ]},
        { focus: 'TEST DAY: Big 3', exercises: [
            { name: 'Squat (Work to heavy single)', sets: 6, reps: '5/3/1/1/1/1', note: 'Warm up, then find your max' },
            { name: 'Bench Press (Work to heavy single)', sets: 6, reps: '5/3/1/1/1/1', note: 'Same — find your 1RM' },
            { name: 'Deadlift (Work to heavy single)', sets: 5, reps: '5/3/1/1/1', note: 'One big pull. Leave it all out there' },
        ]},
        { focus: 'Victory Day', exercises: [
            { name: 'Light Full Body Circuit', sets: 3, reps: '10 each', note: 'Push-ups, rows, squats, lunges — celebrate what your body can do' },
            { name: 'Stretching & Foam Roll', sets: 1, reps: '15 min', note: '30 days done. You are stronger than when you started. That is a fact.' },
        ]},
    ],

    // ─── TEMPLE BUILDER: Advanced, 5/3/1 inspired, 5-day split ───
    temple: [
        // WEEK 1 — 5s week
        { focus: 'Squat + Accessories', exercises: [
            { name: 'Squat', sets: 3, reps: '5/5/5+', note: '65%/75%/85% of 1RM. Last set AMRAP' },
            { name: 'Front Squat', sets: 3, reps: 8, note: '60% of back squat, stay upright' },
            { name: 'Leg Curl', sets: 4, reps: 10, note: 'Squeeze hamstrings at contraction' },
            { name: 'Bulgarian Split Squat', sets: 3, reps: '10/leg', note: 'Dumbbells, deep stretch' },
            { name: 'Hanging Leg Raise', sets: 3, reps: 12, note: 'Core stability' },
        ]},
        { focus: 'Bench + Accessories', exercises: [
            { name: 'Bench Press', sets: 3, reps: '5/5/5+', note: '65%/75%/85% of 1RM. Last set AMRAP' },
            { name: 'Incline Dumbbell Press', sets: 4, reps: 10, note: 'Full stretch at bottom' },
            { name: 'Dumbbell Fly', sets: 3, reps: 12, note: 'Slight bend in elbows, squeeze' },
            { name: 'Tricep Pushdown', sets: 3, reps: 15, note: 'Pump work' },
            { name: 'Face Pulls', sets: 3, reps: 15, note: 'Shoulder health' },
        ]},
        { focus: 'Rest', rest: true },
        { focus: 'Deadlift + Back', exercises: [
            { name: 'Deadlift', sets: 3, reps: '5/5/5+', note: '65%/75%/85% of 1RM. Last set AMRAP' },
            { name: 'Barbell Row', sets: 4, reps: 8, note: 'Heavy, pull to lower chest' },
            { name: 'Pull-ups', sets: 4, reps: 'Max', note: 'Add weight if 10+ is easy' },
            { name: 'Seated Cable Row', sets: 3, reps: 12, note: 'Squeeze for 2 sec' },
            { name: 'Bicep Curls', sets: 3, reps: 12, note: 'Strict curls, no swing' },
        ]},
        { focus: 'OHP + Shoulders', exercises: [
            { name: 'Overhead Press', sets: 3, reps: '5/5/5+', note: '65%/75%/85% of 1RM. Last set AMRAP' },
            { name: 'Seated Dumbbell Press', sets: 3, reps: 10, note: 'Controlled press, no bounce' },
            { name: 'Lateral Raises', sets: 4, reps: 15, note: 'Light. High volume.' },
            { name: 'Rear Delt Fly', sets: 3, reps: 15, note: 'Rear delts need love' },
            { name: 'Shrugs', sets: 3, reps: 12, note: 'Heavy, hold at top' },
        ]},
        { focus: 'Legs (Volume)', exercises: [
            { name: 'Leg Press', sets: 4, reps: 15, note: 'Deep, 3-sec negatives' },
            { name: 'Romanian Deadlift', sets: 4, reps: 10, note: 'Feel the hamstring stretch' },
            { name: 'Walking Lunges', sets: 3, reps: '12/leg', note: 'Dumbbells, long stride' },
            { name: 'Leg Extension', sets: 3, reps: 15, note: 'Hold peak contraction 2 sec' },
            { name: 'Seated Calf Raise', sets: 4, reps: 20, note: 'Full stretch, full contraction' },
        ]},
        { focus: 'Rest', rest: true },
        // WEEK 2 — 3s week
        { focus: 'Squat (3s Week)', exercises: [
            { name: 'Squat', sets: 3, reps: '3/3/3+', note: '70%/80%/90% of 1RM. Last set AMRAP' },
            { name: 'Pause Squat', sets: 3, reps: 5, note: '3-sec pause at bottom, 65%' },
            { name: 'Leg Press', sets: 3, reps: 12, note: 'Moderate weight, control' },
            { name: 'Leg Curl', sets: 3, reps: 12, note: 'Superset with extensions' },
            { name: 'Leg Extension', sets: 3, reps: 12, note: 'Superset with curls' },
        ]},
        { focus: 'Bench (3s Week)', exercises: [
            { name: 'Bench Press', sets: 3, reps: '3/3/3+', note: '70%/80%/90% of 1RM. Last set AMRAP' },
            { name: 'Close Grip Bench Press', sets: 3, reps: 8, note: 'Tricep focus' },
            { name: 'Incline Bench Press', sets: 3, reps: 8, note: 'Upper chest emphasis' },
            { name: 'Cable Fly', sets: 3, reps: 15, note: 'Blood flow, feel the stretch' },
            { name: 'Skull Crushers', sets: 3, reps: 10, note: 'Deep stretch, full lockout' },
        ]},
        { focus: 'Rest', rest: true },
        { focus: 'Deadlift (3s Week)', exercises: [
            { name: 'Deadlift', sets: 3, reps: '3/3/3+', note: '70%/80%/90% of 1RM. Last set AMRAP' },
            { name: 'Deficit Deadlift or Rack Pull', sets: 3, reps: 5, note: 'Weak point work — pick your weakness' },
            { name: 'Pendlay Row', sets: 4, reps: 6, note: 'Explosive off the floor, controlled down' },
            { name: 'Weighted Pull-ups', sets: 4, reps: 5, note: 'Add weight belt or dumbbell' },
            { name: 'Hammer Curls', sets: 3, reps: 12, note: 'Brachialis and forearm work' },
        ]},
        { focus: 'OHP (3s Week)', exercises: [
            { name: 'Overhead Press', sets: 3, reps: '3/3/3+', note: '70%/80%/90% of 1RM. Last set AMRAP' },
            { name: 'Push Press', sets: 3, reps: 5, note: 'Leg drive to get heavier weight overhead' },
            { name: 'Arnold Press', sets: 3, reps: 10, note: 'Full rotation' },
            { name: 'Cable Lateral Raise', sets: 4, reps: 12, note: 'Constant tension' },
            { name: 'Face Pulls', sets: 3, reps: 15, note: 'Always. Every week.' },
        ]},
        { focus: 'Legs (Power)', exercises: [
            { name: 'Box Jumps', sets: 4, reps: 5, note: 'Explosive. Step down, don\'t jump down' },
            { name: 'Hip Thrust', sets: 4, reps: 8, note: 'Heavy, 2-sec squeeze at top' },
            { name: 'Goblet Squat', sets: 3, reps: 15, note: 'Light, deep, blood flow' },
            { name: 'Reverse Lunges', sets: 3, reps: '10/leg', note: 'Dumbbells, step back far' },
            { name: 'Calf Raises', sets: 4, reps: 15, note: 'Standing, heavy' },
        ]},
        { focus: 'Rest', rest: true },
        // WEEK 3 — 5/3/1 week
        { focus: 'Squat (1s Week)', exercises: [
            { name: 'Squat', sets: 3, reps: '5/3/1+', note: '75%/85%/95% of 1RM. Last set all-out' },
            { name: 'Front Squat', sets: 3, reps: 5, note: 'Moderate, quality reps' },
            { name: 'Good Mornings', sets: 3, reps: 10, note: 'Posterior chain, light' },
            { name: 'Ab Wheel Rollout', sets: 3, reps: 10, note: 'Full extension if possible' },
        ]},
        { focus: 'Bench (1s Week)', exercises: [
            { name: 'Bench Press', sets: 3, reps: '5/3/1+', note: '75%/85%/95% of 1RM. Last set all-out' },
            { name: 'Dumbbell Bench Press', sets: 3, reps: 8, note: 'Heavy dumbbells' },
            { name: 'Dips', sets: 3, reps: 'Max', note: 'Weighted if 15+ is easy' },
            { name: 'Overhead Tricep Extension', sets: 3, reps: 12, note: 'Big stretch' },
        ]},
        { focus: 'Rest', rest: true },
        { focus: 'Deadlift (1s Week)', exercises: [
            { name: 'Deadlift', sets: 3, reps: '5/3/1+', note: '75%/85%/95% of 1RM. This is it. Go heavy' },
            { name: 'Barbell Row', sets: 4, reps: 6, note: 'Match the intensity' },
            { name: 'Chin-ups', sets: 4, reps: 'Max', note: 'Underhand, feel biceps' },
            { name: 'Cable Curl', sets: 3, reps: 12, note: 'Finish strong' },
        ]},
        { focus: 'OHP (1s Week)', exercises: [
            { name: 'Overhead Press', sets: 3, reps: '5/3/1+', note: '75%/85%/95% of 1RM. Everything you\'ve got' },
            { name: 'Seated Dumbbell Press', sets: 3, reps: 8, note: 'Shoulders should be lit up' },
            { name: 'Lateral Raises', sets: 5, reps: 12, note: 'High volume finisher' },
            { name: 'Barbell Shrugs', sets: 4, reps: 10, note: 'Heavy, hold at top' },
        ]},
        { focus: 'Legs (Endurance)', exercises: [
            { name: 'Squat', sets: 2, reps: 20, note: '20-rep squat widow-maker. Pick a weight and don\'t rack it' },
            { name: 'Walking Lunges', sets: 3, reps: '15/leg', note: 'Dumbbell, long strides' },
            { name: 'Leg Curl', sets: 4, reps: 12, note: 'Superset with extensions' },
            { name: 'Leg Extension', sets: 4, reps: 12, note: 'Feel the burn' },
        ]},
        { focus: 'Rest', rest: true },
        // WEEK 4 — Deload & Test
        { focus: 'Deload: Upper', exercises: [
            { name: 'Bench Press', sets: 3, reps: 5, note: '60% of 1RM. Easy, crisp reps' },
            { name: 'Overhead Press', sets: 3, reps: 5, note: '60% of 1RM. Moving blood' },
            { name: 'Pull-ups', sets: 3, reps: 8, note: 'Bodyweight only, smooth' },
            { name: 'Face Pulls', sets: 3, reps: 15, note: 'Light prehab' },
        ]},
        { focus: 'Deload: Lower', exercises: [
            { name: 'Squat', sets: 3, reps: 5, note: '60% of 1RM. Stay sharp, don\'t grind' },
            { name: 'Romanian Deadlift', sets: 3, reps: 8, note: 'Light, stretch the hams' },
            { name: 'Walking Lunges', sets: 2, reps: '8/leg', note: 'Bodyweight, easy' },
            { name: 'Calf Raises', sets: 3, reps: 15, note: 'Easy finish' },
        ]},
        { focus: 'Deload: Accessories', exercises: [
            { name: 'Incline Dumbbell Press', sets: 3, reps: 8, note: 'Light, pump work' },
            { name: 'Lat Pulldown', sets: 3, reps: 10, note: 'Easy, feel the lats' },
            { name: 'Lateral Raises', sets: 3, reps: 12, note: 'Light. Blood flow' },
            { name: 'Bicep Curls', sets: 3, reps: 12, note: 'Easy curls, stay loose' },
        ]},
        { focus: 'Rest', rest: true },
        { focus: 'Opener Practice', exercises: [
            { name: 'Squat (Opener Weight)', sets: 3, reps: 2, note: 'Your planned first attempt — practice the walkout' },
            { name: 'Bench Press (Opener Weight)', sets: 3, reps: 2, note: 'Smooth. Dial in your setup' },
            { name: 'Deadlift (Opener Weight)', sets: 2, reps: 1, note: 'One clean rep. Visualize test day' },
        ]},
        { focus: 'Rest Before Test', rest: true },
        { focus: 'TEST: Squat + Bench', exercises: [
            { name: 'Squat (Work to 1RM)', sets: 7, reps: '5/3/1/1/1/1/1', note: 'Build up. Hit a new max. Earn it' },
            { name: 'Bench Press (Work to 1RM)', sets: 7, reps: '5/3/1/1/1/1/1', note: 'Same. Chase your PR' },
        ]},
        { focus: 'TEST: Deadlift + OHP', exercises: [
            { name: 'Deadlift (Work to 1RM)', sets: 6, reps: '5/3/1/1/1/1', note: 'One massive pull. Everything you\'ve built leads here' },
            { name: 'Overhead Press (Work to 1RM)', sets: 6, reps: '5/3/1/1/1/1', note: 'Strict press. No leg drive. Pure strength' },
        ]},
        { focus: 'The Temple Stands', exercises: [
            { name: 'Light Bench Press', sets: 3, reps: 10, note: 'Light weight. Appreciate the movement' },
            { name: 'Light Squat', sets: 3, reps: 10, note: 'Reflect on where you started vs now' },
            { name: 'Stretching & Recovery', sets: 1, reps: '15 min', note: '30 days of iron discipline. The temple is built. Now maintain it.' },
        ]},
    ],
};

const CHALLENGE_VERSES = [
    { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
    { text: "Be strong and courageous. Do not be afraid.", ref: "Joshua 1:9" },
    { text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" },
    { text: "The LORD is my strength and my shield.", ref: "Psalm 28:7" },
    { text: "No discipline seems pleasant at the time, but later it produces a harvest of righteousness.", ref: "Hebrews 12:11" },
    { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
    { text: "Let us not become weary in doing good.", ref: "Galatians 6:9" },
    { text: "The joy of the LORD is your strength.", ref: "Nehemiah 8:10" },
    { text: "She sets about her work vigorously; her arms are strong for her tasks.", ref: "Proverbs 31:17" },
    { text: "Do you not know that your bodies are temples of the Holy Spirit?", ref: "1 Corinthians 6:19" },
    { text: "For God gave us a spirit not of fear but of power and love and self-control.", ref: "2 Timothy 1:7" },
    { text: "Trust in the LORD with all your heart.", ref: "Proverbs 3:5" },
    { text: "Commit to the LORD whatever you do, and he will establish your plans.", ref: "Proverbs 16:3" },
    { text: "I press on toward the goal to win the prize.", ref: "Philippians 3:14" },
    { text: "But those who hope in the LORD will renew their strength.", ref: "Isaiah 40:31" },
    { text: "Blessed is the one who perseveres under trial.", ref: "James 1:12" },
    { text: "And let us run with perseverance the race marked out for us.", ref: "Hebrews 12:1" },
    { text: "Be on your guard; stand firm in the faith; be courageous; be strong.", ref: "1 Corinthians 16:13" },
    { text: "God is our refuge and strength, an ever-present help in trouble.", ref: "Psalm 46:1" },
    { text: "The name of the LORD is a fortified tower; the righteous run to it and are safe.", ref: "Proverbs 18:10" },
    { text: "For physical training is of some value, but godliness has value for all things.", ref: "1 Timothy 4:8" },
    { text: "Create in me a pure heart, O God, and renew a steadfast spirit within me.", ref: "Psalm 51:10" },
    { text: "Delight yourself in the LORD, and he will give you the desires of your heart.", ref: "Psalm 37:4" },
    { text: "The LORD your God is in your midst, a mighty one who will save.", ref: "Zephaniah 3:17" },
    { text: "And we know that in all things God works for the good of those who love him.", ref: "Romans 8:28" },
    { text: "My flesh and my heart may fail, but God is the strength of my heart.", ref: "Psalm 73:26" },
    { text: "The LORD is my light and my salvation — whom shall I fear?", ref: "Psalm 27:1" },
    { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
    { text: "I have fought the good fight, I have finished the race, I have kept the faith.", ref: "2 Timothy 4:7" },
    { text: "Well done, good and faithful servant.", ref: "Matthew 25:21" },
];

const CHALLENGE_DEVOTIONS = [
    "Today is day one. Every great journey starts here. Show up and give your best.",
    "Consistency beats perfection. Just show up today.",
    "Your body is a gift. Honor it with how you move today.",
    "Strength isn't just physical — it's choosing discipline when motivation fades.",
    "Rest is not weakness. God rested on the seventh day. Recovery is part of the plan.",
    "Push past comfort today. Growth lives on the other side of easy.",
    "Compare yourself only to who you were yesterday.",
    "Every rep is a prayer of gratitude for what your body can do.",
    "When the weight feels heavy, remember Who carries you.",
    "Halfway through the week — your consistency is building something lasting.",
    "Soreness is temporary. The strength you're building is eternal.",
    "Train like you're building a temple. Because you are.",
    "Mental toughness is forged in the same fire as physical strength.",
    "Your discipline today is a gift to your future self.",
    "Two weeks in. Look how far you've come. Keep going.",
    "The iron doesn't care about your excuses. Neither does greatness.",
    "Today's workout is tomorrow's warm-up. You're getting stronger.",
    "Fuel your body with purpose. Every meal is a choice.",
    "Find joy in the process, not just the results.",
    "You are more capable than you think. Prove it today.",
    "Three weeks strong. This isn't a phase — it's who you're becoming.",
    "When you want to quit, remember why you started.",
    "The hardest part is showing up. You've already won half the battle.",
    "Strength isn't born in comfort. Embrace the challenge.",
    "Your faithfulness in small things leads to great things.",
    "Almost there. The final stretch separates good from great.",
    "Pain is temporary. The pride of finishing lasts forever.",
    "You are writing a testimony with every rep.",
    "Tomorrow is the last day. Give everything you have today.",
    "You did it. 30 days of iron and faith. This is just the beginning.",
];

const CHALLENGES = [
    {
        id: 'foundations',
        name: 'Iron Foundations',
        description: 'No gym needed. 30 days of bodyweight training that builds real strength from scratch. 4 weeks of progressive overload with rest days built in.',
        icon: '&#x1F3D7;',
        days: CHALLENGE_DAYS.foundations,
    },
    {
        id: 'warrior',
        name: "Warrior's Path",
        description: 'Push/Pull/Legs split for the gym. 4 weeks of escalating intensity — moderate volume to heavy strength to a deload and final test day.',
        icon: '&#x2694;',
        days: CHALLENGE_DAYS.warrior,
    },
    {
        id: 'temple',
        name: 'Temple Builder',
        description: '5/3/1-inspired powerlifting program. Squat, Bench, Deadlift, OHP cycled through 5s, 3s, and 1s weeks with a deload and max-out finale.',
        icon: '&#x26EA;',
        days: CHALLENGE_DAYS.temple,
    }
];

function getActiveChallenge() { return DB.get('challenge', null); }
function saveActiveChallenge(c) { DB.set('challenge', c); }

function getChallengeDay(challenge) {
    const start = new Date(challenge.startDate);
    const now = new Date(today());
    return Math.floor((now - start) / 86400000) + 1;
}

function renderChallenges() {
    const container = document.getElementById('challenges-container');
    if (!container) return;
    const active = getActiveChallenge();

    if (active) {
        const challenge = CHALLENGES.find(c => c.id === active.id);
        if (!challenge) return;
        const totalDays = challenge.days.length;
        const dayNum = getChallengeDay(active);
        const completed = active.completedDays || [];
        const todayDone = completed.includes(dayNum);
        const isFinished = dayNum > totalDays;
        const progress = Math.min(completed.length, totalDays);

        if (isFinished) {
            container.innerHTML = `
                <div class="challenge-active">
                    <div class="challenge-complete-banner">
                        <span style="font-size:48px">&#x1F3C6;</span>
                        <h3>${challenge.name} — Complete!</h3>
                        <p>You finished all 30 days. Incredible discipline!</p>
                    </div>
                    <button class="btn btn-primary btn-full" onclick="finishChallenge()" style="margin-top:12px">Start a New Challenge</button>
                </div>`;
            return;
        }

        const dayData = getDayChallengeContent(challenge, dayNum);

        container.innerHTML = `
            <div class="challenge-active">
                <div class="challenge-header-row">
                    <span class="challenge-icon-lg">${challenge.icon}</span>
                    <div>
                        <h3>${challenge.name}</h3>
                        <p class="challenge-day-label">Day ${dayNum} of ${totalDays}</p>
                    </div>
                </div>
                <div class="challenge-progress-bar">
                    <div class="challenge-progress-fill" style="width:${(progress / totalDays) * 100}%"></div>
                </div>
                <p class="challenge-progress-text">${progress}/${totalDays} days completed</p>

                <div class="challenge-today-card">
                    <h4 class="challenge-focus-label">${dayData.focus}</h4>
                    <div class="challenge-verse-block">
                        <p class="challenge-verse-text">"${getTranslatedVerse(dayData.verse.ref, dayData.verse.text)}"</p>
                        <p class="challenge-verse-ref">— ${dayData.verse.ref} (${getBibleVersion()})</p>
                    </div>
                    <p class="challenge-devotion">${dayData.devotion}</p>
                    ${dayData.rest ? `
                        <div class="challenge-rest-day">
                            <span style="font-size:32px">&#x1F9D8;</span>
                            <p>Active recovery day. Walk, stretch, foam roll, or just rest. Your muscles grow when you recover.</p>
                        </div>
                    ` : `
                        <div class="challenge-workout-list">
                            ${dayData.exercises.map(ex => `
                                <div class="challenge-exercise-item">
                                    <div class="challenge-exercise-main">
                                        <span class="challenge-exercise-name">${ex.name}</span>
                                        <span class="challenge-exercise-detail">${ex.sets} x ${ex.reps}</span>
                                    </div>
                                    ${ex.note ? `<p class="challenge-exercise-note">${ex.note}</p>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}
                    ${todayDone
                        ? '<div class="challenge-done-badge">&#x2714; Completed Today</div>'
                        : `<button class="btn btn-primary btn-full" onclick="completeChallengeDay()">${dayData.rest ? 'Mark Rest Day Complete' : "Complete Today's Workout"}</button>`
                    }
                </div>
                <button class="btn btn-secondary btn-sm" onclick="abandonChallenge()" style="margin-top:10px;opacity:0.6">Quit Challenge</button>
            </div>`;
    } else {
        const completedIds = DB.get('completedChallenges', []);
        container.innerHTML = CHALLENGES.map(c => `
            <div class="challenge-card">
                <div class="challenge-card-header">
                    <span class="challenge-icon-lg">${c.icon}</span>
                    <div>
                        <h3>${c.name} ${completedIds.includes(c.id) ? '<span class="challenge-completed-tag">&#x2714; Completed</span>' : ''}</h3>
                        <p>${c.description}</p>
                    </div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="startChallenge('${c.id}')" style="margin-top:10px">Start Challenge</button>
            </div>
        `).join('');
    }
}

function getDayChallengeContent(challenge, dayNum) {
    const dayIdx = Math.min(dayNum - 1, challenge.days.length - 1);
    const dayData = challenge.days[dayIdx];
    return {
        verse: CHALLENGE_VERSES[(dayNum - 1) % CHALLENGE_VERSES.length],
        devotion: CHALLENGE_DEVOTIONS[(dayNum - 1) % CHALLENGE_DEVOTIONS.length],
        focus: dayData.focus,
        rest: !!dayData.rest,
        exercises: dayData.exercises || []
    };
}

function startChallenge(id) {
    saveActiveChallenge({ id, startDate: today(), completedDays: [] });
    renderChallenges();
    showToast('Challenge started! Let\'s go!');
}

function completeChallengeDay() {
    const active = getActiveChallenge();
    if (!active) return;
    const dayNum = getChallengeDay(active);
    if (!active.completedDays.includes(dayNum)) {
        active.completedDays.push(dayNum);
        saveActiveChallenge(active);
    }
    renderChallenges();
    showToast('Day complete! Great work!');
    checkAchievements();
}

function abandonChallenge() {
    if (!confirm('Are you sure you want to quit this challenge? Your progress will be lost.')) return;
    DB.set('challenge', null);
    renderChallenges();
}

function finishChallenge() {
    const active = getActiveChallenge();
    if (active) {
        const completed = DB.get('completedChallenges', []);
        if (!completed.includes(active.id)) completed.push(active.id);
        DB.set('completedChallenges', completed);
    }
    DB.set('challenge', null);
    renderChallenges();
}

// =============================================
// FEATURE: Onboarding
// =============================================

let obGender = 'male';
let obStep = 1;
let obExperience = null;
let obEquipment = null;

function obSetGender(g) {
    obGender = g;
    document.getElementById('ob-male').classList.toggle('active', g === 'male');
    document.getElementById('ob-female').classList.toggle('active', g === 'female');
}

function obSelectChoice(field, value) {
    if (field === 'experience') obExperience = value;
    if (field === 'equipment') obEquipment = value;
    document.querySelectorAll(`.ob-choice[data-ob="${field}"]`).forEach(el => {
        el.classList.toggle('selected', el.dataset.val === value);
    });
}

function suggestRoutineForUser() {
    if (typeof IRON_FAITH_ROUTINES === 'undefined') return null;
    // Match by category first, then by experience level
    let candidates = IRON_FAITH_ROUTINES.filter(r => r.category === obEquipment);
    if (candidates.length === 0) candidates = IRON_FAITH_ROUTINES.filter(r => r.category === 'gym');
    // Prefer matching level
    const exact = candidates.find(r => r.level === obExperience);
    return exact || candidates[0];
}

function nextOnboardingStep() {
    // Validate current step
    if (obStep === 2) {
        const name = document.getElementById('ob-name').value.trim();
        if (!name) { alert('Please enter your name.'); return; }
    }
    if (obStep === 4 && !obExperience) {
        alert('Pick your experience level.');
        return;
    }
    if (obStep === 5 && !obEquipment) {
        alert('Pick where you train.');
        return;
    }
    if (obStep === 5) {
        // Build summary + routine suggestion for final step
        const name = document.getElementById('ob-name').value.trim();
        const weight = document.getElementById('ob-weight').value;
        const goal = document.getElementById('ob-goal').value;
        const goalLabels = { lose: 'Lose Weight', maintain: 'Maintain Weight', gain: 'Build Muscle' };
        const feet = document.getElementById('ob-feet').value;
        const inches = document.getElementById('ob-inches').value;
        const age = document.getElementById('ob-age').value;

        // Calculate TDEE
        const heightInches = (parseInt(feet) || 0) * 12 + (parseInt(inches) || 0);
        const weightLbs = parseFloat(weight) || 0;
        const weightKg = weightLbs * 0.453592;
        const heightCm = heightInches * 2.54;
        const genderOffset = obGender === 'female' ? -161 : 5;
        const bmr = 10 * weightKg + 6.25 * heightCm - 5 * (parseInt(age) || 25) + genderOffset;
        const actMult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
        const activity = document.getElementById('ob-activity').value;
        let tdee = Math.round(bmr * (actMult[activity] || 1.2));
        if (goal === 'lose') tdee -= 400;
        else if (goal === 'gain') tdee += 300;
        const proteinGoal = Math.round(weightLbs * 0.8);

        document.getElementById('ob-summary').innerHTML = `
            <div class="ob-summary-item"><span>Name</span><strong>${escapeHtml(name)}</strong></div>
            <div class="ob-summary-item"><span>Goal</span><strong>${goalLabels[goal]}</strong></div>
            ${tdee > 500 ? `<div class="ob-summary-item"><span>Daily Calories</span><strong>${tdee} kcal</strong></div>` : ''}
            ${proteinGoal > 30 ? `<div class="ob-summary-item"><span>Protein Target</span><strong>${proteinGoal}g</strong></div>` : ''}
        `;

        const routine = suggestRoutineForUser();
        const suggBox = document.getElementById('ob-routine-suggestion');
        if (routine && suggBox) {
            suggBox.innerHTML = `
                <div class="ob-routine-label">Your Recommended Routine</div>
                <div class="ob-routine-name">${escapeHtml(routine.name)}</div>
                <div class="ob-routine-desc">${escapeHtml(routine.description)}</div>
                <div class="ob-routine-meta">${routine.days.length} days &middot; ${routine.type}</div>
            `;
        }
    }

    obStep++;
    const slides = document.querySelectorAll('.onboarding-slide');
    const dots = document.querySelectorAll('.step-dot');
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    const next = document.querySelector(`.onboarding-slide[data-step="${obStep}"]`);
    if (next) next.classList.add('active');
    if (dots[obStep - 1]) dots[obStep - 1].classList.add('active');
}

function completeOnboarding() {
    const name = document.getElementById('ob-name').value.trim();
    const age = parseInt(document.getElementById('ob-age').value) || 0;
    const rawWeight = parseFloat(document.getElementById('ob-weight').value) || 0;
    const feet = parseInt(document.getElementById('ob-feet').value) || 0;
    const inches = parseInt(document.getElementById('ob-inches').value) || 0;
    const heightTotal = feet * 12 + inches;
    const goal = document.getElementById('ob-goal').value;
    const activity = document.getElementById('ob-activity').value;

    // Calculate calories
    const weightKg = rawWeight * 0.453592;
    const heightCm = heightTotal * 2.54;
    const genderOffset = obGender === 'female' ? -161 : 5;
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * (age || 25) + genderOffset;
    const actMult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
    let tdee = Math.round(bmr * (actMult[activity] || 1.2));
    if (goal === 'lose') tdee -= 400;
    else if (goal === 'gain') tdee += 300;

    const profile = {
        name, gender: obGender, age, heightFeet: feet, heightInches: inches,
        height: heightTotal, weight: rawWeight, goal, activity,
        calorieGoal: tdee > 500 ? tdee : 2000,
        proteinGoal: rawWeight > 30 ? Math.round(rawWeight * 0.8) : 150
    };
    DB.set('profile', profile);

    if (rawWeight > 0) {
        const weights = DB.get('weights', []);
        weights.push({ date: today(), weight: rawWeight });
        DB.set('weights', weights);
    }

    DB.set('onboarded', true);

    // Save suggested routine to My Routines
    const suggested = suggestRoutineForUser();
    if (suggested) {
        const my = DB.get('myRoutines', []);
        if (!my.some(r => r.id === suggested.id)) {
            my.push(JSON.parse(JSON.stringify(suggested)));
            DB.set('myRoutines', my);
        }
    }
    DB.set('experience', obExperience);
    DB.set('equipment', obEquipment);

    document.getElementById('onboarding').classList.add('hidden');

    // Refresh everything
    loadProfile();
    loadUnits();
    updateDashboard();
    drawWeightChart();
    updateNutritionBars();
    checkAchievements();
    if (typeof renderTodaysWorkoutBanner === 'function') renderTodaysWorkoutBanner();
}

function showOnboarding() {
    const profile = DB.get('profile', {});
    if (!profile.name && !DB.get('onboarded', false)) {
        document.getElementById('onboarding').classList.remove('hidden');
    }
}

// --- Custom Exercise Library ---
function getCustomExercises() { return DB.get('customExercises', []); }

function addCustomExercise() {
    const nameInput = document.getElementById('custom-ex-name');
    const muscleSelect = document.getElementById('custom-ex-muscle');
    const name = nameInput.value.trim();
    if (!name) return;
    const muscle = muscleSelect.value;
    const exercises = getCustomExercises();
    if (exercises.some(e => e.name.toLowerCase() === name.toLowerCase())) {
        showToast('Exercise already exists');
        return;
    }
    exercises.push({ name, muscle });
    DB.set('customExercises', exercises);
    nameInput.value = '';
    renderCustomExercises();
    refreshCustomExerciseIntegration();
    showToast(`Added "${name}" to ${muscle}`);
}

function removeCustomExercise(index) {
    const exercises = getCustomExercises();
    exercises.splice(index, 1);
    DB.set('customExercises', exercises);
    renderCustomExercises();
    refreshCustomExerciseIntegration();
}

function renderCustomExercises() {
    const container = document.getElementById('custom-exercises-list');
    if (!container) return;
    const exercises = getCustomExercises();
    if (exercises.length === 0) {
        container.innerHTML = '<p class="empty-state">No custom exercises yet. Add your own above!</p>';
        return;
    }
    container.innerHTML = exercises.map((e, i) => `
        <div class="custom-ex-item">
            <span class="custom-ex-name">${escapeHtml(e.name)}</span>
            <span class="custom-ex-muscle-tag">${e.muscle}</span>
            <button class="delete-btn" onclick="removeCustomExercise(${i})">&times;</button>
        </div>
    `).join('');
}

function refreshCustomExerciseIntegration() {
    // Add custom exercises to datalist
    const datalist = document.getElementById('exercise-suggestions');
    if (!datalist) return;
    // Remove old custom options
    datalist.querySelectorAll('.custom-option').forEach(o => o.remove());
    getCustomExercises().forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.name;
        opt.className = 'custom-option';
        datalist.appendChild(opt);
    });
}

function getFullMuscleMap() {
    // Detailed sub-group muscle map for SVG mannequin heatmap
    const muscleMap = {
        upper_chest:    ['Incline Bench Press','Incline Dumbbell Press','Low Incline Dumbbell Press'],
        mid_chest:      ['Bench Press','Dumbbell Bench Press','Machine Chest Press','Dumbbell Fly','Cable Fly','Pec Deck','Push-ups'],
        lower_chest:    ['Decline Bench Press','Chest Dips'],
        front_delts:    ['Overhead Press','Seated Dumbbell Press','Arnold Press','Front Raises','Machine Shoulder Press'],
        side_delts:     ['Lateral Raises','Cable Lateral Raise','Upright Row'],
        rear_delts:     ['Rear Delt Fly','Face Pulls','Reverse Pec Deck'],
        traps:          ['Shrugs','Barbell Shrugs','Upright Row','Face Pulls'],
        lats:           ['Lat Pulldown','Pull-ups','Chin-ups','Straight Arm Pulldown'],
        upper_back:     ['Barbell Row','Dumbbell Row','Pendlay Row','T-Bar Row','Seated Cable Row'],
        lower_back:     ['Deadlift','Romanian Deadlift','Sumo Deadlift','Hyperextensions','Good Mornings'],
        biceps:         ['Bicep Curls','Hammer Curls','Preacher Curls','Concentration Curls','Incline Dumbbell Curl','EZ Bar Curl','Cable Curl','Spider Curls'],
        triceps:        ['Tricep Pushdown','Overhead Tricep Extension','Skull Crushers','Close Grip Bench Press','Tricep Dips','Tricep Kickbacks','Cable Overhead Extension','Diamond Push-ups'],
        forearms:       ['Hammer Curls','Wrist Curls','Reverse Curls','Farmer Carries'],
        abs:            ['Crunches','Hanging Leg Raise','Cable Crunch','Ab Wheel Rollout','Bicycle Crunches','Leg Raises','Dead Bug','Mountain Climbers','Plank'],
        obliques:       ['Russian Twist','Woodchoppers','Pallof Press','Side Plank'],
        quads:          ['Squat','Front Squat','Goblet Squat','Bulgarian Split Squat','Hack Squat','Leg Press','Lunges','Walking Lunges','Reverse Lunges','Leg Extension','Step-ups','Box Jumps'],
        hamstrings:     ['Romanian Deadlift','Leg Curl','Seated Leg Curl','Sumo Deadlift','Good Mornings','Nordic Curl'],
        glutes:         ['Hip Thrust','Glute Bridge','Bulgarian Split Squat','Squat','Lunges','Walking Lunges','Reverse Lunges','Step-ups','Cable Pull-through'],
        calves:         ['Calf Raises','Seated Calf Raise','Standing Calf Raise','Single-Leg Calf Raise'],
    };
    // Merge custom exercises — map simple groups to sub-groups
    const customGroupMap = {
        chest: 'mid_chest', back: 'upper_back', shoulders: 'front_delts',
        legs: 'quads', core: 'abs', biceps: 'biceps', triceps: 'triceps'
    };
    getCustomExercises().forEach(e => {
        const target = customGroupMap[e.muscle] || e.muscle;
        if (muscleMap[target]) {
            muscleMap[target].push(e.name);
        }
    });
    return muscleMap;
}

function toggleCustomExercises() {
    const panel = document.getElementById('custom-exercises-panel');
    const arrow = document.getElementById('custom-ex-arrow');
    panel.classList.toggle('hidden');
    arrow.innerHTML = panel.classList.contains('hidden') ? '&#x25BC;' : '&#x25B2;';
}

// --- Weekly Report Card ---
function getWeekRange() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { start: startOfWeek, end: endOfWeek };
}

function formatShortDate(d) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function renderWeeklyReport() {
    const container = document.getElementById('weekly-report');
    if (!container) return;

    const { start, end } = getWeekRange();
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const allWorkouts = DB.get('workouts', []);
    const allMeals = DB.get('meals', []);
    const allWeights = DB.get('weights', []);
    const profile = DB.get('profile', {});

    // Filter to this week
    const weekWorkouts = allWorkouts.filter(w => w.date >= startStr && w.date <= endStr);
    const weekMeals = allMeals.filter(m => m.date >= startStr && m.date <= endStr);
    const weekWeights = allWeights.filter(w => w.date >= startStr && w.date <= endStr);

    // Days trained this week
    const trainDays = new Set(weekWorkouts.map(w => w.date)).size;

    // Total volume
    const totalVolume = weekWorkouts.reduce((sum, w) => {
        return sum + w.sets.reduce((s, set) => s + set.weight * set.reps, 0);
    }, 0);

    // Average daily calories
    const calDays = {};
    weekMeals.forEach(m => {
        calDays[m.date] = (calDays[m.date] || 0) + m.calories;
    });
    const calDayCount = Object.keys(calDays).length;
    const avgCalories = calDayCount > 0 ? Math.round(Object.values(calDays).reduce((a, b) => a + b, 0) / calDayCount) : 0;

    // Weight change this week
    let weightDelta = null;
    if (weekWeights.length >= 2) {
        const sorted = [...weekWeights].sort((a, b) => a.date.localeCompare(b.date));
        weightDelta = sorted[sorted.length - 1].weight - sorted[0].weight;
    }

    // PRs this week (best set weight per exercise this week vs all time before)
    let prCount = 0;
    const weekExercises = {};
    weekWorkouts.forEach(w => {
        const maxWeight = Math.max(...w.sets.map(s => s.weight));
        if (!weekExercises[w.name] || maxWeight > weekExercises[w.name]) {
            weekExercises[w.name] = maxWeight;
        }
    });
    const priorWorkouts = allWorkouts.filter(w => w.date < startStr);
    Object.entries(weekExercises).forEach(([name, weekMax]) => {
        const priorMax = priorWorkouts
            .filter(w => w.name === name)
            .reduce((best, w) => {
                const m = Math.max(...w.sets.map(s => s.weight));
                return m > best ? m : best;
            }, 0);
        if (weekMax > priorMax && priorMax > 0) prCount++;
    });

    // Current streak
    const streakEl = document.getElementById('streak-count');
    const streak = streakEl ? parseInt(streakEl.textContent) || 0 : 0;

    // Show the card
    container.style.display = '';

    document.getElementById('report-week').textContent = `Week of ${formatShortDate(start)} – ${formatShortDate(end)}`;

    // Stats grid
    const statsHtml = [
        { icon: '&#x1F3CB;', label: 'Days Trained', value: `${trainDays} / 7` },
        { icon: '&#x1F4AA;', label: 'Total Volume', value: `${parseFloat(lbsToDisplay(totalVolume)).toLocaleString()} ${wu()}` },
        { icon: '&#x1F525;', label: 'Avg Calories', value: avgCalories > 0 ? avgCalories.toLocaleString() : '—' },
        { icon: '&#x2696;', label: 'Weight Change', value: weightDelta !== null ? `${weightDelta > 0 ? '+' : ''}${parseFloat(lbsToDisplay(weightDelta)).toFixed(1)} ${wu()}` : '—' },
        { icon: '&#x1F3C6;', label: 'PRs Hit', value: prCount },
        { icon: '&#x1F525;', label: 'Streak', value: `${streak} days` },
    ].map(s => `
        <div class="report-stat">
            <span class="report-stat-icon">${s.icon}</span>
            <span class="report-stat-value">${s.value}</span>
            <span class="report-stat-label">${s.label}</span>
        </div>
    `).join('');
    document.getElementById('report-stats-grid').innerHTML = statsHtml;

    // Verse of the week (use the week number to pick one)
    const weekNum = Math.floor((start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) / (7 * 86400000));
    const verse = VERSES[weekNum % VERSES.length];
    const verseText = getTranslatedVerse(verse.ref, verse.text);
    const version = getBibleVersion();
    document.getElementById('report-verse').innerHTML = `<em>"${escapeHtml(verseText)}"</em><br><small>— ${escapeHtml(verse.ref)} (${version})</small>`;
}

// =============================================
// END OF NEW FEATURES
// =============================================

// --- Initialize ---
// =============================================
// WORKOUT HUB - Routines, Explore, Active Workout
// =============================================

let currentDetailRoutine = null;
let activeWorkout = null; // { routineName, dayName, exercises: [{name,sets,reps,rest,logged:[{w,r}]}], startedAt, restEndsAt }
let activeWorkoutTimer = null;
let activeRestTimer = null;

function getMyRoutines() { return DB.get('myRoutines', []); }
function setMyRoutines(r) { DB.set('myRoutines', r); }

function showHubView(view) {
    document.querySelectorAll('.hub-view').forEach(v => v.classList.add('hidden'));
    document.getElementById('workout-hub-card').classList.add('hidden');

    if (view === 'routines') {
        document.getElementById('hub-routines').classList.remove('hidden');
        renderMyRoutines();
    } else if (view === 'explore') {
        document.getElementById('hub-explore').classList.remove('hidden');
        populateExploreFilters();
        renderExplore();
    } else if (view === 'builder') {
        document.getElementById('hub-builder').classList.remove('hidden');
        builderReset();
    } else if (view === 'empty') {
        startEmptyWorkout();
    }
}

function hideHubView() {
    document.querySelectorAll('.hub-view').forEach(v => v.classList.add('hidden'));
    document.getElementById('workout-hub-card').classList.remove('hidden');
}

function renderTodaysWorkoutBanner() {
    const banner = document.getElementById('todays-workout-banner');
    if (!banner) return;
    const day = new Date().getDay();
    const recommended = DAY_RECOMMENDATIONS[day];
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

    // Find a matching day in any of user's routines first, else from preset
    const myRoutines = getMyRoutines();
    let suggestion = null;
    for (const r of myRoutines) {
        const match = r.days && r.days.find(d => d.dayType === recommended);
        if (match) { suggestion = { routine: r, day: match, source: 'mine' }; break; }
    }
    if (!suggestion && recommended !== 'rest') {
        for (const r of IRON_FAITH_ROUTINES) {
            const match = r.days.find(d => d.dayType === recommended);
            if (match) { suggestion = { routine: r, day: match, source: 'preset' }; break; }
        }
    }

    if (recommended === 'rest') {
        banner.innerHTML = `<div class="todays-workout">
            <div class="todays-workout-label">${dayNames[day]} &middot; Rest Day</div>
            <div class="todays-workout-name">Recover &amp; reflect</div>
            <p class="todays-workout-verse">"Come to me, all you who are weary and burdened, and I will give you rest." — Matthew 11:28</p>
        </div>`;
        return;
    }

    if (suggestion) {
        banner.innerHTML = `<div class="todays-workout">
            <div class="todays-workout-label">${dayNames[day]} &middot; ${recommended.toUpperCase()} day</div>
            <div class="todays-workout-name">${escapeHtml(suggestion.day.name)}</div>
            <div class="todays-workout-sub">${escapeHtml(suggestion.routine.name)} &middot; ${suggestion.day.exercises.length} exercises</div>
            <button class="btn btn-primary btn-full" style="margin-top:10px" onclick="startWorkoutFromSuggestion('${suggestion.routine.id}','${escapeHtml(suggestion.day.name)}','${suggestion.source}')">Start Today's Workout</button>
        </div>`;
    } else {
        banner.innerHTML = `<div class="todays-workout">
            <div class="todays-workout-label">${dayNames[day]} &middot; ${recommended.toUpperCase()} day</div>
            <div class="todays-workout-name">No routine yet</div>
            <div class="todays-workout-sub">Pick a routine from Explore to get started</div>
        </div>`;
    }
}

function startWorkoutFromSuggestion(routineId, dayName, source) {
    const list = source === 'mine' ? getMyRoutines() : IRON_FAITH_ROUTINES;
    const routine = list.find(r => r.id === routineId);
    if (!routine) return showToast('Routine not found');
    const day = routine.days.find(d => d.name === dayName);
    if (!day) return showToast('Day not found');
    startActiveWorkout(routine, day);
}

function renderMyRoutines() {
    const container = document.getElementById('my-routines-list');
    const routines = getMyRoutines();
    if (routines.length === 0) {
        container.innerHTML = '<p class="empty-state">No saved routines. Browse Explore to add one, or build your own!</p>';
        return;
    }
    container.innerHTML = routines.map(r => `
        <div class="routine-card" onclick="openRoutineDetail('${r.id}','mine')">
            <div class="routine-card-main">
                <div class="routine-card-name">${escapeHtml(r.name)}</div>
                <div class="routine-card-meta">${r.days.length} days &middot; ${r.type || 'Custom'}</div>
            </div>
            <span class="routine-card-arrow">&#x203A;</span>
        </div>
    `).join('');
}

function populateExploreFilters() {
    const cat = document.getElementById('filter-category');
    if (cat.options.length <= 1) {
        CATEGORIES.forEach(c => {
            cat.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }
}

function renderExplore() {
    const container = document.getElementById('explore-routines-list');
    const cat = document.getElementById('filter-category').value;
    const lvl = document.getElementById('filter-level').value;

    let filtered = IRON_FAITH_ROUTINES;
    if (cat) filtered = filtered.filter(r => r.category === cat);
    if (lvl) filtered = filtered.filter(r => r.level === lvl);

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">No routines match those filters.</p>';
        return;
    }

    container.innerHTML = filtered.map(r => `
        <div class="routine-card" onclick="openRoutineDetail('${r.id}','preset')">
            <div class="routine-card-main">
                <div class="routine-card-name">${escapeHtml(r.name)}</div>
                <div class="routine-card-meta">
                    <span class="routine-tag tag-${r.level}">${r.level}</span>
                    <span class="routine-tag">${r.type}</span>
                    <span>${r.days.length} days</span>
                </div>
                <div class="routine-card-desc">${escapeHtml(r.description)}</div>
            </div>
            <span class="routine-card-arrow">&#x203A;</span>
        </div>
    `).join('');
}

function openRoutineDetail(routineId, source) {
    const list = source === 'mine' ? getMyRoutines() : IRON_FAITH_ROUTINES;
    const routine = list.find(r => r.id === routineId);
    if (!routine) return;
    currentDetailRoutine = { routine, source };

    document.querySelectorAll('.hub-view').forEach(v => v.classList.add('hidden'));
    document.getElementById('hub-routine-detail').classList.remove('hidden');

    document.getElementById('routine-detail-title').textContent = routine.name;
    document.getElementById('routine-detail-desc').textContent = routine.description || '';

    const daysHtml = routine.days.map(day => `
        <div class="routine-day-card">
            <div class="routine-day-header">
                <strong>${escapeHtml(day.name)}</strong>
                <button class="btn btn-primary btn-sm" onclick="startActiveWorkoutFromDetail('${escapeHtml(day.name)}')">Start</button>
            </div>
            <div class="routine-day-exercises">
                ${day.exercises.map(e => `
                    <div class="routine-day-ex">
                        <span>${escapeHtml(e.name)}</span>
                        <span class="routine-day-ex-meta">${e.sets} &times; ${e.reps}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    document.getElementById('routine-detail-days').innerHTML = daysHtml;

    const saveBtn = document.getElementById('save-routine-btn');
    if (source === 'preset') {
        const exists = getMyRoutines().some(r => r.id === routineId);
        saveBtn.style.display = exists ? 'none' : 'block';
    } else {
        saveBtn.style.display = 'none';
    }
}

function backToRoutineList() {
    if (!currentDetailRoutine) { hideHubView(); return; }
    document.getElementById('hub-routine-detail').classList.add('hidden');
    if (currentDetailRoutine.source === 'mine') {
        document.getElementById('hub-routines').classList.remove('hidden');
    } else {
        document.getElementById('hub-explore').classList.remove('hidden');
    }
}

function saveRoutineToMine() {
    if (!currentDetailRoutine) return;
    const my = getMyRoutines();
    if (my.some(r => r.id === currentDetailRoutine.routine.id)) return showToast('Already saved');
    my.push(JSON.parse(JSON.stringify(currentDetailRoutine.routine)));
    setMyRoutines(my);
    showToast('Saved to My Routines');
    document.getElementById('save-routine-btn').style.display = 'none';
    renderTodaysWorkoutBanner();
}

function startActiveWorkoutFromDetail(dayName) {
    if (!currentDetailRoutine) return;
    const day = currentDetailRoutine.routine.days.find(d => d.name === dayName);
    if (!day) return;
    startActiveWorkout(currentDetailRoutine.routine, day);
}

// ===== Active Workout =====

function getPreviousWorkoutData(exerciseName) {
    const workouts = DB.get('workouts', []).filter(w => w.name === exerciseName);
    if (workouts.length === 0) return null;
    const last = workouts.sort((a, b) => b.timestamp - a.timestamp)[0];
    return last.sets;
}

function startActiveWorkout(routine, day) {
    activeWorkout = {
        routineName: routine.name,
        dayName: day.name,
        startedAt: Date.now(),
        exercises: day.exercises.map(e => ({
            name: e.name,
            targetSets: e.sets,
            targetReps: e.reps,
            rest: e.rest || 90,
            logged: Array.from({ length: e.sets }, () => ({ w: '', r: '' }))
        }))
    };
    document.querySelectorAll('.hub-view').forEach(v => v.classList.add('hidden'));
    document.getElementById('workout-hub-card').classList.add('hidden');
    document.getElementById('active-workout').classList.remove('hidden');
    document.getElementById('active-workout-title').textContent = day.name;
    renderActiveWorkout();
    startWorkoutTimer();
}

function startEmptyWorkout() {
    activeWorkout = {
        routineName: 'Empty Workout',
        dayName: 'Free Session',
        startedAt: Date.now(),
        exercises: []
    };
    document.getElementById('workout-hub-card').classList.add('hidden');
    document.getElementById('active-workout').classList.remove('hidden');
    document.getElementById('active-workout-title').textContent = 'Free Session';
    renderActiveWorkout();
    startWorkoutTimer();
}

function renderActiveWorkout() {
    if (!activeWorkout) return;
    const container = document.getElementById('active-exercises');
    let html = '';

    activeWorkout.exercises.forEach((ex, exIdx) => {
        const prev = getPreviousWorkoutData(ex.name);
        const prevHtml = prev
            ? `<div class="active-prev">Last: ${prev.map(s => `${lbsToDisplay(s.weight)}${wu()}&times;${s.reps}`).join(', ')}</div>`
            : `<div class="active-prev">No history yet</div>`;

        html += `<div class="active-ex">
            <div class="active-ex-header">
                <strong>${escapeHtml(ex.name)}</strong>
                <span class="active-ex-target">${ex.targetSets} &times; ${ex.targetReps}</span>
            </div>
            ${prevHtml}
            <div class="active-sets">`;

        ex.logged.forEach((s, sIdx) => {
            html += `<div class="active-set-row">
                <span class="active-set-label">Set ${sIdx + 1}</span>
                <input type="number" placeholder="Weight" value="${s.w}" oninput="updateActiveSet(${exIdx},${sIdx},'w',this.value)" step="2.5">
                <span>&times;</span>
                <input type="number" placeholder="Reps" value="${s.r}" oninput="updateActiveSet(${exIdx},${sIdx},'r',this.value)">
                <button class="active-done-btn" onclick="completeSet(${exIdx},${sIdx})">&#x2713;</button>
            </div>`;
        });

        html += `</div>
            <button class="btn btn-secondary btn-sm" onclick="addSetToActive(${exIdx})">+ Add Set</button>
        </div>`;
    });

    if (activeWorkout.exercises.length === 0) {
        html += '<p class="empty-state">No exercises yet. Add one below.</p>';
    }

    html += `<div class="active-add-ex">
        <input type="text" id="active-add-name" placeholder="Add exercise..." list="exercise-suggestions">
        <button class="btn btn-secondary" onclick="addExerciseToActive()">+ Add</button>
    </div>`;

    container.innerHTML = html;
}

function updateActiveSet(exIdx, sIdx, field, value) {
    if (!activeWorkout) return;
    activeWorkout.exercises[exIdx].logged[sIdx][field] = value;
}

function addSetToActive(exIdx) {
    activeWorkout.exercises[exIdx].logged.push({ w: '', r: '' });
    renderActiveWorkout();
}

function addExerciseToActive() {
    const input = document.getElementById('active-add-name');
    const name = input.value.trim();
    if (!name) return;
    activeWorkout.exercises.push({
        name,
        targetSets: 3,
        targetReps: '8-12',
        rest: 90,
        logged: [{ w: '', r: '' }, { w: '', r: '' }, { w: '', r: '' }]
    });
    renderActiveWorkout();
}

function completeSet(exIdx, sIdx) {
    const ex = activeWorkout.exercises[exIdx];
    const set = ex.logged[sIdx];
    if (!set.w || !set.r) return showToast('Enter weight and reps');
    startRestTimer(ex.rest || 90);
}

function startWorkoutTimer() {
    if (activeWorkoutTimer) clearInterval(activeWorkoutTimer);
    const update = () => {
        if (!activeWorkout) return;
        const sec = Math.floor((Date.now() - activeWorkout.startedAt) / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        const el = document.getElementById('active-workout-time');
        if (el) el.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    };
    update();
    activeWorkoutTimer = setInterval(update, 1000);
}

function startRestTimer(seconds) {
    if (activeRestTimer) clearInterval(activeRestTimer);
    const endsAt = Date.now() + seconds * 1000;
    const el = document.getElementById('active-rest-timer');
    el.classList.remove('hidden');
    const update = () => {
        const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        document.getElementById('rest-timer-text').textContent = `Rest: ${m}:${s.toString().padStart(2,'0')}`;
        if (remaining === 0) {
            clearInterval(activeRestTimer);
            el.classList.add('hidden');
            try { navigator.vibrate && navigator.vibrate(300); } catch (e) {}
            showToast('Rest done — go!');
        }
    };
    update();
    activeRestTimer = setInterval(update, 500);
}

function skipRest() {
    if (activeRestTimer) clearInterval(activeRestTimer);
    document.getElementById('active-rest-timer').classList.add('hidden');
}

function endActiveWorkout() {
    if (!confirm('End workout without saving?')) return;
    activeWorkout = null;
    if (activeWorkoutTimer) clearInterval(activeWorkoutTimer);
    if (activeRestTimer) clearInterval(activeRestTimer);
    document.getElementById('active-workout').classList.add('hidden');
    document.getElementById('workout-hub-card').classList.remove('hidden');
}

function finishActiveWorkout() {
    if (!activeWorkout) return;
    let saved = 0;
    const workouts = DB.get('workouts', []);
    activeWorkout.exercises.forEach(ex => {
        const validSets = ex.logged
            .filter(s => s.w && s.r)
            .map(s => ({ weight: parseFloat(s.w), reps: parseInt(s.r) }));
        if (validSets.length === 0) return;
        const realWeights = validSets.map(s => ({
            weight: getCurrentUnits() === 'metric' ? s.weight * 2.20462 : s.weight,
            reps: s.reps
        }));
        workouts.push({
            name: ex.name,
            sets: realWeights,
            date: today(),
            timestamp: Date.now()
        });
        saved++;
    });
    DB.set('workouts', workouts);
    activeWorkout = null;
    if (activeWorkoutTimer) clearInterval(activeWorkoutTimer);
    if (activeRestTimer) clearInterval(activeRestTimer);
    document.getElementById('active-workout').classList.add('hidden');
    document.getElementById('workout-hub-card').classList.remove('hidden');
    const sharePrompt = saved > 0;
    const sessionName = activeWorkout && activeWorkout.dayName;
    updateDashboard();
    updateTodaysExercises();
    renderTodaysWorkoutBanner();
    checkAchievements();
    showToast(`Saved ${saved} exercise${saved !== 1 ? 's' : ''}!`);

    if (sharePrompt && typeof currentUser !== 'undefined' && currentUser) {
        setTimeout(() => {
            if (confirm('Share this workout to your feed?')) {
                if (typeof openPostModalFromWorkout === 'function') {
                    openPostModalFromWorkout(`Just finished ${sessionName || 'a session'}!`);
                }
            }
        }, 400);
    }
}

// ===== Routine Builder =====

let builderDays = [];

function builderReset() {
    builderDays = [{ name: 'Day 1', dayType: 'full', exercises: [] }];
    document.getElementById('builder-name').value = '';
    renderBuilder();
}

function renderBuilder() {
    const container = document.getElementById('builder-days');
    container.innerHTML = builderDays.map((d, i) => `
        <div class="builder-day">
            <div class="builder-day-header">
                <input type="text" value="${escapeHtml(d.name)}" oninput="builderUpdateDayName(${i},this.value)" placeholder="Day name">
                <button class="delete-btn" onclick="builderRemoveDay(${i})">&times;</button>
            </div>
            ${d.exercises.map((e, ei) => `
                <div class="builder-ex-row">
                    <input type="text" value="${escapeHtml(e.name)}" oninput="builderUpdateEx(${i},${ei},'name',this.value)" placeholder="Exercise" list="exercise-suggestions" style="flex:2">
                    <input type="number" value="${e.sets}" oninput="builderUpdateEx(${i},${ei},'sets',this.value)" placeholder="Sets" style="width:55px">
                    <input type="text" value="${escapeHtml(e.reps)}" oninput="builderUpdateEx(${i},${ei},'reps',this.value)" placeholder="Reps" style="width:70px">
                    <button class="delete-btn" onclick="builderRemoveEx(${i},${ei})">&times;</button>
                </div>
            `).join('')}
            <button class="btn btn-secondary btn-sm" onclick="builderAddEx(${i})" style="margin-top:6px">+ Exercise</button>
        </div>
    `).join('');
}

function builderAddDay() {
    builderDays.push({ name: 'Day ' + (builderDays.length + 1), dayType: 'full', exercises: [] });
    renderBuilder();
}
function builderRemoveDay(i) { builderDays.splice(i, 1); renderBuilder(); }
function builderUpdateDayName(i, v) { builderDays[i].name = v; }
function builderAddEx(i) {
    builderDays[i].exercises.push({ name: '', sets: 3, reps: '8-12', rest: 90 });
    renderBuilder();
}
function builderRemoveEx(i, ei) { builderDays[i].exercises.splice(ei, 1); renderBuilder(); }
function builderUpdateEx(i, ei, field, v) {
    builderDays[i].exercises[ei][field] = field === 'sets' ? parseInt(v) || 0 : v;
}

function saveBuiltRoutine() {
    const name = document.getElementById('builder-name').value.trim();
    if (!name) return showToast('Give your routine a name');
    if (builderDays.length === 0) return showToast('Add at least one day');
    const cleanDays = builderDays
        .map(d => ({ ...d, exercises: d.exercises.filter(e => e.name.trim()) }))
        .filter(d => d.exercises.length > 0);
    if (cleanDays.length === 0) return showToast('Add at least one exercise');

    const my = getMyRoutines();
    my.push({
        id: 'custom_' + Date.now(),
        name,
        type: 'Custom',
        level: 'custom',
        category: 'custom',
        description: 'Custom routine',
        days: cleanDays
    });
    setMyRoutines(my);
    showToast('Routine saved!');
    hideHubView();
    renderTodaysWorkoutBanner();
}

function getCurrentUnits() {
    return DB.get('units', 'imperial');
}

function init() {
    loadBibleVersion();
    displayDailyVerse();
    loadProfile();
    loadUnits();
    updateDashboard();
    updateTodaysExercises();
    updateOverloadDropdown();
    updateMealsList();
    updateNutritionBars();
    drawWeightChart();
    renderAchievements();
    renderCalendarHeatmap();
    renderMuscleHeatmap();
    scheduleMidnightReset();
    renderRoutinesList();
    renderTodaysWorkoutBanner();
    updateSaveTemplateBtn();
    updateRestTimerVisibility();
    renderChallenges();
    renderWeeklyReport();
    renderCustomExercises();
    refreshCustomExerciseIntegration();
    showOnboarding();

    // Redraw charts on resize
    window.addEventListener('resize', () => {
        drawWeightChart();
        const exercise = document.getElementById('overload-exercise').value;
        if (exercise) showOverloadData();
    });
}

init();
