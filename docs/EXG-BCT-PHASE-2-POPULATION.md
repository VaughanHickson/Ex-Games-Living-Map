# Backcountry Trust — Phase 2 population review

## Acceptance gate and scope

- Repository: `/Users/vaughanhickson/Documents/GitHub/Ex-Games-Living-Map`.
- Branch: `audit/ex-games-v001`.
- Initial and final HEAD: `ef9f0165d08a0092da2e7b2cc1afe75868c5a3fb`.
- Initial status: only `?? .hit-list-back`; one registered worktree.
- `.hit-list-back` remains untouched (empty; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
- Phase 1 runtime, types, deployment and infrastructure remain unchanged. No commit, push, deployment or live Typesense changes.

## A. Exact canonical participant record

Loaded once through `public/data/participants-national-001.json`, appended to the existing dataset manifest under `New Zealand`. The existing loader accepts a national seed without a locality; regional membership comes from Areas. Additional identity metadata is preserved in the source record and displayed through existing summary/detail fields. The Phase 1 runtime does not add new short-name or country fields.

```json
{
  "id": "exg-backcountry-trust",
  "name": "Backcountry Trust",
  "shortName": "BCT",
  "country": "New Zealand",
  "scope": "National",
  "operatingBaseline": "2014–",
  "entityType": "Trust",
  "status": "located",
  "domain": "Backcountry hut and track restoration/support",
  "website": "https://www.backcountrytrust.org.nz/",
  "sources": [
    "https://www.backcountrytrust.org.nz/"
  ],
  "relationship": "Supports backcountry huts and tracks through funding, volunteer teams, contracted work and partnerships; delivery varies by activity.",
  "summary": "Backcountry Trust supports the maintenance and restoration of New Zealand backcountry huts and tracks on public conservation land through funding, volunteer activity, contracted work and partnerships.",
  "scaleStatement": "Since 2014 BCT reports funding restoration of more than 300 huts and 2,000 km of walking and mountain-bike tracks.",
  "activities": [
    "Backcountry hut and track restoration/support",
    "Funding",
    "Volunteer activity",
    "Contracted work",
    "Partnerships"
  ],
  "detail": "BCT · New Zealand · National · Operating baseline: 2014–. Since 2014 BCT reports funding restoration of more than 300 huts and 2,000 km of walking and mountain-bike tracks (BCT website). Associated Areas record geographic activity, not measured ecological impact. Named geography is retained without invented coordinates; funding and partner delivery are distinguished in each Area description.",
  "verificationStatus": "SOURCE_CHECKED",
  "verificationNote": "Identity and scale checked against the official BCT website. The existing located state means identified geography, not verified point geometry."
}
```

## B–F. Area inventory, classifications and provenance

32 distinct location candidates: **26 production Area records, 6 held evidence candidates, 0 exact geometries, 0 new map features**.

All 26 registered Areas have `boundaryStatus: UNRESOLVED`, `geometryStatus: NOT_ATTACHED`, and no geometry property. A named Area is registered geography, not a positioned marker. Hut, track, bridge, road and landscape types express the source-described object without implying a geometry has been resolved.

No existing production Areas were available to reuse. Kaweka Forest Park reuses the matching staged geographic ID `area-hawke-s-bay-kaweka-forest-park`; its unreviewed staged participant associations are not promoted. All staging files remain unchanged. Park and valley names on other records are source context, not fabricated parent Area boundaries or stored parent relationships.

`Area.participantIds: ["exg-backcountry-trust"]` is the only canonical geographic relationship. Existing reverse lookup supplies participant-to-Area traversal. `activityEvidence` is provenance metadata in the existing open Area record, not a Project schema or another geographic relationship mechanism. Shared evidence references group a source-described operation across physical Areas. They make no ecological-impact claim.

Classification meanings: `BCT_DIRECT_TEAM` records direct BCT team/staff participation, `BCT_VOLUNTEER_TEAM` BCT volunteer delivery, `BCT_CONTRACTED` BCT contract work, `BCT_FUNDED` financial contribution, `BCT_SUPPORTED` support without an assumed delivery role, `PARTNER_DELIVERED` work by another team, and `JOINTLY_FUNDED` explicitly documented additional funding. Report-only records use the narrower investment evidence and do not infer who performed field work.

| Area / canonical ID | Region | Activity and relationship classification | Sources |
| --- | --- | --- | --- |
| Leon Kinvig Hut<br>`area-leon-kinvig-hut` | Manawatū-Whanganui Region | 2022: `BCT_CONTRACTED`<br>2024: `BCT_DIRECT_TEAM`, `BCT_VOLUNTEER_TEAM`, `BCT_FUNDED`, `JOINTLY_FUNDED` | [S2](https://www.backcountrytrust.org.nz/projects-blog/leon-kinvig-hut-relocation-and-restoration) |
| Poutaki Hut<br>`area-poutaki-hut` | Hawke's Bay Region | December 2021–January 2022: `BCT_DIRECT_TEAM` | [S3](https://www.backcountrytrust.org.nz/projects-blog/poutaki-hut) |
| Poteriteri Track<br>`area-poteriteri-track` | Southland Region | November 2020: `BCT_FUNDED`, `PARTNER_DELIVERED` | [S4](https://www.backcountrytrust.org.nz/projects-blog/poteriteri-track) |
| Hump Ridge to Teal Bay Track<br>`area-hump-ridge-to-teal-bay-track` | Southland Region | September 2020: `BCT_SUPPORTED`, `PARTNER_DELIVERED` | [S5](https://www.backcountrytrust.org.nz/projects-blog/hump-ridge-to-teal-bay-track) |
| Top Waitaha Hut<br>`area-top-waitaha-hut` | West Coast Region | 2020: `BCT_FUNDED`, `PARTNER_DELIVERED`<br>April 2022: `BCT_DIRECT_TEAM`, `BCT_VOLUNTEER_TEAM` | [S6](https://www.backcountrytrust.org.nz/projects-blog/top-waitaha-hut), [S7](https://www.backcountrytrust.org.nz/projects-blog/dunnies-for-top-waitaha-and-mullins-huts) |
| Mullins Hut<br>`area-mullins-hut` | West Coast Region | April 2022: `BCT_DIRECT_TEAM`, `BCT_VOLUNTEER_TEAM` | [S7](https://www.backcountrytrust.org.nz/projects-blog/dunnies-for-top-waitaha-and-mullins-huts) |
| Brodrick Hut<br>`area-brodrick-hut` | Canterbury Region | January 2021: `BCT_DIRECT_TEAM`, `PARTNER_DELIVERED` | [S8](https://www.backcountrytrust.org.nz/projects-blog/brodrick-huxley-forks-huts) |
| Huxley Forks Hut<br>`area-huxley-forks-hut` | Canterbury Region | January 2021: `BCT_DIRECT_TEAM`, `PARTNER_DELIVERED` | [S8](https://www.backcountrytrust.org.nz/projects-blog/brodrick-huxley-forks-huts) |
| Kahikatea Lodge<br>`area-kahikatea-lodge` | Otago Region | 2021: `BCT_FUNDED`, `PARTNER_DELIVERED`, `JOINTLY_FUNDED` | [S9](https://www.backcountrytrust.org.nz/projects-blog/kahikatea-lodge-a-brand-new-hut-for-otago) |
| Bald Hill Track<br>`area-bald-hill-track` | West Coast Region | March 2022: `BCT_FUNDED`, `PARTNER_DELIVERED` | [S10](https://www.backcountrytrust.org.nz/projects-blog/bald-hill-track) |
| Jollie Brook Hut<br>`area-jollie-brook-hut` | Canterbury Region | March 2022: `BCT_FUNDED`, `PARTNER_DELIVERED` | [S11](https://www.backcountrytrust.org.nz/projects-blog/jollie-brook-and-cold-stream-huts) |
| Cold Stream Hut<br>`area-cold-stream-hut` | Canterbury Region | March 2022: `BCT_FUNDED`, `PARTNER_DELIVERED` | [S11](https://www.backcountrytrust.org.nz/projects-blog/jollie-brook-and-cold-stream-huts) |
| Blyth Hut<br>`area-blyth-hut` | Manawatū-Whanganui Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6), [S13](https://www.topomap.co.nz/Locations/Manawatu-Wanganui) |
| Old Manson Hut<br>`area-old-manson-hut` | Hawke's Bay Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6), [S14](https://www.pottonandburton.co.nz/wp-content/uploads/2015/02/Shelter-from-the-Storm-spread.pdf) |
| Kaweka Forest Park<br>`area-hawke-s-bay-kaweka-forest-park` | Hawke's Bay Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Waitōtara Tracks<br>`area-waitotara-tracks` | Manawatū-Whanganui Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Dianes Hut<br>`area-dianes-hut` | Hawke's Bay Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6), [S15](https://www.doc.govt.nz/parks-and-recreation/places-to-go/manawatu-whanganui/places/ruahine-forest-park/things-to-do/huts/dianes-hut/) |
| Sayers Hut<br>`area-sayers-hut` | Wellington Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6), [S16](https://www.doc.govt.nz/footer-links/contact-us/send-us-your-photos/places-we-need-photos/) |
| Kirwins Hut<br>`area-kirwins-hut` | West Coast Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Waikiti Bridge<br>`area-waikiti-bridge` | West Coast Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Dunns Creek Hut<br>`area-dunns-creek-hut` | West Coast Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Dickie Spur Hut<br>`area-dickie-spur-hut` | West Coast Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Hopkins Valley access road<br>`area-hopkins-valley-access-road` | Canterbury Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6), [S17](https://www.doc.govt.nz/parks-and-recreation/things-to-do/hunting/where-to-hunt/canterbury/canterbury-hunting/where-to-hunt/hopkins-and-huxley/) |
| Aspiring Hut<br>`area-aspiring-hut` | Otago Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Halfway Hut<br>`area-halfway-hut-dusky-track` | Southland Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Robin Saddle Biv<br>`area-robin-saddle-biv` | Southland Region | 2022–23: `BCT_FUNDED` | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |

### Withheld evidence

Held candidates exist only in `data/backcountry-trust-phase2-evidence.json`. They have no Area ID, geometry or runtime participant relationship. The four park-based report candidates and Cascade need a reviewed single registry region; this does not dispute their named geography. Marlborough needs actual sites or a source-defined geographic scope. No global schema change was made to force these records through validation.

| Candidate | Classification | Reason | Source |
| --- | --- | --- | --- |
| Cascade Hut | `BCT_FUNDED`, `PARTNER_DELIVERED` | The checked project establishes the named hut, but not a single accepted registry region. Resolve regional assignment before import; no coordinates or boundary were supplied. | [S18](https://www.backcountrytrust.org.nz/projects-blog/cascade-hut) |
| Te Iringa Track | `BCT_FUNDED` | The investment evidence establishes named geography but does not resolve the required single registry region. Do not assign the region of a whole park to a site or route by inference. | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Balloon Hut | `BCT_FUNDED` | The investment evidence establishes named geography but does not resolve the required single registry region. Do not assign the region of a whole park to a site or route by inference. | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Mid Wairoa Hut | `BCT_FUNDED` | The investment evidence establishes named geography but does not resolve the required single registry region. Do not assign the region of a whole park to a site or route by inference. | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Temple Basin historic road bridge | `BCT_FUNDED` | The investment evidence establishes named geography but does not resolve the required single registry region. Do not assign the region of a whole park to a site or route by inference. | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |
| Marlborough hut and track work with DOC Renwick | `BCT_FUNDED`, `BCT_SUPPORTED` | Marlborough is known, but the programme description does not identify physical hut/track Areas. Retain evidence pending named sites or an explicitly supported geographic scope. | [S12](https://www.backcountrytrust.org.nz/uploads/1/1/8/6/118692908/backcountry_trust_perfomance_report_2023_www2.pdf#page=6) |

### Provenance qualifications

- Identity and scale are BCT self-reported. Source checking establishes the association described, not independent verification of ecological outcomes.
- Sources attached to Area records preserve the actual project article URLs resolved from the supplied archives. Report candidates cite the 2022–23 report, not the current performance-report landing page.
- Supplementary regional references for Blyth, Old Manson, Dianes, Sayers and Hopkins are attached to their Areas. Dianes uses the DOC page’s Hawke’s Bay designation, rather than inferring Manawatū from the page URL. No supplementary coordinates were imported.
- Dickie Spur and Aspiring regional context is supported by the report’s West Coast and Otago project discussion as well as the investment list. Report references identify the entire report; the page fragment opens the investment overview.
- Poutaki dates retain the article heading (December 2021–January 2022) and explicitly note the conflicting January 2021 body text.
- Hump Ridge evidence establishes BCT/DOC/Rowallan Alton support; it does not establish that all three were joint financial contributors.
- Brodrick/Huxley records acknowledge BCT Rob Brown’s participation alongside the project team and DOC. They do not infer BCT sole delivery or financial contribution.

## G. Deduplication

- Top Waitaha Hut is one Area with renovation and toilet-installation evidence.
- The toilet activity is shared by Top Waitaha and Mullins; neither hut is merged.
- Brodrick and Huxley Forks retain distinct Areas and a shared activity reference.
- Jollie Brook and Cold Stream retain distinct Areas and a shared activity reference.
- Halfway Hut ID is qualified by Dusky Track to avoid conflating other huts of the same name.
- Kaweka Forest Park reuses its staged Area ID; staged records and their relationships remain unchanged, and unreviewed associations are not promoted.
- Parent parks and valleys remain source terms/context; no inferred parent boundary or additional relationship system is introduced.

## H–J. Rendering and traversal

- Existing MapLibre initialization and all previous geographic sources remain functional.
- The canonical Area source emits zero BCT features because no geometry is attached. No centroid, hut point or approximate route was invented.
- Find me / search selects one BCT participant with 26 Area buttons. The existing scrollable panel exposes the list without duplicating the participant.
- Selecting a named Area exposes its type, region, uncertainty, source terms, description, sources and one BCT participant button. Selecting that button returns to the same canonical identity.
- Poteriteri’s rendered detail explicitly credits Permolat Southland field work and BCT finance. Top Waitaha’s two activities are preserved within one Area.
- The current panel prints source URLs as text and uses the existing profile/claim presentation. No presentation redesign is included.

## K–L. Search, regional filtering and counts

- Search for `Backcountry Trust` returns one result nationally and once in each of its seven registered regions. `BCT` also resolves to the same identity; Area-name search can find it through the existing index.
- Regions: Manawatū-Whanganui, Hawke’s Bay, Wellington, West Coast, Canterbury, Otago and Southland.
- There are 4,445 canonical participant identities: all 4,444 prior participants plus one BCT. National participant count increases by one, not 26.
- Region views include BCT once where a registered Area exists. Participant presentation exposes all its Areas, including those in other regions, as established by Phase 1.
- National scope does not fabricate membership in every region. Held evidence adds no regional membership. BCT has no invented locality membership and does not appear as a Hokitika-locality participant merely because a source says a track is south of Hokitika.

## M. Validation and regression results

| Check | Result |
| --- | --- |
| `npm test` | PASS, 16 tests: 10 existing Phase 1 tests and 6 population tests |
| `npm run validate:areas` | PASS, 4,445 identities / 26 Areas / 0 geographic features |
| `python3 scripts/validate-participants.py public/data/participants-national-001.json` | PASS, 1 participant / 0 errors; expected region-only New Zealand note |
| `npm run build` | PASS, both TypeScript configurations and Vite production build; pre-existing >500 kB chunk warning remains |
| `node scripts/check-multi-area-browser.mjs` | PASS, existing Phase 1 geometry/selection/empty/invalid cases plus real BCT population/search/traversal/three regional views |
| `git diff --check` | PASS |

Population tests exercise the real async loader using local file-backed fetch responses; they verify every existing participant still loads, one national identity, both traversal directions, all 32 candidates accounted for, no held candidate emitted as geometry, shared-activity equality, attribution, seven-region counts and duplicate search input.

Browser validation uses an isolated local Chrome profile and an offline replacement basemap. It validates the actual MapLibre and UI behavior, not production tile availability. The deliberate invalid-fixture validation error is expected; no uncaught browser exceptions occurred. Screenshots were visually reviewed at `node_modules/.cache/bct-area-review.png` and `node_modules/.cache/bct-participant-review.png`.

## N. Files

| File | Change | Purpose |
| --- | --- | --- |
| `public/data/participant-regional-datasets.json` | Modified | Append national dataset through existing loader |
| `public/data/participants-national-001.json` | Created | One BCT participant and source-backed profile |
| `public/data/areas.json` | Modified | 26 unresolved named Areas with authoritative participant IDs and evidence |
| `data/backcountry-trust-phase2-evidence.json` | Created | Corpus accounting, withheld candidates, evidence references and deduplication notes |
| `tests/backcountry-trust.test.mjs` | Created | Focused population and real-loader regression checks |
| `scripts/check-multi-area-browser.mjs` | Modified | Extend existing offline harness to test actual production population |
| `docs/EXG-BCT-PHASE-2-POPULATION.md` | Created | This review report |

## O. Exact diff and remaining work

The complete tracked and new-file patch is generated for local review at `node_modules/.cache/bct-phase2.diff`; it excludes the protected `.hit-list-back` and generated build/cache files. No files are staged.

Phase 3 still needs authoritative geometry and review of the six held candidates. Report-only delivery evidence can be refined separately. Shared activity evidence remains compatible with future project/action modelling without introducing it here. No live Typesense ingestion path is added; any future index should preserve one participant ID and separate Area identities.
