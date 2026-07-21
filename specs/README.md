# Bandmanager Specs

Bandmanager is a cross-platform app for bands to manage shared dates, money details, and member coordination.

This folder is the source of truth for the early product design. Implementation should follow these specs unless the spec is intentionally updated first.

## Spec Index

- `product-brief.md` - product goal, audience, platform strategy, and guiding decisions.
- `mvp-requirements.md` - first release requirements and acceptance criteria.
- `domain-model.md` - tenants, users, bands, members, events, locations, and payments.
- `technical-direction.md` - proposed architecture and integration points for the existing control plane.
- `control-plane-integration.md` - findings from the FoodyFood control-plane repo and Bandmanager integration decisions.
- `roadmap.md` - near-future modules that should not block the calendar MVP.
- `open-questions.md` - choices still to confirm before build.

## Current MVP

The first usable release should let users sign in, create multiple bands, share a join link, join the correct band workspace, view a shared calendar, and create or edit events with:

- event title
- date and time
- location
- payment amount the band is receiving
- payment notes
- attachments such as invoices
- event type
- member visibility
- basic notes

Native mobile app polish can come later, but the technical direction should not trap the project on one platform.

## Near Future

Setlists are a planned near-future module, but the first build should start with the calendar.
