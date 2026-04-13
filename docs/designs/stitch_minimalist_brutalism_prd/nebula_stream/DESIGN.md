# Design System: Nebula Flow (星云流光)

## 1. Overview & Creative North Star: "The Celestial Architect"
This design system rejects the clinical, flat nature of traditional SaaS interfaces in favor of a "Celestial Architect" aesthetic. We are not building a simple dashboard; we are crafting a window into a high-performance digital cosmos. 

The core philosophy centers on **Luminous Depth**. By combining a deep space foundation with hyper-vibrant accent glows and editorial typography, we create an environment that feels both expansive and precise. We break the "template" look through:
*   **Intentional Asymmetry:** Using floating panels and offset glows to guide the eye.
*   **Atmospheric Perspective:** Using light as a structural element rather than just a decoration.
*   **Technical Elegance:** Pairing the geometric warmth of *Space Grotesk* with the surgical precision of *JetBrains Mono*.

---

## 2. Colors: The Void and The Pulse
The palette is built on the contrast between the infinite dark (`#0f111a`) and high-energy luminescent "pulses."

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. A `surface-container-low` section sitting on a `surface` background provides all the separation required. If you feel the need to draw a line, use a gap in the layout instead.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of "Smart Glass" floating in a vacuum:
*   **Base:** `background` (#11131c) - The infinite void.
*   **Nesting:** Use `surface-container-low` for large content areas. Place `surface-container-highest` or `surface-bright` cards within them to create "lift."
*   **The Glass & Gradient Rule:** For primary actions and high-level floating panels, use a linear gradient transitioning from `primary` (#dbfcff) to `primary-container` (#00f0ff) at a 135° angle.

### Signature Textures
Apply a subtle "Atmospheric Glow" using a `secondary_container` (#9d05de) radial gradient at 15% opacity behind key data visualizations to give the UI "soul" and a sense of depth.

---

## 3. Typography: Editorial Precision
We utilize a dual-font strategy to balance character with functionality.

*   **Space Grotesk (Display & Headlines):** This is our "Editorial Voice." It should be used with tight tracking (-2%) for headlines to create a sophisticated, high-end feel.
*   **JetBrains Mono (Technical Data):** (To be used for labels, code snippets, and mono-spaced metrics). It signals accuracy and developer-grade performance.

**Scale Highlights:**
*   **Display-lg (3.5rem):** Reserved for hero impact. Use `primary` color.
*   **Title-md (1.125rem):** The workhorse for card headers.
*   **Label-sm (0.6875rem):** Use `on_surface_variant` for metadata, paired with JetBrains Mono for a "cockpit" feel.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows have no place in the vacuum of space. We use **Tonal Layering** and **Luminescence** instead.

*   **The Layering Principle:** Stack `surface-container-lowest` (#0c0e17) on top of `surface-container` (#1d1f29) to create a "recessed" well for input fields or secondary content.
*   **Ambient Shadows:** For floating modals, use a shadow with a 40px blur, 0% spread, and color `secondary` (#e8b3ff) at only 6% opacity. This mimics the purple atmospheric glow (#b535f6) bouncing off the surface.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use `outline_variant` at **15% opacity**. Never use a 100% opaque border.
*   **Glassmorphism:** All floating panels must utilize:
    *   `background: rgba(29, 31, 41, 0.6)`
    *   `backdrop-filter: blur(16px)`
    *   A subtle top-left highlight using a 1px "inner-glow" stroke at 20% opacity.

---

## 5. Components

### The Nebula FAB (Floating Action Button)
*   **Shape:** Full Circle (9999px).
*   **Size:** 48px x 48px.
*   **Style:** `primary_container` (#00f0ff) background with a 12px "Cyan Glow" (`primary_fixed` at 30% opacity).
*   **Interaction:** On hover, the button should expand slightly (scale 1.05) and the glow intensity should double.

### Buttons
*   **Primary:** Solid `primary_container`. Text in `on_primary`. High-contrast, no border.
*   **Secondary:** Glass-morphic. Transparent background, `backdrop-blur(12px)`, with a `ghost-border` of `primary`.
*   **Tertiary:** Text-only in `primary`, with a slight `secondary` glow on hover.

### Cards & Lists
*   **Constraint:** Zero divider lines. Use `surface_container_low` for the list container and `surface_container_high` for individual items on hover.
*   **Spacing:** Use "xl" (3rem) padding for internal card content to give data room to breathe.

### Input Fields
*   **Base:** `surface_container_lowest`.
*   **Active State:** No border change. Instead, apply a subtle `primary` outer glow and shift the label color to `primary`.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use overlapping elements. A glass panel partially covering a background glow creates immense depth.
*   **Do** use JetBrains Mono for all numerical data and timestamps.
*   **Do** use the `xl` (2rem/3rem) corner radius for main containers to soften the "tech" edge.

### Don't
*   **Don't** use pure black (#000000). Use the specified Space Blue-Black (#0f111a).
*   **Don't** use standard "Drop Shadows." Use tonal shifts and blur-based glows.
*   **Don't** crowd the interface. If a screen feels full, increase the white space (vertical padding) by 2x.
*   **Don't** use 100% white for body text. Use `on_surface` (#e1e1ef) to reduce eye strain in dark mode.

---

## 7. Roundedness Scale
*   **Default (1rem):** Standard buttons and small cards.
*   **Large (2rem):** Main content panels and headers.
*   **Full (9999px):** Floating Action Buttons, Tags, and Pill-shaped toggles.