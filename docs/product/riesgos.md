# Riesgos

- Obtención/mantenimiento del corpus (80% del esfuerzo) — mitigado por
  ingesta asistida + revisión.
- Extracción incorrecta de letra chica o ticket — mitigada por revisión
  humana, no eliminada.
- Fragilidad de fuentes: un rediseño de sitio rompe el scraper en
  silencio — necesita chequeo de salud.
- Deriva hacia "preguntarle al modelo" en vez de usar el motor de reglas —
  ver `../decisions/004-llm-solo-en-ingesta.md`.
- Términos de uso de las fuentes prohíben scraping — mitigar con
  `robots.txt`, frecuencia limitada, identificación del agente.
- Retención de imágenes de ticket: información personal, política sin
  definir.
- Momento de uso / notificaciones: solo 16% acepta permisos (Web Almanac
  2025) — debilita el disparo contextual.
- Riesgo de derivar en un buscador de promos — permanente, ver regla de
  oro en `problema.md`.
