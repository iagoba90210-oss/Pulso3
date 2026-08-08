# PULSO — publicar, empaquetar y comercializar

**Qué ha cambiado para poder comercializar**: el juego se llama ahora PULSO, con
pruebas renombradas y recalibradas (La ganzúa, En el blanco, Destapadas, Dos caras,
Pareja de diez, La matrioska, Cadena mental, Cálculo en frío, El anagrama, Cuenta
relámpago y La ráfaga final), economía propia en monedas 🪙 y ninguna referencia al
formato televisivo. El léxico procede ahora del corrector libre Hunspell es_ES
(RLA-ES, licencia MPL 1.1/GPL/LGPL — apta para uso comercial con atribución, ya
incluida en el pie de la app). La lista de frecuencias (FrequencyWords/OpenSubtitles
2018) es CC BY-SA 4.0: mantén su atribución. Sigue sin ser asesoría jurídica: la
similitud estructural con concursos clásicos es terreno de un abogado de PI, pero
los tres riesgos gruesos (nombre/marca, léxico scrapeado, prompts con la marca
ajena) están eliminados.

## 1. Conseguir tu URL (5 minutos)
- **Netlify Drop** (lo más rápido): entra en https://app.netlify.com/drop y arrastra esta
  carpeta. Te devuelve una URL https al momento (puedes personalizarla gratis).
- **GitHub Pages**: crea un repositorio, sube estos archivos, Settings → Pages →
  Deploy from branch → main. URL: https://TUUSUARIO.github.io/REPO/
Con la URL abierta en Chrome (móvil): menú ⋮ → «Instalar aplicación».

## 2. El proxy de la experta (imprescindible para comercializar)
La clave de API nunca debe viajar en la app. `worker.js` es un proxy para Cloudflare:
1. https://dash.cloudflare.com → Workers & Pages → Create Worker → pega `worker.js` → Deploy.
2. En el Worker: Settings → Variables → **Add secret**: nombre `ANTHROPIC_API_KEY`,
   valor tu clave (console.anthropic.com → API keys).
3. (Recomendado) Otra variable `ALLOWED_ORIGIN` = la URL exacta de tu app, para que
   solo tu web pueda usarlo. Y en Security → añade una regla de *rate limiting*
   (p. ej. 30 peticiones/minuto por IP) para que nadie te vacíe el crédito.
4. Copia la URL del Worker y pégala en `index.html`, línea `window.CYL_PROXY = "";`.
   Vuelve a subir. Listo: experta para todos tus usuarios, clave a salvo.
Plan gratuito de Workers: 100.000 peticiones/día. Coste de la experta: cada prueba
generada o palabra arbitrada es una llamada a claude-sonnet (~céntimos por partida;
vigílalo en console.anthropic.com → Usage).

## 3. APK / Play Store
- **APK directo**: https://www.pwabuilder.com con tu URL → Android → descarga `.apk`
  (instalación directa) y `.aab` (Play Store).
- **Play Store**: cuenta de desarrollador de Google (pago único de 25 $), sube el
  `.aab`, ficha de la tienda, y pasa la revisión.

## 4. Antes de cobrar por ello — léelo en serio
- **Derechos del formato**: «Cifras y Letras» es la adaptación española de un formato
  televisivo con propietario (y el nombre, una marca en uso por RTVE). Comercializar
  con ese nombre y esa estructura de pruebas te expone a una reclamación. Camino
  seguro: renombrar el juego, rediseñar la identidad visual y diferenciar las pruebas
  (las dos «de la casa» que ya tiene son un buen comienzo); camino formal: licenciar.
- **Licencias de datos**: la lista de frecuencias (hermitdave/FrequencyWords) es
  CC-BY-SA — exige atribución y puede exigir compartir igual; el diccionario de
  JorgeDuenasLerin debe revisarse en su repositorio. Verifica ambas antes de vender,
  o sustituye las fuentes por listas propias.
- **API de Anthropic**: el uso comercial está permitido; revisa los términos vigentes
  y presupuesta el coste por usuario activo.
Esto no es asesoría jurídica: para comercializar en serio, una consulta con un
abogado de propiedad intelectual es dinero bien gastado.

## 5. Qué guarda la app
Bote, antirrepetición y configuración de la experta: localStorage del dispositivo.
