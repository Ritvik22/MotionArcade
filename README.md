# Flap Pose

MediaPipe Pose web app with two motion games: Flappy Bird and Cricket.

## Run

```bash
cd /Users/ritvikshah/posture-checker-site
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000), click **Start Camera**, then choose a game tab.

## How controls work

- Flappy: both hands downward flap makes the bird jump.
- Cricket: swing your right hand to hit the ball; timing decides 1 to 6 runs.
- Fold your arms across your chest to reset the active game.
- If hand tracking is weak, keep your full upper body and both hands visible.

## Vercel Analytics

Vercel Web Analytics is now integrated in `index.html` via:

- `window.va` bootstrap function
- `/_vercel/insights/script.js`

To see visitors/page views:

1. Import this repo into Vercel and deploy.
2. Enable **Analytics** in your Vercel project.
3. Visit the deployed site and check the Analytics tab after traffic comes in.

## Global Leaderboards (Database)

This app now includes a global leaderboard API at `api/leaderboard.js`.

It uses Supabase (PostgREST) and expects these environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended on server) or `SUPABASE_ANON_KEY`

Setup steps:

1. Ensure your Supabase integration injects the env vars above into this Vercel project.
2. Create this table in Supabase SQL editor:

```sql
create table if not exists public.leaderboard_scores (
  id bigserial primary key,
  game text not null check (game in ('flappy', 'cricket')),
  name text not null check (char_length(name) between 1 and 18),
  score integer not null check (score >= 0),
  updated_at timestamptz not null default now(),
  unique (game, name)
);
```

3. Redeploy the project.

After that, score submissions and leaderboard reads are live globally for:

- `flappy`
- `cricket`
