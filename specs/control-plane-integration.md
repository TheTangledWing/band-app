# Control Plane Integration

Bandmanager will use the FoodyFood control plane as the identity and tenant foundation.

Local reference clone:

- `reference/control-plane/`

GitHub source:

- `git@github.com:FoodyFood/control-plane.git`

The reference clone is intentionally ignored by this repo so the Bandmanager repository does not vendor another git repository.

## Verified Control Plane Stack

The control plane is:

- Python 3.12 on AWS Lambda
- FastAPI + Mangum
- AWS CDK in Python
- Amazon Cognito for authentication
- DynamoDB for tenant, pending signup, invite, and API key storage
- Amazon SES for email
- REST API Gateway with Cognito authorizer

## Current Dev Deployment

AWS region:

- `eu-west-1`

Control-plane API:

- `https://6xlmt0zsbf.execute-api.eu-west-1.amazonaws.com/dev/`

Health endpoint:

- `https://6xlmt0zsbf.execute-api.eu-west-1.amazonaws.com/dev/public/health`

Cognito:

- User Pool ID: `eu-west-1_AQjmXYgAi`
- Web App Client ID: `35rb9p01ephnltfudsa3o04u18`

SSM handoff parameters:

- `/control-plane/dev/api-url`
- `/identity/dev/user-pool-id`
- `/identity/dev/user-pool-arn`
- `/identity/dev/user-pool-client-id`
- `/hosting/dev/url`

Email:

- SES sender identity: `alan.p.heraty@gmail.com`
- Verification status: `Success`

Health verification result:

```json
{
  "status": "healthy",
  "stage": "dev"
}
```

## Existing Control Plane Capabilities

Public signup flow:

- `POST /public/onboard`
- `POST /public/verify`
- `POST /public/complete-signup`
- `POST /public/resend-code`

Authenticated tenant flow:

- `GET /tenant/profile`
- `GET /tenant/org`
- `PATCH /tenant/org`
- `DELETE /tenant/account`
- `POST /tenant/users/invite`
- `GET /tenant/users`
- `GET /tenant/users/invites`
- `PATCH /tenant/users/{user_id}/role`
- `DELETE /tenant/users/{user_id}`
- `DELETE /tenant/users/invites/{email}`

The frontend must call `/tenant/*` endpoints with:

```text
Authorization: Bearer <id_token>
```

## Claims Available To Bandmanager

The control plane exposes these useful Cognito JWT claims:

- `sub`
- `email`
- `custom:tenant_id`
- `custom:roles`

`GET /tenant/profile` returns:

- `user_id`
- `email`
- `tenant_id`
- `roles`
- `correlation_id`

`GET /tenant/org` returns:

- `tenant_id`
- `org_name`
- `status`
- `created_at`

## Important Product Fit Gap

Bandmanager wants:

- one user can create multiple bands
- one user can belong to multiple bands
- each band has its own members and roles

The current control plane appears to support:

- one `custom:tenant_id` per Cognito user
- one `custom:roles` value per user
- tenant membership expressed directly on the Cognito user

That means the control plane does not yet natively model one user belonging to multiple tenants/bands.

## Recommended Integration Decision

Use the control plane for:

- signup
- email verification
- sign-in/token handling
- first tenant creation
- profile/org lookup
- base tenant boundary

Add Bandmanager-owned membership tables for:

- bands
- band memberships
- band roles
- join links

This lets the first real Bandmanager backend support multiple bands per user without forcing a control-plane redesign immediately.

## Proposed Bandmanager-Owned Records

### Band

- `band_id`
- `control_plane_tenant_id`
- `name`
- `created_by_user_id`
- `default_currency`
- `created_at`
- `updated_at`

### Band Membership

- `band_id`
- `user_id`
- `email`
- `role`
- `status`
- `created_at`
- `updated_at`

Roles:

- `owner`
- `manager`
- `member`
- `guest`

### Join Link

- `join_link_id`
- `band_id`
- `token_hash`
- `default_role`
- `created_by_user_id`
- `expires_at`
- `revoked_at`
- `created_at`

## Role Mapping

Control-plane roles should gate account/team administration.

Bandmanager roles should gate app behavior inside a band.

Suggested mapping:

- control-plane admin: can manage tenant-level account settings and bootstrap the first band
- Bandmanager owner: can manage a band and invite members
- Bandmanager manager: can manage band calendar/content
- Bandmanager member: can view band data and create events

## Invite Flow Options

### Control Plane Email Invites

The existing control plane supports email-based invites:

- admin calls `POST /tenant/users/invite`
- invite is stored by email
- invited user signs up with that email
- backend joins them to the tenant

This is useful for tenant/team onboarding.

### Bandmanager Join Links

Bandmanager also wants shareable join links.

Because the control plane invite model is email-based, Bandmanager should own join links unless the control plane is later extended.

Local prototype behavior should remain:

- create join link
- user opens link
- user signs in/signs up
- app creates a band membership

## API Direction For Real Build

Bandmanager backend endpoints should trust the Cognito JWT, then resolve Bandmanager-specific membership from `sub`/`email`.

Example:

- request includes Cognito ID token
- backend extracts `sub`, `email`, `custom:tenant_id`, and `custom:roles`
- backend checks `BandMembership` for requested `band_id`
- backend authorizes calendar/setlist/poster action using Bandmanager role

This preserves control-plane authentication while supporting multi-band product behavior.
