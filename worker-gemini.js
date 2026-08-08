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

    // ── Autodiagnóstico: abre la URL del Worker con ?test=1 en el navegador ──
    if (req.method === "GET" && new URL(req.url).searchParams.get("test") === "1") {
      const parte = {
        clave_configurada: !!env.GEMINI_API_KEY,
        clave_empieza_por: env.GEMINI_API_KEY ? env.GEMINI_API_KEY.slice(0, 4) + "…" : "(no hay)",
        origen_permitido: env.ALLOWED_ORIGIN || "(cualquiera)",
        modelo: env.GEMINI_MODEL || "gemini-flash-latest",
      };
      if (!env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ estado: "FALTA LA CLAVE", ...parte }, null, 2),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      }
      try {
        const lista = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + env.GEMINI_API_KEY)
          .then((x) => x.json()).catch(() => ({}));
        parte.modelos_disponibles = (lista.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
          .map((m) => m.name.replace("models/", "")).slice(0, 25);
        const u = "https://generativelanguage.googleapis.com/v1beta/models/" + parte.modelo +
                  ":generateContent?key=" + env.GEMINI_API_KEY;
        const p = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Responde solo: hola" }] }],
            generationConfig: { maxOutputTokens: 20 } }) });
        const d = await p.json();
        const texto = (((d.candidates || [])[0] || {}).content || {}).parts?.[0]?.text || "";
        return new Response(JSON.stringify({
          estado: p.ok && texto ? "TODO CORRECTO" : "GEMINI DEVUELVE ERROR",
          http_gemini: p.status, respuesta_gemini: texto || d, ...parte }, null, 2),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ estado: "NO SE PUDO LLAMAR A GEMINI", fallo: String(e), ...parte }, null, 2),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    if (req.method !== "POST") return new Response("Solo POST", { status: 405, headers: cors });

    let body;
    try { body = await req.json(); }
    catch { return new Response('{"error":"JSON inválido"}', { status: 400, headers: cors }); }

    // El encargo es el último mensaje del usuario
    const mensajes = Array.isArray(body.messages) ? body.messages : [];
    const ultimo = mensajes.filter((m) => m && m.role === "user").pop();
    const prompt = ultimo && typeof ultimo.content === "string" ? ultimo.content : "";
    if (!prompt) return new Response('{"error":"sin encargo"}', { status: 400, headers: cors });

    // Google retira modelos con frecuencia: se prueban en cascada hasta dar con uno vivo
    const candidatos = [env.GEMINI_MODEL, "gemini-flash-latest", "gemini-3.6-flash",
                        "gemini-3.5-flash", "gemini-3.5-flash-lite"].filter(Boolean);

    // Los modelos 3.x gastan tokens "pensando" antes de responder: se les da margen
    // y se les pide que no piensen, para que la respuesta no salga cortada.
    const base = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: Math.min(Math.max(Number(body.max_tokens) || 1000, 2048), 4096),
        responseMimeType: "application/json",              // la app espera JSON limpio
      },
    };
    const conPensar = { ...base, generationConfig: { ...base.generationConfig, thinkingConfig: { thinkingBudget: 0 } } };

    let r, datos, usado;
    for (const m of candidatos) {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + m +
                  ":generateContent?key=" + env.GEMINI_API_KEY;
      const llamar = async (cuerpo) => {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo) });
        return [res, await res.json()];
      };
      try {
        [r, datos] = await llamar(conPensar);
        if (r.status === 400) [r, datos] = await llamar(base);   // ese modelo no admite el ajuste
      } catch (e) {
        return new Response('{"error":"la experta no responde"}', { status: 502, headers: cors });
      }
      usado = m;
      if (r.ok) break;
      if (r.status !== 404) break;                          // 404 = ese modelo ya no existe: siguiente
    }
    if (!r.ok) {
      const motivo = r.status === 429 ? "cuota agotada por hoy"
        : r.status === 404 ? "ningún modelo disponible: define GEMINI_MODEL con uno vigente"
        : "error del proveedor";
      return new Response(JSON.stringify({ error: motivo, modelo_probado: usado, detalle: datos }),
        { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Traducir la respuesta de Gemini al formato que lee PULSO
    const candidato = (datos.candidates || [])[0] || {};
    const texto = ((candidato.content || {}).parts || []).map((p) => p.text || "").join("");
    if (!texto) return new Response(JSON.stringify({ error: "respuesta vacía", motivo: candidato.finishReason || "?" }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    if (candidato.finishReason === "MAX_TOKENS")
      return new Response(JSON.stringify({ error: "respuesta cortada por longitud", parcial: texto.slice(0, 200) }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ content: [{ type: "text", text: texto }] }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  },
};
