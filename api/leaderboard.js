const ALLOWED_GAMES = new Set(["flappy", "cricket"]);
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(payload));
}

function getKvEnv() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function kvCommand(env, args) {
  const response = await fetch(env.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`KV command failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.result;
}

function parseLeaderboardResult(raw) {
  const entries = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({
      name: String(raw[i]),
      score: Number(raw[i + 1]),
    });
  }
  return entries;
}

module.exports = async (req, res) => {
  const env = getKvEnv();
  if (!env) {
    return json(res, 503, {
      error: "Leaderboard database not configured",
      hint: "Add a Vercel KV store to this project to enable global scores.",
    });
  }

  try {
    if (req.method === "GET") {
      const game = String(req.query.game || "flappy").toLowerCase();
      if (!ALLOWED_GAMES.has(game)) {
        return json(res, 400, { error: "Invalid game. Use flappy or cricket." });
      }

      const requestedLimit = Number(req.query.limit || DEFAULT_LIMIT);
      const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(requestedLimit)))
        : DEFAULT_LIMIT;

      const key = `leaderboard:${game}`;
      const raw = await kvCommand(env, ["ZREVRANGE", key, 0, limit - 1, "WITHSCORES"]);
      return json(res, 200, {
        game,
        entries: parseLeaderboardResult(raw || []),
      });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const game = String(body.game || "").toLowerCase();
      const name = String(body.name || "").trim();
      const numericScore = Number(body.score);
      const score = Number.isFinite(numericScore) ? Math.floor(numericScore) : NaN;

      if (!ALLOWED_GAMES.has(game)) {
        return json(res, 400, { error: "Invalid game. Use flappy or cricket." });
      }
      if (!name || name.length > 18) {
        return json(res, 400, { error: "Name is required (1-18 chars)." });
      }
      if (!Number.isFinite(score) || score < 0) {
        return json(res, 400, { error: "Score must be a non-negative integer." });
      }

      const key = `leaderboard:${game}`;
      const currentScoreRaw = await kvCommand(env, ["ZSCORE", key, name]);
      const currentScore =
        currentScoreRaw === null || currentScoreRaw === undefined ? null : Number(currentScoreRaw);
      const shouldUpdate = currentScore === null || score > currentScore;

      if (shouldUpdate) {
        await kvCommand(env, ["ZADD", key, score, name]);
      }

      const leaderboardSizeRaw = await kvCommand(env, ["ZCARD", key]);
      const leaderboardSize = Number(leaderboardSizeRaw || 0);
      if (leaderboardSize > 200) {
        await kvCommand(env, ["ZREMRANGEBYRANK", key, 0, leaderboardSize - 201]);
      }

      return json(res, 200, {
        ok: true,
        game,
        name,
        score,
        updated: shouldUpdate,
      });
    }

    return json(res, 405, { error: "Method not allowed." });
  } catch (error) {
    return json(res, 500, {
      error: "Leaderboard request failed",
      detail: String(error.message || error),
    });
  }
};
