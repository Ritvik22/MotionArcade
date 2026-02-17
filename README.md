# Flap Pose

MediaPipe Pose web app with two motion games: Flappy Bird and Cricket.

## Run

```bash
cd /Users/ritvikshah/posture-checker-site
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000), click **Start Camera**, then choose a game tab.

## How controls work

- Flappy: both hands upward flap makes the bird jump.
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

It uses Vercel KV (Upstash Redis via REST) and expects these environment variables:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Setup steps:

1. In Vercel, open your project and add a **KV** store.
2. Connect the KV store to this project so Vercel injects the env vars above.
3. Redeploy the project.

After that, score submissions and leaderboard reads are live globally for:

- `flappy`
- `cricket`
