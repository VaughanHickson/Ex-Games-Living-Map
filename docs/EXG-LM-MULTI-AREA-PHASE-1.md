# Living Map multi-Area relationships — Phase 1

## Scope and checkout

Reconciled on `audit/ex-games-v001`, initial HEAD
`c8f5d66c89ed40e7c2cb4591bac6aa2b37715a37`, one registered worktree.
The pre-existing untracked `.hit-list-back` is protected and untouched.
No organisation-specific data, Project/Action subsystem, deployment change,
Typesense integration or production operation is included.

## Previous implemented cardinality

The accepted LM001 object is an Area, not a participant coordinate.
Area Model 002 stages `Area.participantIds` arrays. The landscape build scripts
append membership to those arrays; refinement scripts derive
`participantAreaLinks` by walking the retained Areas. Both directions therefore
exist in staging, with the Area side authoritative. `areaIds` is a documented
concept, not a field consumed by the current participant loader. None of the
4,444 registered participant records has populated `areaIds`.

Runtime discarded the Area relationships. It expanded 4,444 participant IDs into
4,789 locality rows. Search indexed every expanded row; ID-based selection used
the first match. There was no generic participant-to-Area or reverse traversal.
Participants were locality associations, not one-coordinate marker objects.
MapLibre separately rendered LINZ localities, a demonstration Site, a candidate
point and two development Northland landscape polygons. Demonstration candidate
geometry is not the general participant ingestion model.

## Authority and compatibility

Canonical relationship: `Area.participantIds`. Cardinality is Participant
0..N Areas and Area 0..N Participants. The runtime derives
`participantAreaLinks`, `areasForParticipant` and `participantIdsForArea` from
that one direction. Participant profiles do not gain `location`, `locations`
or a second stored `areaIds` array.

The new runtime `public/data/areas.json` uses the existing Area Model 002 fields
and starts empty. Accepted Area records can be registered there after running
`npm run validate:areas`. Existing staged packages remain staged; this increment
does not publish their geometry or memberships. Existing locality, demonstration
and development sources remain intact.

An optional `participantAreaLinks` field from an existing staging export is
accepted only as a mirror: validation checks every reference and exact agreement
with the Area side, then uses the derived lookup. Duplicate relationships are
deterministically deduplicated with warnings. Duplicate Area IDs, dangling IDs,
conflicting mirrors, invalid geography and inconsistent geometry status fail
validation. There is no fallback coordinate.

The participant registry emits one canonical profile per ID. Existing
regional/locality memberships are retained in a derived compatibility lookup;
legacy `region` and `locality` fields keep their first display values. This is
not an alternative geographic schema. Existing source records are unchanged.
Different names sharing an ID are rejected rather than silently merged.

## Geometry and presentation

Areas preserve Point, LineString, Polygon and MultiPolygon geometry, longitude
before latitude, source terms, source references, boundary status and other
source metadata. Geometry is optional for NOT_ATTACHED Areas. UNRESOLVED Areas
cannot carry claimed geometry. REPRESENTATIVE geometry remains explicitly
labelled. No centroids are created.

Features use Area IDs and preserve their geometry. A shared Area is one source
feature regardless of its participant count. Polygon fills/outlines, route
lines and point circles use the same canonical source. Region changes filter
that source without changing participant identity.

Selecting an Area exposes its name, type, region, geography status, available
description/source references, and every associated participant as a button.
Zero participants is an explicit empty state. Selecting one of those buttons
opens the existing participant presentation for that canonical ID.

The existing participant panel gains an Associated Areas section. Zero Areas
is an explicit safe state; one/many Areas are separate traversal buttons. A
geometry-bearing Area can be brought into view using its actual bounds; an
unresolved Area opens its information without moving the map. No arbitrary
participant is chosen from a shared Area. Existing profile and claim controls
remain otherwise unchanged. No new URL/deep-link state is introduced.

## Search, filters and counts

Participant search produces one entry per ID, including all legacy locality
names and associated Area names as searchable context. Region eligibility is
legacy regional membership OR an associated Area in that region. Locality
eligibility preserves paired region/locality membership, avoiding a cross-product
between unrelated regional memberships.

National participant count is the number of distinct participant IDs. Regional
participant count is distinct eligible participant IDs, not relationship or
feature count. A participant can count once in each of two regional views;
regional totals must not be summed to infer a national total. Existing locality
cards/counts now count unique identities. The UI has no new national/regional
counter. Area panels count unique associated participant IDs. Feature count is
geometry-bearing Areas, independent of participant count. Unresolved Areas can
be traversed but add no rendered feature. Changing region closes stale panels.

## Validation and local review

- `npm test`: neutral fixtures cover the seven required cases, geometry types,
  invalid coordinates, duplicate IDs, reverse-mirror conflicts, panel traversal,
  feature generation, singular search, multi-region filtering and preservation
  of every registered identity/locality membership.
- `npm run validate:areas`: read-only validation against registered participants.
  An optional dataset path can be supplied as `npm run validate:areas -- PATH`.
- `python3 scripts/validate-participants.py PATH...`: existing dataset validator.
- `npm run build`: existing client/edge TypeScript checks and production build.
- `node scripts/check-multi-area-browser.mjs`: local Chrome + Vite smoke test.
  Requires the installed macOS Chrome and modern Node (tested with Node 26).
  Synthetic records are injected by the test server only. External page requests
  are intercepted, and the basemap is replaced with a local empty style retaining
  the layer IDs required by Living Water. This tests real MapLibre/WebGL, not
  availability or styling of the live basemap. Test profiles are temporary and
  screenshots stay under ignored `node_modules/.cache`.

The baseline production build passed before edits, with the existing >500 kB
bundle warning. There was no npm test script before this increment. The existing
participant validator reports zero errors and retains its region-only notices.
Invalid runtime Area data is quarantined as an empty index with a visible alert;
the standalone validator exits unsuccessfully, rather than claiming validity.

## Deferred work

Phase 2 supplies and reconciles evidence, canonical organisation identity,
Area IDs, geography and provenance. Phase 3 validates real-world presentation,
data quality and production readiness. Existing staged data is not automatically
promoted. Rich project/activity timelines, deep links, advanced Area discovery,
and richer source-reference presentation remain outside Phase 1.

No Typesense path was found or introduced. A future participant index should
remain keyed by participant ID, with Area IDs/geography as relationship context;
Area feature counts must not become participant counts.

## Completed checks

The focused Node tests pass. Validation of the existing refined landscape staging
packages intentionally fails: the four-region package contains three duplicate
Area ID groups (Ocean Beach/Whangārei Heads, Aupōuri Peninsula, Lake Ōmāpere),
and the five-region package contains ten duplicate Area ID groups (including
Raukūmara Range and Kāpiti Island). These are pre-existing orthographic/slug
collisions in unchanged staging data, newly detected by the strict validator.
No records were merged, repaired or promoted. Reconciliation of these packages
is separate data work; they are not runtime inputs for Phase 1.
The existing participant validator reports zero errors across all 16 registered
regional datasets. Browser checks cover real geometry picking, both traversal
directions, multi-region filtering, an empty registry with an existing participant,
and visible quarantine of invalid Area relationships. The final production
build and client/edge type checks pass; the original bundle-size warning remains.
