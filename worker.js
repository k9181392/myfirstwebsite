export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/scores") {
      if (request.method === "GET") {
        return getScores(env);
      }

      if (request.method === "POST") {
        return saveScore(request, env);
      }
    }

    // Cloudflare Workers Static Assets
    return env.ASSETS.fetch(request);
  }
};

async function getScores(env) {
  const result = await env.DB.prepare(`
    SELECT nickname, score, time, kills, level, created_at
    FROM scores
    ORDER BY score DESC, time DESC, id ASC
    LIMIT 10
  `).all();

  return json(result.results);
}

async function saveScore(request, env) {
  try {
    const body = await request.json();

    const nickname = String(body.nickname ?? "")
      .trim()
      .slice(0, 12);

    const score = Number(body.score);
    const time = Number(body.time);
    const kills = Number(body.kills);
    const level = Number(body.level);

    if (!nickname) {
      return json({ error: "닉네임을 입력해 주세요." }, 400);
    }

    if (
      !Number.isInteger(score) ||
      !Number.isInteger(time) ||
      !Number.isInteger(kills) ||
      !Number.isInteger(level)
    ) {
      return json({ error: "잘못된 점수 데이터입니다." }, 400);
    }

    if (
      score < 0 || score > 100000000 ||
      time < 0 || time > 3600 ||
      kills < 0 || kills > 100000 ||
      level < 1 || level > 1000
    ) {
      return json({ error: "점수 데이터의 범위를 확인해 주세요." }, 400);
    }

    await env.DB.prepare(`
      INSERT INTO scores (nickname, score, time, kills, level)
      VALUES (?, ?, ?, ?, ?)
    `).bind(nickname, score, time, kills, level).run();

    return getScores(env);
  } catch (error) {
    console.error(error);
    return json({ error: "점수를 저장하지 못했습니다." }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
