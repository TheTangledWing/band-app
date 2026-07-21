# AWS Day One Runbook

This is the first hands-on path for getting Bandmanager onto AWS.

## What We Are Doing First

First milestone:

- host the current Bandmanager frontend on AWS Amplify
- keep it private-ish by not attaching a public custom domain yet
- use the AWS-provided Amplify URL
- prove GitHub-to-AWS deployment works

After that:

- deploy the control plane
- wire Cognito login
- build the Bandmanager backend API

## Why Frontend First

The current app is static HTML/CSS/JS. That means we can host it before the backend exists.

This gives us:

- a real AWS URL
- confidence that GitHub deploys are working
- a place to later connect Cognito and API URLs

## Before Starting

In AWS:

- enable MFA on the AWS root account
- create a day-to-day admin user through IAM Identity Center if possible
- create a billing budget alert
- keep the first monthly budget small, around `20`
- choose region `eu-west-1` unless there is a reason not to

On GitHub:

- repo exists: `TheTangledWing/band-app`
- branch exists: `main`
- latest Bandmanager code is pushed

## Step 1: Create A Billing Budget

In AWS Console:

1. Search for `Budgets`.
2. Create a monthly cost budget.
3. Suggested first limit: `20 EUR` or the nearest equivalent.
4. Add your email for alerts.
5. Add alerts at 50%, 80%, and 100%.
6. Check the billing dashboard after every new service is deployed.

Do this before deploying services.

## Step 2: Enable Root MFA

In AWS Console:

1. Open account/security settings.
2. Enable MFA for the root user.
3. Use an authenticator app or hardware key.

Do not use the root user for day-to-day deployments after initial setup.

## Step 3: Create Day-To-Day Admin Access

Preferred:

1. Search for `IAM Identity Center`.
2. Enable it.
3. Create a user for yourself.
4. Assign administrator access to the AWS account.

Fallback for early testing:

- create an IAM user with administrator access
- protect it with MFA
- rotate/delete long-lived access keys later

## Step 4: Deploy Frontend With AWS Amplify

In AWS Console:

1. Search for `Amplify`.
2. Choose `Host web app`.
3. Choose GitHub as source provider.
4. Authorize AWS Amplify to access GitHub.
5. Select repo: `TheTangledWing/band-app`.
6. Select branch: `main`.
7. Set app root or build settings for the static prototype.

Because the app is currently in `app/`, Amplify needs to serve that folder.

Use build settings like:

```yaml
version: 1
frontend:
  phases:
    build:
      commands: []
  artifacts:
    baseDirectory: app
    files:
      - '**/*'
  cache:
    paths: []
```

8. Deploy.
9. Open the Amplify-provided URL.
10. Confirm the prototype loads.

Definition of done:

- Bandmanager loads from an AWS Amplify URL
- Calendar, Setlists, and Posters tabs are visible

## Step 5: Verify SES Sender Email

This is needed for control-plane verification emails and future Bandmanager notifications.

In AWS Console:

1. Search for `Amazon SES`.
2. Make sure you are in the chosen region.
3. Go to verified identities.
4. Verify an email address you control.
5. Click the verification email.

For private testing, verified sender/receiver emails are enough. Later, request SES production access before emailing arbitrary band members.

## Step 6: Prepare Local Deployment Tooling

This local shell does not currently see `aws`, `cdk`, or `node` on the normal path.

Before deploying the control plane from this machine, install/configure:

- AWS CLI
- Node.js
- AWS CDK CLI
- Python 3.12

Then verify:

```sh
aws --version
node --version
cdk --version
python3 --version
```

And authenticate:

```sh
aws configure sso
```

or another AWS auth method.

## Step 7: Deploy Control Plane Dev Stage

After local AWS/CDK tooling is ready:

1. Open `reference/control-plane/infra`.
2. Review `config/dev.yaml`.
3. Set SES sender email.
4. Install Python requirements.
5. Build the Lambda layer.
6. Deploy CDK stage `dev`.
7. Record:
   - API URL
   - Cognito User Pool ID
   - Cognito App Client ID

Definition of done:

- signup flow can send a verification code
- a user can complete signup
- a signed-in user can call `/tenant/profile`

## Step 8: Build Bandmanager Cloud API

Only after the control plane is deployed.

First Bandmanager backend slice:

- `GET /me`
- `GET /bands`
- `POST /bands`
- `GET /bands/{band_id}/events`
- `POST /bands/{band_id}/events`

Definition of done:

- real Cognito user can create a band
- same user can create an event
- event persists in DynamoDB
- frontend reads real cloud data

## Immediate Next Action

Do these now:

1. AWS root MFA.
2. AWS budget alert.
3. Amplify Hosting deploy from GitHub.

Once the Amplify URL exists, paste it back into the thread and we will wire the repo for that deployment properly.

Cost rule:

- do not add RDS, EC2, NAT Gateway, WAF, or containers during the first private test.
