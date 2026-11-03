# Opportunity Scan: Custom Jewelry Production (Aurix)

Date: 2026-10-27
Problem space: US custom jewelry production, where CAD design is slow and expensive and requires scarce specialist designers (from "Ideas for Discovery Report.docx").

**Verification legend:** [V] = I opened the page and read it. [S] = seen only in a search-result summary; the page was not opened (blocked or not fetched), so check before relying on it. [E] = my own estimate or inference, not sourced. Anything not listed here was not found.

---

## 1. Who has this problem, and how many are there in the US?

### Segments
1. **Retail jewelers offering custom work** (independents and chains) that need CAD files for custom rings and pieces.
2. **Jewelry manufacturers and CAD/CAM houses**.
3. **Bench jewelers and designers**, many self-employed.
4. **Online and small custom sellers** (Etsy-type). No reliable count found.

### Numbers found (these conflict; definitions differ)
| Figure | Value | Source | Status |
|---|---|---|---|
| **Jewelry stores with payroll, 2022 (Census CBP, NAICS 448310)** | **19,348 establishments, 101,280 employees; 10,917 have <5 employees, 5,754 have 5-9, 2,252 have 10-19, 380 have 20-49, 43 have 50+** | https://data.census.gov/table/CBP2022.CB2200CBP?q=NAICS+448310+jewelry+stores&y=2022 | [V] (read via browser) |
| **Jewelry & silverware manufacturers with payroll, 2022 (Census CBP, NAICS 339910)** | **1,879 establishments, 19,899 employees; 1,256 have <5 employees, 298 have 5-9, 146 have 10-19, 117 have 20-49** | https://data.census.gov/table/CBP2022.CB2200CBP?q=NAICS+339910+jewelry&y=2022 | [V] (read via browser) |
| Jewelry stores in the US, 2023 | ~17,600 (Signet data) | https://statista.com/statistics/1074786/number-of-jewelry-stores-in-the-us | [S] |
| Jewelry stores, 2022 → 2023 | 62,722 → 61,892 | https://oberlo.com/statistics/how-many-jewelry-stores-are-there-in-the-united-states | [S] |
| Jewelry store businesses, 2025 / 2026 | 74,245 / 73,980 (IBISWorld's NAICS category appears to include online and mail-order sellers) | https://www.ibisworld.com/industry-statistics/number-of-businesses/jewelry-stores-united-states/ | [S] |
| Retailers in North America (Jewelers Board of Trade, 2016; dated) | 21,541 (20,666 excluding Canada) | https://nationaljeweler.com/independents/retail-surveys/7371-the-industry-shrank-by-4-last-year-jbt-data-shows | [S] |
| Jewelers and precious stone and metal workers, employment, 2025 | 32,800 jobs; median pay $52,540; projected -3% for 2025-35; 32% self-employed | https://www.bls.gov/ooh/production/jewelers-and-precious-stone-and-metal-workers.htm | [V] |
| BLS openings | ~4,000 per year, all from replacement (earlier edition of the page, 2024-34) | https://www.bls.gov/ooh/production/jewelers-and-precious-stone-and-metal-workers.htm | [S] |
| Jewelry manufacturing establishments with payroll (NAICS 339911), 2002 | 2,290 (very dated) | https://webarchive.library.unt.edu/web/20080920105120/http:/www.census.gov/epcd/ec97/industry/E339.HTM | [S] |
| Custom jewelry services market, global, 2025 | $3.95B, ~9% annual growth | https://www.giiresearch.com/report/tbrc1769888-custom-jewelry-service-global-market-report.html | [S] |
| Share of couples choosing custom wedding bands, 2025 | 68% (National Jewelers Association prediction, via Global Market Insights) | https://www.gminsights.com/industry-analysis/wedding-ring-market/amp | [S], a prediction and survey-based |
| US jewelry market size | $40.93B (2025, Polaris) vs $78.40B (2024, Arizton): too far apart to reconcile | https://www.polarismarketresearch.com/industry-analysis/us-jewelry-market ; https://www.arizton.com/market-reports/us-jewelry-market | [S] |

### Demand signal for CAD/custom labor
A Rapaport article quotes recruiters describing the hardest bench-jeweler hiring in 25 years, and rising demand for custom work and CAD/CAM. Article date not shown. https://rapaport.com/magazine-article/tackling-the-bench-jeweler-shortage/ [S]

### My estimate (reasoning shown) [E]
- The Census count settles the base: **19,348 retail jewelry stores and 1,879 jewelry manufacturers with payroll in 2022** (about 21,200 establishments), which agrees with the Statista and JBT figures and shows the 62,000-74,000 figures are broader definitions. Census CBP covers employer establishments only, so sole proprietors without payroll (many independent designers and online sellers) are excluded.
- About 56% of the retailers (10,917) have fewer than 5 employees, and 86% (16,671) have under 10. These are the shops least able to hire a dedicated CAD designer, which is the likeliest fit for a hosted design tool [E].
- What share offers custom work needing CAD is **not found**. If, say, a quarter to a half do, that is on the order of 5,000-10,000 retailers. This share is a guess, not data. A survey or a Jewelers of America membership analysis would replace it.
- Add the 1,879 manufacturers and an unknown number of non-employer designers and online sellers (BLS: 32,800 jewelers, one-third self-employed, about 10,000).
- **Do not quote a single market number to investors from this section yet.**

### Not verified
- Census counts are now filled (see table). Non-employer businesses (no payroll) are not in CBP; the Census Nonemployer Statistics would cover them and were not checked.
- Number of custom-capable jewelers, number of CAD designers employed, and Etsy custom-jewelry seller count.

---

## 2. What do they use today?

### Design software
- **Rhino (McNeel)** with jewelry plug-ins **RhinoGold**, **Rhinojewel**, and **Matrix (Gemvision)**; also 3Design, FreeForm, ArtCAM JewelSmith, SolidWorks, ZBrush, MOI, JewelSmith, CounterSketch. 2011 list prices: Rhino $975, RhinoGold $2,100, Rhinojewel $1,595, 3Design $6,600 + $1,500 training, FreeForm $9,900, JewelSmith $7,500, Matrix $6,700. https://jckonline.com/?p=22766 (JCK, April 28, 2011) [V]. These are 15-year-old prices.
- A later forum poster put RhinoGold at about $5,200 and Matrix over $6,000 (undated in my notes); Matrix and RhinoGold are now both owned by Stuller per a forum post. https://orchid.ganoksin.com/t/rhino-rhinogold-vs-matrix/36962 and https://orchid.ganoksin.com/t/cad-decision-any-thoughts-or-direction/40598 [S for the price; V for the thread contents]
- Learning time: Rhino proficiency 6-12 weeks; Matrix 6 months to a year to be "pretty proficient" (JCK, 2011) [V].
- Shop-specific tools: wJewel, The Jewel Software, The Edge, Valigara are mostly store-management systems, not design tools. https://www.capterra.com/p/118049/wJewel/reviews/ [S]

### Outsourced CAD / manual workarounds
- **CAD rendering services**: e.g., a Minnesota shop sells $79/$125 rendering tiers, about two weeks, $50 per extra revision after two free rounds. https://jewelrybyjohan.com/shop/custom-jewelry-option-cad-rendering-1561/ [S]
- **Free or low-cost first CAD with an order** at production houses: White Pine, up to $75-$100 (their two pages disagree). https://www.whitepinediamonds.com/cad-jewelry-design.html [S]
- **CAD fee credited toward production**, drafts in 2-5 business days (IceClique). https://iceclique.com/products/3d-cad-deposit-for-custom-project [S]
- **Freelancers on Fiverr**: a $50 listing, 1-3 day turnaround (seller claim, two buyer reviews). https://fiverr.com/jewellryexpert/create-3d-cad-jewelry-designs-for-printing [S]
- **Hand wax carving and mill-only CAM services** for jewelers without CAD: 2004 prices of $125 (simple ring) to $200 (complex ring with stones). https://orchid.ganoksin.com/t/pricing-cad-cam-service/24240 [V] (dated)
- **Finished piece lead times**: 4-6 weeks at one vendor; 12-14 business days at another. https://25karats.com/custom-design-jewelry [S]
- **Hiring in-house CAD designers**: for example a Colorado retailer wanting 3+ years of Matrix/Rhino experience. https://rapaport.com/magazine-article/tackling-the-bench-jeweler-shortage/ [S]

### Not found
- Spreadsheet-based workflows (quote/order tracking). I did not find sourced evidence of these; common sense says they exist, but that is [E].

---

## 3. Complaints about current solutions

**Search limits, stated plainly:** Reddit is blocked for my search tool, so there are **no Reddit quotes**. I did not search app stores. G2/Capterra/Software Advice pages returned 403 when opened, so their quotes below come from a search-result summary and are marked [S]. The Ganoksin quotes are from pages I read [V], but they are **old (2004-2013)**; treat them as evidence the pain is long-standing, not current. Only 10 are listed because I could not find more reliable ones; a few are about store-management software rather than design software.

| # | Quote | Where | Status |
|---|---|---|---|
| 1 | "The expense of the software and computers, the time you will invest in learning" - EricM, Jun 1, 2013 | https://orchid.ganoksin.com/t/cad-decision-any-thoughts-or-direction/40598 | [V] |
| 2 | "it takes about the same amount of time to CAD a model as it does to carve." - EricM, Jun 1, 2013 | same | [V] |
| 3 | "to show 4 renderings you have to build 4 differnet models" - Mark_Parkinson3, Jun 2, 2013 | same | [V] |
| 4 | "the renderings, although beautiful are not quite realistic" - Mark_Parkinson3, Jun 2, 2013 | same | [V] |
| 5 | "your cost only allows you 2 upgrades, that means if you want to keep current you have to buy a whole new program in 1-2 years." - tangoscloset, Apr 27, 2009 | https://orchid.ganoksin.com/t/rhino-rhinogold-vs-matrix/36962 | [V] |
| 6 | "When I studied Matrix it was extremely expensive and basically the classes spent 9/10th of the time working on Rhino" - tangoscloset, Apr 27, 2009 | same | [V] |
| 7 | "many jewelers don't have the time or the inclination to own/operate the CAD side of the equation." - Mary_Linford, Nov 30, 2004 | https://orchid.ganoksin.com/t/pricing-cad-cam-service/24240 | [V] |
| 8 | Rhino reviewer: "more than half of my team gave up on trying to learn it" | https://www.softwareadvice.com/fashion-design/jewelry-modeling-profile/reviews/ | [S], wording from search summary |
| 9 | Rhino reviewer: "There are still frustrations with occasional failed procedures. (E.g., boolean operations, chamfers and fillets, etc.)" | same | [S] |
| 10 | wJewel reviewer: "trying to sync the software with both our Shopify and QuickBooks account was a nightmare." | https://www.capterra.com/p/118049/wJewel/reviews/ | [S]; store-management tool, not CAD |

Other findings: Ganoksin 2010 poster says one CAD package "needed 2 instructors to teach 6 students" (https://orchid.ganoksin.com/t/fastest-learning-curve-cad/45547) [V]. A forum thread on CAD service pricing reported no cost complaints at all, so cost complaints are real but not universal.

**Retry result (2026-10-27):** I tried again through the built-in browser; it refuses Reddit ("not allowed due to safety restrictions"). Claude in Chrome was not connected, so that route failed too. App-store reviews were not attempted. **To close the gap:** pull recent Reddit threads (r/jewelrymaking, r/Jewelry, r/rhino, r/3Dprinting) and app-store reviews yourself, or connect the Chrome extension and I can retry.

---

## 4. Why might this be newly solvable with AI in 2026?

What the sources show changed in 2026 is that AI design generation shipped inside jewelry CAD products:
- **Diatech Studio image-to-CAD, Feb 19, 2026**: analyzes reference images and generates CAD components (motifs, prongs, connectors). Press release; company claims, no measured time savings. Limits stated: component-level only, human experts still needed for structural validation, stone-setting precision and casting feasibility; geometric accuracy and stone-setting calibration listed as future work. https://www.tribuneindia.com/news/business/diatech-pioneering-ai-powered-image-to-cad-technology-for-the-global-jewelry-industry/ [V]
- **Pencil, AI jewellery CAD design agent, reported May 2026**: natural-language prompts to jewelry designs; rings first, more categories to follow; usable by design teams, store staff and shoppers. I could not open the article (403), so details are [S]. https://jewellerymonthly.co.uk/pencil-launches-ai-jewellery-cad-design-agent/
- **RhinoArtisan 7.0 Generative AI Studio, announced July 13, 2026**: text-to-organic-3D models, sketch-to-photoreal images, short promo videos, powered by FAL.AI third-party models. The post lists no limitations and is vendor marketing. https://rhinoartisan.com/blog/generative-ai-for-jewelry-design/ [V]
- A vendor newsletter (Neural4D, undated) says AI models still need human oversight for stone settings and wall thickness; its other statistics are unverified and I would not use them. https://newsletter.neural4d.com/p/ai-3d-jewelry-modeling-5-proven-steps-from-concept-to-stl [S]

### What I can and cannot say
- **Supported by sources:** generative text/image-to-3D features became available inside jewelry design tools during 2026, and the same sources say output is not production-ready without expert checks.
- **Not supported by sources [E]:** the specific underlying model advances (for example, image-to-3D mesh quality or parametric generation improvements) and their dates. I have not cited those and they should be researched before the report names a capability or date.
- **Implication for Aurix [E]:** incumbents are already adding AI, so "AI makes CAD faster" alone is not a moat. The gaps the sources identify (stone settings, wall thickness, casting feasibility, accurate dimensions) point toward template/parametric designers with manufacturing rules built in, which matches Aurix's ring/nameplate/earring/pendant designers and the advanced designer for accurate dimensions. That fit is my inference.

---

## 5. Review themes (last 18 months) and what companies pay humans to do (added 2026-10-27)

Assumptions: "category of tool" = jewelry CAD design software; "the task" = jewelry CAD design; "last 18 months" = since about 2025-04-27.

### 5a. Review complaints: could not be completed for the window
- **Capterra** (https://www.capterra.com/p/58468/Jewelry-Modeling/reviews/) and **G2** (https://www.g2.com/products/rhinoceros/reviews) block automated browsing with bot checks ("Performing security verification" / "Access is temporarily restricted"). I did not attempt to get around them.
- **Software Advice**, Rhino 7 (the product Capterra lists under jewelry modeling), opened fine. Sorted newest first, **the newest of its 92 reviews is March 2025, before the window**, so there are zero in-window reviews to theme. https://www.softwareadvice.com/fashion-design/jewelry-modeling-profile/reviews/ [V]
- **Jewelry-specific tools** (Matrix, RhinoGold, 3Design) have no review pages I could find on these sites. Rhino is a general 3D tool, so these reviews are mostly architecture and industrial design, not jewelry.
- **App stores:** I found no App Store or Google Play reviews of jewelry CAD tools. Search turned up only Shopify plugin listings for jewelers (Pencil, VDB Ring Builder, Custom Ring Builder at $99/month), which have 0-12 reviews and are mostly positive. https://apps.shopify.com/pencil-shop/reviews [S]

**Closest available (outside the window): the 10 newest Software Advice Rhino 7 reviews, Aug 2023 to Mar 2025.** n=10 is too small to rank themes; counts are of these 10 only.

| Theme | Count (of 10) | Verbatim quotes | Product or pricing? |
|---|---|---|---|
| Steep learning curve / unintuitive | 4 | "User Interface is slow to learn, and is initially very confusing for beginners." (Dec 2024); "Rhino can be complex for an inexperienced CAD user to start with." (Jan 2024); "Not very intuitive, it requiered a good base trainning." (Aug 2023) | Product |
| Cost / upgrade prices | 2 | "Mainly cost since if is quite nore expensive than others around" (Jan 2024); German review (Feb 2024) titled "Überteuerte Upgrades" says upgrade prices are excessive for long-time customers. Only two found, so no third quote. | Pricing |
| Missing or weak features | 2 | "Rhino 7 does not offer presets of walls, doors and windows." (Dec 2024); "Rendering very limited when compared with other programs." (Aug 2023); one more is out of the 10: "Rhino's rendering can be buggy at times" (Jul 2023, same page) | Product |

All three quote groups come from https://www.softwareadvice.com/fashion-design/jewelry-modeling-profile/reviews/ [V]. Several reviews are marked "incentivized" by the site.

### 5b. What companies pay humans to do (jewelry CAD job postings)

| Employer | Pay | Software / experience | Source | Status |
|---|---|---|---|---|
| David Yurman, CAD Designer, Tribeca NY, full time, posted 2026-04-22, expired 2026-07-01 | $52-$62/hr | Rhino required; 5-7 years of jewelry CAD | https://www.career.com/job/davidyurman/cad-designer/j202604210912283806595 | [V] |
| Rio Casting Inc, Jewelry CAD Designer, in person, ~6 months old (exact date not shown), expired | $25-$35/hr | Rhino or MatrixGold; Photoshop, Illustrator; no years stated | https://app.qureos.com/jobs/jewelry-cad-designer-1777566925277 | [V] |
| Bocaj Narima Inc, Jewelry CAD Designer, in person, ~11 months old, expired | from $30/hr, 40-50 hrs/week, 401(k), health, PTO | Rhino and Matrix Gold both mandatory (advanced) | https://app.qureos.com/jobs/jewelry-cad-designer-1764324176337 | [V] |
| Diamonds Direct, CAD Designer, New York | $29.00-$38.50/hr (one copy shows $70,200/yr, likely an estimate) | Rhino, Matrix (Gold) and/or 3Design; 2+ to 5+ years depending on copy | https://www.mediabistro.com/jobs/1982774928-cad-designer | [S] |
| Weekday AI client, Mumbai | INR 600,000-700,000/yr | Rhino, Matrix; 5+ years; April 2026 | https://startup.jobs/cad-designer-weekday-ai-8021608 | [S] |

Averages (aggregators, not postings): ZipRecruiter 3D jewelry design averages $25.85/hr as of June 2026 (most $19.23-$32.21) https://www.ziprecruiter.com/Jobs/3D-Jewelry-Design/2 [S]; Payscale averages about $90,465 in New York and $58,958 in Los Angeles for jewelry designers with CAD skills https://www.payscale.com/research/US/Job=Jewelry_Designer/Salary/e9064d1e/New-York-NY-Computer-Aided-Design-CAD [S]. The BLS median for all jewelers is $52,540 (2025) https://www.bls.gov/ooh/production/jewelers-and-precious-stone-and-metal-workers.htm [V].

**Range [E]:** $25-$62/hr, roughly $52,000-$129,000 a year at 2,080 hours, with senior luxury-brand roles at the top. In-person work is the norm in the postings I read.

**What companies are paying for [V, from the David Yurman, Rio Casting and Bocaj Narima postings]:**
- Production-ready CAD files for casting, with correct tolerances for stone setting and metal thickness.
- Stone settings and mechanisms (clasps, hinges, linkages), and splitting models for production.
- Repairing mesh objects and reviewing vendors' CAD files for technical viability.
- Turning sketches into models, applying revisions, and hitting tight deadlines in high-volume shops.

**Implication [E]:** The paid work is mostly manufacturing-aware modeling and revision handling, not just generating a shape. This is the same gap the 2026 AI tools say they leave to humans (section 4), so a product that bakes in stone-setting and wall-thickness rules and handles revisions goes after what the postings pay for.

---

## Flags: what I could not verify
1. No authoritative count of custom-capable jewelers (Census CBP totals are now included; non-employers are not).
2. Reddit and app-store complaints (Reddit blocked in the built-in browser, Chrome extension not connected, app stores not searched); G2/Capterra/Software Advice pages returned 403, so quotes 8-10 and the Pencil details come from search summaries.
3. Most forum quotes and prices are 2004-2013 and 2011; current CAD pricing and designer salaries (CAD-specific) were not found. BLS covers jewelers broadly, not CAD designers.
4. Market-size figures conflict by roughly 2x between research firms; custom-specific US size not found.
5. Vendor claims (Diatech, Pencil, RhinoArtisan, Neural4D) are not independently tested.
