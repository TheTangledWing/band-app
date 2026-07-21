# AWS Cost Control

Bandmanager should be built as a low-cost private MVP while the AWS account is using Free Tier credits.

## Budget Target

For the first private test:

- aim for near-zero monthly spend
- keep a hard mental ceiling of `20 EUR/USD` per month
- avoid always-on compute
- avoid managed databases with hourly charges
- avoid production-scale logging, WAF, NAT gateways, and container services

The first hosted version should be serverless and quiet when unused.

## Free Tier Reality

AWS Free Tier credits are limited. Treat credits as a runway, not a reason to overbuild.

Rules:

- create budget alerts before deploying services
- check Billing/Cost Explorer after each deployment
- delete unused experiments immediately
- prefer services that charge mainly by request/storage

## Use These First

### Amplify Hosting

Use for the frontend.

Cost posture:

- suitable for static app hosting
- GitHub deploys are convenient
- avoid heavy build pipelines
- avoid WAF for now

Cost control:

- keep frontend static
- keep build minutes low
- do not attach WAF in MVP
- do not add custom domain until needed

### Lambda

Use for APIs.

Cost posture:

- no always-on server
- charged by request/duration
- generous free tier for small private testing

Cost control:

- keep functions small
- avoid long-running jobs
- avoid provisioned concurrency
- use low memory unless performance requires more

### DynamoDB On-Demand

Use for MVP data.

Cost posture:

- no database server running all day
- pay-per-request
- good for small, spiky prototype traffic

Cost control:

- use on-demand billing
- avoid scans on large tables
- design access patterns around partition keys
- add max throughput caps later if needed

### S3 Private Bucket

Use for attachments, posters, and lyrics files.

Cost posture:

- cheap storage for small files
- no public bucket hosting for private content

Cost control:

- store originals only at first
- avoid generating many resized variants until needed
- cap upload file sizes in the app
- use lifecycle cleanup for deleted/temp files

### SES

Use for email verification and event notifications.

Cost posture:

- good fit for transactional email
- initial sandbox limits are acceptable for private testing

Cost control:

- verify only test recipients at first
- do not request production access until private testing needs it
- batch/limit reminders later

## Avoid For Now

Do not use these in the first private MVP unless there is a very specific reason:

- EC2 instances
- RDS PostgreSQL
- NAT Gateway
- ECS/Fargate services
- OpenSearch
- CloudFront custom complexity beyond Amplify defaults
- WAF
- high-volume CloudWatch logs
- always-on schedulers
- multi-region deployment

Why:

- these can add standing monthly cost
- the app does not need them for a private calendar MVP

## CloudWatch Logging Rules

Logs can grow quietly.

Rules:

- set log retention to 7 or 14 days for dev
- avoid logging full request bodies
- avoid debug logs in deployed dev unless actively troubleshooting
- never log tokens or private file URLs

## Budget Alerts

Create AWS Budgets alerts:

- 25%
- 50%
- 80%
- 100%

Suggested first budget:

- `20` per month in the account currency

If spend crosses 50% unexpectedly:

- stop deploying
- inspect Cost Explorer
- identify the service
- delete or scale down the cause

## First Low-Cost Architecture

Use:

- Amplify Hosting for frontend
- existing control-plane architecture for Cognito/signup
- API Gateway + Lambda for Bandmanager API
- DynamoDB on-demand tables
- S3 private bucket
- SES sandbox/verified identities

Do not use:

- RDS
- containers
- NAT Gateway
- WAF
- custom domain

## Cost-Aware Build Order

1. Budget alert.
2. Amplify frontend only.
3. Check billing.
4. Deploy control plane dev.
5. Check billing.
6. Add Bandmanager API skeleton.
7. Check billing.
8. Add DynamoDB tables.
9. Check billing.
10. Add S3 attachments.
11. Check billing.
12. Add email notifications.
13. Check billing.

Every phase should be cheap and reversible.

## Definition Of Done

The AWS MVP is cost-controlled when:

- budget alerts exist
- no always-on compute is running
- no RDS/NAT/WAF is active
- CloudWatch log retention is limited
- frontend deploys from GitHub
- private users can use the shared calendar
- monthly spend remains comfortably inside the credit runway
