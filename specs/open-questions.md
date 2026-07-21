# Open Questions

## Control Plane

- Existing control-plane repository: `https://github.com/FoodyFood/control-plane.git`
- Local clone status: not yet available in this workspace because GitHub requested authentication.
- What stack does it use?
- Does it already handle authentication?
- Does it already support tenants and memberships?
- Does it expose APIs or is it code we should import into the same backend?

## Product Decisions

- Decided: one tenant is one band for the MVP.
- Decided: users can create and belong to multiple bands.
- Decided: the band creator becomes admin/owner.
- Decided: admins can share a link so another user can join the band.
- Decided: all members can see payment details by default.
- Decided: ordinary members can create events.
- Do you need availability responses for each event in the MVP?
- Should cancelled events remain visible on the calendar?

## Calendar

- Decided: default calendar experience should include both month and agenda list views.
- Decided: events do not need all-day support in MVP.
- Decided: events do not need recurring dates in MVP.
- Decided: travel/accommodation details are not part of MVP.

## Payments

- Decided: payment amount is the amount the band is receiving for the event.
- Decided: default currency is euro.
- Maybe later: expenses or deductions.
- Maybe later: invoicing, further down the line.
- Decided: event entries should allow attachments for things like invoices.

## Locations

- Decided: locations should be reusable venues.
- Decided: map links can be manually pasted in MVP.
- Later: map search can be added after MVP.

## Notifications

- Decided: members need email notifications for new and changed events.
- Decided: push notifications are important for the first public release.
- Decided: cancellations and reminders should also use email and push notifications.

## Deployment

- Decided: preferred cloud provider is AWS.
- Decided: MVP does not need to live under an existing domain.
- Decided: first release is private for the band/community before broader reusable SaaS packaging.
