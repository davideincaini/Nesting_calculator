# Prepreg Nesting Calculator

A Progressive Web App (PWA) for calculating how much prepreg roll length is needed to cut a given number of patches — with optimized nesting at both 0° and 45° orientations.

Built for real shop-floor use on iPhone, from direct experience in composite materials production.

https://davideincaini.github.io/Nesting_calculator/
---

## The Problem

In prepreg composite manufacturing, ply cutting efficiency directly affects material cost and waste. A patch cut at 45° occupies a larger footprint on the roll than the same patch cut at 0° — and the nesting geometry changes completely. Manually calculating roll consumption with multiple orientations and quantities is error-prone and time-consuming.

This tool automates the calculation and gives the operator the exact roll length to pull, with waste percentage, before making a single cut.

---

## Inputs

| Parameter | Unit | Description |
|---|---|---|
| `roll_width` | mm | Width of the prepreg roll |
| `patch_length` | mm | Length of the single patch |
| `patch_width` | mm | Width of the single patch |
| `orientation` | 0° or 45° | Fiber/cut angle |
| `quantity` | int | Number of patches required |

## Outputs

- **Total roll length** required (in meters)
- **Waste percentage** (sfrido) — material consumed but not used in patches
- Result always rounded up to guarantee complete patches — no partial cuts

---

## Nesting Logic

**0° orientation** — standard grid layout. Patches are arranged in rows across the roll width, calculating how many fit per row and how many rows are needed.

**45° orientation** — diagonal footprint is computed accounting for the rotated bounding box. The nesting algorithm optimizes the interlock between adjacent patches to minimize the effective pitch along the roll.

The 45° case is the non-trivial one: a naive calculation (treating the rotated patch as a simple diagonal rectangle) significantly overestimates material consumption. The optimizer reduces this gap.

---

## Technical Stack

- **PWA** — installable on iPhone, works offline via Service Worker (`sw.js`)
- **iOS-native feel** — `backdrop-filter: blur()`, `safe-area-inset` for notch/Dynamic Island, SF Symbol-equivalent icons
- **No dependencies** — pure HTML / CSS / JavaScript, no frameworks
- **Math verification** — `math_check.js` and `test_verification.js` contain independent checks of the nesting geometry calculations

---

## Files

| File | Role |
|---|---|
| `index.html` | App shell and UI |
| `app.js` | Core calculation logic and UI interactions |
| `math_check.js` | Independent verification of nesting geometry |
| `test_verification.js` | Unit tests for edge cases |
| `style.css` | iOS-style responsive layout |
| `sw.js` | Service Worker for offline caching |
| `manifest.json` | PWA manifest (name, icons, display mode) |

---

## Context

Built by a process engineer with 7 years in composite manufacturing. The 45° nesting optimization came directly from observing systematic material overestimation during manual kitting operations on the shop floor.

---

*Part of [Davide Incaini's portfolio](https://github.com/davideincaini)*
