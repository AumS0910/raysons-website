# Raysons Scroll-Cinema — Awwwards SOTD Redesign PRD

**Status:** Directional PRD / redesign roadmap  
**Product:** Raysons Shell Cast immersive foundry experience  
**Target:** A $50k-quality, award-submission-ready cinematic web experience  
**Primary references:** Lando Norris, Jesko Jets, Hubtown  
**Secondary references:** Active Theory, Refokus, Immersive Garden  
**Explicitly excluded as primary inspiration:** Apple, Stripe, Linear, Framer, SaaS landing pages

## 1. Product thesis

This is not a marketing page with a 3D hero. It is a short interactive film about transformation:

> Fire becomes form. Form earns trust. Trust travels.

The visitor should feel like they have moved through a foundry floor, entered the material, witnessed precision being applied, and finally understood where the part matters. Every camera move, transition, typographic reveal, sound cue, and proof point must serve that emotional progression.

The experience should be judged as a film first and a website second. Navigation and enquiry are the release mechanism at the end of the film, not the reason the film exists.

## 2. Current-state audit

### What is already strong

- A working eight-beat scroll film with frame-scrubbed video clips.
- IndexedDB frame caching, poster-first loading, mobile capture sizing, and a no-WebGL readable fallback.
- A Three.js atmosphere layer with furnace light, embers, bloom, fog, a casting model, and globe handoff.
- Lenis + ScrollTrigger mapping, reduced-motion support, magnetic CTA, split-text headings, chapter HUD, progress rail, and sound toggle.
- A coherent “Foundry Noir” system: warm near-black, molten orange, bronze precision notes, serif display type, mono instrumentation.

### Main weaknesses to solve

1. The film currently contains eight named beats but only a few genuinely distinct dramatic moments. Several beats read as product copy laid over footage rather than cause-and-effect scenes.
2. The camera path and the frame-sequence path are authored in separate systems. That creates a risk that the camera says “approach” while the footage says “assemble” or “orbit.”
3. The opening auto-play is visually alive, but it reduces the feeling that the visitor has initiated the story. It should be a restrained pre-roll that hands agency to the first scroll.
4. The `snap` behavior can make an authored camera move feel like a carousel. Snap only at intentional chapter gates, never through the pour or reveal.
5. The visual language has too many persistent instruments: nav, HUD, rail, CTA dock, sound, vignette, grain, grade, and copy. They need an editorial hierarchy so the work can breathe.
6. The emotional temperature moves from fire to cool precision, but the transition is currently mostly a color grade. It needs a material transition: heat haze and liquid energy becoming machined edge, measurement, and negative space.
7. The commercial proof arrives late and in generic cards/chips. The proof needs to appear as evidence embedded in the story: heat, tolerance, material, certification, and end-use.

## 3. Experience architecture

### Four acts

| Act | Emotional job | Visual language | Visitor question |
|---|---|---|---|
| I. Ignition | Awe and curiosity | black, heat, scale, pressure | What is this place? |
| II. Transformation | Tension and release | movement, pour, collapse, emergence | How does fire become a part? |
| III. Proof | Confidence and intimacy | cool light, orbit, section, measurement | Why should I trust it? |
| IV. Reach | Meaning and invitation | open space, globe, restrained warmth | Where can this go next? |

The side HUD should show these four acts only. The eight beats can remain in the scroll logic, but the visitor should perceive a four-part film—not eight slides.

## 4. Scene-by-scene redesign

### Scene 01 — The threshold / “We are precision.”

**Current role:** Centered hero over the opening pour, with value proposition and stats.  
**Risk:** It asks for brand comprehension before the visitor has felt the environment.

- Narrative: begin with a dark, almost silent threshold. Reveal one small hot point, then the foundry’s scale. Keep “We are precision.” as the title card, but delay the explanatory line until the visitor scrolls.
- Camera: slow 12–18° lateral drift and a very slight forward creep. Avoid a full hero zoom; reserve speed for the pour.
- Scroll: 0–8% is a hold, 8–14% is ignition. The first wheel movement should trigger a measurable change in light, sound, and camera—not just text movement.
- Typography: one dominant line, maximum one supporting label. Move the four-stat strip out of the first viewport; introduce “40+ years / 0.5–500 kg / ISO 9001” as a later proof beat.
- Transition: a hard ember bloom into the next scene, with the same hot particle field carrying across the cut.

### Scene 02 — Heat / “1450°C”

**Current role:** Large temperature number and “From pour to finished part.”  
**Risk:** Temperature is a claim, but currently behaves like decoration.

- Narrative: make the number a live instrument tied to furnace intensity. The visitor sees heat rise before the type arrives.
- Camera: push toward the source of heat on a shallow diagonal; let the camera lag the scroll by a few frames for mass.
- Scroll: give this scene a long, quiet runway. The number should hold for reading before the pour accelerates.
- Typography: scale “1450°C” as the visual peak of Act I. Use mono for the unit/readout and serif for the emotional line; do not put both at maximum scale simultaneously.
- Transition: the molten stream crosses frame and becomes the wipe into the next composition.

### Scene 03 — Pour / “From pour to finished part.”

**Current role:** Primary pour clip, followed by the forge clip.  
**Risk:** The strongest footage is split across an overlong early section, so the dramatic moment may feel slow rather than inevitable.

- Narrative: this is the film’s first climax. The copy should disappear during the actual pour and return only after impact.
- Camera: track the ladle, then cut directionally to the mould. The camera must rotate around the action only once; repeated orbiting weakens the moment.
- Scroll: reserve 22–28% of total scroll for this sequence. Use no snap and no competing CTA.
- Motion hierarchy: stream and camera first; steam/embers second; type third; UI chrome off.
- Transition: impact flash, one-frame white/amber exposure, then a deliberate drop into near silence as the mould settles.

### Scene 04 — Emergence / “Built to come apart. And go back better.”

**Current role:** Deconstruct then reverse the same clip for reassembly.  
**Risk:** Reversing footage is efficient but can read as a playback trick rather than a designed transformation.

- Narrative: replace the “apart / better” copy sequence with a clear reveal: shell, core, void, wall thickness, finished geometry.
- Camera: move from macro interior to a clean three-quarter view. Use depth-of-field and negative space instead of another fast rotation.
- Scroll: one continuous reveal with a 15% settle zone after the casting locks together.
- Transition: mould particles dissolve into machined dust or measurement points; the material language changes from organic fire to controlled geometry.

### Scene 05 — The object / “Every side.”

**Current role:** Orbiting finished part with material/end-use chips.  
**Risk:** The orbit is beautiful but generic unless the visitor understands what is being inspected.

- Narrative: call this inspection, not presentation. Show why each face, port, and surface matters.
- Camera: one 240–300° orbit with a deliberate pause on the functional face. Use a tiny parallax offset from pointer movement only on desktop.
- Scroll: slower than the pour, with 3 inspection holds instead of continuous movement.
- Typography: place “Every side.” as a small editorial caption; let the part own the frame. Move industry chips to the following scene.
- Transition: a selected edge line travels into the bore/detail scene.

### Scene 06 — The application / “The part inside the machine.”

**Current role:** Bridge to industries and customer/end-use copy.  
**Risk:** Named customers and sectors arrive as a text list without a human or machine consequence.

- Narrative: show the part disappearing into its context. Use three short application flashes—excavator arm, pump head, concrete system—then return to the part.
- Camera: pull back from the casting into a restrained technical environment or silhouettes. Do not build three unrelated 3D worlds.
- Scroll: a short connective beat, approximately 8–10% of journey; it should feel like the film opening outward.
- Typography: one line of application copy and one proof label. Keep logos/names subordinate to the visual consequence.
- Transition: cut through the part’s bore into the measurement chamber.

### Scene 07 — Proof / “±0.3 mm”

**Current role:** Macro/bore frame sequence and dense spec sheet.  
**Risk:** This is the most commercially important scene but currently competes with a large number and a full data grid.

- Narrative: make precision tactile. The visitor should feel the surface, edge, tolerance, and inspection—not only read a specification.
- Camera: a controlled push through the bore, then lock the camera while measurement overlays resolve. The lock is important: precision feels stable.
- Scroll: slow scrub through 3–4 states: raw casting, machined surface, gauge/measurement, signed-off result.
- Typography: “±0.3 mm” enters after the measurement visual, not before. Use tabular mono for dimensions and a serif line for confidence.
- Transition: measurement line becomes a route line that leaves the object and travels to the globe.

### Scene 08 — Reach / “Your drawing, our fire.”

**Current role:** Globe finale, marquee, trust row, contact cluster.  
**Risk:** The finale currently turns into a conventional conversion footer after a cinematic journey.

- Narrative: show the part’s journey into the world, then make the enquiry feel like the next scene—not a sales interruption.
- Camera: pull back farther than expected, let the object become a point in a larger system, then return to a quiet contact lockup.
- Scroll: remove the progress rail and HUD in the final 7–10%. This unclutters the emotional landing.
- Typography: “Your drawing, our fire.” should be the final title. Put capacity, certification, and contact details beneath it as a quiet colophon.
- Transition: the CTA should not pop in. It should emerge from the route line with a 300–500ms magnetic response and a clear focus state.

## 5. Motion and interaction direction

### Camera choreography

Author one master timeline containing camera position, look-at, focal length, lighting temperature, depth-of-field, clip state, text state, and sound intensity. Do not maintain separate “camera truth” and “video truth” timelines.

Use this rhythm:

- hold → approach → impact → settle → inspect → open out → lock → release
- fast motion only at transformation points
- no more than one major camera idea per scene
- every scene transition preserves one visual element: ember, stream, edge, measurement line, or route arc

### Motion hierarchy

1. Primary: material transformation or camera movement.
2. Secondary: light, steam, particles, and environment.
3. Tertiary: typography and evidence labels.
4. Chrome: HUD, rail, cursor, CTA.

If all four layers animate at once, reduce the chrome first. The film must remain legible at a glance and while scrolling quickly.

### Type system

- Display: Cormorant or an equivalent high-contrast editorial serif, used for emotional statements.
- Utility: Montserrat or a neutral grotesk for readable body copy.
- Instrument: Space Mono for temperature, tolerance, chapter, and technical metadata.
- Hero display: `clamp(56px, 10vw, 168px)`; never let supporting copy exceed 46–52ch.
- Body: 16–18px minimum on mobile, 1.5–1.65 line-height.
- One accent word per scene. Molten orange belongs to heat; bronze belongs to precision.

### Sound

The existing generated rumble is a good scaffold but not enough for award-level authorship. Add a small designed sound system: furnace low-end, ladle/rail movement, pour impact, mould collapse, machining hum, measurement click, and a final air/room tone. Default muted, explicit sound toggle, no surprise autoplay, and a reduced-motion/reduced-sensory equivalent.

## 6. Technical and quality requirements

### Performance

- LCP target under 2.5s on a mid-range mobile connection with the poster visible immediately.
- 60fps target on desktop during camera motion; 45fps minimum on modern mobile during heavy scenes.
- Frame capture must be adaptive by device class; do not cache multiple full-resolution variants unnecessarily.
- Use AVIF/WebP posters, declared dimensions, and progressive loading for noncritical scenes.
- Pause render loops and video capture when the tab is hidden.
- Keep the idle scene below 5% CPU where possible.
- Maintain a framed degraded mode: poster + readable chapters + direct enquiry.

### Accessibility

- `prefers-reduced-motion` shows static keyframes and readable scene copy, not a blank page.
- All controls have visible labels, keyboard focus, and minimum 44px touch targets.
- Do not rely on the custom cursor or hover for meaning.
- Ensure text over film meets WCAG AA; use scene-specific scrims rather than global text shadows as the only solution.
- Provide a “skip film / view details” route for users who need direct information.
- Preserve zoom, logical headings, alt text, and screen-reader order.

### Responsive behavior

- Desktop: full camera choreography, pointer-reactive layer, 16:9 or wide compositions.
- Tablet: reduce orbit amplitude and particle density; preserve narrative beats.
- Mobile: vertical keyframe compositions, shorter runway, no hover cursor, no tiny HUD. Keep the pour, emergence, proof, and reach beats intact.
- Test at 375, 768, 1024, and 1440px widths, plus landscape mobile.

## 7. Product requirements

### P0 — must ship

- A four-act narrative map with eight authored beats.
- Master timeline for camera, footage, lighting, copy, and sound.
- Re-authored pour → emergence transition.
- Stable mobile and reduced-motion versions.
- Direct “skip film / request a quote” escape route.
- Real proof assets: facility imagery, certification, materials, tolerance, and end-use evidence.
- Analytics for chapter completion, skip-film usage, WebGL fallback, sound toggle, and enquiry click.

### P1 — high-value polish

- Chapter rail that behaves as a film index, not a progress widget.
- Measurement overlays and edge-to-route handoffs.
- Reactive cursor with semantic labels (`inspect`, `hold`, `enter`) and touch equivalent.
- Designed sound pass.
- Shareable deep links to the proof and enquiry states.

### P2 — signature features

- Pointer-driven micro-parallax on the casting.
- Optional drag/inspect mode after the film completes.
- A silent “director’s cut” replay control.
- WebGL scene transitions between the main film and About/Enquire pages.

## 8. Delivery roadmap

### Phase 0 — editorial lock, 1 week

Write the final film script, shot list, scene duration map, voice of copy, proof inventory, and sound brief. Produce a storyboard with six key frames and one complete transition.

**Exit criteria:** every scene has one emotional job, one camera idea, one material transition, and one proof point.

### Phase 1 — cinematic prototype, 2 weeks

Implement the four-act timeline, the revised pour/emergence handoff, scene holds, camera easing, and the mobile story path using current assets.

**Exit criteria:** a reviewer can scroll from top to bottom without describing any scene as a generic section or slideshow.

### Phase 2 — asset and environment production, 3–4 weeks

Capture/grade real floor footage, replace placeholder geometry, refine the mould/casting reveal, create measurement overlays, and build the application context shots.

**Exit criteria:** at least 80% of visual proof comes from Raysons-specific material or footage.

### Phase 3 — interaction, sound, and responsive pass, 2 weeks

Implement the soundscape, cursor states, chapter navigation, skip route, deep links, mobile choreography, and reduced-motion art direction.

**Exit criteria:** keyboard, touch, reduced-motion, WebGL fallback, and 375px layouts are all usable.

### Phase 4 — award polish and QA, 1–2 weeks

Tune timing frame by frame, remove redundant chrome, check type contrast, run device/performance audits, and prepare the submission case study with process frames and a 30–45 second capture.

**Exit criteria:** no blocking loading state, no dead ends, no visible debug UI, and a complete award-ready case study.

## 9. $50,000 production allocation

| Workstream | Allocation |
|---|---:|
| Creative direction, narrative, storyboards | $6,000 |
| UX/UI art direction and type/motion system | $5,000 |
| 3D environment, casting, shaders, camera choreography | $13,000 |
| Real footage, photography, edit, and color grade | $8,000 |
| Front-end engineering, scroll engine, responsive/fallback modes | $10,000 |
| Sound design and mix | $3,000 |
| Performance, accessibility, device QA | $3,000 |
| Award case study, launch, and contingency | $2,000 |
| **Total** | **$50,000** |

This budget buys authored content and refinement, not just more effects. Awwwards-level quality will be limited more by weak source material and unresolved timing than by the number of shaders.

## 10. Measurement and award-readiness

### Experience metrics

- 70%+ of desktop visitors reach the proof scene.
- 45%+ reach the finale or use the skip route.
- 5%+ click enquiry/request a quote from qualified traffic.
- <2.5s poster/LCP target on mobile.
- <0.1 CLS on the initial viewport.
- No critical accessibility failures in keyboard, reduced-motion, or fallback review.

### Qualitative review questions

- Can a first-time visitor describe the journey in one sentence?
- Does the pour feel like a climax rather than a video background?
- Does precision feel physically different from heat?
- Does the finale feel earned before the enquiry appears?
- Is there one image or transition a reviewer would remember the next day?

### Submission package

- Live URL with a short loading path and no broken deep links.
- 30–45 second silent capture of the full journey.
- Six storyboard/keyframe stills.
- Case-study page showing narrative, camera, material, and performance decisions.
- Accessibility and fallback notes.

## 11. Final recommendation

Do not add more sections yet. The next highest-leverage move is to make the existing film feel authored: simplify the act structure, align camera and footage on one timeline, give the pour a true climax, make the precision scene tactile, and delay conversion until the visitor has reached the world beyond the part.

That is the path from “technically impressive scrollyteller” to “memorable interactive film.”
