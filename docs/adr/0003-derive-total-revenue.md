# 3. Derive total revenue instead of storing it

**Status:** Accepted · 2026-08-16

## Context

A venue records two revenue streams per day: POS (till) and Eatclub (platform). The client confirmed the relationship: `POS = Direct`, and `POS + Eatclub = Total Revenue`.

That leaves a choice about which two of the three figures are the source of truth. The admin could enter Direct and Total, with Eatclub derived as the difference — or enter POS and Eatclub, with Total derived as the sum.

## Decision

Store `pos_revenue` and `eatclub_revenue`. Compute total revenue at read time. No `total_revenue` column, no input for it in the admin form, and no `total_revenue` field inside `series[]` in the API response.

## Consequences

- Only one arrangement of the numbers can exist. A stored total is a second source of truth that eventually disagrees with the first, and nothing in the system would notice.
- The two stored figures map onto real, separately-reported cash flows. Total is a presentation concern.
- Entering Direct and Total would allow `Total < Direct`, producing negative Eatclub revenue with no obvious place to catch it. This arrangement has no such hole.
- The API deliberately withholds the daily total even though it knows it. Returning both components *and* their sum invites a frontend to stack all three and draw a bar of double the correct height — a failure that renders plausibly and is caught only by reading the axis.
- Cost: the sum is recomputed on every request. At seven rows per response this is not measurable.
