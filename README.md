# Small-Angle Approximation Demonstrator (HTML5)

An accessible HTML5 port of the original Adobe Flash simulation
`smallAngleDemo003`, built on the shared KL-UNL foundation.

## This sim must be served over HTTP. It will NOT run from a double-clicked `file://` path.

**Why:** the KL-UNL masthead component (`foundation/kl-unl-masthead.js`) loads the
title, About, and Help text by calling `fetch('foundation/contents.json')`.
Browsers block `fetch()` of local files under the `file://` protocol (same-origin
security policy), so opening `index.html` directly shows an empty or broken
masthead. Served over HTTP the fetch succeeds and the sim loads normally.

## How to run locally

Open a terminal **inside this `html5/` folder**, start a static server, then open
the link below in your browser:

```
python3 -m http.server 8123
```

**Link to paste in your browser:** http://localhost:8123/

(Other servers work too — e.g. `npx serve` or the VS Code "Live Server" extension.
Because you serve from inside `html5/`, the sim is at the server root, so the URL is
`http://localhost:8123/`, not `.../html5/index.html`.)

## Production

When deployed to the cloud host (served over HTTP/HTTPS) it just works. The
`file://` limitation only affects local double-clicking.

## What's here

```
index.html          KL-UNL scaffold: <kl-unl-masthead> + equation / diagram / controls panels
foundation/         shared KL-UNL files, copied in UNCHANGED
                      (kl-unl-masthead.js, kl-unl.css, kl-unl.js, contents.json)
styles/styles.css   sim-specific styles only (shared style comes from kl-unl.css)
simulation.js       all sim logic (geometry, sliders, easing, drag, reset)
assets/             exported art reused as-is: person.png (observer), ball.png (object)
CONVERSION_NOTES.md behavior model, AS->HTML5 mapping, assets reused vs redrawn, deviations
ACCESSIBILITY.md    WCAG affordances, ARIA, keyboard map, live-region wording
```

No build step, no bundler, no framework, no CDN, no analytics. The only runtime
network request is the local fetch of `foundation/contents.json` by the masthead.
