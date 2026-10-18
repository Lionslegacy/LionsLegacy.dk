# Lion’s Legacy – instruktioner til Claude

Dette repository er hjemmesiden **lionslegacy.dk** for virksomheden Lion’s Legacy (produkter og kreativt studie). Ejeren er ikke udvikler og beder om ændringer i almindeligt sprog. Svar altid på dansk, kort og uden teknisk jargon, og fortæl hvad der er ændret, og hvordan det ser ud nu.

## Sådan går ændringer live

- Siden er statisk HTML/CSS/JS uden byggetrin. GitHub Pages udgiver `main`-grenen fra roden.
- Lav ændringer på en ny gren og opret en pull request med en kort dansk titel og beskrivelse. Når ejeren merger, er ændringen live efter et par minutter.
- Slet eller ændr **aldrig** filen `CNAME` (indhold: `lionslegacy.dk`). Uden den forsvinder domænet.

## Struktur

| Fil | Indhold |
|---|---|
| `index.html` | Forside med hero ("manken"), to veje, udsagn, udvalgte produkter |
| `produkter.html` | Produktgitter og "Sådan bestiller du" |
| `studie.html` | Kreativt studie: ydelser og arbejdsgang |
| `om-os.html` | Historie, værdier, fakta |
| `kontakt.html` | Kontaktformular (åbner mailprogram via `mailto:`) og kontaktoplysninger |
| `privatliv.html` | Privatlivspolitik |
| `404.html` | Fejlside. Bruger **absolutte** stier (`/assets/...`, `/kontakt.html`) |
| `assets/css/style.css` | Al styling. Farver og skrift som variabler i `:root` |
| `assets/js/main.js` | Mobilmenu, årstal, formularvalidering og `?produkt=`-udfyldning |
| `assets/fonts/` | Selvhostede skrifttyper (Bodoni Moda, Jost) |
| `assets/img/` | Mærke, favicon, delingsbillede, `produkter/` til produktbilleder |
| `sitemap.xml`, `robots.txt` | Søgemaskiner. Tilføj nye sider til `sitemap.xml` |

Header (menu) og footer er **kopieret ind i hver HTML-fil**. Ændrer du menu, kontaktoplysninger eller footer, så ret det i alle syv HTML-filer, også `404.html`.

## Designregler

- Palet (brug kun disse via CSS-variablerne): antracit `--antracit #1c1d20`, `--dyb #141517`, `--flade #24262a`, messingguld `--guld #c6a15b`, `--guld-lys #e3c98f`, pergament `--pergament #ece5d8`, sten `--sten #a39e94`.
- Overskrifter: Bodoni Moda (`--serif`). Brødtekst: Jost (`--sans`). Tilføj ikke nye skrifttyper.
- Stilen er mørk og eksklusiv: hårfine guldlinjer, skarpe hjørner (radius 0–2px), ingen skygger, ingen afrundede "kort", ingen versaler-etiketter, ingen emojis.
- Den eneste automatiske animation er manken i hero. Tilføj ikke flere indgangsanimationer.
- Brug de eksisterende klasser (`.sektion`, `.ramme`, `.knap--guld`, `.knap--linje`, `.produkter`, `.trin`, `.ydelser` osv.) før du skriver ny CSS.
- Brandnavnet skrives **Lion’s Legacy** med typografisk apostrof (’).
- Al synlig tekst er på dansk, i aktiv form og uden fyldord. Knapper siger, hvad der sker ("Send besked", "Se produkterne").

## Privatliv og sikkerhed

- Siden lover i `privatliv.html`: ingen cookies, ingen sporing, ingen tredjepartsressourcer. Tilføj derfor ikke Google Fonts, CDN-scripts, statistik, pixels eller indlejrede videoer uden at ejeren beder om det. Beder ejeren om det, så opdater `privatliv.html` og forklar, om der kræves et cookie-samtykke.
- Læg aldrig adgangskoder, API-nøgler eller persondata i repository’et.

## Produkter

Hvert produkt er en `<li class="produkt">…</li>`-blok i `produkter.html` (de tre første vises også på forsiden i `index.html`). Når et produkt tilføjes eller ændres:

1. Kopier en eksisterende blok og ret navn, beskrivelse og pris (fx `1.495 kr.`).
2. Billede: læg det i `assets/img/produkter/` (højformat 4:5, ca. 1200 × 1500 px, under 400 KB, websikkert filnavn uden æøå og mellemrum). Erstat pladsholderen i `<figure class="produkt__billede">` med `<img src="assets/img/produkter/filnavn.jpg" alt="Dansk beskrivelse" loading="lazy">`.
3. Bestil-linket skal være `kontakt.html?produkt=` efterfulgt af produktnavnet URL-kodet.
4. Hold forsiden og produktsiden i sync, hvis produktet er blandt de tre første.

## Pladsholdere, der venter på rigtige oplysninger

`[Dit navn]`, `[Adresse]`, `[Postnr. og by]`, `[CVR-nummer]`, `[Årstal]`, `[By]`, telefon `+45 00 00 00 00` / `tel:+4500000000`, mail `kontakt@lionslegacy.dk` (også i formularens `data-modtager` i `kontakt.html`), produktnavnene `Produktnavn et` … `seks`, `Pris følger` og `Billede følger`. Når ejeren giver de rigtige oplysninger, erstat dem i alle filer.

## Før du afleverer

- Tjek at siden ser rigtig ud på mobil (ca. 390 px bred) og desktop, uden vandret scroll.
- Tjek at alle interne links virker, og at billeder har dansk `alt`-tekst.
- Behold synlig tastaturfokus, labels på formularfelter og respekt for `prefers-reduced-motion`.
- Tilføjes en ny side: læg den i menuen i alle HTML-filer, i footeren og i `sitemap.xml`.
