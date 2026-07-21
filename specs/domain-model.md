# Domain Model

## Core Entities

### Tenant

Represents a band/account boundary. A user can create and belong to multiple tenants/bands.

Fields:

- `id`
- `name`
- `slug`
- `created_by_user_id`
- `created_at`
- `updated_at`

### User

Represents a person who can sign in.

Expected to come from the existing control plane.

Fields:

- `id`
- `email`
- `display_name`
- `created_at`
- `updated_at`

### Membership

Connects a user to a tenant with a role.

Expected to come from or sync with the existing control plane.

Fields:

- `id`
- `tenant_id`
- `user_id`
- `role`
- `status`
- `created_at`
- `updated_at`

Roles:

- `owner`
- `manager`
- `member`
- `guest`

Statuses:

- `invited`
- `active`
- `disabled`

### Invite Link

Allows an owner or manager to share access to a band.

Fields:

- `id`
- `tenant_id`
- `token_hash`
- `default_role`
- `created_by_user_id`
- `expires_at`
- `revoked_at`
- `created_at`
- `updated_at`

Rules:

- invite links add new users as `member` by default
- invite tokens should be stored hashed, not as raw link tokens
- revoked or expired links cannot be used

### Band Profile

Stores band-specific settings inside a tenant.

Fields:

- `id`
- `tenant_id`
- `name`
- `default_currency`
- `timezone`
- `member_can_create_events`
- `members_can_view_payments`
- `created_at`
- `updated_at`

MVP defaults:

- `member_can_create_events` is `true`
- `members_can_view_payments` is `true`

### Event

Represents a calendar item.

Fields:

- `id`
- `tenant_id`
- `title`
- `event_type`
- `status`
- `starts_at`
- `ends_at`
- `timezone`
- `location_id`
- `payment_amount`
- `payment_currency`
- `payment_status`
- `payment_notes`
- `has_attachments`
- `public_notes`
- `private_notes`
- `visible_to`
- `created_by_user_id`
- `updated_by_user_id`
- `created_at`
- `updated_at`
- `cancelled_at`

Event types:

- `gig`
- `rehearsal`
- `recording`
- `travel`
- `meeting`
- `other`

Statuses:

- `scheduled`
- `tentative`
- `cancelled`
- `completed`

Visibility:

- `all_members`
- `managers_only`
- `selected_members`

### Event Attachment

Stores files attached to an event, such as invoices, booking confirmations, posters, or venue information.

Fields:

- `id`
- `tenant_id`
- `event_id`
- `file_name`
- `file_type`
- `file_size`
- `storage_key`
- `uploaded_by_user_id`
- `created_at`
- `deleted_at`

Rules:

- attachments belong to exactly one event
- attachments inherit the event tenant boundary
- active band members can view attachments
- users who can edit an event can add attachments
- owners and managers can remove any attachment
- members can remove attachments they uploaded

### Notification Preference

Stores a user's notification settings for a band.

Fields:

- `id`
- `tenant_id`
- `user_id`
- `email_enabled`
- `push_enabled`
- `event_created_enabled`
- `event_changed_enabled`
- `event_cancelled_enabled`
- `event_reminder_enabled`
- `created_at`
- `updated_at`

MVP defaults:

- email notifications enabled
- push notifications enabled after the user grants permission
- created, changed, cancelled, and reminder notifications enabled

### Push Subscription

Stores a device/browser push subscription for a user.

Fields:

- `id`
- `user_id`
- `endpoint`
- `keys`
- `user_agent`
- `created_at`
- `revoked_at`

Rules:

- push subscriptions belong to one user
- push notifications are only sent to active, non-revoked subscriptions
- push permission is requested by the app before registration

### Event Attendee

Optional MVP-plus entity for tracking which members are involved in an event.

Fields:

- `id`
- `event_id`
- `user_id`
- `response_status`
- `created_at`
- `updated_at`

Response statuses:

- `unknown`
- `available`
- `unavailable`
- `maybe`
- `not_required`

### Location

Stores reusable venue/location information.

Fields:

- `id`
- `tenant_id`
- `name`
- `address_line`
- `city`
- `region`
- `country`
- `map_link`
- `contact_name`
- `contact_phone`
- `contact_email`
- `created_at`
- `updated_at`

Rules:

- locations are reusable within a band
- events can reference an existing location
- map links are manually stored in MVP
- map search/geocoding can be added later

## Tenant Boundary Rules

- Every event belongs to one tenant.
- Every location belongs to one tenant.
- Users only access tenant data through active membership.
- A user may belong to multiple tenants/bands.
- The user who creates a tenant/band becomes `owner`.
- Role permissions should be checked server-side.

## Audit Rules

For shared calendar trust, the app should track:

- who created an event
- who last changed an event
- when an event was cancelled

Full audit history can wait until after MVP unless the existing control plane already provides it.
