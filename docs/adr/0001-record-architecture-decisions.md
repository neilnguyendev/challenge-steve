# 1. Record architecture decisions

**Status:** Accepted · 2026-08-16

## Context

Several structural choices in this project look arbitrary from the outside — deriving total revenue instead of storing it, putting aggregation in Rails rather than the browser, labelling the chart differently from the prototype. Someone reading the code six months from now will either find the reasoning or reverse the decision.

## Decision

Record each significant decision as a short ADR in `docs/adr/`, numbered sequentially, in the format: context, decision, consequences.

An ADR is warranted when a choice is expensive to reverse, non-obvious, or when a reasonable person would pick differently.

## Consequences

- The reasoning survives the person who made it.
- Reversing a decision starts by reading why it was made, not by guessing.
- Routine choices stay undocumented. An ADR per file would defeat the purpose.
