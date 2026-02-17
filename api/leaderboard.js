const ALLOWED_GAMES = new Set(["flappy", "cricket"]);
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
const DEFAULT_TABLE = "leaderboard_scores";

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(payload));
}

function getSupabaseEnv() {
  const baseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "";
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "";
  const table = process.env.LEADERBOARD_TABLE || DEFAULT_TABLE;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey, table };
}

async function supabaseRequest(env, pathWithQuery, options = {}) {
  const response = await fetch(`${env.baseUrl}/rest/v1/${pathWithQuery}`, {
    method: options.method || "GET",
    headers: {
      apikey: env.apiKey,
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

module.exports = async (req, res) => {
  const env = getSupabaseEnv();
  if (!env) {
    return json(res, 503, {
      error: "Leaderboard database not configured",
      hint:
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in Vercel env vars.",
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

      const params = new URLSearchParams();
      params.set("select", "name,score");
      params.set("game", `eq.${game}`);
      params.set("order", "score.desc,updated_at.asc");
      params.set("limit", String(limit));
      const rows = await supabaseRequest(env, `${env.table}?${params.toString()}`, {
        method: "GET",
      });

      return json(res, 200, {
        game,
        entries: Array.isArray(rows)
          ? rows.map((row) => ({
              name: String(row.name),
              score: Number(row.score),
            }))
          : [],
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

      const nowIso = new Date().toISOString();
      const checkParams = new URLSearchParams();
      checkParams.set("select", "id,score");
      checkParams.set("game", `eq.${game}`);
      checkParams.set("name", `eq.${name}`);
      checkParams.set("limit", "1");
      const existingRows = await supabaseRequest(env, `${env.table}?${checkParams.toString()}`, {
        method: "GET",
      });

      const existing = Array.isArray(existingRows) && existingRows.length ? existingRows[0] : null;
      const currentScore = existing ? Number(existing.score) : null;
      const shouldUpdate = currentScore === null || score > currentScore;

      if (shouldUpdate) {
        if (!existing) {
          await supabaseRequest(env, env.table, {
            method: "POST",
            body: { game, name, score, updated_at: nowIso },
          });
        } else {
          const updateParams = new URLSearchParams();
          updateParams.set("game", `eq.${game}`);
          updateParams.set("name", `eq.${name}`);
          await supabaseRequest(env, `${env.table}?${updateParams.toString()}`, {
            method: "PATCH",
            body: { score, updated_at: nowIso },
          });
        }
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
