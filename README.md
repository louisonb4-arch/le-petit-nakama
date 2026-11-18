# Le Petit Nakama — site web

Izakaya & bar à vins nature · 2 place François II, 44200 Nantes.

Site statique, sans étape de build : `index.html` + `img/`, `fonts/` (Amatic SC, Bricolage Grotesque, auto-hébergées) et `js/` (GSAP + ScrollTrigger, `main.js`).

- Aperçu local : `python3 -m http.server` puis http://localhost:8000
- Revoir l'intro (rideau noren) : ajouter `?intro` à l'URL
- Horaires : `js/main.js` (`SLOTS`) + liste `data-hours` et JSON-LD dans `index.html`
- Déploiement : Vercel, depuis la branche `main`
