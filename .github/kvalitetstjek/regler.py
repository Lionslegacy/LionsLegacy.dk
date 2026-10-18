#!/usr/bin/env python3
"""Kvalitetstjek for lionslegacy.dk: links, regler fra CLAUDE.md og danske lovkrav.

Fejl får tjekket til at fejle (rødt kryds). Advarsler vises, men stopper ikke.
Køres fra repository'ets rod:  python .github/kvalitetstjek/regler.py
"""
import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote

ROD = os.getcwd()
GITHUB = os.environ.get("GITHUB_ACTIONS") == "true"

fejl, advarsler = [], []


def fejl_(fil, besked):
    fejl.append((fil, besked))


def advar(fil, besked):
    advarsler.append((fil, besked))


class Side(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None
        self.titel = ""
        self._i_titel = False
        self.meta = {}
        self.ids = []
        self.links = []          # (tag, attr, værdi)
        self.imgs_uden_alt = 0
        self.eksterne = []       # ressourcer hentet fra andre domæner
        self.tekst = []
        self._skjul = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        if tag == "title":
            self._i_titel = True
        if tag == "meta" and a.get("name"):
            self.meta[a["name"]] = a.get("content", "")
        if tag in ("script", "style"):
            self._skjul += 1
        if "id" in a:
            self.ids.append(a["id"])
        for attr in ("href", "src"):
            if attr in a and a[attr] is not None:
                self.links.append((tag, attr, a[attr]))
        if tag == "img" and "alt" not in a:
            self.imgs_uden_alt += 1
        # Ressourcer, der hentes automatisk fra andre domæner (privatlivsløftet)
        ekstern = lambda u: bool(u) and (u.startswith("http") or u.startswith("//"))
        if tag in ("script", "img", "video", "audio", "source", "embed") and ekstern(a.get("src")):
            self.eksterne.append(a["src"])
        if tag == "link" and ekstern(a.get("href")):
            rel = (a.get("rel") or "").lower()
            if rel not in ("canonical", "alternate"):
                self.eksterne.append(a["href"])
        if tag == "iframe":
            self.eksterne.append(a.get("src") or "iframe")

    def handle_endtag(self, tag):
        if tag == "title":
            self._i_titel = False
        if tag in ("script", "style"):
            self._skjul = max(0, self._skjul - 1)

    def handle_data(self, data):
        if self._i_titel:
            self.titel += data
        if not self._skjul:
            self.tekst.append(data)


def uden_kommentarer(html):
    return re.sub(r"<!--.*?-->", "", html, flags=re.S)


sider = sorted(f for f in os.listdir(ROD) if f.endswith(".html"))
if not sider:
    fejl_("", "Fandt ingen HTML-sider i roden af repository'et.")

PLADSHOLDERE = ["[Dit navn]", "[Adresse]", "[Postnr. og by]", "[CVR-nummer]",
                "[Årstal]", "[By]", "+45 00 00 00 00", "Produktnavn ", "Pris følger", "Billede følger"]
KURV_ORD = re.compile(r"\b(læg i kurv|tilføj til kurv|kurv|køb nu|gå til kassen|checkout|betal nu)\b", re.I)

fundne_pladsholdere = {}

for fil in sider:
    sti = os.path.join(ROD, fil)
    raa = open(sti, encoding="utf-8").read()
    html = uden_kommentarer(raa)
    p = Side()
    p.feed(html)
    tekst = " ".join(p.tekst)

    # Grundlæggende
    if p.lang != "da":
        fejl_(fil, 'Siden mangler lang="da" på <html>.')
    if not p.titel.strip():
        fejl_(fil, "Siden mangler en <title>.")
    if not p.meta.get("description", "").strip() and fil != "404.html":
        fejl_(fil, "Siden mangler en meta-beskrivelse til Google (meta name=\"description\").")
    if "viewport" not in p.meta:
        fejl_(fil, "Siden mangler viewport-indstillingen, så den vises forkert på mobil.")
    dubletter = {i for i in p.ids if p.ids.count(i) > 1}
    if dubletter:
        fejl_(fil, f"Samme id bruges flere gange: {', '.join(sorted(dubletter))}.")
    if p.imgs_uden_alt:
        fejl_(fil, f"{p.imgs_uden_alt} billede(r) mangler alt-tekst (beskrivelse til skærmlæsere).")

    # Links og filer
    for tag, attr, url in p.links:
        if url.startswith(("http://", "https://", "mailto:", "tel:", "//", "data:")):
            continue
        if url.startswith("#"):
            if url[1:] and url[1:] not in p.ids:
                fejl_(fil, f"Linket {url} peger på et sted på siden, der ikke findes.")
            continue
        sti_del = unquote(urlparse(url).path)
        if not sti_del or sti_del in ("/", "./"):
            maal = os.path.join(ROD, "index.html")
        elif sti_del.startswith("/"):
            maal = os.path.join(ROD, sti_del.lstrip("/"))
        else:
            maal = os.path.normpath(os.path.join(os.path.dirname(sti), sti_del))
        if os.path.isdir(maal):
            maal = os.path.join(maal, "index.html")
        if not os.path.exists(maal):
            fejl_(fil, f"<{tag} {attr}=\"{url}\"> peger på en fil, der ikke findes.")

    # Privatlivsløftet: ingen tredjepartsressourcer
    for u in p.eksterne:
        fejl_(fil, f"Henter indhold fra et andet domæne ({u}). Det bryder løftet i privatlivspolitikken om ingen tredjepart. "
                   "Hostes filen lokalt i stedet, eller opdater privatliv.html og vurder cookie-samtykke.")

    # Stil: brandnavnet med typografisk apostrof
    if re.search(r"Lion's|Lion&#x27;s|Lion&#39;s", html):
        fejl_(fil, "Brandnavnet skal skrives Lion’s Legacy med typografisk apostrof (’).")

    # E-handelsloven: virksomhedsoplysninger skal være lette at finde
    if fil != "404.html":
        if "mailto:" not in html:
            fejl_(fil, "Mangler e-mailadresse (e-handelsloven kræver navn, adresse, e-mail og CVR).")
        if "CVR" not in tekst:
            fejl_(fil, "Mangler CVR-nummer (e-handelsloven).")
        if "privatliv.html" not in html:
            fejl_(fil, "Mangler link til privatlivspolitikken.")

    # Pladsholdere, der skal udfyldes før lancering
    for ph in PLADSHOLDERE:
        n = tekst.count(ph)
        if n:
            fundne_pladsholdere.setdefault(ph, []).append(fil)

    # Salg: forbrugeraftaleloven
    if KURV_ORD.search(tekst):
        advar(fil, "Siden ser ud til at have køb/kurv. Husk forbrugeraftaleloven: oplysningspligt (§ 8), "
                   "14 dages fortrydelsesret, handelsbetingelser og en ordreknap med teksten "
                   "'ordre med betalingsforpligtelse' (§ 12).")
    if re.search(r'<form[^>]+action="https?://', html, re.I):
        advar(fil, "En formular sender data til en ekstern tjeneste. Nævn tjenesten i privatliv.html.")

# Cookies og lokal lagring (cookiebekendtgørelsen)
for mappe, _, filer in os.walk(os.path.join(ROD, "assets")):
    for f in filer:
        if f.endswith(".js"):
            sti = os.path.join(mappe, f)
            js = open(sti, encoding="utf-8").read()
            if re.search(r"document\.cookie|localStorage|sessionStorage|indexedDB", js):
                advar(os.path.relpath(sti, ROD),
                      "Scriptet gemmer data i browseren. Efter cookiebekendtgørelsen kræver det samtykke, "
                      "medmindre det er strengt nødvendigt. Opdater privatliv.html.")
        if f.endswith(".css"):
            sti = os.path.join(mappe, f)
            css = open(sti, encoding="utf-8").read()
            for u in re.findall(r"url\(\s*['\"]?(https?:)?//[^)]+\)", css) + re.findall(r"@import\s+url\(\s*['\"]?https?://", css):
                fejl_(os.path.relpath(sti, ROD), "Stylesheetet henter noget fra et andet domæne. Host det lokalt.")

# Domæne og sitemap
cname = os.path.join(ROD, "CNAME")
if not os.path.exists(cname) or open(cname).read().strip() != "lionslegacy.dk":
    fejl_("CNAME", "Filen CNAME skal findes og indeholde præcis lionslegacy.dk, ellers forsvinder domænet.")

sitemap = os.path.join(ROD, "sitemap.xml")
if os.path.exists(sitemap):
    xml = open(sitemap, encoding="utf-8").read()
    i_sitemap = {u.split("lionslegacy.dk/", 1)[-1] or "index.html" for u in re.findall(r"<loc>([^<]+)</loc>", xml)}
    for fil in sider:
        if fil != "404.html" and fil not in i_sitemap:
            fejl_("sitemap.xml", f"{fil} mangler i sitemap.xml.")
    for fil in i_sitemap:
        if not os.path.exists(os.path.join(ROD, fil)):
            fejl_("sitemap.xml", f"sitemap.xml nævner {fil}, som ikke findes.")
else:
    fejl_("sitemap.xml", "sitemap.xml mangler.")

for ph, filer in fundne_pladsholdere.items():
    advar(", ".join(sorted(set(filer))), f"Pladsholderen '{ph.strip()}' er ikke udfyldt endnu.")

# ---------- Rapport ----------
def gh(niveau, fil, besked):
    fil_del = f" file={fil}" if fil and "," not in fil and os.path.exists(os.path.join(ROD, fil)) else ""
    print(f"::{niveau}{fil_del}::{besked}")


if GITHUB:
    for f, b in fejl:
        gh("error", f, b)
    for f, b in advarsler:
        gh("warning", f, b)
else:
    for f, b in fejl:
        print(f"FEJL      {f}: {b}")
    for f, b in advarsler:
        print(f"ADVARSEL  {f}: {b}")

opsummering = os.environ.get("GITHUB_STEP_SUMMARY")
if opsummering:
    with open(opsummering, "a", encoding="utf-8") as o:
        o.write("## Regler, links og lovkrav\n\n")
        o.write(f"Tjekkede {len(sider)} sider. **{len(fejl)} fejl** og {len(advarsler)} advarsler.\n\n")
        if fejl:
            o.write("### Fejl, der skal rettes\n\n" + "".join(f"- `{f}`: {b}\n" for f, b in fejl) + "\n")
        if advarsler:
            o.write("### Advarsler\n\n" + "".join(f"- `{f}`: {b}\n" for f, b in advarsler) + "\n")

print(f"\n{len(sider)} sider tjekket: {len(fejl)} fejl, {len(advarsler)} advarsler.")
sys.exit(1 if fejl else 0)
