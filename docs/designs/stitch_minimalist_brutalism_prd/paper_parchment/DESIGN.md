# Design System Strategy: The Modern Archivist

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Modern Archivist."** It represents a bridge between the tactile, prestigious world of print journalism and the fluid efficiency of high-end digital workspaces. We are not just building an interface; we are curating a digital broadsheet.

To move beyond the "template" look, this system rejects standard modularity in favor of **Intentional Asymmetry**. By utilizing a 3-column layout where the center "Preview" column acts as the visual anchor, we create a sense of editorial importance. The UI breaks the grid through overlapping glass layers and "Paper-on-Paper" nesting, ensuring the experience feels bespoke, expensive, and intellectual.

## 2. Colors: The Tonal Narrative
Our palette is rooted in heritage. We utilize a warm, organic spectrum to reduce eye strain and evoke the feeling of archival-grade paper.

### The "No-Line" Rule
Traditional 1px solid borders are prohibited for sectioning. Structural boundaries must be defined solely through:
1.  **Background Shifts:** Distinguish the Editor from the Preview by placing the Editor on `surface-container-low` (#f4f3f1) while the Preview sits on the pure `background` (#faf9f7).
2.  **Glassmorphism:** Use `surface_variant` (#e3e2e0) with a 60% opacity and a 12px backdrop-blur to create floating panels that feel like vellum.

### Surface Hierarchy & Nesting
Treat the interface as a physical stack of paper:
*   **Base Layer:** `surface` (#faf9f7) – The primary canvas.
*   **The Inset Editor:** `surface-container-low` (#f4f3f1) – Creating a slight "well" for the writing experience.
*   **The Customizer Panel:** `surface-container-high` (#e9e8e6) – Elevated and distinct to signify its utility.
*   **Floating Modals:** `surface-container-lowest` (#ffffff) – Pure white highlights to draw immediate focus.

### Signature Textures
Apply a subtle linear gradient to Primary CTAs (e.g., from `primary` #6f4315 to `primary_container` #8b5a2b). This prevents buttons from looking "flat" and gives them the appearance of embossed leather or pressed ink.

## 3. Typography: Editorial Authority
Typography is our primary tool for hierarchy. We pair the authoritative weight of **Playfair Display** (Noto Serif) with the legible grace of **Lora** (Newsreader).

*   **Display & Headline (Noto Serif):** Used exclusively for titles and major section headers. Use `headline-lg` for document titles to establish an immediate editorial tone.
*   **Body (Newsreader):** The "Reading" experience. Use `body-lg` for the Preview pane. It must feel like a novel or a high-end magazine.
*   **The Editor (JetBrains Mono):** We break the serif immersion in the Editor column. Using a monospaced font signals a "work-in-progress" state, providing a functional contrast to the polished Preview.
*   **Labels (Work Sans):** Technical metadata and UI controls use `label-md`. This sans-serif contrast ensures utility elements are clearly distinguished from content.

## 4. Elevation & Depth
In this system, depth is a whisper, not a shout. We avoid heavy dropshadows in favor of **Tonal Layering**.

*   **The Layering Principle:** To lift a card, do not add a shadow. Instead, place a `surface-container-lowest` (#ffffff) card on a `surface-container` (#efeeec) background.
*   **Ambient Shadows:** If a floating element (like a context menu) is required, use a shadow with a 32px blur at 6% opacity, tinted with `#2e1500` (on_primary_fixed). This creates a warm, natural glow rather than a cold grey smudge.
*   **The Ghost Border:** For the Visual Customizer's hairline aesthetics, use `outline_variant` (#d5c3b6) at **15% opacity**. This provides a "suggestion" of a boundary that honors the 1px hairline requirement without cluttering the visual field.

## 5. Components: Practical Application

### Buttons
*   **Primary:** Solid `primary` (#6f4315) with `on_primary` (#ffffff) text. Hard 0px corners.
*   **Secondary:** Ghost style. `outline` (#837469) at 20% opacity with `primary` text. 
*   **Interaction:** On hover, shift background to `primary_container` (#8b5a2b).

### Input Fields (The Editor)
*   **Styling:** No bottom line or box. Use a subtle background fill of `surface-container-highest` (#e3e2e0) with 0px border-radius.
*   **Focus State:** A 1px "Ghost Border" of `primary` (#6f4315) at 40% opacity.

### The Visual Customizer Panel
*   **Structure:** A 300px sidebar using `surface-container-high`. 
*   **Controls:** Use `Selection Chips` instead of dropdowns where possible.
*   **Chips:** 0px radius, using `secondary_container` (#fed3c7) for active states and `surface-variant` (#e3e2e0) for inactive.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal rules (`<hr>`). Separate list items using 16px of vertical whitespace or a alternating tonal shift between `surface` and `surface-container-low`.

## 6. Do’s and Don’ts

### Do:
*   **Embrace Whitespace:** Treat the screen like a gallery wall. If in doubt, add more margin.
*   **Use Mono for Data:** Any technical info (word counts, hex codes) should be JetBrains Mono.
*   **Tighten Leading:** For large Display titles, tighten the letter-spacing and line-height to create a "compacted" professional look.

### Don’t:
*   **Don't use Border-Radius:** This system is strictly 0px. Softness is achieved through color and blur, not rounded corners.
*   **Don't use Pure Black:** Text should always be `on_surface` (#1a1c1b) or `tertiary` (#4e4d4b). Pure #000000 destroys the "paper" illusion.
*   **Don't use Vibrant Colors:** Accents must stay within the Sepia/Brown/Charcoal family. Avoid "Action Blue" or "Success Green" unless heavily muted.