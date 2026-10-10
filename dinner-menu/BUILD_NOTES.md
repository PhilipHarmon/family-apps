# Dinner Menu — Build Notes (2026-10-08)

## What's new

### 🚨 "Oh shit, daddy's cooking" — Dad Mode emergency section
- New nav tab **🚨 Dad Mode** + a big chunky red **"🚨 Dad's on dinner duty"** button in the header that jumps straight to the section (smooth scroll).
- Section banner uses Philip's exact wording: **"🚨 Oh shit, daddy's cooking"**, with a warmer/redder ember-gradient treatment so it feels distinct from the weekly-planning UI.
- **🎲 "Save me — pick one"** button randomly selects a dad recipe and opens it in the recipe modal.
- 10 stupidly-easy recipes (all 20 min max, shortcut-heavy, kid-approved), each with 5 or fewer dead-simple steps and one funny dad-tip one-liner:
  1. Emergency Quesadillas (~10 min) 🫓
  2. Breakfast-for-Dinner Pancakes (~15 min) 🥞
  3. Rotisserie Chicken Rescue (~10 min) 🍗
  4. Fancy Jar-Sauce Spaghetti (~15 min) 🍝
  5. Grilled Cheese + Tomato Soup (~15 min) 🧀
  6. Taco Kit Night (~15 min) 🌮
  7. Upgraded Frozen Pizza (~15 min) 🍕
  8. Chicken Nugget Parm (~15 min) 🍗
  9. BLT Night (~15 min) 🥓
  10. Restaurant-Style Instant Ramen (~12 min) 🍜
- Data lives in `src/data/dad-recipes.js` (`DAD_RECIPES`), same shape as `SEED_RECIPES` — rendered with the existing recipe card + recipe modal components (reused, not duplicated).
- Dad recipes open in a read-only modal (new `emergency` prop on `RecipeModal`): no favorites star, no notes — just cook it and take the credit.
- Dad recipes are **local-only** (not synced to the family server, not part of week planning, grocery list, favorites, or import). They can't break any server data.

### CSS beef-up (whole app)
- Oversized responsive header (`clamp()` sizing, text shadow, deeper gradient).
- Layered shadows on all cards (day cards, recipe cards, grocery, modals surfaces).
- Chunkier buttons: gradient primary buttons, `min-height: 44px` on all buttons/tabs, bold weights.
- Bigger section headers; larger recipe emoji with drop shadow.
- All hover lift/glow effects remain inside `@media (hover: hover)`; touch keeps `:active` press feedback; `prefers-reduced-motion` still kills all motion.
- Dad Mode gets its own red accent system (3D chunky buttons with press-down effect, ember banner, red card accents).

## What Philip needs to know
- **Deploy:** this is the standard family-apps flow — merge into his local clone and push; Render rebuilds. No env changes, no migration, no reseed needed.
- **Nothing existing changed behaviorally:** week planning, favorites, notes, grocery list, import/export, demo mode, and family-key auth all work exactly as before. The only additions are the Dad Mode tab, the header button, and styles.
- **Phone check:** Dad Mode tab + "Save me" button are full-width thumb-friendly on phones; modal becomes a bottom sheet on small screens (existing behavior, reused).
- Mild profanity appears **only** in the section title, per his wording. Everything else is clean and dad-self-deprecating.

## Build
- `npm run build` — clean, no errors. Output in `dist/` (index.html + hashed JS/CSS).
- No git commit made (per instructions).
