# 0019 — The sector catalog is the DANE's CIIU Rev. 5 A.C., with «Otro»

**Status:** accepted, pending confirmation by INNLAB

## Context

The initiative form asks for a sector from `irl_catalog.sector`. The seed first held one entry, `Agroindustria / AgriTech` (the AgroConecta case), and later the 19 sections A–S of the CIIU Rev. 4 A.C. In the client validation, and in the requirement that followed it, the client asked for:

- an official Colombian classification, not made-up categories;
- a selector that is easy to search, instead of a long native list that is hard to read at 100% zoom;
- a way out for an activity that no category represents.

The DANE's current classification is the **CIIU Rev. 5 A.C.**, established by **Resolución 992 de 2026**, which repeals Resolución 2306 de 2022 (CIIU Rev. 4 A.C.). Its top level has 22 sections, A to V. The codes and titles were checked against the DANE's «Estructura detallada CIIU Rev. 5 A.C.» spreadsheet.

Before this change, a profile stored only `id_sector`, a foreign key to the catalog, which had a name and an `is_active` flag.

## Decision

- **Catalog.** `irl_catalog.sector` holds the 22 sections with their official code and title, verbatim, and its classification (`CIIU Rev. 5 A.C.`). Sections T and U, excluded under Rev. 4, are included: the requirement asks for the full classification.
- **«Otro».** One more row, `Otro sector (especificar)`, has `is_other = true` and no code. With it, the profile stores the user's description in `initiative_profile.custom_sector` (up to 120 characters). Every profile keeps a valid `id_sector`, so the foreign key, routing and the report are unaffected.
- **Rule.** `InitiativeProfile` requires `custom_sector` when the sector is «Otro» (422 otherwise) and stores `null` with a CIIU section, so no text left from an earlier «Otro» is kept. The form enforces the same rule and hides the field when the user leaves «Otro».
- **Description.** Each section carries `description`, a line on what it groups, summarized from its official divisions, which the combobox shows under the title. Some titles do not say it: «T. Otras actividades de servicios» reads as a catch-all, and was mistaken for «Otro» in review, but it is associations and unions, repair of computers, personal goods and vehicles, and personal services such as hairdressing or laundry. The section stays: removing it would leave the catalog incomplete and push those activities into «Otro», where they cannot be grouped. «Otro»'s description says when to choose it. The line is a summary for the form, not the DANE's text.
- **Search.** Each section carries `keywords`: related words to search it by («software», «finanzas», «salud»). They describe the section's own activities, never a technology any activity may use. The form's combobox matches the code, the title, these words and the description, ignoring case and accents, in that order of weight: a related word ranks a section above one that only mentions the word in its description (software is K before J, which publishes it).
- **Criterion.** The form tells the user to pick the section of the initiative's main economic activity, not the technology it uses nor the industry it serves. It gives four examples (software for crops: K or A; virtual education: Q or K; clinical records: R or K; online store: G or K). No rule picks the sector automatically.
- **Seed.** A sector that is not in the list is deactivated and loses its code, but is not deleted, so profiles registered with it keep naming it. Names grew to `varchar(200)`: section U has about 177 characters.

## Secondary sectors: evaluated, not implemented

A main sector plus optional secondary ones would need:

- a join table (`initiative_profile_sector`) and a list in the contract and the form;
- a decision on what the report and routing read.

Today the profile is one snapshot row with one foreign key, and nothing reads more than one sector. The «Otro» description and the main-activity criterion already cover most multidisciplinary cases. The extension fits the model (a table hanging from `initiative_profile`), but it is left until INNLAB says what it would do with secondary sectors.

## Consequences

- An existing local database must be rebuilt ([ADR 0004](./0004-single-migration-until-real-data.md)).
- The sections are broad and some activities fall in more than one; the main-activity criterion decides. INNLAB should confirm it, and the keywords and descriptions, which are not official.
- Routing reads the sector's name and no routing rule uses it today; a rule on sectors should use the code.
