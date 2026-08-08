# Activar la experta gratis con Gemini (15 minutos)

La experta genera definiciones y temas inéditos y arbitra tus palabras dudosas.
Con Gemini es **gratuita** dentro de su nivel sin coste (del orden de 15 peticiones
por minuto y 1.500 al día, suficiente para ti y tus 12 testers). No pide tarjeta.

## 1. Consigue la clave de Google (3 min)
1. Entra en **https://aistudio.google.com/apikey** con tu cuenta de Google.
2. Pulsa *Create API key* → elige o crea un proyecto → copia la clave (empieza por `AIza…`).
3. Guárdala en un sitio seguro. No la pegues nunca dentro de `index.html`.

## 2. Crea el Worker en Cloudflare (7 min)
1. Entra en **https://dash.cloudflare.com** y crea una cuenta gratuita si no la tienes.
2. Menú izquierdo → **Workers & Pages** → *Create* → *Start with Hello World* → *Deploy*.
3. Pulsa **Edit code**, borra todo lo que haya y pega el contenido de `worker-gemini.js`.
   Guarda con *Deploy*.
4. Vuelve al Worker → **Settings** → **Variables and Secrets**:
   - *Add* → tipo **Secret** → nombre `GEMINI_API_KEY` → valor: tu clave `AIza…`
   - *Add* → tipo **Text** → nombre `ALLOWED_ORIGIN` → valor: la URL exacta de tu juego,
     por ejemplo `https://iagoba90210-oss.github.io` (sin barra final). Así solo tu web puede usarlo.
   - (Opcional) *Add* → **Text** → `GEMINI_MODEL` → `gemini-2.5-flash`. Si algún día Google
     cambia el nombre del modelo, se corrige aquí sin tocar el código.
5. *Deploy* otra vez. Arriba verás la URL del Worker: `https://algo.tuusuario.workers.dev`. Cópiala.

## 3. Conéctalo al juego (2 min)
Abre `index.html`, busca cerca del principio la línea:
```js
window.CYL_PROXY = "";
```
y pega dentro tu URL:
```js
window.CYL_PROXY = "https://algo.tuusuario.workers.dev";
```
Sube el archivo a tu repositorio y listo. Compruébalo: si al empezar una prueba aparece
"🎓 La experta está redactando una prueba inédita…" y sale una definición que no estaba
en el banco, funciona.

## Comprobación rápida sin abrir el juego
Pega esto en la consola del navegador (F12), cambiando la URL:
```js
fetch("https://algo.tuusuario.workers.dev", {method:"POST", headers:{"Content-Type":"application/json"},
  body: JSON.stringify({max_tokens:200, temperature:1, messages:[{role:"user",
  content:'Responde SOLO con JSON: {"w":"PRUEBA","d":"una definición breve"}'}]})}).then(r=>r.json()).then(console.log)
```
Debe devolver un objeto con `content[0].text`. Si da error 403, revisa `ALLOWED_ORIGIN`;
si da 429, has agotado la cuota diaria y volverá mañana.

## Qué pasa si falla
Nada grave: la app espera 20 segundos, y si la experta no contesta usa el banco incrustado
(330 definiciones propias). El juego nunca se queda bloqueado.

## Si algún día quieres volver a Claude
Usa `worker-anthropic.js` en vez de este, con el secreto `ANTHROPIC_API_KEY`. Misma URL,
misma configuración en el juego. La calidad de las definiciones es algo mejor, pero se paga por uso.
