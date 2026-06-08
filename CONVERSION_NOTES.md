# Conversion Notes — Small-Angle Approximation Demonstrator

## Behavior model (one paragraph)

An observer (a person sighting through a sextant) looks at an object (a beach
ball) some distance away. The user sets the object's **distance** (20–60 units)
and its **linear diameter** (1–3 units) with two sliders, two editable value
fields, and rows of preset buttons (20/30/40/50/60 and 1/2/3); the object can
also be dragged horizontally to change its distance. The simulation continuously
displays the small-angle approximation of the object's angular size,
`α = 206265 × (linear diameter / distance)`, in arcseconds, and draws the
geometry: two tangent lines from the observer's eye to the edges of the object,
and a short arc of fixed radius marking the true subtended angle `α` at the eye.
Pressing a preset button eases (cubic, 300 ms) to that value; dragging or moving
a slider sets the value immediately. The teaching point is that for these small
angles the approximation closely matches the true geometric angle.

## Source → ground truth

- **Behavior:** decompiled ActionScript 1 under `scripts/`.
  - `SmallAngleDemo.as` — constants, geometry (`refresh`), readout, drag, easing wiring, reset.
  - `Cubic Easing Class.as` — the 300 ms preset easing (ported verbatim).
  - `Standard Slider v6.as` / `Slider Logic Class v6.as` — value snapping/clamping (fixed-digit mode).
  - `toFixed.as` — number formatting (round-half-up; ported verbatim).
  - `drawArc.as` — arc tessellation (ported verbatim; `ctx.quadraticCurveTo`).
  - `Fire Photon Button.as` + the per-button `on(initialize)` records — the preset buttons
    (this generic push-button class is named "Fire Photon Button" but here it only carries a
    label/id and calls `easeToDistance` / `easeToDiameter`).
  - `Title Bar.as` init record — confirms `helpLinkageName = ""` (no Help) and `aboutLinkageName = "About"`.
- **Initial state:** the main frame calls `onReset()`, which sets **distance = 40**, **diameter = 2**
  (these override the sliders' own `initValue` of 50 / 2). Reset restores exactly these.

## Verbatim constants (from `SmallAngleDemo.as`)

| Constant | Value | Meaning |
|---|---|---|
| `centerY` | 193 | sight-line / object height (stage Y) |
| `originX` | 42 | vertex = observer's eye (stage X) |
| `arcRadius` | 200 | radius of the angle arc |
| `rInPixels` | 14.73 | pixels per "unit" |
| `distanceEaseTime` / `diameterEaseTime` | 300 ms | preset easing duration |
| small-angle factor | 206265 | arcseconds per radian |
| distance slider | min 20, max 60, fixed 1 digit (step 0.1) | |
| diameter slider | min 1, max 3, fixed 1 digit (step 0.1) | |
| tangent line | color `0xA0A0A0` (10526880), width 1 | |
| angle arc | color `0x000000`, width 3 | |

Geometry per frame (verbatim from `p.refresh`):
```
distPx     = rInPixels * distance
pr         = rInPixels * diameter / 2          // object radius, px
approxAlpha = 206265 * diameter / distance     // readout (arcsec, toFixed(1))
theta      = asin(pr / distPx)                  // true half-angle
a          = sqrt(distPx^2 - pr^2)
tangent pts at (originX + a*cos θ, centerY ± a*sin θ); apex at (originX, centerY)
arc        = drawArc(originX, centerY, 200, -θ, θ)
α label at (originX + 200*cos θ, centerY - 200*sin θ)
object center at (originX + distPx, centerY), radius pr
```

## AS → HTML5 mapping

| ActionScript | HTML5 |
|---|---|
| `onEnterFrame` / `easeOnEnterFrame` | single `requestAnimationFrame` loop (`tick`) |
| `getTimer()` (ms) | `performance.now()` (ms); same easing constants |
| `ballMC` drag (`onPress`/`onMouseMove`, `xOffset`) | Pointer Events on the canvas + identical `(mouseX - xOffset - originX)/rInPixels` math, plus the distance slider/field as the keyboard path |
| `distanceSlider.value = x` (snaps to 0.1) | `snapValue()` (clamp then snap to step) |
| `Standard Slider v6` UI | native `<input type="range">` + text `<input>` + preset `<button>`s (Flash component framework not ported) |
| preset button → `easeToDistance`/`easeToDiameter` | `<button data-preset data-value>` → same eased setters |
| `Title Bar` (Reset/About) | shared `<kl-unl-masthead>`; listens for its `sim-reset` event |
| equation art on stage | MathML in the equation panel via `klunlShowEquation`; live value in an `<output>` |
| `ballMC._xscale = 2*pr` on a unit ball symbol | `drawImage(ball, …, 2*pr, 2*pr)` (radius `pr`), same on-screen size |

## Assets: reused vs. code-drawn

- **Reused as-is** (copied to `assets/`, never redrawn):
  - `assets/person.png` — the observer (exported sprite `DefineSprite_66`, 200×591).
    Drawn flipped horizontally about the eye so the observer faces the object (to the
    right); the eye stays pinned at the angle vertex.
  - `assets/ball.png` — the object/beach ball (exported sprite `DefineSprite_53`, 298×298).
- **Code-drawn** (no exported file exists — these are built at runtime by the AS):
  the two tangent lines, the angle arc (`drawArc`), and the `α` label. Reproduced on
  the 2D canvas with the original geometry/colors. The `α` label uses the Unicode
  Greek small letter alpha in an italic serif face (the original drew it from the
  Symbol font as a small graphic symbol).

## contents.json

The provided `foundation/contents.json` **already contains** the `smallAngleDemo`
entry (sim-id `smallAngleDemo`, `meta.title` "Small-Angle Approximation
Demonstrator", `help.content` `""` so no Help button, and an About derived from the
original's About boilerplate). The foundation folder is therefore copied in
**byte-for-byte unchanged** — no edits were needed.

## Deviations from the original (presentation only; physics/logic unchanged)

1. **Layout & chrome** follow the KL-UNL foundation + WCAG, not the Flash pixel layout
   (Goal B). The equation, diagram, and controls are separate KL-UNL panels in the same
   top-to-bottom reading order as the original. Behavior, constants, formulas, and number
   formatting are identical (Goal A).
2. **Equation rendering uses MathML**, not MathJax. The foundation supplies no MathJax
   include (and no CDN is permitted), and `kl-unl.js`'s `klunlShowEquation` degrades to
   setting `innerHTML` when MathJax is absent. MathML renders natively in modern browsers
   and is read correctly by screen readers; the foundation helper is still used (it also
   updates the screen-reader message). If a MathJax include is later added to the
   foundation, the same call path will typeset the MathML.
3. **Diagram canvas is cropped to the diagram band** of the original stage (a wide, short
   region around `centerY`), since the equation and controls bands now live in their own
   panels. Drawing/physics math stays in the original stage coordinates; only a constant
   vertical offset is applied for display, and pointer coordinates are mapped back through
   it so drag/snapping still match the AS exactly.
4. **Easing during a hidden/background tab:** the ease is driven by `requestAnimationFrame`,
   which browsers suspend for non-visible tabs. When the tab is visible again the ease
   completes correctly (the easer returns its target value for any time past the end). This
   matches normal web behavior and does not affect the final state.
