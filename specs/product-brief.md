# Product Brief

## Working Name

Bandmanager

## Product Goal

Bandmanager helps bands keep everyone aligned around gigs, rehearsals, travel dates, and money details in one shared place.

The first version should be simple, reliable, and easy for every band member to use from a phone or computer.

## Audience

Primary users:

- band managers
- band leaders
- working musicians
- dep musicians or guests who only need access to selected events

Early use case:

- one user can create one or more bands
- the band creator becomes the band admin
- members log in from iOS, Android, or a computer
- an admin can share a join link so another user can join the band
- members can see upcoming dates
- any band member can add events
- each event can include payment and location details
- entries can include attachments such as invoices or booking files
- the first rollout is private for one band/community before becoming a reusable SaaS

## Platforms

The app should work across:

- iOS
- Android
- desktop browsers
- tablet browsers

Recommended first delivery path:

- responsive web app / PWA first
- shared API backend
- optional native mobile wrappers later if needed

This avoids building three separate apps before the core workflow is proven.

## Product Principles

- Calendar first: the main screen should be the shared schedule, not a marketing page or admin dashboard.
- Simple entry: adding a gig or rehearsal should be quick.
- Money is shared with the band: payment details are visible to all band members in the first version.
- Payment is lightweight: the MVP tracks the amount the band is receiving, in euro by default.
- Multi-band by default: a user can create and belong to multiple bands.
- Cloud hosted: data should sync reliably between members.
- Private first: build for a private first release before broad SaaS packaging.

## Non-Goals For The First Release

- setlists
- song library
- attached song lyrics
- complex accounting
- payroll automation
- contract generation
- route planning
- ticket sales
- full CRM
- public band website
- chat or social feed

These may become future modules, but they should not slow down the first calendar release.
