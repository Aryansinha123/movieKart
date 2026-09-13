# MovieKart — New Release Notification System

Implement a complete **New Release Notification System** in MovieKart.

## Objective

If a user has added a **movie or TV series** to any of the following:

* Watchlist
* Favorites
* Watched
* A personal Collection

then MovieKart should automatically detect when there is a **new relevant release** and notify that user.

Examples:

* User has "Stranger Things" in their Watchlist → when a new season is released, notify them.
* User has "The Boys" in Favorites → when Season 5 releases, notify them.
* User has a movie/franchise in their collection → notify when a relevant new installment becomes available.
* User has watched a TV series → notify when a new season/episode/part is released.
* For movies, notify when a **new installment/sequel/part** related to the tracked title is identified by TMDB.

The system must work for both the **normal web application and the installed PWA**, including **browser push notifications** where permission has been granted.

---

# 1. First Understand the Existing Architecture

Before modifying anything, inspect the existing project and reuse its architecture.

Important existing components include:

* Next.js 16 App Router
* MongoDB + Mongoose
* TMDB API
* Existing `Notification` model
* Existing `/api/notifications` endpoint
* Existing watchlist API
* Existing favorites API
* Existing watched API
* Existing collections API
* Existing PWA manifest
* Existing notification bell/UI

Relevant existing structure:

```text
app/
  api/
    watchlist/
    watched/
    favorites/
    collections/
    notifications/
    movies/

components/
models/
  User.js
  Collection.js
  Notification.js

lib/
  tmdb.js
```

Do NOT create a parallel notification architecture if the existing system can be extended.

---

# 2. Track the Correct TMDB Identity

The current MovieKart architecture stores TMDB IDs in user libraries.

Important existing convention:

```text
Movie IDs  → positive TMDB IDs
TV IDs     → negative TMDB IDs
```

Preserve this convention.

However, for release tracking, do NOT rely only on the signed numeric ID.

The system must determine:

```text
mediaType = movie | tv
tmdbId
title
```

For TV shows, use the underlying positive TMDB TV ID when calling TMDB.

Do not confuse a TV show's negative MovieKart ID with the actual TMDB ID.

---

# 3. What Counts as a Tracked Title?

Create a unified way to determine what content a user is interested in.

A title should be considered tracked if it exists in ANY of:

```text
User.watchlist
User.favorites
User.watchedMovies
Collection.movies
```

Avoid generating duplicate notifications if the same title exists in multiple locations.

For example:

```text
User has Stranger Things in:
- Watchlist
- Favorites
- Collection A
- Watched
```

When a new season releases, the user should receive **one notification**, not four.

The notification can mention that the title is in their library, but duplication must be avoided.

---

# 4. TV Series Release Detection

For TV shows, use TMDB data to determine:

* Current number of seasons
* Current number of episodes
* Latest episode
* Next episode
* Season release dates
* Episode air dates
* First air date
* Last air date

The system should detect meaningful new releases such as:

### New Season

Example:

```text
Previously known:
Season 4

TMDB now:
Season 5
```

Generate:

```text
Stranger Things — Season 5 is now available!
```

### New Episode

If the user follows/tracks a series and a new episode becomes available:

```text
The Last of Us — Episode 4 is now available.
```

However, do NOT spam the user for every episode unless episode-level notifications are explicitly enabled.

Prefer **new-season/new-part notifications by default**.

If practical, add notification preferences allowing users to choose:

```text
New seasons only
New episodes
Both
```

Default:

```text
New seasons only
```

### New Part / Split Season

Handle cases such as:

```text
Season 4 Part 1
Season 4 Part 2
```

or releases where TMDB exposes separate season/episode information.

Do not assume that every continuation is a new season.

---

# 5. Movie / New Installment Detection

Movies do not have seasons.

For movies, do NOT simply notify whenever another movie has a similar title.

Only create a notification when a genuinely related new installment can be identified.

Examples:

```text
Avatar → Avatar 3
John Wick → John Wick 5
Spider-Man → a new installment in the relevant franchise
```

Use TMDB's available movie metadata such as:

* belongs_to_collection
* collection/franchise information
* release dates
* movie IDs
* titles

If a movie belongs to a TMDB collection, monitor that collection for newly released entries.

Example:

```text
User tracked:
John Wick

TMDB collection:
John Wick Collection

Existing:
John Wick
John Wick: Chapter 2
John Wick: Chapter 3
John Wick: Chapter 4

New:
John Wick: Chapter 5
```

Create one notification:

```text
New John Wick movie released
John Wick: Chapter 5 is now available.
```

Do NOT notify merely because a movie with a similar name exists.

---

# 6. Persistent Release Tracking

Do not repeatedly query TMDB and generate notifications without remembering previous state.

Create a dedicated model, for example:

```text
ReleaseTracker
```

Suggested schema:

```javascript
{
  userId: ObjectId,

  tmdbId: Number,

  mediaType: "movie" | "tv",

  title: String,

  trackedSources: {
    watchlist: Boolean,
    favorite: Boolean,
    watched: Boolean,
    collection: Boolean
  },

  lastKnownSeason: Number,
  lastKnownEpisodeCount: Number,

  lastKnownReleaseDate: Date,

  lastCheckedAt: Date,

  knownSeasonIds: [Number],

  knownEpisodeIds: [Number],

  knownCollectionMovieIds: [Number],

  createdAt: Date,
  updatedAt: Date
}
```

Adapt the schema to the existing project's conventions if a better architecture already exists.

The important requirement is that the system stores **previously known release state**.

---

# 7. Avoid Duplicate Notifications

This is extremely important.

A notification must be idempotent.

If the same release is detected multiple times, only create one notification.

For example:

```text
User checks MovieKart
TMDB says Season 5 released
→ Notification created

User checks again
TMDB still says Season 5 released
→ DO NOT create another notification
```

Use a unique release identifier such as:

```text
userId + mediaType + tmdbId + releaseType + releaseId
```

or an equivalent unique/deduplication strategy.

For example:

```text
userId
tmdbId
type = "new_season"
releaseId = seasonId
```

Create a unique index where appropriate.

---

# 8. Extend Existing Notification Model

Reuse the existing:

```text
models/Notification.js
```

Existing notification fields include:

```text
recipientId
senderId
senderUsername
type
collectionId
collectionName
message
read
createdAt
```

Extend it safely rather than breaking existing notification types.

Add fields where useful:

```javascript
type
movieId
mediaType
releaseId
releaseType
metadata
```

Possible notification types:

```text
new_season
new_episode
new_movie_installment
new_part
```

Example notification:

```text
type: "new_season"

message:
"Stranger Things Season 5 is now available!"
```

Metadata could contain:

```javascript
{
  tmdbId,
  mediaType,
  seasonNumber,
  episodeNumber,
  releaseDate,
  posterPath
}
```

---

# 9. Background Release Checking

The release detection must happen automatically even when the user is not visiting MovieKart.

Do NOT implement this as:

```text
When user opens MovieKart → check TMDB
```

That is insufficient.

Create a server-side scheduled job / cron-compatible endpoint that periodically:

1. Finds users with tracked content.
2. Builds a unique set of tracked movies/TV shows.
3. Queries TMDB.
4. Compares current TMDB state against stored state.
5. Detects newly released seasons/installments.
6. Creates notifications.
7. Sends push notifications where available.
8. Updates release tracking state.

Because MovieKart is deployed on Vercel, make the implementation compatible with **Vercel Cron / scheduled serverless execution**.

Do not create a long-running Node process.

---

# 10. Efficient TMDB Usage

Do NOT perform one TMDB request for every user.

Bad:

```text
1000 users
×
10 tracked shows
=
10,000 TMDB requests
```

Instead:

```text
Collect all tracked titles
        ↓
Deduplicate by TMDB ID
        ↓
Query each unique title once
        ↓
Detect releases
        ↓
Find all users tracking that title
        ↓
Create notifications for those users
```

This should be designed around shared release information.

Cache TMDB responses wherever appropriate.

Respect TMDB API limits.

---

# 11. PWA Push Notifications

Implement real browser push notifications for MovieKart PWA.

The existing PWA currently has a manifest and icons, but the release notification feature should additionally support:

```text
Service Worker
Web Push API
Push Subscription
Notification permission
```

The flow should be:

```text
User logs into MovieKart
        ↓
User enables notifications
        ↓
Browser requests notification permission
        ↓
Service worker registers
        ↓
Push subscription generated
        ↓
Subscription sent to MovieKart backend
        ↓
Subscription stored in MongoDB
        ↓
Future release detected
        ↓
Server sends Web Push notification
        ↓
Service worker receives notification
        ↓
Notification displayed even if MovieKart is closed
```

The notification should work when MovieKart is installed as a PWA.

---

# 12. Push Subscription Model

Create something like:

```text
PushSubscription
```

Suggested schema:

```javascript
{
  userId: ObjectId,

  endpoint: String,

  keys: {
    p256dh: String,
    auth: String
  },

  userAgent: String,

  createdAt: Date,
  updatedAt: Date
}
```

A user may have multiple subscriptions because they may use:

```text
Chrome desktop
Chrome Android
Edge
Mobile PWA
etc.
```

Do not restrict users to a single subscription.

Clean up expired/invalid subscriptions automatically.

---

# 13. Web Push Implementation

Use a standard Web Push implementation compatible with Node.js/serverless environments.

Store VAPID credentials in environment variables:

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

Never expose the private key to the client.

Only expose the public VAPID key.

Add appropriate API routes, for example:

```text
POST /api/push/subscribe
DELETE /api/push/subscribe
POST /api/push/test
```

Protect subscription endpoints using the existing authentication/session mechanism.

---

# 14. Service Worker

Create/update the PWA service worker.

It should handle:

```javascript
self.addEventListener("push", ...)
```

and:

```javascript
self.addEventListener("notificationclick", ...)
```

When a notification is clicked:

```text
Open MovieKart
        ↓
Navigate to relevant movie/TV detail page
```

For example:

```text
/movie/stranger-things
```

or the project's existing canonical route.

Use the actual MovieKart routing architecture instead of inventing a conflicting route.

The notification should contain:

```text
title
body
icon
badge
data.url
```

Example:

```text
Title:
New Season Released 🎬

Body:
Stranger Things Season 5 is now available!

Click:
Open Stranger Things
```

---

# 15. Notification Permission UX

Do NOT immediately show the browser permission popup when the user opens MovieKart.

Use a proper opt-in flow.

Add notification settings under:

```text
/settings
```

Allow:

```text
☑ In-app notifications
☑ Push notifications

Release notifications:
○ New seasons only
○ New episodes
○ New seasons + episodes

Movie installment notifications:
☑ Enabled
```

Default to sensible values.

The user must explicitly grant browser notification permission.

If permission is denied, MovieKart should continue working normally.

---

# 16. Existing Notification Bell

The existing notification system must continue working.

Release notifications should appear in:

```text
Notification Bell
```

and:

```text
/api/notifications
```

They should support:

```text
read/unread
mark as read
timestamp
click navigation
poster/image where appropriate
```

Do not create a separate UI system for release notifications.

---

# 17. Notification UI

Example:

```text
🔔 New Season Released

Stranger Things Season 5 is now available.

Added to:
❤️ Favorites · 📺 Watchlist

[View Show]
```

For a movie:

```text
🎬 New Movie Released

John Wick: Chapter 5 is now available.

This is a new installment in the John Wick collection.

[View Movie]
```

Keep the UI consistent with MovieKart's existing notification design.

---

# 18. Initial Tracking Behavior

Be careful when a user first adds an existing TV show.

For example:

```text
User adds Stranger Things today.

TMDB currently has:
Season 1
Season 2
Season 3
Season 4
Season 5
```

Do NOT generate notifications for Seasons 1–5.

The system should establish the current state as the baseline:

```text
lastKnownSeason = 5
```

Then only notify when the state changes later:

```text
Season 6 appears
→ notify
```

The same principle applies to movie collections.

---

# 19. Adding/Removing Items

When the user:

```text
adds to watchlist
adds to favorites
marks watched
adds to collection
```

ensure release tracking is created/updated.

When the user removes a title from ALL tracked locations:

```text
watchlist ❌
favorites ❌
watched ❌
collections ❌
```

the system should stop sending release notifications for that title.

Do not necessarily delete historical notification records.

---

# 20. Multiple Collections

If a title exists in:

```text
Collection A
Collection B
Watchlist
Favorites
```

treat it as one tracked title.

Do not generate four notifications.

---

# 21. Security

The cron/release-check endpoint must NOT be publicly executable by arbitrary users.

Protect it using the appropriate Vercel Cron authentication mechanism / secret.

Validate:

```text
authentication
authorization
request origin where appropriate
```

Never expose:

```text
TMDB API key
VAPID private key
MongoDB URI
```

to the browser.

---

# 22. Failure Handling

The release checker must be resilient.

If TMDB fails:

```text
Do not mark the release as detected.
Do not destroy previous tracking state.
Retry on the next scheduled execution.
```

If push notification fails:

```text
Keep the in-app notification.
Remove only invalid/expired push subscriptions when the push provider definitively reports them as invalid.
```

The system should never crash the entire cron job because one title/user failed.

Use logging for:

```text
TMDB errors
release detection
notification creation
push delivery
invalid subscriptions
```

---

# 23. Database Indexes

Add appropriate indexes for efficient queries.

Especially:

```text
ReleaseTracker:
userId
tmdbId + mediaType
lastCheckedAt

Notification:
recipientId + createdAt
recipientId + read
deduplication fields

PushSubscription:
userId
endpoint
```

Use compound/unique indexes where appropriate.

---

# 24. API / Cron Architecture

A clean architecture could look like:

```text
app/api/
    push/
        subscribe/
        unsubscribe/
    notifications/
    cron/
        release-check/
```

and:

```text
lib/
    releaseTracker.js
    pushNotifications.js
    tmdb.js
```

and:

```text
models/
    ReleaseTracker.js
    PushSubscription.js
    Notification.js
```

Adapt this to the existing project if equivalent functionality already exists.

---

# 25. Suggested Release Check Flow

Implement approximately:

```text
CRON
 │
 ▼
Find tracked titles
 │
 ▼
Deduplicate TMDB IDs
 │
 ▼
Fetch current TMDB metadata
 │
 ▼
Compare with ReleaseTracker
 │
 ├── No change
 │      └── Update lastCheckedAt
 │
 └── New release detected
          │
          ▼
     Find users tracking title
          │
          ▼
     Check notification deduplication
          │
          ▼
     Create Notification
          │
          ├── In-app notification
          │
          └── Web Push notification
          │
          ▼
     Update ReleaseTracker
```

---

# 26. Important: Don't Over-Notify

The quality of this feature depends heavily on avoiding notification spam.

Rules:

1. One notification per new season.
2. One notification per new movie installment.
3. Episode notifications only if the user enables them.
4. Never notify for releases that existed before tracking started.
5. Never notify repeatedly for the same release.
6. Never create duplicates because the same title exists in multiple libraries.
7. Never notify after the title is removed from every tracked location.

---

# 27. Testing Requirements

Test at minimum:

### TV

```text
Add TV show to watchlist
→ baseline created

Simulate new season
→ notification generated

Run cron again
→ no duplicate notification
```

### Multiple libraries

```text
Same show:
watchlist + favorites + collection

New season
→ exactly ONE notification
```

### Movie

```text
Track movie
→ baseline created

Add new movie to same TMDB collection
→ notification generated
```

### Removal

```text
Remove show from watchlist
Remove from favorites
Remove from collections
Remove from watched

→ release tracking becomes inactive
```

### PWA

Test:

```text
Desktop browser
Mobile browser
Installed PWA
PWA closed/backgrounded
```

Verify:

```text
Push notification appears
Notification click opens correct title
```

### Permission states

Test:

```text
Granted
Denied
Default
Subscription expired
Multiple devices
```

---

# 28. Environment Variables

Add only the required variables:

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
CRON_SECRET=
```

Document them in the project's environment variable documentation.

---

# 29. Preserve Existing Functionality

This is critical.

Do NOT break:

* Authentication
* TMDB search
* Movie pages
* TV pages
* Watchlist
* Favorites
* Watched
* Collections
* Existing notifications
* Activity feed
* Recommendations
* PWA
* SEO
* Existing APIs

Reuse existing components, utilities, models and authentication wherever possible.

Before changing a file, inspect how it currently works.

Do not replace working architecture unnecessarily.

---

# 30. Final Deliverable

Implement the feature fully, not as a mockup.

After implementation:

1. Show all files created.
2. Show all files modified.
3. Explain the release-detection architecture.
4. Explain how TMDB is queried efficiently.
5. Explain the notification deduplication strategy.
6. Explain PWA push notification flow.
7. Explain Vercel Cron setup.
8. List required environment variables.
9. Explain database schema changes.
10. Provide exact steps to test the feature locally.
11. Provide exact steps required for production deployment.

Most importantly, **inspect the existing MovieKart code first and integrate into the existing architecture instead of creating duplicate systems.**
