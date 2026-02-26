# OpenSeat

**Purdue Libraries Room & Crowding Availability**

> A PurdueTHINK consulting deliverable for Purdue Libraries & School of Information Studies (Spring 2026).

**Live URL:** `https://openseat.vercel.app` *(update after deployment)*

---

## Tech Stack

- **Next.js** (App Router) + TypeScript
- **TailwindCSS** + shadcn/ui
- **Supabase** (Postgres)
- **Vercel** (deployment)
- Light/Dark mode with `next-themes`

## Features

- View all Purdue libraries with live crowding indicators
- Drill into any library to see per-floor/zone crowding
- Check reservable room availability with time-window selector
- Mock data providers — swap to real APIs (Occuspace, LibCal, UniTime) when credentials are ready

## Local Development

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_ORG/openseat.git
cd openseat

# 2. Install dependencies
npm install

# 3. Create env file
cp .env.example .env.local
# Fill in your Supabase URL, anon key, and service role key

# 4. Set up the database
# In Supabase Dashboard → SQL Editor, run:
#   supabase/schema.sql   (creates tables)
#   supabase/seed.sql     (inserts demo data)

# 5. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Setup

1. Go to your Supabase project dashboard
2. Open **SQL Editor**
3. Paste and run `supabase/schema.sql`
4. Paste and run `supabase/seed.sql`

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Supabase service role key (never expose to client) |

## Deployment to Vercel

### 1. Create GitHub repo & push

```bash
# If using GitHub CLI:
gh repo create openseat --public --source=. --push

# Or manually:
git remote add origin https://github.com/YOUR_ORG/openseat.git
git push -u origin main
```

### 2. Connect to Vercel

```bash
# Option A: Vercel CLI
npm i -g vercel
vercel --prod

# Option B: Vercel Dashboard
# Go to vercel.com/new → Import your GitHub repo
```

### 3. Set environment variables in Vercel

In Vercel Dashboard → Project Settings → Environment Variables, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Verify

Visit your deployment URL. You should see the library cards with crowding data.

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── libraries/route.ts      # GET /api/libraries
│   │   ├── crowding/route.ts       # GET /api/crowding?librarySlug=
│   │   ├── rooms/route.ts          # GET /api/rooms?librarySlug=
│   │   └── availability/route.ts   # GET /api/availability?librarySlug=&startISO=&endISO=
│   ├── libraries/[slug]/page.tsx   # Library detail page
│   ├── about/page.tsx              # About page
│   ├── layout.tsx                  # Root layout with theme
│   └── page.tsx                    # Home page
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── header.tsx
│   ├── theme-toggle.tsx
│   ├── theme-provider.tsx
│   └── crowd-badge.tsx
├── lib/
│   ├── providers/
│   │   ├── crowding/
│   │   │   ├── index.ts            # Factory (swap provider here)
│   │   │   └── mock.ts             # MockCrowdingProvider
│   │   └── reservations/
│   │       ├── index.ts            # Factory (swap provider here)
│   │       └── mock.ts             # MockReservationsProvider
│   ├── supabase/
│   │   ├── client.ts               # Anon client (client-safe)
│   │   └── server.ts               # Service role client (server-only)
│   ├── cache.ts                    # In-memory TTL cache
│   ├── types.ts                    # Shared TypeScript types
│   └── utils.ts                    # cn() utility
└── supabase/
    ├── schema.sql                  # Database schema
    └── seed.sql                    # Seed data
```

### Provider Pattern

To swap in a real provider (e.g., Occuspace):

1. Create `src/lib/providers/crowding/occuspace.ts` implementing `CrowdingProvider`
2. Update `src/lib/providers/crowding/index.ts` to return the new provider
3. Add any required env vars

## License

Internal project — Purdue Libraries / PurdueTHINK.
