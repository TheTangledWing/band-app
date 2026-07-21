# Technical Direction

## Recommended Architecture

For the first version, use:

- responsive web app / PWA frontend
- cloud-hosted API backend
- managed database
- integration with the existing control plane for users, tenants, and memberships

This gives iOS, Android, and computer access without maintaining separate native apps at the beginning.

## Frontend Options

Recommended:

- React + TypeScript
- Next.js or Vite
- responsive layout
- installable PWA support

Reasons:

- works on desktop and mobile browsers
- can later be wrapped for app stores if needed
- fast to iterate while the product is still small

Alternative:

- Flutter for one codebase across native mobile and desktop

Flutter is attractive for polished native apps, but it is usually more ceremony for an MVP that can start as a calendar-focused web app.

## Backend Options

Good default:

- Node.js + TypeScript API
- PostgreSQL database
- hosted on a cloud service that fits the existing control plane

If the existing control plane already has a stack, prefer matching it.

## Local Test Version

Yes: Bandmanager can have a local non-cloud version for testing before AWS and control-plane integration.

Recommended local prototype:

- responsive browser app running on the user's computer
- local mock authentication with selectable test users
- local band, member, event, venue, payment, and attachment data
- browser storage or a local SQLite file for persistence
- mocked email and push notifications shown in an in-app notification log
- no AWS account required
- no real cloud sync

Useful local-test stack:

- Vite + React + TypeScript for the app
- local storage or IndexedDB for the fastest clickable prototype
- SQLite if we want the local data model to look more like the eventual backend

Local prototype rules:

- keep the same domain model names as the future cloud app
- isolate local storage behind a small data-access layer
- keep notification delivery mocked until cloud/email/push services exist
- keep attachments local-only for prototype testing
- avoid building permanent auth logic in the local prototype

What this proves:

- band creation
- join-link flow, simulated locally
- month and agenda calendar views
- event create/edit/cancel
- reusable venues
- payment details
- attachment flow
- notification intent

What it does not prove:

- real multi-user sync across devices
- real email delivery
- real push delivery
- AWS deployment
- control-plane integration

## Control Plane Integration

Known repository:

- `https://github.com/FoodyFood/control-plane.git`
- `git@github.com:FoodyFood/control-plane.git`

The repository has been cloned locally for reference at `reference/control-plane/`.

The app should not invent a separate identity system if the control plane already owns:

- user accounts
- tenant records
- roles
- invitations
- authentication/session handling

Needed integration points:

- get current user
- list current user's tenants
- get membership and role for a tenant
- verify permission for tenant actions
- create and redeem band join links, if supported

Bandmanager should own:

- band profile settings
- Bandmanager-specific band membership records, unless the control plane is extended for multi-band membership
- calendar events
- event locations
- event payment details
- event attachments
- notification preferences
- push subscriptions
- band join links, if the control plane does not already provide them
- event attendees, if included

Integration note:

- The current control plane stores one `custom:tenant_id` and one `custom:roles` value per Cognito user.
- Bandmanager requires users to create and belong to multiple bands.
- The safest first build is to use the control plane for authentication and base tenant/account setup, then store Bandmanager-specific `Band` and `BandMembership` records in the Bandmanager backend.

## API Shape

Initial endpoints:

- `GET /tenants`
- `POST /tenants`
- `POST /tenants/:tenantId/join-links`
- `POST /join-links/:token/redeem`
- `GET /tenants/:tenantId/band-profile`
- `GET /tenants/:tenantId/events`
- `POST /tenants/:tenantId/events`
- `GET /tenants/:tenantId/events/:eventId`
- `PATCH /tenants/:tenantId/events/:eventId`
- `POST /tenants/:tenantId/events/:eventId/cancel`
- `GET /tenants/:tenantId/events/:eventId/attachments`
- `POST /tenants/:tenantId/events/:eventId/attachments`
- `DELETE /tenants/:tenantId/events/:eventId/attachments/:attachmentId`
- `GET /tenants/:tenantId/locations`
- `POST /tenants/:tenantId/locations`
- `GET /tenants/:tenantId/notification-preferences`
- `PATCH /tenants/:tenantId/notification-preferences`
- `POST /push-subscriptions`
- `DELETE /push-subscriptions/:subscriptionId`

Every endpoint must verify:

- signed-in user
- active membership
- role permission
- tenant boundary

## Suggested First Screens

### Calendar

Primary screen after sign-in.

Shows:

- month view
- agenda list
- quick add button
- tenant/band switcher if user has more than one

MVP calendar constraints:

- no all-day events
- no recurring events
- no travel/accommodation detail module

### Event Detail

Shows:

- date and time
- location
- map link
- payment amount and status
- attachments such as invoices or booking files
- notes
- created/updated info
- edit/cancel actions for owners, managers, and the event creator

### Event Form

Fields:

- title
- type
- status
- start/end
- reusable venue/location, with option to create a new one
- payment
- attachments
- notes
- visibility

### Members

Can be light in MVP if handled mostly by the control plane.

Shows:

- members
- roles
- create/copy join link action

## Hosting Direction

Preferred cloud provider: AWS.

The first rollout should be private, not a public SaaS launch. The app does not need to live under an existing domain for MVP.

Likely AWS fit:

- frontend: S3 + CloudFront, AWS Amplify, or an AWS-hosted web app route
- API: ECS Fargate, Lambda, or App Runner depending on the control-plane stack
- database: Amazon RDS PostgreSQL
- file attachments: S3 private buckets with signed URLs
- email notifications: Amazon SES
- push notifications: Web Push for PWA/browser push, with native push options later if app-store wrappers are added
- secrets/config: AWS Secrets Manager or SSM Parameter Store

MVP deployment assumptions:

- private-first release
- no existing domain required
- deployment can start on an AWS-provided or temporary domain
- custom domain can be added later

## Security Notes

- Never trust tenant IDs from the client without checking membership.
- Payment details are visible to all active band members in the MVP.
- Payment amount means the total amount the band is receiving for the event.
- Default payment currency is EUR.
- Event attachments should use private object storage with signed access URLs rather than public file links.
- Push subscriptions should be tied to authenticated users and revocable.
- Payment privacy can become a future band setting if needed.
- Keep private notes separate from public/member notes.
- Store dates in UTC with an event timezone.
- Use server-side validation for all event writes.

## Build Order

1. Confirm control-plane stack and available auth/tenant APIs.
2. Create database schema for Bandmanager-owned entities.
3. Build event API with tenant permission checks.
4. Build calendar UI.
5. Build create/edit event flow.
6. Add band creation and join-link flows.
7. Add email and push notifications.
8. Add PWA polish and deployment.

## Post-MVP Modules

Setlists are the first planned near-future module after the calendar MVP.

Expected setlist direction:

- each band can have multiple setlists
- songs can appear in multiple setlists
- clicking a song can show attached lyrics
- setlists and songs should be scoped to a band
- this should not block the initial calendar build
