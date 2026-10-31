# Aurix PRD

Last updated: 2026-10-18

## Overview

Aurix is a browser-based 3D jewelry CAD studio that lets anyone design a ring, see a live price and manufacturing check, and export a castable file, with no CAD training.

Professional jewelry CAD (Rhino, MatrixGold) takes weeks to learn, and consumer configurators stop at a picture. Aurix closes that gap: a designer, jeweler or storefront shopper describes a ring in plain language or moves sliders, and the 3D model, weight, price and cast-readiness update instantly. It is a static, client-side web app (Three.js) with no backend today.

The product is modelled on the category of AI jewelry design platforms such as Pencil. It needs its own brand, copy and imagery (see `DESIGN_GUIDELINES.md`).

## Goals and non-goals

**Goals**

- A first-time user reaches a ring they like within 2 minutes, using a text prompt or sliders.
- Every change updates the 3D model, price and cast-readiness check in real time.
- Exported STL files are production-usable for wax printing and casting.
- The configurator can be embedded on a jeweler's storefront and shared by link.

**Non-goals (current version)**

- Other jewelry types (earrings, pendants, bracelets): rings only.
- Free-form sculpting or arbitrary CAD modelling beyond the parametric options.
- Live market pricing: metal and stone rates are indicative placeholders.
- A generative AI model: the assistant is a rule-based interpreter that runs offline.
- Real checkout, accounts and order fulfilment: "Add to bag" is a demo stub.

## Target users and use cases

| User | Need | Primary use case |
| --- | --- | --- |
| Independent jewelry designer | Fast concepts without Rhino or MatrixGold | Prompt or tweak a design, export STL for the caster |
| Jeweler or bench goldsmith | Know if a design will cast before quoting | Read feasibility warnings, print the spec sheet as a job traveler |
| Storefront shopper | Customize a ring and see the price | Configure, then copy a share link or add to bag |
| Storefront owner | Put a custom-ring tool on their site | Embed the configurator in an iframe, pre-set via URL parameters |

## Features and functional requirements

All rows below exist in the current prototype unless marked as a gap.

| ID | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| F1 | AI design assistant | Parse a free-text prompt into shape, stone, carat, metal, prongs, halo, pavé, band profile, size and engraving; show a short design rationale; offer 4 style variations (Minimalist Chic, Vintage Romance, Modern Architectural, High-Jewelry Pavé) | P0 |
| F2 | Center stone | 10 cuts (round, oval, emerald, princess, cushion, pear, radiant, marquise, heart, asscher) and 10 stone types; carat 0.3 to 5.0; stone rotation; diamond color D to I and clarity FL to SI1 | P0 |
| F3 | Setting | Head styles: 4-prong, 6-prong, double-claw, compass, bezel; prong diameter 0.4 to 1.6 mm; halo none, hidden or classic pavé; shank pavé none, half or full eternity | P0 |
| F4 | Band | Profiles D-shape, comfort, flat, knife-edge; thickness 0.6 to 3.0 mm; width 1.4 to 8.0 mm; US size 3 to 13; inside-band engraving up to 24 characters | P0 |
| F5 | Metal | 7 alloys: 14K and 18K yellow, 14K and 18K white, 14K rose, Platinum 950, Sterling 925, with physically based materials | P0 |
| F6 | Live quote | Metal weight (g and dwt) from mesh volume, wholesale cost breakdown, and retail price at a 2.15x keystone markup | P0 |
| F7 | Feasibility check | Error and warning rules (e.g. band under 0.85 mm, prongs too slim for the carat, band under 2.0 mm with pavé); 0 to 100 score and a Cast Ready badge at 80 or more with no errors | P0 |
| F8 | STL export | Watertight binary STL with casting shrinkage compensation per alloy | P0 |
| F9 | Spec sheet | Printable job traveler: multi-view snapshots, alloy, weight, stone dimensions, finger size, QA block | P1 |
| F10 | Studio photo | 4K transparent-background render download | P1 |
| F11 | Storefront mode and sharing | Customer view with price and Add to bag; Copy link encodes the configuration in URL parameters; embeddable in an iframe | P1 |
| F12 | Checkout (gap) | Connect Add to bag to a real cart (e.g. Shopify); currently a demo message | P2 |
| F13 | Live pricing (gap) | Replace the placeholder metal and stone rates with a supplier or market feed | P2 |
| F14 | Save designs (gap) | Accounts and saved designs; currently nothing persists | P2 |

## Design and UX requirements

The interface follows the repo's design guidelines: a quiet monochrome canvas, with the jewelry as the only strong color.

- **Layout:** a left controls panel (AI, stone, setting, band, metal), a central 3D viewport, and overlay HUDs for the quote and the feasibility status.
- **Typography and color:** Inter for the interface, Cormorant Garamond for the wordmark; near-black `#0C0407` text on white and off-white; `#4C6FFF` as the only accent, used sparingly.
- **Surfaces:** rounded corners, 1px hairline borders and soft layered shadows; about 80px between page sections on marketing pages.
- **Interaction:** drag to rotate, scroll to zoom, focus-on-stone and auto-rotate toggles; every control change redraws within one frame budget on a typical laptop.
- **Feedback:** toasts for exports, copy and AI parsing failures; status regions announced to screen readers.
- **Accessibility:** labelled controls, text contrast of at least 4.5:1, keyboard-operable buttons and chips.
- **Responsive:** the controls panel must remain usable at phone width (not yet verified in the prototype).

## Technical approach and constraints

The app is static HTML, CSS and vanilla JavaScript modules loaded by script tags; the interface calls the logic modules, and all of them feed one Three.js scene.

| Layer | Modules |
| --- | --- |
| Interface | `index.html` + `css/aurix.css` (controls, HUD, spec modal); `js/ui-controller.js` (events, URL parameters, toasts) |
| Design logic | `js/ai-designer.js` (prompt parser, 4 variations); `js/gemstones.js` (10 cuts, 10 stone types); `js/pricing-engine.js` (cost, weight, cast checks) |
| 3D engine | `js/cad-engine.js` (Three.js 0.152: parametric shank, head, stone, halo and pavé; physically based metal and gem materials) |
| Outputs | `js/stl-exporter.js` (binary STL, shrinkage added); `js/spec-sheet.js` (printable job traveler); studio photo (4K transparent PNG) |

- **Stack:** Three.js 0.152.2 from a CDN, Google Fonts, no build step, no backend. Any static host works (Vercel, Netlify, GitHub Pages).
- **Units and geometry:** 1 scene unit = 1 mm; the ring sits in the XY plane with the head on +Y and the stone table facing up.
- **Weight:** exact metal weight from the signed tetrahedral volume of the watertight mesh, times alloy density.
- **Export:** binary STL (80-byte header, 50 bytes per triangle) scaled up per alloy for casting shrinkage.
- **State:** one configuration object drives everything; Copy link serializes it to URL parameters (shape, stone, carat, metal, prongs, halo, accents, profile, size, rotation).
- **Constraints:** requires WebGL and a CDN connection for Three.js; pricing constants are placeholders; large pavé counts and 4K renders depend on the user's GPU.

## Success metrics, milestones, risks and open questions

**Proposed success metrics** (targets are proposals; no analytics exist yet to baseline them)

| Metric | Target |
| --- | --- |
| Time from first visit to a configured ring | Under 2 minutes for the median user |
| Sessions that use the AI prompt | At least 40% |
| Sessions ending in STL export, Copy link or Add to bag | At least 25% |
| Exported designs flagged Cast Ready | At least 90% |
| Interaction frame rate on a mid-range laptop | 30 fps or better |

**Milestones**

1. **Prototype (done):** configurator, AI parser, pricing, feasibility, STL, spec sheet, share links.
2. **Production readiness:** analytics, mobile layout, validation of STL output with a real caster, browser test matrix.
3. **Commerce:** real cart integration, live metal and stone pricing, embed documentation.
4. **Accounts:** saved designs, order history, jeweler-specific rate cards.

**Risks**

- Placeholder prices may be read as real quotes: label them as estimates until a live feed exists.
- STL files have not been verified by a caster: shrinkage and minimum-wall rules need real-world validation.
- Heavy WebGL scenes may stutter on low-end phones.
- The look is modelled on an existing product: Aurix needs its own brand, copy and imagery before launch.

**Open questions**

- [ ] Who is the primary buyer: independent designers, jewelers, or storefront owners?
- [ ] Is Aurix sold per seat, per storefront embed, or per exported design?
- [ ] Should the AI assistant stay rule-based, or move to a language model for open-ended prompts?
- [ ] Which jewelry types come after rings?
