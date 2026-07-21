# MVP Requirements

## Release Objective

Ship a simple shared calendar where a user can create multiple bands, invite other users with a share link, and every band member can add useful gig/rehearsal details.

## User Roles

### Owner

The user who creates a band. This person is the band admin by default.

Can:

- manage tenant/band settings
- create invite links
- create, edit, and delete events
- view and edit payment details
- manage roles

### Manager

Can:

- create invite links
- create, edit, and delete events
- view and edit payment details

### Member

Can:

- view shared events
- view event location and notes
- view payment details
- create events
- edit events they created

### Guest

Can:

- view selected events only
- see only details shared with them

## Band Requirements

### Create Band

A signed-in user can create multiple bands.

Acceptance criteria:

- the creator becomes `owner` for that band
- the band is immediately available in the user's band switcher
- the band gets default settings where members can create events and payment details are visible to all members

### Join Band By Link

An owner or manager can create a shareable join link for a band.

Acceptance criteria:

- a user with the link can join the band after signing in
- the joining user receives the `member` role by default
- expired or revoked links cannot be used
- the link only grants access to the intended band

## Calendar Requirements

### View Events

Users can view events in:

- month calendar
- agenda list
- event detail screen

Acceptance criteria:

- the calendar screen offers both month and agenda list views
- agenda items show date, time, title, location summary, and event type
- past events remain available unless archived
- events are scoped to the current tenant/band
- all MVP events have a start date and time
- all-day events are out of scope for MVP
- recurring events are out of scope for MVP

### Create Event

Any active band member can create an event with:

- title
- event type
- start date and time
- end date and time or duration
- location name
- address
- payment amount
- payment currency
- payment status
- payment notes
- attachments
- private notes
- visible-to setting

Acceptance criteria:

- required fields are validated
- payment amount can be blank
- location can be manually entered
- event appears for other members after save
- event payment details are visible to all active band members
- attached files are visible from the event detail screen
- recurring event creation is not available in MVP
- all-day event creation is not available in MVP

### Edit Event

Owners and managers can update any event. Members can update events they created.

Acceptance criteria:

- changes are saved with updated timestamp and editor identity
- users without permission cannot edit
- edited event details refresh for other members

### Delete Or Cancel Event

Events should usually be cancelled rather than permanently deleted.

Acceptance criteria:

- managers can mark an event as cancelled
- cancelled events remain visible with clear status
- hard delete is reserved for owners/admins

## Authentication And Access

The app should integrate with the existing control plane for:

- users
- tenants
- memberships
- roles
- invitation or join-link support, if already available

Acceptance criteria:

- a signed-in user only sees tenants/bands they belong to
- a user can belong to multiple bands
- every event belongs to exactly one tenant/band
- role checks happen on the server, not only in the app interface

## Event Types

Initial event types:

- gig
- rehearsal
- recording
- travel
- meeting
- other

## Payment Fields

Initial payment fields:

- amount the band is receiving
- currency, defaulting to euro
- status
- notes

Payment statuses:

- unknown
- quoted
- confirmed
- invoiced
- paid
- cancelled

MVP payment rules:

- payment amount represents the total amount the band is receiving for the event
- per-member splits are out of scope for MVP
- default currency is EUR
- expenses and deductions are not required for MVP, but may be added later
- invoicing is not required for MVP, but may be added later

## Attachment Fields

Events can include attachments for files such as invoices, booking confirmations, posters, stage plots, or venue details.

Initial attachment fields:

- file name
- file type
- file size
- storage key or URL
- uploaded by user
- uploaded at

Acceptance criteria:

- active band members can view event attachments
- users who can edit an event can add attachments
- owners and managers can remove attachments
- members can remove attachments they uploaded
- accepted file types should include PDF and common image formats

## Location Fields

Locations should be reusable venues scoped to a band.

Initial location fields:

- venue or location name
- address line
- town/city
- region/county/state
- country
- map link
- contact name
- contact phone
- contact email

MVP location rules:

- users can choose an existing venue/location when creating an event
- users can create a new reusable venue/location from an event form
- map links can be manually pasted in MVP
- map search is a later enhancement
- travel and accommodation details are out of scope for MVP

## Offline And Sync

First release should not require full offline editing.

Acceptance criteria:

- app displays a useful error if connection is unavailable
- read caching is acceptable
- offline writes can be deferred to a later version

## Notifications

Email and push notifications are part of the MVP.

Required MVP notifications:

- email notification when an event is created
- push notification when an event is created
- email notification when an event is changed
- push notification when an event is changed
- email notification when an event is cancelled
- push notification when an event is cancelled
- event reminders by email and push

Acceptance criteria:

- active band members receive notifications for events in bands they belong to
- the user who makes a change does not need to receive their own immediate change notification
- notifications include event title, date/time, band name, and a link back to the event
- push notifications require device/browser permission before being sent
- failed notification delivery should not block saving an event

## Success Criteria

The MVP is successful when:

- all band members can log in
- users can create multiple bands
- admins can invite members with a share link
- the shared calendar is reliable
- members can add gig/rehearsal details
- members receive email and push notifications for new, changed, cancelled, and upcoming events
- payment amounts and locations are easy to find
- the app works comfortably on phone and desktop
