# Raysons Foundry Scrollytelling — Script & Build Plan

The story of one casting, from fire to finished part, told as the user scrolls.
A single pinned 3D scene; the camera and action are driven by scroll progress.
(Same proven technique as the hub realm + the pour prototype.)

---

## The narrative — 6 beats

| # | Beat | What the user sees | Scroll action | On-screen copy |
|---|------|--------------------|---------------|----------------|
| 1 | **The Melt** | Glowing furnace, heat haze, embers rising | Camera holds, embers drift | "1450°C. Where every part begins." |
| 2 | **Tapping the Ladle** | Molten iron fills the ladle; it glows white-hot | Camera pushes in on the ladle | "Spectrometer-verified. Every heat." |
| 3 | **Fire on Rails** | Crane carries the ladle along the rail track across the floor | Camera tracks alongside the moving ladle | "Shaped by fire." |
| 4 | **The Pour** | Ladle tilts; molten stream pours into the sand mould; sparks + steam | Camera at the mould; pour scrubs with scroll | "The moment of the casting." |
| 5 | **The Casting is Born** | Mould dissolves/lifts to reveal the finished hub (the high-fidelity model) | Cross-dissolve mould → finished part rotating | "Finished by craft." |
| 6 | **Trusted Worldwide** | The part hands off to the globe (Italy/UK/Japan/USA arcs) | Pull back; transition into the existing globe section | "Trusted by the world's most demanding industries." |

This ties the whole site together: pour (this scene) → finished hub (hub realm) → global reach (globe). One continuous story.

---

## Assets

**I build (no input needed):**
- Molten stream, sparks, steam, glow, heat haze — particle/shader work (prototype already proven)
- Furnace, rail track, crane/trolley, sand mould — modeled from your reference photos (simple industrial forms)
- The finished hub — already built (high-fidelity), reused in beat 5
- All camera choreography, scroll rig, copy reveals, post-processing

**You supply (when convenient — I start with placeholders):**
- Walkthrough video of the real floor (for accurate layout)
- Ladle scan/photo + rough sizes (for an accurate ladle; placeholder used until then)
- The pour clip ✅ (already have — used as color/timing reference)

---

## Technical plan (additive — does not touch existing V1)
- New `foundryScene.js` + a tall pinned section (same fixed-stage pattern as the hub realm, already proven across devices)
- Reuses the renderer/bloom pipeline from `pourDemo.js`
- Scroll progress 0→1 drives a camera spline through the 6 beats + triggers the pour
- Mobile: fewer particles, simpler camera, same story; reduced-motion: static key frames with the copy
- Degrades to the existing frame-sequence hero if WebGL is unavailable

---

## Build order
1. Scene skeleton + pinned section + camera spline (placeholder boxes)  → see the beats flow
2. Drop in the polished pour (beat 4) + furnace/embers (beat 1)
3. Ladle + rails + crane (beats 2–3)
4. Finished-hub reveal (beat 5) + globe handoff (beat 6)
5. Copy reveals, polish, mobile + fallbacks
6. Swap in your real ladle scan + tune to the walkthrough video

Each step is screenshot-verified before moving on.
