# Comprehensive Guide: Building Pencil AI Jewelry CAD & Commerce Platform

This guide provides a complete, step-by-step technical blueprint for creating **Pencil** ([pencildesign.co](https://pencildesign.co)) — an AI-powered 3D CAD and jewelry commerce application.

---

## Table of Contents
1. [Architecture & System Overview](#1-architecture--system-overview)
2. [Mathematical Foundations & Algorithms](#2-mathematical-foundations--algorithms)
3. [File System & Directory Structure](#3-file-system--directory-structure)
4. [Step-by-Step Code Implementation](#4-step-by-step-code-implementation)
   - [4.1 Gemstone Facet Geometries (`js/gemstones.js`)](#41-gemstone-facet-geometries)
   - [4.2 Parametric 3D CAD Engine (`js/cad-engine.js`)](#42-parametric-3d-cad-engine)
   - [4.3 Watertight Binary STL Exporter (`js/stl-exporter.js`)](#43-watertight-binary-stl-exporter)
   - [4.4 Live Quoting & Feasibility Engine (`js/pricing-engine.js`)](#44-live-quoting--feasibility-engine)
   - [4.5 Agentic AI Design Assistant (`js/ai-designer.js`)](#45-agentic-ai-design-assistant)
   - [4.6 Jeweler's Specification Blueprint (`js/spec-sheet.js`)](#46-jewelers-specification-blueprint)
   - [4.7 Luxury UI & Stylesheet (`css/pencil.css`)](#47-luxury-ui--stylesheet)
   - [4.8 Event & Telemetry Controller (`js/ui-controller.js`)](#48-event--telemetry-controller)
   - [4.9 Application Entry Point (`index.html`)](#49-application-entry-point)
5. [Running & Local Deployment](#5-running--local-deployment)
6. [E-Commerce & Shopify Embed Guide](#6-e-commerce--shopify-embed-guide)

---

## 1. Architecture & System Overview

Pencil bridges traditional high-barrier jewelry CAD (Rhino, MatrixGold) and e-commerce configurators into a unified, zero-lag browser-based platform.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface & Controls                       │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ AI Natural Prompt Bar │  │ Parametric Sliders (Carat, Band, Prong)│ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Core Processing Layer                           │
│  ┌────────────────────────┐  ┌───────────────────┐  ┌────────────────┐ │
│  │  PencilAI (NLP Parser) │  │ Gemstone Geometry │  │ Pricing Engine │ │
│  └────────────────────────┘  └───────────────────┘  └────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        3D CAD Engine (Three.js)                        │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ WebGLRenderer + PBR Physical Materials (18K/14K Gold, Platinum)    │ │
│  │ High Refraction Gem Shaders (IOR 2.417) + Studio Environment Map   │ │
│  │ Parametric Band Extrusion + Basket Collar + Prongs + Hidden Halos  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Output & Production Layer                       │
│  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────────┐ │
│  │ Binary STL Export  │  │ CAD Spec Blueprint │  │ 4K Studio Renders │ │
│  │ (3D Wax Printing)  │  │ (PDF / Job Traveler│  │ (E-Commerce Store)│ │
│  └────────────────────┘  └────────────────────┘  └───────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Foundations & Algorithms

### 2.1 Gauss's Divergence Theorem for Watertight Volume
To compute the exact metal casting weight before production, the engine calculates the signed tetrahedral volume of every triangle in the watertight mesh:

$$\text{Volume} = \sum_{i=1}^{N_{\text{tri}}} \frac{1}{6} \left( \vec{v}_{1,i} \cdot (\vec{v}_{2,i} \times \vec{v}_{3,i}) \right)$$

Where:
- Scene units: $1\text{ unit} = 1\text{ mm}$
- Volume in $cm^3$: $\text{Volume}_{\text{mm}^3} \times 10^{-3}$
- Mass in grams: $\text{Mass} = \text{Volume}_{\text{cm}^3} \times \rho_{\text{alloy}}$
- Pennyweight ($dwt$): $\text{Mass}_{\text{grams}} / 1.55517$

#### Alloy Densities ($\rho$ in $g/cm^3$):
| Alloy | Density ($g/cm^3$) | Casting Shrinkage Factor |
|---|---|---|
| 18K Yellow Gold | 15.58 | +2.2% |
| 14K Yellow Gold | 13.07 | +2.0% |
| 18K White Gold | 14.70 | +2.3% |
| 14K White Gold | 12.90 | +2.1% |
| Rose Gold | 14.90 | +2.2% |
| Platinum 950 | 21.45 | +2.8% |
| Sterling Silver 925 | 10.36 | +1.8% |

### 2.2 Diamond Carat Estimation Formulas (from mm dimensions)
- **Round Brilliant**: $\text{Carat} = \text{diameter}^2 \times \text{depth} \times 0.0061$
- **Oval**: $\text{Carat} = \text{length} \times \text{width} \times \text{depth} \times 0.0062$
- **Emerald**: $\text{Carat} = \text{length} \times \text{width} \times \text{depth} \times 0.0092$
- **Princess**: $\text{Carat} = \text{width}^2 \times \text{depth} \times 0.0083$
- **Cushion**: $\text{Carat} = \text{length} \times \text{width} \times \text{depth} \times 0.0081$
- **Pear**: $\text{Carat} = \text{length} \times \text{width} \times \text{depth} \times 0.0060$

### 2.3 Parametric Shank Radial Sweep
The ring band cross-section $(p_x, p_z)$ is swept along the ring circle:
$$\vec{C}(\theta) = (R \cos\theta, R \sin\theta, 0)$$
$$\vec{V}(\theta, \phi) = \vec{C}(\theta) + p_x(\phi) \hat{N}_R(\theta) + p_z(\phi) \hat{B}_Z$$

Where:
- $R = \frac{\text{InnerDiameter}}{2} + \frac{\text{BandThickness}}{2}$
- $\theta \in [\frac{\pi}{2} + \frac{\alpha_{\text{gap}}}{2}, \frac{\pi}{2} - \frac{\alpha_{\text{gap}}}{2} + 2\pi]$ (keeping top head opening at $+\frac{\pi}{2}$)
- $p_x(\phi)$: Radial thickness profile (D-shape, knife-edge, comfort fit)
- $p_z(\phi)$: Lateral band width profile

---

## 3. File System & Directory Structure

```
pencil-design/
├── index.html              # Main responsive layout, CAD HUD, modals
├── README.md               # Quickstart and feature catalog
├── BUILD_GUIDE.md          # Comprehensive architectural & code guide
├── css/
│   └── pencil.css          # Luxury typography, range sliders, swatches
└── js/
    ├── gemstones.js        # 10 Faceted diamond/gem cut generators
    ├── cad-engine.js       # Core Three.js parametric jewelry engine
    ├── stl-exporter.js     # Production binary STL & OBJ exporter
    ├── pricing-engine.js   # Live metal spot pricing & feasibility checks
    ├── ai-designer.js      # Natural language prompt parser & rationale
    ├── spec-sheet.js       # Multi-view blueprint spec sheet generator
    └── ui-controller.js    # Event bindings & telemetry HUD controller
```

---

## 4. Step-by-Step Code Implementation

### 4.1 Gemstone Facet Geometries (`js/gemstones.js`)

This module generates faceted 3D polyhedral geometries for standard jewelry cuts:
- **Round Brilliant**: 57 facets (table, 8 star facets, 8 kite facets, 16 upper girdle, 16 lower girdle, 8 pavilion mains, 1 culet).
- **Emerald Cut**: 3 stepped crown octagons, flat table, 3 stepped pavilion octagons, and keel line.
- **Princess Cut**: Square inverted pyramid with chevron facets.
- **Oval, Cushion, Pear, Radiant, Marquise, Heart, Asscher**.

Key functions:
- `GemstoneLibrary.getDimensionsForCarat(shape, carat)`: Calculates standard $L \times W \times D$ in millimeters.
- `GemstoneLibrary.createGemstoneGeometry(shape, length, width, depth)`: Returns a `THREE.BufferGeometry` with computed vertex normals.

---

### 4.2 Parametric 3D CAD Engine (`js/cad-engine.js`)

#### Coordinate Alignment (Upright Orientation):
- The ring sits in the **XY plane** centered at $(0, 0, 0)$.
- The **finger hole** passes through along the **Z axis**.
- The **head, basket, and diamond** sit at the top ($+Y$ axis).
- The **center diamond table facet** points straight up along $+Y$ (`rotation.x = -Math.PI / 2`).
- The **bottom of the band** rests at $y = -(R_{\text{inner}} + \text{Thickness}) \approx -10.5\text{ mm}$ on the ground shadow plane.

#### Key Methods in `CADStudio`:
1. `initScene()`: Configures `WebGLRenderer` with `ACESFilmicToneMapping`, exposure $1.15$, soft shadows, and perspective camera.
2. `setupEnvironment()`: Generates a softbox studio reflection texture on a canvas cubemap for metallic shine and diamond dispersion.
3. `buildShankMesh(...)`: Sweeps the selected cross-section profile along the ring radius.
4. `buildHeadMesh(...)`: Builds setting collars, prongs (4-prong, 6-prong, double-claw, compass, bezel), gallery rail, and hidden halo.
5. `buildCenterGemMesh(...)`: Instantiates the faceted gemstone nestled inside prongs with high-transmission `MeshPhysicalMaterial`.
6. `exportSTL(filename)`: Triggers watertight binary STL generation.
7. `captureStudioPhoto(transparent)`: Takes a 4K studio photograph for product marketing.

---

### 4.3 Watertight Binary STL Exporter (`js/stl-exporter.js`)

Binary STL files require a 84-byte header followed by 50-byte triangle structs:
- **80 bytes**: ASCII header string (`Pencil Jewelry CAD 3D STL - Production-Ready Castable Mesh`).
- **4 bytes**: `uint32` Little Endian specifying total triangle count $N$.
- **$N \times 50$ bytes**:
  - `3 x float32` (12 bytes): Surface normal vector $(\hat{n}_x, \hat{n}_y, \hat{n}_z)$
  - `3 x float32` (12 bytes): Vertex 1 $(v_{1x}, v_{1y}, v_{1z})$
  - `3 x float32` (12 bytes): Vertex 2 $(v_{2x}, v_{2y}, v_{2z})$
  - `3 x float32` (12 bytes): Vertex 3 $(v_{3x}, v_{3y}, v_{3z})$
  - `uint16` (2 bytes): Attribute byte count ($= 0$)

---

### 4.4 Live Quoting & Feasibility Engine (`js/pricing-engine.js`)

Provides dynamic calculation of manufacturing metrics:
1. `calculateCostBreakdown(params)`:
   - Raw Metal Cost: $\text{Weight} \times \text{SpotRate}$
   - Casting Overhead: $+15\%$ for spruing and casting loss
   - Diamond Cost: Base rate scaled non-linearly by $\text{Carat}^{1.35}$ and adjusted by Color (D–I) and Clarity (FL–SI1)
   - Setting Labor: $\$65$ center setting, $\$6.50$ per pavé bead, $\$95$ lost-wax casting and polishing
   - Total Wholesale Cost & Keystone Retail MSRP ($2.15\times$ markup)
2. `checkManufacturingFeasibility(params)`:
   - Validates that band thickness $\ge 0.85\text{ mm}$ (preventing porosity and cracking).
   - Validates that prong diameter $\ge 0.65\text{ mm} + (\text{Carat} - 1.0) \times 0.12$.
   - Computes Casting Feasibility Score (0–100%) and "Cast Ready" badge.

---

### 4.5 Agentic AI Design Assistant (`js/ai-designer.js`)

Implements Pencil's signature AI design features:
1. `parsePrompt(text)`:
   - Extracts design intent: shape (e.g. *emerald cut*), carat (*2.5ct*), alloy (*18k yellow gold*), prongs (*double claw*), halo (*hidden halo*), band profile (*knife edge*), accents (*pave*), and engraving text.
2. `generateRationale(config, prompt)`:
   - Formulates an architectural design evaluation detailing light return, prong security, and visual balance.
3. `generateVariations(config)`:
   - Creates 4 distinctive style iterations: *Minimalist Chic*, *Vintage Romance*, *Modern Architectural*, and *High-Jewelry Pavé*.

---

### 4.6 Jeweler's Specification Blueprint (`js/spec-sheet.js`)

Renders a full-screen, printable CAD job traveler blueprint containing:
- Multi-view orthographic snapshots (Perspective, Top table view, Profile elevation).
- Job number and barcode.
- Alloy specifications, net metal weight ($g$ and $dwt$).
- Center stone millimeter dimensions ($L \times W \times D$).
- Finger size and internal diameter in millimeters.
- Goldsmith QA approval certification block.

---

## 5. Running & Local Deployment

### 5.1 Local Execution
Since the application uses standard modern Web APIs, Three.js, and Tailwind CSS, you can run it with any static web server:

```bash
# Using Python 3
python3 -m http.server 8080 --directory /path/to/pencil-design

# Or using Node.js npx serve
npx serve -l 8080 /path/to/pencil-design
```
Open **`http://localhost:8080`** in Chrome, Firefox, Safari, or Edge.

### 5.2 Production Web Deployment
Deploy the project to any static hosting provider:
- **Vercel**: Run `npx vercel`
- **Netlify**: Drag and drop the folder into Netlify Drop
- **GitHub Pages**: Push to repository and enable GitHub Pages on the `main` branch

---

## 6. E-Commerce & Shopify Embed Guide

Pencil's primary commercial utility is allowing jewelry storefronts to embed the configurator directly into product pages:

```html
<!-- Embed Pencil Configurator on Shopify / Webflow -->
<div class="pencil-embed-container" style="position: relative; width: 100%; height: 720px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
  <iframe 
    src="https://your-domain.com/index.html" 
    width="100%" 
    height="100%" 
    frameborder="0" 
    allow="camera; xr-spatial-tracking"
    loading="lazy">
  </iframe>
</div>
```

### Passing Configurations via URL Parameters
You can initialize the configurator with query parameters:
```javascript
// Example: https://your-domain.com/?shape=oval&carat=2.0&metal=platinum-950&prongs=double-claw
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('shape')) {
  cadStudio.updateConfig({
    gemShape: urlParams.get('shape'),
    carat: parseFloat(urlParams.get('carat') || 1.5),
    metalType: urlParams.get('metal') || '18k-yellow',
    headStyle: urlParams.get('prongs') || '4-prong'
  });
}
```

---

## Summary Checklist
- [x] 10 standard diamond & gemstone cuts with accurate 3D facets.
- [x] Parametric shank sweep with D-shape, Comfort Fit, Flat, and Knife-Edge profiles.
- [x] 4-prong, 6-prong, double-claw, compass, and full bezel mountings.
- [x] Hidden halo under gallery rail and classic micro-pavé halo collar.
- [x] Upright orientation with gemstone table facing straight up ($+Y$).
- [x] Live weight calculation in grams & pennyweight via divergence theorem.
- [x] Binary STL export optimized for direct 3D wax printing.
- [x] Natural language AI prompt interpreter with 4 instant variations.
- [x] Printable orthographic Jeweler's Specification Blueprint.
- [x] Customer-facing storefront mode and embeddable iframe snippet.
