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
