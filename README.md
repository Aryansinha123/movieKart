<div align="center">

# 🎬 MovieKart

### *Discover, Track & Share Cinema — Powered by AI*

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb)](https://mongooseatlas.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![TMDB](https://img.shields.io/badge/TMDB-API-01B4E4?style=for-the-badge&logo=themoviedatabase)](https://www.themoviedb.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT-412991?style=for-the-badge&logo=openai)](https://openai.com/)

> **MovieKart** is a full-stack, AI-powered movie and TV show discovery platform. Explore trending titles, curate personal collections, follow friends, earn achievements, and receive mood-based and personalized recommendations — all in one cinematic experience.

[**Live Demo**](https://moviekart.vercel.app) · [**Report Bug**](https://github.com/Aryansinha123/movieKart/issues) · [**Request Feature**](https://github.com/Aryansinha123/movieKart/issues)

---

</div>

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Application Flow Diagrams](#-application-flow-diagrams)
  - [User Authentication Flow](#1-user-authentication-flow)
  - [Movie Discovery & Recommendation Flow](#2-movie-discovery--recommendation-flow)
  - [Collection Management Flow](#3-collection-management-flow)
  - [Social & Activity Feed Flow](#4-social--activity-feed-flow)
  - [Achievements & Gamification Flow](#5-achievements--gamification-flow)
- [Database Relationship Schema](#-database-relationship-schema)
- [API Reference](#-api-reference)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
- [SEO Architecture](#-seo-architecture)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

---

## 🌟 Overview

MovieKart is a production-grade **movie social network** that combines real-time TMDB data with a custom AI recommendation engine. Users can manage their cinematic life — from tracking what they've watched to collaborating on shared movie collections with friends.

The platform is built on **Next.js 16 App Router**, with full **Server Components**, **ISR (Incremental Static Regeneration)**, and a schema-first **MongoDB** backend via Mongoose. It is SEO-optimized with structured JSON-LD data, dynamic sitemaps, and Google Rich Results support.

---

## ✨ Key Features

| Category | Features |
|---|---|
| 🔐 **Auth** | JWT-based register/login, NextAuth sessions, bcrypt password hashing |
| 🎬 **Discovery** | Trending, popular, upcoming movies & TV — powered by TMDB |
| 🤖 **AI Recommendations** | Personalized suggestions from watch history, favorites, genre affinity |
| 🎭 **Mood Discovery** | Natural language mood matching (Emotional, Dark, Mind-Bending, etc.) |
| ⭐ **Taste Profile** | Genre scoring, language preferences, similar user matching |
| 📚 **Collections** | Create, share, collaborate on movie playlists with visibility controls |
| 🧑‍🤝‍🧑 **Social Graph** | Follow users, activity feed, like/comment on collections & reviews |
| 📝 **Reviews** | 1–5 star ratings, rich text reviews, threaded comment system |
| 🏆 **Achievements** | 40+ unlockable badges across 6 categories (watch, review, social, streak…) |
| 📺 **OTT Links** | Deep-link to Netflix, Prime, Disney+, Hotstar, JioCinema, Zee5, and more |
| 🔔 **Notifications** | Real-time alerts for follows, likes, collection invites |
| 🌐 **SEO** | Dynamic metadata, JSON-LD, sitemap.xml, robots.txt, OG images |
| 📱 **PWA** | Web App Manifest, icons, theme color |
| 🎯 **Sports** | Dedicated sports content section |

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.6 | App Router, SSR/SSG/ISR, API Routes |
| **React** | 19.2.4 | UI component library |
| **TailwindCSS** | 4.x | Utility-first styling |
| **Framer Motion** | 12.38.0 | Animations and page transitions |
| **Lucide React** | 1.14.0 | Icon system |
| **Fuse.js** | 7.4.2 | Client-side fuzzy search |
| **React Hot Toast** | 2.6.0 | Toast notification system |
| **Geist Font** | via next/font | Typography (Geist Sans + Geist Mono) |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js API Routes** | 16.2.6 | RESTful serverless API layer |
| **MongoDB Atlas** | Cloud | Primary database |
| **Mongoose** | 9.6.2 | ODM — schema definitions and validation |
| **NextAuth.js** | 4.24.14 | Session management and auth providers |
| **JWT (jsonwebtoken)** | 9.0.3 | Stateless authentication tokens |
| **bcryptjs** | 3.0.3 | Password hashing |
| **Axios** | 1.16.0 | HTTP client with retry logic |

### External APIs & AI

| Service | Purpose |
|---|---|
| **TMDB API v3** | Movie/TV metadata, credits, trending, search |
| **OpenAI API** | AI-powered recommendation explanations & NLP mood matching |

### DevOps & SEO

| Tool | Purpose |
|---|---|
| **Vercel** | Deployment platform |
| **ESLint 9** | Code quality |
| **PostCSS** | CSS processing |
| **JSON-LD** | Structured data (Organization, Movie, TVSeries, Review schemas) |
| **Dynamic Sitemap** | Auto-generated XML sitemap for SEO crawlability |
| **robots.js** | Crawl control — allow/disallow rules |

---

## 📁 Project Structure

```
moviekart/
├── app/                        # Next.js App Router
│   ├── layout.js               # Root layout, SEO metadata, providers
│   ├── page.js                 # Homepage
│   ├── [id]/                   # Dynamic route (legacy ID redirect)
│   ├── movie/                  # Movie detail pages
│   ├── auth/                   # Auth pages
│   ├── collection/             # Single collection view
│   ├── collections/            # All collections browser
│   ├── favorites/              # User favorites page
│   ├── feed/                   # Social activity feed
│   ├── login/                  # Login page
│   ├── profile/                # User profile
│   ├── register/               # Registration page
│   ├── settings/               # User settings
│   ├── watched/                # Watched movies list
│   ├── watchlist/              # Watchlist management
│   ├── sitemap.js              # Dynamic XML sitemap
│   ├── robots.js               # Crawl rules
│   └── manifest.js             # PWA manifest
│
├── app/api/                    # RESTful API routes (serverless)
│   ├── auth/                   # Login, register endpoints
│   ├── movies/                 # TMDB movie proxy
│   ├── reviews/                # CRUD reviews
│   ├── comments/                # Threaded comments
│   ├── collections/            # Collection CRUD
│   ├── curated-collections/    # System curated lists
│   ├── collection-likes/       # Like/unlike collections
│   ├── saved-collections/      # Save collections
│   ├── follow/                 # Follow/unfollow users
│   ├── feed/                   # Activity feed
│   ├── favorites/              # Favorites management
│   ├── watchlist/              # Watchlist management
│   ├── watched/                # Watched movies
│   ├── recommendations/        # AI recommendation engine
│   ├── mood/                   # Mood-based discovery
│   ├── taste-profile/          # User taste analytics
│   ├── taste-match/            # Similar user matching
│   ├── achievements/           # Badge computation
│   ├── notifications/          # Notification system
│   ├── review-likes/           # Like/unlike reviews
│   ├── profile/                # Profile data
│   ├── similar-users/          # Discover users with similar taste
│   ├── sports/                 # Sports content
│   ├── hero/                   # Hero carousel data
│   └── home-dashboard/         # Homepage aggregated data
│
├── components/                 # Reusable UI components
│   ├── navbar/                 # Navbar with search
│   ├── home/                   # Hero slider, dashboards
│   ├── movie/                  # Movie cards, detail views
│   ├── collection/             # Collection UI
│   ├── profile/                # Profile components
│   ├── people/                 # Actor/director pages
│   ├── providers/              # React context providers
│   └── ui/                     # Shared UI primitives
│
├── lib/                        # Business logic & utilities
│   ├── tmdb.js                 # TMDB API client (retry + auth)
│   ├── recommendations.js      # Recommendation engine (1018 lines)
│   ├── achievements.js         # Achievement/badge system
│   ├── mood.js                 # Mood-based movie matching
│   ├── ottProviders.js         # OTT deep-link mappings
│   ├── curatedCollections.js   # System curated collection logic
│   ├── homeDashboardData.js    # Homepage data aggregation
│   ├── mongodb.js              # Mongoose connection singleton
│   ├── seo.config.js           # Site-wide SEO constants
│   └── auth.js                 # Auth helpers
│
├── models/                     # Mongoose schemas
│   ├── User.js
│   ├── Collection.js
│   ├── Activity.js
│   ├── Comment.js
│   ├── Review.js
│   ├── ReviewLike.js
│   ├── CollectionLike.js
│   ├── CollectionFollow.js
│   ├── CollectionView.js
│   ├── CollectionActivity.js
│   ├── CollectionInvite.js
│   ├── CuratedCollection.js
│   ├── UserCuratedCollection.js
│   ├── SavedCollection.js
│   ├── Notification.js
│   └── UserAchievement.js
│
├── middleware.js                # Next.js edge middleware
├── next.config.mjs             # Next.js config
├── tailwind.config             # Tailwind config
└── package.json
```

---

## 🔄 Application Flow Diagrams

### 1. User Authentication Flow

```mermaid
flowchart TD
    A([User Visits MovieKart]) --> B{Session Exists?}
    B -- Yes --> C["Load User Context from NextAuth session"]
    B -- No --> D[Public Browse Mode]

    D --> E{User Action Requires Auth?}
    E -- No --> F[Continue Browsing]
    E -- Yes --> G["Redirect to /login"]

    G --> H[Login Page]
    H --> I{Has Account?}
    I -- No --> J["/register"]
    J --> K["Submit: username, email, password"]
    K --> L["POST /api/auth/register"]
    L --> M[bcrypt hash password]
    M --> N[Save User to MongoDB]
    N --> O[Return JWT Token]

    I -- Yes --> P["Submit: email + password"]
    P --> Q["POST /api/auth/login"]
    Q --> R[Verify bcrypt hash]
    R --> S{Valid?}
    S -- No --> T[401 Error Response]
    S -- Yes --> U[Issue JWT + NextAuth Session]

    O --> V[Client stores session]
    U --> V
    V --> W["UserProvider loads /api/me"]
    W --> C
    C --> X[Authenticated Experience]
```

---

### 2. Movie Discovery & Recommendation Flow

```mermaid
flowchart TD
    A([Authenticated User]) --> B[Home Dashboard]

    B --> C["/api/home-dashboard"]
    C --> D["TMDB: Trending Week"]
    C --> E["TMDB: Popular Movies"]
    C --> F["TMDB: Upcoming"]
    C --> G["TMDB: Popular TV Shows"]
    C --> H[Curated Collections from DB]

    B --> I{User Has Watch History?}

    I -- No --> J[Show Trending and Popular]
    I -- Yes --> K["POST /api/recommendations"]

    K --> L["Load User Profile: watchedMovies, favorites, favoriteActors, preferredLanguages"]
    L --> M["Score Movies by: Genre affinity, Actor overlap, Language match, Release era preference"]
    M --> N["Fetch TMDB Similar + Recommended for seed movies"]
    N --> O[Deduplicate and rank results]
    O --> P[Return Personalized Feed]

    B --> Q["/api/mood - Mood Discovery"]
    Q --> R["User selects mood: Emotional, Dark, Comfort, Mind-Bending, Adventure"]
    R --> S[Map mood to TMDB genres and keywords]
    S --> T[Fetch matching movies from TMDB]
    T --> U[Display mood-filtered results]

    B --> V[Search Bar]
    V --> W["/api/movies/search"]
    W --> X["TMDB: search/multi + search/tv"]
    X --> Y["Deduplicated Results: Movies + TV Shows + People"]

    P --> Z["Movie Detail /movie/:id"]
    U --> Z
    Y --> Z
    Z --> AA["TMDB: fetchMovieDetails - keywords, credits appended"]
    AA --> BB[OTT Provider Links]
    AA --> CC[Cast and Director Profiles]
    AA --> DD[Similar Movies]
    AA --> EE[Reviews from DB]
```

---

### 3. Collection Management Flow

```mermaid
flowchart TD
    A([User]) --> B{Collection Action}

    B --> C[Create Collection\nPOST /api/collections]
    C --> D[Set: name, description,\nvisibility, category, banner]
    D --> E[Auto-generate slug\nfrom name]
    E --> F[Save to MongoDB\nCollection model]

    B --> G[Add Movie to Collection\nPATCH /api/collections/:id]
    G --> H[Append TMDB movieId\nto movies array]
    H --> I[Log CollectionActivity]
    I --> J[Create Activity feed entry]

    B --> K[Invite Collaborator\nPOST /api/collections/:id/invite]
    K --> L[Create CollectionInvite\nstatus: pending]
    L --> M[Send Notification\nto invitee]
    M --> N{Invitee Response}
    N -- Accepted --> O[Add to collaborators array\nin Collection]
    O --> P[Send invite_accepted\nNotification]
    N -- Declined --> Q[Update status: declined]

    B --> R[Share Collection\nEnable shareToken]
    R --> S[Generate unique shareToken]
    S --> T[Return shareable URL\n/collection/:shareToken]

    B --> U[Like Collection\nPOST /api/collection-likes]
    U --> V[Upsert CollectionLike]
    V --> W[Increment likesCount\non Collection]
    W --> X[Trigger like Notification]

    B --> Y[Save Collection\nPOST /api/saved-collections]
    Y --> Z[Upsert SavedCollection]
    Z --> AA[Increment followersCount]

    F --> BB[Visibility Logic]
    BB --> CC{Visibility Level}
    CC -- public --> DD[Indexed in Collections Browser]
    CC -- unlisted --> EE[Accessible via direct link only]
    CC -- private --> FF[Owner + collaborators only]
    CC -- collaborative_private --> GG[Collaborators can edit not public]
```

---

### 4. Social & Activity Feed Flow

```mermaid
flowchart TD
    A([User Action]) --> B{Action Type}

    B --> C[Watch Movie\nmark as watched]
    B --> D[Add to Watchlist]
    B --> E[Add to Favorites]
    B --> F[Write Review\nPOST /api/reviews]
    B --> G[Add to Collection]

    C --> H[PATCH /api/watched]
    D --> I[PATCH /api/watchlist]
    E --> J[PATCH /api/favorites]
    F --> K[Save Review to DB]
    G --> L[PATCH collection movies array]

    H --> M[Create Activity\ntype: watched_add]
    I --> N[Create Activity\ntype: watchlist_add]
    J --> O[Create Activity\ntype: favorite_add]
    K --> P[Create Activity\ntype: review\nwith rating + comment meta]
    L --> Q[Create Activity\ntype: collection_add]

    M --> R[(Activity Collection\nindexed by userId + createdAt)]
    N --> R
    O --> R
    P --> R
    Q --> R

    R --> S[GET /api/feed]
    S --> T[Fetch following list\nfrom User.following]
    T --> U[Query Activities where\nuserId in following array\nNewest first, paginated]
    U --> V[Social Feed Display]

    W([Follow Action]) --> X[POST /api/follow]
    X --> Y[Add to User.followers\nand User.following arrays]
    Y --> Z[Create follow Notification]
    Z --> AA[GET /api/notifications]
    AA --> BB[Display Notification Bell]

    F --> CC[Review Likes\nPOST /api/review-likes]
    CC --> DD[Upsert ReviewLike]
    DD --> EE[Trigger like Notification]

    F --> FF[Comments\nPOST /api/comments]
    FF --> GG[targetType: review\ntargetId: reviewId\nSupports nested replies\nvia parentCommentId]
```

---

### 5. Achievements & Gamification Flow

```mermaid
flowchart TD
    A([User Performs Action]) --> B[Action triggers\nachievement check]

    B --> C[POST /api/achievements]
    C --> D[Load User stats:\nwatchedMovies.length\nfavorites.length\nfollowers.length]
    D --> E[Load from DB:\nReview count\nCollection count\nComment count\nReviewLike received]

    E --> F[Compute UserStats object:\nwatchedCount, reviewCount,\nfollowersCount, collectionCount,\ngenreCounts, totalRuntimeHours,\ncurrentActivityStreak]

    F --> G[Run BADGE_CATALOG checks\n40+ badge definitions]

    G --> H{New badges unlocked?}
    H -- No --> I[No-op]
    H -- Yes --> J[Upsert UserAchievement\nAdd to unlockedKeys]
    J --> K[Add to notifiedKeys]
    K --> L[Push achievement notification\nto user]

    L --> M[Display badge toast\non client]

    G --> N[Badge Categories]
    N --> N1[Watch Milestones\nfirst_watch 10 100 300 1000hrs]
    N --> N2[Genre Specialists\nSci-Fi Horror Drama Romance]
    N --> N3[Review Badges\nCritic Top Reviewer Review Master]
    N --> N4[Collection Curator\nPlaylist Creator to Collection Architect]
    N --> N5[Social Badges\nInfluencer Community Favorite]
    N --> N6[Streak Badges\n7-day and 30-day watch streaks]

    M --> O[Profile Page /profile]
    O --> P[Display earned badges\nwith rarity: Common to Legendary to Secret]
    P --> Q[Featured badges\nfeaturedKeys array]
```

---

## 🗄 Database Relationship Schema

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string username UK
        string email UK
        string password
        string avatar
        string bio
        number[] watchlist
        number[] watchedMovies
        number[] favorites
        number[] favoriteActors
        ObjectId[] followers FK
        ObjectId[] following FK
        string[] preferredLanguages
        object[] notInterested
        object[] recentSearches
        date createdAt
        date updatedAt
    }

    COLLECTION {
        ObjectId _id PK
        ObjectId ownerId FK
        string name
        string slug UK
        string imageUrl
        string bannerUrl
        string description
        string category
        string visibility
        object[] collaborators
        number views
        number likesCount
        number followersCount
        boolean shareEnabled
        string shareToken UK
        number[] movies
        date createdAt
        date updatedAt
    }

    REVIEW {
        ObjectId _id PK
        number movieId
        ObjectId userId FK
        string username
        number rating
        string comment
        date createdAt
        date updatedAt
    }

    COMMENT {
        ObjectId _id PK
        string targetType
        ObjectId targetId
        ObjectId userId FK
        string username
        string body
        ObjectId parentCommentId FK
        date createdAt
        date updatedAt
    }

    ACTIVITY {
        ObjectId _id PK
        ObjectId userId FK
        string username
        string userAvatar
        string type
        number movieId
        object meta
        date createdAt
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId recipientId FK
        ObjectId senderId FK
        string senderUsername
        string type
        ObjectId collectionId FK
        string collectionName
        string message
        boolean read
        date createdAt
    }

    COLLECTION_LIKE {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId collectionId FK
        date createdAt
    }

    COLLECTION_FOLLOW {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId collectionId FK
        date createdAt
    }

    COLLECTION_INVITE {
        ObjectId _id PK
        ObjectId collectionId FK
        ObjectId inviterId FK
        string inviteeUsernameOrEmail
        string status
        date createdAt
    }

    COLLECTION_VIEW {
        ObjectId _id PK
        ObjectId collectionId FK
        ObjectId userId FK
        date createdAt
    }

    COLLECTION_ACTIVITY {
        ObjectId _id PK
        ObjectId collectionId FK
        ObjectId userId FK
        string type
        number movieId
        date createdAt
    }

    REVIEW_LIKE {
        ObjectId _id PK
        ObjectId reviewId FK
        ObjectId userId FK
        date createdAt
    }

    SAVED_COLLECTION {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId collectionId FK
        date createdAt
    }

    CURATED_COLLECTION {
        ObjectId _id PK
        string slug UK
        string title
        string description
        string coverImage
        string category
        string[] tags
        number[] items
        number totalItems
        string mediaType
        string createdBy
        boolean featured
        number popularity
        date createdAt
    }

    USER_CURATED_COLLECTION {
        ObjectId _id PK
        ObjectId userId FK
        string collectionSlug FK
        boolean saved
        date createdAt
    }

    USER_ACHIEVEMENT {
        ObjectId _id PK
        ObjectId userId FK
        string[] unlockedKeys
        string[] notifiedKeys
        string[] featuredKeys
        date lastComputedAt
        date createdAt
    }

    USER ||--o{ COLLECTION : "owns"
    USER ||--o{ REVIEW : "writes"
    USER ||--o{ COMMENT : "posts"
    USER ||--o{ ACTIVITY : "generates"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ COLLECTION_LIKE : "likes"
    USER ||--o{ COLLECTION_FOLLOW : "follows"
    USER ||--o{ COLLECTION_INVITE : "sends"
    USER ||--o{ REVIEW_LIKE : "likes"
    USER ||--o{ SAVED_COLLECTION : "saves"
    USER ||--o| USER_ACHIEVEMENT : "earns"
    USER ||--o{ USER_CURATED_COLLECTION : "interacts"

    COLLECTION ||--o{ COLLECTION_LIKE : "receives"
    COLLECTION ||--o{ COLLECTION_FOLLOW : "receives"
    COLLECTION ||--o{ COLLECTION_INVITE : "has"
    COLLECTION ||--o{ COLLECTION_VIEW : "tracks"
    COLLECTION ||--o{ COLLECTION_ACTIVITY : "logs"
    COLLECTION ||--o{ SAVED_COLLECTION : "saved by"
    COLLECTION ||--o{ NOTIFICATION : "triggers"

    REVIEW ||--o{ REVIEW_LIKE : "receives"
    REVIEW ||--o{ COMMENT : "has"
```

> **Note on TMDB IDs:** All `movieId` fields store TMDB numeric IDs. TV shows use **negative IDs** (`-tmdbId`) to distinguish them from movies while sharing the same number field type. All poster/backdrop image URLs are constructed at runtime using `https://image.tmdb.org/t/p/`.

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/me` | Get current user session |

### Movies & TV

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/movies` | Proxy TMDB trending/popular |
| `GET` | `/api/movies/search?q=` | Multi-search movies, TV, people |
| `GET` | `/api/hero` | Hero carousel slides |
| `GET` | `/api/home-dashboard` | Aggregated homepage data |
| `GET` | `/api/recommendations` | Personalized AI recommendations |
| `GET` | `/api/mood?mood=` | Mood-based movie list |
| `GET` | `/api/sports` | Sports content |
| `GET` | `/api/similar-users` | Users with similar taste |
| `GET` | `/api/taste-profile` | User genre/actor analytics |
| `POST` | `/api/taste-match` | Compute taste similarity score |

### User Library

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/PATCH` | `/api/watchlist` | Get/update watchlist |
| `GET/PATCH` | `/api/watched` | Get/update watched movies |
| `GET/PATCH` | `/api/favorites` | Get/update favorites |
| `POST/DELETE` | `/api/follow` | Follow/unfollow users |

### Reviews & Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST/PATCH/DELETE` | `/api/reviews` | Review CRUD |
| `POST/DELETE` | `/api/review-likes` | Like/unlike reviews |
| `GET/POST/DELETE` | `/api/comments` | Threaded comments |

### Collections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/collections` | List / create collections |
| `GET/PATCH/DELETE` | `/api/collections/:id` | Single collection CRUD |
| `POST` | `/api/collections/:id/invite` | Invite collaborator |
| `POST/DELETE` | `/api/collection-likes` | Like/unlike collection |
| `POST/DELETE` | `/api/saved-collections` | Save/unsave collection |
| `GET` | `/api/curated-collections` | System curated lists |

### Social & Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/feed` | Activity feed from followed users |
| `GET/PATCH` | `/api/notifications` | Get / mark-read notifications |
| `GET` | `/api/achievements` | Compute and retrieve badges |
| `GET` | `/api/profile/:username` | Public user profile |
| `GET` | `/api/users` | User search |

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/moviekart

# TMDB API — supports both v3 API key and v4 Bearer token
TMDB_API_KEY=your_tmdb_api_key_or_bearer_token

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# JWT
JWT_SECRET=your_jwt_secret

# OpenAI (for AI recommendations)
OPENAI_API_KEY=your_openai_api_key

# Site URL (used for SEO canonical and OG URLs)
NEXT_PUBLIC_SITE_URL=https://moviekart.vercel.app
```

> **TMDB Key Detection:** The TMDB client auto-detects whether you are using a v3 API key (short string, appended as query param) or a v4 Bearer token (JWT-like, sent as Authorization header).

---

## 🚀 Getting Started

### Prerequisites

- Node.js **18+**
- MongoDB Atlas account (or local MongoDB)
- TMDB API account — [get a key](https://www.themoviedb.org/settings/api)
- OpenAI API account (optional, for AI features)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Aryansinha123/movieKart.git
cd moviekart

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# 4. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

---

## 🌐 SEO Architecture

MovieKart implements enterprise-grade SEO across all pages:

| SEO Feature | Implementation |
|---|---|
| **Dynamic Metadata** | `generateMetadata()` on every page |
| **JSON-LD Schemas** | Organization, WebSite, Movie, TVSeries, AggregateRating, BreadcrumbList |
| **XML Sitemap** | Auto-generated via `app/sitemap.js` — includes trending, popular, collections |
| **robots.txt** | Serves via `app/robots.js` — disallows API, auth, profile pages |
| **OpenGraph** | Dynamic OG images with movie poster, title, rating |
| **Twitter Cards** | `summary_large_image` for all movie pages |
| **Canonical URLs** | Every page declares `<link rel="canonical">` |
| **PWA Manifest** | `app/manifest.js` — icons, theme color, display mode |
| **ISR** | Movie pages revalidate every 24h |
| **Slug URLs** | SEO-friendly `/movie/interstellar-2014` instead of `/movie/603` |
| **SearchAction** | Schema.org `SearchAction` for Google Sitelinks Search Box |

---

## 📦 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**
4. Deploy — Vercel auto-detects Next.js and configures everything

```bash
# Or deploy via Vercel CLI
npx vercel --prod
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

### Pending Features (Good First Issues)

- [ ] Group watchlists / shared watch parties
- [ ] Email digests for weekly recommendations
- [ ] Improved AI explanation prompts for recommendations
- [ ] Pagination and infinite scroll for the collections browser
- [ ] Localization / multi-language UI support
- [ ] Rate limiting on public API routes
- [ ] Admin moderation tools for reviews/comments
- [ ] End-to-end testing setup

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👤 Author

**Aryan Sinha**

[![GitHub](https://img.shields.io/badge/GitHub-Aryansinha123-181717?style=flat-square&logo=github)](https://github.com/Aryansinha123)

---

<div align="center">

**MovieKart** — Built with love and coffee by Aryan Sinha

*This product uses the TMDB API but is not endorsed or certified by TMDB.*

</div>