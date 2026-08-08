// ══════════════════════════════════════════════════════════════
// PULSO · la experta con Gemini (Cloudflare Worker)
// La clave vive como secreto del servidor: el cliente nunca la ve.
// El Worker traduce del formato que envía PULSO al de Gemini y
// devuelve la respuesta con la forma que la app espera.
// ══════════════════════════════════════════════════════════════
export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Solo POST", { status: 405, headers: cors });

    let body;
    try { body = await req.json(); }
    catch { return new Response('{"error":"JSON inválido"}', { status: 400, headers: cors }); }

    // El encargo es el último mensaje del usuario
    const mensajes = Array.isArray(body.messages) ? body.messages : [];
    const ultimo = mensajes.filter((m) => m && m.role === "user").pop();
    const prompt = ultimo && typeof ultimo.content === "string" ? ultimo.content : "";
    if (!prompt) return new Response('{"error":"sin encargo"}', { status: 400, headers: cors });

    const modelo = env.GEMINI_MODEL || "gemini-2.5-flash";   // el nivel gratuito cubre Flash
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
                modelo + ":generateContent?key=" + env.GEMINI_API_KEY;

    const peticion = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: typeof body.temperature === "number" ? Math.min(Math.max(body.temperature, 0), 1) : 1,
        maxOutputTokens: Math.min(Number(body.max_tokens) || 1000, 1600),
        responseMimeType: "application/json",              // la app espera JSON limpio
      },
    };

    let r, datos;
    try {
      r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(peticion),
      });
      datos = await r.json();
    } catch (e) {
      return new Response('{"error":"la experta no responde"}', { status: 502, headers: cors });
    }
    if (!r.ok) {
      const motivo = r.status === 429 ? "cuota agotada por hoy" : "error del proveedor";
      return new Response(JSON.stringify({ error: motivo, detalle: datos }), { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Traducir la respuesta de Gemini al formato que lee PULSO
    const partes = ((datos.candidates || [])[0] || {}).content || {};
    const texto = (partes.parts || []).map((p) => p.text || "").join("");
    if (!texto) return new Response('{"error":"respuesta vacía"}', { status: 502, headers: cors });

    return new Response(JSON.stringify({ content: [{ type: "text", text: texto }] }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  },
};
