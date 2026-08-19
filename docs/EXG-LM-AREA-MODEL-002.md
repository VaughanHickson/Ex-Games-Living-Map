# EX GAMES LIVING MAP — AREA MODEL 002

## Purpose

Area Model 002 extends the existing Living Map geography so that ecological work is not forced into suburb/locality polygons.

The model keeps Region and Locality, and adds a first-class Landscape Area concept.

## Core hierarchy

Region
→ Locality and/or Landscape Area
→ Participant

A Participant may belong to multiple Areas.

An Area may exist without any Participant.

## Area object

Minimum fields:

- `id`
- `name`
- `areaType`
- `region`
- `boundaryStatus`
- `geometryStatus`
- `sourceTerms`
- `participantIds`

Optional/future fields:

- `geometry`
- `parentAreaIds`
- `aliases`
- `sources`
- `description`
- `ecologicalTags`
- `media`
- `stories`
- `missions`
- `events`
- `timeline`

## Area types

Initial supported landscape classes:

- `FOREST`
- `RESERVE_SANCTUARY`
- `ISLAND`
- `HARBOUR_BAY`
- `CATCHMENT`
- `RIVER_STREAM`
- `WETLAND_LAKE`
- `VALLEY`
- `RANGE_MOUNTAIN`
- `PENINSULA`
- `WIDER_ECOLOGICAL_AREA`
- `OTHER_LANDSCAPE`

## Boundary policy

The staging package does not invent boundaries.

`boundaryStatus` values:

- `AUTHORITATIVE` — published boundary available and accepted.
- `DERIVED` — generated from accepted source geometry.
- `REPRESENTATIVE` — representative point/area only; not an operational boundary.
- `UNRESOLVED` — named geography exists but boundary not yet attached.

The first four-region package uses `UNRESOLVED` unless an accepted LM geometry already exists.

## Participant placement policy

Source geography remains preserved.

Resolved LINZ locality placement is kept separately in `mapLocalities`.

Landscape placement is additive through `areaIds`; it must not replace locality placement or source evidence.

## Integrity rules

1. Never force a landscape term into a suburb/locality.
2. Never invent ecological boundaries.
3. Never erase source geography.
4. One participant may map to both a Locality and one or more Landscape Areas.
5. Region-only records remain region-only until a more specific geography is evidenced.
6. Area membership is geographic context, not proof of ecological activity.
7. Area membership must not affect competition merit, scoring or judging.

## Status

Area Model 002 is a staging architecture. It does not register new public LM geography by itself.
