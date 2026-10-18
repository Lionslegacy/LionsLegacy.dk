#!/usr/bin/env python3
"""Åbner alle sider i en rigtig browser på mobil og desktop og tjekker:
- at intet stikker ud til siden (vandret scroll)
- at alle filer indlæses, og at der ikke er JavaScript-fejl
- tilgængelighed (WCAG 2.1 AA) med axe-core

Køres fra repository'ets rod:  python .github/kvalitetstjek/browser.py
Kræver: pip install playwright && python -m playwright install chromium
        npm ci --prefix .github/kvalitetstjek   (henter axe-core)
"""
import functools
import http.server
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROD = os.getcwd()
HER = os.path.dirname(os.path.abspath(__file__))
AXE = os.environ.get("AXE_STI", os.path.join(HER, "node_modules", "axe-core", "axe.min.js"))
GITHUB = os.environ.get("GITHUB_ACTIONS") == "true"

SKAERME = {"mobil": {"width": 390, "height": 844}, "desktop": {"width": 1440, "height": 900}}
ALVORLIG = {"critical", "serious"}

fejl, advarsler = [], []


class StilleHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def start_server():
    handler = functools.partial(StilleHandler, directory=ROD)
    srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


if not os.path.exists(AXE):
    print(f"Fandt ikke axe-core på {AXE}. Kør: npm ci --prefix .github/kvalitetstjek")
    sys.exit(2)
axe_kilde = open(AXE, encoding="utf-8").read()

sider = sorted(f for f in os.listdir(ROD) if f.endswith(".html"))
srv = start_server()
base = f"http://127.0.0.1:{srv.server_address[1]}"

try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for navn, vp in SKAERME.items():
            # Reduceret bevægelse, så animationer ikke giver falske kontrastfejl
            ctx = browser.new_context(viewport=vp, reduced_motion="reduce")
            side = ctx.new_page()
            haendelser = []
            side.on("console", lambda m: haendelser.append(("console", m.text)) if m.type == "error" else None)
            side.on("pageerror", lambda e: haendelser.append(("js", str(e))))
            side.on("response", lambda r: haendelser.append(("http", f"{r.status} {r.url}")) if r.status >= 400 else None)
            side.on("requestfailed", lambda r: haendelser.append(("http", f"kunne ikke hente {r.url}")))

            for fil in sider:
                haendelser.clear()
                side.goto(f"{base}/{fil}", wait_until="networkidle")
                side.wait_for_timeout(150)

                bredde = side.evaluate("document.documentElement.scrollWidth")
                if bredde > vp["width"] + 1:
                    fejl.append((fil, f"{navn}: noget stikker {bredde - vp['width']} px ud til siden (vandret scroll)."))

                for art, tekst in haendelser:
                    if art == "http":
                        fejl.append((fil, f"{navn}: en fil kunne ikke indlæses: {tekst}"))
                    elif art == "js":
                        fejl.append((fil, f"{navn}: JavaScript-fejl: {tekst}"))
                    elif "Failed to load resource" not in tekst:
                        fejl.append((fil, f"{navn}: fejl i browserkonsollen: {tekst}"))

                side.evaluate(axe_kilde)
                resultat = side.evaluate(
                    """async () => {
                        const r = await axe.run(document, {
                          runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] },
                          resultTypes: ['violations']
                        });
                        return r.violations.map(v => ({
                          id: v.id, impact: v.impact, help: v.help,
                          antal: v.nodes.length,
                          eksempel: (v.nodes[0] && v.nodes[0].target.join(' ')) || ''
                        }));
                    }"""
                )
                for v in resultat:
                    besked = (f"{navn}: tilgængelighed ({v['id']}): {v['help']}. "
                              f"{v['antal']} sted(er), fx {v['eksempel']}")
                    (fejl if v["impact"] in ALVORLIG else advarsler).append((fil, besked))
            ctx.close()
        browser.close()
finally:
    srv.shutdown()

if GITHUB:
    for f, b in fejl:
        print(f"::error file={f}::{b}")
    for f, b in advarsler:
        print(f"::warning file={f}::{b}")
else:
    for f, b in fejl:
        print(f"FEJL      {f}: {b}")
    for f, b in advarsler:
        print(f"ADVARSEL  {f}: {b}")

opsummering = os.environ.get("GITHUB_STEP_SUMMARY")
if opsummering:
    with open(opsummering, "a", encoding="utf-8") as o:
        o.write("## Mobil, desktop og tilgængelighed\n\n")
        o.write(f"Tjekkede {len(sider)} sider på mobil (390 px) og desktop (1440 px). "
                f"**{len(fejl)} fejl** og {len(advarsler)} advarsler.\n\n")
        if fejl:
            o.write("### Fejl, der skal rettes\n\n" + "".join(f"- `{f}`: {b}\n" for f, b in fejl) + "\n")
        if advarsler:
            o.write("### Advarsler\n\n" + "".join(f"- `{f}`: {b}\n" for f, b in advarsler) + "\n")

print(f"\n{len(sider)} sider tjekket på mobil og desktop: {len(fejl)} fejl, {len(advarsler)} advarsler.")
sys.exit(1 if fejl else 0)
