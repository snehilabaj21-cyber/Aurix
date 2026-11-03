# Bottom-up Market Sizing: Aurix at $20 per month (US)

Date: 2026-10-27 (revised to use Census nonemployer data)

**Method:** customers = (number of target businesses) x (share with the need) x (adoption), then x $20 x 12 = $240 per year. No top-down figures are used. Every input is in the assumptions table; each is marked **[SOURCED]** (read from the source linked), **[DERIVED]** (arithmetic on sourced numbers), or **[ASSUMPTION]** (my judgment, no source).

## 1. Who is the target customer? (my definition)

At $20/month, Aurix is bought by a small business or an individual, not by a chain with a design department. The ideal customer is a **US jewelry business or seller too small to run its own CAD designers**:

- **Segment A: jewelry retailers with payroll and fewer than 10 employees.** 10,917 (under 5) + 5,754 (5-9) = **16,671**. Census County Business Patterns 2022. https://data.census.gov/table/CBP2022.CB2200CBP?q=NAICS+448310+jewelry+stores&y=2022 [SOURCED]
- **Segment B: jewelry and silverware manufacturers with payroll and fewer than 10 employees.** 1,256 + 298 = **1,554**. Same dataset. https://data.census.gov/table/CBP2022.CB2200CBP?q=NAICS+339910+jewelry&y=2022 [SOURCED]
- **Segment N: jewelry retailers with no employees (nonemployers), 2024: 57,102** establishments (NAICS 45831), with $3,614,800 thousand in receipts, so about $63,000 average per business [DERIVED]. Of these, 51,757 are sole proprietorships. Source: Census Nonemployer Statistics 2024 U.S. file, https://www2.census.gov/programs-surveys/nonemployer-statistics/datasets/2024/historical-datasets/nonemp24us.zip (downloaded and read, row `"00","45831","-","001"`) [SOURCED]. Nonemployers have no paid staff, so they do not overlap with Segments A and B (which are employers) by the Census definition.

**This replaces the earlier self-employed estimate** (BLS 32,800 x 32% = 10,496, with an unsourced overlap guess). That row is gone.

**Excluded on purpose:** stores with 10+ employees (they can afford CAD staff or MatrixGold at $5,995), consumers, hobbyists not registered as businesses, craftsmen, and anyone outside the US. Nonemployer jewelry **manufacturers** are also excluded: the Census file only reports the broad "other miscellaneous manufacturing" code (3399, 66,278 nonemployers), which includes non-jewelry products, so I cannot isolate jewelry makers. This makes the numbers conservative.

**Caution on Segment N:** the Census code is retail, so these are people who sell jewelry. Many are resellers, craft sellers and part-timers rather than people who design. I could not decode the file's receipts-size codes to show how many are tiny; the Census pages I opened did not define them. That is why Segment N gets a much lower "need" share below.

## 2. Assumptions table

| # | Input | Conservative | Base | Optimistic | Status and defense |
|---|---|---|---|---|---|
| 1 | Segment A: retailers with payroll, under 10 employees | 16,671 | 16,671 | 16,671 | [SOURCED] Census 2022 CBP. |
| 2 | Segment B: manufacturers with payroll, under 10 employees | 1,554 | 1,554 | 1,554 | [SOURCED] Same dataset. |
| 3 | Segments A + B | 18,225 | 18,225 | 18,225 | [DERIVED] |
| 4 | Segment N: nonemployer jewelry retailers | 57,102 | 57,102 | 57,102 | [SOURCED] Census Nonemployer Statistics 2024 (a different year from rows 1-2: 2024 vs 2022). |
| 5 | Share of A + B that sells or makes custom pieces and would use a design tool | 25% | 40% | 50% | [ASSUMPTION], not found in any source. Directional support only: a National Jewelers Association prediction that 68% of couples choose custom wedding bands in 2025 (https://www.gminsights.com/industry-analysis/wedding-ring-market/amp), which is demand, not the share of shops offering custom. |
| 6 | Share of N that designs or commissions custom pieces and would use a design tool | 5% | 10% | 20% | [ASSUMPTION]. Lower than row 5 because the Census category is retail and I expect many are resellers or part-timers; this is an inference, not sourced. |
| 7 | **Target customers** = (3 x 5) + (4 x 6) | **7,411** | **13,000** | **20,533** | [DERIVED] |
| 8 | Paid adoption at steady state | 2% | 5% | 10% | [ASSUMPTION], the weakest input. No jewelry-specific benchmark exists. The only general figure found is that about 89% of small businesses use some SaaS tool (Localogy, https://www.localogy.com/?p=41111, search summary only), which says nothing about one niche product. 2/5/10% reflects a new, unproven niche tool that has to replace or sit beside existing CAD workflows. |
| 9 | **Paying customers** (7 x 8) | **148** | **650** | **2,053** | [DERIVED] |
| 10 | Price | $20/month | $20/month | $20/month | Given. One seat per customer, no discounts, no churn, no add-ons, so annual revenue per customer = $240. |
| 11 | **Annual recurring revenue** (9 x $240) | **$35,573** | **$156,002** | **$492,790** | [DERIVED] |
| 12 | Ceiling: if every target customer paid (7 x $240) | $1,778,724 | $3,120,048 | $4,927,896 | [DERIVED] A cap, not a forecast |

Adoption is steady-state paying share of target customers, not a date-specific forecast.

## 3. Sensitivity: base case, adoption only

| Adoption | Customers | ARR at $20/month |
|---|---|---|
| 1% | 130 | $31,200 |
| 3% | 390 | $93,601 |
| 5% (base) | 650 | $156,002 |
| 10% | 1,300 | $312,005 |
| 20% | 2,600 | $624,010 |

## 4. What this says (read before showing an investor)

1. **Adding the Census nonemployer count raised the base case from $113K to $156K a year; it did not change the story.** The realistic range is about **$36K-$493K a year**, and the ceiling is about $1.8M-$4.9M.
2. **$1M ARR needs 4,167 customers** ($1,000,000 / $240). That is 56% of the conservative target base, 32% of the base, and 20% of the optimistic base. This segment alone cannot carry a venture-sized story at $20/month.
3. **The largest segment is the least certain.** Segment N is 57,102 of the 75,327 businesses counted, but it is the one with the lowest assumed need share (5-20%), and the Census category does not say who designs. A survey of nonemployer sellers would move the answer more than any other single input.
4. **The levers are price and segments, not adoption.** For reference only, not a top-down estimate: competitor entry prices are $49-$295/month for ring builders and Pencil's lowest plan is $199/month (see competitors.md). At $199/month the base case of 650 customers would be about $1.55M. Whether small jewelers would pay more is **untested** [ASSUMPTION].
5. **Upside not counted:** consumers, nonemployer manufacturers and craftsmen, the craftsman marketplace (revenue share, as in your notes), stores with 10+ employees, multi-seat accounts, and non-US markets. Each needs its own bottom-up build with a sourced population.
6. **What an investor will attack:** rows 5, 6 and 8, which have no source. Rows 1, 2 and 4 are real Census counts, though from two different years.

## 5. How to firm up the weak inputs
- **Row 6 and the Segment N caveat:** decode the Census receipts-size codes (a record-layout document I could not retrieve) to see how many of the 57,102 are sizeable businesses, or use the 2023 Nonemployer API table with its labels.
- **Row 5:** ask 50-100 small jewelers whether they take custom orders and how they get CAD done today.
- **Row 8:** run a landing-page test or paid pilot at $20 and measure sign-up and payment rates.

Scratch copy of the Census file: `C:\Users\AARYAK~1\AppData\Local\Temp\claude\C--Users-Aarya-Kanitkar-Desktop-Aurix\8134c390-7da4-4794-8660-d28034bd7213\scratchpad\nonemp\x\nonemp24us.txt`
