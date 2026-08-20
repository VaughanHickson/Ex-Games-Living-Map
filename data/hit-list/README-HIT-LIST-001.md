# EX GAMES — HIT LIST STRUCTURES 001

## Purpose

This is the first implementation structure for **The Hit List**. It is data-first: the website should render the Hit List from the registry rather than hard-coding species into page markup.

The model supports two public halves:

- **The stealthy half** — fauna / animal pests and predators.
- **The quiet half** — flora / invasive plants and weeds.

The first fauna hierarchy deliberately treats **Mustelids** as the parent target, with **Stoat, Weasel and Ferret** beneath it.

## Source position

The seed list follows current Department of Conservation material. The 2026–2030 Predator Free 2050 strategy describes the national predator target as rats, mustelids, possums and feral cats. DOC community trapping guidance identifies stoats, ferrets and weasels as mustelids.

Wilding conifers are included only as the first **quiet-half** seed because DOC identifies them as invasive weeds capable of permanently altering New Zealand landscapes. They are not labelled as Predator Free 2050 targets.

## Architecture

- `hit-list-001.json` — initial registry and verified seed content.
- `hit-list-001.schema.json` — validation contract.
- `hit-list.ts` — TypeScript interfaces and minimal helpers.
- `manifest.json` — package metadata.

The UI derives parent/child structure from `parentId`, allowing the list to expand without redesigning the page.

## Participant additions

A claimed/verified participant may propose a new Hit List entry. New proposals should enter as `publicationStatus: "candidate"`, `verification.status: "pending"`, and `suggestion.verificationRequired: true`. They must not appear in the public verified Hit List until evidence review changes both statuses.

This is intended to work “Wikipedia-wise”: contribution is open, publication is governed.

## Core operating principle

Every Hit List entry is simultaneously:

- an **information page** — what it is, where it is relevant, why it matters;
- an **intelligence gap map** — what is incomplete, uncertain or needs evidence;
- a **source of online missions** — useful work generated from those knowledge gaps.

Commentary is an input to knowledge, not a substitute for verified knowledge.
Accepted evidence can improve the record and close knowledge gaps.

## Mission integration

`missionRelevance` is descriptive rather than executable. A later mission layer can map mission templates to one or more Hit List IDs without placing mission logic inside the species registry. A Hit List entry must never itself award points, money, ecological credit or standing.

## Media

Media is optional. The registry stores **rights to use**, attribution and source URL. It does not require or assert media ownership. Do not publish an image unless `usageRights` is populated and the use is permitted.

## Recommended website rendering

1. Place **The Hit List** alongside The Hunt / Mission rather than as an isolated encyclopaedia.
2. Render the two halves as expandable groups.
3. Parent target groups such as Mustelids open to reveal child species.
4. Each entry can later open a detail view containing identification, ecological significance, evidence, mission connections and media.
5. Verified participants receive a **Suggest an addition** action.
6. Candidate additions are never public by default.

## Implementation boundary

This package creates structure, not operational control advice. Methods, traps, toxins, permissions and safety requirements belong in separate, jurisdiction-aware mission guidance.

## Suggested repository placement

- `public/data/hit-list-001.json`
- `src/hit-list.ts`
- optional: `data/schemas/hit-list-001.schema.json`
