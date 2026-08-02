# Raysons Scroll-Cinema
## Interactive Studio Production Blueprint

**Project:** Raysons Shell Cast / Raysons Group  
**Document type:** Pre-production creative, experience, technical-art, and delivery blueprint  
**Status:** Directional production document — no implementation included  
**Prepared for:** Solo frontend engineer using free tools, client-owned references, and AI-assisted asset generation  
**Target:** Awwwards-caliber immersive cinematic website  
**Production constraint:** Zero-cost asset production. No paid 3D assets, paid libraries, paid stock footage, paid plugins, freelancers, or marketplace purchases are assumed.  
**Content constraint:** All existing website text is frozen. No copy, claims, headings, labels, navigation text, metadata, contact details, or certifications may be changed without explicit client approval.  
**Primary references:** Lando Norris, Jesko Jets, Hubtown  
**Secondary references:** Active Theory, Refokus, Dogstudio, Immersive Garden  
**Excluded as primary references:** Apple, Stripe, Linear, Framer, SaaS landing pages

---

## 0. Executive creative direction

### Non-negotiable change-control rule

This document is a proposal only. It must not be treated as permission to edit the current website.

Before any implementation or asset replacement:

1. Preserve a clean snapshot of the current website.
2. Make a separate preview branch or duplicate.
3. Do not change any existing text unless the client explicitly approves the exact replacement.
4. Do not remove, rename, reorder, or rewrite current headings, copy, labels, navigation items, metadata, contact details, certifications, or claims.
5. Do not replace existing assets in production without showing the proposed replacement first.
6. Ask for confirmation before changing behavior, scene order, camera movement, scroll pacing, transitions, UI chrome, or loading behavior.
7. Keep every approved change in a simple change log with: original, proposed, reason, and approval status.

The default implementation posture is **visual enhancement around the existing content**, not content rewriting.

### The experience in one sentence

Raysons is a scroll-driven film in which heat becomes a casting, the casting earns trust through inspection, and that trust travels into the machines and markets of the world.

### The central creative idea

> **Fire becomes form. Form earns trust. Trust travels.**

The visitor is not browsing a company profile. They are entering a foundry, witnessing a transformation, examining the resulting object, and deciding whether to begin a technical conversation.

The site should feel like a short interactive industrial film with an enquiry mechanism—not a marketing page with a 3D background.

### Desired emotional progression

| Act | Emotional state | Visitor feeling |
|---|---|---|
| I. Ignition | Curiosity → awe | “I have entered a real place.” |
| II. Transformation | Tension → release | “I watched raw heat become something precise.” |
| III. Proof | Intimacy → confidence | “This part is controlled, inspected, and dependable.” |
| IV. Reach | Perspective → invitation | “This capability could belong inside my machine.” |

### Creative rules

1. Every scene gets one emotional job.
2. Every camera movement must reveal, approach, inspect, or release.
3. Every transition must preserve a physical idea from the previous scene.
4. Fire is not a permanent decoration; it is an opening state that gives way to precision.
5. UI chrome must disappear when the film reaches a climax.
6. Proof should appear as evidence inside the world, not only as text cards.
7. One major motion idea per frame is stronger than five simultaneous effects.
8. The final enquiry should feel like the next scene in the film.
9. Real Raysons-specific material outranks generic visual spectacle.
10. Mobile and reduced-motion versions are alternate edits of the same film, not afterthoughts.

### Zero-cost production rule

The client cannot purchase 3D assets or paid creative libraries. Every final asset must come from one of these sources:

- Existing Raysons files already present in the repository.
- New material supplied by the client: phone footage, photographs, scans, CAD/drawings, measurements, certificates, and factory references.
- Procedural geometry, particles, materials, and shaders created in the project.
- Free/open-source tools and assets with a license compatible with the final website.
- AI-generated visual material created with an available free plan or existing access, used only where it does not fabricate factual Raysons evidence.
- Photogrammetry or image-to-geometry generated from client-owned photos.

Do not design a shot that depends on an asset the client cannot legally or financially obtain. If a shot needs a complex asset, redesign the shot around silhouettes, procedural forms, client footage, or a generated image/video plate.

### Zero-cost budget model

| Production need | Paid plan | Zero-cost replacement |
|---|---:|---|
| Hero 3D model | $0 | Existing model, client CAD/photos, Blender cleanup, camera-facing simplification |
| Industrial environment | $0 | Blender primitives, procedural geometry, silhouettes, client phone references |
| Materials | $0 | GLSL noise, hand-authored maps, client photographs, free/open-license references |
| VFX | $0 | Three.js particles, shader masks, extracted client-owned footage, AI-generated reference plates |
| Video | $0 | Existing clips, client phone footage, free editing/conversion tools |
| Sound | $0 | Client recordings, generated synthesis, verified free/open-license audio |
| AI visual generation | $0 | Existing/free-plan access to Google Flow or an equivalent tool, used selectively |
| HDRI/reference lighting | $0 | Free/open-license source or custom phone panorama |
| 3D/graphics software | $0 | Blender, Three.js, GLSL, GIMP/Krita/Photopea, FFmpeg |

The cost target is zero. Time is the primary production currency, so the blueprint deliberately favors reusable procedural systems and short, high-impact shots over asset-heavy environments.

For the short, non-boring version of this document, see [FREE-ASSET-DOWNLOAD-LIST.md](FREE-ASSET-DOWNLOAD-LIST.md). It contains the first eight Poly Haven downloads, what each is for, what not to download, the folder structure, client material request, and approval gates.

### Current implementation assessment

The existing project has a strong technical base: scroll-scrubbed frame sequences, IndexedDB caching, Three.js atmosphere, camera keyframes, bloom, fog, responsive handling, a no-WebGL fallback, reduced-motion behavior, split text, sound toggle, progress rail, and chapter HUD.

The current limitation is not a lack of technology. It is that the systems still read as several impressive mechanisms rather than one fully authored production. The redesign must therefore prioritize story architecture, material continuity, real asset specificity, and timing discipline before adding more features.

### What must not change

- The foundry subject and fire-to-part transformation.
- The finished hydraulic casting as the hero object.
- The warm near-black “Foundry Noir” foundation.
- The serif / grotesk / mono typographic contrast.
- The scroll as the primary storytelling input.
- The existing poster-first and degraded-mode philosophy.
- The emphasis on manufacturing proof rather than empty brand language.
- The global handoff from finished part to worldwide reach.

### What must change

- Convert the eight technical beats into a clearly perceived four-act film.
- Author camera, video, lighting, particles, type, and sound on one timeline.
- Make the pour a true climax, not merely the first clip in the sequence.
- Replace procedural crossfades with material transitions.
- Make the precision scene tactile and inspectable.
- Remove or dim competing chrome during emotional peaks.
- Bring real people, surfaces, tools, and factory evidence into the visual language.
- Design the mobile edit intentionally.

---

# Phase 1 — Experience audit

## 1.1 What already works

### Technical foundation

- The scroll engine already maps progress to a continuous journey rather than separate page loads.
- Video frames are captured and painted from memory after initial decode, which is the right direction for responsive scrubbing.
- IndexedDB caching creates a repeat-visit advantage and reduces repeated decode work.
- Poster-first loading prevents an empty first viewport.
- The project already anticipates mobile, reduced motion, resize behavior, URL-bar changes, and WebGL failure.
- Three.js provides an atmospheric world around the frame-sequence footage instead of treating video as a simple rectangle.

### Visual foundation

- The near-black, molten, bronze, and cool precision palette has a clear narrative potential.
- Cormorant / Montserrat / Space Mono creates an editorial-industrial voice.
- The finished part, bore, globe, and pour give the film an understandable visual spine.
- The large numeric peaks—1450°C and ±0.3 mm—are memorable anchors.

### Interaction foundation

- Scroll is the correct primary interaction for the story.
- Split-text reveals provide a more authored entrance than a generic fade.
- The cursor, magnetic CTA, sound control, rail, and HUD are useful when treated as instruments.
- The existing fallback route proves the project can remain informative when WebGL is unavailable.

## 1.2 What should never become generic

- Do not turn the foundry into a dark SaaS dashboard.
- Do not replace industrial evidence with abstract gradients.
- Do not let the globe become a generic “we serve the world” graphic.
- Do not expose every metric at once.
- Do not make every chapter use centered hero typography.
- Do not keep orange active in every scene; fire should have scarcity.
- Do not overuse 3D camera spins. Rotation must have an inspection reason.
- Do not make the website dependent on hover.

## 1.3 What currently feels disconnected

### Camera versus footage

The frame-sequence film and the Three.js camera path have separate concepts of progression. The user can perceive the video changing while the surrounding camera is making a different claim. The production solution is one master timeline with named shot states.

### Atmospheric grade versus narrative temperature

The grade shifts from orange to cool blue and back, but the emotional reason for the change is not always visible. The visual language should change because the material changes: liquid heat becomes solid geometry, then geometry becomes inspected evidence.

### Proof versus spectacle

Specs, chips, stats, and customer/end-use claims are useful, but they currently behave like overlay content. Proof needs to be embedded as a scene event: a measurement lock, a surface close-up, an operator sign-off, or a part entering its machine context.

### Film chrome versus film moments

The HUD, rail, CTA dock, sound control, grain, vignette, and copy can all coexist, but they should not all be visible during the pour, reveal, or final release. The film needs silence in the interface as well as in the sound.

## 1.4 Where immersion breaks

- When chapter changes feel like card swaps instead of a continuous camera move.
- When text arrives with a claim before the visual has earned it.
- When reverse playback is visibly used as a shortcut for transformation.
- When the interaction snaps the user out of an authored camera move.
- When the final conversion layer appears before the visitor reaches the narrative resolution.
- When generic chips and labels compete with the casting itself.
- When loading, cache miss, or frame capture produces a perceptible hold without a story-aware state.

## 1.5 Where storytelling stops

The story currently explains that Raysons casts, machines, inspects, and serves industries. It does not yet fully dramatize:

- the human decision inside the process;
- the risk being controlled at each stage;
- why this particular part matters inside a machine;
- what “precision” looks and feels like at the surface;
- the handoff from a foundry object to a buyer’s technical decision.

## 1.6 Signature moments to develop

1. **The first ignition:** a nearly black world reacts to the first scroll with a small, credible hot point.
2. **The 1450°C hold:** the number appears only after the heat is felt.
3. **The pour impact:** the scroll controls a true release of energy, then the interface disappears.
4. **The mould opening:** the object is born through a physical material transformation.
5. **The inspection lock:** the camera stops moving while a tolerance resolves over the actual surface.
6. **The bore-to-world handoff:** the interior geometry becomes a route line into the globe.
7. **The final quiet:** the CTA emerges after the film has earned the question “what could we make together?”

---

# Phase 2 — Experience architecture

## 2.1 Continuous chapter map

The implementation may retain eight technical segments, but the visitor should perceive four acts and eight shots.

| Shot | Chapter | Act | Purpose | Emotional goal | Narrative objective | User takeaway |
|---|---|---|---|---|---|---|
| 01 | The Threshold | Ignition | Establish place and tone | Curiosity | Enter a real industrial world | “This is a foundry, not a template.” |
| 02 | Heat | Ignition | Establish the force and standard | Awe | Show the origin condition | “Every part begins under control.” |
| 03 | The Pour | Transformation | Deliver the first climax | Tension → release | Turn heat into an irreversible event | “The part is being made now.” |
| 04 | Emergence | Transformation | Show the object becoming itself | Wonder | Reveal geometry, voids, and form | “The casting is designed, not accidental.” |
| 05 | Inspection | Proof | Turn spectacle into trust | Intimacy | Show surfaces, faces, and dimensional control | “Every side has a reason.” |
| 06 | Application | Proof | Give the object consequence | Recognition | Place the part inside machine contexts | “This small object carries a larger system.” |
| 07 | Measurement | Proof | Make quality tangible | Confidence | Resolve tolerance and sign-off | “Precision is visible and repeatable.” |
| 08 | Reach | Reach | Open the film outward | Perspective → invitation | Connect part, company, and world | “The next part could begin with my drawing.” |

## 2.2 Global transition language

| From | To | Physical element that carries across |
|---|---|---|
| Threshold | Heat | A hot point becomes furnace glow |
| Heat | Pour | Furnace glow becomes the stream highlight |
| Pour | Emergence | Stream impact becomes a white/amber exposure and settling particulate |
| Emergence | Inspection | Mould dust becomes machining dust; rough geometry gains a controlled edge light |
| Inspection | Application | Selected edge line becomes a structural line inside a machine silhouette |
| Application | Measurement | Bore or port becomes a measurement aperture |
| Measurement | Reach | Measurement line becomes a route arc |
| Reach | Enquiry | Route arc resolves into the final CTA underline or contact marker |

## 2.3 Scroll pacing model

Use percentages as editorial targets, not rigid implementation instructions.

| Shot | Scroll range | Pace | Behavior |
|---|---:|---|---|
| 01 | 0–10% | Hold / slow | Establish the world before asking for movement |
| 02 | 10–24% | Slow build | Heat and temperature rise gradually |
| 03 | 24–50% | Variable / longest | Free scrub through the pour; no snap |
| 04 | 50–63% | Slow release | Mould opens and object settles |
| 05 | 63–73% | Measured | Three inspection holds around the object |
| 06 | 73–81% | Brief connective | World expands around the part |
| 07 | 81–92% | Slow lock | Measurement and proof resolve |
| 08 | 92–100% | Quiet | Globe and enquiry landing; chrome reduces |

Do not use global snapping as the default film rhythm. Snap only to deliberate chapter gates after the visitor has left the free-scrub pour and only when the snap does not fight wheel, touch, or keyboard input.

---

# Phase 3 — Production sheets

## CHAPTER 01 — THE THRESHOLD

### 1. Environment

A near-black foundry threshold with almost no readable geometry at first. The space should feel larger than the viewport: a high ceiling, a distant furnace opening, a floor plane with faint industrial wear, and barely visible structural members. Avoid showing the whole factory immediately. The first frame is a place being discovered.

### 2. Camera

Begin nearly static. On the first meaningful scroll, introduce a 12–18° lateral drift and a very slow forward movement. The camera should feel heavy, as if mounted on a rail or dolly. Do not begin with an aggressive zoom or orbit.

### 3. Lighting

Near-black ambient base, with one distant warm source and a very faint cool rim separating a silhouette from the background. The first hot source should be small and credible. No full orange wash yet.

### 4. Atmosphere

Sparse dust, very low-density fog, subtle air movement, and a nearly inaudible room tone. Particles must be slow enough to reveal scale. Avoid obvious floating sparkles.

### 5. Hero Object

Not the full casting yet. The hero object is the threshold itself: a furnace mouth, ladle silhouette, or single ember that suggests the process before explaining it.

### 6. Secondary Props

Rail silhouette, overhead crane geometry, distant mould forms, floor markings, suspended chain, and one partially readable foundry tool. These are scale cues, not content cards.

### 7. Interactive Elements

- Scroll initiates the reveal.
- Cursor subtly bends dust direction on desktop only.
- No hover-dependent content.
- Sound remains opt-in and begins with room tone if enabled.
- The first scroll should affect light and camera simultaneously.

### 8. Typography

Use one restrained eyebrow such as `THROUGH THE FOUNDRY`, then the title `We are precision.` after the world is visible. The title should rise from below with a soft mask reveal. Keep supporting copy out of the initial frame or reduce it to one short line.

### 9. Transition

A single ember moves toward frame center. Its glow expands until it becomes the furnace light in Chapter 02. The title exits upward while the hot point remains spatially continuous.

---

## CHAPTER 02 — HEAT

### 1. Environment

The furnace zone is now readable: ladle, opening, floor, heat shimmer, and a suggestion of the rail system. Keep the background mostly dark so the viewer understands that light is being generated inside the world.

### 2. Camera

Push diagonally toward the heat source. The camera should lag the scroll by a small amount to create mass. End close enough to make the temperature feel physical but not so close that the scene loses context.

### 3. Lighting

Warm furnace key, white-hot center, amber spill on floor and steel, very restrained red bounce. The source should pulse subtly with the molten state, not flicker like a looping fire texture.

### 4. Atmosphere

Heat haze near the furnace, rising embers, thin smoke near the ceiling, and a soft bloom threshold around the hottest values. The haze should respond to intensity and remain quieter on mobile.

### 5. Hero Object

The molten charge or ladle opening. The viewer should understand what is about to move.

### 6. Secondary Props

Furnace frame, rails, overhead support, refractory surfaces, warning markings, hooks, and a distant operator silhouette if real footage is available.

### 7. Interactive Elements

- Scroll controls the heat build.
- A slow scroll reveals more detail; a fast scroll should not skip the visual anchor completely.
- Temperature readout updates with the state of the heat.
- The HUD may remain, but the rail should become visually quieter.

### 8. Typography

Make `1450°C` the chapter’s single typographic peak. Introduce the number after the visual heat is established. Use Space Mono for the instrument value and the serif for a smaller emotional phrase such as `Where every part begins.`

### 9. Transition

The camera follows the ladle leaving the furnace. The hot edge of the ladle becomes the first readable line of the pour composition. Do not cut to a new background; let the rail direction carry the eye.

---

## CHAPTER 03 — THE POUR

### 1. Environment

The pour floor, mould, ladle, crane path, and steam zone. The scene must have a clear directional axis: the viewer knows where the ladle came from and where the molten stream is going.

### 2. Camera

Track alongside the ladle briefly, then move decisively to the mould. Use one directional handoff, not a series of decorative orbits. The final camera position should frame stream, mould opening, and impact zone together.

### 3. Lighting

This is the hottest and brightest scene in the film. Use white-hot core, orange edges, high-contrast spill on the mould, and a strong but controlled exposure bloom on impact. The rest of the screen should remain dark enough for the stream to own the frame.

### 4. Atmosphere

Steam, sparks, heat distortion, particulate burst on impact, and a brief density change when the stream meets the mould. Every atmospheric layer should have a cause.

### 5. Hero Object

The molten stream entering the mould. The stream is the protagonist; the ladle is the vehicle and the mould is the destination.

### 6. Secondary Props

Ladle, crane/trolley, rails, sand mould, refractory floor, clamps, hooks, steam vents, safety silhouettes, and a small amount of surrounding foundry structure.

### 7. Interactive Elements

- Scroll is fully free-scrubbed here.
- No snap through the pour.
- Scroll velocity can influence blur or secondary particulate, never the core stream position.
- Cursor effects are disabled or nearly invisible during impact.
- Sound, if enabled, rises with movement and drops immediately after impact.

### 8. Typography

Remove almost all copy during the actual pour. Bring back one short line after the stream settles: `The moment of the casting.` The number and proof UI should not compete with this climax.

### 9. Transition

At impact, use a one-frame amber/white exposure bloom. Then drop brightness and sound into a controlled settling period. The sparks and steam become the particulate field around the opening mould in Chapter 04.

---

## CHAPTER 04 — EMERGENCE

### 1. Environment

A quieter mould-opening chamber. The scene begins with dust and a dark form, then reveals the finished casting. The visual space should shift from chaotic foundry energy to a controlled reveal stage without feeling like a new webpage.

### 2. Camera

Move from a slightly obscured macro view to a stable three-quarter view. The camera should stop moving for the reveal lock. A short, measured pull-back after the object resolves gives it importance.

### 3. Lighting

Warm edge light at first, then a cooler neutral key reveals the geometry. Keep a small residual ember tone in the background so the object still belongs to the same story.

### 4. Atmosphere

Settling sand, fine dust, residual steam, and a subtle volumetric shaft. No constant sparks. The scene should feel quieter and heavier.

### 5. Hero Object

The finished hydraulic casting emerging from the mould. This is the first moment where the part is allowed to exist without being in motion.

### 6. Secondary Props

Mould halves, core, sand fragments, clamps, inspection light, floor residue, and a faint measurement stencil.

### 7. Interactive Elements

- Scroll reveals mould separation and object emergence.
- A brief hold zone lets the viewer understand the form.
- Optional pointer parallax is restricted to a few degrees.
- No drag mode yet; preserve the authored film.

### 8. Typography

Use a short line such as `From heat to form.` or `The casting is born.` The title should appear only after the object settles. Use bronze rather than orange for the precision transition.

### 9. Transition

Sand residue dissolves into a fine machining dust. A selected edge of the casting catches a thin light line, which becomes the inspection guide in Chapter 05.

---

## CHAPTER 05 — INSPECTION

### 1. Environment

A controlled inspection environment derived from the foundry, not a generic showroom. The floor and background simplify. The object has room to breathe. A dark neutral field lets edges and ports become legible.

### 2. Camera

Execute one deliberate 240–300° orbit with three inspection holds: functional face, side geometry, and rear/port detail. The orbit should be slow enough to imply inspection rather than display.

### 3. Lighting

Cool neutral key, narrow edge highlights, a faint bronze rim that ties the object back to fire, and a controlled specular sweep across machined surfaces. Avoid blue “technology” lighting everywhere.

### 4. Atmosphere

Almost no fog. A few floating machining particles or dust motes are enough. Precision should be communicated through clarity and stillness.

### 5. Hero Object

The finished casting and its functional faces.

### 6. Secondary Props

Caliper silhouette, inspection lamp, datum markings, machining table, gauge outline, and a restrained technical drawing overlay.

### 7. Interactive Elements

- Scroll drives the orbit.
- At each inspection hold, the selected edge or port may highlight.
- Pointer parallax can slightly shift the background and highlight, not the object’s physical geometry.
- Avoid hover-only chips. Use tap/click for touch.

### 8. Typography

Use `Every side has a reason.` as the emotional line. Technical labels should be small and peripheral. Replace large chip groups with three concise inspection callouts tied to visible features.

### 9. Transition

One selected edge line travels into the silhouette of a machine component. The casting does not vanish; it becomes smaller within a larger system.

---

## CHAPTER 06 — APPLICATION

### 1. Environment

A restrained industrial context showing the finished part inside a larger machine system. Use one coherent context system—machine silhouettes, component diagrams, or a real graded application image—not three unrelated environments.

### 2. Camera

Pull back from the casting into the machine context. The object should first be identifiable, then become a critical but not oversized part of the assembly.

### 3. Lighting

Cool industrial ambient with a focused highlight on the inserted part. The part retains the bronze edge tone so the viewer does not lose it.

### 4. Atmosphere

Low particulate, subtle hydraulic mist or mechanical vibration only if supported by the chosen context. Keep this scene more graphic and connective than spectacular.

### 5. Hero Object

The casting in context—inside an excavator arm, pump head, concrete delivery system, or another verified application.

### 6. Secondary Props

Machine housing, fasteners, hydraulic line silhouettes, technical labels, and a small route marker.

### 7. Interactive Elements

- Scroll controls the pull-back.
- A tap/click can reveal one verified application note.
- The user must be able to continue without exploring every detail.
- No forced horizontal scroll on mobile.

### 8. Typography

One application statement, for example `The part inside the machine.` Supporting proof should be short, specific, and verified. Avoid a wall of customer names.

### 9. Transition

The camera enters through the bore or port. The interior negative space becomes the aperture of the measurement scene.

---

## CHAPTER 07 — MEASUREMENT

### 1. Environment

A dark measurement chamber made from the same physical world: the casting surface, inspection light, and a clean technical plane. The scene should feel stable, deliberate, and quiet.

### 2. Camera

Push through the bore, then lock the camera. The lock is essential: precision should feel controlled, not constantly animated. Use a very slow focus adjustment rather than a moving camera during the proof reveal.

### 3. Lighting

Neutral white inspection light with a precise edge highlight. Use warm color only as a faint inherited accent. The contrast should reveal surface and geometry.

### 4. Atmosphere

No fog by default. If any atmosphere is used, make it a nearly invisible depth cue. Add subtle scanning particles or measurement points only when they explain a measurement event.

### 5. Hero Object

The bore, machined surface, or dimensional feature being inspected.

### 6. Secondary Props

Gauge overlay, caliper, measurement line, datum markers, signed inspection note, material label, and a restrained spec table.

### 7. Interactive Elements

- Scroll passes through four states: raw casting, machined surface, measurement, sign-off.
- At the sign-off state, the camera holds.
- Users can tap a visible measurement marker for a short explanation.
- Do not hide the content behind hover.

### 8. Typography

Reveal `±0.3 mm` after the measurement visual appears. Use large serif or display type for the emotional statement and tabular mono for the actual data. Keep the full spec sheet secondary and progressively disclosed.

### 9. Transition

The measurement line extends beyond the object and exits the frame as a route line. The route line becomes the first arc of the global reach scene.

---

## CHAPTER 08 — REACH

### 1. Environment

A dark open field with the globe and route arcs. The world should feel larger than a conventional globe widget: restrained atmosphere, a distant horizon, and the casting’s route becoming part of a network.

### 2. Camera

Pull back farther than expected. Let the part reduce to a point or marker in a larger system, then return to a calm final composition for the enquiry. Avoid an endless globe rotation.

### 3. Lighting

Cool global ambient, fine bronze route lines, and one warm final anchor around the CTA/contact cluster. The ending should be warm but not another fire scene.

### 4. Atmosphere

Very subtle grain, sparse stars or dust only if the globe needs depth, and controlled bloom around route points. Remove the heavy foundry fog.

### 5. Hero Object

The route and the final phrase: `Your drawing, our fire.`

### 6. Secondary Props

Verified regions, certification mark, capacity range, contact details, company mark, and a quiet material/casting thumbnail if needed.

### 7. Interactive Elements

- Route points can be tapped/clicked for factual region information.
- CTA uses a restrained magnetic response on desktop and clear press feedback on touch.
- The progress rail and chapter HUD fade out in the final 7–10%.
- Provide direct enquiry and skip-film access.

### 8. Typography

Final title should be large but quiet. Use a colophon-like information block below it: location, capacity, certification, email, phone, and enquiry action. Avoid a conventional footer wall.

### 9. Transition

The route line resolves into the CTA underline or contact marker. The final frame should hold long enough to be read and shared. Exiting to About or Enquire should use the same ember-black transition language.

---

# Phase 4 — Complete asset inventory

## 4.1 Asset production conventions

### Recommended web formats

- **Hero posters:** AVIF with WebP fallback, 1600–2400px long edge.
- **Frame sequences:** WebP or AVIF where browser support and decode testing permit; keep a JPEG fallback for capture compatibility.
- **3D runtime models:** GLB/glTF with Draco or Meshopt compression where supported.
- **Textures:** KTX2/Basis for runtime; PNG/TIFF/EXR only in the source pipeline.
- **Video:** H.264 MP4 fallback plus WebM/AV1 only after device testing; short clips should have poster frames.
- **Audio:** compressed AAC/Opus with explicit user control.
- **Data/overlays:** SVG for linework and labels; avoid rasterizing technical proof unnecessarily.

### Budget principles

These are approximate browser budgets for a cinematic page, not film-render budgets. The hero casting should receive the highest fidelity. Backgrounds should be cheap, instanced, and hidden when not needed.

## 4.2 A. Existing assets

| Asset | Purpose | Chapter | Approx. polygon budget | Texture target | Format | Animation? | Difficulty | Purchase? |
|---|---|---|---:|---|---|---|---|---|
| `valve/pour.mp4` | Existing pour reference/sequence | 03 | N/A | 1080p source / compressed derivatives | MP4 + poster | Scrub | Existing | No |
| `valve/forge.mp4` | Existing casting/forge motion | 03–04 | N/A | 1080p source / derivatives | MP4 | Scrub | Existing | No |
| `valve/deconstruct.mp4` | Existing component separation | 04 | N/A | 1080p source / derivatives | MP4 | Scrub/re-edit | Existing | No |
| `valve/orbit.mp4` | Existing object orbit | 05 | N/A | 1080p source / derivatives | MP4 | Scrub | Existing | No |
| `valve/bridge.mp4` | Existing bridge/application transition | 06 | N/A | 1080p source / derivatives | MP4 | Scrub | Existing | No |
| `valve/macro.mp4` | Existing bore/macro detail | 07 | N/A | 1080p source / derivatives | MP4 | Scrub/re-edit | Existing | No |
| `valve/pour-poster.jpg` | First-paint poster and fallback | 01–03 | N/A | 1600–2400px long edge | JPG → AVIF/WebP | No | Existing | No |
| `valve/about-film.mp4` | About-page film material | About / optional bridge | N/A | 1080p source | MP4 | Optional | Existing | No |
| `valve/hero.jpg` | Hero still / editorial fallback | 01 | N/A | 2000px long edge | JPG → AVIF | No | Existing | No |
| `valve/exploded.jpg` | Casting/exploded still | 04–05 | N/A | 2000px long edge | JPG → AVIF | No | Existing | No |
| `valve/lift-poster.jpg` | Lift/reveal poster | 04 | N/A | 1600px long edge | JPG → AVIF | No | Existing | No |
| `valve/era-1987-poster.jpg` | Timeline support | About | N/A | 1200px long edge | JPG → WebP | No | Existing | No |
| `valve/era-2005-poster.jpg` | Timeline support | About | N/A | 1200px long edge | JPG → WebP | No | Existing | No |
| `valve/era-2021-poster.jpg` | Timeline support | About | N/A | 1200px long edge | JPG → WebP | No | Existing | No |
| `valve/era-2027-poster.jpg` | Timeline support | About | N/A | 1200px long edge | JPG → WebP | No | Existing | No |
| `frames2/*` | Existing frame-sequence material | 03–07 | N/A | Adaptive capture | JPG/WebP | Scroll-scrub | Existing | No |
| `bore-frames/*` | Existing bore sequence | 07 | N/A | Adaptive capture | JPG/WebP | Scroll-scrub | Existing | No |
| `assembly-frames2/*` | Existing assembly sequence | 04 | N/A | Adaptive capture | JPG/WebP | Scroll-scrub | Existing | No |
| `public/models/6_6_2026.glb` | Existing model source | 04–07 | Audit before use | Audit and rebake | GLB | Optional | Existing | No |
| `images/*poster*` | Existing industry/group posters | 06 / About | N/A | 1600px long edge | JPG/PNG → WebP | No | Existing | No |

### Existing asset decision

Keep the current assets as reference and fallback material. Do not assume every current clip belongs in the final edit. The production process should reselect frames by narrative function, not preserve footage only because it already exists.

## 4.3 B. Assets to create

| Asset | Purpose | Chapter | Approx. polygon budget | Texture target | Format | Animation required | Difficulty | Purchase? |
|---|---|---|---:|---|---|---|---|---|
| Foundry threshold environment | Establish scale and place | 01 | 20k–50k | 2K modular materials | GLB | Camera-only | Medium | No; build from modular kit |
| Furnace mouth and refractory lining | Heat source | 02 | 8k–20k | 2K–4K PBR | GLB | Light/heat only | Medium | Build from primitives and client reference |
| Ladle and pouring lip | Hero process object | 02–03 | 15k–35k | 4K PBR hero, 2K fallback | GLB | Tilt/track | High | Prefer custom |
| Rail and trolley system | Directional camera cue | 02–03 | 10k–25k | 2K PBR | GLB | Translation | Medium | Modular base possible |
| Sand mould and core | Transformation object | 03–04 | 20k–45k | 4K roughness/displacement | GLB | Separate/lift/dissolve | High | Prefer custom |
| Molten material shader | Visual protagonist | 02–03 | N/A | Procedural + mask | GLSL/runtime shader | Flow/emission | High | No |
| Heat haze field | Atmospheric cause | 02–03 | N/A | Procedural | Shader/particle | Distortion | Medium | No |
| Steam/impact burst | Pour climax | 03–04 | N/A | Sprite atlas / procedural | GPU particles | Burst | Medium | Generate procedurally or extract client footage |
| Finished casting hero mesh | Main object | 04–07 | 40k–90k desktop, 20k–40k mobile | 4K hero, 2K mobile | GLB | Reveal/orbit | High | Custom scan/artist |
| Casting interior/bore detail | Measurement journey | 07 | 15k–35k | 4K hero | GLB | Camera push | High | Custom |
| Machining surface material | Precision proof | 05–07 | N/A | 4K PBR / procedural | KTX2/SBSAR | None | Medium | Build procedurally or photograph real surfaces |
| Measurement overlay system | Proof language | 07 | N/A | SVG/HTML | SVG + DOM | Resolve/track | Medium | No |
| Inspection lamp/gauge props | Human proof | 05–07 | 2k–12k each | 2K PBR | GLB | Minimal | Low–Medium | Model from photographs or use SVG silhouettes |
| Machine context silhouette | Application consequence | 06 | 15k–40k | 2K PBR | GLB | Assembly pull-back | Medium | Build from primitives and verified references |
| Route line and globe data | Reach | 08 | N/A | Vector/procedural | SVG/WebGL | Arc motion | Medium | No |
| Real foundry stills | Authenticity and fallback | 01–07 | N/A | 2400px long edge | AVIF/WebP | No | Medium | Capture with client phone/camera |
| Operator hands and tool close-ups | Human scale | 02–07 | N/A | 4K video/stills | MP4/AVIF | Scrub/none | Medium | Capture with client phone/camera |
| Certification and inspection artifacts | Credibility | 07–08 | N/A | 1600px scans | AVIF/SVG | Reveal | Low | Capture/prepare |
| Scene-specific poster frames | Loading/fallback | All | N/A | 1600–2400px | AVIF/WebP | No | Low | No |
| Mobile-specific crops | Narrative preservation | All | N/A | 900–1400px | AVIF/WebP | No | Medium | No |

## 4.4 C. Free sources and zero-cost creation methods

No paid 3D assets or paid libraries are allowed in this production plan. The following sources are permitted only when their current license allows commercial website use and the exact asset license is recorded in the project inventory.

| Need | Zero-cost method | Output | Guidance |
|---|---|---|---|
| HDRI lighting | Free/open-license HDRI from Poly Haven or a client-shot 360/phone panorama | HDRI/EXR/JPG | Use only license-compatible files; a simple custom dark studio setup may be better than a recognizable stock HDRI. |
| Steel, sand, brick, and oxidation materials | Procedural shaders, hand-authored noise, client photographs, or free/open-license material references | GLSL/KTX2/PNG | Build a small unified material family instead of collecting many unrelated textures. |
| Industrial props | Model low-detail versions directly from photographs and measurements | GLB/glTF | Hooks, rails, clamps, gauges, and floor hardware do not need marketplace-quality geometry. |
| Hero casting | Use existing GLB/CAD/reference images; rebuild or simplify with free Blender/Three.js tools | GLB/glTF | The hero must be based on real Raysons geometry, not an invented AI object. |
| Steam and smoke | Procedural particles, CSS/WebGL noise, or client-shot footage with background removal | Shader/PNG/WebP/video | Prefer generated particles for runtime; use video only for a distinctive real event. |
| Machine context | Simplified silhouettes and diagrammatic geometry built from primitives | GLB/SVG/WebGL | A convincing silhouette is safer and cheaper than a detailed generic machine asset. |
| Sound | Client-recorded phone audio, free/open-license libraries, and generated synthesis | WAV → Opus/AAC | Record furnace room tone, chains, tools, and impact references when possible. Verify every license. |
| Route/globe | Procedural sphere, SVG paths, and verified geographic coordinates | WebGL/SVG/data | No external globe asset is required. |
| Poster frames | Extract from existing footage or render from the project scene | AVIF/WebP/JPG | Every chapter should have a designed fallback poster. |

### Allowed free tool categories

- Blender for modeling, UVs, baking, animation, and geometry cleanup.
- Krita, GIMP, Photopea, or client-owned image tools for texture and compositing work.
- Godot, Blender, or browser/WebGL experiments for particle and shader references.
- Three.js and GLSL for procedural runtime geometry, materials, particles, and line effects.
- FFmpeg or equivalent free tooling for video extraction, compression, and poster creation.
- Google Flow or another available AI video/image tool for visual ideation and generated atmospheric plates, subject to its current plan and output license.
- Phone camera and client-provided photographs for real evidence and photogrammetry.

### Zero-cost sourcing rule

Do not include Envato, CGTrader, TurboSquid, paid Sketchfab assets, paid Substance libraries, paid stock sound, paid freelancers, or paid plugins in the final production dependency list. Free/open resources may be used only after license verification.

## 4.5 D. Assets that can be generated with AI

AI is appropriate for exploration, placeholder plates, texture ideation, and mood frames. It should not replace authenticated Raysons evidence.

| Asset | AI suitability | Use | Restriction |
|---|---|---|---|
| Moodboards and lighting frames | High | Explore tone and shot composition | Treat as pre-production, not final proof |
| Abstract heat/ember textures | High | Shader masks and atmospheric reference | Verify tileability and performance |
| Background industrial silhouettes | Medium–High | Early layout and nonliteral depth layers | Do not imply they are Raysons facilities |
| Steam/smoke variations | Medium | Reference, masks, sprite concepts | Clean artifacts before use |
| Route/globe visual studies | High | Composition and transition exploration | Use real geographic data for final facts |
| Material roughness concepts | Medium | Starting points for Blender/GLSL procedural materials | Artist/developer must validate physical plausibility |
| Hero casting model | Low for final | Concept exploration only | Use a real CAD/scan/custom artist for final geometry |
| Operators, certifications, factory claims | Not appropriate | None | Do not fabricate evidence, people, or credentials |

## 4.6 E. Assets requiring specialized creation

| Asset | Why focused work is required | Minimum deliverable |
|---|---|---|
| Hydraulic casting hero | Silhouette, ports, machining surfaces, and camera-close topology must hold up | Clean high/low mesh, UVs, PBR textures, GLB, mobile LOD |
| Sand mould/core reveal | The reveal is a signature moment and must deform/dissolve convincingly | Separate meshes, masks, animation-ready topology, fallback stills |
| Ladle and lip | Pour geometry and molten contact must be believable | Accurate model, pivot setup, scale reference, animation notes |
| Furnace/rail environment | Generic assets would weaken authenticity | Modular kit, baked details, low-poly runtime variants |
| Machine integration context | The part must appear functionally seated | Simplified assembly, hero cutaway, interaction-safe geometry |
| Material library | Casting, machined steel, refractory sand, and oxidation need a unified grade | SBSAR/source maps, runtime KTX2 derivatives |
| Hero transitions | Object continuity across mould, inspection, and globe must be authored | Shot-specific animation exports and camera notes |

### Specialized creation brief

For this zero-cost version, no professional artist is assumed. If the client later provides a volunteer, collaborator, or existing internal artist, give them reference photography, physical dimensions, CAD/drawing information where available, desired camera lenses, browser polygon targets, and a list of exact hero frames. Do not ask an artist to “make it cinematic” without shot references.

---

# Phase 5 — Technical art direction

## 5.1 Runtime vocabulary

| Technique | Use in this project | Why |
|---|---|---|
| Static mesh | Furnace, rails, mould, props, casting base | Stable geometry with predictable browser cost |
| Skinned mesh | Only if a crane/cloth/operator action truly needs deformation | Avoid unnecessary rig complexity |
| Particle system | Embers, dust, steam, impact, measurement points | Efficient layered atmosphere and cause/effect |
| Shader | Molten material, heat haze, route line, dissolve masks | Better control and lower asset weight for procedural behavior |
| Video texture | Real pour or factory footage where temporal detail matters | Preserves photographic authenticity and complex motion |
| HDRI | Reflection and base lighting during asset production | Speeds look development; runtime may use baked/controlled lights |
| Volumetric lighting | Furnace shafts, brief steam/impact moments | Gives depth, but must be budgeted carefully on mobile |
| Decal | Floor markings, measurement datum, certification marks | Adds specificity without heavy geometry |
| Instancing | Embers, bolts, repeated hooks, floor details | Keeps repeated geometry affordable |
| Post-processing | Global grade, bloom, vignette, grain, DOF | Provides filmic finish when applied with restraint |
| Bloom | Molten core, furnace, impact, route points | Defines energy hierarchy; do not bloom all highlights |
| SSAO | Casting/mould contact and industrial props | Helps grounding in dark scenes |
| DOF | Threshold, emergence, macro inspection | Directs attention; reduce or remove on low-power devices |
| Fog | Threshold, heat, pour, reach | Establishes scale and transitions temperature |
| Lens effects | Minimal flare or exposure response at pour impact | Use as event, not decoration |
| Custom shader | Molten flow, heat distortion, dissolve, measurement scan | These are signature moments worth custom work |

## 5.2 Scene-by-scene technical matrix

| Chapter | Static mesh | Particles | Shader | Video texture | HDRI | Volumetric | Decal | Instancing | Post / bloom / SSAO / DOF / fog |
|---|---|---|---|---|---|---|---|---|---|
| 01 Threshold | Threshold kit, rails, furnace silhouette | Sparse dust | Dithered darkness / subtle dust | Optional real plate | Development only | Very light | Floor markings | Dust/bolts | Low bloom, light fog, restrained DOF |
| 02 Heat | Furnace, ladle, trolley | Embers, heat haze | Emission and distortion | Optional furnace plate | Development only | Furnace shaft | Warning/heat marks | Embers | Bloom, SSAO, haze, moderate DOF |
| 03 Pour | Ladle, mould, rail | Stream sparks, steam, impact burst | Molten flow, contact glow | Strong candidate | Development only | Brief impact volume | Mould/floor marks | Sparks | High event bloom, motion blur only if stable, fog |
| 04 Emergence | Mould halves, core, casting | Sand dust, settling steam | Dissolve/transition mask | Optional reveal plate | Development only | Short light shaft | Datum marks | Sand fragments | Moderate bloom, SSAO, DOF, low fog |
| 05 Inspection | Casting, lamp, gauge | Minimal dust | Edge sweep / material response | Optional macro plate | Controlled reflections | None | Inspection lines | Small hardware | Low bloom, strong SSAO, selective DOF |
| 06 Application | Machine context, casting | Minimal mist | Context highlight / cutaway mask | Optional real application | Optional | None or very light | Technical labels | Fasteners | Low bloom, SSAO, no heavy fog |
| 07 Measurement | Casting interior, gauge props | Scan points | Measurement scan / tolerance overlay | Bore sequence optional | No need | None | Datum/measurement decals | Markers | Low bloom, precise DOF, no fog |
| 08 Reach | Globe, route anchors, casting marker | Sparse dust/points | Route arc / globe atmosphere | No | Controlled global reflection | No | Region markers | Route points | Low bloom, grain, no heavy fog |

## 5.3 Performance constraints

- Keep the hero casting under roughly 90k triangles for desktop and provide a 20k–40k mobile LOD.
- Keep background modules aggressively simple; silhouette is more important than hidden topology.
- Prefer instanced particles and shared materials.
- Avoid multiple full-screen post passes simultaneously on mobile.
- Use shader-based heat distortion carefully; do not stack blur, DOF, bloom, and distortion without device testing.
- Destroy or pause unused scene systems when the camera has left them.
- Do not preload every video and every frame sequence at full quality.
- Treat memory as a first-class budget, not only network weight.
- Keep text and critical controls in DOM/HTML rather than drawing them into a canvas.
- Use poster and text fallbacks as authored outputs, not emergency placeholders.

## 5.4 Accessibility and resilience direction

- Respect `prefers-reduced-motion` with static keyframes, no looping particles, and readable chapter content.
- Provide a visible skip-film route.
- Keep keyboard navigation independent of the custom cursor.
- Keep all touch targets at least 44px.
- Do not communicate chapters or proof by color alone.
- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text.
- Preserve zoom and avoid horizontal overflow.
- Provide a meaningful poster and sequential story when WebGL or frame capture fails.
- Make sound opt-in and clearly labeled.

---

# Phase 6 — Cinematic direction / storyboard

## 6.1 Film rhythm

The overall edit should follow:

> **Hold → approach → heat → impact → settle → inspect → lock → release**

The opening should feel slower than the middle. The pour should be the fastest and most physical section. The proof section should deliberately slow down. The ending should feel like air entering the room after pressure has been released.

## 6.2 Shot storyboard

### Shot 01 — Opening frame

- **Opening:** Almost black; one faint hot point.
- **Camera:** Static, then heavy lateral drift.
- **Reveal:** Furnace structure and a distant line of rails.
- **Climax:** First scroll causes the point to ignite.
- **Pause:** Title appears only after the place is felt.
- **Exit:** Ember travels toward furnace glow.

### Shot 02 — Heat frame

- **Opening:** Furnace is now readable, but the centre remains dark.
- **Camera:** Diagonal approach toward the heat.
- **Reveal:** Ladle edge and molten charge.
- **Climax:** Temperature reaches 1450°C.
- **Pause:** The number holds while the heat breathes.
- **Exit:** Ladle moves; camera follows.

### Shot 03 — Pour frame

- **Opening:** Ladle enters from the direction established in Shot 02.
- **Camera:** Short track, then decisive reframe to mould.
- **Reveal:** Stream becomes the dominant line.
- **Climax:** Molten impact, steam, sparks, exposure bloom.
- **Pause:** Sound and brightness fall together.
- **Exit:** Impact particulate settles into mould dust.

### Shot 04 — Emergence frame

- **Opening:** Dust and shadow, no immediate title.
- **Camera:** Macro-to-three-quarter move.
- **Reveal:** Mould halves separate; casting appears.
- **Climax:** Object locks into a stable hero pose.
- **Pause:** Enough time to understand the silhouette.
- **Exit:** An edge highlight becomes an inspection line.

### Shot 05 — Inspection frame

- **Opening:** Stable hero casting under a narrow inspection light.
- **Camera:** Three inspection holds in one restrained orbit.
- **Reveal:** Port, face, wall, and surface.
- **Climax:** One feature is called out because it matters functionally.
- **Pause:** Copy appears after the object has communicated.
- **Exit:** Feature line travels into machine context.

### Shot 06 — Application frame

- **Opening:** Part is still identifiable inside a larger assembly.
- **Camera:** Pull back to show system consequence.
- **Reveal:** Verified machine/application context.
- **Climax:** The part becomes small but visibly essential.
- **Pause:** One factual application statement.
- **Exit:** Camera enters bore/port.

### Shot 07 — Measurement frame

- **Opening:** Inside the object; quiet, clear, technical.
- **Camera:** Push in, then lock.
- **Reveal:** Scan line and measurement state.
- **Climax:** ±0.3 mm or the verified tolerance resolves.
- **Pause:** Sign-off / proof holds.
- **Exit:** Measurement line becomes route line.

### Shot 08 — Reach frame

- **Opening:** Route line enters a dark global field.
- **Camera:** Pull back to perspective, then settle.
- **Reveal:** Regions, certification, capacity, and contact.
- **Climax:** `Your drawing, our fire.`
- **Pause:** CTA and contact colophon remain readable.
- **Exit:** Route line becomes enquiry marker or page transition.

## 6.3 Sound direction

Sound should be a designed layer, not a background loop.

| Cue | Scene | Behavior |
|---|---|---|
| Room tone | 01 | Barely audible, establishes place |
| Furnace sub | 02 | Slowly increases with heat |
| Rail/chain movement | 02–03 | Short directional accents tied to camera/ladle |
| Pour impact | 03 | Single major event, not a constant loop |
| Steam and settling | 03–04 | Drops after impact, creates breath |
| Material/machining hum | 05–07 | Cooler, controlled, rhythmic but sparse |
| Measurement click | 07 | Small confirmation cue at sign-off |
| Air / room tone | 08 | Opens the experience before the CTA |

Sound defaults off, must be user-enabled, and must never be required to understand the film.

---

# Phase 7 — Implementation roadmap

The roadmap is written for production planning only. It does not change the current website.

## Sprint 1 — Editorial lock and golden path

### Assets

- Inventory and grade all existing clips.
- Select hero frames for threshold, heat, pour, emergence, and measurement.
- Confirm actual Raysons proof: temperature, capacity, tolerances, certification, materials, end-use claims.
- Create a capture list for missing real footage.

### Programming

- Define one timeline data model for eight shots/four acts.
- Map existing progress logic to the editorial ranges.
- Define chapter boundaries without implementing new features yet.
- Define fallback states for each shot.

### Shaders

- Define molten, heat haze, dissolve, edge highlight, and route-line shader requirements.
- Produce nonfinal look tests only.

### Animation

- Storyboard the full golden path: threshold → heat → pour → impact → emergence → measurement.
- Set camera positions, look-at points, lenses, and hold durations.

### Sound

- Write a sound brief and list required recordings/stock layers.
- Decide the exact timing of furnace, pour, impact, and measurement cues.

### Optimization

- Establish baseline measurements: LCP, CLS, long tasks, memory, mobile frame rate, cold-cache load.

### Dependencies

- Approved narrative and factual proof.
- Access to real factory footage or permission to capture it.
- Hero model/CAD availability.

**Exit gate:** A complete storyboard exists for one film path; no scene is still a generic “section.”

## Sprint 2 — Hero asset and transition prototype

### Assets

- Clean and simplify the hero casting model using existing geometry, drawings, or client photographs.
- Prepare mould/core/ladle models.
- Capture or select high-quality material references.

### Programming

- Prototype camera/footage synchronization.
- Define camera easing and hold behavior.
- Remove snap behavior from the pour range in the design specification.

### Shaders

- Molten flow and impact glow.
- Heat distortion and settling particulate.
- Mould dissolve/transition mask.

### Animation

- Author pour impact and emergence as a connected transition.
- Make the object settle into the inspection pose.

### Sound

- Rough-cut furnace, rail, pour, and impact timing.

### Optimization

- Test hero model LODs.
- Test frame memory on desktop and mobile.
- Confirm poster and fallback quality at every shot.

### Dependencies

- Hero casting geometry.
- Finalized shot storyboard.
- Browser/device test matrix.

**Exit gate:** The golden path feels like one continuous physical event.

## Sprint 3 — Proof, inspection, and application

### Assets

- Inspection tools, measurement artifacts, real factory stills, operator details, and verified application context.
- Technical drawing/measurement overlays.

### Programming

- Implement inspection holds and measurement states.
- Add progressively disclosed proof callouts.
- Define application interaction that works on touch without hover.

### Shaders

- Edge sweep.
- Measurement scan.
- Controlled surface response.

### Animation

- Three inspection holds.
- Pull-back into machine context.
- Bore-to-measurement transition.

### Sound

- Machining, tool contact, and measurement cues.

### Optimization

- Pause/unload scene systems that are no longer visible.
- Check text DOM performance and avoid unnecessary layout reads.

### Dependencies

- Verified claims and imagery.
- Final tolerance/material data.

**Exit gate:** Precision is shown as an event, not only stated as a number.

## Sprint 4 — Reach, sound, and responsive edit

### Assets

- Globe/route styling.
- Final contact colophon.
- Mobile poster crops and reduced-motion still sequence.

### Programming

- Finalize globe handoff and CTA emergence.
- Add skip-film route and deep links where appropriate.
- Add semantic cursor states and touch equivalents.

### Shaders

- Route arcs and globe atmosphere.
- Final transition grade.

### Animation

- Remove chrome during final release.
- Create mobile-specific camera crops and shorter holds.
- Create reduced-motion keyframe edit.

### Sound

- Final sound mix and opt-in behavior.

### Optimization

- Audio loading and resume behavior.
- Mobile DPR, particle, DOF, bloom, and fog reductions.

### Dependencies

- Final contact details.
- Sound license and final mix.
- Mobile device access.

**Exit gate:** Desktop, mobile, reduced-motion, and fallback versions all tell the same story.

## Sprint 5 — Polish, QA, and submission

### Assets

- Final poster set.
- Social preview image/video.
- Award case-study stills and process diagrams.

### Programming

- Fix edge cases, resize behavior, navigation states, cache misses, and deep links.
- Add analytics for chapter completion, skip-film, fallback, sound, and enquiry.

### Shaders

- Tune thresholds and remove any effect that does not improve the narrative.

### Animation

- Frame-by-frame timing pass.
- Final camera weight, transition continuity, and text hierarchy pass.

### Sound

- Final mix across desktop speakers, headphones, and mobile.

### Optimization

- Run performance audits on cold cache and repeat visit.
- Verify LCP, CLS, memory, long tasks, and stable scroll input.
- Confirm no large chunk or asset is loaded before it is needed.

### Dependencies

- Final content approval.
- Production domain and deployment environment.
- Award submission assets.

**Exit gate:** No debug UI, no dead-end state, no scene that feels like a placeholder, and a complete case study is ready.

---

# Phase 8 — Priority matrix

## Critical

- One coherent four-act narrative.
- Master timeline for camera, footage, lighting, type, and sound.
- Pour-to-emergence signature transition.
- Real hero casting asset or verified high-quality source.
- Readable mobile and reduced-motion edits.
- No-WebGL and cache-miss fallbacks.
- Skip-film route and direct enquiry path.
- Verified factual claims.
- Keyboard, touch, focus, contrast, and screen-reader quality.
- Cold-cache performance and memory testing.

## Important

- Real factory footage and operator details.
- Inspection/measurement event.
- Application context.
- Designed soundscape.
- Semantic cursor states.
- Chapter rail with act-level information.
- Deep links to proof and enquiry.
- Material transitions between every major shot.

## Optional

- Post-film object inspection mode.
- Route point detail overlays.
- Alternate silent replay.
- Richer timeline/About page continuity.
- Additional material/casting variants.

## Luxury

- Fully bespoke digital twin of the facility.
- Multi-user or configurator experience.
- Real-time fluid simulation at full production fidelity.
- Cinematic voiceover.
- AR view of the casting.
- Interactive CAD sectioning beyond what supports the story.

### Priority rule for a solo developer

Do not start an optional or luxury task while any critical transition, asset, fallback, or proof task is unresolved.

---

# Phase 9 — Solo developer optimization

## 9.1 What the solo developer should own

- Narrative structure and shot timing.
- Scroll engine and progressive loading.
- DOM typography and chapter logic.
- Runtime integration and fallback behavior.
- Performance measurement.
- Responsive and accessibility implementation.
- Asset pipeline discipline.
- Art direction decisions and approval of every final frame.

## 9.2 Zero-cost creation order

### First: use what already exists

- Re-edit the existing pour, forge, deconstruct, orbit, bridge, and macro sequences.
- Reuse the existing casting model, posters, frame sequences, and globe logic.
- Extract new posters, masks, and reference frames from current files.

### Second: ask the client for source material

- Phone videos of the foundry floor, ladle, rails, moulds, tools, and inspection.
- Photos of the actual casting from every side.
- CAD, technical drawings, dimensions, certificates, and verified tolerance information.
- Short recordings of furnace, chain, machine, tool, and room sounds.

### Third: build only visible geometry

- Use Blender primitives for the furnace, rails, mould, ladle, gauges, and machine silhouettes.
- Model the hero casting only to the level required by the camera.
- Use procedural materials and shader masks instead of high-resolution texture libraries.
- Use line art, silhouettes, and depth fog for distant objects.

### Fourth: use AI as a production assistant

- Generate mood frames and transition references.
- Generate smoke, steam, heat, and abstract texture concepts.
- Generate image-to-video atmospheric plates only when they do not claim to be real Raysons footage.
- Use AI to explore camera composition, then rebuild the selected idea with controlled runtime assets.

### Free collaboration, only if available

If the team has a friend, student, community collaborator, or internal artist willing to help for free, limit their brief to one high-impact asset or transition. Do not make the production plan depend on unpaid availability.

## 9.3 What to use instead of buying

- Generic industrial props → Blender primitives and client photographs.
- Premium materials → procedural GLSL/Three.js materials and hand-authored image maps.
- Paid HDRIs → free/open-license HDRIs or a client-shot panorama.
- Paid sound libraries → client recordings, generated synthesis, and verified free/open-license audio.
- Base machine components → simplified diagrams, silhouettes, and procedural geometry.
- Paid VFX packs → GPU particles, shader noise, and extracted masks from client-owned footage.

## 9.4 What to generate with AI

- Moodboards.
- Lighting studies.
- Abstract heat/smoke textures.
- Early route/globe compositions.
- Background silhouette concepts.
- Material exploration.

Never use AI to invent:

- Raysons factory footage.
- Operators or personnel.
- Certification documents.
- Customer relationships.
- Manufacturing capabilities.
- Exact engineering geometry.

## 9.5 What to avoid

- Full procedural factory simulation.
- A completely rigged human operator.
- Real-time fluid simulation as the main pour solution.
- Multiple unrelated 3D worlds for every industry.
- Large interactive configurators before the narrative is complete.
- Heavy physics on mobile.
- Full-screen video backgrounds where a few authored frames would communicate more clearly.
- Generic “premium” gradients and perpetual orange bloom.
- Overly long loading screens.

## 9.6 Reuse strategy

Reuse the same hero casting across Chapters 04–07. Reuse the same particulate system with different causes. Reuse the same edge-line language for inspection, measurement, and globe route. Reuse the transition grade tokens. Reuse a small set of camera easing and hold behaviors.

Consistency will make the work feel more expensive than a larger quantity of unrelated assets.

---

# Production handoff requirements

Before implementation begins, the following should exist:

1. Approved narrative script.
2. Eight-shot storyboard.
3. Camera keyframe sheet with position, look-at, lens, and hold duration.
4. Asset inventory with ownership and license status.
5. Hero casting model brief.
6. Factory capture brief.
7. Sound brief.
8. Mobile/reduced-motion storyboard.
9. Performance budget.
10. Accessibility acceptance checklist.
11. Analytics event map.
12. Definition of done for each sprint.

## Definition of done for a chapter

A chapter is not done when its model renders. It is done when:

- the emotional objective is clear;
- the camera move has a reason;
- the atmosphere has a cause;
- the hero object reads at first glance;
- the typography arrives after the visual cue;
- the transition preserves a physical element;
- the mobile edit works;
- the reduced-motion edit works;
- the fallback still communicates the chapter;
- the asset is licensed or owned;
- the frame rate and memory remain within budget.

---

# Awwwards readiness checklist

## Concept

- [ ] The experience can be described in one memorable sentence.
- [ ] The industrial subject feels specific to Raysons.
- [ ] The site is a journey, not a stack of sections.

## Story

- [ ] The pour is a clear climax.
- [ ] The casting reveal is physically connected to the pour.
- [ ] Precision is demonstrated, not only claimed.
- [ ] The ending feels earned before the CTA appears.

## Visual craft

- [ ] Every scene has one dominant focal point.
- [ ] Orange is reserved for heat and transformation.
- [ ] Precision has a different material and lighting language.
- [ ] Transitions preserve edge, dust, stream, line, or route.
- [ ] No generic asset is visible long enough to become the identity.

## Motion

- [ ] Camera movement has weight.
- [ ] Scroll pacing has holds and releases.
- [ ] Snap never fights the authored motion.
- [ ] Motion is interruptible and input remains responsive.
- [ ] Reduced motion is a designed alternate cut.

## Content

- [ ] All numbers and certifications are verified.
- [ ] Real factory evidence is present.
- [ ] Application context is credible.
- [ ] Copy is concise enough to let the image lead.

## Technology

- [ ] Poster-first loading works.
- [ ] Frame/cache behavior works on cold and repeat visits.
- [ ] WebGL fallback is readable.
- [ ] Mobile does not feel like a broken desktop crop.
- [ ] Memory and long-task budgets are measured.

## Usability

- [ ] Skip-film is visible.
- [ ] Enquiry is always reachable without interrupting the film.
- [ ] Keyboard and touch work without cursor tricks.
- [ ] Sound is opt-in.
- [ ] Focus states and contrast are clear.

---

# Final recommendation

The project does not need more chapters, more effects, or more UI. It needs one excellent authored sequence first.

Build the golden path:

> **Threshold → 1450°C → Pour → Impact → Emergence → Measurement Lock**

If that sequence feels like one continuous film, the rest of the experience can be brought up to its level. If that sequence feels like separate demos, adding more 3D, more particles, or more navigation will not create an award-winning result.

The recommended production order is therefore:

1. Lock the story.
2. Lock the hero asset.
3. Lock the camera and material transitions.
4. Add real Raysons evidence.
5. Add sound and responsive edits.
6. Optimize and QA.
7. Prepare the case study and submission capture.

This is the shortest credible route from a technically strong 6.5–6.8 prototype to a memorable 9+ interactive film.

## Free-source notes

- Use [Poly Haven](https://polyhaven.com/) only for free/open-license HDRIs, textures, or models when the specific file license is compatible with the project.
- Use client-owned photographs, phone video, drawings, and existing repository assets as the primary source of truth.
- Use Blender, Three.js, GLSL, FFmpeg, GIMP/Krita/Photopea, and available free AI tools for creation and conversion.
- Do not add a paid marketplace, paid asset library, paid stock library, or paid plugin as a production dependency.
