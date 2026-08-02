# Raysons Scroll-Cinema — Free Asset Download List

## Read this first

This is a download shortlist, not permission to change the website.

- Existing website text is frozen.
- Do not replace current images, videos, models, or effects yet.
- Download these into a separate reference folder, not directly into production.
- We will review each asset inside the current visual system before deciding whether to use it.
- Do not download every available resolution. Start with 2K/4K for look development and only generate larger files if a specific shot needs them.

## 1. Poly Haven assets to download first

Poly Haven currently lists these assets as free and CC0 on their individual pages. Re-check the license panel at download time and keep a local text file recording the asset name, URL, author, license, and download date.

### A. HDRIs / lighting references

| Priority | Asset | Download | Intended use | Chapter |
|---|---|---|---|---|
| 1 | [Industrial Workshop Foundry](https://polyhaven.com/a/industrial_workshop_foundry) | 4K EXR or 8K tonemapped JPG | Main industrial reflection/light reference; strongest match to the foundry world | 01–05 |
| 1 | [Machine Shop 01](https://polyhaven.com/a/machine_shop_01) | 4K EXR or 8K JPG | Machine shop lighting, metal reflections, inspection mood | 05–07 |
| 1 | [Distribution Board](https://polyhaven.com/a/distribution_board) | 4K EXR or 8K JPG | Rusty industrial interior, dusty warm atmosphere, background reference | 01–03 |
| 2 | [Abandoned Factory Canteen 01](https://polyhaven.com/a/abandoned_factory_canteen_01) | 4K EXR or 8K JPG/backplate | Cool fluorescent industrial interior and quiet transition environment | 04–06 |
| 2 | [Pump Station](https://polyhaven.com/a/pump_station) | 4K EXR or 8K JPG/backplate | Pump/hydraulic visual reference; useful for the application chapter | 06 |
| 2 | [Construction Yard](https://polyhaven.com/a/construction_yard) | 4K EXR or 8K JPG | Outdoor industrial context and hard directional light reference | 06–08 |
| 3 | [Smelting Tower 01](https://polyhaven.com/a/smelting_tower_01) | 4K JPG/backplate first | Historical smelting reference and transition mood; do not use as fake Raysons footage | 01–02 |
| 3 | [Machine Shop 02](https://polyhaven.com/a/machine_shop_02) | 4K EXR or JPG if available | Alternate machine-shop lighting test | 05–07 |
| 3 | [Machine Shop 03](https://polyhaven.com/a/machine_shop_03) | 4K EXR or JPG if available | Alternate workshop lighting test | 05–07 |

### HDRI recommendation

Start with only these three: **Industrial Workshop Foundry**, **Machine Shop 01**, and **Distribution Board**. They are enough to test the visual direction. The other HDRIs are alternates, not required production dependencies.

Use the HDRIs mainly for look development and reflections. The final website should still use controlled Three.js lights and materials so it does not look like an unmodified stock environment.

## 2. Poly Haven textures to download

### A. Industrial metal / rust

| Priority | Asset | Download | Intended use | Chapter |
|---|---|---|---|---|
| 1 | [Rust Coarse 01](https://polyhaven.com/a/rust_coarse_01) | 2K or 4K ZIP | Rusty furnace plates, old steel, background panels | 01–03 |
| 1 | [Rusty Painted Metal](https://polyhaven.com/a/rusty_painted_metal) | 2K or 4K ZIP | Painted corrugated metal, chipped industrial surfaces | 01–03 |
| 1 | [Rusty Metal](https://polyhaven.com/a/rusty_metal) | 2K or 4K ZIP | Shutters, panels, worn props, industrial silhouettes | 01–04 |
| 2 | [Rusty Metal Grid](https://polyhaven.com/a/rusty_metal_grid) | 2K or 4K ZIP | Grates, guards, rails, floor detail, background geometry | 01–03 |
| 2 | [Metal Grate Rusty](https://polyhaven.com/a/metal_grate_rusty) | 2K or 4K ZIP | Raised grate/floor detail and contact shadows | 01–05 |
| 3 | [Rusty Metal 02](https://polyhaven.com/a/rusty_metal_02) | 2K or 4K ZIP | Alternate rust variation; use sparingly | 01–04 |

### B. Concrete / floor / foundry surface

| Priority | Asset | Download | Intended use | Chapter |
|---|---|---|---|---|
| 1 | [Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02) | 2K or 4K ZIP | Foundry floor, camera grounding, subtle roughness | 01–06 |
| 1 | [Rough Concrete](https://polyhaven.com/a/rough_concrete) | 2K or 4K ZIP | Furnace wall, inspection chamber, backdrop | 01–07 |
| 2 | [Garage Floor](https://polyhaven.com/a/garage_floor) | 2K or 4K ZIP if available | Machine/inspection floor alternative | 05–07 |
| 2 | [Concrete Debris](https://polyhaven.com/a/concrete_debris) | 2K or 4K ZIP if available | Mould dust, debris, emergence transition reference | 03–04 |
| 3 | [Red Brick](https://polyhaven.com/a/red_brick) | 2K or 4K ZIP if available | Refractory/background wall variation | 01–03 |

### Texture download rule

For each texture, download only the maps needed:

- Diffuse/base color.
- Roughness.
- Normal GL.
- Ambient occlusion only when it visibly improves contact.
- Displacement only for offline reference or hero close-ups; do not automatically ship it at runtime.

Use the textures as a starting point. Tint, roughness-shift, scale, and blend them so the final environment does not look like a recognizable stock texture collage.

## 3. What not to download from Poly Haven yet

- Do not download large 16K/24K files for the first pass.
- Do not download random decorative props just because they are available.
- Do not use a Poly Haven HDRI as a full background and imply that it is the Raysons factory.
- Do not download models unless we inspect their current license, topology, file format, and actual relevance.
- Do not replace the existing hero casting with a generic model.
- Do not add downloaded assets directly into the current website before approval.

The current Poly Haven models page is not the core of this plan. For this project, the hero casting, mould, ladle, rail, and machine context should be created from existing Raysons files, client references, Blender primitives, and procedural geometry.

## 4. Folder structure for downloads

Create a separate local folder outside production:

```text
free-assets/
  polyhaven/
    hdris/
      industrial-workshop-foundry/
      machine-shop-01/
      distribution-board/
    textures/
      rust-coarse-01/
      rusty-painted-metal/
      rusty-metal/
      rusty-metal-grid/
      metal-grate-rusty/
      concrete-floor-02/
      rough-concrete/
    LICENSES.md
  client-reference/
    phone-video/
    factory-photos/
    casting-photos/
    cad-and-drawings/
    certificates/
  ai-references/
    heat/
    steam/
    foundry-lighting/
    transition-frames/
```

The `LICENSES.md` file should contain:

| Asset | URL | Author | License | Download date | Intended use |
|---|---|---|---|---|---|
| Example | Poly Haven asset URL | Author name | CC0 / verified license | YYYY-MM-DD | Scene/chapter |

## 5. Free tools for the remaining assets

| Need | Free path |
|---|---|
| Hero model cleanup | Blender + existing GLB/CAD/photos |
| Furnace, rails, mould, props | Blender primitives, curves, bevels, and simple modifiers |
| Molten metal | Three.js custom shader and animated noise mask |
| Steam and embers | Three.js instanced particles and sprite-like procedural shapes |
| Heat haze | Full-screen or local distortion shader |
| Texture edits | GIMP, Krita, Photopea, or procedural shader parameters |
| Video extraction | FFmpeg and existing MP4 files |
| Real factory evidence | Client phone camera; shoot short controlled clips and stills |
| AI visual ideation | Google Flow or another already-available/free-plan tool |
| Sound | Client phone recordings, generated synthesis, and verified free/open-license sounds |
| Globe/routes | Existing Three.js globe and procedural SVG/WebGL lines |
| Posters/fallbacks | Extract frames from existing footage or render them from the scene |

## 6. Client material request

To make the free approach feel specific rather than generic, request only these items from the client:

1. 10–20 short phone videos of the foundry floor, furnace, ladle, rails, moulds, machining, and inspection.
2. Front/side/top photos of the real casting.
3. Any CAD, technical drawing, or measurement reference for the casting.
4. Verified process numbers, materials, tolerance, capacity, and certification information.
5. 5–10 short sound recordings: room tone, furnace, chain, trolley, machine, tool contact, and footsteps.
6. Permission to use the factory, equipment, and staff imagery on the website.

No client copy needs to change to supply these assets.

## 7. Approval gates

Before anything enters the website:

- **Gate 1:** Review the downloaded Poly Haven references only in a separate moodboard.
- **Gate 2:** Review a single still/render using the proposed asset.
- **Gate 3:** Review a short private scene prototype.
- **Gate 4:** Approve the asset and scene in writing.
- **Gate 5:** Only then consider integrating it into a preview branch.
- **Gate 6:** Production remains unchanged until the client approves the preview.

## 8. Important text-freeze reminder

The current website copy is locked. No one should rewrite, shorten, “improve,” translate, reorder, or replace any existing website text while working from this list. Any proposed copy change must be shown separately with the original text beside it and must wait for explicit client approval.

## 9. Recommended first download batch

Download only these eight items first:

1. [Industrial Workshop Foundry HDRI](https://polyhaven.com/a/industrial_workshop_foundry)
2. [Machine Shop 01 HDRI](https://polyhaven.com/a/machine_shop_01)
3. [Distribution Board HDRI](https://polyhaven.com/a/distribution_board)
4. [Rust Coarse 01](https://polyhaven.com/a/rust_coarse_01)
5. [Rusty Painted Metal](https://polyhaven.com/a/rusty_painted_metal)
6. [Rusty Metal](https://polyhaven.com/a/rusty_metal)
7. [Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02)
8. [Rough Concrete](https://polyhaven.com/a/rough_concrete)

That is enough to establish the first visual direction. Do not download more until we see how these behave with the current Raysons assets.
