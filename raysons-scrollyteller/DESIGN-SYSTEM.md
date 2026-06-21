# Raysons Scroll-Cinema — Premium Design System
*Target: Refokus / Active Theory / Immersive Garden / RESN / Jesko / Norris tier.*
*Principle: keep the molten-foundry FILM world; add the studio INTERACTION layer. No plasticky WebGL — the "wow" is reactive cursor + kinetic type + fluid transitions, exactly how those studios feel even on their 2D pages.*

---

## 1. DESIGN SYSTEM (tokens)

### Color — "Foundry Noir" (reuse styles.css `:root`)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0807` | ground (warm near-black) |
| `--ink` | `#f4ece2` | primary text |
| `--ink-dim` | `#9a8e80` | secondary text |
| `--molten` / `--molten-hot` | `#ff6a1a` / `#ffb24a` | fire beats (acts 0–2), accent word |
| `--bronze` / `--bronze-lite` | `#a6792e` / `#c99a4e` | precision/trust beats (acts 3–7) |
| `--line` / `--line-strong` | rgba ink .10 / .22 | hairlines |
| **NEW** `--paper` | `#efe7da` | the ONE inverted beat (contrast pacing) |
| **NEW** `--paper-ink` | `#1a120c` | text on paper |

**Rule:** 90% warm-neutral, 10% accent. Never two accents in one beat. Fire→bronze tells the pour→part story.

### Type
- **Cormorant** (display, italic accent = signature) · **Montserrat** (body) · **Space Mono** (labels/index/data).
- Scale (clamp): `display-hero 56→184` · `display 36→86` · `kinetic 42→150` · `h3 24→34` · `lead 17→22` · `body 15→17` · `label 11 (.22em, caps)`.
- Tabular figures on all data (specs, years, capacity): `font-variant-numeric: tabular-nums`.
- **Kill** the per-scene orange eyebrows → bronze/ink. Orange is for the *accent word* only.

### Spacing (8px base)
- Section vertical: `clamp(120px, 22vh, 280px)`. Container `max 1280–1440`. Gutter `clamp(20px,6vw,110px)`.
- Body measure 60–68ch. Mobile gutter 20–24px.

### Motion tokens (one global rhythm)
- Enter `0.9–1.2s` `power3.out` · micro `0.2–0.3s` · spring `{stiffness 120, damping 18}`.
- Stagger `45ms`. Exit = 65% of enter. Scrub for scroll-linked; never scrub + toggle together.
- Honor `prefers-reduced-motion` everywhere (static, readable).

### Effects
- Grain (5% opacity), edge vignette, ember drift, plate molten-grade, 1px hairlines, elevation `0 40px 90px rgba(0,0,0,.6)`.

---

## 2. COMPONENT SYSTEM
| Component | Spec | Ref |
|---|---|---|
| **Reactive cursor** | dot + ring, `mix-blend:difference`; grows + shows label (`view`/`drag`/`hold`) over interactives; hidden on touch | RESN/AT/IG |
| **Magnetic CTA** | element follows cursor within ~40px, spring back; the `.mag` button + nav links | IG/Refokus |
| **SplitText heading** | per-word mask-rise on enter; accent word color-shifts on scroll-through | Norris |
| **Chapter index** | fixed side rail `01—08`, active beat highlighted, click-to-jump, scroll progress | IG/Refokus |
| **Horizontal gallery** | pinned drag-strip for the 4 verticals (About); cursor `drag`; parallax per plate | AT/IG |
| **Hover-lift card** | specs/cert/value cards lift 4px + corner-ticks ignite molten on hover | Refokus |
| **Page transition** | molten curtain wipe between index ⇄ About ⇄ Enquire (shared-element feel) | RESN |
| **Sticky CTA dock** | persistent "Request a Quote" after hero (exists) | — |
| **Marquee / ISO seal / contact cluster** | trust finale (exists) | — |

---

## 3. LAYOUT STRUCTURE
- **z-layers:** `0` film/stage · `1` vignette+floor · `2` grain · `10` content/acts · `40` chrome (nav, cursor, chapter-index, CTA) · `100` page-transition curtain.
- **Scroll:** index = scroll-scrubbed film (keep); About = Lenis smooth + pinned moments.
- **Grid:** index acts alternate center / bottom-left / asymmetric (not all-center). About alternates L/R + one horizontal pin + one paper beat.

---

## 4. SECTION-BY-SECTION

### INDEX (the film) — keep engine, raise craft
| Act | Now | Redesign |
|---|---|---|
| 0 Hero | centered, eyebrow+H1+valueprop | SplitText "We are *precision*"; eyebrow bronze; add **3 hard numbers** strip (40+ yrs · 500 MT · ISO 9001) so a buyer qualifies you in 5s |
| 1 Pour→part | center | keep; accent word molten→bronze on scroll |
| 2–3 Apart/back | bottom | add a real **materials fact card** (CI·DI·SiMo·ADI + tolerances) |
| 4 Orbit | bottom-left chips | keep; chips → hover-lift |
| 5 Bridge | center | keep |
| 6 Detail | **spec sheet (restored ✓)** | tabular figures; hover-lift rows |
| 7 Finale | marquee + ISO + **contact cluster (✓)** | real phone/WhatsApp; logomark; magnetic CTA |
| chrome | nav (Overview/About/Enquire ✓) | + **chapter index rail** + reactive cursor |

### ABOUT ("Forged over forty years")
| Section | Now | Redesign |
|---|---|---|
| Hero | "Part of something bigger" + faint pour | keep (strongest) + SplitText |
| Verticals | 4 hero chapters (incl. hotel) | **demote** → one **horizontal drag-strip** "Part of the Raysons Group"; lead with Shell Cast foundry proof |
| Timeline | 10 dense milestones | **4 era beats**, headline-only, expand-on-interact; ghost numeral morphs 1987→2027 |
| Mission/Vision | dark | **the inverted PAPER beat** (contrast pacing) |
| Values/Certs | grid | hover-lift cards + corner-ticks |
| People | placeholder | **real shop-floor photo** (graded) |
| Finale | marquee + ISO + contact | real phone/WhatsApp + magnetic CTA + page-transition out |

---

## 5. BUILD ORDER
1. **P0 (done):** real nav · spec sheet · phone/WhatsApp/email cluster · eyebrow contrast.
2. **Assets (user):** real phone · team/facility photo · logomark · image-to-video building clips.
3. **P2 — the "feel" layer:** reactive cursor + magnetic + SplitText + spring. *(biggest perceived jump)*
4. **P3 — signature:** horizontal verticals gallery · chapter index · page transitions · paper beat.

## 6. NON-NEGOTIABLES (what makes it read $100k)
- One brand system across index + About (✓ now).
- Real assets, not placeholders or AI-only footage.
- Motion that *means* something (cause→effect), one global rhythm.
- Reactive cursor + magnetic + split-text = the studio signature.
- Huge spacing, tabular data, italic-Cormorant accent as the brand voice.
