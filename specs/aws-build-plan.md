# AWS Build Plan

This is the practical path from local prototype to a private AWS-hosted Bandmanager MVP.

## Goal

Get a private, working cloud version of Bandmanager where real users can sign in, create/join bands, and manage the shared calendar.

Setlists and posters stay in the product, but calendar is the first cloud milestone.

## Phase 0: Account Safety And Setup

Before deploying anything:

- enable MFA on the AWS root account
- create an admin IAM Identity Center user for day-to-day work
- set a billing budget/alert
- read and follow `aws-cost-control.md`
- choose one AWS region, likely `eu-west-1`
- verify a sender email/domain in Amazon SES
- keep GitHub as the source of truth

Definition of done:

- AWS account is safe enough to use
- local machine can deploy to the chosen AWS account
- spending alerts are active

## Phase 1: Frontend Hosting

Host the current app from GitHub with AWS Amplify Hosting.

Why first:

- fast visible progress
- gives us a real AWS URL
- no custom domain needed
- can deploy on every push to `main`

Work:

- connect `TheTangledWing/band-app` to Amplify Hosting
- configure the app as a static frontend
- confirm it serves the current prototype
- add environment configuration for future API URLs

Definition of done:

- the prototype is visible on an AWS-provided URL
- pushing to GitHub can redeploy the frontend

## Phase 2: Deploy Control Plane

Deploy or adapt the FoodyFood control plane.

The control plane provides:

- Cognito user pool
- signup
- email verification
- sign-in/token flow
- base tenant/account record
- tenant profile/org endpoints
- email invites, if needed

Work:

- review the control-plane CDK config
- set SES sender email
- deploy dev stage
- record API Gateway URL
- record Cognito user pool details
- test signup, verify, complete-signup, sign-in

Definition of done:

- a real user can sign up and sign in through Cognito
- the frontend can call `GET /tenant/profile`
- Bandmanager has the Cognito IDs and API base URL needed for integration

## Phase 3: Bandmanager Backend

Build Bandmanager-owned backend services on AWS.

Recommended shape:

- Python 3.12
- FastAPI + Mangum
- API Gateway
- Lambda
- DynamoDB on-demand
- Cognito authorizer using the control-plane user pool
- S3 private bucket for attachments/posters/lyrics

Cost note:

- avoid RDS, containers, NAT Gateway, WAF, and always-on compute in the private MVP
- prefer request-priced/serverless services while traffic is tiny

First tables:

- `Bands`
- `BandMemberships`
- `JoinLinks`
- `Events`
- `Venues`
- `EventAttachments`

Later tables:

- `Setlists`
- `Songs`
- `Posters`
- `NotificationPreferences`
- `PushSubscriptions`

First API:

- `GET /me`
- `GET /bands`
- `POST /bands`
- `GET /bands/{band_id}`
- `POST /bands/{band_id}/join-links`
- `POST /join-links/{token}/redeem`
- `GET /bands/{band_id}/events`
- `POST /bands/{band_id}/events`
- `PATCH /bands/{band_id}/events/{event_id}`
- `POST /bands/{band_id}/events/{event_id}/cancel`
- `GET /bands/{band_id}/venues`
- `POST /bands/{band_id}/venues`

Authorization rule:

- trust Cognito for identity
- use `sub` and `email` from the JWT
- check `BandMembership` for every band-scoped request
- use Bandmanager role for app permissions

Definition of done:

- signed-in users can create bands
- band creator becomes owner
- members can create events
- events persist in DynamoDB
- calendar works from real API data

Current dev deployment:

- CloudFormation stack: `BandmanagerApiDev`
- API URL: `https://q108svdio9.execute-api.eu-west-1.amazonaws.com/dev/`
- DynamoDB table: `bandmanager-dev-app`
- SSM API URL: `/bandmanager/dev/api-url`
- SSM table name: `/bandmanager/dev/app-table-name`

Implemented first slice:

- Cognito-protected `GET /me`
- create/list/get bands
- create/redeem band join links
- create/list/update/cancel band events
- Bandmanager-owned memberships keyed by Cognito `sub`
- per-band membership checks on band/event routes

Smoke test result:

- unauthenticated `/me` returned `401`
- temporary Cognito user authenticated successfully
- authenticated `/me` returned `200`
- test band creation succeeded
- test event creation succeeded
- event listing returned `200`
- temporary Cognito user and test band records were cleaned up

## Phase 4: Frontend Integration

Replace local storage with API-backed data.

Work:

- add sign-up/sign-in screens
- store Cognito tokens safely for the browser app
- add API client with automatic bearer token
- replace local bands/events/venues with backend calls
- keep local mock mode available for design testing

Definition of done:

- two users on different browsers can see the same band calendar
- event create/edit/cancel syncs through AWS
- local prototype mode still works for UI experiments

## Phase 5: Attachments

Add private file storage.

Work:

- create S3 private bucket
- create attachment metadata table
- backend returns presigned upload URLs
- frontend uploads files directly to S3
- backend returns presigned download URLs for authorized members

Definition of done:

- user can attach an invoice/booking file to an event
- other active band members can access it
- non-members cannot access it

## Phase 6: Notifications

Add MVP notifications.

Work:

- send email notification on event create/change/cancel
- add basic reminder job later
- add push subscriptions after email is stable

Definition of done:

- active band members receive email for calendar changes
- notification failure does not block saving an event

## Phase 7: Setlists And Posters

Move prototype setlists and posters to the cloud backend after calendar is stable.

Work:

- add `Setlists`, `Songs`, and `SetlistSongs`
- add lyrics text/attachment support
- add `Posters`
- link posters to events
- store poster files in S3

Definition of done:

- setlists and posters work across devices
- lyrics and poster files are private to band members

## First Build Slice

The first serious AWS slice should be:

1. Amplify frontend hosting
2. control-plane dev deployment
3. Bandmanager API skeleton
4. Cognito-authenticated `GET /me`
5. create/list bands
6. create/list/edit calendar events

This is the smallest slice that proves the real product.

## Open Decisions

- AWS region
- whether to deploy the control plane unchanged or fork/adapt naming from Vigilora/threat-detection to Bandmanager
- whether the frontend should become Vite/React before cloud integration
- whether Bandmanager backend should live in this repo or a separate repo
- SES sender email/domain
- initial private test users
