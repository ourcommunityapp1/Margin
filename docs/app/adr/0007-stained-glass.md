# ADR-0007: The stained-glass windows

- **Status:** Accepted

## Context

On the website, `src/app/heir/ui/glass/` draws each window with WebGL2:
- a photo of the window;
- an "ids" image that says which pane each pixel belongs to;
- a light value per pane: dark, lit, or dusty for needing a refresh.

The full effect has several passes: glass and stone, glow, light rays, then clouds, dust and grain.

The small windows (`mini.tsx`) use a simpler 2D canvas over `glass-mini.webp` and `ids-mini.png`.

**Rule:** never show a window more lit than the person has earned.

## Decision

1. **First, one pass.** A Flutter fragment shader (`FragmentProgram`) reads the photo, the ids image and a small texture
   of pane light values, and draws lit, dark and dusty panes with a soft edge. This matches the small windows and most
   of the large ones.
2. **Then the rest of the effect.** Glow and light rays are added as extra passes, drawn to offscreen images and
   composited, once the first version is right on a real iPhone.
3. **Lighting order is identical to the website.** Pane order and the share lit come from the ported `light.ts`
   (`windowLight`, `partWindow`). A test checks that the lit share never exceeds what was learned.
4. **The gold arc and frame** are drawn with Flutter's ordinary drawing, as on the website.

## Consequences

- **Windows appear early (phase 3) in a simple form,** and get richer without changing anything else.
- **Real-phone checks are needed,** because simulators don't show the GPU's look faithfully.
