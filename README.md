# En bättre bild – showroom

Hemsida och 3D-showroom för fotofirman En bättre bild. Utan byggsteg.

- `public/index.html` – startsidan: Sökaren överst (`js/sokaren.js`, WebGL2: scrollen ställer skärpan genom ett urval bilder, regn på linsen), sedan alla bilder, om, priser och kontakt, med knapp till showroomet. Utan WebGL2 visas Perrongen överst i stället.
- `public/showroom.html` – 3D-showroomet (Three.js): sidans HTML och CSS, och listan över skriptfilerna
- `public/js/` – koden, uppdelad i filer som laddas i ordning (se längst ner i `showroom.html`)
  - `foton.js` – fotona på väggarna
  - `fotomatt.js` – bildernas format (bredd/höjd) för den vanliga sidan; saknas en bild där mäts den när den laddas
  - `bakning.js` – ljusmotorn och rummens form, ljus och fotoplatser
  - `start.js`, `texturer.js`, `motor.js` – grunden: hjälpfunktioner, texturer, renderare och ytor
  - `rum-*.js` – ett rum per fil; `gata.js` och `promenaden.js` – gatan och entrén
  - `oppningar.js`, `inredning.js` – öppningar, menytavlor, sittplatser, monitorer, kamera
  - `rumsladdning.js`, `efterbehandling.js`, `ljud.js`, `styrning.js`, `tur.js`, `loop.js`
  - `main.js` – startar sidan, laddas sist
- `public/img/` – fotona som hänger på väggarna
- `public/bake/<rum>/` – ljus förbakat i Blender (Cycles): en ljuskarta per yta (`sNN.png`) och föremålens ljus (`props.bin`). Rum som finns här laddar ljuset i stället för att räkna det i webbläsaren. `?jsljus` räknar som förr. Rum i `GLASS` (`rumsladdning.js`) får glas i ramarna som speglar rummet (`?utanglas` stänger av). Ändras rummets innehåll används webbläsarens ljus tills rummet bakas om.

Alla filer delar samma globala namn, så ordningen i `showroom.html` spelar roll: en fil får bara
använda saker från tidigare filer när den laddas (inuti funktioner går det bra att använda allt).

## Publicering
Cloudflare Pages publicerar från `main`: inget byggkommando, utdatamapp `public`.
Andra grenar får en egen förhandsadress (`<gren>.en-battre-bild.pages.dev`) att testa på först.

## Lägga till ett foto (tills personalrummet finns)
Lägg bilden i `public/img/` och fyll i `src` och `title` för platsen i `PHOTOS` i `public/js/foton.js`.
Bilden syns då både i showroomet och i galleriet på startsidan.
Kör sedan `python3 tools/sma-bilder.py` (kräver Pillow), som gör de mindre versionerna i `public/img/640/` och `public/img/1200/` som galleriet laddar. Utan dem används originalet.
