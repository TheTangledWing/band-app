# Bandmanager Backend

AWS backend for the first Bandmanager cloud slice.

## Dev Stack

- Python 3.12 Lambda
- FastAPI + Mangum
- API Gateway REST API
- Cognito authorizer from the control-plane user pool
- DynamoDB on-demand single table

## Endpoints

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
- `GET /bands/{band_id}/setlists`
- `POST /bands/{band_id}/setlists`
- `POST /bands/{band_id}/setlists/{setlist_id}/delete`
- `POST /bands/{band_id}/songs`
- `PATCH /bands/{band_id}/songs/{song_id}`
- `POST /bands/{band_id}/setlists/{setlist_id}/songs/{song_id}/played`
- `POST /bands/{band_id}/setlists/{setlist_id}/songs/{song_id}/remove`
- `POST /bands/{band_id}/setlists/{setlist_id}/songs/reorder`

## Deploy

```sh
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
pnpm dlx aws-cdk@latest deploy -c stage=dev --require-approval never
```
