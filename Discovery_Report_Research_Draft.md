# Aurix Discovery Report: Research Pack and Draft Content

> **Read first.**
> 1. **AI-writing rule.** Your brief says AI may be used for research but NOT for writing the report. Treat this file as a research pack and a skeleton of arguments. Rewrite every section in your team's own words before submitting. Do not paste this text in.
> 2. **Venture assumption.** The Aurix folder only contains design guidelines modeled on Pencil (pencildesign.co), an AI jewelry design and commerce platform. I have assumed Aurix is an **AI jewelry design and commerce platform**. If the team's concept differs, tell me and I will redo Sections 1–6.
> 3. **Verify every number.** Figures marked **[V]** come from secondary sources (blogs, market-research summaries) and must be checked against the original before you cite them. Figures marked **[A]** are our own assumptions, not facts. The brief requires you to validate AI output, so log each check in Appendix D.
> 4. **Customer research is a placeholder.** No interviews exist yet. I cannot invent findings. Section 3 gives hypotheses, a method and an interview guide. Run the interviews, then write the real findings.

---

## Executive Summary (write last, about 150 words)

Points to cover:
- **Problem:** Custom jewelry design is slow, expensive and gated by specialist CAD skills. Independent jewelers and designers lose sales because a custom quote takes days and costs hundreds of dollars before a customer commits.
- **Why now:** Gold hit a record average of $4,873/oz in Q1 2026, so margins and customer price sensitivity are acute. Lab-grown stones are now 61% of engagement-ring center stones, so design and personalization, not the stone, is the differentiator. Generative AI can now produce usable 3D output.
- **Solution:** Aurix turns a sketch or prompt into a production-ready CAD file and a shoppable product page.
- **Market:** Bottom-up serviceable market of roughly $100M a year in subscriptions, plus commerce revenue (Section 2).
- **Moat:** A proprietary, manufacturing-validated design dataset, plus workflow switching costs.
- **Economics:** Target LTV:CAC of 3.9:1 (Professional tier) and 5.0:1 (Shop tier), with payback under 9 months (assumptions, Section 6).

---

## 1. The Market Problem and Why Now (about 2 pages)

### 1.1 Problem statement (one sentence for the report)
Independent jewelers, small brands and freelance designers cannot turn a customer's idea into a priced, manufacturable design quickly or cheaply, which delays sales and discourages customers from buying custom pieces.

### 1.2 Who has the problem and how severe it is
- **Who:** independent jewelry retailers, small direct-to-consumer brands, freelance designers and Etsy-style makers.
- **Cost of the status quo.** Freelance 3D jewelry modeling runs roughly $65–$300 per piece on Fiverr (Fiverr, 2026) **[V]**. A jeweler's CAD drawing for a simple design can be quoted around $500, with a wax model near $100 and casting at $200 or more (CADCrowd, n.d.) **[V]**. Customers pay these costs before they have a rendering they can approve.
- **Time and skill:** specialist software (e.g., Matrix, RhinoGold) has a steep learning curve. No sourced license pricing was found, so do not cite one without checking vendor sites.
- **Current workarounds:** hand sketches, freelance marketplaces, in-house CAD staff, and generic image generators that produce pictures that cannot be cast.

### 1.3 Why now (build the argument from these four shifts)
1. **Record gold prices.** The LBMA gold price averaged a record $4,873/oz in Q1 2026, with a January high of $5,405/oz. Jewelry demand by volume fell to its lowest quarter since Covid while spending by value rose 31% to a record $47B (World Gold Council, 2026). Customers buy less metal and care more about design value. Retailers need to price custom pieces fast.
2. **Lab-grown diamonds changed what customers pay for.** The Knot's 2026 study reports lab-grown center stones in 61% of engagement rings bought in 2025, up from just over 50% in 2024. The average ring cost fell to $4,600 from $5,200 (Rapaport, 2026; JCK, n.d.). When the stone is commoditized, design and personalization carry the value.
3. **Supply chain and tariff shocks.** A 50% US tariff on many Indian goods took effect on 27 August 2025. Gems and jewelry are about $10B of India's exports to the US. Rapaport's survey found 89% of US respondents expected worse sales and 44% planned to shift sourcing toward US dealers (Rapaport, 2025). The status of this tariff in late 2026 must be checked before you cite it **[V]**. Domestic, on-demand production rises in importance.
4. **Generative AI can now output usable 3D.** Startups such as BLNG AI ($3M seed) and Arcade AI are proving demand, and Pencil claims "production-grade CAD" files (Cove Fund, 2025; TechCrunch, 2024; Pencil, n.d.).

Counter-argument to address: a tariff and a gold spike are cyclical. State that the lab-grown and AI shifts are structural.

---

## 2. Market Sizing (about 1.5 pages)

### 2.1 Top-down context (not the TAM)
| Measure | Figure | Source quality |
|---|---|---|
| Global jewelry market, 2025 | $381.5B, projected $578.5B by 2033 (5.5% CAGR) | Market-research summary **[V]** |
| Global online jewelry sales, 2026 | $85.7B (Grand View Research, via a trends roundup) | Secondary **[V]** |
| Lab-grown diamond market, 2025 | about $29.4–29.7B | Two research firms agree **[V]** |

Warning: spending on jewelry is not the market for Aurix. Aurix sells software and commerce tools, so size what a customer would pay Aurix.

### 2.2 Bottom-up sizing (show this in the report; full math in Appendix A)
Using Pencil's published prices as a price benchmark (Pencil, n.d.):

| Segment | Count | Annual price | Annual value |
|---|---|---|---|
| US jewelry businesses (retailers, makers, manufacturers) | 25,102 (Jewelers Board of Trade, 2018) **[V, dated]** | $2,388 (Shop tier, $199/mo) | about **$59.9M** |
| Global freelance designers and hobbyists | 100,000 **[A]** (Pencil claims 100,000+ users) | $468 (Professional, $39/mo) | about **$46.8M** |
| **Serviceable subscription market (SAM)** | | | **about $107M** |

- **TAM (broader):** add non-US jewelry businesses and the ecommerce sellers on Etsy. Etsy had 8.76M active sellers across its marketplaces in 2025, but jewelry is only one category and Etsy does not publish a jewelry seller count, so do not use 8.76M directly (Etsy, 2026). A stated assumption of 3x the US business count for the rest of the world gives a TAM near $180M for the Shop tier alone **[A]**.
- **Commerce upside:** Etsy's take rate was 24.2% of GMS in 2025 (Etsy, 2026). Even a 2–3% fee on custom orders processed through Aurix could rival subscription revenue. This is a hypothesis.
- **SOM (Year 3):** 3% of SAM equals roughly **$3.2M** annual recurring revenue **[A]**. This is about 160 Shop-tier customers plus 1,500 Professional customers.

Honest insight to state: SaaS alone is a modest market. The business case depends on commerce (orders, manufacturing partners) and on expanding to enterprise brands.

---

## 3. Customer Research (about 2.5 pages: to be completed by the team)

### 3.1 Method (fill in the real numbers)
- Target: 15–20 interviews, split between independent jewelers, freelance designers, small DTC brand owners and recent custom-ring buyers.
- Recruit via Instagram and Etsy shop owners, local jewelers' associations and LinkedIn.
- 30-minute semi-structured interviews, recorded with consent, coded for themes.

### 3.2 Hypotheses to test (clearly label as hypotheses until validated)
1. Custom jobs are lost because a quote and rendering take too long.
2. Jewelers will pay a monthly fee for a tool only if the output casts cleanly the first time.
3. Designers fear AI copying their style and will want IP protection.
4. Customers want to see a rendering before paying a deposit.

### 3.3 Interview guide (Appendix B)
- Walk me through your last custom piece, from first conversation to delivery.
- How long did each step take? What did it cost you?
- How many inquiries did you lose last year, and why?
- What tools do you use today? What do you pay?
- Have you tried AI design tools? What went wrong?
- What would you pay to cut this process from days to minutes?
- Which output would you trust enough to send to casting?

### 3.4 How to report findings
Lead with the insight, then a quote, then the count ("9 of 14 interviewees said..."). Include what surprised you and what changed in your plan. Do not report findings you did not collect.

---

## 4. Competitive Landscape (about 2 pages)

| Competitor | Type | Offer and price | Strength | Gap for Aurix |
|---|---|---|---|---|
| **Pencil** | Direct | AI design plus builders. Free; $39 Professional; $199 Shop; $499 Shop Pro; Enterprise custom. Claims 100,000+ designers and 90% cheaper than hiring a designer (Pencil, n.d.) | Full-stack, CAD output, storefront builders | Aurix must differentiate (see below) |
| **BLNG AI** | Direct | Sketch-to-render, $3M seed, subscription app (Cove Fund, 2025) | Photorealistic renders | Rendering rather than manufacturing focus |
| **Arcade AI** | Direct/indirect | Consumer marketplace, AI ideas made by artisans (TechCrunch, 2024) | Consumer-facing | Not a professional tool |
| **Freelancers (Fiverr, Upwork)** | Substitute | $65–$300 per model (Fiverr, 2026) **[V]** | Human judgment | Slow, inconsistent |
| **CAD software (Matrix, RhinoGold)** | Incumbent | Professional CAD | Precision | Skill barrier |
| **Brilliant Earth** | Adjacent (consumer brand) | FY2025 net sales $437.5M, gross margin 57.5%, AOV $2,082 (Brilliant Earth, 2026) | Brand and scale | Not a tool; potential enterprise customer |
| **Etsy** | Adjacent (marketplace) | 24.2% take rate (Etsy, 2026) | Demand and traffic | Little design tooling |

Your point of differentiation must come from customer interviews. Candidate angles: (a) guaranteed castability with manufacturer validation, (b) a focus on independent jewelers' sales workflow (quote to deposit), (c) integrated local manufacturing partners in response to tariffs. Do not claim a differentiator that interviews do not support.

Gaps in this research: Stuller, Gemvision, Vizcom and Midjourney were not found in the searches. Research them directly before listing them.

---

## 5. Moat and Defensibility (about 1.5 pages)

Candidate moats, ranked by plausibility:
1. **Proprietary data.** Every design that clears manufacturing (cast, set, shipped) becomes labeled training data on what is manufacturable. Generic image models lack this. Strength: medium-high, but only if volume is reached.
2. **Switching costs.** Once a jeweler's catalog, configurators and customer quotes live on Aurix, leaving means rebuilding. Strength: medium.
3. **Two-sided network effects.** Designers, manufacturers and buyers on one network. Strength: low early, high late.
4. **Brand and trust.** Weak at start.
5. **Not defensible:** the base AI model (anyone can license one), and the feature set (Pencil can copy it).

Attack scenario to discuss: Pencil, with 100,000+ claimed users, or a large CAD vendor adds the same feature. Explain how the data advantage and local manufacturing relationships hold up. State the weakest point honestly.

---

## 6. Business Model and Unit Economics (about 2 pages)

### 6.1 Revenue model
- **Subscriptions:** Professional $39/mo, Shop $199/mo (priced near Pencil's published tiers; to be tested against interviews).
- **Commerce fees:** 2–3% on orders processed **[A]**.
- **Manufacturing referral fees** from casting partners **[A]**.

### 6.2 Planned unit economics (all inputs are assumptions: show them in Appendix C)

| Metric | Professional ($39/mo) | Shop ($199/mo) |
|---|---|---|
| Gross margin | 75% **[A]** (includes AI inference) | 75% **[A]** |
| Monthly gross profit per customer | $29.25 | $149.25 |
| Monthly churn | 5% **[A]** | 2.5% **[A]** |
| Expected lifetime | 20 months | 40 months |
| **LTV** (gross profit x lifetime) | **$585** | **$5,970** |
| CAC | $150 (self-serve) **[A]** | $1,200 (sales-assisted) **[A]** |
| **LTV:CAC** | **3.9:1** | **5.0:1** |
| **CAC payback** | 5.1 months | 8.0 months |

Benchmarks to compare against (secondary sources, verify against SaaS Capital or KeyBanc **[V]**): 3:1 is the common LTV:CAC floor; one source reports a 2.1:1 median in 2025; SMB payback runs 12–24 months in some reports; SMB monthly churn is cited at 3–5%. Your 5% churn and 5-month payback are therefore ambitious on payback. Say so.

Commerce benchmark: Brilliant Earth's 57.5% gross margin shows what a jewelry retailer keeps after metal costs, so Aurix's fee-based commerce margin should be higher than this because it carries no inventory (Brilliant Earth, 2026).

### 6.3 Key risks
- AI inference cost may push gross margin below 75%.
- Churn may be higher if outputs fail at casting.
- Customer acquisition may cost more than $150 in a niche professional market.

---

## 7. Conclusion, Risks and Next Steps (about 0.5 page)
- Top risks: castability, competitor copying, small SaaS-only market.
- Validate next: 15+ interviews, a willingness-to-pay test, a pilot with 2–3 jewelers and one casting partner.

---

## References (APA 7; verify each URL and access date)

Brilliant Earth Group, Inc. (2026). *Form 10-K for fiscal year ended December 31, 2025* and *Q4 2025 earnings release (Form 8-K)*. U.S. Securities and Exchange Commission. https://www.sec.gov/Archives/edgar/data/1866757/000162828026018794/brlt-20251231.htm

CADCrowd. (n.d.). *High quality custom 3D jewelry design costs, 3D modeling rates and rendering pricing*. https://www.cadcrowd.com/blog/custom-jewelry-design-costs/

Cove Fund. (2025). *BLNG AI raises $3M in seed funding: AI jewelry design platform*. https://www.covefund.com/news/blng-ai-raises-3m-in-seed-funding-ai-jewelry-design-platform

Etsy, Inc. (2026). *Form 10-K for fiscal year ended December 31, 2025*. U.S. Securities and Exchange Commission. https://www.sec.gov/Archives/edgar/data/1370637/000137063726000019/etsy-20251231.htm

Fiverr. (2026). *How much does it cost to hire a 3D CAD modeler in 2026?* https://fiverr.com/resources/guides/costs/3d-cad-modeler

Fortune. (2025, November 18). *Gen Z and millennials choose lab-grown diamonds over natural, McKinsey study finds*. https://fortune.com/2025/11/18/gen-z-millennials-choose-lab-grown-diamonds-over-natural-mckinsey-study

IDEX Online. (n.d.). *Jewelers Board of Trade statistics on U.S. jewelry companies*. https://www.idexonline.com/FullArticle?Id=27059 (verify article and date)

JCK. (n.d.). *Lab diamonds in the engagement market*. https://www.jckonline.com/editorial-article/lab-diamonds-engagement-market/

Pencil World Inc. (n.d.). *Pencil: AI jewelry design and commerce platform* and *Pricing*. https://pencildesign.co/ ; https://pencildesign.co/pricing (accessed 2026-10-26)

Rapaport. (2025). *Diamond trade in turmoil as US announces 50% India tariffs*; *Jewelers overwhelmingly fear tariff impact on holiday sales*. https://rapaport.com/news/diamond-trade-in-turmoil-as-us-announces-50-india-tariffs/

Rapaport. (2026). *Lab-grown "taking over" engagement-ring spending: The Knot*. https://rapaport.com/news/lab-grown-taking-over-engagement-ring-spending-the-knot/

ScaleXP. (2025). *2025 SaaS benchmarks: CAC payback period*. https://www.scalexp.com/blog/saas-benchmarks-cac-payback/ (secondary; replace with SaaS Capital or KeyBanc if possible)

TechCrunch. (2024, October 27). *Arcade, a new AI product creation platform, designed this necklace*. https://techcrunch.com/2024/10/27/arcade-a-new-ai-product-creation-platform-designed-this-necklace/

The Report Cubes. (n.d.). *Jewellery market size*. https://www.thereportcubes.com/public/report-store/jewellery-market-size (secondary; verify the $381.54B figure against its source)

World Gold Council. (2026, April 29). *Record gold prices continue to shift demand dynamics* (Gold Demand Trends Q1 2026). https://www.gold.org/news-and-events/press-releases/record-gold-prices-continue-shift-demand-dynamics

---

## Appendices to build

- **A. Market-size calculations:** the table in 2.2 with every assumption and source.
- **B. Interview guide and summaries:** Section 3.3 plus anonymized notes.
- **C. Unit-economics model:** a spreadsheet with the Section 6.2 inputs, so any reviewer can change an assumption.
- **D. AI use and verification log.** Columns: section / AI tool / prompt / output / how verified / correction made. Starter rows:

| Section | Claim | Verification needed |
|---|---|---|
| 1 | Gold Q1 2026 average $4,873/oz | Open the WGC Q1 2026 Gold Demand Trends report; one source also cited a $5,598 peak, so confirm the $5,405 high |
| 1 | 61% lab-grown engagement rings | Open The Knot 2026 Real Weddings Study; note labeling of the study year |
| 1 | 50% India tariff still in force | Check current US trade status |
| 2 | $381.5B global jewelry market | Find the original research firm and methodology |
| 2 | 25,102 US jewelry companies | Find the latest Jewelers Board of Trade number (2018 is dated) |
| 4 | Pencil prices | Re-check the pricing page on the date you submit |
| 6 | SaaS benchmarks | Replace blog sources with SaaS Capital or KeyBanc |
