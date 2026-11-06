# En bättre bild – showroom

3D-showroom för fotofirman En bättre bild. En enda sida (`index.html`) med Three.js, utan byggsteg.

- `public/index.html` – hela sajten: rummen, ljusbakningen, ljud och styrning
- `public/img/` – fotona som hänger på väggarna
- `wrangler.jsonc` – talar om för Cloudflare att lägga ut `public/`

## Publicering
Cloudflare (Workers) publicerar från `main` med `npx wrangler deploy`. Inget byggsteg.

## Lägga till ett foto (tills personalrummet finns)
Lägg bilden i `public/img/` och fyll i `src` och `title` för platsen i `PHOTOS` i `public/index.html`.
