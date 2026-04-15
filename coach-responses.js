// --- Keyword-based Response Engine ---
const TOPIC_RESPONSES = {
    // Each topic: array of { keywords: [], handler: function }
    topics: [
        {
            id: 'plan_my_week',
            keywords: ['plan my week', '7-day', '7 day', 'weekly schedule', 'weekly plan', 'this week.*plan', 'week.*schedule', 'schedule.*week'],
            handler: (ctx) => generateWeeklySchedule(ctx),
        },
        {
            id: 'workout_plan',
            keywords: ['workout plan', 'training plan', 'program', 'routine', 'split', 'generate.*plan', 'create.*plan', 'make.*plan', 'give me a plan', 'workout for me', 'what should i do.*gym'],
            handler: (ctx) => generateWorkoutPlan(ctx),
        },
        {
            id: 'meal_plan',
            keywords: ['meal plan', 'diet plan', 'what.*eat', 'food plan', 'eating plan', 'nutrition plan', 'create.*meal', 'generate.*meal', 'meal prep', 'what should i eat'],
            handler: (ctx) => generateMealPlan(ctx),
        },
        {
            id: 'fill_macros',
            keywords: ['fill.*macro', 'hit.*macro', 'reach.*goal', 'remaining.*cal', 'left.*eat', 'still need', 'short on', 'how.*fill', 'what.*eat.*now', 'hungry', 'snack idea', 'finish.*day', 'close.*goal', 'almost.*goal', 'need more protein', 'need more cal', 'recommend.*food', 'suggest.*food', 'food.*recommend', 'what.*can.*eat'],
            handler: (ctx) => {
                const calGoal = ctx.profile.calorieGoal || 2000;
                const protGoal = ctx.profile.proteinGoal || 150;
                const carbGoal = Math.round(calGoal * 0.40 / 4);
                const fatGoal = Math.round(calGoal * 0.30 / 9);

                // Today's intake
                const todayMeals = ctx.todayMeals;
                const eaten = { calories: 0, protein: 0, carbs: 0, fat: 0 };
                todayMeals.forEach(m => {
                    eaten.calories += m.calories;
                    eaten.protein += m.protein;
                    eaten.carbs += m.carbs;
                    eaten.fat += m.fat;
                });

                const remaining = {
                    calories: Math.max(0, calGoal - eaten.calories),
                    protein: Math.max(0, protGoal - eaten.protein),
                    carbs: Math.max(0, carbGoal - eaten.carbs),
                    fat: Math.max(0, fatGoal - eaten.fat),
                };

                let html = `<h3>&#x1F37D; What to Eat Now</h3>`;

                if (todayMeals.length === 0) {
                    html += insightHtml(`You haven't logged any meals today. Here's what you need to hit your full daily targets.`);
                } else {
                    html += insightHtml(`You've eaten <strong>${eaten.calories} cal</strong> and <strong>${eaten.protein}g protein</strong> today. Here's what's left.`);
                }

                // Remaining macros display
                html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:12px 0;">`;
                html += `<div style="background:var(--card);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:700;color:${remaining.calories > 200 ? 'var(--accent)' : '#4ade80'};">${remaining.calories}</div>
                    <div style="font-size:11px;color:var(--text-muted);">cal left</div></div>`;
                html += `<div style="background:var(--card);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:700;color:${remaining.protein > 20 ? '#f87171' : '#4ade80'};">${remaining.protein}g</div>
                    <div style="font-size:11px;color:var(--text-muted);">protein</div></div>`;
                html += `<div style="background:var(--card);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:700;">${remaining.carbs}g</div>
                    <div style="font-size:11px;color:var(--text-muted);">carbs</div></div>`;
                html += `<div style="background:var(--card);padding:10px;border-radius:8px;text-align:center;">
                    <div style="font-size:20px;font-weight:700;">${remaining.fat}g</div>
                    <div style="font-size:11px;color:var(--text-muted);">fat</div></div>`;
                html += `</div>`;

                if (remaining.calories <= 50 && remaining.protein <= 10) {
                    html += `<p style="color:#4ade80;font-weight:600;">&#x2705; You've hit your targets for today! Great work.</p>`;
                    html += verseHtml();
                    return html;
                }

                // --- Smart food matching from FOOD_DB ---
                const db = (typeof FOOD_DB !== 'undefined') ? FOOD_DB : [];

                // Score each food by how well it fills the remaining macros
                function scoreFood(f) {
                    if (f.calories > remaining.calories + 100) return -1;
                    let score = 0;
                    // Prioritize protein if that's the biggest gap
                    if (remaining.protein > 20) score += (f.protein / Math.max(remaining.protein, 1)) * 40;
                    // Calorie fit
                    if (f.calories <= remaining.calories) score += 15;
                    // Penalize foods that blow the budget
                    if (f.calories > remaining.calories) score -= 10;
                    // Bonus for balanced macros
                    score += Math.min(f.carbs, remaining.carbs) * 0.1;
                    score += Math.min(f.fat, remaining.fat) * 0.1;
                    return score;
                }

                const scored = db.map(f => ({ ...f, score: scoreFood(f) }))
                    .filter(f => f.score > 0)
                    .sort((a, b) => b.score - a.score);

                // --- Categorize recommendations ---
                const highProtein = scored.filter(f => f.protein >= 15).slice(0, 6);
                const quickSnacks = scored.filter(f => f.calories <= 300).slice(0, 6);
                const fullMeals = scored.filter(f => f.calories >= 300 && f.calories <= remaining.calories).slice(0, 6);

                // Emoji map for food visualization
                const foodEmoji = {
                    'chicken': '&#x1F357;', 'turkey': '&#x1F357;', 'steak': '&#x1F969;', 'beef': '&#x1F969;', 'bison': '&#x1F969;',
                    'salmon': '&#x1F41F;', 'tuna': '&#x1F41F;', 'tilapia': '&#x1F41F;', 'shrimp': '&#x1F990;', 'cod': '&#x1F41F;',
                    'egg': '&#x1F95A;', 'yogurt': '&#x1F95B;', 'milk': '&#x1F95B;', 'cheese': '&#x1F9C0;', 'cottage': '&#x1F9C0;',
                    'rice': '&#x1F35A;', 'oat': '&#x1F35A;', 'pasta': '&#x1F35D;', 'bread': '&#x1F35E;', 'bagel': '&#x1F96F;', 'tortilla': '&#x1FAD3;', 'quinoa': '&#x1F35A;',
                    'banana': '&#x1F34C;', 'apple': '&#x1F34E;', 'blueberr': '&#x1FAD0;', 'strawberr': '&#x1F353;', 'grape': '&#x1F347;', 'orange': '&#x1F34A;', 'mango': '&#x1F96D;', 'avocado': '&#x1F951;', 'watermelon': '&#x1F349;', 'pineapple': '&#x1F34D;', 'peach': '&#x1F351;',
                    'broccoli': '&#x1F966;', 'salad': '&#x1F957;', 'lettuce': '&#x1F957;', 'spinach': '&#x1F96C;', 'kale': '&#x1F96C;', 'carrot': '&#x1F955;', 'corn': '&#x1F33D;', 'potato': '&#x1F954;', 'sweet potato': '&#x1F360;',
                    'peanut': '&#x1F95C;', 'almond': '&#x1F95C;', 'walnut': '&#x1F95C;', 'cashew': '&#x1F95C;', 'nut': '&#x1F95C;',
                    'protein shake': '&#x1F964;', 'protein bar': '&#x1F36B;', 'whey': '&#x1F964;', 'casein': '&#x1F964;',
                    'pizza': '&#x1F355;', 'burger': '&#x1F354;', 'taco': '&#x1F32E;', 'burrito': '&#x1F32F;', 'sandwich': '&#x1F96A;', 'wrap': '&#x1F32F;',
                    'pancake': '&#x1F95E;', 'waffle': '&#x1F9C7;', 'bacon': '&#x1F953;', 'sausage': '&#x1F953;',
                    'cookie': '&#x1F36A;', 'chocolate': '&#x1F36B;', 'ice cream': '&#x1F368;', 'popcorn': '&#x1F37F;',
                    'coffee': '&#x2615;', 'latte': '&#x2615;', 'juice': '&#x1F9C3;', 'smoothie': '&#x1F964;', 'beer': '&#x1F37A;', 'wine': '&#x1F377;',
                    'honey': '&#x1F36F;', 'hummus': '&#x1F958;', 'soup': '&#x1F372;', 'ramen': '&#x1F35C;',
                };

                function getEmoji(name) {
                    const lower = name.toLowerCase();
                    for (const [key, emoji] of Object.entries(foodEmoji)) {
                        if (lower.includes(key)) return emoji;
                    }
                    return '&#x1F374;';
                }

                function renderFoodCards(foods, sectionTitle) {
                    if (foods.length === 0) return '';
                    let s = `<h3>${sectionTitle}</h3>`;
                    s += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 16px;">`;
                    foods.forEach(f => {
                        s += `<div style="background:var(--card);padding:10px;border-radius:8px;border:1px solid var(--border);">`;
                        s += `<div style="font-size:22px;margin-bottom:4px;">${getEmoji(f.name)}</div>`;
                        s += `<div style="font-size:13px;font-weight:600;">${f.name}</div>`;
                        s += `<div style="font-size:11px;color:var(--text-muted);margin:2px 0;">${f.serving}</div>`;
                        s += `<div style="font-size:12px;margin-top:4px;">`;
                        s += `<span style="color:var(--accent);">${f.calories} cal</span> &middot; `;
                        s += `<span style="color:#f87171;">${f.protein}g P</span> &middot; `;
                        s += `<span>${f.carbs}g C</span> &middot; `;
                        s += `<span>${f.fat}g F</span>`;
                        s += `</div></div>`;
                    });
                    s += `</div>`;
                    return s;
                }

                // Show recommendations based on what they need
                if (remaining.protein > 20 && highProtein.length > 0) {
                    html += renderFoodCards(highProtein, '&#x1F4AA; High Protein — You Need ' + remaining.protein + 'g More');
                }

                if (remaining.calories >= 300 && fullMeals.length > 0) {
                    html += renderFoodCards(fullMeals, '&#x1F37D; Full Meals That Fit Your Remaining Budget');
                }

                if (remaining.calories > 0 && remaining.calories < 600 && quickSnacks.length > 0) {
                    html += renderFoodCards(quickSnacks, '&#x26A1; Quick Snacks to Close the Gap');
                }

                // --- Combo meal suggestions that add up to fill the gap ---
                html += `<h3>&#x1F468;&#x200D;&#x1F373; Meal Combos to Fill Your Remaining Macros</h3>`;

                // Build smart combos
                const combos = [];

                // Helper: find foods in a category
                function pick(keyword, maxCal) {
                    return db.filter(f => f.name.toLowerCase().includes(keyword) && f.calories <= maxCal);
                }

                if (remaining.calories >= 400 && remaining.protein >= 25) {
                    // High protein meal combo
                    const proteins = pick('chicken', remaining.calories).concat(pick('salmon', remaining.calories), pick('turkey', remaining.calories), pick('steak', remaining.calories));
                    const carbs = pick('rice', 300).concat(pick('potato', 300), pick('pasta', 300));
                    const vegs = pick('broccoli', 100).concat(pick('spinach', 100), pick('asparagus', 100));
                    if (proteins.length > 0 && carbs.length > 0) {
                        const p = proteins[Math.floor(Math.random() * proteins.length)];
                        const c = carbs[Math.floor(Math.random() * carbs.length)];
                        const v = vegs.length > 0 ? vegs[Math.floor(Math.random() * vegs.length)] : null;
                        const total = { cal: p.calories + c.calories + (v ? v.calories : 0), prot: p.protein + c.protein + (v ? v.protein : 0) };
                        combos.push({ name: `${p.name} + ${c.name}${v ? ' + ' + v.name : ''}`, calories: total.cal, protein: total.prot, emoji: getEmoji(p.name),
                            recipe: `Season ${p.serving} of ${p.name.toLowerCase()} with salt, pepper, and garlic powder. Cook on medium-high heat 4-5 min per side. Serve with ${c.serving} of ${c.name.toLowerCase()}${v ? ' and a side of ' + v.name.toLowerCase() + ' (steamed or roasted at 400°F for 15 min)' : ''}.` });
                    }
                }

                if (remaining.calories >= 250 && remaining.protein >= 15) {
                    // Shake/snack combo
                    const shakes = pick('protein', 300).concat(pick('whey', 300));
                    const fruits = pick('banana', 150).concat(pick('blueberr', 150), pick('apple', 150));
                    const fats = pick('peanut butter', 200).concat(pick('almond butter', 200));
                    if (shakes.length > 0) {
                        const s = shakes[Math.floor(Math.random() * shakes.length)];
                        const fr = fruits.length > 0 ? fruits[Math.floor(Math.random() * fruits.length)] : null;
                        const fa = fats.length > 0 ? fats[Math.floor(Math.random() * fats.length)] : null;
                        const total = { cal: s.calories + (fr ? fr.calories : 0) + (fa ? fa.calories : 0), prot: s.protein + (fr ? fr.protein : 0) + (fa ? fa.protein : 0) };
                        combos.push({ name: `Protein Shake Combo`, calories: total.cal, protein: total.prot, emoji: '&#x1F964;',
                            recipe: `Blend 1 scoop of whey protein with ${fr ? fr.serving + ' ' + fr.name.toLowerCase() + ', ' : ''}${fa ? fa.serving + ' ' + fa.name.toLowerCase() + ', ' : ''}8oz water or milk, and ice. Blend until smooth. Quick, easy, and packed with protein.` });
                    }
                }

                if (remaining.calories >= 300) {
                    // Egg-based meal
                    const eggs = db.find(f => f.name === 'Egg (Whole)');
                    const toast = db.find(f => f.name.toLowerCase().includes('wheat bread') || f.name.toLowerCase().includes('bread'));
                    const avo = db.find(f => f.name.toLowerCase().includes('avocado'));
                    if (eggs) {
                        const eggCount = Math.min(4, Math.floor(remaining.protein / eggs.protein));
                        const total = { cal: eggs.calories * eggCount + (toast ? toast.calories : 0) + (avo ? Math.round(avo.calories/2) : 0),
                                        prot: eggs.protein * eggCount + (toast ? toast.protein : 0) + (avo ? Math.round(avo.protein/2) : 0) };
                        combos.push({ name: `${eggCount} Eggs${toast ? ' + Toast' : ''}${avo ? ' + Avocado' : ''}`, calories: total.cal, protein: total.prot, emoji: '&#x1F95A;',
                            recipe: `Scramble ${eggCount} eggs with salt and pepper in a non-stick pan over medium heat. ${toast ? 'Toast ' + toast.serving + ' of bread.' : ''} ${avo ? 'Slice half an avocado on top or on the side.' : ''} Simple, fast, and hits your protein.` });
                    }
                }

                if (remaining.calories >= 200 && remaining.protein >= 10) {
                    // Greek yogurt bowl
                    const yogurt = db.find(f => f.name.toLowerCase().includes('greek yogurt') && f.name.toLowerCase().includes('plain'));
                    const honey = db.find(f => f.name.toLowerCase().includes('honey'));
                    const granola = db.find(f => f.name.toLowerCase().includes('granola'));
                    const berries = db.find(f => f.name.toLowerCase().includes('blueberr') || f.name.toLowerCase().includes('strawberr'));
                    if (yogurt) {
                        const total = { cal: yogurt.calories + (honey ? honey.calories : 0) + (berries ? berries.calories : 0),
                                        prot: yogurt.protein + (berries ? berries.protein : 0) };
                        combos.push({ name: `Greek Yogurt Bowl`, calories: total.cal, protein: total.prot, emoji: '&#x1F963;',
                            recipe: `Scoop ${yogurt.serving} plain Greek yogurt into a bowl. Top with ${berries ? berries.serving + ' ' + berries.name.toLowerCase() + ', ' : 'fresh berries, '}${honey ? 'a drizzle of honey, ' : ''}and a sprinkle of granola or nuts. High protein, creamy, and satisfying.` });
                    }
                }

                if (combos.length > 0) {
                    combos.forEach(combo => {
                        html += `<div style="background:var(--card);padding:12px;border-radius:8px;border:1px solid var(--border);margin:8px 0;">`;
                        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">`;
                        html += `<span style="font-size:26px;">${combo.emoji}</span>`;
                        html += `<div><div style="font-size:14px;font-weight:700;">${combo.name}</div>`;
                        html += `<div style="font-size:12px;color:var(--text-muted);">${combo.calories} cal &middot; ${combo.protein}g protein</div></div>`;
                        html += `</div>`;
                        html += `<div style="font-size:13px;color:var(--text-secondary);line-height:1.5;border-top:1px solid var(--border);padding-top:8px;margin-top:4px;">${combo.recipe}</div>`;
                        html += `</div>`;
                    });
                } else {
                    html += `<p>Log some meals first and I'll suggest combos to fill the gap!</p>`;
                }

                // Tip based on what's missing
                html += `<h3>&#x1F4A1; Tips</h3><ul>`;
                if (remaining.protein > 30) {
                    html += `<li><strong>Protein is your priority.</strong> You're ${remaining.protein}g short — lean meats, Greek yogurt, protein shakes, and eggs are your best friends right now.</li>`;
                }
                if (remaining.calories > 0 && remaining.calories < 300) {
                    html += `<li><strong>Almost there!</strong> A quick snack like a protein bar, Greek yogurt, or handful of nuts will close the gap.</li>`;
                }
                if (remaining.fat > 20) {
                    html += `<li><strong>Healthy fats remaining:</strong> Add avocado, nuts, olive oil, or peanut butter to your next meal.</li>`;
                }
                if (remaining.carbs > 50) {
                    html += `<li><strong>Carbs to fill:</strong> Rice, oats, fruit, or a sweet potato will get you there.</li>`;
                }
                html += `<li>Remember: hitting your protein goal matters most for body composition. Calories second, then carbs/fat.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" });
                return html;
            },
        },
        {
            id: 'progress',
            keywords: ['progress', 'analyze', 'how am i doing', 'my stats', 'report', 'summary', 'overview', 'review'],
            handler: (ctx) => analyzeProgress(ctx),
        },
        {
            id: 'what_next',
            keywords: ['what.*next', 'what should.*work', 'what.*train', 'which muscle', 'what.*focus', 'suggest.*exercise', 'recommend'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>What To Work On Next</h3>`;
                // Find least-trained muscle groups this week
                const sorted = Object.entries(ctx.weekMuscleVolume).sort((a,b) => a[1] - b[1]);
                const neglected = sorted.filter(([,v]) => v === 0);
                const low = sorted.filter(([,v]) => v > 0 && v < 6);

                if (neglected.length > 0) {
                    html += `<p>These muscle groups haven't been hit this week — prioritize them:</p><ul>`;
                    neglected.forEach(([group]) => {
                        const exercises = ctx.muscleMap[group].slice(0, 3);
                        html += `<li><strong>${group.charAt(0).toUpperCase() + group.slice(1)}:</strong> Try ${exercises.join(', ')}</li>`;
                    });
                    html += `</ul>`;
                } else if (low.length > 0) {
                    html += `<p>These muscle groups could use more volume this week:</p><ul>`;
                    low.forEach(([group, sets]) => {
                        html += `<li><strong>${group.charAt(0).toUpperCase() + group.slice(1)}:</strong> ${sets} sets — aim for at least 10</li>`;
                    });
                    html += `</ul>`;
                } else {
                    html += `<p>Great job — you've trained all major muscle groups this week! Consider a rest day or light recovery session.</p>`;
                }

                if (ctx.todayWorkouts.length === 0) {
                    html += insightHtml(`You haven't logged any exercises today. It's a great day to train!`);
                } else {
                    html += insightHtml(`You've already done ${ctx.todayWorkouts.length} exercises today. Nice work!`);
                }

                html += verseHtml();
                return html;
            },
        },
        {
            id: 'plateau',
            keywords: ['plateau', 'stuck', 'not progressing', 'stalled', 'can\'t increase', 'not gaining', 'weight.*same', 'no progress'],
            handler: (ctx) => {
                let html = `<h3>Breaking Through Your Plateau</h3>`;

                if (ctx.stagnant.length > 0) {
                    const unit = wu();
                    html += insightHtml(`I can see these exercises have stagnated: <strong>${ctx.stagnant.join(', ')}</strong>`);
                    html += `<p>Here are specific strategies for each:</p><ul>`;
                    ctx.stagnant.forEach(name => {
                        const pr = ctx.exercisePRs[name] || 0;
                        const prStr = pr > 0 ? ` (stuck at ${lbsToDisplay(pr)} ${unit})` : '';
                        const deloadWt = pr > 0 ? ` Drop to ${lbsToDisplay(Math.round(pr * 0.9))} ${unit} and work back up.` : '';
                        html += `<li><strong>${name}</strong>${prStr}: `;
                        if (name.includes('Bench') || name.includes('Press')) {
                            html += `Try paused reps (2 sec pause at chest), switch grip width, or add close-grip bench as an accessory.${deloadWt}`;
                        } else if (name.includes('Squat')) {
                            html += `Try box squats, add pause squats, or switch to front squats for 2-3 weeks.${deloadWt}`;
                        } else if (name.includes('Deadlift')) {
                            html += `Try deficit deadlifts, add rack pulls, or switch stance (sumo vs conventional).${deloadWt}`;
                        } else {
                            html += `Drop weight by 10%, increase reps to 10-12, then build back up. Or try a close variation.${deloadWt}`;
                        }
                        html += `</li>`;
                    });
                    html += `</ul>`;
                }

                html += `<h3>General Plateau-Busting Strategies</h3><ul>`;
                html += `<li><strong>Deload Week:</strong> Drop to 50-60% of your working weight for 1 week. Your body needs recovery to break through.</li>`;
                html += `<li><strong>Microload:</strong> Use fractional plates (1.25 lbs per side). Small jumps compound over weeks.</li>`;
                html += `<li><strong>Change Rep Scheme:</strong> If you've been doing 5x5, try 4x8 or 3x10 for 3-4 weeks.</li>`;
                html += `<li><strong>Increase Frequency:</strong> Hit the lift 2x per week instead of 1x — more practice = faster progress.</li>`;
                html += `<li><strong>Check Sleep & Nutrition:</strong> You can't out-train a bad diet or poor sleep. 7+ hours sleep, 1g protein per lb bodyweight.</li>`;
                html += `<li><strong>Add Accessories:</strong> Weak points hold back main lifts. Add 2-3 sets of targeted accessory work.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" });
                return html;
            },
        },
        {
            id: 'nutrition_check',
            keywords: ['nutrition', 'calories', 'protein', 'macros', 'how.*nutrition', 'am i eating', 'food.*check', 'diet.*check', 'eating enough'],
            handler: (ctx) => {
                let html = `<h3>Nutrition Analysis</h3>`;
                const calGoal = ctx.profile.calorieGoal || 2000;
                const protGoal = ctx.profile.proteinGoal || 150;

                if (ctx.weekNutrition.days === 0) {
                    html += `<p>You haven't logged any meals recently. Start tracking your food to get personalized nutrition feedback!</p>`;
                    html += `<h3>Quick Guide</h3><ul>`;
                    html += `<li><strong>Protein:</strong> Aim for ${protGoal}g/day (your goal)</li>`;
                    html += `<li><strong>Calories:</strong> Target ${calGoal}/day based on your profile</li>`;
                    html += `<li><strong>Carbs:</strong> 40-50% of calories for active people</li>`;
                    html += `<li><strong>Fat:</strong> At least 0.3g per lb bodyweight for hormones</li>`;
                    html += `</ul>`;
                } else {
                    const avgCal = ctx.weekNutrition.calories;
                    const avgProt = ctx.weekNutrition.protein;
                    const calDiff = avgCal - calGoal;
                    const protDiff = avgProt - protGoal;

                    html += insightHtml(`7-Day Average: <strong>${avgCal} cal</strong> (target: ${calGoal}) | <strong>${avgProt}g protein</strong> (target: ${protGoal}g)`);

                    html += `<h3>Assessment</h3><ul>`;
                    if (Math.abs(calDiff) < 100) {
                        html += `<li>Calories: On target. Great consistency!</li>`;
                    } else if (calDiff > 0) {
                        html += `<li>Calories: You're averaging ${calDiff} cal over your goal. ${ctx.profile.goal === 'gain' ? 'This is fine for building muscle, just don\'t go too far over.' : 'Consider reducing portions slightly or cutting a snack.'}</li>`;
                    } else {
                        html += `<li>Calories: You're averaging ${Math.abs(calDiff)} cal under your goal. ${ctx.profile.goal === 'lose' ? 'A moderate deficit is good, but don\'t drop too low or you\'ll lose muscle.' : 'Try adding a protein shake or extra carbs to your meals.'}</li>`;
                    }

                    if (protDiff >= 0) {
                        html += `<li>Protein: Excellent! You're hitting your target. This is key for ${ctx.profile.goal === 'lose' ? 'preserving muscle on a cut' : 'building muscle'}.</li>`;
                    } else {
                        html += `<li>Protein: You're ${Math.abs(protDiff)}g short. Add protein-dense foods: chicken breast (31g/4oz), Greek yogurt (15g/cup), protein shake (25g/scoop).</li>`;
                    }

                    if (ctx.weekNutrition.days < 5) {
                        html += `<li>Consistency: You only tracked ${ctx.weekNutrition.days}/7 days. The days you don't track are usually the worst. Try to log everything.</li>`;
                    } else {
                        html += `<li>Consistency: ${ctx.weekNutrition.days}/7 days tracked. Solid effort!</li>`;
                    }
                    html += `</ul>`;
                }

                html += verseHtml({ text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" });
                return html;
            },
        },
        {
            id: 'form',
            keywords: ['form', 'technique', 'how to do', 'how do i', 'proper way', 'correct form', 'cue'],
            handler: (ctx, input) => {
                const exerciseForms = {
                    'squat': { title: 'Squat Form Guide', cues: ['Feet shoulder-width apart, toes slightly outward (15-30 degrees)', 'Take a deep breath and brace your core hard before descending', 'Push knees out over your toes — don\'t let them cave in', 'Go to at least parallel (hip crease at or below knee level)', 'Drive up through your whole foot — heel should never leave the ground', 'Keep your chest up and eyes forward throughout', 'Squeeze glutes at the top to fully lock out'], common_mistakes: ['Heels coming up off the ground (work on ankle mobility)', 'Knees caving inward (push them out, strengthen glutes)', '"Butt wink" at the bottom (don\'t go deeper than mobility allows)', 'Leaning too far forward (strengthen upper back, try front squats)'] },
                    'bench': { title: 'Bench Press Form Guide', cues: ['Retract and depress shoulder blades — "put them in your back pockets"', 'Maintain a slight arch in your lower back (natural, not extreme)', 'Grip the bar just outside shoulder width', 'Unrack and position the bar over your shoulders', 'Lower the bar to your lower chest/sternum with control', 'Touch the chest gently — don\'t bounce', 'Press up and slightly back toward the rack', 'Push your feet hard into the floor for leg drive'], common_mistakes: ['Flaring elbows out to 90 degrees (tuck to about 45-75 degrees)', 'Bouncing the bar off your chest', 'Lifting hips off the bench', 'Not retracting shoulder blades (leads to shoulder injuries)'] },
                    'deadlift': { title: 'Deadlift Form Guide', cues: ['Stand with feet hip-width apart, bar over mid-foot', 'Hinge at the hips and grip the bar just outside your shins', 'Drop your hips until shins touch the bar', 'Take a deep breath, brace hard, and pull the slack out of the bar', 'Push the floor away from you rather than pulling the bar up', 'Keep the bar close to your body the entire lift — it should scrape your shins', 'Lock out by squeezing your glutes — don\'t hyperextend your back', 'Lower the bar by hinging at the hips first, then bending knees'], common_mistakes: ['Rounding the lower back (keep it neutral, brace harder)', 'Jerking the bar off the floor (pull the slack out first)', 'Bar drifting away from the body (keep it close)', 'Hyperextending at the top (just stand straight)'] },
                    'overhead press': { title: 'Overhead Press Form Guide', cues: ['Stand with feet shoulder-width apart', 'Bar starts at collarbone/front rack position', 'Squeeze your glutes and brace your core', 'Press straight up — move your head back then forward through the "window"', 'Lock out directly overhead, slightly behind your ears', 'Lower with control back to collarbone'], common_mistakes: ['Excessive back lean (squeeze glutes harder, use less weight)', 'Pressing the bar out in front instead of straight up', 'Not locking out fully overhead', 'Not bracing core (can hurt lower back)'] },
                    'row': { title: 'Barbell Row Form Guide', cues: ['Hinge forward to about 45-60 degrees', 'Grip slightly wider than shoulder width', 'Pull the bar to your lower chest/upper abdomen', 'Squeeze your shoulder blades together at the top', 'Lower with control — 2-3 second eccentric', 'Keep your core tight and back neutral throughout'], common_mistakes: ['Using too much body English/momentum', 'Not going heavy enough (rows should be challenging)', 'Pulling to the belly button instead of lower chest', 'Rounding the upper back'] },
                    'hip thrust': { title: 'Hip Thrust Form Guide', cues: ['Upper back against a bench, feet flat on floor', 'Bar across your hip crease (use a pad)', 'Drive through your heels and squeeze glutes to lift hips', 'At the top, your shins should be vertical', 'Hold the top for 1 second with a hard glute squeeze', 'Lower slowly — 2-3 seconds'], common_mistakes: ['Pushing through toes instead of heels', 'Hyperextending the lower back at the top', 'Not squeezing glutes hard enough at lockout', 'Feet too close or too far from the bench'] },
                    'pull-up': { title: 'Pull-up Form Guide', cues: ['Grip the bar slightly wider than shoulder width', 'Start from a dead hang with arms fully extended', 'Pull your elbows down and back — imagine pulling the bar to your chest', 'Get your chin over the bar at the top', 'Lower slowly and with control to full extension', 'Avoid swinging — if you need to swing, use a band for assistance'], common_mistakes: ['Not going to full extension at bottom (half reps)', 'Kipping or swinging for momentum', 'Only getting forehead to bar level', 'Ignoring pull-ups because they\'re hard (use bands or lat pulldown)'] },
                    'curl': { title: 'Bicep Curl Form Guide', cues: ['Stand tall with elbows pinned at your sides', 'Curl the weight up with control — no swinging', 'Squeeze the bicep hard at the top', 'Lower slowly (3 seconds) for maximum growth', 'Keep your wrists neutral — don\'t flex them'], common_mistakes: ['Swinging the weight with your body', 'Moving your elbows forward (keeps tension off biceps)', 'Going too heavy and using momentum', 'Rushing the lowering phase'] },
                };

                const lower = input.toLowerCase();
                let matched = null;
                for (const [key, data] of Object.entries(exerciseForms)) {
                    if (lower.includes(key)) { matched = data; break; }
                }
                // Fuzzy match
                if (!matched) {
                    if (lower.includes('press') && (lower.includes('overhead') || lower.includes('ohp') || lower.includes('shoulder'))) matched = exerciseForms['overhead press'];
                    else if (lower.includes('bench') || lower.includes('chest press')) matched = exerciseForms['bench'];
                    else if (lower.includes('pull-up') || lower.includes('pullup') || lower.includes('chin')) matched = exerciseForms['pull-up'];
                    else if (lower.includes('row')) matched = exerciseForms['row'];
                    else if (lower.includes('thrust') || lower.includes('glute')) matched = exerciseForms['hip thrust'];
                }

                if (matched) {
                    let html = `<h3>${matched.title}</h3>`;
                    html += `<h3>Key Cues</h3><ol>`;
                    matched.cues.forEach(c => html += `<li>${c}</li>`);
                    html += `</ol><h3>Common Mistakes</h3><ul>`;
                    matched.common_mistakes.forEach(m => html += `<li>${m}</li>`);
                    html += `</ul>`;
                    html += verseHtml({ text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" });
                    return html;
                }

                // Generic form advice
                let html = `<h3>General Form Tips</h3>`;
                html += `<p>I have detailed form guides for these exercises — ask me about any of them:</p><ul>`;
                html += `<li><strong>Squat</strong> — "How do I squat properly?"</li>`;
                html += `<li><strong>Bench Press</strong> — "Bench form tips"</li>`;
                html += `<li><strong>Deadlift</strong> — "How to deadlift"</li>`;
                html += `<li><strong>Overhead Press</strong> — "OHP form"</li>`;
                html += `<li><strong>Barbell Row</strong> — "Row technique"</li>`;
                html += `<li><strong>Pull-ups</strong> — "How to do pull-ups"</li>`;
                html += `<li><strong>Hip Thrust</strong> — "Hip thrust form"</li>`;
                html += `<li><strong>Bicep Curls</strong> — "Curl form"</li>`;
                html += `</ul>`;
                html += `<h3>Universal Rules</h3><ul>`;
                html += `<li>Always warm up with light sets before working weight</li>`;
                html += `<li>Control the weight — if you can't control it, it's too heavy</li>`;
                html += `<li>Full range of motion > heavier weight with partial reps</li>`;
                html += `<li>Brace your core on every compound lift</li>`;
                html += `<li>Film yourself occasionally to check your form</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'motivation',
            keywords: ['motivat', 'tired', 'don\'t feel like', 'giving up', 'quit', 'lazy', 'unmotivated', 'burnout', 'burned out', 'discouraged'],
            handler: (ctx) => {
                let html = `<h3>Keep Going — You've Got This</h3>`;
                const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'friend';

                if (ctx.workouts.length > 0) {
                    const uniqueDays = [...new Set(ctx.workouts.map(w => w.date))].length;
                    const topExercise = Object.entries(ctx.exerciseFreq).sort((a,b) => b[1]-a[1])[0];
                    html += insightHtml(`${name}, look at what you've already accomplished: <strong>${ctx.workouts.length} exercises logged</strong> across <strong>${uniqueDays} training days</strong>. Your most dedicated exercise is <strong>${topExercise[0]}</strong> with ${topExercise[1]} sessions. That's not nothing — that's discipline.`);
                }

                const motivations = [
                    `<p>Here's the truth: motivation is a feeling. It comes and goes like the weather. <strong>Discipline is a decision.</strong> You don't need to feel like working out. You just need to show up.</p>`,
                    `<p>The hardest part of any workout is the first 5 minutes. Put on your shoes, get to the gym, do one warm-up set. That's it. Once you're moving, momentum takes over.</p>`,
                    `<p>Remember: every single person you admire for their fitness had days where they didn't want to train. The difference isn't motivation — it's that they went anyway.</p>`,
                ];
                html += motivations[Math.floor(Math.random() * motivations.length)];

                html += `<h3>Practical Steps for Today</h3><ul>`;
                html += `<li><strong>Scale it down:</strong> Don't skip entirely. Even 20 minutes is better than nothing.</li>`;
                html += `<li><strong>Change it up:</strong> If the gym sounds awful, go for a walk, do bodyweight exercises at home, or try a new activity.</li>`;
                html += `<li><strong>Remove friction:</strong> Lay out your gym clothes tonight. Pack your bag. Make it easy to go.</li>`;
                html += `<li><strong>Find your why:</strong> Write down 3 reasons you started. Put them on your phone wallpaper.</li>`;
                html += `<li><strong>Call a friend:</strong> Accountability partners make showing up feel less optional.</li>`;
                html += `<li><strong>Pray on it:</strong> Ask God for the strength to be a good steward of the body He gave you.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" });
                return html;
            },
        },
        {
            id: 'recovery',
            keywords: ['recover', 'rest', 'sore', 'soreness', 'sleep', 'tired', 'overtraining', 'injury', 'hurt', 'pain', 'deload'],
            handler: (ctx) => {
                let html = `<h3>Recovery: The Real Performance Driver</h3>`;
                html += `<p>You don't grow in the gym \u2014 you grow between sessions. Recovery is where adaptation actually happens.</p>`;

                // Adaptive read on the user's training load
                if (ctx.weekDays >= 6) {
                    html += insightHtml(`You've trained <strong>${ctx.weekDays} days</strong> this week. That's a high-frequency week. Watch for: bar speed dropping, sleep quality dipping, motivation crashing. Any 2 of those = take a day off, no guilt.`);
                } else if (ctx.weekDays === 0 && ctx.workouts.length > 0) {
                    html += insightHtml(`No sessions this week yet. If that's an unscheduled break (vs. a planned deload), get back in tomorrow \u2014 the longer the gap, the harder the return.`);
                }

                html += `<h3>The recovery hierarchy (in priority order)</h3><ol>`;
                html += `<li><strong>Sleep \u2014 7\u20139 hours, every night.</strong> Dattilo et al. 2011: sleep loss reduces muscle protein synthesis by 18%, increases cortisol, drops testosterone. Less than 6 hrs and your training is actively counterproductive. There is no supplement that fixes this.</li>`;
                html += `<li><strong>Protein \u2014 ${ctx.profile.proteinGoal || 150}g across 4 meals.</strong> Schoenfeld & Aragon 2018: 0.4 g/kg per meal optimizes muscle protein synthesis. Distribution beats one giant shake.</li>`;
                html += `<li><strong>Calories \u2014 at or above maintenance.</strong> You can't recover from heavy training in a deficit beyond ~500 kcal. Fueled lifters recover faster, period.</li>`;
                html += `<li><strong>Hydration \u2014 ~0.6 oz per lb of bodyweight.</strong> 2% dehydration measurably reduces strength output and cognitive function (Judelson et al. 2007).</li>`;
                html += `<li><strong>Stress management.</strong> Chronic cortisol blocks recovery. Walks, prayer, breathwork, time outdoors, less doomscrolling.</li>`;
                html += `</ol>`;

                html += `<h3>Deloads \u2014 the science</h3><ul>`;
                html += `<li><strong>Frequency:</strong> every 4\u20138 weeks for intermediates, every 6\u201312 weeks for beginners. Cue: when your top sets feel grindy at weights that should be easy, deload now.</li>`;
                html += `<li><strong>Format:</strong> drop volume by ~50% (e.g. 4 sets \u2192 2 sets) OR drop intensity by ~20% (e.g. 80% \u2192 60% 1RM). Same exercises, just lighter or shorter.</li>`;
                html += `<li><strong>Why it works:</strong> fitness builds slowly, fatigue builds fast. A deload sheds fatigue while preserving fitness, leaving you supercompensated when you return (Issurin 2010).</li>`;
                html += `<li><strong>Don't skip the deload.</strong> Lifters who push through fatigue plateau or get hurt. The deload is the tax that lets the next 4 weeks of growth happen.</li>`;
                html += `</ul>`;

                html += `<h3>Soreness vs. injury \u2014 know the difference</h3><ul>`;
                html += `<li><strong>DOMS (delayed onset muscle soreness):</strong> dull, diffuse, in the muscle belly, 24\u201372 hrs after a session. Normal. Light training is fine.</li>`;
                html += `<li><strong>Injury signals:</strong> sharp, localized, in a joint, gets worse during the lift, accompanied by swelling/numbness/tingling. <strong>Stop, swap the exercise, and if it's not gone in 3\u20135 days, see a physio.</strong></li>`;
                html += `<li><strong>Don't "tough it out."</strong> Cheap soreness becomes chronic tendinopathy fast. The lifters still training in their 50s are the ones who pulled back when it counted.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" });
                return html;
            },
        },
        {
            id: 'beginner',
            keywords: ['beginner', 'start', 'new to', 'never lifted', 'first time', 'getting started', 'just starting', 'newbie', 'no experience'],
            handler: (ctx) => {
                let html = `<h3>Your First 12 Weeks: A Real Beginner's Roadmap</h3>`;
                html += `<p>You're in the most rewarding phase of lifting. Beginners gain strength and muscle <strong>2\u20133x faster</strong> than intermediates (the "newbie gains" curve is real \u2014 see Helms 2014). Don't waste it on a bad program.</p>`;

                html += `<h3>The 6 fundamental movement patterns</h3>`;
                html += `<p>Forget split routines for now. Master these six, and you can build anything later.</p>`;
                html += `<table class="plan-table"><tr><th>Pattern</th><th>Exercise</th><th>Why</th></tr>`;
                html += `<tr><td>Squat</td><td>Goblet \u2192 Back Squat</td><td>Knee-dominant, builds quads/glutes/core</td></tr>`;
                html += `<tr><td>Hinge</td><td>RDL \u2192 Deadlift</td><td>Hip-dominant, builds hamstrings/glutes/back</td></tr>`;
                html += `<tr><td>Lunge</td><td>Reverse Lunge \u2192 Bulgarian Split</td><td>Single-leg strength, fixes asymmetries</td></tr>`;
                html += `<tr><td>Horizontal Push</td><td>Push-up \u2192 Bench Press</td><td>Chest, front delts, triceps</td></tr>`;
                html += `<tr><td>Horizontal Pull</td><td>Inverted Row \u2192 Barbell Row</td><td>Mid-back, posture, shoulder health</td></tr>`;
                html += `<tr><td>Vertical Push</td><td>Overhead Press</td><td>Shoulders, triceps, overhead strength</td></tr>`;
                html += `</table>`;
                html += `<p style="font-size:13px;color:var(--text-muted);">Add a vertical pull (pull-ups / lat pulldown) and you have a complete kinetic chain.</p>`;

                html += `<h3>The 12-week plan</h3><ol>`;
                html += `<li><strong>Weeks 1\u20132: Pattern week.</strong> Learn each lift with just the bar or bodyweight. Sets of 8\u201310, focus 100% on form. Film yourself.</li>`;
                html += `<li><strong>Weeks 3\u20136: Linear progression.</strong> Add 5 lbs to upper body lifts and 10 lbs to lower body lifts <em>every session</em>. This works because you're so far below your true ceiling.</li>`;
                html += `<li><strong>Weeks 7\u201310: Slow it down.</strong> Now add weight only when you complete all reps with 1\u20132 reps in reserve. Switch to 5 lbs/10 lbs <em>per week</em>.</li>`;
                html += `<li><strong>Weeks 11\u201312: First deload + reassess.</strong> Drop weights 30% for 1 week. Then test your top sets and start a slightly more advanced program.</li>`;
                html += `</ol>`;

                html += `<h3>Frequency: 3 full-body sessions per week</h3>`;
                html += `<p>Beginners benefit from <strong>high frequency, low volume</strong>. The Schoenfeld 2016 frequency meta showed 2\u20133x per muscle per week beats 1x at every level \u2014 and full-body 3x is the most efficient way to hit that for beginners. Save splits for when your work capacity catches up.</p>`;

                html += `<h3>The non-negotiables</h3><ul>`;
                html += `<li><strong>Protein: 0.7\u20131.0 g per lb of bodyweight</strong>. The single biggest nutrition lever.</li>`;
                html += `<li><strong>Sleep: 7\u20139 hours</strong>. Beginners under-slept gain ~30% less muscle than well-rested controls.</li>`;
                html += `<li><strong>Track every set.</strong> Log it here. Memory is unreliable; the spreadsheet doesn't lie.</li>`;
                html += `<li><strong>Two warm-up sets</strong> at 50% and 75% before your working weight on every compound. Always.</li>`;
                html += `<li><strong>Patience.</strong> First visible changes: 6\u20138 weeks. Real strength: 12\u201316 weeks. Don't compare your week 4 to someone's year 4.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" });
                return html;
            },
        },
        {
            id: 'weight_loss',
            keywords: ['lose weight', 'weight loss', 'fat loss', 'cutting', 'cut', 'slim', 'lean', 'shred', 'burn fat', 'belly fat', 'lose fat'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>Fat Loss, Done Right</h3>`;

                // Adaptive personalized math (Mifflin-St Jeor + activity)
                if (ctx.currentWeight > 0) {
                    const { tdee, wt } = computeTDEE(ctx);
                    const lbs = wt;
                    const cutCal = tdee - 500;
                    const aggressive = tdee - 750;
                    const proteinG = Math.round(lbs * 1.0);
                    html += insightHtml(`At ${lbsToDisplay(lbs)}${unit}, your estimated maintenance is ~<strong>${tdee} kcal/day</strong> (Mifflin-St Jeor BMR \u00d7 activity). For sustainable fat loss, eat <strong>${cutCal} kcal</strong> with <strong>${proteinG}g protein</strong>. If you want to push harder, ${aggressive} kcal is the floor I'd recommend.`);
                }

                html += `<h3>What the research actually says</h3><ol>`;
                html += `<li><strong>Deficit size: 0.5\u20131% of bodyweight per week.</strong> Helms et al. (2014) showed faster cuts (>1%/wk) cause significantly more lean mass loss in trained lifters. Slow is the cheat code.</li>`;
                html += `<li><strong>Protein: 1.6\u20132.4 g/kg (0.7\u20131.1 g/lb).</strong> Morton et al. 2018 meta-analysis (n=1,863) confirms anything beyond ~1.6 g/kg has minimal added benefit for hypertrophy \u2014 but in a deficit, the upper end (2.0\u20132.4 g/kg) is muscle insurance. Spread across 4 meals.</li>`;
                html += `<li><strong>Keep lifting heavy.</strong> Longland et al. 2016: cutting subjects on a high-protein diet who lifted heavy actually <em>gained</em> 1.2 kg of muscle while losing 4.8 kg of fat. "Toning" (light weights, high reps) is not how you preserve mass.</li>`;
                html += `<li><strong>Carbs are not the enemy.</strong> Carb intake correlates with training performance and adherence. Drop fat first (to ~0.3 g/lb minimum), keep carbs to fuel lifts.</li>`;
                html += `<li><strong>Diet breaks every 8\u201312 weeks.</strong> The MATADOR study (Byrne 2018) showed intermittent dieters lost more fat and regained less than continuous dieters. Plan a 1-week return to maintenance.</li>`;
                html += `<li><strong>Track for at least 2 weeks before adjusting.</strong> Self-reported intake underestimates by 20\u201350% on average (Lichtman et al.). The Nutrition tab is your friend.</li>`;
                html += `</ol>`;

                html += `<h3>How to read the scale</h3><ul>`;
                html += `<li><strong>Weigh daily, average weekly.</strong> Day-to-day fluctuations of 2\u20135 lbs are water, glycogen, and gut content \u2014 not fat.</li>`;
                html += `<li><strong>Use a 7-day rolling average.</strong> If this week's average < last week's by 0.5\u20131% bodyweight, your deficit is dialed in.</li>`;
                html += `<li><strong>Photos > scale.</strong> Take a progress photo every 2 weeks. Body recomposition often hides on the scale but shows in the mirror.</li>`;
                html += `</ul>`;

                html += `<h3>The eating playbook</h3><ul>`;
                html += `<li><strong>Volume eating:</strong> chicken breast, white fish, egg whites, Greek yogurt 0%, lean beef 93/7. High protein per calorie keeps you full.</li>`;
                html += `<li><strong>Fibrous veg with every meal:</strong> 1\u20132 cups. Bulk + micronutrients + satiety.</li>`;
                html += `<li><strong>Drop liquid calories.</strong> Soda, juice, sweetened coffees \u2014 they don't trigger satiety. Switch to zero-cal.</li>`;
                html += `<li><strong>Fiber: 25\u201340 g/day.</strong> Massive impact on hunger. Berries, oats, vegetables, lentils.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "No discipline seems pleasant at the time, but painful. Later on it produces a harvest of righteousness.", ref: "Hebrews 12:11" });
                return html;
            },
        },
        {
            id: 'muscle_gain',
            keywords: ['build muscle', 'gain muscle', 'bulk', 'bulking', 'get big', 'hypertrophy', 'mass', 'size', 'grow', 'muscle gain'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>Hypertrophy: What the Research Actually Shows</h3>`;

                // Adaptive personalized calorie + protein target
                if (ctx.currentWeight > 0) {
                    const { tdee, wt: lbs } = computeTDEE(ctx);
                    const surplus = tdee + 250;
                    const aggressiveSurplus = tdee + 400;
                    const proteinG = Math.round(lbs * 0.8);
                    html += insightHtml(`At ${lbsToDisplay(lbs)}${unit}, your maintenance is ~<strong>${tdee} kcal</strong>. Lean bulk: <strong>${surplus} kcal</strong>. Faster bulk (more fat gain): <strong>${aggressiveSurplus} kcal</strong>. Protein target: <strong>${proteinG}g</strong>.`);
                }

                html += `<h3>The Schoenfeld hypertrophy framework</h3>`;
                html += `<p>Brad Schoenfeld is the most-cited researcher in muscle growth. The current evidence rests on three pillars:</p>`;
                html += `<ol>`;
                html += `<li><strong>Mechanical tension</strong> \u2014 lift heavy enough to recruit high-threshold motor units. Anywhere from 30\u201385% 1RM works for hypertrophy as long as sets are taken close to failure (Schoenfeld 2017 meta).</li>`;
                html += `<li><strong>Progressive overload</strong> \u2014 add reps or weight session over session. Without it, no growth signal.</li>`;
                html += `<li><strong>Volume</strong> \u2014 dose-response up to ~20 hard sets per muscle per week (Schoenfeld 2017, Baz-Valle 2022). More than that and returns flatten.</li>`;
                html += `</ol>`;

                html += `<h3>The numbers that matter</h3><ul>`;
                html += `<li><strong>Volume: 10\u201320 hard sets per muscle per week.</strong> Beginners thrive on 10\u201312, intermediates on 14\u201318, advanced on 18\u201322. A "hard set" = within 0\u20133 reps of failure (RIR 0\u20133).</li>`;
                html += `<li><strong>Frequency: 2x per muscle per week beats 1x.</strong> Schoenfeld 2016 meta: matched volume, higher frequency = significantly more growth. Push/pull/legs 2x or upper/lower 4x is gold standard.</li>`;
                html += `<li><strong>Rep range: 5\u201330 reps all build muscle</strong> (Schoenfeld 2017) when taken near failure. The sweet spot for joint health + volume tolerance is <strong>6\u201312</strong> on compounds, <strong>8\u201315</strong> on isolation.</li>`;
                html += `<li><strong>Rest: 2\u20133 minutes on compounds, 1\u20132 on isolation.</strong> Schoenfeld 2016 directly compared 1-min vs 3-min rest: long rest produced 67% more muscle thickness gain. Cutting rest short to "save time" actively costs you growth.</li>`;
                html += `<li><strong>Proximity to failure: RIR 0\u20133.</strong> You don't have to grind every set, but the last 5 reps need to feel like work. Helms et al. 2022 showed RIR 1\u20133 builds muscle equivalently to going to failure with less fatigue cost.</li>`;
                html += `</ul>`;

                html += `<h3>Nutrition for growth</h3><ul>`;
                html += `<li><strong>Surplus: +200\u2013400 kcal/day.</strong> Targets a lean 0.25\u20130.5% bw/wk gain (Aragon & Schoenfeld 2020). More than that = mostly fat.</li>`;
                html += `<li><strong>Protein: 1.6\u20132.2 g/kg (0.7\u20131.0 g/lb).</strong> Morton et al. 2018 meta: returns plateau hard above 1.6 g/kg. Don't chase 1.5 g/lb \u2014 it's expensive and unnecessary.</li>`;
                html += `<li><strong>Distribution matters.</strong> 0.4 g/kg per meal across 4 meals maximizes muscle protein synthesis (Schoenfeld & Aragon 2018).</li>`;
                html += `<li><strong>Carbs fuel volume.</strong> 3\u20135 g/kg/day on training days. Low-carb cuts your work capacity and recovery.</li>`;
                html += `</ul>`;

                html += `<h3>The 4 mistakes that kill bulks</h3><ul>`;
                html += `<li><strong>Dirty bulking.</strong> A 1000 kcal surplus doesn't grow muscle 4x faster \u2014 your body has a hard ceiling on how much muscle it can synthesize per week. Excess goes to fat.</li>`;
                html += `<li><strong>Program hopping.</strong> Stay on one program for 8\u201312 weeks minimum. Progressive overload only works if you have a baseline to overload from.</li>`;
                html += `<li><strong>Skipping legs.</strong> Lower body has the largest muscle mass and highest growth potential per session. Skipping it caps your results.</li>`;
                html += `<li><strong>Junk volume.</strong> 5 sets of curls 1 day apart \u2260 5 hard sets. If you're not within 3 reps of failure, the set barely counts toward your weekly total.</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "She sets about her work vigorously; her arms are strong for her tasks.", ref: "Proverbs 31:17" });
                return html;
            },
        },
        {
            id: 'one_rep_max',
            keywords: ['1rm', 'one rep max', 'my.*max', 'estimated.*max', 'max.*bench', 'max.*squat', 'max.*deadlift', 'max.*press', 'how much can i', 'how much do i', 'e1rm', 'rep max', 'strongest', 'heaviest'],
            handler: (ctx, input) => {
                const unit = wu();
                let html = `<h3>Estimated 1RM</h3>`;
                if (ctx.workouts.length === 0) {
                    html += `<p>You don't have any workout data logged yet. Head over to the <strong>Workout</strong> tab and log some exercises with weights and reps — then come back and I'll calculate your estimated one-rep max for each lift!</p>`;
                    html += verseHtml();
                    return html;
                }
                // Find which exercise user is asking about, or show top lifts
                const lower = input.toLowerCase();
                const compounds = ['Bench Press','Squat','Deadlift','Overhead Press','Barbell Row'];
                let targets = compounds;
                for (const c of compounds) {
                    if (lower.includes(c.toLowerCase().split(' ')[0])) { targets = [c]; break; }
                }
                let found = false;
                targets.forEach(name => {
                    const logs = ctx.exercisesByName[name];
                    if (!logs || logs.length === 0) return;
                    const last = logs[logs.length - 1];
                    const bestSet = last.sets.reduce((a, b) => (a.weight > b.weight ? a : b), last.sets[0]);
                    if (bestSet.weight > 0 && bestSet.reps > 0) {
                        // Epley formula: 1RM = weight × (1 + reps/30)
                        const e1rm = Math.round(bestSet.weight * (1 + bestSet.reps / 30));
                        found = true;
                        html += insightHtml(`<strong>${name}:</strong> ${lbsToDisplay(bestSet.weight)} ${unit} x ${bestSet.reps} reps → Est. 1RM: <strong>${lbsToDisplay(e1rm)} ${unit}</strong>`);
                    }
                });
                if (!found) {
                    html += `<p>You have workout data, but no logged sets for the main compound lifts (Bench Press, Squat, Deadlift, Overhead Press, Barbell Row) with weight and reps. Log some sets for these exercises and I'll crunch the numbers!</p>`;
                } else {
                    html += `<p style="font-size:13px;color:var(--text-secondary)">Calculated using the Epley formula. Test your actual 1RM with a spotter for accuracy.</p>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'warmup',
            keywords: ['warm up', 'warmup', 'warm-up', 'stretching', 'stretch', 'before workout', 'pre workout routine', 'dynamic stretch'],
            handler: (ctx) => {
                let html = `<h3>The RAMP Warm-Up Protocol</h3>`;
                html += `<p>RAMP = <strong>Raise, Activate, Mobilize, Potentiate</strong>. It's the framework UK Strength &amp; Conditioning uses with elite athletes \u2014 8\u201312 minutes, science-backed, no foam roller theatrics.</p>`;
                html += insightHtml(`<strong>Skip static stretching before lifting.</strong> Behm et al. 2016 (meta of 125 studies): static stretching held >60 sec reduces strength output by <strong>~5%</strong>. Save it for after the session.`);

                html += `<h3>The 4 stages</h3><ol>`;
                html += `<li><strong>Raise (2\u20133 min):</strong> Light cardio to raise core temp + heart rate. Bike, jog, jump rope.</li>`;
                html += `<li><strong>Activate (2\u20133 min):</strong> Wake up the muscles you'll train. Glute bridges, scap push-ups, band pull-aparts.</li>`;
                html += `<li><strong>Mobilize (2\u20133 min):</strong> Dynamic ROM through the joints you'll use. World's greatest stretch, leg swings, T-spine rotations.</li>`;
                html += `<li><strong>Potentiate (2\u20133 min):</strong> 2\u20133 ramping warm-up sets at 50%, 70%, 85% of your top set. Primes the nervous system for the heavy work.</li>`;
                html += `</ol>`;

                html += `<h3>Lift-specific warm-ups (before working sets)</h3>`;
                // Check what they've trained today or suggest general
                const todayMuscles = new Set();
                ctx.todayWorkouts.forEach(w => {
                    for (const [group, exercises] of Object.entries(ctx.muscleMap)) {
                        if (exercises.some(e => w.name.toLowerCase() === e.toLowerCase())) todayMuscles.add(group);
                    }
                });
                const warmups = {
                    chest: ['Arm circles (20 each direction)', 'Band pull-aparts (15)', 'Push-ups (2×10 light)'],
                    back: ['Cat-cow stretches (10)', 'Band pull-aparts (15)', 'Light lat pulldown (2×12)'],
                    shoulders: ['Arm circles (20 each direction)', 'Band dislocates (15)', 'Empty bar press (2×10)'],
                    legs: ['Bodyweight squats (15)', 'Leg swings front/side (10 each)', 'Walking lunges (10 steps)', 'Hip circles (10 each)'],
                    biceps: ['Arm circles (15)', 'Light curls (15 reps)', 'Wrist circles (10 each)'],
                    triceps: ['Arm circles (15)', 'Light pushdowns (15)', 'Overhead stretch (15s each)'],
                    core: ['Cat-cow (10)', 'Dead bug (10)', 'Bird dog (10 each side)'],
                };
                if (todayMuscles.size > 0) {
                    html += `<p>Based on today's training:</p>`;
                    todayMuscles.forEach(g => {
                        if (warmups[g]) {
                            html += `<p><strong>${g.charAt(0).toUpperCase() + g.slice(1)}:</strong></p><ul>`;
                            warmups[g].forEach(w => html += `<li>${w}</li>`);
                            html += `</ul>`;
                        }
                    });
                } else {
                    html += `<p>Full-body warm-up (5 min):</p><ol>`;
                    html += `<li>Jumping jacks or light jog — 2 min</li>`;
                    html += `<li>Arm circles — 15 each direction</li>`;
                    html += `<li>Bodyweight squats — 15 reps</li>`;
                    html += `<li>Leg swings (front & side) — 10 each leg</li>`;
                    html += `<li>Hip circles — 10 each direction</li>`;
                    html += `<li>Band pull-aparts — 15 reps</li>`;
                    html += `<li>Cat-cow stretches — 10 reps</li>`;
                    html += `</ol>`;
                    html += `<p>Then do 2 light warm-up sets of your first exercise before working weight.</p>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'supplements',
            keywords: ['supplement', 'creatine', 'protein powder', 'pre.?workout', 'bcaa', 'vitamins', 'whey', 'casein', 'beta alanine', 'citrulline'],
            handler: (ctx) => {
                let html = `<h3>Supplements: What's Worth Your Money</h3>`;
                html += `<p>The supplement industry is a 50-billion-dollar machine selling 5-billion dollars of actual benefit. Here's what survives a real evidence review (Kreider et al. 2018; ISSN position stands).</p>`;

                html += `<h3>Tier 1 \u2014 Strong evidence, take these</h3>`;
                html += `<table class="plan-table"><tr><th>Supplement</th><th>Dose</th><th>What it does</th></tr>`;
                html += `<tr><td>Creatine monohydrate</td><td>3\u20135 g/day, any time</td><td>~5\u201315% strength gain, ~1\u20132 kg lean mass over 8\u201312 weeks. Most-studied legal performance aid in history. No loading needed (Antonio et al. 2021).</td></tr>`;
                html += `<tr><td>Whey or casein protein</td><td>20\u201340 g per serving</td><td>Convenience tool for hitting your daily protein target (${ctx.profile.proteinGoal || 150}g). Not magic \u2014 food protein works the same.</td></tr>`;
                html += `<tr><td>Caffeine</td><td>3\u20136 mg/kg, 30\u201360 min pre-workout</td><td>2\u20137% strength and endurance boost (Grgic 2018 meta). Coffee works. Don't take after 2 PM.</td></tr>`;
                html += `<tr><td>Vitamin D3</td><td>2,000\u20134,000 IU/day</td><td>Most lifters in northern climates are deficient. Linked to strength, immunity, and testosterone. Get a blood test if you can.</td></tr>`;
                html += `</table>`;

                html += `<h3>Tier 2 \u2014 Modest evidence, situational</h3>`;
                html += `<table class="plan-table"><tr><th>Supplement</th><th>Dose</th><th>When</th></tr>`;
                html += `<tr><td>Beta-alanine</td><td>3\u20135 g/day</td><td>Helps in 60\u2013240 second efforts (high-rep sets, conditioning). Modest 2\u20133% benefit (Saunders 2017 meta). Causes harmless tingles.</td></tr>`;
                html += `<tr><td>Citrulline malate</td><td>6\u20138 g, 30 min pre</td><td>Improves endurance and pump. Mixed evidence on strength.</td></tr>`;
                html += `<tr><td>Fish oil (EPA/DHA)</td><td>1\u20133 g/day combined</td><td>Joint health, recovery, cardiovascular. Skip if you eat fatty fish 2x/week.</td></tr>`;
                html += `<tr><td>Magnesium glycinate</td><td>300\u2013400 mg before bed</td><td>Sleep quality, muscle relaxation. Most people are mildly deficient.</td></tr>`;
                html += `<tr><td>Ashwagandha</td><td>300\u2013600 mg/day</td><td>Modest stress/cortisol reduction. Some evidence for strength gains in trained subjects (Wankhede 2015).</td></tr>`;
                html += `</table>`;

                html += `<h3>Tier 3 \u2014 Skip these</h3><ul>`;
                html += `<li><strong>BCAAs</strong> \u2014 The ISSN's 2017 review concluded they're useless if you eat enough whole protein. Wolfe (2017): "BCAA supplements... do not promote muscle protein synthesis." You're paying for amino acids you already get from chicken.</li>`;
                html += `<li><strong>Glutamine</strong> \u2014 No effect on muscle gain or recovery in healthy lifters.</li>`;
                html += `<li><strong>"Test boosters"</strong> \u2014 Tribulus, fenugreek, etc. Don't raise testosterone in normal men. Marketing only.</li>`;
                html += `<li><strong>Fat burners</strong> \u2014 Mostly caffeine + filler. Buy coffee for $0.50/cup instead.</li>`;
                html += `<li><strong>Most pre-workout blends</strong> \u2014 You're paying $40 for ~150 mg caffeine + a "proprietary blend" of underdosed garbage. Buy caffeine pills + citrulline powder separately for 1/5 the cost.</li>`;
                html += `</ul>`;

                html += `<h3>Stack for ~$25/month that actually works</h3><ul>`;
                html += `<li>5 g creatine monohydrate \u2014 daily, any time</li>`;
                html += `<li>200 mg caffeine + 6 g citrulline 30 min pre-workout</li>`;
                html += `<li>2,000 IU vitamin D3 with breakfast</li>`;
                html += `<li>Whey protein <em>only if</em> food protein isn't getting you to target</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'weekly_recap',
            keywords: ['weekly recap', 'week.*summary', 'this week.*vs', 'compare.*week', 'weekly report', 'how was my week', 'week review'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>Weekly Recap</h3>`;
                if (ctx.workouts.length === 0) {
                    html += `<p>No workout data yet! Log some exercises in the <strong>Workout</strong> tab this week, then come back for your weekly recap.</p>`;
                    html += verseHtml();
                    return html;
                }
                // This week
                const thisWeekDays = ctx.weekDays;
                const thisWeekSets = ctx.weekWorkouts.reduce((s, w) => s + w.sets.length, 0);
                // Last week
                const twoWeeksAgo = new Date();
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                const twoWeekStr = twoWeeksAgo.toISOString().split('T')[0];
                const weekAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                const lastWeekWorkouts = ctx.workouts.filter(w => w.date >= twoWeekStr && w.date < weekAgoStr);
                const lastWeekDays = [...new Set(lastWeekWorkouts.map(w => w.date))].length;
                const lastWeekSets = lastWeekWorkouts.reduce((s, w) => s + w.sets.length, 0);

                html += `<table class="plan-table"><tr><th></th><th>This Week</th><th>Last Week</th><th>Change</th></tr>`;
                const daysDiff = thisWeekDays - lastWeekDays;
                const setsDiff = thisWeekSets - lastWeekSets;
                html += `<tr><td>Training Days</td><td>${thisWeekDays}</td><td>${lastWeekDays}</td><td>${daysDiff > 0 ? '+' : ''}${daysDiff}</td></tr>`;
                html += `<tr><td>Total Sets</td><td>${thisWeekSets}</td><td>${lastWeekSets}</td><td>${setsDiff > 0 ? '+' : ''}${setsDiff}</td></tr>`;

                if (ctx.weekNutrition.days > 0) {
                    html += `<tr><td>Avg Calories</td><td>${ctx.weekNutrition.calories}</td><td>—</td><td>—</td></tr>`;
                    html += `<tr><td>Avg Protein</td><td>${ctx.weekNutrition.protein}g</td><td>—</td><td>—</td></tr>`;
                }
                html += `</table>`;

                // Muscle coverage
                const hitGroups = Object.entries(ctx.weekMuscleVolume).filter(([,v]) => v > 0).length;
                const totalGroups = Object.keys(ctx.weekMuscleVolume).length;
                html += insightHtml(`Muscle coverage: <strong>${hitGroups}/${totalGroups}</strong> groups trained this week.`);

                if (thisWeekSets > lastWeekSets) html += `<p>Volume is up — great progress!</p>`;
                else if (thisWeekSets < lastWeekSets && lastWeekSets > 0) html += `<p>Volume is down from last week. Life happens — just stay consistent.</p>`;

                html += verseHtml();
                return html;
            },
        },
        {
            id: 'rest_timer',
            keywords: ['rest time', 'rest period', 'how long.*rest', 'rest between', 'rest timer', 'break between', 'how long.*between.*set'],
            handler: (ctx) => {
                const goal = ctx.profile.goal || 'maintain';
                const goalLabel = goal === 'lose' ? 'fat loss' : goal === 'gain' ? 'muscle building' : 'general fitness';
                let html = `<h3>Rest Periods: Longer Than You Think</h3>`;
                html += insightHtml(`Since your goal is <strong>${goalLabel}</strong>, focus on <strong>${goal === 'lose' ? '60-90 sec (isolation) and 2-3 min (compounds)' : '2-3 min (compounds) and 90-120 sec (isolation)'}</strong>. Preserve strength to preserve muscle.`);
                html += insightHtml(`Schoenfeld 2016 directly compared <strong>1-min vs 3-min rest</strong> for hypertrophy: 3-min produced <strong>67% more muscle thickness gain</strong>. The "short rest = pump = growth" idea is one of bro-science's worst leftovers.`);

                html += `<h3>The current evidence</h3>`;
                html += `<table class="plan-table"><tr><th>Goal</th><th>Rep Range</th><th>Rest</th><th>Why</th></tr>`;
                html += `<tr><td><strong>Pure strength</strong></td><td>1\u20135 reps</td><td>3\u20135 min</td><td>Full ATP-PCr recovery for max neural output. Anything less and your top set drops weight.</td></tr>`;
                html += `<tr><td><strong>Hypertrophy (compounds)</strong></td><td>6\u201312 reps</td><td>2\u20133 min</td><td>Long enough to maintain reps + load (the real growth driver), short enough to fit volume.</td></tr>`;
                html += `<tr><td><strong>Hypertrophy (isolation)</strong></td><td>8\u201315 reps</td><td>60\u2013120 sec</td><td>Smaller muscles recover faster. Cable curls don't need 3 min.</td></tr>`;
                html += `<tr><td><strong>Endurance / metcon</strong></td><td>15+ reps</td><td>30\u201360 sec</td><td>Keeps heart rate up. Different goal entirely.</td></tr>`;
                html += `</table>`;

                html += `<h3>How to know if you rested enough</h3><ul>`;
                html += `<li><strong>The "talk test"</strong> \u2014 you should be able to speak in full sentences before the next set. If you're still panting, wait.</li>`;
                html += `<li><strong>The "rep drop" check</strong> \u2014 if your second set drops more than 1\u20132 reps from the first at the same weight, you didn't rest long enough.</li>`;
                html += `<li><strong>Watch the clock, not the feeling.</strong> Most lifters wildly underestimate rest time \u2014 90 seconds feels like 3 minutes when you're tired.</li>`;
                html += `</ul>`;

                html += `<h3>Time-saving moves (without sabotaging gains)</h3><ul>`;
                html += `<li><strong>Antagonist supersets:</strong> Bench + row, squat + leg curl. Rest the muscle you just trained while working its opposite. Saves time without cutting recovery.</li>`;
                html += `<li><strong>Stretch the bored muscle:</strong> Foam roll a different body part during rest \u2014 active recovery without raising overall fatigue.</li>`;
                html += `<li><strong>Cluster sets:</strong> Break a heavy set of 6 into 2+2+2 with 20 sec rest. Maintains load with less total fatigue (Tufano et al. 2017).</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'exercise_swap',
            keywords: ['swap', 'alternative', 'instead of', 'replace', 'substitute', 'can\'t do', 'replacement', 'variation'],
            handler: (ctx, input) => {
                const swaps = {
                    'bench press': ['Dumbbell Bench Press', 'Machine Chest Press', 'Push-ups (weighted)', 'Floor Press'],
                    'squat': ['Leg Press', 'Goblet Squat', 'Hack Squat', 'Bulgarian Split Squat'],
                    'deadlift': ['Romanian Deadlift', 'Trap Bar Deadlift', 'Hip Thrust', 'Good Mornings'],
                    'overhead press': ['Seated Dumbbell Press', 'Arnold Press', 'Machine Shoulder Press', 'Landmine Press'],
                    'pull-ups': ['Lat Pulldown', 'Assisted Pull-ups', 'Chin-ups', 'Band-assisted Pull-ups'],
                    'barbell row': ['Dumbbell Row', 'Seated Cable Row', 'T-Bar Row', 'Chest-Supported Row'],
                    'leg press': ['Squat', 'Hack Squat', 'Bulgarian Split Squat', 'Goblet Squat'],
                    'bicep curls': ['Hammer Curls', 'EZ Bar Curl', 'Cable Curl', 'Concentration Curls'],
                    'tricep pushdown': ['Overhead Tricep Extension', 'Skull Crushers', 'Diamond Push-ups', 'Tricep Dips'],
                    'lateral raises': ['Cable Lateral Raise', 'Machine Lateral Raise', 'Upright Row', 'Band Lateral Raise'],
                    'hip thrust': ['Glute Bridge', 'Cable Pull-through', 'Romanian Deadlift', 'Step-ups'],
                };
                const lower = input.toLowerCase();
                let html = `<h3>Exercise Alternatives</h3>`;
                let found = false;
                for (const [exercise, alts] of Object.entries(swaps)) {
                    if (lower.includes(exercise) || lower.includes(exercise.split(' ')[0])) {
                        html += `<p>Instead of <strong>${exercise.charAt(0).toUpperCase() + exercise.slice(1)}</strong>, try:</p><ol>`;
                        alts.forEach(a => html += `<li><strong>${a}</strong></li>`);
                        html += `</ol>`;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    html += `<p>Tell me which exercise you want to swap and I'll suggest alternatives. For example:</p><ul>`;
                    html += `<li>"Alternative to bench press"</li>`;
                    html += `<li>"What can I do instead of squats?"</li>`;
                    html += `<li>"Swap for pull-ups"</li>`;
                    html += `</ul>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'goal_timeline',
            keywords: ['timeline', 'how long.*until', 'when will i', 'how long.*take', 'predict', 'projection', 'goal.*date', 'reach.*goal'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>Progress Projection</h3>`;
                if (ctx.workouts.length === 0 && ctx.weights.length === 0) {
                    html += `<p>I need some data to project your progress. Start logging workouts and body weight in the app, and after a couple weeks I'll be able to estimate timelines for your goals!</p>`;
                    html += verseHtml();
                    return html;
                }
                // Weight goal projection
                if (ctx.weights.length >= 4) {
                    const recent = ctx.weights.slice(-8);
                    const first = recent[0];
                    const last = recent[recent.length - 1];
                    const days = Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / 86400000));
                    const ratePerWeek = ((last.weight - first.weight) / days) * 7;
                    if (Math.abs(ratePerWeek) > 0.1) {
                        const goalWeight = ctx.profile.goal === 'lose' ? ctx.currentWeight - 20 : ctx.currentWeight + 15;
                        const diff = goalWeight - ctx.currentWeight;
                        const weeksNeeded = Math.abs(diff / ratePerWeek);
                        const targetDate = new Date();
                        targetDate.setDate(targetDate.getDate() + weeksNeeded * 7);
                        html += insightHtml(`At your current rate of <strong>${ratePerWeek > 0 ? '+' : ''}${(parseFloat(lbsToDisplay(Math.abs(ratePerWeek)))).toFixed(1)} ${unit}/week</strong>, you'd reach <strong>${lbsToDisplay(goalWeight)} ${unit}</strong> by approximately <strong>${targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>.`);
                    } else {
                        html += `<p>Your weight has been stable. Set a clear goal in your profile to get a timeline.</p>`;
                    }
                }
                // Lift projections
                const compounds = ['Bench Press', 'Squat', 'Deadlift'];
                let liftProjections = false;
                compounds.forEach(name => {
                    const logs = ctx.exercisesByName[name];
                    if (!logs || logs.length < 4) return;
                    const early = logs.slice(0, Math.min(3, logs.length));
                    const late = logs.slice(-3);
                    const earlyMax = Math.max(...early.map(l => Math.max(...l.sets.map(s => s.weight))));
                    const lateMax = Math.max(...late.map(l => Math.max(...l.sets.map(s => s.weight))));
                    const sessions = logs.length;
                    const gainPerSession = (lateMax - earlyMax) / Math.max(1, sessions - 1);
                    if (gainPerSession > 0) {
                        if (!liftProjections) { html += `<h3>Lift Projections</h3>`; liftProjections = true; }
                        const nextMilestone = Math.ceil(lateMax / 25) * 25 + 25;
                        const sessionsNeeded = Math.ceil((nextMilestone - lateMax) / gainPerSession);
                        html += insightHtml(`<strong>${name}:</strong> Current best ${lbsToDisplay(lateMax)} ${unit} → <strong>${lbsToDisplay(nextMilestone)} ${unit}</strong> in ~${sessionsNeeded} sessions`);
                    }
                });
                if (ctx.weights.length < 4 && !liftProjections) {
                    html += `<p>I need more data to project timelines. Keep logging workouts and weight for 2+ weeks!</p>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'streak',
            keywords: ['streak', 'consistency', 'how consistent', 'how many days.*row', 'discipline', 'attendance'],
            handler: (ctx) => {
                let html = `<h3>Consistency Tracker</h3>`;
                if (ctx.workouts.length === 0) {
                    html += `<p>No workouts yet. Start your streak today!</p>`;
                    return html + verseHtml();
                }
                // Calculate weekly streak
                const workoutDates = [...new Set(ctx.workouts.map(w => w.date))].sort();
                const weeks = {};
                workoutDates.forEach(d => {
                    const dt = new Date(d);
                    const weekStart = new Date(dt);
                    weekStart.setDate(dt.getDate() - dt.getDay());
                    const key = weekStart.toISOString().split('T')[0];
                    weeks[key] = (weeks[key] || 0) + 1;
                });
                const weekKeys = Object.keys(weeks).sort().reverse();
                let weekStreak = 0;
                for (const k of weekKeys) {
                    if (weeks[k] > 0) weekStreak++;
                    else break;
                }
                const totalDays = workoutDates.length;
                const firstDate = workoutDates[0];
                const daysSinceStart = Math.max(1, Math.round((Date.now() - new Date(firstDate)) / 86400000));
                const avgPerWeek = (totalDays / daysSinceStart * 7).toFixed(1);

                html += insightHtml(`
                    Training days total: <strong>${totalDays}</strong><br>
                    Active weeks in a row: <strong>${weekStreak} week${weekStreak !== 1 ? 's' : ''}</strong><br>
                    Average: <strong>${avgPerWeek} days/week</strong> since you started
                `);
                if (weekStreak >= 4) html += `<p>Incredible consistency! You're building something real.</p>`;
                else if (weekStreak >= 2) html += `<p>Solid streak going. Keep showing up!</p>`;
                else html += `<p>Every journey starts with day one. Build the habit, one week at a time.</p>`;
                html += verseHtml({ text: "Let us not become weary in doing good, for at the proper time we will reap a harvest.", ref: "Galatians 6:9" });
                return html;
            },
        },
        {
            id: 'cardio',
            keywords: ['cardio', 'running', 'hiit', 'liss', 'zone 2', 'zone two', 'treadmill', 'cycling', 'heart rate', 'conditioning', 'endurance', 'stamina'],
            handler: (ctx) => {
                const goal = ctx.profile.goal || 'maintain';
                let html = `<h3>Cardio for Lifters: Without Killing Your Gains</h3>`;
                html += `<p>The "cardio kills muscle" myth is half right. Wilson et al. 2012 (the concurrent training meta) showed cardio can blunt strength gains \u2014 but only when it's high-impact, long-duration, on the same muscles you're trying to grow. Done right, cardio improves recovery, work capacity, and longevity without costing you a single rep.</p>`;

                html += `<h3>The 3 cardio modalities</h3>`;
                html += `<table class="plan-table"><tr><th>Type</th><th>Intensity</th><th>What it does</th></tr>`;
                html += `<tr><td><strong>Zone 2 / LISS</strong></td><td>60\u201370% max HR (can hold a conversation)</td><td>Builds mitochondrial density, improves between-set recovery, burns fat without crushing CNS. The cardio elite endurance athletes spend 80% of their time on.</td></tr>`;
                html += `<tr><td><strong>Moderate</strong></td><td>70\u201385% max HR (can speak in short sentences)</td><td>Cardiovascular fitness ceiling. Useful but the most fatiguing per minute.</td></tr>`;
                html += `<tr><td><strong>HIIT</strong></td><td>90%+ max HR, 20\u201360 sec efforts</td><td>VO\u2082 max boost, time-efficient. But high systemic fatigue \u2014 don't pair with leg day.</td></tr>`;
                html += `</table>`;

                html += `<h3>The lifter's cardio rules</h3><ol>`;
                html += `<li><strong>Walking is undefeated.</strong> Low impact, near-zero recovery cost, burns ~300\u2013400 kcal/hour for most people. 3\u20134 brisk walks per week is a quietly elite move.</li>`;
                html += `<li><strong>Separate cardio from lifting by 6+ hours when possible.</strong> If you can't, lift first, cardio after.</li>`;
                html += `<li><strong>Avoid running on lifting days, especially leg day.</strong> Cycling, rowing, and swimming have less concurrent training interference (Wilson 2012).</li>`;
                html += `<li><strong>HIIT max 1\u20132x/week.</strong> It's a tax on your nervous system. More than that and your lifting suffers.</li>`;
                html += `<li><strong>Track your steps.</strong> Aim for <strong>8,000\u201312,000 steps/day</strong>. NEAT (non-exercise activity thermogenesis) explains huge differences in fat loss between people on the same diet.</li>`;
                html += `</ol>`;

                html += `<h3>Recommendation for your goal</h3>`;
                if (goal === 'lose') {
                    html += `<p><strong>Cutting:</strong> 3\u20134 walks per week (30\u201345 min) + 8,000+ daily steps. Add 1 HIIT session if fat loss stalls. Walking is the cheat code for adherence \u2014 it burns calories without raising hunger the way a hard run does.</p>`;
                } else if (goal === 'gain') {
                    html += `<p><strong>Bulking:</strong> 2\u20133 walks per week + 8,000+ steps. Don't go zero-cardio \u2014 cardiovascular fitness improves recovery and lets you do more total training volume. Skip HIIT entirely; it eats into your surplus.</p>`;
                } else {
                    html += `<p><strong>Maintenance/general health:</strong> 150 min of moderate cardio per week (WHO + ACSM guideline). Mix walks, cycling, and one HIIT session. Heart health is the longest-game of all.</p>`;
                }
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'meal_timing',
            keywords: ['meal timing', 'pre.?workout.*meal', 'post.?workout.*meal', 'when.*eat', 'eat before', 'eat after', 'nutrient timing', 'anabolic window', 'protein distribution'],
            handler: (ctx) => {
                let html = `<h3>Nutrient Timing: Signal vs. Noise</h3>`;
                html += `<p>Most "nutrient timing" advice is leftover from the 1990s. The current research is way more relaxed \u2014 with two specific exceptions that actually do matter.</p>`;

                html += `<h3>What actually matters (the signal)</h3><ol>`;
                html += `<li><strong>Total daily protein.</strong> 1.6\u20132.2 g/kg. This is 80% of the timing conversation. Hit the daily total and you're fine.</li>`;
                html += `<li><strong>Protein distribution: 4 doses across the day, ~0.4 g/kg each.</strong> Mamerow et al. 2014: 30g protein at each of 3 meals stimulated 25% more muscle protein synthesis than the same total skewed to dinner. Schoenfeld & Aragon 2018 confirmed this for lifters.</li>`;
                html += `</ol>`;

                html += `<h3>What barely matters (the noise)</h3><ul>`;
                html += `<li><strong>The "anabolic window" myth.</strong> The classic "30-minute window" is dead. Aragon & Schoenfeld 2013 reviewed it directly: as long as you eat a protein-containing meal within ~3\u20134 hours of training, you're capturing the full anabolic response.</li>`;
                html += `<li><strong>Pre-workout shake "to spike insulin"?</strong> Not necessary. If you ate a normal protein meal in the 4 hours before training, you're already covered.</li>`;
                html += `<li><strong>Fast vs slow protein at night?</strong> Casein vs whey before bed: minor differences, not worth optimizing for unless you're competing.</li>`;
                html += `</ul>`;

                html += `<h3>The practical playbook</h3>`;
                html += `<table class="plan-table"><tr><th>Meal</th><th>Timing</th><th>What</th></tr>`;
                html += `<tr><td>Pre-workout</td><td>1\u20133 hrs before</td><td>Moderate carbs + 30\u201340g protein, low fat. Oatmeal + Greek yogurt, rice + chicken, banana + protein shake.</td></tr>`;
                html += `<tr><td>Intra-workout</td><td>During</td><td>Water, electrolytes if you sweat heavily. Carbs only matter for sessions over 90 min.</td></tr>`;
                html += `<tr><td>Post-workout</td><td>Within 2\u20133 hrs</td><td>30\u201340g protein + carbs to replenish glycogen. Don't rush home in 20 min \u2014 a normal meal is fine.</td></tr>`;
                html += `<tr><td>Pre-bed</td><td>30\u201360 min before sleep</td><td>20\u201340g slow-digesting protein (Greek yogurt, cottage cheese, casein shake). Res et al. 2012 showed nighttime protein elevates overnight muscle protein synthesis ~22%.</td></tr>`;
                html += `</table>`;

                html += `<h3>Training fasted?</h3>`;
                html += `<p>Fine for cardio/light sessions, sub-optimal for heavy lifting. If you train fasted, eat your first big protein meal within 1\u20132 hours after \u2014 don't push the eating window so late that you only fit 2 protein doses into the day.</p>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'weak_point',
            keywords: ['weak point', 'weak.?point', 'imbalance', 'lagging', 'underdeveloped', 'asymmetr', 'weak muscle', 'physique.*weak', 'aesthetic.*weak', 'performance.*weak', 'weak.*analysis', 'eliminate.*weak', 'fix.*weak'],
            handler: (ctx, input) => {
                // --- Corrective exercise database by muscle group ---
                const correctiveDB = {
                    chest: { muscle: 'Chest', exercises: [
                        { name: 'Low Incline Dumbbell Press (15-30°)', sets: '4×8-10', tempo: '3-1-1-0', cues: 'Set bench to 1-2 clicks. Flare elbows ~60°. Lower to upper chest, drive up and slightly inward.' },
                        { name: 'Cable Fly (various angles)', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Adjust pulley height to target weak area. Squeeze for 2 seconds at peak contraction.' },
                        { name: 'Dumbbell Bench Press (deep stretch)', sets: '3×10-12', tempo: '3-0-1-0', cues: 'Go slightly deeper than barbell allows. Slow eccentric builds pec strength through greater ROM.' }
                    ], timeline: '6-8 weeks for improved fullness; 12-16 weeks for visible change.', markers: 'Press weight increases 10-15%, visible chest development in relaxed pose.' },
                    back: { muscle: 'Back', exercises: [
                        { name: 'Wide-Grip Lat Pulldown', sets: '4×10-12', tempo: '2-0-1-2', cues: 'Lean back slightly, pull elbows DOWN and INTO your sides. Think "pull with elbows, not hands."' },
                        { name: 'Straight-Arm Pulldown', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Isolates lats with zero bicep involvement. Arc the bar from face-height to thighs.' },
                        { name: 'Chest-Supported Row', sets: '3×10-12', tempo: '2-0-1-2', cues: 'Eliminates momentum. Squeeze shoulder blades together at the top. 2 sec hold.' }
                    ], timeline: '6-8 weeks for mind-muscle connection; 12-16 weeks for visible V-taper.', markers: 'Pulldown/row weight increases 15%+, visible lat spread in relaxed pose.' },
                    shoulders: { muscle: 'Shoulders', exercises: [
                        { name: 'Face Pulls', sets: '4×15-20', tempo: '2-0-1-2', cues: 'Pull to forehead height, externally rotate so thumbs point behind you. Elbows high.' },
                        { name: 'Cable Lateral Raise', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Constant tension from the cable. Lead with elbows, not hands. Slight lean away.' },
                        { name: 'Prone Incline Rear Delt Fly', sets: '3×15-20', tempo: '2-0-1-2', cues: 'Lie chest-down on 30° incline. Light dumbbells, lead with pinkies, hold the squeeze.' }
                    ], timeline: '4-6 weeks for visible rounding; 10-12 weeks for structural change.', markers: 'Shoulder "cap" visible from front, face pull weight increases 20%+.' },
                    legs: { muscle: 'Legs', exercises: [
                        { name: 'Romanian Deadlift', sets: '4×8-10', tempo: '3-1-1-0', cues: 'Push hips BACK. Bar glides down thighs. Stop at deep hamstring stretch. Squeeze glutes to return.' },
                        { name: 'Bulgarian Split Squat', sets: '3×10-12 per leg', tempo: '3-0-1-0', cues: 'Lean torso slightly forward to bias glutes. 3-second eccentric. Deep stretch at bottom.' },
                        { name: 'Leg Curl (seated or lying)', sets: '4×10-12', tempo: '2-0-1-2', cues: 'Squeeze at full contraction for 2 seconds. Control the eccentric — no dropping.' }
                    ], timeline: '6-8 weeks for strength gains; 12 weeks for visible development.', markers: 'RDL weight increases 15%+, visible hamstring/quad separation.' },
                    biceps: { muscle: 'Biceps', exercises: [
                        { name: 'Incline Dumbbell Curl', sets: '3×10-12', tempo: '2-0-1-2', cues: 'Set bench to 45°. Arms hang straight down. Curl without swinging — targets long head for peak.' },
                        { name: 'Hammer Curls', sets: '3×10-12', tempo: '2-0-1-1', cues: 'Builds brachialis and forearm thickness. Neutral grip, no swinging.' },
                        { name: 'Cable Curl (low pulley)', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Constant tension. Squeeze hard at top. Keep elbows pinned.' }
                    ], timeline: '6-8 weeks for arm fullness; 12 weeks for measurable size.', markers: 'Arm circumference +0.25-0.5 inches, visible peak when flexed.' },
                    triceps: { muscle: 'Triceps', exercises: [
                        { name: 'Overhead Cable Tricep Extension', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Stretch hard at the bottom, squeeze at lockout. Elbows stay pointed forward.' },
                        { name: 'Close-Grip Bench Press', sets: '3×8-10', tempo: '3-0-1-0', cues: 'Hands shoulder-width. Tuck elbows. Builds tricep mass and pressing power.' },
                        { name: 'Tricep Dips (weighted)', sets: '3×8-12', tempo: '2-0-1-0', cues: 'Lean slightly forward for chest, stay upright for tricep focus. Full lockout at top.' }
                    ], timeline: '6-8 weeks for visible horseshoe; 12 weeks for measurable size.', markers: 'Tricep horseshoe visible from the side, close-grip bench increases 10%+.' },
                    core: { muscle: 'Core', exercises: [
                        { name: 'Hanging Leg Raise', sets: '3×10-15', tempo: '2-0-1-1', cues: 'Curl pelvis up, don\'t just swing legs. Control the descent. Progress to straight legs.' },
                        { name: 'Cable Crunch', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Crunch ribs toward hips, not just hinge at the hip. Squeeze at the bottom.' },
                        { name: 'Pallof Press', sets: '3×10-12 per side', tempo: '2-2-2-0', cues: 'Anti-rotation — resist the cable pulling you. Press out, hold 2 sec, return. Builds real core stability.' }
                    ], timeline: '4-6 weeks for strength; 8-12 weeks with low body fat for visibility.', markers: 'Plank hold time increases, improved brace on compound lifts, reduced lower back fatigue.' }
                };

                // --- Stagnation corrective database by lift type ---
                const stagnationDB = {
                    press: { lift: 'Pressing Movements (Bench/OHP)', cause: 'Weak pecs at full stretch, tricep lockout weakness, or loss of upper back tightness.', exercises: [
                        { name: 'Spoto Press / Pause Press', sets: '4×4-6 @ 70-80%', tempo: '3-2-1-0', cues: 'Lower to 1 inch above chest, hold 2 seconds. Builds strength at the sticking point.' },
                        { name: 'Close-Grip Bench Press', sets: '3×6-8', tempo: '3-0-1-0', cues: 'Overloads triceps for lockout strength. Hands shoulder-width.' },
                        { name: 'Pin Press (at sticking point)', sets: '3×3-5', tempo: '1-1-1-0', cues: 'Set pins at your sticking point. Dead-stop press eliminates momentum.' }
                    ], timeline: '4-6 weeks for improved bar speed through sticking point; 8-12 weeks for PR.', markers: 'Pause press reaches 85%+ of competition lift, bar speed at sticking point improves visibly.' },
                    squat: { lift: 'Squat', cause: 'Quad weakness at depth, poor bracing, or hip/ankle mobility limitations.', exercises: [
                        { name: 'Pause Squat (3-sec pause)', sets: '4×4-6 @ 65-75%', tempo: '3-3-1-0', cues: 'Hold motionless at the bottom for 3 seconds while maintaining brace. No bounce on the way up.' },
                        { name: 'Front Squat', sets: '3×6-8', tempo: '3-0-1-0', cues: 'Forces upright torso and quad dominance. Fixes forward collapse.' },
                        { name: 'Goblet Squat to Box', sets: '3×10-12', tempo: '3-1-1-0', cues: 'Sit back to box, pause, drive up. Teaches you to own the bottom position.' }
                    ], timeline: '4-6 weeks for confidence in the hole; 8-12 weeks for measurable strength gains.', markers: 'Pause squat reaches 80%+ of back squat, no forward lean at the bottom.' },
                    deadlift: { lift: 'Deadlift', cause: 'Weak glutes/upper back, or hips shooting up too fast leaving the back to finish the lift.', exercises: [
                        { name: 'Block/Rack Pulls (knee height)', sets: '4×3-5 (heavy)', tempo: '1-0-1-0', cues: 'Overloads the lockout. Go 10-20% heavier than full deadlift. Brace hard.' },
                        { name: 'Deficit Deadlift', sets: '3×4-6 @ 70-80%', tempo: '2-0-1-0', cues: 'Stand on 1-2 inch platform. Forces better positioning off the floor.' },
                        { name: 'Barbell Hip Thrust (heavy)', sets: '3×6-8', tempo: '2-0-1-2', cues: 'Builds lockout-specific glute power. Squeeze HARD at top for 2 seconds.' }
                    ], timeline: '4-6 weeks for smoother lockout; 8-12 weeks for hitch elimination.', markers: 'Rack pull exceeds deadlift by 15%+, no visible hitch on heavy singles.' },
                    row: { lift: 'Rowing / Pull Movements', cause: 'Weak mid-back, bicep fatigue limiting volume, or poor scapular control.', exercises: [
                        { name: 'Chest-Supported Row', sets: '4×8-10', tempo: '2-0-1-2', cues: 'Removes momentum. Focus purely on squeezing shoulder blades. 2 sec hold at top.' },
                        { name: 'Straight-Arm Pulldown', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Isolates lats without bicep fatigue. Great for building the mind-muscle connection.' },
                        { name: 'Face Pulls', sets: '3×15-20', tempo: '2-0-1-2', cues: 'Builds rear delts and mid-traps. Externally rotate at the end of each rep.' }
                    ], timeline: '4-6 weeks for improved mind-muscle connection; 8-12 weeks for weight increases.', markers: 'Row weight increases 10-15%, improved upper back tightness on compounds.' },
                    curl: { lift: 'Curl Movements', cause: 'Momentum compensation, insufficient time under tension, or relying on compounds for bicep growth.', exercises: [
                        { name: 'Incline Dumbbell Curl', sets: '3×10-12', tempo: '2-0-1-3', cues: 'Set bench to 45°. 3-second eccentric. No swinging — the incline prevents cheating.' },
                        { name: 'Preacher Curl', sets: '3×10-12', tempo: '2-0-1-2', cues: 'Eliminates momentum completely. Squeeze hard at the top.' },
                        { name: 'Cable Curl (constant tension)', sets: '3×12-15', tempo: '2-0-1-2', cues: 'Cables keep tension throughout the whole range. Slow and controlled.' }
                    ], timeline: '4-6 weeks for improved strength; 8-12 weeks for visible growth.', markers: 'Curl weight increases 15%+, visible bicep peak when flexed.' }
                };

                // Helper: classify an exercise name into a lift category for stagnation fixes
                function getLiftCategory(exerciseName) {
                    const n = exerciseName.toLowerCase();
                    if (n.includes('bench') || n.includes('overhead') || n.includes('ohp') || n.includes('incline press') || n.includes('shoulder press') || n.includes('dumbbell press') || n.includes('machine press') || n.includes('chest press')) return 'press';
                    if (n.includes('squat') || n.includes('leg press') || n.includes('hack')) return 'squat';
                    if (n.includes('deadlift') || n.includes('rdl') || n.includes('romanian')) return 'deadlift';
                    if (n.includes('row') || n.includes('pull-up') || n.includes('pullup') || n.includes('chin-up') || n.includes('pulldown') || n.includes('lat pull')) return 'row';
                    if (n.includes('curl')) return 'curl';
                    return null;
                }

                // =============================================
                // AUTO-DETECT weak points from user's data
                // =============================================
                let html = `<h3>Weak Point Analysis</h3>`;
                html += `<p style="opacity:0.8;font-style:italic;">Auto-detected from your logged workouts and training history.</p>`;

                const totalWorkouts = ctx.workouts.length;
                if (totalWorkouts === 0) {
                    html += `<p>You haven't logged any workouts yet, so I can't auto-detect your weak points. Start logging your exercises and come back — I'll analyze your data to find:</p><ul>`;
                    html += `<li><strong>Neglected muscle groups</strong> that aren't getting enough volume</li>`;
                    html += `<li><strong>Stalled lifts</strong> where your weight hasn't increased in 4+ sessions</li>`;
                    html += `<li><strong>Volume imbalances</strong> between push/pull, upper/lower, etc.</li>`;
                    html += `</ul>`;
                    html += `<p>Log at least 2-3 weeks of training for the best analysis.</p>`;
                    html += verseHtml();
                    return html;
                }

                let priority = 1;
                const findings = { neglected: [], undertrained: [], stagnating: [], imbalanced: [] };

                // --- 1. NEGLECTED muscle groups (zero sets in last 30 days) ---
                const monthMuscleVolume = {};
                Object.keys(ctx.muscleMap).forEach(group => { monthMuscleVolume[group] = 0; });
                ctx.monthWorkouts.forEach(w => {
                    for (const [group, exercises] of Object.entries(ctx.muscleMap)) {
                        if (exercises.some(e => w.name.toLowerCase() === e.toLowerCase())) {
                            monthMuscleVolume[group] += w.sets.length;
                        }
                    }
                });

                const sortedVolume = Object.entries(monthMuscleVolume).sort((a, b) => a[1] - b[1]);
                const totalSets = sortedVolume.reduce((sum, [, v]) => sum + v, 0);
                const avgSetsPerGroup = totalSets / sortedVolume.length;

                sortedVolume.forEach(([group, sets]) => {
                    if (sets === 0) {
                        findings.neglected.push(group);
                    } else if (sets < avgSetsPerGroup * 0.4) {
                        findings.undertrained.push({ group, sets, avg: Math.round(avgSetsPerGroup) });
                    }
                });

                // --- 2. STAGNATING lifts (weight hasn't increased in 4+ sessions) ---
                const stagnatingLifts = [];
                ctx.stagnant.forEach(name => {
                    const category = getLiftCategory(name);
                    stagnatingLifts.push({ name, category });
                });

                // --- 3. PUSH/PULL and UPPER/LOWER imbalance detection ---
                const pushVolume = (monthMuscleVolume.chest || 0) + (monthMuscleVolume.shoulders || 0) + (monthMuscleVolume.triceps || 0);
                const pullVolume = (monthMuscleVolume.back || 0) + (monthMuscleVolume.biceps || 0);
                const upperVolume = pushVolume + pullVolume;
                const lowerVolume = (monthMuscleVolume.legs || 0);
                const pushPullRatio = pullVolume > 0 ? (pushVolume / pullVolume) : 0;
                const upperLowerRatio = lowerVolume > 0 ? (upperVolume / lowerVolume) : 0;

                if (pushPullRatio > 1.8 && pushVolume > 0 && pullVolume > 0) {
                    findings.imbalanced.push({ type: 'Push vs Pull', detail: `Your push volume (${pushVolume} sets) is ${pushPullRatio.toFixed(1)}× your pull volume (${pullVolume} sets). This can lead to rounded shoulders and shoulder injuries. Aim for a 1:1 to 1:1.5 push-to-pull ratio.` });
                } else if (pushPullRatio < 0.55 && pushVolume > 0 && pullVolume > 0) {
                    findings.imbalanced.push({ type: 'Pull vs Push', detail: `Your pull volume (${pullVolume} sets) far exceeds your push volume (${pushVolume} sets). Add more pressing work for balanced development.` });
                }
                if (upperLowerRatio > 2.5 && upperVolume > 0 && lowerVolume > 0) {
                    findings.imbalanced.push({ type: 'Upper vs Lower', detail: `Your upper body volume (${upperVolume} sets) is ${upperLowerRatio.toFixed(1)}× your lower body volume (${lowerVolume} sets). Don't skip leg day — lower body training drives total-body growth and hormonal response.` });
                } else if (upperLowerRatio < 0.8 && upperVolume > 0 && lowerVolume > 0) {
                    findings.imbalanced.push({ type: 'Lower vs Upper', detail: `Your lower body volume (${lowerVolume} sets) significantly exceeds upper body (${upperVolume} sets). Add more upper body pressing and pulling for balanced development.` });
                }

                // --- BUILD THE REPORT ---
                const hasFindings = findings.neglected.length > 0 || findings.undertrained.length > 0 || stagnatingLifts.length > 0 || findings.imbalanced.length > 0;

                if (!hasFindings) {
                    html += insightHtml(`Looking good — no major weak points detected in your training data. Your volume is balanced across muscle groups and none of your lifts are stagnating.`);
                    html += `<p>Keep training consistently. Come back and check again in a few weeks, or if you feel something is lagging.</p>`;
                    html += verseHtml({ text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" });
                    return html;
                }

                // Monthly volume overview
                html += `<h3>Your 30-Day Volume Breakdown</h3>`;
                html += `<table class="plan-table"><tr><th>Muscle Group</th><th>Total Sets</th><th>Status</th></tr>`;
                sortedVolume.forEach(([group, sets]) => {
                    const name = group.charAt(0).toUpperCase() + group.slice(1);
                    let status = '&#x2705; On Track';
                    if (sets === 0) status = '&#x1F534; Neglected';
                    else if (sets < avgSetsPerGroup * 0.4) status = '&#x1F7E1; Undertrained';
                    html += `<tr><td>${name}</td><td>${sets}</td><td>${status}</td></tr>`;
                });
                html += `</table>`;

                // NEGLECTED muscle groups
                if (findings.neglected.length > 0) {
                    html += `<h3>Priority #${priority}: Neglected Muscle Groups</h3>`;
                    html += insightHtml(`These muscles have <strong>ZERO</strong> sets logged in the past 30 days. This is your biggest opportunity for improvement.`);
                    findings.neglected.forEach(group => {
                        const fix = correctiveDB[group];
                        if (!fix) return;
                        html += `<div style="background:var(--card);padding:1rem;border-radius:8px;margin:0.75rem 0;">`;
                        html += `<h3>${fix.muscle}</h3>`;
                        html += `<p><strong>Root Cause:</strong> This group is completely absent from your program — likely a programming gap, not a conscious choice.</p>`;
                        html += `<table class="plan-table"><tr><th>Exercise</th><th>Sets × Reps</th><th>Tempo</th><th>Coaching Cues</th></tr>`;
                        fix.exercises.forEach(ex => {
                            html += `<tr><td>${ex.name}</td><td>${ex.sets}</td><td>${ex.tempo}</td><td>${ex.cues}</td></tr>`;
                        });
                        html += `</table>`;
                        html += `<p><strong>Timeline:</strong> ${fix.timeline}</p>`;
                        html += `<p><strong>Measurable Markers:</strong> ${fix.markers}</p>`;
                        html += `</div>`;
                    });
                    priority++;
                }

                // UNDERTRAINED muscle groups
                if (findings.undertrained.length > 0) {
                    html += `<h3>Priority #${priority}: Undertrained Muscle Groups</h3>`;
                    html += insightHtml(`These muscles are getting some work but significantly less than your other groups (avg: ${Math.round(avgSetsPerGroup)} sets/month).`);
                    findings.undertrained.forEach(({ group, sets, avg }) => {
                        const fix = correctiveDB[group];
                        if (!fix) return;
                        const name = group.charAt(0).toUpperCase() + group.slice(1);
                        html += `<div style="background:var(--card);padding:1rem;border-radius:8px;margin:0.75rem 0;">`;
                        html += `<h3>${fix.muscle} — ${sets} sets vs ${avg} avg</h3>`;
                        html += `<p><strong>Root Cause:</strong> Volume imbalance — ${name} is getting less than half the attention of your other muscle groups. This will show up as a visual weak point over time.</p>`;
                        html += `<p><strong>Quick Fix:</strong> Add ${Math.max(2, Math.round((avg - sets) / 4))} more sets of ${name} work per week. Here are the best exercises to add:</p>`;
                        html += `<table class="plan-table"><tr><th>Exercise</th><th>Sets × Reps</th><th>Tempo</th><th>Coaching Cues</th></tr>`;
                        fix.exercises.slice(0, 2).forEach(ex => {
                            html += `<tr><td>${ex.name}</td><td>${ex.sets}</td><td>${ex.tempo}</td><td>${ex.cues}</td></tr>`;
                        });
                        html += `</table>`;
                        html += `</div>`;
                    });
                    priority++;
                }

                // STAGNATING lifts
                if (stagnatingLifts.length > 0) {
                    html += `<h3>Priority #${priority}: Stalled Lifts</h3>`;
                    html += insightHtml(`These exercises haven't increased in weight over your last 4+ sessions — you've hit a plateau.`);
                    const processedCategories = new Set();
                    stagnatingLifts.forEach(({ name, category }) => {
                        html += `<div style="background:var(--card);padding:1rem;border-radius:8px;margin:0.75rem 0;">`;
                        html += `<h3>${name} — Stalled</h3>`;
                        const maxWeight = ctx.exercisePRs[name] || 0;
                        const unit = ctx.profile.unit === 'metric' ? 'kg' : 'lbs';
                        if (maxWeight > 0) {
                            html += `<p>Current best: <strong>${maxWeight} ${unit}</strong> (unchanged for 4+ sessions)</p>`;
                        }
                        if (category && stagnationDB[category] && !processedCategories.has(category)) {
                            processedCategories.add(category);
                            const fix = stagnationDB[category];
                            html += `<p><strong>Root Cause:</strong> ${fix.cause}</p>`;
                            html += `<table class="plan-table"><tr><th>Exercise</th><th>Sets × Reps</th><th>Tempo</th><th>Coaching Cues</th></tr>`;
                            fix.exercises.forEach(ex => {
                                html += `<tr><td>${ex.name}</td><td>${ex.sets}</td><td>${ex.tempo}</td><td>${ex.cues}</td></tr>`;
                            });
                            html += `</table>`;
                            html += `<p><strong>Timeline:</strong> ${fix.timeline}</p>`;
                            html += `<p><strong>Measurable Markers:</strong> ${fix.markers}</p>`;
                        } else if (!category) {
                            html += `<p><strong>General Fix:</strong> Drop weight by 10%, increase reps to 10-12, build back up over 3-4 weeks. Or try a close variation of this exercise.</p>`;
                        }
                        html += `</div>`;
                    });
                    priority++;
                }

                // VOLUME IMBALANCES
                if (findings.imbalanced.length > 0) {
                    html += `<h3>Priority #${priority}: Volume Imbalances</h3>`;
                    findings.imbalanced.forEach(({ type, detail }) => {
                        html += `<div style="background:var(--card);padding:1rem;border-radius:8px;margin:0.75rem 0;">`;
                        html += `<h3>${type} Imbalance</h3>`;
                        html += `<p>${detail}</p>`;
                        html += `</div>`;
                    });
                    priority++;
                }

                // Integration advice
                html += `<h3>Your Action Plan — Start This Week</h3><ul>`;
                html += `<li><strong>Add, don't replace:</strong> Slot corrective exercises at the END of the relevant training day.</li>`;
                html += `<li><strong>2-3 exercises per weak point, 2× per week:</strong> Frequency beats volume. Spread the work across the week.</li>`;
                html += `<li><strong>Fatigue management:</strong> Keep corrective work at RPE 7-8 (2-3 reps in reserve). These are builders, not grinders.</li>`;
                html += `<li><strong>Track everything:</strong> Log these corrective exercises here in Iron Faith so you can see progression over time.</li>`;
                html += `<li><strong>Reassess in 8 weeks:</strong> Come back to this analysis and compare. Take progress photos now so you have a baseline.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" });
                return html;
            },
        },
        {
            id: 'get_stronger',
            keywords: ['stronger', 'get strong', 'build strength', 'increase strength', 'strength training', 'strength program', 'powerlifting', 'power lifting', 'how.*strong', 'gain strength', 'more strength', 'strength gains', 'raw strength', 'absolute strength'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>How to Actually Get Stronger</h3>`;

                // Personalized hook based on current data
                if (ctx.workouts.length === 0) {
                    html += insightHtml(`I don't see any logged workouts yet. Start by logging your big lifts (squat, bench, deadlift, overhead press) for 2 weeks so I can track real progression for you.`);
                } else {
                    // Find the user's strongest big lift
                    const bigLifts = ['Bench Press','Squat','Deadlift','Overhead Press','Barbell Row','Front Squat','Romanian Deadlift'];
                    let topLift = null;
                    bigLifts.forEach(name => {
                        const sets = ctx.workouts.filter(w => w.name === name).flatMap(w => w.sets);
                        if (sets.length === 0) return;
                        const best = sets.reduce((b, s) => (s.weight > (b ? b.weight : 0) ? s : b), null);
                        if (best && (!topLift || best.weight > topLift.weight)) {
                            topLift = { name, weight: best.weight, reps: best.reps };
                        }
                    });
                    if (topLift) {
                        // Brzycki 1RM estimate
                        const e1rm = Math.round(topLift.weight * (36 / (37 - Math.min(topLift.reps, 10))));
                        html += insightHtml(`Your top recorded lift is <strong>${escapeHtml(topLift.name)}</strong> at ${lbsToDisplay(topLift.weight)}${unit} \u00d7 ${topLift.reps} (\u2248 ${lbsToDisplay(e1rm)}${unit} 1RM). The plan below is built around pushing that number up.`);
                    }
                }

                html += `<h3>The 4 Rules of Getting Stronger</h3><ol>`;
                html += `<li><strong>Progressive overload, every session.</strong> Add 2.5\u20135${unit} or one rep to your top set every workout. Tiny jumps compound fast.</li>`;
                html += `<li><strong>Train in low reps for max strength.</strong> 3\u20135 reps per set on your main lifts. Higher reps build size; low reps build raw force.</li>`;
                html += `<li><strong>Rest LONG between heavy sets.</strong> 3\u20135 minutes. Cutting rest sabotages strength \u2014 your nervous system needs the recovery to lift heavy again.</li>`;
                html += `<li><strong>Focus on the big 5.</strong> Squat, bench, deadlift, overhead press, row. Everything else is accessory.</li>`;
                html += `</ol>`;

                html += `<h3>A Proven Weekly Layout</h3><ul>`;
                html += `<li><strong>Day 1 \u2014 Heavy lower:</strong> Squat 5\u00d75, RDL 4\u00d76, walking lunges 3\u00d710/leg</li>`;
                html += `<li><strong>Day 2 \u2014 Heavy upper:</strong> Bench 5\u00d75, barbell row 5\u00d75, overhead press 4\u00d76, chin-ups 3\u00d7max</li>`;
                html += `<li><strong>Day 3 \u2014 Pull/posterior:</strong> Deadlift 3\u00d73, pull-ups 4\u00d78, hip thrust 4\u00d78, face pulls 3\u00d715</li>`;
                html += `<li><strong>Day 4 \u2014 Volume upper:</strong> Incline bench 4\u00d78, dumbbell row 4\u00d78, lateral raises 4\u00d712, dips 3\u00d7max</li>`;
                html += `</ul>`;

                html += `<h3>The Loading Scheme that Works</h3><ul>`;
                html += `<li><strong>Top set:</strong> 1 set of 3\u20135 reps at the heaviest weight you can move with good form. This is the strength driver.</li>`;
                html += `<li><strong>Back-off sets:</strong> 3\u20134 sets at 85\u201390% of that weight for 5 reps. Builds work capacity.</li>`;
                html += `<li><strong>Add weight when you complete all reps with 1 rep in reserve.</strong> If the top set felt grindy, repeat the weight next session.</li>`;
                html += `</ul>`;

                html += `<h3>The Stuff That Wrecks Strength</h3><ul>`;
                html += `<li><strong>Skipping sleep</strong> \u2014 less than 7 hrs and your CNS is fried. Sleep is a strength supplement.</li>`;
                html += `<li><strong>Eating in a deficit</strong> \u2014 you can't get meaningfully stronger while losing weight aggressively. Eat at maintenance or slight surplus.</li>`;
                html += `<li><strong>Random programs</strong> \u2014 stick with one for at least 8\u201312 weeks. Program hopping = no progress.</li>`;
                html += `<li><strong>Form breakdown</strong> \u2014 a missed rep or rounded back deload week. Pull back to 90% and rebuild.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "I can do all this through him who gives me strength.", ref: "Philippians 4:13" });
                return html;
            },
        },
        {
            id: 'mobility',
            keywords: ['mobility', 'flexibility', 'flexible', 'tight hip', 'tight shoulder', 'tight ankle', 'stiff', 'range of motion', 'rom', 'stretching routine', 'limber', 'loosen up', 'mobility work'],
            handler: () => {
                let html = `<h3>Mobility That Actually Helps Lifts</h3>`;
                html += `<p>Ignore the influencer stretching circus. Lifters need <strong>specific</strong> mobility \u2014 the kind that unlocks better positions in the squat, bench, and overhead press.</p>`;

                html += `<h3>The 5-Minute Daily Routine</h3><ol>`;
                html += `<li><strong>90/90 hip switches</strong> \u2014 2 minutes. Fixes tight hips, opens squat depth.</li>`;
                html += `<li><strong>Couch stretch</strong> \u2014 60 sec each side. Lengthens hip flexors, fixes anterior pelvic tilt.</li>`;
                html += `<li><strong>Thoracic spine extensions over a foam roller</strong> \u2014 10 reps. Unlocks overhead pressing.</li>`;
                html += `<li><strong>Wall slides</strong> \u2014 10 reps. Restores shoulder mechanics.</li>`;
                html += `<li><strong>Ankle wall mobs</strong> \u2014 10 each side. Bigger ankle ROM = deeper squat.</li>`;
                html += `</ol>`;

                html += `<h3>Pre-Workout Mobility (lift-specific)</h3><ul>`;
                html += `<li><strong>Squat day:</strong> 90/90 hip switches + ankle mobs + bodyweight squats x10</li>`;
                html += `<li><strong>Bench day:</strong> band pull-aparts x20 + wall slides x10 + scap push-ups x10</li>`;
                html += `<li><strong>Deadlift day:</strong> cat-cow x10 + hip airplanes x5/leg + light RDLs x10</li>`;
                html += `<li><strong>Overhead day:</strong> thoracic extensions + wall slides + dead hang 30 sec</li>`;
                html += `</ul>`;

                html += `<h3>What NOT to Do</h3><ul>`;
                html += `<li><strong>Don't static stretch before lifting</strong> \u2014 reduces force output. Save it for after.</li>`;
                html += `<li><strong>Don't chase mobility you don't need.</strong> If your squat is fine, you don't need to do the splits.</li>`;
                html += `<li><strong>Don't expect overnight changes.</strong> Mobility is a 4-8 week project, not a one-session fix.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "It is God who arms me with strength and keeps my way secure. He makes my feet like the feet of a deer.", ref: "Psalm 18:32-33" });
                return html;
            },
        },
        {
            id: 'sleep',
            keywords: ['sleep', 'insomnia', 'can\'t sleep', 'sleep quality', 'sleep better', 'how much sleep', 'sleep tips', 'rest at night', 'sleeping'],
            handler: () => {
                let html = `<h3>Sleep: The Most Underrated Performance Lever</h3>`;
                html += insightHtml(`Lifters who sleep 5\u20136 hrs lose strength <strong>2x faster</strong> in cuts and gain muscle <strong>~30% slower</strong> in bulks. Sleep isn't optional.`);

                html += `<h3>Targets</h3><ul>`;
                html += `<li><strong>7\u20139 hours</strong> per night, every night.</li>`;
                html += `<li><strong>Same bedtime \u00b1 30 min</strong>, even on weekends.</li>`;
                html += `<li><strong>Cool, dark, quiet</strong> room. 65\u201368\u00b0F is ideal.</li>`;
                html += `</ul>`;

                html += `<h3>Things That Crush Your Sleep</h3><ul>`;
                html += `<li><strong>Caffeine after 2 PM</strong> \u2014 half-life is 6 hours. Your "I sleep fine on coffee" is a lie your body tells you.</li>`;
                html += `<li><strong>Late workouts</strong> \u2014 if you train past 8 PM, give yourself 90 min to wind down.</li>`;
                html += `<li><strong>Phone in bed</strong> \u2014 blue light + dopamine hits = trash sleep.</li>`;
                html += `<li><strong>Alcohol</strong> \u2014 puts you out fast, wrecks REM and deep sleep stages.</li>`;
                html += `</ul>`;

                html += `<h3>Things That Help</h3><ul>`;
                html += `<li><strong>Magnesium glycinate (300\u2013400 mg)</strong> 1 hr before bed.</li>`;
                html += `<li><strong>10-min wind-down ritual</strong> \u2014 dim lights, read, journal.</li>`;
                html += `<li><strong>Morning sunlight</strong> within 30 min of waking sets your circadian rhythm.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "In peace I will lie down and sleep, for you alone, LORD, make me dwell in safety.", ref: "Psalm 4:8" });
                return html;
            },
        },
        {
            id: 'hydration',
            keywords: ['hydrat', 'water intake', 'how much water', 'drink water', 'electrolyte', 'thirsty', 'dehydrat'],
            handler: (ctx) => {
                const lbs = ctx.currentWeight || 180;
                const oz = Math.round(lbs * 0.6);
                const liters = (oz * 0.0295735).toFixed(1);
                let html = `<h3>Hydration for Lifters</h3>`;
                html += insightHtml(`At your bodyweight, target roughly <strong>${oz} oz (${liters} L)</strong> of water per day, plus 16\u201320 oz extra for every hour of training.`);

                html += `<h3>The Rules</h3><ul>`;
                html += `<li><strong>Pee should be pale yellow.</strong> Clear = overhydrated. Dark = behind.</li>`;
                html += `<li><strong>Pre-workout:</strong> 16 oz, 30 min before lifting.</li>`;
                html += `<li><strong>During workout:</strong> sip 16\u201324 oz over the session.</li>`;
                html += `<li><strong>Post-workout:</strong> drink another 16 oz with electrolytes if you sweat heavily.</li>`;
                html += `</ul>`;

                html += `<h3>Why It Matters for Lifting</h3><ul>`;
                html += `<li><strong>2% dehydration</strong> drops strength output measurably. You'll feel weaker without knowing why.</li>`;
                html += `<li><strong>Cramps</strong> are usually electrolyte deficits (sodium + potassium), not just water.</li>`;
                html += `<li><strong>Joint comfort</strong> \u2014 hydrated cartilage = less crackly knees and shoulders.</li>`;
                html += `</ul>`;

                html += verseHtml({ text: "Whoever believes in me, as Scripture has said, rivers of living water will flow from within them.", ref: "John 7:38" });
                return html;
            },
        },
        {
            id: 'core_abs',
            keywords: ['ab workout', 'six pack', 'six.pack', 'abs', 'core training', 'how.*abs', 'flatter stomach', 'midsection', 'six-pack'],
            handler: () => {
                let html = `<h3>Building Visible Abs</h3>`;
                html += insightHtml(`Hard truth: abs are revealed by body fat %, not by how many crunches you do. You need <strong>~12% body fat (men)</strong> or <strong>~20% (women)</strong> for them to show.`);

                html += `<h3>The Two-Lever Approach</h3><ol>`;
                html += `<li><strong>Build the muscle</strong> \u2014 train abs 2\u20133x/week with weighted, progressive moves.</li>`;
                html += `<li><strong>Lower body fat</strong> \u2014 the kitchen, not the gym, is where your six-pack lives.</li>`;
                html += `</ol>`;

                html += `<h3>The Best Ab Exercises</h3><ul>`;
                html += `<li><strong>Hanging leg raises</strong> \u2014 the king. 3\u00d78\u201312.</li>`;
                html += `<li><strong>Cable crunches</strong> \u2014 weighted, progressive. 3\u00d710\u201315.</li>`;
                html += `<li><strong>Ab wheel rollouts</strong> \u2014 brutal, builds anti-extension strength. 3\u00d75\u201310.</li>`;
                html += `<li><strong>Pallof press</strong> \u2014 anti-rotation, fixes obliques. 3\u00d710/side.</li>`;
                html += `<li><strong>Plank variations</strong> \u2014 endurance, not size. 3\u00d745\u201360 sec.</li>`;
                html += `</ul>`;

                html += `<h3>Skip These</h3><ul>`;
                html += `<li><strong>1000 crunches a day</strong> \u2014 no carryover, hurts your back.</li>`;
                html += `<li><strong>"Spot reduction"</strong> \u2014 you can't burn belly fat by training abs. Doesn't work, never has.</li>`;
                html += `<li><strong>Sit-ups with arched back</strong> \u2014 wrecks your lumbar. Use crunches or leg raises instead.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'home_workout',
            keywords: ['no gym', 'home workout', 'no equipment', 'bodyweight', 'home gym', 'travel workout', 'hotel workout', 'workout at home', 'work out at home', 'no weights'],
            handler: () => {
                let html = `<h3>Train Hard With Zero Equipment</h3>`;
                html += `<p>You don't need a gym to get strong. You need progressive overload \u2014 and bodyweight work scales further than people think.</p>`;

                html += `<h3>The Full-Body Routine (30 min)</h3><ol>`;
                html += `<li><strong>Push-ups</strong> \u2014 4 sets, AMRAP. Progress: incline \u2192 standard \u2192 decline \u2192 archer \u2192 one-arm.</li>`;
                html += `<li><strong>Bulgarian split squats</strong> \u2014 4\u00d710/leg. Hold a backpack for load.</li>`;
                html += `<li><strong>Inverted rows (under a table)</strong> \u2014 4\u00d78\u201312. Or use a pull-up bar.</li>`;
                html += `<li><strong>Pike push-ups</strong> \u2014 3\u00d78. Builds shoulders without weights.</li>`;
                html += `<li><strong>Walking lunges</strong> \u2014 3\u00d720 steps.</li>`;
                html += `<li><strong>Hollow body holds</strong> \u2014 3\u00d730 sec. Crushes core.</li>`;
                html += `</ol>`;

                html += `<h3>Bodyweight Progression Tricks</h3><ul>`;
                html += `<li><strong>Tempo:</strong> slow the eccentric to 4 seconds. Suddenly push-ups feel brutal.</li>`;
                html += `<li><strong>Pause reps:</strong> 2-second pause at the bottom. Removes momentum.</li>`;
                html += `<li><strong>Unilateral progressions:</strong> two legs \u2192 one leg, two arms \u2192 archer \u2192 one arm.</li>`;
                html += `<li><strong>Density:</strong> same workout in less time = more intensity.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'fasting',
            keywords: ['intermittent fasting', 'fasting', '16:8', '16/8', 'omad', 'skip breakfast', 'fasted', 'fasted training', 'fasted cardio', 'eating window'],
            handler: () => {
                let html = `<h3>Intermittent Fasting + Lifting</h3>`;
                html += insightHtml(`IF is a calorie-control tool, not a magic fat-loss switch. It works because you eat less, not because of metabolic voodoo.`);

                html += `<h3>What it's good for</h3><ul>`;
                html += `<li><strong>Cutting:</strong> easier to hit a deficit when you skip a meal.</li>`;
                html += `<li><strong>Simplicity:</strong> fewer decisions about food.</li>`;
                html += `<li><strong>Digestive comfort:</strong> some people just feel better not eating early.</li>`;
                html += `</ul>`;

                html += `<h3>Where it gets you in trouble</h3><ul>`;
                html += `<li><strong>Bulking on IF is hard.</strong> Eating 3500+ calories in an 8-hour window is uncomfortable.</li>`;
                html += `<li><strong>Heavy strength training fasted</strong> usually feels worse than fed. Try eating 1\u20132 hrs pre-lift.</li>`;
                html += `<li><strong>Protein distribution suffers</strong> \u2014 you want 4\u20135 protein hits across the day; IF cuts you to 2\u20133.</li>`;
                html += `</ul>`;

                html += `<h3>If you want to try it</h3><ul>`;
                html += `<li>Start with <strong>14:10</strong> (skip breakfast, eat 10am\u20138pm). Easier than jumping straight to 16:8.</li>`;
                html += `<li>Time your eating window so you can <strong>eat post-workout</strong>.</li>`;
                html += `<li>Hit your protein. 0.8\u20131g per lb bodyweight, no exceptions.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'injury_prevention',
            keywords: ['avoid injury', 'prevent injury', 'lifting safe', 'safe lift', 'tweaked', 'tweak.*back', 'tweak.*knee', 'low.?back pain', 'shoulder pain', 'knee pain', 'elbow pain', 'wrist pain', 'lifting hurt'],
            handler: () => {
                let html = `<h3>Lift for the Long Game</h3>`;
                html += `<p>Your goal is <strong>40+ years of lifting</strong>, not crushing yourself this month. The strongest lifters are the ones still healthy in their 50s and 60s.</p>`;

                html += `<h3>The Non-Negotiables</h3><ul>`;
                html += `<li><strong>Warm up properly</strong> \u2014 2\u20133 ramping sets before your top weight, every time.</li>`;
                html += `<li><strong>Leave 1\u20132 reps in the tank</strong> on most working sets. Save the all-out grinders for once a week.</li>`;
                html += `<li><strong>Track form fatigue.</strong> If your bar speed drops or form breaks down, the set is over.</li>`;
                html += `<li><strong>Deload every 6\u20138 weeks</strong> \u2014 a full week at 60\u201370% intensity. Your joints will thank you.</li>`;
                html += `</ul>`;

                html += `<h3>If Something Hurts</h3><ol>`;
                html += `<li><strong>Sharp pain = stop.</strong> Dull soreness = train through, but lighter.</li>`;
                html += `<li><strong>Swap, don't skip.</strong> Sore back? Swap deadlift for hip thrust. Bad shoulder? Swap overhead press for landmine press.</li>`;
                html += `<li><strong>3+ days of pain = see a physio.</strong> Don't tough it out. Cheap injuries become chronic problems.</li>`;
                html += `<li><strong>Return at 50%.</strong> When you come back, start at half your pre-injury weight and rebuild over 3\u20134 weeks.</li>`;
                html += `</ol>`;

                html += `<h3>The Most Underrated Tip</h3>`;
                html += insightHtml(`<strong>Strengthen the weak link, don't just rest it.</strong> Sore knees? Build your VMO with split squats. Sore lower back? Build it with hyperextensions and RDLs. Rest alone rarely fixes anything.`);

                html += verseHtml({ text: "He gives strength to the weary and increases the power of the weak.", ref: "Isaiah 40:29" });
                return html;
            },
        },
        {
            id: 'greeting',
            keywords: ['hello', 'hi', 'hey', 'sup', 'what\'s up', 'good morning', 'good evening', 'howdy'],
            handler: (ctx) => {
                const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'there';
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

                let html = `<p>${greeting}, ${name}! I'm your Iron Faith Coach. Here's a quick snapshot:</p>`;

                html += `<ul>`;
                if (ctx.todayWorkouts.length > 0) {
                    html += `<li>You've logged ${ctx.todayWorkouts.length} exercises today. Nice work!</li>`;
                } else {
                    html += `<li>No workout logged today yet. Ready to train?</li>`;
                }
                if (ctx.todayMeals.length > 0) {
                    const todayCals = ctx.todayMeals.reduce((s,m) => s + m.calories, 0);
                    html += `<li>Nutrition: ${todayCals} calories logged today.</li>`;
                }
                html += `<li>Training days this week: ${ctx.weekDays}</li>`;
                html += `</ul>`;

                html += `<p>Ask me anything — workout plans, nutrition advice, form tips, progress analysis, or just some motivation!</p>`;
                html += verseHtml();
                return html;
            },
        },
        {
            id: 'progress_photos',
            keywords: ['progress photo', 'progress pic', 'transformation', 'before after', 'before and after', 'compare photo', 'how do i look', 'physique check', 'mirror check', 'body change'],
            handler: (ctx) => {
                const stats = ctx.progressPhotos || { count: 0, daysSinceLast: null };
                let html = `<h3>Progress Photos: The Honest Mirror</h3>`;
                html += `<p>The scale lies (water, glycogen, food in your gut can swing you 4\u20136 lbs day-to-day). The mirror lies too \u2014 you see yourself daily so change is invisible. Photos taken on the same schedule, same light, same angles are the only honest measurement of body composition you can do at home.</p>`;
                html += insightHtml(`<strong>Why it works.</strong> Helms et al. 2014 and the Lichtman tracking research both rank visual self-monitoring as a top-3 predictor of long-term physique adherence \u2014 above scale weight, above measurements.`);

                if (stats.count === 0) {
                    html += `<h3>You haven't taken one yet</h3>`;
                    html += `<p>Open your <strong>Profile tab</strong> and tap <strong>Add First Photo</strong>. Tag the angle (front, side, or back) and you're done.</p>`;
                } else if (stats.daysSinceLast !== null && stats.daysSinceLast >= 14) {
                    html += `<h3>Your timeline</h3>`;
                    html += `<p>You have <strong>${stats.count}</strong> photo${stats.count !== 1 ? 's' : ''}. Your last one was <strong>${stats.daysSinceLast} days ago</strong> \u2014 time for the next one. Same lighting, same angle, same time of day.</p>`;
                } else {
                    html += `<h3>Your timeline</h3>`;
                    html += `<p>You have <strong>${stats.count}</strong> photo${stats.count !== 1 ? 's' : ''} on file${stats.daysSinceLast !== null ? ` (last one ${stats.daysSinceLast} day${stats.daysSinceLast !== 1 ? 's' : ''} ago)` : ''}. ${stats.count >= 2 ? 'Open Profile and tap <strong>Compare</strong> to put any two side-by-side.' : 'Take your next one in 2\u20134 weeks to start a real comparison.'}</p>`;
                }

                html += `<h3>How to take a photo that's actually useful</h3><ol>`;
                html += `<li><strong>Same time of day.</strong> Morning, fasted, post-bathroom. Glycogen and gut content swing your look hourly.</li>`;
                html += `<li><strong>Same lighting.</strong> Overhead light flatters \u2014 it's also a liar. Use natural window light or a fixed lamp position.</li>`;
                html += `<li><strong>Same camera distance and height.</strong> Phone at chest height, ~6 feet back. Mark the spot with tape if you have to.</li>`;
                html += `<li><strong>Three angles every time.</strong> Front relaxed, side relaxed, back relaxed. Optional flexed set after.</li>`;
                html += `<li><strong>Minimal clothing.</strong> Same outfit each session so you're comparing tissue, not fabric.</li>`;
                html += `</ol>`;

                html += `<h3>How often</h3>`;
                html += `<p>Every <strong>2\u20134 weeks</strong>. Weekly is too noisy \u2014 you'll see water weight and lighting differences and convince yourself nothing's working. Monthly is the sweet spot for a fat-loss or recomp phase. Every 3\u20134 weeks for a lean bulk.</p>`;

                html += `<h3>What I will not do</h3>`;
                html += `<p>I used to try to grade your form from a single still photo using a 17-keypoint pose model. I'm being honest with you: it didn't work. One frame can't see your bar path, can't tell if your brace held, and gets the joint angles wrong because of camera tilt. Progress photos are honest. AI form-grading from a still wasn't.</p>`;
                html += `<p>For real form feedback, ask me about a specific lift \u2014 "<em>bench press form</em>" or "<em>how do I deadlift</em>" \u2014 and I'll give you the cues, common mistakes, and how to film yourself for self-review.</p>`;

                html += verseHtml();
                return html;
            },
        },
        // ========== NUTRITION CALCULATOR ==========
        {
            id: 'nutrition_calculator',
            keywords: ['how much.*eat', 'macro.*calculator', 'calculate.*macro', 'my macro', 'what.*my.*macro',
                'how many.*carb', 'how much.*fat.*eat', 'calorie.*need', 'tdee', 'maintenance.*calorie',
                'macro.*split', 'calorie.*calculator', 'how much.*eat.*to.*lose', 'how much.*eat.*to.*gain',
                'what should i eat', 'how many calories', 'caloric.*need', 'macro.*breakdown'],
            handler: (ctx, input) => {
                const unit = wu();
                const { tdee, wt, kg } = computeTDEE(ctx);
                const goal = ctx.profile.goal || 'maintain';
                const level = getUserLevel(ctx);
                let html = `<h3>Your Personalized Nutrition Calculator</h3>`;

                if (ctx.currentWeight <= 0) {
                    html += `<p>Log your body weight in the app so I can give you exact numbers. For now, here are general guidelines:</p>`;
                    html += `<ul><li>Protein: 0.8-1g per lb bodyweight</li><li>Calories: depends on your TDEE</li></ul>`;
                    html += verseHtml();
                    return html;
                }

                // Calorie targets by goal
                let targetCal, proteinG, carbG, fatG, goalLabel;
                if (goal === 'lose') {
                    targetCal = tdee - 500;
                    proteinG = Math.round(wt * 1.0);
                    fatG = Math.round(wt * 0.35);
                    carbG = Math.round((targetCal - (proteinG * 4) - (fatG * 9)) / 4);
                    goalLabel = 'Fat Loss (-500 kcal deficit)';
                } else if (goal === 'gain') {
                    targetCal = tdee + 300;
                    proteinG = Math.round(wt * 0.85);
                    fatG = Math.round(wt * 0.4);
                    carbG = Math.round((targetCal - (proteinG * 4) - (fatG * 9)) / 4);
                    goalLabel = 'Lean Bulk (+300 kcal surplus)';
                } else {
                    targetCal = tdee;
                    proteinG = Math.round(wt * 0.8);
                    fatG = Math.round(wt * 0.35);
                    carbG = Math.round((targetCal - (proteinG * 4) - (fatG * 9)) / 4);
                    goalLabel = 'Maintenance';
                }

                html += insightHtml(`At <strong>${lbsToDisplay(wt)} ${unit}</strong>, training <strong>${ctx.weekDays}x/week</strong>, your estimated TDEE is <strong>${tdee} kcal/day</strong>.`);

                html += `<h3>${goalLabel}</h3>`;
                html += `<table class="plan-table">`;
                html += `<tr><th>Macro</th><th>Daily</th><th>Per Meal (4 meals)</th><th>Calories</th></tr>`;
                html += `<tr><td><strong>Protein</strong></td><td>${proteinG}g</td><td>${Math.round(proteinG/4)}g</td><td>${proteinG*4} kcal</td></tr>`;
                html += `<tr><td><strong>Carbs</strong></td><td>${carbG}g</td><td>${Math.round(carbG/4)}g</td><td>${carbG*4} kcal</td></tr>`;
                html += `<tr><td><strong>Fat</strong></td><td>${fatG}g</td><td>${Math.round(fatG/4)}g</td><td>${fatG*9} kcal</td></tr>`;
                html += `<tr><td><strong>Total</strong></td><td colspan="2"></td><td><strong>${targetCal} kcal</strong></td></tr>`;
                html += `</table>`;

                // Compare to actual intake if available
                if (ctx.weekNutrition.days > 0) {
                    const diff = ctx.weekNutrition.calories - targetCal;
                    const protDiff = ctx.weekNutrition.protein - proteinG;
                    html += `<h3>Your Actual vs Target (7-day avg)</h3>`;
                    html += `<ul>`;
                    html += `<li>Calories: <strong>${ctx.weekNutrition.calories}</strong> vs ${targetCal} target (${diff > 0 ? '+' : ''}${diff})</li>`;
                    html += `<li>Protein: <strong>${ctx.weekNutrition.protein}g</strong> vs ${proteinG}g target (${protDiff > 0 ? '+' : ''}${protDiff}g)</li>`;
                    html += `</ul>`;
                    if (Math.abs(diff) > 300) html += insightHtml(diff > 0 ? `You're eating ${diff} cal over target. ${goal === 'gain' ? 'Might be gaining more fat than needed.' : 'This could slow your progress.'}` : `You're ${Math.abs(diff)} cal under. ${goal === 'lose' ? 'Be careful not to go too low — muscle loss increases below BMR.' : 'You may need to eat more to support your goals.'}`);
                }

                html += `<h3>Quick Reference</h3><ul>`;
                html += `<li><strong>Protein sources:</strong> Chicken breast (31g/4oz), Greek yogurt (15g/cup), eggs (6g each), whey protein (25g/scoop)</li>`;
                html += `<li><strong>Timing:</strong> Spread protein across 4+ meals for optimal MPS (Schoenfeld & Aragon 2018)</li>`;
                html += `<li><strong>Adjust every 2 weeks:</strong> If weight isn't moving in the right direction, adjust by 200 cal</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "Therefore, whether you eat or drink, or whatever you do, do all to the glory of God.", ref: "1 Corinthians 10:31" });
                return html;
            },
        },
        // ========== PROGRESSIVE OVERLOAD ADVISOR ==========
        {
            id: 'progressive_overload',
            keywords: ['progressive overload', 'increase weight', 'go up in weight', 'add weight', 'when.*increase',
                'should.*go.*heavier', 'ready.*increase', 'move up.*weight', 'weight.*progression',
                'how.*progress', 'am i ready', 'can i go heavier', 'overload', 'progression'],
            handler: (ctx) => {
                const unit = wu();
                let html = `<h3>Progressive Overload Analysis</h3>`;

                if (ctx.workouts.length < 5) {
                    html += `<p>I need more workout data to analyze your progression. Keep logging your sets and weights, and I'll be able to tell you exactly when to increase.</p>`;
                    html += verseHtml();
                    return html;
                }

                // Exercises ready to increase
                if (ctx.overloadReady.length > 0) {
                    html += `<h3>Ready to Increase</h3>`;
                    html += `<p>You hit all your reps in the last 2 sessions on these — time to go up:</p>`;
                    html += `<table class="plan-table"><tr><th>Exercise</th><th>Current</th><th>Next Session</th></tr>`;
                    ctx.overloadReady.forEach(e => {
                        html += `<tr><td><strong>${e.name}</strong></td><td>${lbsToDisplay(e.currentMax)} ${unit}</td><td><strong>${lbsToDisplay(e.currentMax + e.suggestedIncrease)} ${unit}</strong> (+${lbsToDisplay(e.suggestedIncrease)})</td></tr>`;
                    });
                    html += `</table>`;
                }

                // Stagnant exercises
                if (ctx.stagnant.length > 0) {
                    html += `<h3>Stagnant — Needs a Change</h3>`;
                    html += `<p>Same weight for 4+ sessions. Try one of these strategies:</p><ul>`;
                    ctx.stagnant.forEach(name => {
                        const pr = ctx.exercisePRs[name] || 0;
                        html += `<li><strong>${name}</strong> (stuck at ${lbsToDisplay(pr)} ${unit}): `;
                        html += `Drop to ${lbsToDisplay(Math.round(pr * 0.85))} ${unit} for 2 weeks at higher reps (10-12), then rebuild. Or try a variation.</li>`;
                    });
                    html += `</ul>`;
                }

                // Progressing well
                const progressing = [];
                for (const [name, logs] of Object.entries(ctx.exercisesByName)) {
                    if (logs.length >= 4 && !ctx.stagnant.includes(name) && !ctx.overloadReady.find(e => e.name === name)) {
                        const early = logs.slice(-4, -2);
                        const late = logs.slice(-2);
                        const earlyMax = Math.max(...early.map(l => Math.max(...l.sets.map(s => s.weight))));
                        const lateMax = Math.max(...late.map(l => Math.max(...l.sets.map(s => s.weight))));
                        if (lateMax > earlyMax) progressing.push({ name, gain: lateMax - earlyMax });
                    }
                }
                if (progressing.length > 0) {
                    html += `<h3>Progressing Well</h3><ul>`;
                    progressing.slice(0, 5).forEach(e => {
                        html += `<li><strong>${e.name}:</strong> +${lbsToDisplay(e.gain)} ${unit} over last 4 sessions</li>`;
                    });
                    html += `</ul>`;
                }

                if (ctx.overloadReady.length === 0 && ctx.stagnant.length === 0 && progressing.length === 0) {
                    html += `<p>Not enough session history for specific advice yet. Keep logging and I'll track your progression automatically.</p>`;
                }

                html += `<h3>Overload Rules of Thumb</h3><ul>`;
                html += `<li><strong>Compounds:</strong> Add ${lbsToDisplay(5)}-${lbsToDisplay(10)} ${unit} when you hit all prescribed reps for 2 sessions</li>`;
                html += `<li><strong>Isolation:</strong> Add ${lbsToDisplay(2.5)}-${lbsToDisplay(5)} ${unit} or add 1-2 reps first</li>`;
                html += `<li><strong>Double progression:</strong> Work in a rep range (e.g. 8-12). When you can do 12 on all sets, increase weight and drop back to 8</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", ref: "Galatians 6:9" });
                return html;
            },
        },
        // ========== EQUIPMENT-BASED SUBSTITUTIONS ==========
        {
            id: 'equipment_swap',
            keywords: ['no barbell', 'don\'t have.*barbell', 'only.*dumbbell', 'home gym', 'no.*equipment',
                'just.*bodyweight', 'resistance band', 'no cable', 'don\'t have.*bench',
                'hotel.*gym', 'travel.*workout', 'equipment.*substitute', 'what.*can.*use.*instead',
                'dumbbell.*only', 'apartment.*workout', 'no rack', 'minimal.*equipment'],
            handler: (ctx, input) => {
                const lower = input.toLowerCase();
                let html = `<h3>Equipment-Based Exercise Swaps</h3>`;

                // Detect what equipment they have or are missing
                let available = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];
                if (/no\s*(?:barbell|bar\b)|don't have.*barbell|without.*barbell/.test(lower)) available = available.filter(e => e !== 'barbell');
                if (/no\s*(?:machine|cable)|don't have.*machine|don't have.*cable/.test(lower)) { available = available.filter(e => e !== 'machine' && e !== 'cable'); }
                if (/home\s*gym|apartment|at\s*home|no\s*gym/.test(lower)) available = ['dumbbell', 'bodyweight', 'bands'];
                if (/bodyweight\s*only|no\s*(?:weight|equipment)|just\s*body/.test(lower)) available = ['bodyweight'];
                if (/hotel|travel/.test(lower)) available = ['bodyweight', 'bands'];
                if (/dumbbell.*only|only.*dumbbell/.test(lower)) available = ['dumbbell', 'bodyweight'];

                const swapDB = {
                    'Bench Press':     { barbell: 'Barbell Bench Press', dumbbell: 'Dumbbell Bench Press', bodyweight: 'Push-ups (elevated feet for intensity)', machine: 'Machine Chest Press', bands: 'Band Chest Press', cable: 'Cable Fly' },
                    'Squat':           { barbell: 'Barbell Back Squat', dumbbell: 'Goblet Squat / DB Split Squat', bodyweight: 'Bulgarian Split Squat / Pistol Squat', machine: 'Hack Squat / Leg Press', bands: 'Band Squat', cable: 'Cable Squat' },
                    'Deadlift':        { barbell: 'Barbell Deadlift', dumbbell: 'Dumbbell RDL', bodyweight: 'Single-Leg RDL / Nordic Curl', machine: 'Leg Curl + Back Extension', bands: 'Band Good Morning', cable: 'Cable Pull-Through' },
                    'Overhead Press':  { barbell: 'Barbell OHP', dumbbell: 'Seated DB Shoulder Press', bodyweight: 'Pike Push-up / Handstand Push-up', machine: 'Machine Shoulder Press', bands: 'Band Overhead Press', cable: 'Cable Lateral Raise' },
                    'Barbell Row':     { barbell: 'Barbell Row', dumbbell: 'Dumbbell Row', bodyweight: 'Inverted Row (under table)', machine: 'Machine Row', bands: 'Band Row', cable: 'Seated Cable Row' },
                    'Pull-ups':        { barbell: 'Barbell Row', dumbbell: 'Dumbbell Row', bodyweight: 'Inverted Row / Door Pull-ups', machine: 'Lat Pulldown', bands: 'Band Lat Pulldown', cable: 'Cable Lat Pulldown' },
                    'Lat Pulldown':    { barbell: 'Pull-ups', dumbbell: 'DB Pullover', bodyweight: 'Pull-ups / Chin-ups', machine: 'Lat Pulldown', bands: 'Band Lat Pulldown', cable: 'Cable Lat Pulldown' },
                    'Leg Press':       { barbell: 'Squat', dumbbell: 'Goblet Squat', bodyweight: 'Bulgarian Split Squat', machine: 'Leg Press', bands: 'Band Squat', cable: 'N/A — use squat variation' },
                    'Leg Curl':        { barbell: 'Romanian Deadlift', dumbbell: 'DB Romanian Deadlift', bodyweight: 'Nordic Curl / Slider Curl', machine: 'Leg Curl Machine', bands: 'Band Leg Curl', cable: 'Cable Leg Curl' },
                    'Bicep Curls':     { barbell: 'Barbell Curl', dumbbell: 'Dumbbell Curl', bodyweight: 'Chin-ups (underhand)', machine: 'Machine Curl', bands: 'Band Curl', cable: 'Cable Curl' },
                    'Tricep Pushdown': { barbell: 'Close-Grip Bench', dumbbell: 'DB Overhead Extension', bodyweight: 'Diamond Push-ups / Dips', machine: 'Machine Tricep Press', bands: 'Band Pushdown', cable: 'Cable Pushdown' },
                    'Cable Fly':       { barbell: 'Dumbbell Fly', dumbbell: 'Dumbbell Fly', bodyweight: 'Wide Push-ups', machine: 'Pec Deck', bands: 'Band Fly', cable: 'Cable Fly' },
                    'Hip Thrust':      { barbell: 'Barbell Hip Thrust', dumbbell: 'DB Hip Thrust', bodyweight: 'Single-Leg Glute Bridge', machine: 'Hip Thrust Machine', bands: 'Band Hip Thrust', cable: 'Cable Pull-Through' },
                };

                html += `<p><strong>Available equipment:</strong> ${available.join(', ')}</p>`;
                html += `<table class="plan-table"><tr><th>Exercise</th><th>Your Best Option</th></tr>`;
                for (const [exercise, options] of Object.entries(swapDB)) {
                    const best = available.map(eq => options[eq]).find(v => v) || 'No direct substitute — skip or ask me';
                    html += `<tr><td>${exercise}</td><td><strong>${best}</strong></td></tr>`;
                }
                html += `</table>`;

                html += `<h3>Tips for Limited Equipment</h3><ul>`;
                if (!available.includes('barbell')) html += `<li><strong>No barbell?</strong> Dumbbells are actually better for hypertrophy in many cases — more ROM, unilateral work fixes imbalances</li>`;
                if (available.includes('bodyweight') && available.length <= 2) html += `<li><strong>Bodyweight only?</strong> Use tempo (4 sec down), pause reps, and unilateral progressions. A backpack with books adds load</li>`;
                if (available.includes('bands')) html += `<li><strong>Bands:</strong> Great for accessories. Ascending resistance matches your strength curve on pressing movements</li>`;
                html += `<li><strong>Progressive overload still applies.</strong> More reps, slower tempo, harder variations, less rest — all are overload</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
        // ========== CUSTOM WORKOUT PLAN GENERATOR ==========
        {
            id: 'custom_plan',
            keywords: ['ppl', 'push.?pull.?legs', 'upper.?lower', 'bro split', '\\d+.?day.*program',
                '\\d+.?day.*split', '\\d+.?day.*routine', 'full body.*program', 'give me a.*split',
                'make me a.*program', 'create.*split', 'create.*program', 'design.*program',
                'write me a.*program', 'build.*program', 'custom.*plan', 'custom.*split',
                'arnold split', '3 day', '4 day', '5 day', '6 day'],
            handler: (ctx, input) => {
                const lower = input.toLowerCase();
                const unit = wu();
                const level = getUserLevel(ctx);
                const goal = ctx.profile.goal || 'maintain';

                // Detect requested split type
                let splitType = 'auto';
                if (/push.?pull.?leg|ppl/i.test(lower)) splitType = 'ppl';
                else if (/upper.?lower|upper.?\/?.?lower/i.test(lower)) splitType = 'upper_lower';
                else if (/full.?body/i.test(lower)) splitType = 'full_body';
                else if (/bro.?split/i.test(lower)) splitType = 'bro_split';
                else if (/arnold/i.test(lower)) splitType = 'arnold';

                // Detect day count
                let days = 0;
                const dayMatch = lower.match(/(\d)\s*(?:day|x)/);
                if (dayMatch) days = parseInt(dayMatch[1]);

                // Auto-detect best split if not specified
                if (splitType === 'auto') {
                    if (days <= 3) splitType = 'full_body';
                    else if (days === 4) splitType = 'upper_lower';
                    else if (days >= 5) splitType = 'ppl';
                    else splitType = level === 'beginner' ? 'full_body' : 'ppl';
                }

                const splits = {
                    ppl: {
                        name: 'Push / Pull / Legs', daysPerWeek: 6, note: 'Run as 3-on-1-off or PPL/rest/PPL',
                        days: [
                            { day: 'Push', exercises: [
                                { name: 'Bench Press', sets: '4x6-8' }, { name: 'Overhead Press', sets: '3x8-10' },
                                { name: 'Incline Dumbbell Press', sets: '3x10-12' }, { name: 'Lateral Raises', sets: '4x12-15' },
                                { name: 'Tricep Pushdown', sets: '3x10-12' }, { name: 'Overhead Tricep Extension', sets: '3x12-15' },
                            ]},
                            { day: 'Pull', exercises: [
                                { name: 'Barbell Row', sets: '4x6-8' }, { name: 'Pull-ups / Lat Pulldown', sets: '3x8-10' },
                                { name: 'Seated Cable Row', sets: '3x10-12' }, { name: 'Face Pulls', sets: '4x15-20' },
                                { name: 'Barbell Curl', sets: '3x10-12' }, { name: 'Hammer Curls', sets: '3x12-15' },
                            ]},
                            { day: 'Legs', exercises: [
                                { name: 'Squat', sets: '4x6-8' }, { name: 'Romanian Deadlift', sets: '3x8-10' },
                                { name: 'Leg Press', sets: '3x10-12' }, { name: 'Leg Curl', sets: '3x10-12' },
                                { name: 'Calf Raises', sets: '4x12-15' }, { name: 'Hanging Leg Raise', sets: '3x12-15' },
                            ]},
                        ]
                    },
                    upper_lower: {
                        name: 'Upper / Lower', daysPerWeek: 4, note: 'Mon/Tue/Thu/Fri or any 2-on-1-off pattern',
                        days: [
                            { day: 'Upper A (Strength)', exercises: [
                                { name: 'Bench Press', sets: '4x5' }, { name: 'Barbell Row', sets: '4x5' },
                                { name: 'Overhead Press', sets: '3x8' }, { name: 'Pull-ups', sets: '3x8' },
                                { name: 'Lateral Raises', sets: '3x15' }, { name: 'Barbell Curl', sets: '2x12' },
                            ]},
                            { day: 'Lower A (Strength)', exercises: [
                                { name: 'Squat', sets: '4x5' }, { name: 'Romanian Deadlift', sets: '3x8' },
                                { name: 'Leg Press', sets: '3x10' }, { name: 'Leg Curl', sets: '3x10' },
                                { name: 'Calf Raises', sets: '4x12' }, { name: 'Ab Wheel Rollout', sets: '3x10' },
                            ]},
                            { day: 'Upper B (Hypertrophy)', exercises: [
                                { name: 'Incline Dumbbell Press', sets: '4x10' }, { name: 'Seated Cable Row', sets: '4x10' },
                                { name: 'Dumbbell Shoulder Press', sets: '3x12' }, { name: 'Lat Pulldown', sets: '3x12' },
                                { name: 'Cable Fly', sets: '3x15' }, { name: 'Tricep Pushdown', sets: '3x12' },
                            ]},
                            { day: 'Lower B (Hypertrophy)', exercises: [
                                { name: 'Front Squat', sets: '3x10' }, { name: 'Hip Thrust', sets: '4x10' },
                                { name: 'Walking Lunges', sets: '3x12/leg' }, { name: 'Leg Extension', sets: '3x15' },
                                { name: 'Seated Calf Raise', sets: '4x15' }, { name: 'Hanging Leg Raise', sets: '3x12' },
                            ]},
                        ]
                    },
                    full_body: {
                        name: 'Full Body', daysPerWeek: 3, note: 'Mon/Wed/Fri with rest days between',
                        days: [
                            { day: 'Day A', exercises: [
                                { name: 'Squat', sets: '3x8' }, { name: 'Bench Press', sets: '3x8' },
                                { name: 'Barbell Row', sets: '3x8' }, { name: 'Overhead Press', sets: '3x10' },
                                { name: 'Bicep Curls', sets: '2x12' }, { name: 'Plank', sets: '3x30-45s' },
                            ]},
                            { day: 'Day B', exercises: [
                                { name: 'Deadlift', sets: '3x5' }, { name: 'Dumbbell Bench Press', sets: '3x10' },
                                { name: 'Pull-ups / Lat Pulldown', sets: '3x8-10' }, { name: 'Lunges', sets: '3x10/leg' },
                                { name: 'Face Pulls', sets: '3x15' }, { name: 'Cable Crunch', sets: '3x12' },
                            ]},
                        ]
                    },
                    bro_split: {
                        name: '5-Day Bro Split', daysPerWeek: 5, note: 'Mon-Fri, weekends off',
                        days: [
                            { day: 'Chest', exercises: [
                                { name: 'Bench Press', sets: '4x6-8' }, { name: 'Incline Dumbbell Press', sets: '4x8-10' },
                                { name: 'Cable Fly', sets: '3x12-15' }, { name: 'Dips', sets: '3x10-12' },
                            ]},
                            { day: 'Back', exercises: [
                                { name: 'Deadlift', sets: '4x5' }, { name: 'Barbell Row', sets: '4x8' },
                                { name: 'Lat Pulldown', sets: '3x10-12' }, { name: 'Seated Cable Row', sets: '3x10-12' },
                            ]},
                            { day: 'Shoulders', exercises: [
                                { name: 'Overhead Press', sets: '4x6-8' }, { name: 'Lateral Raises', sets: '4x12-15' },
                                { name: 'Face Pulls', sets: '3x15-20' }, { name: 'Rear Delt Fly', sets: '3x15' },
                            ]},
                            { day: 'Legs', exercises: [
                                { name: 'Squat', sets: '4x6-8' }, { name: 'Romanian Deadlift', sets: '3x8-10' },
                                { name: 'Leg Press', sets: '3x10-12' }, { name: 'Leg Curl', sets: '3x10-12' },
                                { name: 'Calf Raises', sets: '4x12-15' },
                            ]},
                            { day: 'Arms', exercises: [
                                { name: 'Barbell Curl', sets: '4x8-10' }, { name: 'Close-Grip Bench Press', sets: '4x8-10' },
                                { name: 'Hammer Curls', sets: '3x10-12' }, { name: 'Skull Crushers', sets: '3x10-12' },
                                { name: 'Cable Curl', sets: '3x12-15' }, { name: 'Tricep Pushdown', sets: '3x12-15' },
                            ]},
                        ]
                    },
                    arnold: {
                        name: 'Arnold Split', daysPerWeek: 6, note: 'Chest+Back / Shoulders+Arms / Legs, repeated 2x',
                        days: [
                            { day: 'Chest + Back', exercises: [
                                { name: 'Bench Press', sets: '4x6-8' }, { name: 'Barbell Row', sets: '4x6-8' },
                                { name: 'Incline Dumbbell Press', sets: '3x10' }, { name: 'Pull-ups', sets: '3x10' },
                                { name: 'Cable Fly', sets: '3x12' }, { name: 'Seated Cable Row', sets: '3x12' },
                            ]},
                            { day: 'Shoulders + Arms', exercises: [
                                { name: 'Arnold Press', sets: '4x8-10' }, { name: 'Lateral Raises', sets: '4x12-15' },
                                { name: 'Barbell Curl', sets: '3x10' }, { name: 'Skull Crushers', sets: '3x10' },
                                { name: 'Hammer Curls', sets: '3x12' }, { name: 'Tricep Pushdown', sets: '3x12' },
                            ]},
                            { day: 'Legs', exercises: [
                                { name: 'Squat', sets: '4x6-8' }, { name: 'Romanian Deadlift', sets: '3x8-10' },
                                { name: 'Leg Press', sets: '3x10-12' }, { name: 'Leg Curl', sets: '3x10-12' },
                                { name: 'Calf Raises', sets: '4x12-15' }, { name: 'Hanging Leg Raise', sets: '3x12' },
                            ]},
                        ]
                    },
                };

                const split = splits[splitType] || splits.ppl;
                let html = `<h3>${split.name} Program</h3>`;
                html += insightHtml(`<strong>${split.daysPerWeek} days/week</strong> | Level: ${level} | Goal: ${goal} | ${split.note}`);

                // Add PR-based weight suggestions
                const hasPRs = Object.keys(ctx.exercisePRs).length > 0;

                split.days.forEach(d => {
                    html += `<h3>${d.day}</h3>`;
                    html += `<table class="plan-table"><tr><th>Exercise</th><th>Sets x Reps</th>${hasPRs ? '<th>Target Weight</th>' : ''}</tr>`;
                    d.exercises.forEach(e => {
                        let targetWeight = '';
                        if (hasPRs && ctx.exercisePRs[e.name]) {
                            const pr = ctx.exercisePRs[e.name];
                            const isStrength = e.sets.includes('x5') || e.sets.includes('x6');
                            const pct = isStrength ? 0.85 : 0.7;
                            targetWeight = `~${lbsToDisplay(Math.round(pr * pct / 5) * 5)} ${unit}`;
                        }
                        html += `<tr><td><strong>${e.name}</strong></td><td>${e.sets}</td>${hasPRs ? `<td>${targetWeight}</td>` : ''}</tr>`;
                    });
                    html += `</table>`;
                });

                html += `<h3>Progression Protocol</h3><ul>`;
                html += `<li><strong>Double progression:</strong> Work within the rep range. When you hit the top of the range on all sets, increase weight by ${lbsToDisplay(5)} ${unit} (compounds) or ${lbsToDisplay(2.5)} ${unit} (isolation)</li>`;
                html += `<li><strong>Deload every 6-8 weeks:</strong> Drop to 60% working weight for 1 week</li>`;
                html += `</ul>`;
                html += verseHtml({ text: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you.", ref: "Jeremiah 29:11" });
                return html;
            },
        },
        // ========== INJURY / PAIN GUIDANCE ==========
        {
            id: 'injury_guidance',
            keywords: ['shoulder.*hurt', 'knee.*hurt', 'back.*hurt', 'elbow.*hurt', 'wrist.*hurt',
                'hip.*hurt', 'pain.*when', 'hurts.*when', 'shoulder.*pain', 'knee.*pain',
                'back.*pain', 'elbow.*pain', 'hip.*pain', 'can\'t.*without.*pain',
                'sharp.*pain', 'pinch.*in', 'tweaked.*my', 'pulled.*my', 'strained.*my',
                'sore.*after', 'injured', 'injury.*help', 'hurts to'],
            handler: (ctx, input) => {
                const lower = input.toLowerCase();
                const bodyParts = {
                    shoulder: {
                        causes: ['Poor bench form (elbows flared past 75\u00b0)', 'Too much pressing volume without rear delt work', 'Weak rotator cuff muscles', 'Sleeping on one side'],
                        avoid: ['Behind-the-neck press', 'Upright rows above nipple height', 'Wide-grip bench press', 'Any movement that reproduces the pain'],
                        alternatives: { 'Bench Press': 'Floor Press, Neutral-grip DB Press', 'Overhead Press': 'Landmine Press, Cable Lateral Raise', 'Dips': 'Close-grip Bench Press', 'Lateral Raises': 'Cable Lateral Raise (arm slightly forward)' },
                        mobility: ['Band pull-aparts: 3x20 daily', 'Face pulls: 3x15 daily', 'Sleeper stretch: 30s each side', 'Wall slides: 2x10', 'Thoracic spine foam rolling: 2 min'],
                        redFlags: ['Pain at rest that wakes you up', 'Numbness or tingling down the arm', 'Cannot lift arm above shoulder height', 'Popping with sharp pain', 'Visible swelling or deformity'],
                    },
                    knee: {
                        causes: ['Quad dominance without hamstring work', 'Sudden increases in squat volume', 'Poor ankle mobility forcing knee cave', 'Running on hard surfaces'],
                        avoid: ['Deep heavy squats (temporarily)', 'Full-range leg extensions with heavy load', 'Plyometrics / jumping'],
                        alternatives: { 'Squat': 'Box Squat (to pain-free depth), Leg Press (limited ROM)', 'Lunges': 'Reverse Lunges (less knee stress)', 'Leg Extension': 'Terminal Knee Extensions with band' },
                        mobility: ['Foam roll quads and IT band: 2 min each', 'Wall ankle stretches: 3x30s', 'Banded terminal knee extensions: 3x15', 'Glute activation (clamshells, band walks)'],
                        redFlags: ['Knee locks or gives way', 'Significant swelling within hours', 'Cannot bear weight', 'Clicking with pain', 'Pain persists more than 2 weeks'],
                    },
                    'lower back': {
                        causes: ['Rounding during deadlifts', 'Weak core / poor bracing', 'Sitting 8+ hours/day', 'Sudden jump in deadlift/squat volume'],
                        avoid: ['Heavy conventional deadlifts (temporarily)', 'Good mornings with heavy weight', 'Sit-ups and crunches (spinal flexion under load)'],
                        alternatives: { 'Deadlift': 'Trap Bar Deadlift, Hip Thrust, Cable Pull-Through', 'Squat': 'Goblet Squat, Belt Squat, Leg Press', 'Barbell Row': 'Chest-Supported Row, Seated Cable Row' },
                        mobility: ['Cat-cow stretches: 2x10', 'Dead bug: 3x10 (core activation)', 'Bird dog: 3x10 each side', 'Child\'s pose: hold 60s', 'McGill Big 3: curl-up, side plank, bird dog'],
                        redFlags: ['Pain radiating down the leg (sciatica)', 'Numbness or tingling in legs/feet', 'Loss of bladder/bowel control (ER immediately)', 'Pain that worsens over days despite rest'],
                    },
                    elbow: {
                        causes: ['Too much curl volume', 'Poor grip during pressing (wrist bent back)', 'Sudden increase in pulling volume', 'Tennis or golf (lateral vs medial epicondylitis)'],
                        avoid: ['Skull crushers (high elbow stress)', 'Heavy barbell curls with straight bar', 'Behind-the-neck tricep extensions'],
                        alternatives: { 'Barbell Curl': 'EZ Bar Curl, Hammer Curls (neutral grip)', 'Skull Crushers': 'Cable Pushdown, Overhead Cable Extension', 'Pull-ups': 'Neutral-grip Pull-ups, Lat Pulldown' },
                        mobility: ['Wrist extensor stretches: 3x30s', 'Wrist flexor stretches: 3x30s', 'Tyler Twist with Therabar: 3x15 (gold standard for tennis elbow)', 'Eccentric wrist extensions: 3x15'],
                        redFlags: ['Pain with gripping everyday objects', 'Persistent numbness in fingers', 'Pain lasting more than 4 weeks', 'Visible swelling at the elbow'],
                    },
                    hip: {
                        causes: ['Tight hip flexors from sitting', 'Squat depth beyond current mobility', 'Weak glute medius (hip drop during single-leg work)', 'Overuse from running'],
                        avoid: ['Deep sumo deadlifts (temporarily)', 'Heavy hip abduction machine', 'Aggressive stretching into pain'],
                        alternatives: { 'Squat': 'Box Squat to pain-free depth, Leg Press', 'Deadlift': 'Trap Bar Deadlift, Romanian Deadlift', 'Lunges': 'Step-ups, Sled Push' },
                        mobility: ['90/90 hip stretch: 3x30s each', 'Pigeon pose: hold 60s each', 'Hip flexor stretch (half-kneeling): 3x30s', 'Clamshells: 3x15 (glute med activation)', 'Adductor rocks: 2x10'],
                        redFlags: ['Clicking or locking in the hip joint', 'Pain in the groin that worsens with activity', 'Cannot put weight on the leg', 'Pain that persists more than 3 weeks'],
                    },
                    wrist: {
                        causes: ['Bent wrist during bench press or front rack', 'Heavy barbell curls straining wrist extensors', 'Excessive typing + heavy lifting combo'],
                        avoid: ['Straight bar curls (use EZ bar)', 'Heavy wrist curls', 'Push-ups on flat hands if painful'],
                        alternatives: { 'Bench Press': 'Bench with wrist wraps, Neutral-grip DB Press', 'Barbell Curl': 'EZ Bar Curl, Hammer Curls', 'Push-ups': 'Push-ups on knuckles or parallettes' },
                        mobility: ['Wrist circles: 2x10 each direction', 'Prayer stretch + reverse prayer: 3x30s', 'Finger extensions with rubber band: 3x20', 'Wrist roller: 2 sets'],
                        redFlags: ['Numbness in thumb, index, or middle finger (carpal tunnel)', 'Visible swelling or deformity', 'Cannot grip at all', 'Pain worsening despite 2 weeks rest'],
                    },
                };

                // Detect body part
                let part = null;
                if (/shoulder/i.test(lower)) part = 'shoulder';
                else if (/knee/i.test(lower)) part = 'knee';
                else if (/(?:lower\s*)?back|spine|lumbar/i.test(lower)) part = 'lower back';
                else if (/elbow/i.test(lower)) part = 'elbow';
                else if (/hip|groin/i.test(lower)) part = 'hip';
                else if (/wrist/i.test(lower)) part = 'wrist';

                if (!part) {
                    let html = `<h3>Injury & Pain Guidance</h3>`;
                    html += `<p>Tell me which body part is bothering you and I'll give you specific guidance:</p><ul>`;
                    html += `<li>"My <strong>shoulder</strong> hurts when I bench"</li>`;
                    html += `<li>"<strong>Knee</strong> pain during squats"</li>`;
                    html += `<li>"<strong>Lower back</strong> pain after deadlifts"</li>`;
                    html += `<li>"<strong>Elbow</strong> hurts when I curl"</li>`;
                    html += `<li>"<strong>Hip</strong> pain during squats"</li>`;
                    html += `<li>"<strong>Wrist</strong> pain on bench press"</li>`;
                    html += `</ul>`;
                    html += verseHtml();
                    return html;
                }

                const info = bodyParts[part];
                const partTitle = part.charAt(0).toUpperCase() + part.slice(1);
                let html = `<h3>${partTitle} Pain Guide</h3>`;

                // Check if they mentioned a specific exercise
                const exercise = _detectExercise(lower);
                if (exercise) {
                    html += insightHtml(`You mentioned ${exercise.name} \u2014 I'll focus my advice on that.`);
                }

                html += `<h3>Common Causes</h3><ul>`;
                info.causes.forEach(c => html += `<li>${c}</li>`);
                html += `</ul>`;

                html += `<h3>What to Avoid (Temporarily)</h3><ul>`;
                info.avoid.forEach(a => html += `<li>${a}</li>`);
                html += `</ul>`;

                html += `<h3>Exercise Swaps</h3>`;
                html += `<table class="plan-table"><tr><th>Instead of</th><th>Try</th></tr>`;
                for (const [from, to] of Object.entries(info.alternatives)) {
                    html += `<tr><td>${from}</td><td><strong>${to}</strong></td></tr>`;
                }
                html += `</table>`;

                html += `<h3>Mobility / Rehab Work</h3><ol>`;
                info.mobility.forEach(m => html += `<li>${m}</li>`);
                html += `</ol>`;

                html += `<h3>When to See a Doctor / Physio</h3><ul>`;
                info.redFlags.forEach(f => html += `<li>\u26a0\ufe0f ${f}</li>`);
                html += `</ul>`;

                html += insightHtml(`<strong>General rule:</strong> If it's a sharp pain, stop. If it's a dull ache that improves with warm-up, you can likely train around it with modifications. If it persists more than 2 weeks, see a professional.`);
                html += verseHtml({ text: "He heals the brokenhearted and binds up their wounds.", ref: "Psalm 147:3" });
                return html;
            },
        },
        // ========== REST & TEMPO RECOMMENDATIONS ==========
        {
            id: 'rest_tempo',
            keywords: ['tempo', 'eccentric', 'concentric', 'time under tension', 'tut',
                'how fast.*rep', 'rep.*speed', 'slow.*rep', 'rep.*tempo', 'counting.*rep',
                'lowering.*phase', 'negative.*rep'],
            handler: (ctx, input) => {
                const lower = input.toLowerCase();
                const goal = ctx.profile.goal || 'maintain';
                let html = `<h3>Tempo & Rep Speed Guide</h3>`;

                const tempoGuide = {
                    strength: { tempo: '1-0-X-0', desc: '1 sec down, no pause, explosive up, no pause at top', rest: '3-5 min', repRange: '1-5 reps' },
                    hypertrophy: { tempo: '2-1-1-0', desc: '2 sec eccentric, 1 sec pause at stretch, 1 sec up, no pause at top', rest: '2-3 min (compound) / 60-90s (isolation)', repRange: '6-12 reps' },
                    endurance: { tempo: '2-0-2-0', desc: '2 sec down, 2 sec up, steady controlled pace', rest: '30-60 sec', repRange: '15-25 reps' },
                };

                const goalMap = { lose: 'hypertrophy', gain: 'hypertrophy', maintain: 'hypertrophy' };
                const primaryGoal = goalMap[goal] || 'hypertrophy';
                const rec = tempoGuide[primaryGoal];

                html += insightHtml(`Based on your goal (<strong>${goal}</strong>), your primary tempo should be <strong>${rec.tempo}</strong> (${rec.desc}).`);

                html += `<h3>Tempo Notation Explained</h3>`;
                html += `<p>A tempo like <strong>3-1-1-0</strong> means:</p>`;
                html += `<table class="plan-table"><tr><th>Phase</th><th>Seconds</th><th>Example (Bench Press)</th></tr>`;
                html += `<tr><td>Eccentric (lowering)</td><td>3</td><td>3 sec lowering the bar to chest</td></tr>`;
                html += `<tr><td>Pause (stretched)</td><td>1</td><td>1 sec pause at chest</td></tr>`;
                html += `<tr><td>Concentric (lifting)</td><td>1</td><td>1 sec pressing up</td></tr>`;
                html += `<tr><td>Pause (top)</td><td>0</td><td>No pause at lockout</td></tr>`;
                html += `</table>`;

                html += `<h3>Tempo by Goal</h3>`;
                html += `<table class="plan-table"><tr><th>Goal</th><th>Tempo</th><th>Rest</th><th>Reps</th></tr>`;
                for (const [g, t] of Object.entries(tempoGuide)) {
                    const label = g.charAt(0).toUpperCase() + g.slice(1);
                    html += `<tr><td><strong>${label}</strong></td><td>${t.tempo}</td><td>${t.rest}</td><td>${t.repRange}</td></tr>`;
                }
                html += `</table>`;

                // Exercise-specific if detected
                const exercise = _detectExercise(lower);
                if (exercise) {
                    const isCompound = exercise.type === 'compound';
                    html += `<h3>For ${exercise.name}</h3>`;
                    html += `<ul>`;
                    html += `<li><strong>Type:</strong> ${isCompound ? 'Compound' : 'Isolation'}</li>`;
                    html += `<li><strong>Recommended rest:</strong> ${isCompound ? '2-3 min' : '60-90 sec'}</li>`;
                    html += `<li><strong>Recommended tempo:</strong> ${isCompound ? '2-1-1-0' : '3-1-1-0'} for hypertrophy</li>`;
                    html += `<li><strong>Key tip:</strong> ${isCompound ? 'Control the eccentric, explode on the concentric. Brace before every rep.' : 'Slow the eccentric to 3 sec. Feel the target muscle stretch. Squeeze at peak contraction.'}</li>`;
                    html += `</ul>`;
                }

                html += `<h3>Why Tempo Matters</h3><ul>`;
                html += `<li><strong>Slower eccentrics = more muscle damage = more growth signal</strong> (Schoenfeld 2017)</li>`;
                html += `<li><strong>Pause reps eliminate momentum</strong> — forces the target muscle to do all the work</li>`;
                html += `<li><strong>Tempo forces you to use appropriate weight</strong> — if you can't control the tempo, it's too heavy</li>`;
                html += `<li><strong>2-3 sec eccentrics are the sweet spot.</strong> Slower than 4 sec doesn't add benefit and tanks your volume capacity</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            },
        },
    ],

    // General fitness knowledge base — catches freeform questions that don't match a specific topic.
    // Keyword→answer pairs grounded in real exercise science so the coach can answer
    // open-ended questions like "will 30 mins on the stairmaster help me lose weight?"
    generalKnowledge: [
        {
            triggers: ['stairmaster', 'stair.?master', 'stair.?stepper', 'stair.?climb', 'step.?mill'],
            answer: (ctx) => {
                let html = `<h3>Stairmaster &amp; Stair Climbing</h3>`;
                html += `<p>30 minutes on a stairmaster at moderate intensity burns roughly <strong>250–400 calories</strong> depending on your weight and pace (Ainsworth et al. 2011 Compendium of Physical Activities: ~9 METs for stair-climbing machine).</p>`;
                html += insightHtml(`For a ${ctx.currentWeight || 180} lb person, 30 min ≈ <strong>${Math.round((ctx.currentWeight || 180) * 0.453592 * 9 * 0.5 * 1.05)}</strong> calories.`);
                html += `<p><strong>Will it help you lose weight?</strong> Only if your total daily calories stay below your TDEE. Cardio creates a larger deficit — but you can't outrun a bad diet. A 300-calorie stairmaster session is erased by one large bagel with cream cheese.</p>`;
                html += `<p><strong>Best use:</strong> 2–3 sessions per week as a Zone 2 cardio tool (you can hold a conversation). Great for glute and quad endurance, low joint impact vs running. Pair with resistance training and a calorie deficit for real fat loss.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['treadmill', 'running', 'jogging', 'run for', 'jog for'],
            answer: (ctx) => {
                let html = `<h3>Running &amp; Treadmill for Fat Loss</h3>`;
                html += `<p>Running at 6 mph (10 min/mile) burns roughly <strong>~10 calories per minute</strong> for a 180 lb person (Ainsworth Compendium: ~9.8 METs). A 30-minute run ≈ 300–400 cal.</p>`;
                html += `<p><strong>The catch:</strong> Running without resistance training in a calorie deficit burns muscle alongside fat. Longland et al. 2016 showed that combining lifting + deficit preserved lean mass far better than cardio alone.</p>`;
                html += `<p><strong>Recommendation:</strong> Use running as a conditioning tool (2–3×/week), keep your lifting program primary, and manage your deficit through food. If your knees hurt, the stairmaster or bike gives similar calorie burn with less impact.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['elliptical', 'elliptic'],
            answer: (ctx) => {
                let html = `<h3>Elliptical Training</h3>`;
                html += `<p>The elliptical burns roughly <strong>270–400 calories in 30 min</strong> depending on resistance and pace (~7–8 METs). It's lower impact than running — good for joint-friendly cardio.</p>`;
                html += `<p>The calorie displays on machines overestimate by 15–30% on average (Stanford study). Don't eat back those numbers.</p>`;
                html += `<p><strong>Best use:</strong> Zone 2 steady state 20–40 min, 2–3x/week alongside your lifting. Useful for active recovery days at low resistance.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['bike', 'cycling', 'spin', 'stationary bike', 'peloton', 'recumbent'],
            answer: (ctx) => {
                let html = `<h3>Cycling &amp; Stationary Bike</h3>`;
                html += `<p>Moderate cycling (~12–14 mph or ~7 METs) burns <strong>250–350 cal in 30 min</strong>. Vigorous cycling or spin classes push to 400–600 cal/hr.</p>`;
                html += `<p>Great choice for people who want low-impact cardio that doesn't hammer recovery for leg day. Cycling has minimal eccentric stress, so it won't make your quads as sore as running will.</p>`;
                html += `<p><strong>For fat loss:</strong> Same rule — it's a tool to increase your deficit, not a replacement for nutrition control. 3× per week of 20–30 min Zone 2 is a sustainable starting point.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['rowing', 'row machine', 'concept2', 'erg ', 'ergo'],
            answer: (ctx) => {
                let html = `<h3>Rowing Machine</h3>`;
                html += `<p>Rowing at moderate effort burns <strong>300–400 cal in 30 min</strong> (~8.5 METs). It's one of the few cardio machines that trains upper and lower body simultaneously — 86% of muscles used per stroke.</p>`;
                html += `<p><strong>Form matters:</strong> Legs drive first (60% of power), then lean back, then arms pull. Common mistake: yanking with your arms first.</p>`;
                html += `<p>Great for conditioning without beating up your joints. 2–3 sessions of 15–25 min at a conversational pace is a solid addition to any program.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['jump rope', 'jump.?rope', 'skipping rope'],
            answer: (ctx) => {
                let html = `<h3>Jump Rope</h3>`;
                html += `<p>Jump rope at moderate pace burns <strong>300–450 cal in 30 min</strong> (~11 METs — one of the highest calorie burns per minute of any exercise). It also builds calf endurance, coordination, and cardiovascular fitness.</p>`;
                html += `<p><strong>Start small:</strong> 30-second rounds with 30-second rest. Work up to 3-minute rounds. If you're new, expect it to gas you in under 2 minutes.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['walk', 'walking', 'steps', '10.?000 steps', 'step count'],
            answer: (ctx) => {
                let html = `<h3>Walking for Fat Loss</h3>`;
                html += `<p>Walking at 3–3.5 mph burns roughly <strong>80–120 cal per 30 min</strong> depending on body weight (~3.5 METs). It's not flashy, but it's one of the most underrated fat loss tools.</p>`;
                html += insightHtml(`<strong>NEAT (Non-Exercise Activity Thermogenesis)</strong> accounts for 15–30% of daily calorie burn. Adding 4,000 steps to your day can burn an extra 150–200 cal — without touching gym recovery.`);
                html += `<p><strong>Target:</strong> 7,000–10,000 steps daily. Park farther away, take the stairs, walk after meals. Aoyama & Shibata 2020: post-meal walking improves glucose response by ~30%.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['how many cal', 'calorie burn', 'calories burn', 'does.*burn', 'burn.*fat', 'fat.?burn', 'burn.*calorie'],
            answer: (ctx) => {
                const wt = ctx.currentWeight || 180;
                const wtKg = Math.round(wt * 0.453592);
                let html = `<h3>Calorie Burn: The Real Numbers</h3>`;
                html += `<p>For a <strong>${wt} lb (${wtKg} kg)</strong> person, approximate 30-minute burns:</p>`;
                html += `<table class="plan-table"><tr><th>Activity</th><th>~Cal / 30 min</th></tr>`;
                html += `<tr><td>Walking (3.5 mph)</td><td>${Math.round(wtKg * 3.5 * 0.5 * 1.05)}</td></tr>`;
                html += `<tr><td>Stairmaster</td><td>${Math.round(wtKg * 9 * 0.5 * 1.05)}</td></tr>`;
                html += `<tr><td>Running (6 mph)</td><td>${Math.round(wtKg * 9.8 * 0.5 * 1.05)}</td></tr>`;
                html += `<tr><td>Cycling (moderate)</td><td>${Math.round(wtKg * 7 * 0.5 * 1.05)}</td></tr>`;
                html += `<tr><td>Rowing (moderate)</td><td>${Math.round(wtKg * 8.5 * 0.5 * 1.05)}</td></tr>`;
                html += `<tr><td>Jump rope</td><td>${Math.round(wtKg * 11 * 0.5 * 1.05)}</td></tr>`;
                html += `<tr><td>Swimming (moderate)</td><td>${Math.round(wtKg * 7 * 0.5 * 1.05)}</td></tr>`;
                html += `<tr><td>Weight training</td><td>${Math.round(wtKg * 5 * 0.5 * 1.05)}</td></tr>`;
                html += `</table>`;
                html += `<p>These are estimates from the Ainsworth Compendium of Physical Activities. Machine displays overestimate by 15–30%. <strong>Don't eat back exercise calories</strong> — use them as bonus deficit.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['how much protein', 'protein.*need', 'daily protein', 'enough protein', 'protein.*day', 'protein.*intake'],
            answer: (ctx) => {
                const wt = ctx.currentWeight || 180;
                const wtKg = Math.round(wt * 0.453592);
                const low = Math.round(wtKg * 1.6);
                const high = Math.round(wtKg * 2.2);
                let html = `<h3>Daily Protein Requirements</h3>`;
                html += `<p>The research is clear: for anyone doing resistance training, you need <strong>1.6–2.2 g/kg</strong> of body weight per day (Morton et al. 2018 meta-analysis of 49 studies).</p>`;
                html += insightHtml(`At ${wt} lbs (${wtKg} kg), your target is <strong>${low}–${high}g protein per day</strong>.`);
                html += `<p><strong>Distribution matters.</strong> Mamerow et al. 2014: spreading protein across 4 meals (0.4 g/kg each) produces 25% more muscle protein synthesis than cramming it into 1–2 meals.</p>`;
                html += `<p><strong>Best sources:</strong> chicken breast (31g/100g), Greek yogurt (10g/100g), eggs (6g each), whey protein (25g/scoop), lean beef (26g/100g), cottage cheese (11g/100g), lentils (9g/100g cooked).</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['how much water', 'water.*drink', 'hydrat', 'dehydrat'],
            answer: (ctx) => {
                const wt = ctx.currentWeight || 180;
                const ozBase = Math.round(wt * 0.5);
                let html = `<h3>Hydration Guide</h3>`;
                html += `<p>A practical baseline: <strong>half your body weight in ounces</strong> per day. At ${wt} lbs, that's ~<strong>${ozBase} oz</strong> (~${Math.round(ozBase * 29.5735 / 1000 * 10) / 10} liters).</p>`;
                html += `<p>Add 16–20 oz for every hour of hard training. Judelson et al. 2007: even 2% dehydration reduces strength output by 2–6% and impairs recovery.</p>`;
                html += `<p><strong>Quick test:</strong> If your urine is pale yellow, you're fine. Dark yellow = drink more.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['how often.*train', 'how many.*days', 'training frequency', 'how often.*work.?out', 'days per week', 'times.*per.*week', 'how many times', 'train.*every\\s*day', 'work\\s*out.*every\\s*day', 'gym.*every\\s*day', 'lift.*every\\s*day', 'exercise.*every\\s*day', 'is\\s*it\\s*ok.*every\\s*day', 'can\\s*i.*every\\s*day', 'should\\s*i.*every\\s*day', 'daily.*training', 'train.*daily', 'too\\s*much.*training', 'overtrain'],
            answer: (ctx) => {
                let html = `<h3>Training Frequency</h3>`;
                html += `<p><strong>For muscle growth:</strong> Schoenfeld 2016 meta found training each muscle <strong>2× per week</strong> produces more hypertrophy than 1×. Beyond 3× shows diminishing returns for most people.</p>`;
                html += `<p><strong>Optimal splits by days available:</strong></p>`;
                html += `<table class="plan-table"><tr><th>Days/week</th><th>Best split</th></tr>`;
                html += `<tr><td>3</td><td>Full Body (Mon/Wed/Fri)</td></tr>`;
                html += `<tr><td>4</td><td>Upper/Lower (Mon/Tue/Thu/Fri)</td></tr>`;
                html += `<tr><td>5</td><td>Upper/Lower/Push/Pull/Legs</td></tr>`;
                html += `<tr><td>6</td><td>PPL × 2 (Push/Pull/Legs repeated)</td></tr>`;
                html += `</table>`;
                html += `<p><strong>Recovery minimum:</strong> 48 hours between hitting the same muscle group hard. Sleep 7–9 hours. If you're consistently sore for 72+ hours, you're doing too much volume.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['how long.*results', 'when.*see.*results', 'how long.*take', 'how fast.*grow', 'how quickly'],
            answer: (ctx) => {
                let html = `<h3>Realistic Timelines for Results</h3>`;
                html += `<p>This depends on training age and goal:</p>`;
                html += `<table class="plan-table"><tr><th>Goal</th><th>Realistic timeline</th></tr>`;
                html += `<tr><td>Feel stronger</td><td>2–3 weeks (neural adaptations)</td></tr>`;
                html += `<tr><td>Visible muscle gain (beginner)</td><td>6–8 weeks</td></tr>`;
                html += `<tr><td>Noticeable fat loss</td><td>4–6 weeks at 500 cal/day deficit</td></tr>`;
                html += `<tr><td>10 lbs muscle (beginner)</td><td>6–12 months</td></tr>`;
                html += `<tr><td>20 lbs muscle (total)</td><td>2–3 years of consistent training</td></tr>`;
                html += `</table>`;
                html += insightHtml(`<strong>Muscle growth rates</strong> (Lyle McDonald model): beginners gain ~2 lbs/month, intermediates ~1 lb/month, advanced ~0.5 lb/month. These are actual tissue gains, not scale weight.`);
                html += `<p>Take progress photos every 2–4 weeks. The mirror and scale are unreliable day-to-day.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['swimming', 'swim', 'pool', 'laps'],
            answer: (ctx) => {
                let html = `<h3>Swimming for Fitness</h3>`;
                html += `<p>Moderate lap swimming burns <strong>250–350 cal in 30 min</strong> (~7 METs). It's full-body, zero impact, and excellent for active recovery days.</p>`;
                html += `<p>Downside for body composition: swimming in cool water increases appetite more than land-based exercise (Halse et al. 2011). Don't overeat after pool sessions.</p>`;
                html += `<p><strong>Best use:</strong> 2× per week as conditioning or active recovery. Won't build serious muscle — you need resistance training for that.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['alcohol', 'beer', 'wine', 'drinking', 'drink.*gains'],
            answer: (ctx) => {
                let html = `<h3>Alcohol &amp; Fitness</h3>`;
                html += `<p>Alcohol has 7 cal/gram (almost as calorie-dense as fat) and <strong>zero nutritional value</strong>.</p>`;
                html += `<p><strong>The research:</strong></p><ul>`;
                html += `<li>Parr et al. 2014: Alcohol post-exercise reduces muscle protein synthesis by <strong>24–37%</strong>.</li>`;
                html += `<li>Even moderate drinking (2+ drinks) disrupts sleep architecture — less deep sleep, less recovery.</li>`;
                html += `<li>Alcohol increases estrogen and cortisol, and lowers testosterone for 24–72 hours.</li>`;
                html += `</ul>`;
                html += `<p><strong>Practical rule:</strong> If you drink, limit to 1–2 drinks max, never on training days, and add the calories to your daily log. A pint of beer is ~200 cal. Three beers = a missed meal's worth of protein replaced with empty calories.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['sore', 'soreness', 'doms', 'muscle.*hurt', 'muscle.*pain', 'delayed onset'],
            answer: (ctx) => {
                let html = `<h3>Muscle Soreness (DOMS)</h3>`;
                html += `<p>Delayed Onset Muscle Soreness peaks 24–72 hours after training. It's caused by microtrauma to muscle fibers during eccentric (lowering) contractions.</p>`;
                html += `<p><strong>Important:</strong> Soreness is NOT a reliable indicator of a good workout. Schoenfeld 2012: muscle damage is one of three hypertrophy mechanisms, but excessive damage impairs recovery without extra growth.</p>`;
                html += `<p><strong>What helps:</strong></p><ul>`;
                html += `<li>Light movement / active recovery (walking, easy cycling)</li>`;
                html += `<li>Adequate protein (1.6–2.2 g/kg/day)</li>`;
                html += `<li>Sleep (7–9 hours)</li>`;
                html += `<li>Cold water immersion may help if very sore (Leeder 2012 meta)</li>`;
                html += `</ul>`;
                html += `<p><strong>Should you train while sore?</strong> Yes, unless pain is sharp or joint-related. Light training actually reduces DOMS (repeated bout effect). Start with lighter weights and you'll loosen up.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['body.?weight', 'calisthenic', 'no.?gym', 'without.*weight', 'prison workout', 'at home'],
            answer: (ctx) => {
                let html = `<h3>Bodyweight Training</h3>`;
                html += `<p>You can build a solid physique with bodyweight alone — the limiting factor is progressive overload. Without adding weight, you progress through harder variations:</p>`;
                html += `<table class="plan-table"><tr><th>Movement</th><th>Progression</th></tr>`;
                html += `<tr><td>Push</td><td>Knee push-ups → Push-ups → Diamond → Archer → One-arm</td></tr>`;
                html += `<tr><td>Pull</td><td>Inverted rows → Chin-ups → Pull-ups → Weighted → L-sit pull-ups</td></tr>`;
                html += `<tr><td>Squat</td><td>Air squat → Bulgarian split squat → Pistol squat → Weighted pistol</td></tr>`;
                html += `<tr><td>Hinge</td><td>Glute bridge → Single-leg hip thrust → Nordic curl</td></tr>`;
                html += `<tr><td>Core</td><td>Plank → Ab wheel → Dragon flag → Front lever</td></tr>`;
                html += `</table>`;
                html += `<p>Aim for 3–4 sets of 8–15 reps per exercise, 3–5 days per week. When you can do 15 clean reps, move to the next progression.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['belly.*fat', 'stomach.*fat', 'ab.*fat', 'love.?handle', 'spot.?reduc', 'target.*fat', 'lose.*stomach'],
            answer: (ctx) => {
                let html = `<h3>Can You Target Belly Fat?</h3>`;
                html += `<p><strong>No.</strong> Spot reduction is a myth. Vispute et al. 2011: six weeks of daily ab exercises produced zero reduction in abdominal fat compared to a control group.</p>`;
                html += `<p>Where your body stores and loses fat is genetically determined. Belly fat is typically the <strong>last to go</strong> for men and lower body fat for women. The only way to reduce it:</p><ol>`;
                html += `<li><strong>Calorie deficit</strong> — 300–500 cal/day below TDEE</li>`;
                html += `<li><strong>Resistance training</strong> — preserves muscle so you lose fat, not muscle</li>`;
                html += `<li><strong>Patience</strong> — you'll lose fat from your face, arms, and chest first. Belly comes last.</li>`;
                html += `<li><strong>Sleep and stress management</strong> — cortisol (stress hormone) specifically promotes abdominal fat storage.</li>`;
                html += `</ol>`;
                html += `<p>Ab exercises build ab <em>muscle</em>, which looks great once the fat layer comes off. But they don't burn the fat on top.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['how many sets', 'how much volume', 'sets per', 'optimal.*volume', 'overtraining', 'too much'],
            answer: (ctx) => {
                let html = `<h3>Training Volume: How Many Sets?</h3>`;
                html += `<p>Schoenfeld et al. 2017 dose-response meta: <strong>10–20 sets per muscle group per week</strong> is the hypertrophy sweet spot for most people.</p>`;
                html += `<table class="plan-table"><tr><th>Level</th><th>Sets/muscle/week</th></tr>`;
                html += `<tr><td>Beginner (< 1 year)</td><td>10–12</td></tr>`;
                html += `<tr><td>Intermediate (1–3 years)</td><td>12–18</td></tr>`;
                html += `<tr><td>Advanced (3+ years)</td><td>16–22+</td></tr>`;
                html += `</table>`;
                html += `<p><strong>Signs you're doing too much:</strong> strength going down, chronic joint pain, poor sleep, losing motivation, getting sick often. If that's you, drop volume by 30–40% for 1–2 weeks (deload).</p>`;
                html += `<p><strong>Signs you can do more:</strong> you recover within 48 hours, weights feel easy, you're not sore at all. Add 2–3 sets per muscle per week.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['age', 'too old', 'over 40', 'over 50', 'older', 'senior', 'after 40'],
            answer: (ctx) => {
                let html = `<h3>Training at 40, 50, 60+</h3>`;
                html += `<p>You are never too old to build muscle and get stronger. Resistance training is actually <strong>more important</strong> as you age — sarcopenia (muscle loss) starts at ~30 and accelerates after 50.</p>`;
                html += insightHtml(`Peterson 2010 meta: adults over 50 gained significant strength (average <strong>+33%</strong>) with resistance training. You don't lose the ability to grow muscle — you just have to train.`);
                html += `<p><strong>Adjustments for 40+:</strong></p><ul>`;
                html += `<li>Warm up longer (10–15 min instead of 5)</li>`;
                html += `<li>Slightly higher rep ranges (8–15 instead of 3–5) to reduce joint stress</li>`;
                html += `<li>Extra recovery time (train same muscle every 3–4 days instead of 2)</li>`;
                html += `<li>Prioritize mobility work and joint health</li>`;
                html += `<li>Protein needs actually increase with age — aim for the high end (2.0–2.2 g/kg)</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            }
        },

        // ===== TRAINING PHILOSOPHIES =====
        {
            triggers: ['mentzer', 'heavy duty', 'hit training', 'high intensity training', 'one set', 'train less', 'less is more', 'mike mentzer'],
            answer: (ctx) => {
                let html = `<h3>Mike Mentzer &amp; Heavy Duty (HIT)</h3>`;
                html += `<p>Mike Mentzer was the most intellectually rigorous bodybuilder who ever lived. His <strong>Heavy Duty</strong> system was built on one principle: <em>minimum effective dose</em>. If one hard set stimulates growth, why do five?</p>`;
                html += `<h3>The philosophy</h3><ul>`;
                html += `<li><strong>1–2 working sets per exercise, taken to absolute failure.</strong> Not "it's getting hard" failure — true muscular failure where you cannot complete another rep with proper form.</li>`;
                html += `<li><strong>4–7 days between training the same muscle.</strong> Mentzer believed most lifters massively overtrain. Growth happens during recovery, not during the workout.</li>`;
                html += `<li><strong>Progressive overload is king.</strong> If you're not adding weight or reps session to session, you're not growing — you're just exercising.</li>`;
                html += `<li><strong>High-intensity techniques:</strong> Rest-pause, forced reps, negatives (6–8 sec eccentrics), and pre-exhaust supersets (e.g., flyes immediately into bench press).</li>`;
                html += `</ul>`;
                html += `<h3>Sample Heavy Duty chest workout</h3><ol>`;
                html += `<li>Dumbbell Flyes — 1×6–10 (pre-exhaust, to failure)</li>`;
                html += `<li>Immediately into Incline Bench Press — 1×6–10 (to failure)</li>`;
                html += `<li>Dips — 1×6–10 (to failure, add weight if needed)</li>`;
                html += `</ol>`;
                html += `<p>That's it. 3 total work sets. Mentzer won the 1978 Mr. Universe with a perfect score training this way.</p>`;
                html += insightHtml(`<strong>What the science says:</strong> Krieger 2010 meta found multiple sets produce ~40% more hypertrophy than single sets. BUT — Fisher et al. 2011 showed that single sets taken to true failure produce significant gains, especially for time-constrained lifters. Mentzer's system works if the intensity is genuinely maximal.`);
                html += `<p><strong>Who it's best for:</strong> People who train too much and recover too little. Hard-gainers. Older lifters. Anyone who dreads 2-hour gym sessions. The trade-off: you must be willing to push into real discomfort on every set — most people won't.</p>`;
                html += `<p><strong>Mentzer's famous quote:</strong> <em>"The key is not how much work you do, but how hard you work."</em></p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['arnold', 'schwarzenegger', 'golden era', 'volume training', 'golden age', 'arnold split', 'encyclopedia'],
            answer: (ctx) => {
                let html = `<h3>Arnold Schwarzenegger &amp; Volume Training</h3>`;
                html += `<p>Arnold trained with <strong>high volume, high frequency, and relentless intensity</strong>. His approach was the opposite of Mentzer's — where Mentzer said "less is more," Arnold said "more is more, if you can recover from it."</p>`;
                html += `<h3>Arnold's principles</h3><ul>`;
                html += `<li><strong>20–25 sets per muscle group per session.</strong> Chest day meant 5 exercises × 5 sets. Twice per week.</li>`;
                html += `<li><strong>Train each muscle 2× per week.</strong> The classic Arnold split: Chest/Back, Shoulders/Arms, Legs — repeated. 6 days on, 1 off.</li>`;
                html += `<li><strong>Supersets for opposing muscles.</strong> Arnold pioneered chest/back supersets — bench press immediately into barbell rows. Saved time and increased blood flow to both muscles.</li>`;
                html += `<li><strong>Mind-muscle connection.</strong> Arnold was obsessive about feeling every rep in the target muscle. "Put your mind in the muscle."</li>`;
                html += `<li><strong>Shocking the muscle.</strong> Constantly vary angles, rep ranges, tempo, and intensity techniques to prevent adaptation.</li>`;
                html += `</ul>`;
                html += `<h3>The Arnold Split</h3>`;
                html += `<table class="plan-table"><tr><th>Day</th><th>Muscles</th></tr>`;
                html += `<tr><td>Monday</td><td>Chest + Back</td></tr>`;
                html += `<tr><td>Tuesday</td><td>Shoulders + Arms</td></tr>`;
                html += `<tr><td>Wednesday</td><td>Legs</td></tr>`;
                html += `<tr><td>Thursday</td><td>Chest + Back</td></tr>`;
                html += `<tr><td>Friday</td><td>Shoulders + Arms</td></tr>`;
                html += `<tr><td>Saturday</td><td>Legs</td></tr>`;
                html += `<tr><td>Sunday</td><td>Rest</td></tr>`;
                html += `</table>`;
                html += insightHtml(`<strong>Modern science supports Arnold more than you'd think.</strong> Schoenfeld 2017 dose-response meta: higher volume (10–20+ sets/muscle/week) drives more hypertrophy. Schoenfeld 2016 frequency meta: 2×/week beats 1×. Arnold was doing both — high volume AND high frequency — decades before the research caught up.`);
                html += `<p><strong>The caveat:</strong> Arnold trained 2–3 hours per day, 6 days a week. That volume requires elite recovery (sleep, nutrition, genetics). For most natural lifters, a modified Arnold split with 12–16 sets per muscle per week is more sustainable than the full 25+.</p>`;
                html += `<p><strong>Arnold's famous quote:</strong> <em>"The last three or four reps is what makes the muscle grow. This area of pain divides a champion from someone who is not a champion."</em></p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['ronnie', 'coleman', 'ronnie coleman', 'lightweight baby', 'yeah buddy', 'heavy.*compound', 'powerbuild'],
            answer: (ctx) => {
                let html = `<h3>Ronnie Coleman: The King</h3>`;
                html += `<p>8× Mr. Olympia. Squatted 800 lbs. Deadlifted 800 lbs. Did both for reps, on camera, while yelling "LIGHTWEIGHT BABY!" Ronnie's philosophy was brutally simple: <strong>lift the heaviest weights possible for moderate reps</strong>.</p>`;
                html += `<h3>Ronnie's principles</h3><ul>`;
                html += `<li><strong>Heavy compound movements first.</strong> Every workout started with a barbell movement — squats, deadlifts, barbell press, barbell rows. No machines until the heavy work was done.</li>`;
                html += `<li><strong>Moderate reps, maximum weight.</strong> 8–12 reps on most exercises, but with a weight that most people couldn't move for 1. His 200 lb dumbbell shoulder press was done for sets of 12.</li>`;
                html += `<li><strong>Volume was moderate.</strong> 4 exercises per muscle, 3–4 sets each. Not as extreme as Arnold's volume.</li>`;
                html += `<li><strong>Each body part twice per week.</strong> Similar to Arnold's frequency but with a different split structure.</li>`;
                html += `<li><strong>Consistency above all.</strong> Ronnie trained the same way for 15+ years. No program hopping. No gimmicks. Just progressive overload on the basics.</li>`;
                html += `</ul>`;
                html += `<h3>Ronnie's Split</h3>`;
                html += `<table class="plan-table"><tr><th>Day</th><th>Focus</th></tr>`;
                html += `<tr><td>Monday</td><td>Back (heavy — deadlifts, rows)</td></tr>`;
                html += `<tr><td>Tuesday</td><td>Shoulders + Triceps + Calves</td></tr>`;
                html += `<tr><td>Wednesday</td><td>Quads + Hamstrings</td></tr>`;
                html += `<tr><td>Thursday</td><td>Chest + Biceps</td></tr>`;
                html += `<tr><td>Friday</td><td>Back (lighter — width focus)</td></tr>`;
                html += `<tr><td>Saturday</td><td>Shoulders + Arms + Calves</td></tr>`;
                html += `</table>`;
                html += insightHtml(`<strong>The takeaway for natural lifters:</strong> Ronnie's success wasn't about his exact split — it was about progressive overload with brutal consistency. He added weight to the bar every week for years. That principle works for everyone: track your lifts, beat last week's numbers, and don't skip the compound movements.`);
                html += `<p><strong>Ronnie's quote:</strong> <em>"Everybody wants to be a bodybuilder, but don't nobody want to lift no heavy-ass weight."</em></p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['dorian', 'yates', 'blood.?and.?guts', 'dorian yates'],
            answer: (ctx) => {
                let html = `<h3>Dorian Yates: Blood &amp; Guts</h3>`;
                html += `<p>6× Mr. Olympia. Dorian was Mentzer's spiritual successor — low volume, extreme intensity. But where Mentzer did 1 set, Dorian typically did <strong>1–2 warm-up sets then 1 all-out working set to failure and beyond</strong>.</p>`;
                html += `<h3>Blood &amp; Guts principles</h3><ul>`;
                html += `<li><strong>One working set per exercise, to absolute failure.</strong> Then a forced rep or two with a spotter. Then a 6-second negative.</li>`;
                html += `<li><strong>4 exercises per muscle group.</strong> So roughly 4 true working sets total per session.</li>`;
                html += `<li><strong>Each muscle once per week.</strong> Monday: chest/biceps. Tuesday: legs. Wednesday: off. Thursday: shoulders/triceps. Friday: back. Weekend: off.</li>`;
                html += `<li><strong>Training sessions under 45 minutes.</strong> Get in, destroy the muscle, get out, eat, grow.</li>`;
                html += `<li><strong>Meticulous logbook.</strong> Every weight, every rep, every session written down. Beat last week or you failed.</li>`;
                html += `</ul>`;
                html += insightHtml(`Dorian's approach is closer to what most natural lifters can actually recover from. Fewer total sets, but maximum effort on each. The research (Fisher 2011, Giessing 2016) shows that low-volume HIT produces meaningful hypertrophy — the trade-off is that you must push genuinely hard on every set.`);
                html += `<p><strong>Dorian's quote:</strong> <em>"I don't do this to be healthy. I do this to get big."</em></p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['5.?x.?5', 'stronglift', 'starting strength', 'rippetoe', 'mark rippetoe', 'strong.?lift', 'bill starr', 'madcow', 'texas method'],
            answer: (ctx) => {
                let html = `<h3>5×5 &amp; Starting Strength Programs</h3>`;
                html += `<p>The 5×5 template (Bill Starr 1976, popularized by Reg Park, then StrongLifts and Starting Strength) is the most battle-tested beginner program in existence.</p>`;
                html += `<h3>The structure</h3>`;
                html += `<table class="plan-table"><tr><th>Day</th><th>Exercises</th></tr>`;
                html += `<tr><td>A</td><td>Squat 5×5, Bench Press 5×5, Barbell Row 5×5</td></tr>`;
                html += `<tr><td>B</td><td>Squat 5×5, Overhead Press 5×5, Deadlift 1×5</td></tr>`;
                html += `</table>`;
                html += `<p>Alternate A/B, 3 days per week (Mon A, Wed B, Fri A, Mon B...). Add 5 lbs to every lift every session. That's it.</p>`;
                html += insightHtml(`<strong>Why it works for beginners:</strong> Novice lifters can recover from and adapt to stress within 48–72 hours. Linear progression (adding weight each session) is possible for 3–6 months before you need periodization. After that, move to an intermediate program (Texas Method, 5/3/1, GZCL).`);
                html += `<p><strong>Rippetoe's philosophy:</strong> Compound barbell movements, full range of motion, progressive overload. No machines, no isolation work until you can squat 1.5× bodyweight and deadlift 2×. Controversial but effective for building a strength base.</p>`;
                html += `<p><strong>When to move on:</strong> When you can no longer add weight every session (typically 3–6 months in). Stalling 3 sessions in a row on the same weight = time for an intermediate program.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['531', '5.?3.?1', 'wendler', 'jim wendler', 'boring but big', 'bbb'],
            answer: (ctx) => {
                let html = `<h3>5/3/1 by Jim Wendler</h3>`;
                html += `<p>One of the most popular intermediate-to-advanced strength programs ever written. Built on 4 lifts: squat, bench, deadlift, overhead press.</p>`;
                html += `<h3>The structure (4-week cycle)</h3>`;
                html += `<table class="plan-table"><tr><th>Week</th><th>Sets × Reps (% of Training Max)</th></tr>`;
                html += `<tr><td>Week 1 (5s)</td><td>65%×5, 75%×5, 85%×5+</td></tr>`;
                html += `<tr><td>Week 2 (3s)</td><td>70%×3, 80%×3, 90%×3+</td></tr>`;
                html += `<tr><td>Week 3 (5/3/1)</td><td>75%×5, 85%×3, 95%×1+</td></tr>`;
                html += `<tr><td>Week 4 (Deload)</td><td>40%×5, 50%×5, 60%×5</td></tr>`;
                html += `</table>`;
                html += `<p>The "+" means AMRAP (as many reps as possible). Your training max starts at 90% of your true max and increases 5 lbs/cycle (upper) or 10 lbs/cycle (lower).</p>`;
                html += `<p><strong>Boring But Big (BBB) template:</strong> After your 5/3/1 sets, do 5×10 of the same lift at 50–60%. This adds hypertrophy volume on top of the strength work. One of the most effective templates for building size AND strength simultaneously.</p>`;
                html += insightHtml(`Wendler's philosophy: <em>"Start too light, progress slowly, break personal records."</em> The slow progression is the point — it prevents stalling and keeps you healthy long-term.`);
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['ppl', 'push.?pull.?leg', 'push pull', 'push day', 'pull day', 'leg day'],
            answer: (ctx) => {
                let html = `<h3>Push/Pull/Legs (PPL)</h3>`;
                html += `<p>The most popular intermediate hypertrophy split. Each session hits one movement pattern, allowing high volume per muscle with adequate recovery.</p>`;
                html += `<h3>The split</h3>`;
                html += `<table class="plan-table"><tr><th>Day</th><th>Muscles</th><th>Key lifts</th></tr>`;
                html += `<tr><td>Push</td><td>Chest, shoulders, triceps</td><td>Bench, OHP, incline DB, lateral raises, tricep pushdown</td></tr>`;
                html += `<tr><td>Pull</td><td>Back, biceps, rear delts</td><td>Deadlift/row, pull-ups, lat pulldown, face pulls, curls</td></tr>`;
                html += `<tr><td>Legs</td><td>Quads, hamstrings, glutes, calves</td><td>Squat, RDL, leg press, leg curl, calf raises</td></tr>`;
                html += `</table>`;
                html += `<p><strong>6-day PPL (PPL×2):</strong> Best for intermediate-advanced lifters who want maximum frequency (each muscle 2×/week). Run Push/Pull/Legs/Push/Pull/Legs/Rest.</p>`;
                html += `<p><strong>3-day PPL:</strong> Good for beginners or busy schedules. Each muscle hit 1×/week — not ideal for hypertrophy but better than nothing.</p>`;
                html += insightHtml(`PPL is effective because it naturally manages fatigue: pressing muscles rest on pull day and vice versa. Schoenfeld's 2016 frequency meta supports 2×/week per muscle, which PPL×2 delivers.`);
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['upper.?lower', 'upper lower', 'phul', '4.?day split', 'four day split'],
            answer: (ctx) => {
                let html = `<h3>Upper/Lower Split</h3>`;
                html += `<p>Train upper body one day, lower body the next, 4 days per week. Simple, effective, and backed by research for intermediate lifters.</p>`;
                html += `<table class="plan-table"><tr><th>Day</th><th>Focus</th></tr>`;
                html += `<tr><td>Monday</td><td>Upper (strength focus — heavier, 3–6 reps)</td></tr>`;
                html += `<tr><td>Tuesday</td><td>Lower (strength focus)</td></tr>`;
                html += `<tr><td>Wednesday</td><td>Rest</td></tr>`;
                html += `<tr><td>Thursday</td><td>Upper (hypertrophy focus — 8–15 reps)</td></tr>`;
                html += `<tr><td>Friday</td><td>Lower (hypertrophy focus)</td></tr>`;
                html += `</table>`;
                html += `<p>This is the PHUL (Power Hypertrophy Upper Lower) structure. Each muscle gets hit <strong>2×/week</strong> with different stimulus — one heavy day and one volume day. This dual-stimulus approach covers both strength and size.</p>`;
                html += `<p><strong>Best for:</strong> Intermediates who can commit to 4 days. Balances volume, frequency, and recovery better than most splits.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['full body', 'full.?body', 'three day', '3 day', 'total body'],
            answer: (ctx) => {
                let html = `<h3>Full Body Training</h3>`;
                html += `<p>The oldest and arguably most efficient split: hit every major muscle group in every session, 3× per week.</p>`;
                html += `<h3>Sample full body template</h3>`;
                html += `<table class="plan-table"><tr><th>Slot</th><th>Movement</th><th>Example</th></tr>`;
                html += `<tr><td>1</td><td>Squat pattern</td><td>Squat, front squat, goblet squat</td></tr>`;
                html += `<tr><td>2</td><td>Horizontal push</td><td>Bench, DB bench, push-ups</td></tr>`;
                html += `<tr><td>3</td><td>Horizontal pull</td><td>Barbell row, cable row, DB row</td></tr>`;
                html += `<tr><td>4</td><td>Hip hinge</td><td>RDL, hip thrust, good morning</td></tr>`;
                html += `<tr><td>5</td><td>Vertical push</td><td>OHP, DB press, landmine press</td></tr>`;
                html += `<tr><td>6</td><td>Vertical pull</td><td>Pull-ups, lat pulldown, chin-ups</td></tr>`;
                html += `<tr><td>7</td><td>Accessory</td><td>Curls, lateral raises, abs</td></tr>`;
                html += `</table>`;
                html += `<p>3 sets each, 3 days per week = 9 sets per movement pattern per week. That's right in the hypertrophy sweet spot.</p>`;
                html += insightHtml(`Full body is ideal for beginners (Helms 2014) and for anyone training 3 days per week. Each muscle gets 3× frequency — the highest of any common split. The trade-off: sessions are longer (60–75 min) and systemic fatigue is higher.`);
                html += verseHtml();
                return html;
            }
        },

        // ===== ADVANCED TRAINING TECHNIQUES =====
        {
            triggers: ['drop.?set', 'strip set', 'run.?the.?rack'],
            answer: (ctx) => {
                let html = `<h3>Drop Sets</h3>`;
                html += `<p>Perform a set to failure, immediately reduce the weight by 20–30%, and continue repping to failure again. Repeat 1–3 times.</p>`;
                html += insightHtml(`Fink et al. 2018: Drop sets produce similar hypertrophy to traditional sets in less time. Ozaki et al. 2018: One drop set was as effective as three straight sets for muscle growth. Best used on the <strong>last set</strong> of an exercise — not every set.`);
                html += `<p><strong>Best for:</strong> Isolation movements (curls, lateral raises, leg extensions) at the end of a workout. Don't drop-set heavy compound lifts — form breaks down and injury risk skyrockets.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['super.?set', 'antagonist', 'paired set', 'giant set'],
            answer: (ctx) => {
                let html = `<h3>Supersets &amp; Paired Sets</h3>`;
                html += `<p><strong>Antagonist superset:</strong> Pair opposing muscles with no rest between — bench press + barbell row, curls + tricep pushdowns, leg extension + leg curl.</p>`;
                html += insightHtml(`Paz et al. 2017: Antagonist supersets save ~40% training time with no reduction in performance. Robbins et al. 2010: Bench press performance actually <strong>improved</strong> when paired with rows due to reciprocal inhibition.`);
                html += `<p><strong>Same-muscle superset (compound set):</strong> Two exercises for the same muscle back-to-back. E.g., dumbbell flyes into bench press (Mentzer's pre-exhaust). Brutal for pump and metabolic stress.</p>`;
                html += `<p><strong>Giant sets:</strong> 3–4 exercises in a row with no rest. Excellent for conditioning and time-saving. Terrible for maximal strength.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['rest.?pause', 'myo.?rep', 'myo rep', 'cluster set'],
            answer: (ctx) => {
                let html = `<h3>Rest-Pause &amp; Myo-Reps</h3>`;
                html += `<p><strong>Rest-pause:</strong> Hit failure at ~8 reps, rest 10–15 seconds, do 2–3 more reps, rest 10–15 seconds, do 1–2 more reps. One "set" becomes 11–13 total reps with more of them near failure.</p>`;
                html += `<p><strong>Myo-reps (Borge Fagerli):</strong> Do an activation set of 12–20 reps to near failure. Rest 5 breaths (~15 sec). Do 3–5 reps. Repeat for 3–5 mini-sets. Stop when you can't hit 3 reps.</p>`;
                html += insightHtml(`Prestes et al. 2019: rest-pause training produced greater hypertrophy than traditional sets in trained men. The mechanism: more "effective reps" (the last 5 reps near failure are what drive growth — rest-pause maximizes these).`);
                html += `<p><strong>Cluster sets (Tufano 2017):</strong> Break a heavy set into singles or doubles with 15–30 sec rest between. E.g., instead of 5×3 at 85%, do 15 singles at 85% with 20 sec rest. Maintains bar speed and reduces fatigue — used in powerlifting and Olympic lifting.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['tempo', 'eccentric', 'negative', 'time.?under.?tension', 'tut', 'slow rep', 'controlled rep'],
            answer: (ctx) => {
                let html = `<h3>Tempo &amp; Eccentric Training</h3>`;
                html += `<p>Tempo is written as 4 numbers: e.g., <strong>3-1-2-0</strong> = 3 sec eccentric, 1 sec pause at bottom, 2 sec concentric, 0 sec pause at top.</p>`;
                html += `<p><strong>Eccentric (negative) training:</strong> You're ~30% stronger eccentrically than concentrically. Slow eccentrics (3–5 sec) create more muscle damage and mechanical tension — both drivers of hypertrophy.</p>`;
                html += insightHtml(`Schoenfeld 2017 eccentric meta: Eccentric-focused training produces slightly more hypertrophy than concentric-only training, particularly for muscle fascicle length. The practical advice: control the negative on every rep (2–3 seconds). Don't just drop the weight.`);
                html += `<p><strong>Dedicated negative sets:</strong> Load 105–120% of your 1RM, have a spotter help you lift it, then lower it yourself over 5–6 seconds. 3–5 negatives = a brutal stimulus. Use sparingly (once per week per muscle) — recovery cost is very high.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['mind.?muscle', 'feel the muscle', 'connection', 'internal focus', 'squeeze'],
            answer: (ctx) => {
                let html = `<h3>Mind-Muscle Connection</h3>`;
                html += `<p>Arnold swore by it. The science now backs him up.</p>`;
                html += insightHtml(`Schoenfeld &amp; Contreras 2016: Focusing on the target muscle during bicep curls increased bicep activation by <strong>22%</strong> compared to just moving the weight. Calatayud et al. 2016 confirmed the same for bench press — internal focus increased chest EMG.`);
                html += `<p><strong>When to use it:</strong> Isolation exercises and hypertrophy work (8+ reps). Focus on squeezing and feeling the target muscle through the full range of motion.</p>`;
                html += `<p><strong>When NOT to use it:</strong> Heavy compound lifts (1–5 reps). On heavy squats and deadlifts, use an <em>external focus</em> — think "push the floor away" or "drive through the heels." Wulf 2013 meta: external focus improves force production on maximal efforts.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['periodiz', 'deload', 'training block', 'mesocycle', 'macrocycle', 'linear progression', 'undulat', 'block periodiz'],
            answer: (ctx) => {
                let html = `<h3>Periodization: Training in Phases</h3>`;
                html += `<p>You can't train heavy, high-volume, and intense forever. Periodization structures your training in cycles so you peak when it matters and recover when you need to.</p>`;
                html += `<h3>Main models</h3>`;
                html += `<table class="plan-table"><tr><th>Model</th><th>How it works</th><th>Best for</th></tr>`;
                html += `<tr><td>Linear</td><td>Weight goes up every session (5×5 style)</td><td>Beginners (3–6 months)</td></tr>`;
                html += `<tr><td>Daily Undulating (DUP)</td><td>Heavy Mon, moderate Wed, light Fri each week</td><td>Intermediates wanting strength + size</td></tr>`;
                html += `<tr><td>Block</td><td>4–6 week blocks focusing on hypertrophy → strength → peaking</td><td>Advanced, powerlifters, athletes</td></tr>`;
                html += `<tr><td>5/3/1 style</td><td>4-week waves with built-in deload</td><td>Intermediate-advanced general strength</td></tr>`;
                html += `</table>`;
                html += insightHtml(`Harries et al. 2015 meta: periodized programs produce <strong>significantly greater</strong> strength gains than non-periodized programs. DUP specifically outperformed linear periodization in trained lifters (Rhea 2002 meta).`);
                html += `<h3>Deloads</h3>`;
                html += `<p>Every 4–8 weeks, reduce volume by 40–60% and intensity by 10–20% for one week. Issurin 2010: planned recovery weeks allow accumulated fatigue to dissipate while preserving fitness. You'll come back stronger.</p>`;
                html += `<p><strong>Signs you need a deload:</strong> Strength regressing, chronic joint pain, poor sleep, loss of motivation, elevated resting heart rate.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['blood.?flow', 'bfr', 'occlusion', 'kaatsu'],
            answer: (ctx) => {
                let html = `<h3>Blood Flow Restriction (BFR) Training</h3>`;
                html += `<p>Wrap bands around the top of a limb at ~50–70% occlusion pressure, then train with very light loads (20–30% 1RM) for high reps (15–30).</p>`;
                html += insightHtml(`Lixandrão et al. 2018 meta: BFR with light loads produces hypertrophy comparable to traditional heavy training (70%+ 1RM). The mechanism: metabolic stress (pooled blood, lactate buildup) triggers anabolic signaling without heavy mechanical load.`);
                html += `<p><strong>Best for:</strong> Rehabbing injuries (you can grow muscle with 20% 1RM), deload weeks, accessory work finishers, older lifters with joint issues. NOT a replacement for heavy training — it's a supplement.</p>`;
                html += `<p><strong>Protocol:</strong> 4 sets of 30/15/15/15 reps with 30 sec rest between sets. Keep bands on the entire time. 2–3 exercises per session. Remove bands immediately after your last set.</p>`;
                html += verseHtml();
                return html;
            }
        },

        // ===== NUTRITION SCIENCE DEEP DIVES =====
        {
            triggers: ['bulk', 'bulking', 'calorie surplus', 'lean bulk', 'dirty bulk', 'mass gain', 'gaining phase', 'off.?season'],
            answer: (ctx) => {
                let html = `<h3>Bulking: How to Gain Muscle Without Getting Fat</h3>`;
                html += `<p>You need a calorie surplus to maximize muscle growth. The question is how much.</p>`;
                html += `<table class="plan-table"><tr><th>Approach</th><th>Surplus</th><th>Monthly muscle</th><th>Monthly fat</th></tr>`;
                html += `<tr><td>Lean bulk</td><td>200–300 cal/day</td><td>~1–2 lbs</td><td>~0.5–1 lb</td></tr>`;
                html += `<tr><td>Moderate bulk</td><td>300–500 cal/day</td><td>~1–2 lbs</td><td>~1–2 lbs</td></tr>`;
                html += `<tr><td>Dirty bulk</td><td>500–1000+ cal/day</td><td>~1–2 lbs</td><td>~3–6 lbs</td></tr>`;
                html += `</table>`;
                html += insightHtml(`Notice something? Muscle gain is roughly the same regardless of surplus size. Garthe et al. 2013: athletes in a large surplus gained the SAME muscle as those in a small surplus — but gained significantly more fat. <strong>A lean bulk (200–300 cal surplus) is almost always the right call.</strong>`);
                html += `<p><strong>How to bulk:</strong></p><ol>`;
                html += `<li>Set protein to 1.6–2.2 g/kg body weight</li>`;
                html += `<li>Set calories to TDEE + 200–300</li>`;
                html += `<li>Gain 0.5–1% of body weight per month (for a 180 lb person: 1–2 lbs/month)</li>`;
                html += `<li>If gaining faster than that, you're adding unnecessary fat — pull calories back</li>`;
                html += `<li>Bulk for 3–6 months, then cut if needed</li>`;
                html += `</ol>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['cut', 'cutting', 'calorie deficit', 'diet down', 'shred', 'lean out', 'get lean', 'lose fat'],
            answer: (ctx) => {
                const wt = ctx.currentWeight || 180;
                const wtKg = Math.round(wt * 0.453592);
                let html = `<h3>Cutting: Lose Fat, Keep Muscle</h3>`;
                html += `<p>The goal of a cut is to lose fat while preserving as much muscle as possible. This requires a <strong>moderate deficit + high protein + resistance training</strong>.</p>`;
                html += `<h3>The evidence-based approach</h3><ol>`;
                html += `<li><strong>Deficit:</strong> 300–500 cal/day below TDEE. Larger deficits (>750) increase muscle loss exponentially (Helms 2014).</li>`;
                html += `<li><strong>Protein:</strong> Increase to the high end during a cut — ${Math.round(wtKg * 2.0)}–${Math.round(wtKg * 2.4)}g/day for you. Longland 2016: higher protein during a deficit preserved 100% of lean mass vs lower protein group.</li>`;
                html += `<li><strong>Lifting:</strong> Maintain intensity (weight on the bar). You can reduce volume by 1/3 but do NOT drop the weight. The training stimulus is what tells your body to keep the muscle.</li>`;
                html += `<li><strong>Rate of loss:</strong> 0.5–1% body weight per week. For you at ${wt} lbs: ~${Math.round(wt * 0.005 * 10) / 10}–${Math.round(wt * 0.01 * 10) / 10} lbs/week.</li>`;
                html += `<li><strong>Diet breaks:</strong> Every 6–8 weeks, eat at maintenance for 1–2 weeks. Byrne et al. 2018 (MATADOR study): intermittent dieting preserved more muscle and produced more fat loss than continuous dieting.</li>`;
                html += `</ol>`;
                html += insightHtml(`<strong>The leaner you are, the slower you should go.</strong> At 20%+ body fat: 1% per week is fine. At 12–15%: slow to 0.5%/week. Below 12%: expect to lose some muscle no matter what — your body doesn't want to be that lean.`);
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['recomp', 'body.?recomp', 'recomposition', 'lose fat.*gain muscle', 'gain muscle.*lose fat', 'both at once'],
            answer: (ctx) => {
                let html = `<h3>Body Recomposition</h3>`;
                html += `<p>Can you lose fat and gain muscle at the same time? <strong>Yes — but it's slow, and it doesn't work for everyone.</strong></p>`;
                html += `<h3>Who recomp works for</h3><ul>`;
                html += `<li><strong>Beginners</strong> — newbie gains are real (Helms 2014). First 6–12 months of training, you can build muscle even in a mild deficit.</li>`;
                html += `<li><strong>Detrained lifters returning</strong> — muscle memory (Seaborne 2018 epigenetic study) means previously trained muscle regrows faster.</li>`;
                html += `<li><strong>Overweight lifters</strong> — the excess body fat provides the energy surplus internally. You can eat at maintenance or slight deficit and still grow.</li>`;
                html += `</ul>`;
                html += `<h3>Who should NOT recomp</h3><ul>`;
                html += `<li><strong>Lean, trained lifters</strong> — if you're under 15% body fat with 2+ years of training, you'll spin your wheels at maintenance. Pick bulk or cut.</li>`;
                html += `</ul>`;
                html += `<p><strong>Recomp protocol:</strong> Eat at maintenance calories, protein at 2.0–2.2 g/kg, train hard with progressive overload. Track body measurements and photos, not the scale — the scale may not move even as your body changes.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['reverse diet', 'metabolic adapta', 'adaptive thermogenesis', 'metabolism slow', 'damaged metabolism', 'starvation mode', 'metabolic damage'],
            answer: (ctx) => {
                let html = `<h3>Metabolic Adaptation &amp; Reverse Dieting</h3>`;
                html += `<p><strong>"Starvation mode" is a myth. Metabolic adaptation is real.</strong></p>`;
                html += `<p>When you diet, your body burns fewer calories through:</p><ul>`;
                html += `<li>Less body mass = lower BMR</li>`;
                html += `<li>Reduced NEAT (you fidget less, move less unconsciously)</li>`;
                html += `<li>Adaptive thermogenesis: your body becomes ~10–15% more efficient (Rosenbaum 2010)</li>`;
                html += `<li>Hormonal changes: lower thyroid, lower leptin, higher ghrelin (hunger)</li>`;
                html += `</ul>`;
                html += insightHtml(`Trexler et al. 2014 review: metabolic adaptation is real but accounts for at most 10–15% reduction in TDEE. It does NOT stop fat loss entirely — if you're truly in a deficit, you will lose weight. If the scale stops moving, your deficit has shrunk and you need to re-adjust.`);
                html += `<h3>Reverse dieting</h3>`;
                html += `<p>After a long cut, add 50–100 calories per week back to your intake until you reach maintenance. This lets your metabolism recover gradually, minimizes fat rebound, and restores hormone levels (especially leptin, thyroid, and testosterone).</p>`;
                html += `<p><strong>Timeline:</strong> 4–8 weeks of reverse dieting after a cut before starting another deficit or switching to a bulk.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['carb', 'carbs', 'carbohydrate', 'glycogen', 'low.?carb', 'keto', 'ketogenic', 'no.?carb'],
            answer: (ctx) => {
                let html = `<h3>Carbohydrates &amp; Performance</h3>`;
                html += `<p>Carbs are your body's preferred fuel for high-intensity exercise. Glycogen (stored carbs in muscle) is the primary energy source for sets of 6–20 reps.</p>`;
                html += insightHtml(`Escobar et al. 2016: Low-carb diets reduce training performance by 7–15% in strength athletes. Kephart et al. 2018: Keto diets in CrossFit athletes showed no advantage for body composition vs balanced macros, and performance decreased.`);
                html += `<p><strong>How much:</strong> 3–5 g/kg body weight for moderate training; 5–7 g/kg for heavy training days. Prioritize carbs around workouts — before, during (if 90+ min), and after.</p>`;
                html += `<p><strong>Best sources:</strong> Rice, oats, potatoes, sweet potatoes, fruit, bread, pasta. The "clean vs dirty" distinction doesn't matter much for body composition — total calories and protein matter more (IIFYM principle, supported by Bray 2012).</p>`;
                html += `<p><strong>Keto for lifters?</strong> Generally not recommended. It works for fat loss only because it reduces appetite (Johnstone 2015), not because of metabolic magic. You'll perform worse in the gym and likely lose more muscle during a cut. Use it only if you genuinely prefer eating that way.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['fat.*intake', 'dietary fat', 'healthy fat', 'how much fat', 'fat.*diet', 'omega', 'saturated fat', 'trans fat'],
            answer: (ctx) => {
                const wt = ctx.currentWeight || 180;
                const wtKg = Math.round(wt * 0.453592);
                const low = Math.round(wtKg * 0.8);
                const high = Math.round(wtKg * 1.2);
                let html = `<h3>Dietary Fat: How Much You Need</h3>`;
                html += `<p>Fat is essential for hormone production (especially testosterone), brain function, and absorbing vitamins A, D, E, K.</p>`;
                html += `<p><strong>Minimum:</strong> 0.8–1.2 g/kg body weight (${low}–${high}g for you). Going below 0.5 g/kg impairs testosterone production (Hämäläinen 1984, Dorgan 1996).</p>`;
                html += `<p><strong>Best sources:</strong></p><ul>`;
                html += `<li><strong>Monounsaturated:</strong> Olive oil, avocados, nuts — heart-healthy baseline</li>`;
                html += `<li><strong>Polyunsaturated (omega-3):</strong> Fatty fish, walnuts, flaxseed — anti-inflammatory, 1–3g EPA/DHA per day</li>`;
                html += `<li><strong>Saturated:</strong> Not the villain it was made out to be (Siri-Tarino 2010 meta), but don't overdo it — keep under 10% of calories</li>`;
                html += `<li><strong>Trans fats:</strong> Genuinely harmful. Avoid hydrogenated oils completely.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['caffeine', 'coffee', 'pre.?workout', 'energy drink', 'caffeine.*before'],
            answer: (ctx) => {
                const wt = ctx.currentWeight || 180;
                const wtKg = Math.round(wt * 0.453592);
                const low = Math.round(wtKg * 3);
                const high = Math.round(wtKg * 6);
                let html = `<h3>Caffeine &amp; Training Performance</h3>`;
                html += `<p>Caffeine is the most well-studied legal performance enhancer in existence.</p>`;
                html += insightHtml(`Grgic et al. 2018 meta-analysis: caffeine improves strength by <strong>2–7%</strong>, endurance by <strong>2–4%</strong>, and power output by <strong>~3%</strong>. Optimal dose: <strong>3–6 mg/kg</strong>, taken 30–60 min before training. For you: ${low}–${high} mg.`);
                html += `<p><strong>Practical guide:</strong></p><ul>`;
                html += `<li>A cup of coffee = ~95 mg caffeine. An espresso = ~63 mg.</li>`;
                html += `<li>Most pre-workouts contain 150–300 mg — which is why you could just drink coffee for 1/10 the price.</li>`;
                html += `<li><strong>Cut-off time:</strong> No caffeine after 2 PM. Caffeine has a half-life of 5–6 hours. A 3 PM coffee still has half its caffeine in your system at 9 PM — wrecking your deep sleep even if you fall asleep fine.</li>`;
                html += `<li>Tolerance builds in 1–2 weeks. Cycle off for 1 week every 2–3 months to resensitize.</li>`;
                html += `<li>If you don't already use caffeine, start at 100 mg and work up. Don't jump to 400 mg on day one.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            }
        },

        // ===== HORMONES & BIOLOGY =====
        {
            triggers: ['testosterone', 'test level', 'low.?t', 'boost test', 'natural test', 'trt', 'hormone'],
            answer: (ctx) => {
                let html = `<h3>Testosterone &amp; Training</h3>`;
                html += `<p>Testosterone is one of the primary anabolic hormones. But the relationship between test levels and muscle growth is more nuanced than the internet suggests.</p>`;
                html += insightHtml(`Morton et al. 2016 (McMaster University): Post-exercise testosterone spikes do NOT predict muscle growth. The hormone levels that matter are your <strong>baseline 24/7 levels</strong>, not what happens for 30 minutes after squats.`);
                html += `<h3>How to optimize natural testosterone</h3>`;
                html += `<table class="plan-table"><tr><th>Factor</th><th>Impact</th><th>Action</th></tr>`;
                html += `<tr><td>Sleep</td><td>Leproult 2011: 5 hrs/night = 10–15% lower T</td><td>7–9 hours. Non-negotiable.</td></tr>`;
                html += `<tr><td>Body fat</td><td>Obesity lowers T via aromatase conversion</td><td>Stay 10–20% body fat</td></tr>`;
                html += `<tr><td>Dietary fat</td><td>Very low-fat diets reduce T (Hämäläinen 1984)</td><td>Keep fat > 0.8 g/kg/day</td></tr>`;
                html += `<tr><td>Vitamin D</td><td>Pilz 2011: D supplementation raised T by 25% in deficient men</td><td>2,000–4,000 IU/day</td></tr>`;
                html += `<tr><td>Zinc</td><td>Essential for T synthesis — deficiency tanks levels</td><td>15–30 mg/day or eat red meat/oysters</td></tr>`;
                html += `<tr><td>Stress</td><td>Cortisol and testosterone are inversely related</td><td>Manage stress, don't overtrain</td></tr>`;
                html += `<tr><td>Alcohol</td><td>Acute reduction in T for 24–72 hours</td><td>Limit to 1–2 drinks, not on training days</td></tr>`;
                html += `</table>`;
                html += `<p><strong>What DOESN'T work:</strong> Tribulus, fenugreek, "test boosters" — none raise testosterone in healthy men with normal levels (Qureshi 2014 review). Save your money.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['cortisol', 'stress.*hormone', 'stress.*muscle', 'overtrain.*syndrome'],
            answer: (ctx) => {
                let html = `<h3>Cortisol &amp; Overtraining</h3>`;
                html += `<p>Cortisol is a catabolic hormone released during stress — including intense exercise. In small doses it's part of normal recovery. Chronically elevated, it impairs muscle growth, increases fat storage (especially abdominal), and tanks immune function.</p>`;
                html += `<h3>Signs of overtraining / chronic cortisol elevation</h3><ul>`;
                html += `<li>Strength going DOWN despite training hard</li>`;
                html += `<li>Constant fatigue even after sleep</li>`;
                html += `<li>Getting sick more often</li>`;
                html += `<li>Elevated resting heart rate (5+ bpm above normal)</li>`;
                html += `<li>Mood changes — irritability, depression, loss of motivation</li>`;
                html += `<li>Joint pain that doesn't go away</li>`;
                html += `<li>Insomnia despite being exhausted</li>`;
                html += `</ul>`;
                html += `<p><strong>Fix:</strong> Deload immediately (reduce volume 50%, reduce intensity 10%). Sleep 8+ hours. Eat at maintenance or slight surplus. Take 3–5 full rest days. Most "overtraining" is actually <strong>under-recovering</strong> — fix sleep, food, and stress before blaming training volume.</p>`;
                html += verseHtml();
                return html;
            }
        },

        // ===== COMMON MYTHS =====
        {
            triggers: ['tone', 'toning', 'toned', 'long.*lean', 'bulky', 'get.*bulky', 'too.*muscl', 'don.*want.*big'],
            answer: (ctx) => {
                let html = `<h3>Myth: "I Don't Want to Get Bulky"</h3>`;
                html += `<p><strong>"Toning" isn't a thing.</strong> There are exactly two variables: muscle size and body fat percentage. "Toned" means you have visible muscle with low body fat. "Bulky" means you have large muscle with higher body fat.</p>`;
                html += `<p>Building significant muscle takes <strong>years</strong> of dedicated heavy training, calorie surplus, and optimal nutrition. It does not happen by accident. Nobody ever woke up and said "oops, I accidentally got too jacked."</p>`;
                html += insightHtml(`Women produce 15–20× less testosterone than men (Vingren 2010). Even men who WANT to get big struggle to gain more than 20–25 lbs of muscle in their lifetime. You will not get "bulky" from lifting heavy — you will look athletic, strong, and lean.`);
                html += `<p><strong>What to do:</strong> Lift heavy. Progressive overload. Moderate calorie deficit if you want to lose fat. The "toned" look you want IS the muscle + low body fat combination — and heavy lifting is the fastest way to get there.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['meal.*often', 'eat.*often', 'six meals', '6 meals', 'eating frequency', 'metaboli.*fire', 'metabolism.*boost', 'stoke.*metaboli'],
            answer: (ctx) => {
                let html = `<h3>Myth: Eating 6 Small Meals "Stokes the Metabolic Fire"</h3>`;
                html += `<p><strong>This is not true.</strong> The thermic effect of food (TEF) is proportional to total calories, not meal frequency.</p>`;
                html += insightHtml(`Schoenfeld et al. 2015 meta-analysis: meal frequency has <strong>no significant effect</strong> on fat loss or metabolic rate. Whether you eat 2 meals or 6 meals, total daily calories and protein are what matter.`);
                html += `<p><strong>What does matter for meal frequency:</strong></p><ul>`;
                html += `<li><strong>Protein distribution:</strong> Mamerow 2014 showed that spreading protein across 3–4 meals produces more MPS than cramming it into 1–2. Aim for 0.4 g/kg per meal.</li>`;
                html += `<li><strong>Adherence:</strong> Eat however many meals help you stick to your calorie target. If 2 big meals keeps you satisfied, do that. If 5 small meals prevents binging, do that.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['sweat', 'sweating', 'sweat.*fat', 'sauna.*fat', 'sweat.*suit', 'sweat.*lose'],
            answer: (ctx) => {
                let html = `<h3>Myth: Sweating = Burning Fat</h3>`;
                html += `<p><strong>Sweat is thermoregulation, not fat loss.</strong> You lose water weight from sweating, which comes right back when you rehydrate.</p>`;
                html += `<p>Fat is lost through a <strong>calorie deficit</strong>. The actual biochemistry: fat is broken down into CO₂ (you breathe it out) and H₂O (you excrete it). Meerman &amp; Brown 2014 (BMJ): 84% of fat leaves your body as carbon dioxide through your lungs. The sweat is just water.</p>`;
                html += `<p><strong>Saunas:</strong> Good for relaxation, possible cardiovascular benefits (Laukkanen 2015 Finnish study), and perceived recovery. They do NOT meaningfully burn fat. Sauna suits and garbage bags are dangerous — they cause dehydration and can lead to heat stroke.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['high rep.*tone', 'light weight.*tone', 'light.*heavy', 'rep range.*matter', 'hypertrophy.*range', 'best rep range'],
            answer: (ctx) => {
                let html = `<h3>Rep Ranges: What Actually Matters</h3>`;
                html += `<p>The "hypertrophy range" of 8–12 reps is a useful guideline, not a biological law.</p>`;
                html += insightHtml(`Schoenfeld et al. 2017 rep range study: Training with 8–12 reps, 3–5 reps, OR 25–35 reps all produced <strong>similar muscle growth</strong> when volume was equated. The key variable is <strong>training close to failure</strong>, not the rep range.`);
                html += `<table class="plan-table"><tr><th>Rep range</th><th>Best for</th><th>Notes</th></tr>`;
                html += `<tr><td>1–5</td><td>Maximal strength</td><td>Heavy, high neural demand, long rest (3–5 min)</td></tr>`;
                html += `<tr><td>6–12</td><td>Hypertrophy (practical sweet spot)</td><td>Best balance of mechanical tension + metabolic stress + time efficiency</td></tr>`;
                html += `<tr><td>12–20</td><td>Muscular endurance + hypertrophy</td><td>Good for isolation work, joints feel better</td></tr>`;
                html += `<tr><td>20–30+</td><td>Endurance, pump, rehab</td><td>Still builds muscle IF taken near failure. Mentally brutal.</td></tr>`;
                html += `</table>`;
                html += `<p><strong>Practical advice:</strong> Do most of your work in 6–15 reps, but include some heavy work (3–5) for compounds and some higher rep work (15–20) for isolation. Variety in rep ranges is itself a hypertrophy stimulus.</p>`;
                html += verseHtml();
                return html;
            }
        },

        // ===== SPECIFIC CONCERNS =====
        {
            triggers: ['women', 'female', 'girl', 'woman', 'ladies', 'women.*train', 'train.*different'],
            answer: (ctx) => {
                let html = `<h3>Training for Women</h3>`;
                html += `<p><strong>Women should train the same way as men.</strong> The fundamental biology of muscle growth is identical. The same exercises, same progressive overload, same principles apply.</p>`;
                html += insightHtml(`Roberts et al. 2020 meta: Women respond to resistance training with the same relative muscle growth as men. The absolute amount is less (due to lower testosterone), but the training stimulus should be the same.`);
                html += `<p><strong>Key differences:</strong></p><ul>`;
                html += `<li>Women can generally handle <strong>more volume</strong> than men at a given intensity and recover faster between sets (Hunter 2014)</li>`;
                html += `<li>Women tend to perform better with <strong>slightly higher rep ranges</strong> (8–15) because they have a higher proportion of Type I (endurance) muscle fibers on average</li>`;
                html += `<li>Menstrual cycle: Strength peaks in the follicular phase (days 1–14). Some women train heavier during this phase and focus on volume/technique in the luteal phase (Wikström-Frisén 2017)</li>`;
                html += `<li>You will NOT get "bulky." Women produce 15–20× less testosterone than men. Lifting heavy builds a lean, athletic physique — not a bodybuilder's physique.</li>`;
                html += `</ul>`;
                html += `<p><strong>Bottom line:</strong> Squat, bench, deadlift, overhead press, row. Progressive overload. Eat enough protein. Everything else is the same.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['knee', 'knee pain', 'squat.*knee', 'knee.*squat', 'bad.*knee', 'knee.*past'],
            answer: (ctx) => {
                let html = `<h3>Knee Health &amp; Training</h3>`;
                html += `<p><strong>"Squats are bad for your knees"</strong> is one of the most persistent and harmful myths in fitness.</p>`;
                html += insightHtml(`Hartmann et al. 2013 review: Deep squats do NOT increase injury risk in healthy knees. In fact, the forces on the ACL and PCL <strong>decrease</strong> as you squat deeper because of the wrapping effect of soft tissue around the joint.`);
                html += `<p><strong>If you currently have knee pain:</strong></p><ul>`;
                html += `<li>Box squats or squat to a bench — control depth, reduce bounce</li>`;
                html += `<li>Goblet squats — the counterbalance helps you sit back more</li>`;
                html += `<li>Leg press with limited range (don't go too deep)</li>`;
                html += `<li>Terminal knee extensions (TKEs) — rehab staple for patellar tendon issues</li>`;
                html += `<li>Step-ups — unilateral, low impact, highly effective</li>`;
                html += `<li>Strengthen your VMO (inner quad) — it stabilizes the patella</li>`;
                html += `</ul>`;
                html += `<p><strong>Long term:</strong> Strengthening the muscles around the knee (quads, hamstrings, glutes) is the single best thing you can do for knee health. Weak legs = vulnerable joints. Strong legs = protected joints.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['back pain', 'lower back', 'herniat', 'disc', 'spine', 'back.*hurt', 'deadlift.*back'],
            answer: (ctx) => {
                let html = `<h3>Back Pain &amp; Training</h3>`;
                html += `<p>Most low back pain in lifters comes from one of three causes: (1) too much volume, (2) poor bracing, or (3) ego loading. Rarely is the spine itself damaged.</p>`;
                html += `<p><strong>If you're currently in pain:</strong></p><ul>`;
                html += `<li>Don't stop training — controlled movement is better than bed rest (Hayden 2005 Cochrane review)</li>`;
                html += `<li>Drop deadlifts and squats temporarily. Replace with hip thrusts, leg press, goblet squats</li>`;
                html += `<li>McGill Big 3: curl-ups, side planks, bird dogs — core stability rehab that works (McGill 2015)</li>`;
                html += `<li>Walk daily — increases blood flow to the spine, reduces stiffness</li>`;
                html += `<li>If pain persists > 6 weeks or includes numbness/tingling, see a sports medicine doctor</li>`;
                html += `</ul>`;
                html += `<h3>Prevention</h3><ul>`;
                html += `<li><strong>Brace before every rep.</strong> Deep breath into your belly, tighten your abs like someone's about to punch you, push your obliques out. This creates intra-abdominal pressure that supports the spine.</li>`;
                html += `<li><strong>Neutral spine.</strong> No rounding, no hyperextending. This applies to deadlifts, squats, rows, and overhead press.</li>`;
                html += `<li><strong>Hip hinge, don't back bend.</strong> On deadlifts and rows, the motion comes from the hips. If your lower back rounds, the weight is too heavy or your hamstrings are too tight.</li>`;
                html += `</ul>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['shoulder.*pain', 'rotator', 'impinge', 'shoulder.*hurt', 'bench.*shoulder'],
            answer: (ctx) => {
                let html = `<h3>Shoulder Pain &amp; Training</h3>`;
                html += `<p>Shoulder impingement is the #1 injury in recreational lifters, almost always caused by too much pressing volume relative to pulling volume.</p>`;
                html += `<p><strong>The fix:</strong></p><ul>`;
                html += `<li><strong>2:1 pull-to-push ratio.</strong> For every set of bench/overhead press, do 2 sets of rows/pull-ups/face pulls.</li>`;
                html += `<li><strong>Face pulls every session.</strong> 2–3 sets of 15–20 reps. This strengthens the external rotators and rear delts — the muscles that protect the shoulder joint.</li>`;
                html += `<li><strong>Stop bench pressing to the neck.</strong> Touch mid-chest. Elbows at ~45° angle, not 90°. Flared elbows impinge the supraspinatus tendon.</li>`;
                html += `<li><strong>Neutral grip pressing</strong> (palms facing each other) is more shoulder-friendly than pronated grip for overhead work</li>`;
                html += `<li><strong>Upright rows</strong> — replace with cable lateral raises or high pulls. The internally rotated position of upright rows is notorious for impingement.</li>`;
                html += `</ul>`;
                html += insightHtml(`Cools et al. 2007: External rotation strengthening reduced shoulder pain in overhead athletes by 68% over 6 weeks. Face pulls, band pull-aparts, and external rotation exercises are your insurance policy.`);
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['grip', 'grip strength', 'forearm', 'weak grip', 'can.*t hold', 'strap', 'wrist.*strap', 'grip.*fail'],
            answer: (ctx) => {
                let html = `<h3>Grip Strength</h3>`;
                html += `<p>If your grip fails before your target muscle does, you're leaving gains on the table.</p>`;
                html += `<p><strong>Use straps + train grip separately.</strong> This is not cheating — it's smart. Let your back grow on heavy rows and deadlifts by using straps, then train grip as its own thing.</p>`;
                html += `<h3>Grip training protocol</h3><ul>`;
                html += `<li><strong>Dead hangs:</strong> Hang from a pull-up bar for max time. 3 sets. When you hit 60 sec, add weight.</li>`;
                html += `<li><strong>Farmer's carries:</strong> Heavy dumbbells or trap bar, walk 40–60m. 3 sets.</li>`;
                html += `<li><strong>Plate pinches:</strong> Pinch two 10 lb plates smooth-side-out. Hold for time.</li>`;
                html += `<li><strong>Fat grips:</strong> Wrap a towel around the bar for curls and rows — thicker grip = harder.</li>`;
                html += `<li><strong>Wrist curls:</strong> 3×15–20 with a light barbell. Forearms respond well to high reps.</li>`;
                html += `</ul>`;
                html += insightHtml(`Bohannon 2008: Grip strength is one of the strongest predictors of overall health, longevity, and functional capacity. It's not just about holding deadlifts — it's about aging well.`);
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['posture', 'rounded shoulder', 'forward head', 'hunch', 'slouch', 'desk.*job', 'anterior pelvic', 'apt'],
            answer: (ctx) => {
                let html = `<h3>Posture &amp; Lifting</h3>`;
                html += `<p>The best fix for bad posture isn't stretching or gadgets — it's getting stronger.</p>`;
                html += `<p><strong>Common issues and fixes:</strong></p>`;
                html += `<table class="plan-table"><tr><th>Problem</th><th>Weak muscles</th><th>Key exercises</th></tr>`;
                html += `<tr><td>Rounded shoulders</td><td>Mid traps, rear delts, external rotators</td><td>Face pulls, band pull-aparts, rows</td></tr>`;
                html += `<tr><td>Forward head</td><td>Deep neck flexors</td><td>Chin tucks (hold 5 sec × 15 reps, 3×/day)</td></tr>`;
                html += `<tr><td>Anterior pelvic tilt</td><td>Glutes, abs</td><td>Glute bridges, dead bugs, RKC planks</td></tr>`;
                html += `<tr><td>Upper back rounding</td><td>Thoracic extensors</td><td>Deadlifts, rows, face pulls, thoracic extensions over foam roller</td></tr>`;
                html += `</table>`;
                html += insightHtml(`Here's the uncomfortable truth: Sitting 8 hours/day will undo 1 hour of "posture exercises." The single biggest fix is <strong>movement variety</strong> — stand up every 30 minutes, change positions frequently, and build a strong back through heavy rows and deadlifts.`);
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['sleep.*muscle', 'sleep.*grow', 'how much sleep', 'sleep.*gain', 'sleep.*recover', 'insomnia.*gym'],
            answer: (ctx) => {
                let html = `<h3>Sleep &amp; Muscle Growth</h3>`;
                html += `<p>Sleep is when growth hormone peaks, protein synthesis is highest, and your nervous system recovers. Cutting sleep is like training hard and then skipping the payoff.</p>`;
                html += insightHtml(`<strong>The damage of poor sleep:</strong> Dattilo et al. 2011: Sleep restriction reduces anabolic hormone output by 15–30%. Leproult &amp; Van Cauter 2011: One week of 5-hour sleep reduced testosterone by 10–15%. That's equivalent to aging 10–15 years.`);
                html += `<h3>Sleep optimization for lifters</h3><ol>`;
                html += `<li><strong>7–9 hours minimum.</strong> Non-negotiable for recovery. 6 hours is not enough even if you "feel fine."</li>`;
                html += `<li><strong>Consistent schedule.</strong> Same bedtime ±30 min every night. Your circadian rhythm doesn't understand weekends.</li>`;
                html += `<li><strong>Cool room (65–68°F).</strong> Core body temperature needs to drop for deep sleep onset.</li>`;
                html += `<li><strong>No screens 30–60 min before bed.</strong> Blue light suppresses melatonin (Chang 2015).</li>`;
                html += `<li><strong>No caffeine after 2 PM.</strong> Half-life of 5–6 hours.</li>`;
                html += `<li><strong>Magnesium glycinate (300–400 mg)</strong> before bed improves sleep quality (Abbasi 2012).</li>`;
                html += `<li><strong>If you train at night:</strong> Finish 2–3 hours before bed. Post-workout cortisol and elevated heart rate interfere with sleep onset.</li>`;
                html += `</ol>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['mental', 'anxiety', 'depression', 'mood', 'stress.*relief', 'brain.*exercise', 'exercise.*mental', 'motivation.*gone'],
            answer: (ctx) => {
                let html = `<h3>Exercise &amp; Mental Health</h3>`;
                html += `<p>This might be the most important thing in this whole app.</p>`;
                html += insightHtml(`Schuch et al. 2018 meta (49 studies, 266,939 people): Regular exercise reduces the risk of developing depression by <strong>17%</strong>. For those already experiencing depression, exercise is as effective as antidepressant medication for mild-to-moderate cases (Blumenthal 2007).`);
                html += `<p><strong>The mechanisms:</strong></p><ul>`;
                html += `<li><strong>Endorphins</strong> — natural painkillers and mood elevators, released during moderate-to-hard exercise</li>`;
                html += `<li><strong>BDNF (Brain-Derived Neurotrophic Factor)</strong> — exercise increases BDNF, which promotes neuroplasticity and protects against cognitive decline</li>`;
                html += `<li><strong>Cortisol regulation</strong> — regular exercise lowers baseline cortisol and improves stress resilience</li>`;
                html += `<li><strong>Self-efficacy</strong> — completing hard workouts builds confidence that transfers to every other area of life</li>`;
                html += `<li><strong>Structure and discipline</strong> — a training routine provides purpose and routine when everything else feels chaotic</li>`;
                html += `</ul>`;
                html += `<p>On days when you don't feel like training, show up anyway and do something — even 20 minutes of walking or a light session. You will never regret a workout. The hardest part is starting.</p>`;
                html += verseHtml({ text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" });
                return html;
            }
        },
        {
            triggers: ['creatine', 'creatine.*safe', 'creatine.*kidney', 'creatine.*hair', 'creatine.*load', 'creatine.*water'],
            answer: (ctx) => {
                let html = `<h3>Creatine: Everything You Need to Know</h3>`;
                html += `<p>Creatine monohydrate is the most studied supplement in sports science history. It works. It's safe. Period.</p>`;
                html += `<h3>What it does</h3>`;
                html += `<p>Creatine donates a phosphate group to regenerate ATP during short, intense efforts (1–10 sec). This means more reps, more power, faster recovery between sets.</p>`;
                html += insightHtml(`Kreider et al. 2017 (ISSN position stand): Creatine increases strength by <strong>5–15%</strong>, lean mass by <strong>1–2 kg over 4–12 weeks</strong>, and has over 500 peer-reviewed studies confirming its safety.`);
                html += `<h3>Common concerns</h3><ul>`;
                html += `<li><strong>"Is it bad for your kidneys?"</strong> No. Poortmans &amp; Francaux 2000, Antonio 2021: No adverse effects on kidney function in healthy individuals, even at doses up to 30g/day for 5 years.</li>`;
                html += `<li><strong>"Does it cause hair loss?"</strong> One single study (van der Merwe 2009) showed increased DHT levels. It has never been replicated. The hair loss claim has weak evidence.</li>`;
                html += `<li><strong>"Do I need to load?"</strong> No. Loading (20g/day for 5–7 days) saturates stores faster, but 3–5g/day reaches the same saturation in 3–4 weeks.</li>`;
                html += `<li><strong>"Water retention?"</strong> Yes — creatine pulls water INTO the muscle cell. This is a good thing. Your muscles look fuller. It's not bloating.</li>`;
                html += `<li><strong>"Which type?"</strong> Creatine monohydrate. Not HCl, not ethyl ester, not buffered. Monohydrate is the cheapest and has the most evidence. Everything else is marketing.</li>`;
                html += `</ul>`;
                html += `<p><strong>Dose:</strong> 3–5g per day, any time. With food or without. Timing doesn't matter. Just take it daily.</p>`;
                html += verseHtml();
                return html;
            }
        },
        {
            triggers: ['whey', 'protein powder', 'protein shake', 'casein', 'plant protein', 'which protein', 'best protein'],
            answer: (ctx) => {
                let html = `<h3>Protein Powders: What to Buy</h3>`;
                html += `<p>Protein powder is a <strong>convenience tool</strong>, not a magic supplement. Whole food protein (chicken, fish, eggs, dairy) is equally effective — powder just makes it easier to hit your daily target.</p>`;
                html += `<table class="plan-table"><tr><th>Type</th><th>Pros</th><th>Best for</th></tr>`;
                html += `<tr><td>Whey concentrate</td><td>Cheap, fast-absorbing, complete amino profile</td><td>General use, post-workout</td></tr>`;
                html += `<tr><td>Whey isolate</td><td>Lower lactose, higher protein %</td><td>Lactose sensitivity, cutting (fewer calories per scoop)</td></tr>`;
                html += `<tr><td>Casein</td><td>Slow-digesting (6–8 hours)</td><td>Before bed (Res 2012: nighttime casein increases overnight MPS)</td></tr>`;
                html += `<tr><td>Plant blend (pea+rice)</td><td>Vegan-friendly, complete when blended</td><td>Dairy-free lifters</td></tr>`;
                html += `</table>`;
                html += insightHtml(`Messina et al. 2018 meta: No significant difference in muscle growth between whey and plant-based protein when total protein and leucine content are matched. The "whey is superior" claim is overstated.`);
                html += `<p><strong>Dose:</strong> 20–40g per serving (Macnaughton 2016: larger athletes benefit from 40g vs 20g post-workout). 1–2 shakes per day as needed to hit your protein target.</p>`;
                html += verseHtml();
                return html;
            }
        },
    ],

    // Fallback for unrecognized input — shows help menu
    // (generalKnowledge is now checked BEFORE reaching fallback in processCoachInput)
    fallback: (ctx, input) => {
        const name = ctx.profile.name ? escapeHtml(ctx.profile.name) : 'there';
        let html = `<p>Hey ${name}, I didn't catch that one. Try asking about:</p>`;
        html += `<ul>`;
        html += `<li><strong>"Will 30 min on the stairmaster help me lose weight?"</strong></li>`;
        html += `<li><strong>"How much protein do I need?"</strong></li>`;
        html += `<li><strong>"Generate a workout plan"</strong></li>`;
        html += `<li><strong>"Help me lose weight"</strong> or <strong>"build muscle"</strong></li>`;
        html += `<li><strong>"How do I squat / bench / deadlift?"</strong></li>`;
        html += `<li><strong>"Analyze my progress"</strong></li>`;
        html += `<li><strong>"I've hit a plateau"</strong></li>`;
        html += `<li><strong>"Supplements"</strong> — what works, what to skip</li>`;
        html += `<li><strong>"Recovery tips"</strong></li>`;
        html += `</ul>`;
        html += `<p style="color:var(--text-muted);font-size:13px">I can also answer questions about specific exercises, cardio machines, calorie burn, training frequency, soreness, alcohol and gains, belly fat, and more.</p>`;
        html += verseHtml();
        return html;
    },
};

