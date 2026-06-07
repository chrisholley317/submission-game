// SUBMISSION — AI Judge proxy (Cloudflare Worker)
// Keeps your Anthropic API key server-side. The game posts answers here; this
// calls Anthropic and returns the verdicts. The key is NEVER sent to the browser.
//
// Deploy: see the steps your assistant gave you. Set the key as a Worker secret
// named ANTHROPIC_API_KEY (do NOT paste it into this file).

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") {
      return json({ error: "POST only" }, cors, 405);
    }
    try {
      const { card, entries } = await request.json();
      if (!entries || !entries.length) return json([], cors);
      const prompt = (card && card.prompt) || "wrestling answers";
      const system =
        `You are judging a wrestling Scattergories game. Be strict but fair. ` +
        `Card: "${prompt}". Only accept documented real wrestling answers. ` +
        `Return ONLY a JSON array: ` +
        `[{"player":"","answer":"","valid":true,"canonical":"name","pts":1}]`;

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          system,
          messages: [
            { role: "user", content: `Validate for card "${prompt}":\n${JSON.stringify(entries)}` },
          ],
        }),
      });

      const data = await r.json();
      const text = (data.content || []).map((b) => b.text || "").join("").trim();
      let out;
      try {
        out = JSON.parse(text.replace(/```json|```/g, "").trim());
      } catch {
        // If the model didn't return clean JSON, fail safe: mark unknowns invalid.
        out = entries.map((e) => ({ ...e, valid: false, canonical: e.answer, pts: 0 }));
      }
      return json(out, cors);
    } catch (e) {
      return json({ error: String(e) }, cors, 500);
    }
  },
};

function json(obj, cors, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
