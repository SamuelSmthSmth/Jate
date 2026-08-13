# Migrate to Supabase

This plan outlines the steps to migrate Jate's backend from Firebase to Supabase, taking advantage of Supabase's Postgres database for relational data like jobs and friends.

## Open Questions
1. What are your Supabase **Project URL** and **anon (public) key**? (You can find these in Project Settings -> API in your Supabase dashboard).
2. Have you enabled Google OAuth in your Supabase dashboard (Authentication -> Providers -> Google) using your Google Cloud Credentials?

## Proposed Changes

### Database Schema (Supabase SQL)

We will create the following Postgres schema in Supabase:

```sql
-- 1. Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  photo_url TEXT,
  friend_code TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Jobs Table
CREATE TABLE jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  status TEXT,
  deadline TEXT,
  notes TEXT,
  url TEXT,
  posting_url TEXT,
  portal_url TEXT,
  applied_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Friends Table (Junction Table)
CREATE TABLE friends (
  user_id UUID REFERENCES auth.users NOT NULL,
  friend_id UUID REFERENCES auth.users NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
```

### Dependencies

#### package.json
- Add `@supabase/supabase-js`
- Remove `firebase`

### Configuration

#### src/supabase.ts
Initialize the Supabase client here using environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).

#### src/firebase.ts
Delete this file.

### Hooks

#### src/hooks/useAuth.js
- Refactor to use `supabase.auth.onAuthStateChange`.
- Upsert user profile data to the `profiles` table on login.
- Generate friend code in Postgres or client-side on first login.

#### src/hooks/useJobs.js
- Replace Firestore `onSnapshot` with Supabase `supabase.channel` for real-time updates.
- Replace `addDoc`, `updateDoc`, `deleteDoc` with Supabase `insert`, `update`, `delete`.

#### src/hooks/useSocial.ts
- Use Supabase SQL queries with joins to fetch friends (`SELECT * FROM profiles JOIN friends...`).
- Replace `arrayUnion` with an insert into the `friends` junction table.

#### src/hooks/useEmailAuth.ts
- Replace Firebase email auth with `supabase.auth.signUp` and `supabase.auth.signInWithPassword`.

### UI Components

#### src/app/App.tsx
- Replace any direct Firebase `updateDoc` calls with Supabase calls.

#### src/app/components/FriendsTab.tsx
- Remove direct Firebase imports and calls, relying on `useSocial` functions or Supabase client.
