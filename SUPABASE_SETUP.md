# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose an organization, name your project (e.g., `rpg-quiz`), set a database password, and select a region
4. Wait for the project to be provisioned

## 2. Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase/schema.sql` from this project
3. Paste it into the SQL Editor and click **Run**
4. Verify all tables were created by checking the **Table Editor**

## 3. Create an Admin User

1. Go to **Authentication** → **Users** in your Supabase dashboard
2. Click **Add User** → **Create New User**
3. Enter an email and password for the admin account
4. After creating the user, note the user's UUID
5. Go to **SQL Editor** and run:

```sql
UPDATE public.participants
SET role = 'admin'
WHERE user_id = 'YOUR_USER_UUID_HERE';
```

> If no participant row exists yet, insert one:
```sql
INSERT INTO public.participants (user_id, name, email, role)
VALUES ('YOUR_USER_UUID_HERE', 'Admin', 'admin@example.com', 'admin');
```

## 4. Set Environment Variables

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the **Project URL** and **anon public** key
3. Create a `.env.local` file in the project root (copy from `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 5. Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Optionally disable "Confirm email" for development in **Authentication** → **Settings**

## 6. Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Table Overview

| Table | Purpose |
|-------|---------|
| `participants` | User profiles with RPG stats (level, xp, role) |
| `batches` | Quiz batches/sessions that group questions |
| `questions` | Quiz questions belonging to a batch |
| `options` | Answer options for each question |
| `answers` | Participant responses to questions |
