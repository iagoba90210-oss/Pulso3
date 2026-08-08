// Cifras y Letras · proxy de la experta (Cloudflare Worker)
// La clave de Anthropic vive como secreto del servidor: el cliente nunca la ve.
export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*", // pon aquí tu dominio al comercializar
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Solo POST", { status: 405, headers: cors });

    let body;
    try { body = await req.json(); } catch { return new Response('{"error":"JSON inválido"}', { status: 400, headers: cors }); }

    // Blindaje: modelo fijo, tokens capados, sin campos extra del cliente
    const seguro = {
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(Number(body.max_tokens) || 1000, 1600),
      temperature: typeof body.temperature === "number" ? Math.min(Math.max(body.temperature, 0), 1) : 1,
      messages: (Array.isArray(body.messages) ? body.messages : []).slice(0, 4),
    };
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(seguro),
    });
    return new Response(await r.text(), { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
  },
};
