# Bandmanager

Local prototype and specs for Bandmanager, a cross-platform band management app.

## Current Prototype

The local prototype is in `app/` and runs as a static browser app.

It currently includes:

- band creation and switching
- mock users and local join links
- calendar month and agenda views
- event creation/editing/cancellation
- reusable venues
- payment details in EUR
- event attachments
- notification log for email/push intent
- setlists with songs and lyrics
- gig poster storage

## Run Locally

From the `app/` folder:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5173/
```

## Specs

Product and technical specs live in `specs/`.

The current integration assumption is that FoodyFood's control plane provides Cognito authentication and the base account tenant, while Bandmanager owns app-specific bands, memberships, events, setlists, and posters.

The first real build should keep the calendar as the MVP focus, with setlists and posters available in the prototype for product exploration.
