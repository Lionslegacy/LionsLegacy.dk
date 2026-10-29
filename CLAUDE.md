# Lion’s Legacy – instruktioner til Claude

Dette repository er hjemmesiden **lionslegacy.dk** for virksomheden Lion’s Legacy (produkter og kreativt studie). Ejeren er ikke udvikler og beder om ændringer i almindeligt sprog. Svar altid på dansk, kort og uden teknisk jargon, og fortæl hvad der er ændret, og hvordan det ser ud nu.

## Sådan går ændringer live

- Siden er statisk HTML/CSS/JS uden byggetrin. GitHub Pages udgiver `main`-grenen fra roden.
- Lav ændringer på en ny gren og opret en pull request med en kort dansk titel og beskrivelse. Når ejeren merger, er ændringen live efter et par minutter.
- Slet eller ændr **aldrig** filen `CNAME` (indhold: `lionslegacy.dk`). Uden den forsvinder domænet.

## Struktur

| Fil | Indhold |
|---|---|
| `index.html` | Forside med hero (stor 3D-skulptur), to veje, udsagn, udvalgte produkter |
| `produkter.html` | Produktgitter og "Sådan bestiller du" |
| `studie.html` | Kreativt studie: ydelser og arbejdsgang |
| `om-os.html` | Historie, værdier, fakta |
| `kontakt.html` | Kontaktformular (åbner mailprogram via `mailto:`) og kontaktoplysninger |
| `privatliv.html` | Privatlivspolitik |
| `404.html` | Fejlside. Bruger **absolutte** stier (`/assets/...`, `/kontakt.html`) |
| `assets/css/style.css` | Al styling. Farver, gradienter og skrift som variabler i `:root` |
| `assets/js/main.js` | Mobilmenu, årstal, header ved scroll, lys på kort, indhold der glider frem, formularvalidering og `?produkt=`-udfyldning |
| `assets/js/scene.js` | 3D-baggrunden (WebGL uden biblioteker): løven fra logoet i poleret guld, der kigger derhen, hvor musen er, og gnister og lysstrømme, der følger musen. Opretter også pauseknappen. Løvens streger er kopieret fra `maerke.svg` til `LOGO_STREG` og `LOGO_FYLD`, så ændres logoet, skal de rettes med |
| `assets/js/sideskift.js` | Glidende sideskift: vælger retning (frem/tilbage i menuens rækkefølge) og holder menulinjen og 3D-baggrunden stille, mens indholdet glider. Styles under "Glidende sideskift" i `style.css` |
| `assets/fonts/` | Selvhostede skrifttyper (Bodoni Moda, Jost) |
| `assets/img/` | Logo (`maerke.svg`), favicon, delingsbillede (`deling.jpg`), `produkter/` til produktbilleder |
| `sitemap.xml`, `robots.txt` | Søgemaskiner. Tilføj nye sider til `sitemap.xml` |

Header (menu) og footer er **kopieret ind i hver HTML-fil**. Ændrer du menu, kontaktoplysninger eller footer, så ret det i alle syv HTML-filer, også `404.html`. Alle sider indlæser `sideskift.js` i `<head>` (lige efter `style.css`) og `main.js` (med `defer`) og `scene.js` (uden `defer`, så baggrunden er tegnet, før siden vises) nederst. `<body>` har `data-scene="forside"` på forsiden (stor skulptur i hero) og `data-scene="side"` på alle andre sider (mindre skulptur øverst til højre). Headerens `<div class="top__handling">` er der, hvor `scene.js` sætter pauseknappen ind.

## Designregler

Siden er et mørkt luksustema i guld og orange med en levende 3D-baggrund (inspireret af getlayers.ai, især skabelonen "Laocoon").

- Palet (brug kun disse via CSS-variablerne): sort `--sort #0b0a09` (baggrund), `--dyb #110f0c`, `--flade #18140f`, guld `--guld #d6a85a`, `--guld-lys #f2d39a`, orange `--orange #ec7a2c`, kobber `--kobber #b4521a`, pergament `--pergament #f3ebdd` (tekst), sten `--sten #bcb1a0` (sekundær tekst).
- Gradienter: `--gradient` (guldknapper), `--gradient-tekst` (fremhævede ord), `--gradient-kant` (hårfine kanter). Fremhæv ét eller to ord i en overskrift med `<em class="guldtekst">…</em>`, ikke hele afsnit. Guldet males kun inden for ordets kasse, så `em.guldtekst` har lidt ekstra padding (med negativ margin), for at kursive bogstaver som f, y og ? ikke skæres af. Bruges en gradient på andet end `<em>` eller med tæt linjehøjde, så tjek at bogstavernes haler står hele.
- Overskrifter: Bodoni Moda (`--serif`). Brødtekst: Jost (`--sans`). Tilføj ikke nye skrifttyper.
- Flader er mørkt glas: `.glas` (halvgennemsigtig med sløret baggrund og runde hjørner, `--radius`), gerne med `.glas--kant` (guld/orange hårlinje) og `.lys` (blødt lys, der følger markøren). Knapper, menu og små etiketter (`.maerkat`) er piller. Ingen versaler-etiketter, ingen emojis.
- Længere tekst skal stå på en `.glas`-flade, så den altid kan læses oven på 3D-baggrunden. `<body>` må ikke have en baggrund (så skjules 3D-baggrunden); baggrundsfarven ligger på `<html>`.
- 3D-baggrunden i `scene.js` er sidens eneste animation, der kører af sig selv. Den skal blive ved med at: følge musen, stoppe når fanen er skjult, stå stille ved `prefers-reduced-motion`, sænke opløsningen eller stoppe på svage maskiner og have pauseknappen i menulinjen (kræves af WCAG 2.2.2). Den er skrevet i ren WebGL uden biblioteker. Hent ikke Three.js eller andet fra et CDN.
- Indhold må glide blidt frem ved scroll med attributten `data-frem` (gøres kun, når bevægelse er tilladt).
- Når man skifter side, glider indholdet ud, og den nye side glider ind fra siden (browserens View Transitions, `sideskift.js`). Menulinjen og 3D-baggrunden bliver stående. Frem i menuens rækkefølge glider mod venstre, tilbage mod højre. Kører kun, når bevægelse er tilladt, og browsere uden understøttelse skifter side som normalt. Får en ny side en plads i menuen, så tilføj den i `ORDEN` i `sideskift.js`. Intet indhold (heller ikke skygger og `::before`/`::after`) må stikke ud til venstre for eller over `main` og footeren. Ellers viser Safari siden forskudt under skiftet og lader den hoppe på plads til sidst.
- Tilføj ikke andre animationer.
- Brug de eksisterende klasser (`.sektion`, `.ramme`, `.glas`, `.knap--guld`, `.knap--glas`, `.maerkat`, `.pillink`, `.produkter`, `.trin`, `.ydelser`, `.opfordring` osv.) før du skriver ny CSS.
- Logoet er `assets/img/maerke.svg` (løve med to L’er, uden ring). Indsæt det som `<img src="assets/img/maerke.svg" alt="">`, ikke som indlejret SVG. Fanebladsikonet er LL-seglet i `favicon.svg`. Delingsbilledet til sociale medier er `deling.jpg` (1200 × 630).
- Brandnavnet skrives **Lion’s Legacy** med typografisk apostrof (’).
- Al synlig tekst er på dansk, i aktiv form og uden fyldord. Knapper siger, hvad der sker ("Send besked", "Se produkterne").

## Privatliv og sikkerhed

- Siden lover i `privatliv.html`: ingen cookies, ingen sporing, ingen tredjepartsressourcer. Tilføj derfor ikke Google Fonts, CDN-scripts, statistik, pixels eller indlejrede videoer uden at ejeren beder om det. Beder ejeren om det, så opdater `privatliv.html` og forklar, om der kræves et cookie-samtykke.
- Læg aldrig adgangskoder, API-nøgler eller persondata i repository’et.

## Produkter

Hvert produkt er en `<li class="produkt">…</li>`-blok i `produkter.html` (de tre første vises også på forsiden i `index.html`). Når et produkt tilføjes eller ændres:

1. Kopier en eksisterende blok (`<li class="produkt glas glas--kant lys" data-frem>`) og ret navn, beskrivelse og pris (fx `1.495 kr.`).
2. Billede: læg det i `assets/img/produkter/` (højformat 4:5, ca. 1200 × 1500 px, under 400 KB, websikkert filnavn uden æøå og mellemrum). Erstat pladsholderen i `<figure class="produkt__billede">` med `<img src="assets/img/produkter/filnavn.jpg" alt="Dansk beskrivelse" loading="lazy">`.
3. Bestil-linket skal være `kontakt.html?produkt=` efterfulgt af produktnavnet URL-kodet.
4. Hold forsiden og produktsiden i sync, hvis produktet er blandt de tre første.

## Pladsholdere, der venter på rigtige oplysninger

Virksomhedsoplysninger (udfyldt): Axel Nyegaard Lambertsen, Spongparken 22, 8362 Hørning, CVR 46851803, telefon +45 30 46 32 50 / `tel:+4530463250`, mail `kontakt@lionslegacy.dk`, stiftet 2026, hjemby Aarhus. Adressen skifter til Aarhus, når ejeren flytter. Ret den så i footeren på alle syv HTML-filer, i `kontakt.html` og i `privatliv.html`.

Mangler stadig: produktnavnene `Produktnavn et` … `seks`, `Pris følger` og `Billede følger`. Når ejeren giver de rigtige oplysninger, erstat dem i alle filer.

## Dansk lovtjek

Gennemgå denne liste ved hver ændring, der berører indhold, kontaktoplysninger, formularer, scripts eller salg. Bryder en ændring et punkt, så sig det tydeligt til ejeren i stedet for at gå videre i stilhed. Listen er en huskeliste, ikke juridisk rådgivning. Skriver du juridiske tekster (fx handelsbetingelser), så sig, at de bør gennemgås af en rådgiver.

**Altid (e-handelsloven og GDPR)**
- Virksomhedens navn, geografiske adresse, e-mail og CVR-nummer skal være let tilgængelige. De står i footeren på alle sider. Fjern dem ikke.
- Link til `privatliv.html` skal være i footeren på alle sider. Privatlivspolitikken skal beskrive alle steder, data sendes hen (mailudbyder, formulartjenester, betalingsløsning, hosting).
- Ingen persondata, kundelister eller ordrer i repository'et. Det er offentligt.

**Cookies og lokal lagring (cookiebekendtgørelsen)**
- Alt, der gemmer eller læser data i besøgendes browser (cookies, `localStorage`, statistik, pixels, indlejret YouTube/Instagram/Google Maps), kræver forudgående, informeret samtykke, medmindre det er strengt nødvendigt for en funktion, brugeren selv har bedt om.
- Siden har i dag ingen cookies og intet cookie-banner. Tilføjes noget af ovenstående, skal der et samtykke-banner på, og `privatliv.html` skal opdateres. Sig det til ejeren, før du tilføjer det.

**Salg til forbrugere (forbrugeraftaleloven, også ved salg via e-mail)**
- Før købet skal kunden have de oplysninger, loven kræver (§ 8): hvem sælger, varens egenskaber, samlet pris inkl. moms og alle gebyrer og fragt, betaling og levering, klageadgang og fortrydelsesret.
- 14 dages fortrydelsesret skal oplyses, inkl. hvordan den bruges, og hvem der betaler returfragt.
- Fra 27. september 2026 skal oplysningerne også omfatte bl.a. garantiens varighed (og for relevante produkter softwareopdateringer og reparationsmuligheder). Tjek kravene, før produktsider udbygges.
- Priser til private vises altid inkl. moms.
- Får siden en kurv eller onlinebetaling: knappen, der afgiver ordren, skal tydeligt sige, at den forpligter til betaling, fx "Ordre med betalingsforpligtelse" (§ 12). Der skal være handelsbetingelser, en mulighed for at rette tastefejl før ordren afgives, og en ordrebekræftelse.

## Automatisk kvalitetstjek

Ved hver pull request kører GitHub-tjekket **Kvalitetstjek** (`.github/workflows/kvalitetstjek.yml`). Det tjekker:

- **Regler, links og lovkrav** (`.github/kvalitetstjek/regler.py`): døde links og filer, alt-tekster, titler og beskrivelser, ingen tredjepartsressourcer, `Lion’s` med typografisk apostrof, CNAME, `sitemap.xml`, virksomhedsoplysninger og link til privatlivspolitik på alle sider. Advarer om pladsholdere, cookies/lokal lagring og tegn på salg.
- **HTML-fejl** med html-validate (`.github/kvalitetstjek/htmlvalidate.json`).
- **Mobil, desktop og tilgængelighed** (`.github/kvalitetstjek/browser.py`): vandret scroll ved 390 px, filer der ikke indlæses, JavaScript-fejl og WCAG 2.1 AA med axe-core.

Kør tjekket selv, før du opretter pull requesten:

```bash
npm ci --prefix .github/kvalitetstjek
python .github/kvalitetstjek/regler.py
.github/kvalitetstjek/node_modules/.bin/html-validate --config .github/kvalitetstjek/htmlvalidate.json *.html
python .github/kvalitetstjek/browser.py   # kræver: pip install playwright && python -m playwright install chromium
```

Fejler tjekket på en pull request, så ret fejlene i samme pull request. Slå aldrig en regel fra for at få tjekket grønt uden at forklare ejeren hvorfor.

## Før du afleverer

- Kør kvalitetstjekket (se ovenfor) og ret alle fejl.
- Tjek at siden ser rigtig ud på mobil (ca. 390 px bred) og desktop, uden vandret scroll.
- Tjek at alle interne links virker, og at billeder har dansk `alt`-tekst.
- Behold synlig tastaturfokus, labels på formularfelter, respekt for `prefers-reduced-motion` og pauseknappen til 3D-baggrunden.
- Tjek at tekst kan læses oven på 3D-baggrunden på både mobil og desktop.
- Tilføjes en ny side: læg den i menuen i alle HTML-filer, i footeren og i `sitemap.xml`.
- Gennemgå "Dansk lovtjek" for ændringer, der berører indhold, data eller salg.
