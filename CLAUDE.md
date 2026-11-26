# Alpaka Test

Webová appka pro firemní/kamarádské bodování fyzické zdatnosti.
Plán, bodování a rozhodnutí: viz `PLAN.md` (je to zdroj pravdy, udržuj ho aktuální).

## Kde začít
Přečti `PLAN.md`, sekci **Fáze**, a pokračuj první neodškrtnutou. Jedna fáze najednou.

## Jak pracovat s Tomášem
- Česky, neformálně, stručně, s konkrétním příkladem.
- Claude píše kód, Tomáš určuje směr a kontroluje.
- Tomáš umí základy Pythonu, gitu a Linuxu; JavaScript nezná, nové koncepty krátce vysvětli.
- Před větší změnou krátký plán; max. 1–3 otázky, jinak rozhodni a řekni předpoklad.
- Kód kompletní a spustitelný, vždy napiš, jak ho spustit a otestovat.
- Na špatné řešení upozorni a navrhni lepší.

## Pravidla kódu
- Čisté HTML/CSS/JS (ES moduly), žádné npm ani build. Nová závislost jen po domluvě.
- UI v češtině, mobile-first (od šířky 360 px), velká tlačítka, číselná klávesnice.
- Bodovací logika jen v `js/scoring.js`, pokrytá testy v `tests.html`.
- Uživatelský text vkládat přes `textContent`, nikdy přes `innerHTML`.
- CSV: středník, UTF-8 s BOM, ID testu proti duplicitám, ošetřit buňky začínající `= + - @`.
- Relativní cesty (Pages běží v podsložce `/<repo>/`).
- Tři záložky: Spustit testování (hlavní), Historie testů (pod heslem), Kalkulačka.
- Kalkulačka a test sdílejí bodování z `js/scoring.js`.
- Vzhled podle `design/` (viz `design/README.md`); je to předloha, HTML z ní nekopírovat 1:1.

## Bezpečnost
- V repu smí být jen Supabase URL a publishable klíč (chrání je RLS).
- Nikdy necommitovat secret/service_role klíč, hesla ani `.env`.
- Týmové heslo nikdy nezapisovat do žádného souboru, ověřuje ho Supabase Auth.
- Každá tabulka má zapnuté RLS; registrace v Supabase zůstává vypnutá.
- Názvy hodností jsou záměrné (kamarádský humor), neměnit.

## Spuštění
    py -m http.server 8000        (Linux: python3 -m http.server 8000)
Appka: http://localhost:8000, testy: http://localhost:8000/tests.html
(Otevření index.html dvojklikem nefunguje kvůli ES modulům.)

## Git
Na začátku práce `git pull`, na konci `git commit` a `git push`.
