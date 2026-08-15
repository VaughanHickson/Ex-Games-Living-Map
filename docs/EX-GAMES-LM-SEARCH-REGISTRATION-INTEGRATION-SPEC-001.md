# EX GAMES LIVING MAP — SEARCH & REGISTRATION INTEGRATION SPECIFICATION 001

**Status:** Authoritative Living Map integration specification  
**Date:** 2026-08-15  
**Applies to:** Ex Games Living Map search, participant self-identification, existing participant endorsement/verification, and new participant registration handoff  
**Purpose:** Reframe the Living Map search layer from broad web discovery into canonical participant self-search, duplicate checking, locality resolution, and registration handoff.

---

## 1. PURPOSE

The original Living Map search engine was designed to discover ecological participants already active in the field.

That broad discovery role is no longer the production role of the Living Map search layer.

Broad participant discovery is now handled externally through Exa and later DE/importer/reconciliation processes.

The Living Map search layer must instead support:

1. **Find Yourself**
2. **Find Your Group**
3. **Duplicate checking against the canonical Ex Games participant population**
4. **Existing participant endorsement / verification handoff**
5. **New participant registration handoff**
6. **Locality / geographic resolution**
7. **Profile autofill assistance from known canonical data**

The production Living Map search layer searches the Ex Games known participant world.

It does not perform national open-web discovery.

---

## 2. AUTHORITATIVE SYSTEM SEPARATION

The governing pipeline is:

```text
EXA / EXTERNAL DISCOVERY
        ↓
DE / IMPORTER / RECONCILIATION
        ↓
CANONICAL EX GAMES PARTICIPANT DATA
        ↓
LIVING MAP SELF-SEARCH / DUPLICATE CHECK
        ↓
 ┌──────────────────┬──────────────────┐
 │                  │                  │
EXISTING          POSSIBLE            NONE
MATCH             MATCH               FOUND
 │                  │                  │
 ↓                  ↓                  ↓
ENDORSE /        RESOLVE         NEW PARTICIPANT
VERIFY           IDENTITY        REGISTRATION
EXISTING         │                  │
RECORD           │                  ↓
                 └──────────→ PLATFORM
                              REGISTRATION /
                              REVIEW /
                              VERIFICATION
```

The Living Map does not own broad discovery.

The Living Map does not own the canonical registration lifecycle.

The Living Map does own the geographic/self-search interaction and match presentation.

---

## 3. THREE ENTRY PATHS

### 3.1 Existing located participant

A person or group already exists in the canonical participant population.

Flow:

```text
SEARCH
  ↓
EXISTING MATCH
  ↓
REVIEW KNOWN PROFILE
  ↓
EXISTING ENDORSE / VERIFY / CORRECT PATHWAY
```

The existing Living Map endorsement/verification capability must be preserved.

Do not create a parallel replacement unless technically necessary.

### 3.2 Possible existing match

The user's input resembles one or more existing participants but is not conclusive.

Flow:

```text
SEARCH
  ↓
POSSIBLE / MULTIPLE MATCHES
  ↓
SHOW SAFE PUBLIC MATCH INFORMATION
  ↓
USER CONFIRMS:
  ├── SAME ENTITY → existing endorse / verify pathway
  └── NOT SAME → continue toward new registration
```

Matching must never itself confer authority.

### 3.3 New entrant

No suitable canonical participant is found.

Flow:

```text
SEARCH
  ↓
NO MATCH
  ↓
"WE COULDN'T FIND YOU"
  ↓
ADD YOURSELF / YOUR GROUP
  ↓
ASSIST / AUTOFILL
  ↓
HAND OFF TO PARTICIPANT REGISTRATION
```

The resulting registration lifecycle belongs to the wider Ex Games application/platform domain.

---

## 4. USER INPUT MODEL

The self-search interface should be capable of accepting a combination of:

### Individual
- first name;
- last name;
- locality;
- suburb;
- district;
- region;
- address where appropriate;
- phone;
- email.

### Group / project / organisation
- group/project/organisation name;
- locality;
- district;
- region;
- contact name;
- phone;
- email;
- website where known.

The visible initial experience should remain low-friction.

The system should not require every field before attempting a search.

Phone, email, and precise address are private inputs and must not become publicly searchable profile fields.

---

## 5. CANONICAL SEARCH INDEX

Create or derive a participant search index from the canonical Ex Games participant population.

The index should support appropriate searchable fields including:

- canonical participant ID;
- participant name;
- first name / last name where appropriate;
- canonical name;
- aliases;
- alternate spellings;
- entity type;
- population class;
- locality;
- district;
- region;
- public website;
- ecological activity terms;
- organisation/group relationships;
- claim/endorsement state where safe and relevant.

The index must be derived from canonical records.

It must not become a second participant database.

---

## 6. NORMALISATION

The search layer should support safe normalisation for matching.

Examples:

- case-insensitive comparison;
- whitespace normalisation;
- punctuation variation;
- macron-aware matching without discarding canonical orthography;
- common abbreviation handling;
- aliases;
- alternate group names;
- reasonable first-name/last-name ordering;
- locality aliases where governed.

Normalisation must not overwrite canonical names.

Names of people, iwi, hapū, marae, organisations, projects, and places must retain their authoritative display form.

---

## 7. MULTILINGUAL READINESS

The Living Map self-search layer must remain compatible with the Ex Games multilingual architecture.

It must be capable of supporting:

- English;
- te reo Māori;
- future Samoan;
- future Tongan;
- future Mandarin;
- future Hindi;
- future additional languages.

Search aliases or translated search terms must resolve to canonical entities rather than create duplicates.

Do not translate canonical names automatically.

All matching must remain Unicode-safe.

---

## 8. MATCH OUTCOMES

The search service must support four explicit outcomes:

### EXISTING_MATCH
A sufficiently strong canonical match suitable for routing to the existing endorsement/verification pathway.

### POSSIBLE_MATCH
One plausible existing entity requires user confirmation.

### MULTIPLE_MATCHES
Several plausible existing entities require user choice or additional information.

### NO_MATCH
No suitable existing canonical entity was found.

These are routing categories.

They are not proof of identity or authority.

---

## 9. MATCH REASONS

A match result should expose safe, understandable reasons where practical.

Examples:

- exact participant name;
- alias match;
- same locality;
- same group name;
- same region;
- matching website;
- matching public activity context.

Do not expose private data as match reasons.

Do not create an opaque unexplained AI score as the sole basis of routing.

---

## 10. CONFIDENCE

If confidence is represented, use a transparent categorical model rather than pretending to mathematical certainty.

Suggested categories:

- strong;
- possible;
- ambiguous;
- none.

Confidence assists routing.

It never grants authority.

---

## 11. EXISTING PARTICIPANT HANDOFF

For an existing canonical participant, the LM search layer should hand off to the already established:

**IS THIS YOU? / CLAIM PROFILE / ENDORSE / VERIFY / CORRECT**

workflow.

The handoff should preserve:

- canonical participant ID;
- existing profile information;
- existing provenance/evidence;
- existing claim state;
- current locality/geographic relationship.

Do not create a duplicate participant record.

---

## 12. NEW REGISTRATION HANDOFF

For `NO_MATCH`, the LM should initiate the wider platform's new participant registration workflow.

The handoff should be capable of supplying:

- search input;
- proposed participant name;
- proposed type;
- entered locality/address;
- resolved geographic reference;
- any safe inferred/autofilled public fields;
- match result showing no canonical match.

The Living Map should not itself approve or canonically create the participant.

The wider application owns:

- ParticipantRegistration;
- identity;
- private contact data;
- eligibility;
- verification;
- review;
- canonical participant creation;
- PlatformUser ↔ Participant authority.

---

## 13. REGISTRATION ASSIST / AUTOFILL

The Living Map may assist the registration experience by resolving or suggesting non-sensitive information.

Examples:

- address/locality → canonical locality;
- locality → district;
- locality → region;
- activity term → canonical ecological activity category;
- group name → existing alias candidate;
- website/public summary where already present in canonical data.

The user must be able to:

- confirm;
- correct;
- supplement.

Suggested information must not silently become authoritative.

---

## 14. GEOGRAPHIC RESOLUTION

The Living Map remains authoritative for its geographic model.

The self-search layer may resolve user-entered:

- address;
- suburb;
- locality;
- district;
- region

into canonical LM-compatible geographic references.

Do not create:

- a second locality database;
- duplicate polygons;
- a parallel region hierarchy.

Precise private address must remain separate from the public map location used for a Participant.

---

## 15. ADDRESS AUTOFILL BOUNDARY

The architecture may later support address autocomplete/geocoding.

This specification does not mandate a provider.

Any future provider must:

- be replaceable;
- not become the authoritative geographic model;
- resolve into canonical LM geography;
- respect privacy;
- avoid exposing precise private residential location by default.

The LM should store/use the canonical geographic reference, not depend permanently on third-party display strings.

---

## 16. ACTIVITY TAXONOMY

Self-search and registration assistance should use a controlled ecological activity vocabulary.

Examples include:

- predator control;
- pest animal control;
- weed control;
- native planting;
- revegetation;
- habitat restoration;
- wetland restoration;
- freshwater restoration;
- stream restoration;
- riparian restoration;
- dune restoration;
- coastal restoration;
- species recovery;
- ecological monitoring;
- ecological nursery;
- practical kaitiakitanga;
- private-land biodiversity restoration.

Aliases/synonyms may map to canonical terms.

This taxonomy assists search and autofill.

It does not determine ecological eligibility by itself.

---

## 17. PUBLIC / PRIVATE DATA BOUNDARY

The Living Map search interface may collect private data for registration/verification handoff.

Private data includes:

- email;
- phone;
- precise address;
- verification information.

The LM must not:

- place private values into public participant search results;
- store private contact data in public static participant JSON;
- expose precise private addresses on the map;
- use private data as public search facets.

Private data should pass only through approved wider-platform service boundaries.

---

## 18. NO OPEN-WEB DISCOVERY

The public LM self-search path must not call:

- Exa;
- SearXNG;
- general web search;
- arbitrary social search;
- live open-web participant discovery.

Broad discovery remains an offline/admin/research function.

This keeps the production search:

- fast;
- deterministic;
- cheaper;
- safer;
- easier to verify;
- easier to make privacy-compliant.

---

## 19. DE / IMPORTER RELATIONSHIP

The DE/importer is the ingestion and population-management layer.

It will eventually be responsible for:

- ingesting Exa regional returns;
- deduplicating entities;
- resolving aliases;
- classifying participants;
- normalising activities;
- assigning locality/district/region;
- preserving provenance;
- creating/updating canonical IDs;
- reconciling later self-registration data with discovered data.

The LM consumes canonical participant output from the DE/importer.

The LM must not become the DE/importer.

---

## 20. UPDATE / REINDEX MODEL

When canonical participant data changes, the search index must be refreshable/rebuildable.

Sources of canonical change may include:

- DE/importer updates;
- accepted self-registration;
- endorsed/corrected Participant profile;
- alias reconciliation;
- locality correction;
- eligibility resolution.

The search index should not require manual code edits for each participant change.

---

## 21. SEARCH SERVICE BOUNDARY

Prefer a portable search/resolution service boundary.

Conceptually:

```text
ParticipantSearchRequest
        ↓
ParticipantSearchService
        ↓
ParticipantSearchResult
```

The service should not own UI rendering.

The LM UI consumes results.

Future application surfaces may reuse the same canonical search service.

---

## 22. FUTURE SPECTATOR SEARCH READINESS

Do not build the wider spectator search system in this increment.

However, avoid an architecture that can only ever answer "find yourself".

Future Ex Games search may also need to index:

- Actions;
- Stories;
- Opportunities;
- Challenges;
- competition state;
- Participant Communities.

Design the search service so additional searchable domains can be added later without replacing the Participant search implementation.

The initial operational scope remains:

**FIND YOURSELF / FIND YOUR GROUP**

---

## 23. LIVING MAP UI INTENT

The initial LM user-facing experience should be capable of evolving toward:

```text
FIND YOURSELF OR YOUR GROUP

Name / Group
Locality or Address
[Find me]

RESULT:
• Existing match
• Possible matches
• Not found — Add yourself
```

Do not overcomplicate the first interaction.

Search should progressively request more detail only where needed.

---

## 24. DUPLICATE PREVENTION

Duplicate prevention is a major purpose of the self-search step.

Before a new registration is accepted, the system should be capable of rechecking:

- exact name;
- aliases;
- locality;
- region;
- website;
- organisation relationships;
- canonical identifiers.

The LM performs initial duplicate checking.

The wider registration/review process may perform a stronger final duplicate check before canonical creation.

---

## 25. LEGACY DISCOVERY CODE

Existing LM discovery/search code may be:

- retained if useful for admin/research tooling;
- adapted for canonical entity resolution;
- isolated;
- deprecated later.

Do not remove functioning legacy discovery code merely because its production role has changed unless removal is necessary and separately approved.

The priority is to introduce the new production search boundary cleanly.

---

## 26. IMPLEMENTATION INCREMENTS

### Increment LM-SR001 — Search domain
Create:
- canonical search request/result types;
- match outcome types;
- normalisation utilities;
- canonical participant index adapter.

No UI change required.

### Increment LM-SR002 — Canonical matching
Implement:
- individual matching;
- group/project matching;
- locality/region weighting;
- aliases;
- deterministic match routing.

### Increment LM-SR003 — Existing-participant handoff
Connect strong/existing matches to current endorsement/verification workflow.

### Increment LM-SR004 — No-match registration handoff
Create a clean application integration contract for new ParticipantRegistration.

### Increment LM-SR005 — Minimal LM self-search UI
Expose:
- Find Yourself;
- Find Your Group;
- possible matches;
- Add Yourself handoff.

### Increment LM-SR006 — Autofill / locality assistance
Add:
- locality resolution;
- safe autofill;
- activity taxonomy assistance.

### Increment LM-SR007 — Integration hardening
Test:
- imported participants;
- existing claims;
- new registrations;
- aliases;
- multilingual names;
- locality edge cases;
- privacy boundaries;
- duplicate prevention.

---

## 27. COMPLETION PRINCIPLE

At every increment, something new should be testable without destabilising the existing Living Map.

The initial end-to-end target is:

```text
KNOWN PARTICIPANT
     ↓
SEARCH
     ↓
MATCH
     ↓
EXISTING ENDORSE / VERIFY
```

and:

```text
UNKNOWN PARTICIPANT
     ↓
SEARCH
     ↓
NO MATCH
     ↓
REGISTER NEW PARTICIPANT HANDOFF
```

---

## 28. NON-GOALS

This specification does not authorise:

- rebuilding national participant discovery;
- public Exa calls;
- broad live web research;
- production ParticipantRegistration storage inside the LM;
- duplicating PlatformUser/authentication;
- duplicating canonical geography;
- rebuilding MapLibre;
- spectator-game search implementation;
- Story/Opportunity search implementation;
- ecological scoring;
- automatic eligibility approval.

---

## 29. GOVERNING STATEMENT

The Living Map search engine is no longer primarily a discovery engine.

Its production role is:

> **Search the canonical Ex Games participant population, help people identify whether they are already represented, prevent duplicates, resolve place, assist profile completion, and route genuine new entrants into the wider Ex Games registration system.**

Broad discovery belongs upstream.

Registration lifecycle belongs downstream.

The Living Map is the geographic self-identification and routing layer between them.
