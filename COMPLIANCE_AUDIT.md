# CertiPure Compliance Audit (AllayPay Requirements)

**Date:** 2026-05-26
**Scope:** Static audit of the source tree under `src/` (Next.js app), plus root config and `public/`.
**IMPORTANT CAVEAT:** Product names, descriptions, short descriptions, category names, and COA fields are stored in **Supabase** (database), NOT in source code. This audit covers only what lives in the repo. The Supabase `products` and `categories` tables must be audited separately — see "Open Questions" at the end of Section 3.

---

## Section 1: Required Items Status

### 1. Popup age verification (modal on first visit, BEFORE any browsing) — **PARTIAL**

- **What exists:** `src/components/GateModal.tsx` is shown on first visit (enforced by `src/app/layout.tsx:23-41` — the entire site is blurred behind it for any non-logged-in user). The signup form has a `21+` checkbox at line 256-275 of `GateModal.tsx`, and the error message at line 43 reads *"You must be 21+ and agree to the Terms & Conditions."*
- **What's missing:** There is **no dedicated standalone age-verification popup** that appears with simple Yes/No (or "I am 21+" / "I am not") buttons BEFORE the signup gate. The age confirmation is bundled into the signup form as a checkbox. AllayPay typically expects a separate, simpler "Are you 21 or older?" interstitial that fires before any content (including the signup modal) loads.
- **What needs to change:** Decide whether the bundled signup-checkbox satisfies AllayPay's intent. If not, add a new `AgeGateModal` component that fires first, stores a confirmation in `localStorage` or a cookie, and only then exposes the `GateModal`. (Question for Josh below.)

### 2. Front or back gate (account required to browse) — **PRESENT**

- **What exists:** `src/app/layout.tsx:23-41` — if `supabase.auth.getUser()` returns no user, the entire site is rendered inside a blurred `aria-hidden` wrapper and `<GateModal />` is shown. Users cannot interact with the underlying page (`pointer-events-none select-none`). Signup and login are both wired through Supabase (`GateModal.tsx:50-118`).
- **What needs to change:** Nothing. Functioning as intended.

### 3. Research field selector (Pharmacology / Molecular Biology / Medicinal Chemistry / Biochemistry / Other) — **MISSING**

- **What exists:** Nothing. The signup form in `GateModal.tsx` collects only `firstName`, `lastName`, `email`, `password`, and the 21+/terms checkbox.
- **What's missing:** A required `<select>` (or radio group) labeled "Research Field" with the five options listed in the requirement.
- **What needs to change:**
  - Add a `researchField` state and field to the signup form in `src/components/GateModal.tsx`.
  - Persist it in the Supabase auth `options.data` payload (lines 53-60 of `GateModal.tsx`) so it lands in the user metadata / profile row.
  - Likely also add a `research_field` column to the `profiles` table in Supabase, and update the existing profile-creation trigger to copy it across.

### 4. Disclaimers block (footer + dedicated `/disclaimers` page) — **PARTIAL**

- **What exists:**
  - Footer disclaimer block at `src/components/Footer.tsx:51-61`, which contains: the "⚠ Mandatory Legal Disclaimer" banner, a "For Research Use Only. Not for Human Consumption." line, a 503A/503B chemical-supplier disclaimer, an FDA "not evaluated to diagnose, treat, cure or prevent any disease" disclaimer, and "Human/Animal Consumption Prohibited. Laboratory/In-Vitro Experimental Use Only".
  - A separate short disclaimer line at `Footer.tsx:48`: *"All products are intended strictly for laboratory and research purposes only. Not for human consumption."*
  - A top-of-site "For Research Use Only" banner in `Navbar.tsx:15-17`.
- **What's missing:**
  - **No dedicated `/disclaimers` page** — no `src/app/disclaimers/` route exists.
  - **None of the four verbatim AllayPay-required disclaimer statements appear** anywhere on the site (see items 5–8 below).
- **What needs to change:**
  - Create `src/app/disclaimers/page.tsx` containing the four verbatim statements (and likely the existing FDA/503 language too).
  - Add a footer link to `/disclaimers` (currently the Support column points "Privacy Policy" and "Terms" at `/contact`, which is also broken — see additional findings below).
  - Add the four verbatim statements to the footer disclaimer block.

### 5. "All products currently listed on this site are for research purposes ONLY." — **MISSING**

- Verbatim string does not appear anywhere in the repo. Footer has a near-paraphrase only.

### 6. "All products sold on this website are intended for research and identification purposes only." — **MISSING**

- Verbatim string does not appear anywhere in the repo. The phrase "identification purposes" appears nowhere.

### 7. "These products are not intended for human dosing, injections, or ingestion." — **MISSING**

- Verbatim string does not appear. The Terms page (`terms/page.tsx:16`) has similar intent ("not intended for human consumption, ingestion, injection, inhalation…"), but the wording is different and it's inside the Terms page, not the disclaimers block.

### 8. "Peptides are strictly for laboratory, academic, or institutional research and not for human or animal consumption." — **MISSING**

- Verbatim string does not appear. The phrase "academic, or institutional" appears nowhere.

---

## Section 2: Prohibited Content Found

The static codebase is fairly clean — most marketing prose is restrained. The findings below are graded by severity.

### Finding 2.1 — "FAQ" link in footer  *(category 13: blogs/FAQs implying personal use)*

- **File / line:** `src/components/Footer.tsx:37`
- **Exact text:** `<Link href="/contact" className="...">FAQ</Link>`
- **Issue:** The Support column lists an "FAQ" link. Item 13 prohibits FAQs (which often answer human-use-style questions). Even though this link currently points at `/contact` (i.e., the actual FAQ page doesn't exist), the *word* "FAQ" appearing on the site is the problem.
- **Suggested replacement:** Remove the line entirely. Replace with a generic "Support" or "Help" link, or drop it.

### Finding 2.2 — Broken/misleading "Privacy Policy" and "Terms" links in footer  *(not a compliance violation per se, but related and worth fixing in the same pass)*

- **File / lines:** `src/components/Footer.tsx:39` and `Footer.tsx:40`
- **Exact text:** Both `<Link>` elements point to `/contact`, not `/privacy` or `/terms`. Those pages exist (`src/app/privacy/page.tsx`, `src/app/terms/page.tsx`) but are not linked from the footer.
- **Issue:** Not a content violation. Flagging because AllayPay reviewers will click these links and find the wrong page.
- **Suggested replacement:** Change `href="/contact"` to `href="/privacy"` and `href="/terms"` respectively.

### Finding 2.3 — "Best Sellers" link in footer  *(category 11/12: borderline — implies purchase popularity, which is sometimes read as outcome-related social proof)*

- **File / line:** `src/components/Footer.tsx:23`
- **Exact text:** `<Link href="/shop" ...>Best Sellers</Link>`
- **Issue:** Borderline. "Best Sellers" itself isn't an outcome claim, but combined with the product `badge` field (see 2.4) it leans toward popularity-as-endorsement. Lower priority — flag for Josh to decide.
- **Suggested replacement:** Either remove the link or rename to "All Products" (or just drop the duplicate, since "All Peptides" is right above it).

### Finding 2.4 — Product `badge` values "Best Seller" / "Popular"  *(category 11/12: popularity-as-social-proof)*

- **Files / lines:** `src/components/ProductCard.tsx:11-13` and `src/components/FeaturedCarousel.tsx:25-29`
- **Exact text (logic):** `product.badge === 'Best Seller' || product.badge === 'Popular'` are rendered as styled badges on product cards.
- **Issue:** The badge text is stored in the Supabase `products.badge` column, so the actual values shown to customers depend on what's seeded in the DB. If any product has `badge = 'Best Seller'` or `badge = 'Popular'`, those will render. Both are popularity claims tied to customer behavior — AllayPay tends to disallow these for research peptide stores.
- **Suggested replacement:** Either:
  - Set all product `badge` values to neutral terms like `"New"`, `"Limited Stock"`, or null; OR
  - Remove the badge rendering entirely from `ProductCard.tsx` and `FeaturedCarousel.tsx`.

### Finding 2.5 — Newsletter section "Stay Updated... new products and batch releases"  *(category 12: marketing tone — borderline)*

- **File / lines:** `src/app/page.tsx:118-125`
- **Exact text:** `"Stay Updated"` / `"Get notified about new products and batch releases."`
- **Issue:** Mild. A newsletter signup for "new products and batch releases" is transactional and not outcome-based, so probably acceptable. Flagging only because some processors treat marketing email lists for peptide stores cautiously.
- **Suggested replacement:** If Josh wants to be conservative — rephrase to `"Get notified about new product availability and lab test releases."` Or remove the section entirely if email marketing is not in the near-term plan.

### Finding 2.6 — Marketing words: "Premium" in title/meta and footer  *(category 9: borderline — qualitative product claim)*

- **Files / lines:**
  - `src/app/layout.tsx:9` — `title: "CertiPure - Premium Research Peptides | 99%+ Purity"`
  - `src/app/layout.tsx:10` — `description: "Premium research peptides with 99%+ purity. Every batch third-party lab tested."`
  - `src/components/Footer.tsx:16` — `Premium research peptides with 99%+ purity, backed by third-party lab testing.`
- **Issue:** "Premium" is a quality adjective; some compliance reviewers flag it because it implies a graded product (often associated with consumables). "99%+ purity" is a factual purity claim tied to the COA, which is normally fine. Lower priority.
- **Suggested replacement:** Change "Premium research peptides" to "Research peptides" or "Third-party-tested research peptides" if Josh wants to play it safe.

### Finding 2.7 — Hero image alt text: "Tested Trusted Affordable"  *(category 9: borderline marketing tagline)*

- **File / line:** `src/app/page.tsx:38`
- **Exact text:** `alt="CertiPURE - Tested Trusted Affordable"`
- **Issue:** "Affordable" is a marketing claim. Combined with the visible tagline in the hero image, this is the only "branded promise" on the page. AllayPay is unlikely to push back on "Tested Trusted Affordable," but worth flagging since the tagline also appears burned into the hero image asset (`/certipure-hero-image.jpg`) — changing the alt won't change what users see.
- **Suggested replacement:** Update alt to `"CertiPure - Research peptides, third-party lab tested"`. The image itself may need replacement if the tagline must be removed visually (open question for Josh).

### Finding 2.8 — About page wording: "most in-demand research compounds"  *(category 9: borderline)*

- **File / line:** `src/app/about/page.tsx:14`
- **Exact text:** `"a curated catalog of the most in-demand research compounds."`
- **Issue:** "In-demand" implies popularity/desirability — borderline social-proof phrasing. Low priority.
- **Suggested replacement:** Change to `"a curated catalog of commonly studied research compounds."`

### What was searched and NOT found (clean)

- No health/wellness/recovery/anti-aging/weight-loss/muscle-gain/longevity/benefits/mood/energy/sleep keywords in static files.
- No dosage / protocol / cycle / stack / mg-per-day / subcutaneous / SubQ / IM language used as guidance (the only `inject*` matches are in disclaimer text prohibiting injection).
- No testimonial, customer-review, star-rating, or "I felt"/"I experienced" content.
- No Instagram / Facebook / Twitter / TikTok / influencer / "as seen on" / bodybuilding / fitness language.
- No `/blog` route (`src/app/blog/` does not exist). The Navbar (`src/components/Navbar.tsx:43-51`) has only Home / Shop / Testing Results / About Us / Contact Us. No Blog link to remove.
- No `/faq` route either. (But the *word* "FAQ" still appears in the footer — see Finding 2.1.)
- No social-media / Open Graph metadata defined anywhere.

### What could NOT be audited (DATABASE CONTENT)

Product data lives in Supabase tables (`products`, `categories`, `coas`). The repo has no seed file, no SQL, no JSON product fixture. The following fields are **NOT covered by this audit** and almost certainly need their own review:

- `products.name`
- `products.short_description`
- `products.description`
- `products.badge` (already flagged — see 2.4)
- `products.sku`
- `categories.name`
- `categories.description`
- Any peptide names that imply human/athletic/wellness use (e.g., anything historically marketed for muscle, sleep, tan, weight loss, etc.) — the *fact that a product exists* with a certain name can itself trigger AllayPay scrutiny.

---

## Section 3: Summary

### Totals

- **Required items missing or partial:** 6 of 8 (items 1, 3, 4, 5, 6, 7, 8 — only item 2 is fully present).
- **Prohibited content findings in source:** 8 (1 hard violation, 7 borderline/medium).
- **Files needing changes (source-code estimate):** 4 files at minimum, plus 1–2 new files.
  - `src/components/GateModal.tsx` — add research field selector (and, if needed, add a separate age-gate component)
  - `src/components/Footer.tsx` — remove/replace FAQ link, fix Privacy/Terms hrefs, add `/disclaimers` link, add four verbatim disclaimer statements, possibly remove "Best Sellers"
  - `src/app/layout.tsx` — update `title` and `description` if "Premium" is dropped; possibly wire age-gate above `GateModal`
  - `src/app/page.tsx` — update hero alt text; optionally remove or rephrase newsletter section
  - `src/app/about/page.tsx` — rephrase "most in-demand"
  - **NEW** `src/app/disclaimers/page.tsx` — create dedicated disclaimers page
  - **NEW (maybe)** `src/components/AgeGateModal.tsx` — separate age verification interstitial
  - **NOT in repo but needed:** Supabase product data scrub + add `research_field` column to profiles.

### Recommended order of fixes (highest risk first)

1. **Add the four verbatim disclaimer statements** (items 5–8) to the footer disclaimer block AND create `/disclaimers` page. *Highest payment-processor risk — a literal text requirement.*
2. **Add the research field selector** to signup (item 3). *Required structural element; also a literal AllayPay requirement.*
3. **Add a dedicated popup age verification** (item 1), OR confirm with AllayPay that the signup-checkbox satisfies them. *Structural requirement; depends on Josh's read of the requirement.*
4. **Audit Supabase product/category/COA data** for prohibited content. *Cannot be done in code — but the highest-volume copy on the site lives there. Likely the biggest source of risk overall.*
5. **Remove the "FAQ" link** from the footer (Finding 2.1).
6. **Set product `badge` values** so "Best Seller" / "Popular" don't render (Finding 2.4) — either in DB or by removing the badge UI.
7. **Fix broken Privacy/Terms footer links** (Finding 2.2) — quick hygiene win.
8. **Soft cleanups:** drop "Premium" / "Best Sellers" / "in-demand" / "Affordable" alt text / newsletter rephrase (Findings 2.3, 2.5, 2.6, 2.7, 2.8).

### Open questions for Josh (please answer before I make changes)

1. **Age popup vs. signup checkbox** — Does AllayPay require a *separate* age-verification popup BEFORE the signup modal, or is the existing 21+ checkbox in the signup form acceptable? (Your contact at AllayPay would know for sure. If unsure, the safest path is to add a separate popup.)
2. **Research field timing** — Should the research field selector appear during **signup** (in the gate modal), during **checkout**, or both? The requirement says "during signup OR checkout"; signup is faster to implement.
3. **Disclaimer placement** — Do you want the four verbatim disclaimer statements (a) only on `/disclaimers`, (b) only in the footer disclaimer block, or (c) both? Both is safest and only a small amount of duplicate text.
4. **Hero image** — The phrase "Tested Trusted Affordable" appears to be burned into the hero image at `/public/certipure-hero-image.jpg`. If we need to drop "Affordable," we'll need a new image. Want me to flag this for design replacement?
5. **Supabase product/category audit** — I cannot read Supabase data from the repo. Can you either (a) export the `products` and `categories` tables to a CSV/JSON I can read, or (b) paste the product names + short descriptions into a comment so I can audit them? This is almost certainly where the bulk of compliance risk lives.
6. **Badge field** — Are any products currently flagged with `badge = 'Best Seller'` or `badge = 'Popular'` in Supabase? If yes, we should change those values when we audit the DB.
7. **Newsletter** — Keep, rephrase, or remove the "Stay Updated" section on the homepage? It's borderline.
8. **"Premium" wording** — Drop it from `<title>`, meta description, and footer? Or keep and hope AllayPay is fine with it?
