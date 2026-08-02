# Raysons Scrollyteller — Independent Current Rating

**Audit basis:** local repository implementation, scene markup, scroll engine, Three.js scene, asset inventory, responsive CSS, loading/fallback behavior, and the existing design-system notes.  
**External artifact:** the supplied Claude artifact URL was not publicly retrievable from this environment, so this is an independent code-and-structure rating rather than a claim about that exact hosted preview.

## Current score: 6.8 / 10

This is a strong technical prototype and a promising cinematic direction. It is not yet a 9 because the experience currently feels like several impressive systems placed beside each other rather than one fully authored film.

### Score breakdown

| Dimension | Score | Assessment |
|---|---:|---|
| Concept / originality | 7.5 | Foundry transformation is ownable and more distinctive than a generic industrial site. |
| Art direction | 6.8 | Foundry Noir is coherent, but the film still leans on familiar dark/amber premium-web conventions. |
| Narrative flow | 6.1 | The intended fire → casting → precision → global story is clear, but the eight beats do not yet build enough dramatic cause and effect. |
| Visual impact | 7.2 | Pour, bloom, casting, bore, and globe create strong moments; impact is diluted by persistent overlays and uneven scene specificity. |
| Camera choreography | 6.2 | There is a real camera path, but camera state and frame-sequence state are not yet one authored choreography. |
| Scroll pacing | 6.0 | Long scroll runway and snap logic are technically polished but can make parts feel like a chapter carousel. |
| Transitions | 6.0 | Crossfades, bloom, grades, and reversed clips work, but several transitions feel procedural rather than material. |
| Typography / hierarchy | 7.0 | Strong serif/mono pairing and large peaks; too many labels, HUD elements, and proof blocks compete during key frames. |
| Motion craft | 7.3 | Lenis, SplitText, magnetic CTA, lerped camera, particles, bloom, and reduced-motion support are solid foundations. |
| Content / proof | 5.8 | Claims and specs exist, but there is not enough real Raysons-specific evidence embedded in the story. |
| Usability / accessibility | 6.5 | Fallback and reduced motion are thoughtful; custom cursor, sound, loading, navigation, and dense overlay behavior still need a full audit. |
| Performance / resilience | 6.8 | Poster-first loading, IndexedDB caching, adaptive capture, and fallback are excellent ideas; frame memory and large WebGL bundles remain risks. |

## Why it is not a 9 yet

### 1. The story is described better than it is felt

The current copy explains precision, casting, industries, and tolerances. A 9-level experience makes the visitor feel the transformation before explaining it. The pour should be the undeniable climax; the proof should feel like the consequence of that climax.

### 2. The visual systems are not fully unified

The implementation has a 2D frame-scrub film, a Three.js environment, camera keyframes, atmospheric grades, HUD/progress chrome, animated type, and CTA behavior. Each system is individually useful. The award gap is that they are not yet controlled by one master timeline with one emotional rhythm.

### 3. Some scenes are semantic states, not cinematic scenes

“Built to come apart,” “machined to drawing,” “the part inside the machine,” and “±0.3 mm” are good chapter ideas. They need distinct visual events: mould failure, geometry emergence, insertion into context, and a measurement lock. Without those events, the copy carries too much of the narrative burden.

### 4. Transitions are mainly effects-based

Bloom, fog, grade changes, opacity, and reverse playback create continuity, but award-level transitions preserve a physical element across the cut: stream → edge, ember → dust, bore → route, measurement line → globe arc.

### 5. Proof arrives as interface instead of evidence

Stats, chips, specs, and marquee content are useful, but buyers and jurors will trust the piece more if they see a real floor, real inspection, real material, real operators, real certification context, and real end-use consequence.

## The path from 6.8 to 9+

### Priority 0 — author the film, 9.0 potential

1. Collapse the perceived eight chapters into four acts: Ignition, Transformation, Proof, Reach.
2. Create one master timeline controlling camera, clip/frame state, light temperature, particles, type, sound, and chapter chrome.
3. Re-edit the first 40% so the visitor moves from threshold → heat → pour → impact without competing UI.
4. Make the mould/casting reveal a real transformation rather than a reversed deconstruction clip.
5. Make the precision scene a sequence: raw casting → machined surface → measurement → signed-off result.
6. Remove or dim HUD, rail, CTA, and sound controls whenever the film reaches a climax.

### Priority 1 — make Raysons unmistakable, 8.5–9.3 potential

1. Replace generic/generated-looking environments with graded footage from the real floor wherever possible.
2. Capture the ladle, rail, mould, inspection tools, operators, chips, surfaces, and casting marks as a coherent visual library.
3. Use real certification/tolerance/material proof as visual objects, not only text blocks.
4. Show one or two real application contexts rather than listing industries as chips.
5. Add a restrained custom sound pass: furnace, rail, pour, mould, machining, measurement, release.

### Priority 2 — high-end interaction craft, 9.0–9.5 potential

1. Give the camera mass: acceleration into events, deceleration into inspection, and deliberate holds.
2. Replace global snap behavior with only intentional chapter gates; never snap through the pour or reveal.
3. Make pointer parallax subtle and semantic: inspect, hold, enter—not decorative cursor movement everywhere.
4. Add a completed-film inspect mode so the object can be explored after the authored journey.
5. Use route/deep links for Proof and Enquire states without breaking the film.

### Priority 3 — jury-grade quality control, protects the score

1. Test 375px mobile, tablet, desktop, landscape mobile, Safari, Chrome, and WebGL fallback.
2. Test slow network, cache miss, interrupted frame capture, hidden tab, resize, and iOS URL-bar changes.
3. Verify no text sits on uncontrolled bright footage; use local scrims and readable contrast.
4. Verify keyboard focus, 44px touch targets, sound default-off, reduced motion, skip-film route, and screen-reader structure.
5. Measure LCP, CLS, long tasks, memory, and frame rate during the pour, reveal, and globe scenes.

## Recommended score target by milestone

| Milestone | Likely score | What changes |
|---|---:|---|
| Current implementation | 6.8 | Strong prototype, mixed cinematic authorship |
| Narrative + master timeline pass | 7.8–8.2 | Clear film arc, better pacing, fewer competing systems |
| Real asset + transition pass | 8.3–8.8 | Ownable visual identity and credible proof |
| Sound + responsive + performance pass | 8.7–9.1 | More complete, memorable, and resilient experience |
| Final art direction + jury polish | 9.0–9.5 | Signature transitions, restraint, and case-study readiness |

## What can be changed safely without touching the current website

I can work in a separate preview copy and produce:

- A revised storyboard and shot list.
- A scene timing map with exact scroll ranges.
- A camera/look-at/focal-length choreography sheet.
- A transition bible describing the physical element carried between scenes.
- New copy and typography hierarchy.
- Asset replacement recommendations and a capture brief.
- Sound design brief and cue map.
- Mobile/reduced-motion art direction.
- Performance/accessibility QA scripts.
- A private 9+ prototype for comparison with the current site.

The current production files can remain unchanged until you approve each milestone.

## First implementation sprint I recommend

Do not begin by adding another feature. Build one complete “golden path” first:

**threshold → 1450°C → pour → mould impact → finished casting → measurement lock**

If that 45–60 second journey feels like one authored film, the rest of the website can be brought up to its level. If it does not, adding more scenes, 3D models, or UI will not move the rating meaningfully.

## Bottom line

Claude’s 6.5 is directionally fair for the current state. My independent rating is **6.8/10**, with the caveat that it is based on the local implementation rather than the inaccessible hosted artifact.

The project already has enough technical foundation to reach 9. The limiting factors are narrative authorship, real asset specificity, material transitions, restrained chrome, and final responsive/performance polish—not a lack of libraries or effects.
