# Roadmap

## MVP Focus

Start with the shared band calendar.

The MVP should prove:

- band creation
- join links
- member access
- month and agenda calendar views
- event creation/editing
- reusable venues
- payment details
- attachments
- email and push notifications

## Near Future: Setlists

Setlists are the next likely module after the calendar is working.

Expected capabilities:

- a band can create multiple setlists
- a setlist contains ordered songs
- songs can appear in multiple setlists
- clicking a song opens its details
- song details can include attached lyrics
- lyrics may be stored as text, attachment, or both

Initial setlist entities:

- `Setlist`
- `Setlist Song`
- `Song`
- `Song Attachment`

Setlist rules:

- setlists belong to a band
- songs belong to a band
- all active band members can view setlists
- editing permissions can follow the same pattern as events unless changed later

Out of scope until after the calendar MVP:

- setlist performance mode
- key/tempo/chord charts
- lyric projection
- audio files
- public sharing
