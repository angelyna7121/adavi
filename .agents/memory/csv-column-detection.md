---
name: CSV/XLSX column detection design
description: Priority and claiming rules for detectColumns() in csvParser.ts
---

## The Rule
Typed-balance columns (`mortgageBalance`, `loanBalance`, `creditCardBalance`) must be resolved **before** generic columns (`amount`, `balance`, `value`, etc.) inside `detectColumns()`.

## Why
The `amount` column aliases include short strings like `"credit"` and `"debit"`. Without priority ordering, "Credit Card Balance" would be substring-matched by `"credit"` and claimed as the generic `amount` column — then the typed-balance loop never sees it, so `forcedType = "liability"` is never set, and the row is silently classified as an asset.

## How to Apply
1. In `detectColumns()`, call `find(COLUMN_ALIASES.mortgageBalance)`, `find(COLUMN_ALIASES.loanBalance)`, `find(COLUMN_ALIASES.creditCardBalance)` **first**.
2. Each `find()` call marks its matched index in a `claimed: Set<number>`.
3. Subsequent `find()` calls skip claimed indices, preventing double-assignment.
4. Pass 3 inside `find()` uses **exact match** (not word-boundary) for short aliases (<5 chars) — this prevents `"name"` from claiming "Account Name" for the `description` column before `account` can claim it.
