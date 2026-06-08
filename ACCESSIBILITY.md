# Accessibility Notes — Small-Angle Approximation Demonstrator

Target: WCAG 2.1 AA (ADA Title II), AAA where reasonable. Built on the shared
KL-UNL foundation, which supplies the palette, focus handling, and the masthead's
accessible dialog.

## Structure & landmarks (1.3.1, 2.4.1, 2.4.6)

- One `<h1>` — the simulation title, rendered by `<kl-unl-masthead>`. The sim adds
  no competing `h1`.
- `<main>` contains three `<section>` regions, each labelled by an `<h2>`:
  *Angular size of the object* (equation), *Diagram*, *Controls*.
- Controls use `<fieldset>`/`<legend>` ("Distance to object", "Linear diameter of
  object") and preset buttons are grouped with `role="group"` + `aria-label`.
- A skip link ("Skip to controls") is the first focusable element.

## Text alternatives (1.1.1)

- The canvas has `role="img"` with `aria-label="Small-angle diagram"` and is described
  by a visually-hidden `aria-live="polite"` paragraph that states the current scene,
  e.g. *"Observer viewing an object 40.0 units away with a linear diameter of 2.0 units.
  The object subtends an angle of about 10313.3 arcseconds."*
- The reused person/ball bitmaps are composited into the canvas (the diagram), so the
  single canvas description covers them; they are not separate informative images.

## Equation (1.1.1, 4.1.2)

- Rendered as MathML (`α = 206265 × (linear diameter / distance) =`) with the live
  numeric result in an `<output>`. A visually-hidden message
  (`#equation-sr`) gives a spoken form, updated through the foundation's
  `klunlShowEquation` helper.

## Color & contrast (1.4.1, 1.4.3, 1.4.11)

- All palette comes from the KL-UNL CSS custom properties (charcoal text on white,
  french-blue buttons with a yellow-orange focus ring) — all ≥ 4.5:1.
- The diagram conveys information by **geometry and text**, not color: the angle is
  shown by line positions + the labelled `α` + the numeric arcsecond readout. The
  person and ball are illustrative photos, not state encodings. No information is
  carried by color alone.
- Original line colors were kept (grey tangent lines, black arc on white) — these are
  graphical objects meeting the 3:1 large/graphical threshold against the white stage.

## Keyboard (2.1.1, 2.1.2, 2.4.7)

| Action | Keys |
|---|---|
| Move between controls | Tab / Shift+Tab |
| Adjust a slider | ← / → (and Home/End, Page Up/Down) — native range, step 0.1 |
| Type an exact value | focus the distance/diameter field, type, Enter (or Tab away) to commit |
| Trigger a preset | focus the button, Enter / Space |
| Reset / About | masthead buttons; Escape closes the dialog |

- The canvas object drag is pointer/touch only; the **equivalent keyboard path** for
  changing distance is the distance slider and field (same snapped result).
- Visible focus ring comes from `kl-unl.css` `:focus-visible`. No keyboard traps; the
  masthead dialog manages its own focus trap and restoration.

## Timing / motion (2.2.2, 2.3.3)

- The only motion is the 300 ms preset ease — well under 5 s, no flashing.
- `prefers-reduced-motion: reduce` is honored: preset buttons jump straight to the end
  state (no animation). No continuous/looping animation exists, so no Pause control is
  needed; Reset is provided by the masthead.

## Live region (4.1.3)

- An `aria-live="polite"` status announces committed changes (slider release/commit,
  field commit, preset settle, drag end, reset) — not every animation tick — using the
  same wording as the on-screen readout, e.g. the diagram description above.

## Forms & language (3.3.2, 3.1.1)

- Every input has a real `<label>` (or `aria-label`); ranges and fields are paired with
  visible "distance:"/"diameter:" labels and "units". `<html lang="en">`.

## Responsiveness / touch (1.4.10, 2.5.5)

- Layout flows from desktop down to iPad; the foundation's 56rem one-column collapse is
  preserved, and below it each slider takes its own full-width row.
- The canvas keeps its native coordinate system and scales via CSS with preserved aspect
  ratio. `touch-action: none` on the canvas keeps a drag from scrolling/zooming the page.
- Buttons meet the ≥ 44px (2.75rem) minimum from the KL-UNL `.button` styles; no
  hover-only affordances.

## Still required

Automated checks and code review do not replace human QA. A pass with an actual screen
reader (NVDA/JAWS/VoiceOver) and keyboard-only operation is still recommended, including
confirming MathML is announced as expected in the target readers.
