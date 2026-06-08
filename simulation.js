/* ============================================================================
   Small-Angle Approximation Demonstrator
   HTML5 port of smallAngleDemo003 (Adobe Flash / ActionScript 1).

   Behavior is ported verbatim from the decompiled ActionScript:
     scripts/SmallAngleDemo.as          (geometry + readout + easing wiring)
     scripts/Cubic Easing Class.as       (300 ms preset-button easing)
     scripts/Standard Slider v6.as       (slider value snapping / clamping)
     scripts/Slider Logic Class v6.as    (fixed-digit snapping math)
     scripts/toFixed.as                  (number formatting)

   The observer (person) and the object (beach ball) are EXPORTED ASSETS reused
   as-is from assets/. Everything else on the canvas -- the two tangent lines,
   the angle arc, and the alpha label -- is code-drawn in the original and so is
   redrawn here on a 2D context, preserving the original stage geometry.
============================================================================ */

'use strict';

/* ---------------------------------------------------------------------------
   Constants -- copied verbatim from SmallAngleDemo.as
--------------------------------------------------------------------------- */
const CENTER_Y          = 193;     // p.centerY  -- sight-line / object height
const ORIGIN_X          = 42;      // p.originX   -- vertex (observer's eye)
const ARC_RADIUS        = 200;     // p.arcRadius
const R_IN_PIXELS       = 14.73;   // p.rInPixels -- pixels per "unit"
const DISTANCE_EASE_MS  = 300;     // p.distanceEaseTime
const DIAMETER_EASE_MS  = 300;     // p.diameterEaseTime
const ARCSEC_CONST      = 206265;  // arcseconds per radian (small-angle factor)

// AS colors are decimal RGB; line alpha defaults to 100% (opaque).
const TANGENT_COLOR     = '#a0a0a0'; // 10526880  -> tangent lines, lineStyle(1, ...)
const ARC_COLOR         = '#000000'; // 0          -> angle arc,    lineStyle(3, ...)

// Slider ranges / formatting -- from the two "Standard Slider v6" initObjects.
const DISTANCE = { min: 20, max: 60, step: 0.1, digits: 1 };
const DIAMETER = { min: 1,  max: 3,  step: 0.1, digits: 1 };

// Initial / reset state -- p.onReset() sets distance = 40, diameter = 2.
const RESET = { distance: 40, diameter: 2 };

// Native stage width (the original Flash stage coordinate system). All drawing
// and physics math stays in these original coordinates.
const STAGE_W = 960;
const STAGE_H = 380;
// The diagram occupies a wide, short band of the original stage (the equation and
// controls bands now live in their own panels). We show just that band by drawing
// in stage coordinates through a vertical offset -- the math is unchanged.
const VIEW_Y0 = 150;   // top of the visible band, in stage coordinates
const VIEW_H  = 195;   // height of the visible band

/* ---------------------------------------------------------------------------
   toFixed -- faithful port of toFixed.as (uses Math.round, i.e. round-half-up,
   which differs from JS's native Number.prototype.toFixed in edge cases).
--------------------------------------------------------------------------- */
function toFixedAS(x, fractionDigits) {
  const f = fractionDigits | 0;
  if (f < 0 || f > 20) return 'Range Error';
  if (isNaN(x)) return 'NaN';
  let s = '';
  if (x < 0) { s = '-'; x = -x; }
  let out = '';
  if (x < 1e21) {
    const n = Math.round(x * Math.pow(10, f));
    out = (n === 0) ? '0' : n.toString();
    if (f > 0) {
      let k = out.length;
      if (k <= f) {
        let z = '';
        for (let i = 0; i < f + 1 - k; i++) z += '0';
        out = z + out;
        k = f + 1;
      }
      const a = out.substr(0, k - f);
      const b = out.substr(k - f);
      out = a + '.' + b;
    }
  } else {
    out = x.toString();
  }
  return s + out;
}

/* ---------------------------------------------------------------------------
   Value snapping -- faithful port of SliderLogicClassV6.getValueObjectFromValue
   for the "fixed digits" mode used by both sliders: clamp to [min,max] first,
   then snap to the nearest step (minIncrement = 10^-digits).
--------------------------------------------------------------------------- */
function snapValue(x, cfg) {
  let v = x;
  if (v < cfg.min) v = cfg.min;
  else if (v > cfg.max) v = cfg.max;
  return cfg.step * Math.round(v / cfg.step);
}

/* ---------------------------------------------------------------------------
   CubicEasingClass -- verbatim port of "Cubic Easing Class.as".
   Drives the smooth 300 ms transition when a preset button is pressed.
--------------------------------------------------------------------------- */
function CubicEasingClass(initValue) {
  this.slope1 = 0;
  this.init(initValue);
}
CubicEasingClass.prototype.init = function (initValue) {
  this.setTarget(0, initValue, 1, initValue);
};
CubicEasingClass.prototype.setTarget = function (xStart, yStart, xTarget, yTarget) {
  const xS = xStart;
  let yS = yStart;
  if (yS == null) {
    yS = this.getValue(xS);
    this.slope0 = this.getDerivative(xS);
  } else {
    this.slope0 = 0;
  }
  this.splinePointsList = [{ x: xS, y: yS }, { x: xTarget, y: yTarget }];
  this.doComputations();
  this.targetValue = yTarget;
};
CubicEasingClass.prototype.getValue = function (x) {
  const list = this.parametersList;
  const len = list.length;
  let i = 0;
  while (i < len) { if (x < list[i].xUpper) break; i++; }
  if (i < len) {
    return list[i].d + x * (list[i].c + x * (list[i].b + x * list[i].a));
  }
  return this.targetValue;
};
CubicEasingClass.prototype.getDerivative = function (x) {
  const list = this.parametersList;
  const len = list.length;
  let i = 0;
  while (i < len) { if (x < list[i].xUpper) break; i++; }
  if (i < len) {
    return list[i].c + x * (2 * list[i].b + 3 * x * list[i].a);
  }
  return 0;
};
CubicEasingClass.prototype.doComputations = function () {
  const pts = this.splinePointsList;
  pts.sort(this.pointsCompareFunc);
  const n = pts.length;
  const n_1 = n - 1;
  const n_2 = n - 2;
  const m0 = this.slope0;
  const m1 = this.slope1;
  const uL = [];
  pts[0].d2 = -0.5;
  uL[0] = 3 / (pts[1].x - pts[0].x) * ((pts[1].y - pts[0].y) / (pts[1].x - pts[0].x) - m0);
  let i = 1;
  while (i < n_1) {
    const sig = (pts[i].x - pts[i - 1].x) / (pts[i + 1].x - pts[i - 1].x);
    const p = sig * pts[i - 1].d2 + 2;
    pts[i].d2 = (sig - 1) / p;
    uL[i] = (pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x) - (pts[i].y - pts[i - 1].y) / (pts[i].x - pts[i - 1].x);
    uL[i] = (6 * uL[i] / (pts[i + 1].x - pts[i - 1].x) - sig * uL[i - 1]) / p;
    i++;
  }
  const qn = 0.5;
  const un = 3 / (pts[n_1].x - pts[n_2].x) * (m1 - (pts[n_1].y - pts[n_2].y) / (pts[n_1].x - pts[n_2].x));
  pts[n_1].d2 = (un - qn * uL[n_2]) / (qn * pts[n_2].d2 + 1);
  let k = n_2;
  while (k >= 0) { pts[k].d2 = pts[k].d2 * pts[k + 1].d2 + uL[k]; k--; }
  const cL = [];
  i = 0;
  while (i < n_1) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p1d2 = p1.d2;
    const p2d2 = p2.d2;
    const x1 = p1.x;
    const x2 = p2.x;
    const p1y = p1.y;
    const p2y = p2.y;
    const h = x2 - x1;
    const a = (p2d2 - p1d2) / (6 * h);
    const b = (3 * x2 * p1d2 - 3 * p2d2 * x1) / (6 * h);
    const c = (-6 * p1y + 2 * x2 * p2d2 * x1 - x2 * x2 * p2d2 - 2 * x2 * p1d2 * x1 + p1d2 * x1 * x1 - 2 * x2 * x2 * p1d2 + 6 * p2y + 2 * p2d2 * x1 * x1) / (6 * h);
    const d = (-2 * p2d2 * x2 * x1 * x1 + 2 * p1d2 * x2 * x2 * x1 + p2d2 * x2 * x2 * x1 - 6 * p2y * x1 + 6 * p1y * x2 - p1d2 * x2 * x1 * x1) / (6 * h);
    cL.push({ xUpper: x2, a: a, b: b, c: c, d: d });
    i++;
  }
  this.parametersList = cL;
};
CubicEasingClass.prototype.pointsCompareFunc = function (a, b) {
  if (a.x < b.x) return -1;
  if (a.x > b.x) return 1;
  return 0;
};

/* ---------------------------------------------------------------------------
   drawArc -- faithful port of drawArc.as. Tessellates an arc with quadratic
   curves; ctx.arc would also work, but this preserves the exact original path.
   AS uses screen-Y-down with sin negated (y - r*sin), mirrored here.
--------------------------------------------------------------------------- */
const MAX_ARC_STEP = 0.5;
function drawArcPath(ctx, x, y, radius, startAngle, endAngle) {
  const TWO_PI = 6.283185307179586;
  if (startAngle === undefined) { startAngle = 0; endAngle = TWO_PI; }
  else {
    startAngle = startAngle < 0 ? startAngle % TWO_PI + TWO_PI : startAngle % TWO_PI;
    endAngle   = endAngle   < 0 ? endAngle   % TWO_PI + TWO_PI : endAngle   % TWO_PI;
  }
  let range = endAngle - startAngle;
  if (range < 0) range = TWO_PI + range;
  const n = Math.ceil(range / MAX_ARC_STEP);
  const step = range / n;
  const half = step / 2;
  const cRadius = radius / Math.cos(half);
  let a3 = startAngle;
  let a2 = startAngle - half;
  ctx.moveTo(x + radius * Math.cos(startAngle), y - radius * Math.sin(startAngle));
  for (let i = 0; i < n; i++) {
    a3 += step;
    a2 += step;
    ctx.quadraticCurveTo(
      x + cRadius * Math.cos(a2), y - cRadius * Math.sin(a2),
      x + radius * Math.cos(a3), y - radius * Math.sin(a3)
    );
  }
}

/* ===========================================================================
   Application
=========================================================================== */
(function () {
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');

  // DOM handles
  const distRange  = document.getElementById('distance-range');
  const distField  = document.getElementById('distance-field');
  const diamRange  = document.getElementById('diameter-range');
  const diamField  = document.getElementById('diameter-field');
  const alphaResult = document.getElementById('alpha-result');
  const diagramDesc = document.getElementById('diagram-desc');
  const srStatus    = document.getElementById('sr-status');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Exported assets reused as-is.
  const personImg = new Image();
  const ballImg   = new Image();
  let personReady = false, ballReady = false;
  personImg.onload = () => { personReady = true; };
  ballImg.onload   = () => { ballReady = true; };
  personImg.src = 'assets/person.png';
  ballImg.src   = 'assets/ball.png';

  // Person placement: anchor the observer's eye (the angle vertex) at
  // (ORIGIN_X, CENTER_Y). The person bitmap is 200x591; the sextant/eye sits at
  // roughly (30%, 9.5%) of the image. Display height chosen to match frames/1.png.
  const PERSON_W = 200, PERSON_H = 591;
  const PERSON_DISPLAY_H = 150;
  const PERSON_EYE_FX = 0.30;
  const PERSON_EYE_FY = 0.095;

  // Single source of truth for state.
  const state = {
    distance: RESET.distance,
    diameter: RESET.diameter
  };

  // Two easers, exactly as in the AS constructor.
  const distanceEaser = new CubicEasingClass(state.distance);
  const diameterEaser = new CubicEasingClass(state.diameter);

  // Last snapped values seen by the ease loop (mirrors slider.value reads in AS).
  let lastDistance = state.distance;
  let lastDiameter = state.diameter;

  let dragging = false;

  /* ----- geometry result cache for the screen-reader description ----- */
  let lastApproxAlpha = 0;

  /* ------------------------------------------------------------------
     refresh() -- verbatim geometry from SmallAngleDemo.as p.refresh.
  ------------------------------------------------------------------ */
  function refresh() {
    const distance = state.distance;
    const diameter = state.diameter;

    const distPx = R_IN_PIXELS * distance;            // _loc3_
    const pr = R_IN_PIXELS * diameter / 2;            // ball radius in px

    // approxAlpha = 206265 * diameter / distance  (the small-angle readout)
    const approxAlpha = ARCSEC_CONST * diameter / distance;
    lastApproxAlpha = approxAlpha;

    // true half-angle of the object as seen from the vertex
    const theta = Math.asin(pr / distPx);             // _loc2_
    const a = Math.sqrt(distPx * distPx - pr * pr);
    const ax = ORIGIN_X + a * Math.cos(theta);
    const ay = a * Math.sin(theta);

    drawStage({
      distPx: distPx, pr: pr, theta: theta,
      ax: ax, ay: ay
    });

    // Readout text: approxAlpha.toFixed(1) + " arcsec"
    const valueText = toFixedAS(approxAlpha, 1) + ' arcsec';
    alphaResult.textContent = valueText;
  }

  /* ------------------------------------------------------------------
     drawStage() -- recreate the code-drawn art (tangents + arc + alpha)
     and composite the reused person/ball bitmaps, in original stage coords.
  ------------------------------------------------------------------ */
  function drawStage(g) {
    const dpr = window.devicePixelRatio || 1;
    // (canvas backing size is kept in sync in resizeBacking)
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(0, -VIEW_Y0);                  // show the diagram band only
    ctx.clearRect(0, VIEW_Y0, STAGE_W, VIEW_H);

    // --- observer (person), eye anchored at the vertex ---
    // The exported art faces left; the object is to the right, so the person is
    // flipped horizontally to face the object. The flip is about the eye (the
    // angle vertex), so the eye stays pinned at (ORIGIN_X, CENTER_Y).
    if (personReady) {
      const s = PERSON_DISPLAY_H / PERSON_H;
      const w = PERSON_W * s;
      const h = PERSON_DISPLAY_H;
      const top = CENTER_Y - PERSON_EYE_FY * h;
      ctx.save();
      ctx.translate(ORIGIN_X, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(personImg, -PERSON_EYE_FX * w, top, w, h);
      ctx.restore();
    }

    // --- tangent lines: (ax, centerY+ay) -> (originX, centerY) -> (ax, centerY-ay) ---
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = TANGENT_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.ax, CENTER_Y + g.ay);
    ctx.lineTo(ORIGIN_X, CENTER_Y);
    ctx.lineTo(g.ax, CENTER_Y - g.ay);
    ctx.stroke();

    // --- angle arc: drawArc(originX, centerY, 200, -theta, theta), black, width 3 ---
    ctx.strokeStyle = ARC_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    drawArcPath(ctx, ORIGIN_X, CENTER_Y, ARC_RADIUS, -g.theta, g.theta);
    ctx.stroke();

    // --- object (beach ball): center (originX + distPx, centerY), radius pr ---
    if (ballReady) {
      const bx = ORIGIN_X + g.distPx;
      const by = CENTER_Y;
      const d = 2 * g.pr;
      ctx.drawImage(ballImg, bx - g.pr, by - g.pr, d, d);
    }

    // --- alpha label at (originX + 200*cos(theta), centerY - 200*sin(theta)) ---
    const lx = ORIGIN_X + ARC_RADIUS * Math.cos(g.theta);
    const ly = CENTER_Y - ARC_RADIUS * Math.sin(g.theta);
    ctx.fillStyle = '#000000';
    ctx.font = 'italic 18px "Times New Roman", Times, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('α', lx + 4, ly);  // Greek small letter alpha

    ctx.restore();
  }

  /* ------------------------------------------------------------------
     Equation panel (via the foundation kl-unl.js helper).
  ------------------------------------------------------------------ */
  function updateEquation(announce) {
    const valueText = toFixedAS(lastApproxAlpha, 1);
    // MathML renders natively (no MathJax dependency); MathJax would also accept it.
    // The equation ends at "="; the live numeric result is shown in the <output>
    // beside it (mirroring the original's value field after the equals sign).
    const mathml =
      '<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">' +
        '<mi>&#x3B1;</mi><mo>=</mo><mn>206,265</mn><mo>&#xD7;</mo>' +
        '<mfrac><mtext>linear&#xA0;diameter</mtext><mtext>distance</mtext></mfrac>' +
        '<mo>=</mo>' +
      '</math>';
    const srText = 'Alpha equals 206,265 times linear diameter ' + state.diameter.toFixed(1) +
                   ' divided by distance ' + state.distance.toFixed(1) +
                   ', equals ' + valueText + ' arcseconds.';
    // klunlShowEquation(eqn, msg1): updates the equation container and an SR message.
    klunlShowEquation(['equation-latex', mathml], ['equation-sr', srText]);
    if (announce) announceState();
  }

  /* ------------------------------------------------------------------
     Screen-reader state description + polite announcement.
  ------------------------------------------------------------------ */
  function describeState() {
    return 'Observer viewing an object ' + toFixedAS(state.distance, 1) +
           ' units away with a linear diameter of ' + toFixedAS(state.diameter, 1) +
           ' units. The object subtends an angle of about ' +
           toFixedAS(lastApproxAlpha, 1) + ' arcseconds.';
  }
  function announceState() {
    const text = describeState();
    diagramDesc.textContent = text;
    srStatus.textContent = text;
  }

  /* ------------------------------------------------------------------
     Sync the slider + field DOM from state (without firing input events).
  ------------------------------------------------------------------ */
  function syncControls() {
    distRange.value = String(state.distance);
    diamRange.value = String(state.diameter);
    if (document.activeElement !== distField) distField.value = toFixedAS(state.distance, 1);
    if (document.activeElement !== diamField) diamField.value = toFixedAS(state.diameter, 1);
  }

  /* ------------------------------------------------------------------
     Direct setters -- mirror p.setDistance / p.setDiameter
     (slider value -> snap, easer.init = instantaneous, refresh).
  ------------------------------------------------------------------ */
  function setDistance(x) {
    state.distance = snapValue(x, DISTANCE);
    lastDistance = state.distance;
    distanceEaser.init(state.distance);
    refresh();
    syncControls();
  }
  function setDiameter(d) {
    state.diameter = snapValue(d, DIAMETER);
    lastDiameter = state.diameter;
    diameterEaser.init(state.diameter);
    refresh();
    syncControls();
  }

  /* ------------------------------------------------------------------
     Eased setters -- mirror p.easeToDistance / p.easeToDiameter.
     With reduced motion, jump straight to the end state (no animation).
  ------------------------------------------------------------------ */
  function easeToDistance(x) {
    const target = snapValue(x, DISTANCE);
    if (reduceMotion.matches) { setDistance(target); announceState(); updateEquation(false); return; }
    const t = performance.now();
    distanceEaser.setTarget(t, null, t + DISTANCE_EASE_MS, target);
  }
  function easeToDiameter(d) {
    const target = snapValue(d, DIAMETER);
    if (reduceMotion.matches) { setDiameter(target); announceState(); updateEquation(false); return; }
    const t = performance.now();
    diameterEaser.setTarget(t, null, t + DIAMETER_EASE_MS, target);
  }

  /* ------------------------------------------------------------------
     Ease loop -- mirror p.easeOnEnterFrame (runs every frame; updates only
     when the snapped value changes, exactly as the AS reads slider.value).
  ------------------------------------------------------------------ */
  function tick() {
    const now = performance.now();
    const nx = snapValue(distanceEaser.getValue(now), DISTANCE);
    const nd = snapValue(diameterEaser.getValue(now), DIAMETER);
    let changed = false;
    if (nx !== lastDistance) { state.distance = nx; lastDistance = nx; changed = true; }
    if (nd !== lastDiameter) { state.diameter = nd; lastDiameter = nd; changed = true; }
    if (changed) {
      refresh();
      syncControls();
      // Equation value tracks the animation; SR announcement waits for settle.
      alphaResult.textContent = toFixedAS(lastApproxAlpha, 1) + ' arcsec';
      scheduleSettle();
    }
    requestAnimationFrame(tick);
  }

  // Announce + refresh the MathML equation once motion settles (debounced),
  // so screen readers are not spammed during the 300 ms ease.
  let settleTimer = null;
  function scheduleSettle() {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { updateEquation(true); }, 120);
  }

  /* ------------------------------------------------------------------
     Ball drag -- mirror p.onBallMouseMoveFunc:
       setDistance((mouseX - xOffset - originX) / rInPixels)
     where xOffset = mouseX(at press) - ballX. Pointer events cover mouse+touch.
  ------------------------------------------------------------------ */
  function stageCoordsFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = STAGE_W / rect.width;
    const scaleY = VIEW_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY + VIEW_Y0
    };
  }
  let xOffset = 0;
  function ballHitTest(p) {
    const bx = ORIGIN_X + R_IN_PIXELS * state.distance;
    const by = CENTER_Y;
    const pr = R_IN_PIXELS * state.diameter / 2;
    const hit = Math.max(pr, 16); // generous touch target around the object
    const dx = p.x - bx, dy = p.y - by;
    return (dx * dx + dy * dy) <= hit * hit;
  }
  canvas.addEventListener('pointerdown', (e) => {
    const p = stageCoordsFromEvent(e);
    if (!ballHitTest(p)) return;
    dragging = true;
    const ballX = ORIGIN_X + R_IN_PIXELS * state.distance;
    xOffset = p.x - ballX;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = stageCoordsFromEvent(e);
    setDistance((p.x - xOffset - ORIGIN_X) / R_IN_PIXELS);
    alphaResult.textContent = toFixedAS(lastApproxAlpha, 1) + ' arcsec';
    e.preventDefault();
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    announceState();
    updateEquation(false);
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  /* ------------------------------------------------------------------
     Slider + field controls.
  ------------------------------------------------------------------ */
  distRange.addEventListener('input', () => {
    setDistance(parseFloat(distRange.value));
    alphaResult.textContent = toFixedAS(lastApproxAlpha, 1) + ' arcsec';
  });
  distRange.addEventListener('change', () => { announceState(); updateEquation(false); });

  diamRange.addEventListener('input', () => {
    setDiameter(parseFloat(diamRange.value));
    alphaResult.textContent = toFixedAS(lastApproxAlpha, 1) + ' arcsec';
  });
  diamRange.addEventListener('change', () => { announceState(); updateEquation(false); });

  function commitField(field, cfg, setter) {
    const v = parseFloat(field.value);
    if (isFinite(v) && !isNaN(v)) {
      setter(v);
    } else {
      // restore the displayed value
      syncControls();
    }
    announceState();
    updateEquation(false);
  }
  distField.addEventListener('change', () => commitField(distField, DISTANCE, setDistance));
  distField.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); distField.blur(); } });
  diamField.addEventListener('change', () => commitField(diamField, DIAMETER, setDiameter));
  diamField.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); diamField.blur(); } });

  /* ------------------------------------------------------------------
     Preset buttons -- mirror the "Fire Photon Button" instances wired to
     easeToDistance / easeToDiameter with their id as the target value.
  ------------------------------------------------------------------ */
  document.querySelectorAll('button[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = parseFloat(btn.dataset.value);
      if (btn.dataset.preset === 'distance') easeToDistance(value);
      else easeToDiameter(value);
    });
  });

  /* ------------------------------------------------------------------
     Reset -- the masthead dispatches "sim-reset"; restore exact initial state
     (p.onReset: distance = 40, diameter = 2).
  ------------------------------------------------------------------ */
  document.addEventListener('sim-reset', () => {
    state.distance = RESET.distance;
    state.diameter = RESET.diameter;
    lastDistance = state.distance;
    lastDiameter = state.diameter;
    distanceEaser.init(state.distance);
    diameterEaser.init(state.diameter);
    refresh();
    syncControls();
    announceState();
    updateEquation(false);
  });

  /* ------------------------------------------------------------------
     Canvas backing resolution (crispness on HiDPI). Internal drawing always
     uses original stage coordinates; CSS scales the element to fit the panel.
  ------------------------------------------------------------------ */
  function resizeBacking() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = STAGE_W * dpr;
    canvas.height = VIEW_H * dpr;
    refresh();
  }
  window.addEventListener('resize', resizeBacking);

  /* ------------------------------------------------------------------
     Boot.
  ------------------------------------------------------------------ */
  // Redefine the foundation's klunlInitEqn so it initializes our equation.
  window.klunlInitEqn = function () { updateEquation(false); };

  function boot() {
    resizeBacking();         // sets backing size + first refresh
    syncControls();
    updateEquation(false);
    announceState();
    requestAnimationFrame(tick);
  }

  // Draw again as assets arrive.
  personImg.addEventListener('load', refresh);
  ballImg.addEventListener('load', refresh);

  boot();
})();
