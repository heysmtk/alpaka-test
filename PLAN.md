# Alpaka Test – plán MVP

## Cíl
Responzivní web (hlavně pro mobil): provede testem 8 disciplín, spočítá body,
určí hodnost a ukládá historii sdílenou přes Supabase.

## Technologie
- HTML + CSS + čistý JavaScript (ES moduly), bez npm a buildu.
- Hosting: GitHub Pages (veřejný repozitář).
- Server: Supabase Free (databáze + přihlášení), knihovna supabase-js z CDN s pevnou verzí.

## Bodování (max. 80)
Počítá se jen celý dosažený stupeň, max. 10 bodů na disciplínu, přeskočená = 0.

| # | Disciplína | Vstup | Body |
|---|---|---|---|
| 1 | Shyby nadhmatem | opakování | floor(x / 2) |
| 2 | Vznosy | opakování | floor(x / 2) |
| 3 | Bench press 80 % váhy | opakování | floor(x / 4) |
| 4 | Dřep 80 % váhy | opakování | floor(x / 4) |
| 5 | Kliky na bradlech | opakování | floor(x / 3) |
| 6 | Plank | čas | pod 1:30 = 0, jinak 1 + floor((s - 90) / 10) |
| 7 | Hyperextenze | čas | stejně jako plank |
| 8 | Cooperův běh | metry | pod 2100 = 0, jinak 1 + floor((m - 2100) / 100) |

Hodnosti: 70+ Magoři a psychopati, 55+ Vrcholoví sportovci, 45+ Hobby sportovci,
35+ Sluníčkáři, 25+ Zdechliny, 10+ Retardi, 0–9 Alpaky. Každá má emoji ikonku.

## Obrazovky
1. **Spustit testování** (hlavní): přezdívka a **tělesná váha (obojí povinné)**.
   Z váhy se spočítá zátěž na bench a dřep (80 %). Na body nemá váha vliv.
   Čas se zadává dvěma poli (minuty, sekundy). U cviku se průběžně ukazuje
   "N bodů z 10 · další bod za …". Přehled cviků je na mobilu sbalený, na webu vlevo.
   Pole váhy je úzké a na středu. Rozdělaný test se po otevření stránky nabídne
   na startu (Pokračovat / Zahodit).
   Pevné pořadí, Zpět / Další / Přeskočit, přehled cviků pro návrat k přeskočeným.
   Na konci body po cvicích, součet, hodnost, kolik chybí do další.
2. **Historie testů** (celá záložka pod týmovým heslem): datum, přezdívka, výkony,
   body, hodnost, stav synchronizace, mazání s potvrzením, export / import CSV, Zamknout.
3. **Kalkulačka** (bez hesla): tělesná váha, opakování, časy a běh na jedné obrazovce.
   Body a hodnost se přepočítávají hned (pruh nahoře zůstává vidět). Nic se neukládá.
   Prázdné pole = 0. Opakování a časy mají tlačítka − / + (opakování po 1, čas po 10 s);
   běh má jen pole.

## Design
Plátno: https://claude.ai/artifact/JwcqcGRp7pgBGdsndFk8Du
Lokální předloha: `design/README.md`, `design/obrazovky/*.html`, `design/logo.svg`,
`design/favicon.svg`.
Zelená #1F4D3A, oranžová #FF6A1F, text #14201B, pozadí #F4F5F0.
Nadpisy Barlow Condensed, text Inter. Logo a favicon: alpaka s oranžovou čelenkou.
Mobil: spodní lišta se 3 tlačítky (ikonka + název: Spustit, Historie, Kalkulačka),
aktivní je oranžové.
Web: záložky nahoře.

## Ukládání
- Rozdělaný test se průběžně ukládá v telefonu.
- Hotový test se uloží **nejdřív lokálně**, pak se odešle na server.
  Když server neběží nebo nejsi přihlášený, odešle se později. Nic se neztratí.
- Testovat a počítat v kalkulačce jde bez hesla. Historie (zobrazit, mazat, export,
  import) a odesílání na server jen po přihlášení. Telefon si přihlášení pamatuje.
- Bez předchozího přihlášení a s nedostupnou databází historii odemknout nejde,
  výsledky ale zůstávají uložené v telefonu.
- Mazání je "měkké" (`deleted_at`), omylem smazaný test jde obnovit v Supabase.
- Tělesná váha se na server neposílá.

## Zabezpečení
- Jeden týmový účet v Supabase Auth, uživatel zadává jen heslo.
- Heslo se nastaví jen v Supabase dashboardu a ověřuje ho server. Nesmí být v kódu,
  v těchto souborech ani v gitu (repo je veřejné).
- **Vypnout registraci nových uživatelů** a v RLS povolit přístup jen tomu jednomu účtu.
- Do kódu smí jen URL projektu a publishable klíč. Nikdy secret / service_role klíč
  ani heslo k databázi nebo týmovému účtu.

## Neaktivní databáze
Supabase Free pozastaví projekt po zhruba 7 dnech nízké aktivity.
1. **Prevence:** GitHub Actions workflow několikrát denně přečte tabulku `ping`.
   Není to zaručené a GitHub ve veřejném repu plánované workflow vypne po 60 dnech
   bez aktivity v repu (pak ho stačí znovu zapnout).
2. **Záloha – žlutá lišta:** web při otevření zkusí přečíst `ping`. Když se to nepovede
   a telefon je online, nahoře se zobrazí jemně žlutá lišta s černým textem:
   > INFO: Databáze není dostupná (pravděpodobně je neaktivní). Prosím napiš na
   > <e-mail> o obnovení. Testovat můžeš dál, výsledky se uloží v telefonu.

   Pokud telefon databázi dřív viděl, doplní se "Naposledy dostupná: <datum>".
   Bez internetu se místo toho ukáže "Jsi offline".
3. **Obnovení:** supabase.com → projekt → Resume project.

Kontaktní e-mail (`CONTACT_EMAIL`, je to `alpakatester@gmail.com`, ne soukromé číslo)
je v `js/config.js`, v liště jako odkaz `mailto:`. Je tedy veřejně vidět na webu i v repu.

## Struktura
    index.html
    css/style.css
    img/favicon.svg, img/logo.svg
    js/config.js      URL, publishable klíč, týmový e-mail, kontaktní e-mail
    js/scoring.js     disciplíny, body, hodnosti, "další bod za", zátěž 80 %
    js/storage.js     lokální data (zatím jen rozdělaný test) a fronta k odeslání
    js/db.js          Supabase (přihlášení, synchronizace, ping)
    js/csv.js         export / import (čisté funkce, testy v tests.html)
    js/app.js         obrazovky
    tests.html        testy bodování (celá bodovací tabulka), otevře se v prohlížeči
    supabase/schema.sql
    .github/workflows/keepalive.yml
    .gitignore        mimo jiné src/ (podklady do veřejného repa nepatří)
    src/              jen lokálně: bodovací tabulka (xlsx), hodnosti (jpeg)

## Fáze
Postupuj po jedné fázi. Po každé: spustit, ukázat Tomášovi, po odsouhlasení odškrtnout
tady a udělat commit. **Další na řadě: fáze 6.**

- [x] **Fáze 0 – příprava:** plán, CLAUDE.md, design (`design/`), logo, favicon, .gitignore
- [x] **Fáze 1 – bodování:** `js/scoring.js`, `tests.html`.
      Hotovo, když projdou testy hraničních hodnot všech disciplín i hodností.
- [x] **Fáze 2 – appka:** kostra se 3 záložkami (mobil + web podle designu), průchod
      testem, výsledek, průběžné ukládání, kalkulačka. Zkopírovat `favicon.svg` a `logo.svg`.
      Hotovo, když jde na šířce 360 px projít celý test a obnovení stránky nic nesmaže.
- [x] **Fáze 3 – lokální historie:** ukládání, mazání s potvrzením, export / import CSV
      (zatím bez zámku). Hotovo, když export → smazání → import vrátí stejná data.
      Uděláno: test se uloží do historie při dokončení (úprava přepíše stejný záznam),
      mobil = karty, web = tabulka, smazání má potvrzení, "měkké" (`deleted_at`).
      CSV (`js/csv.js`): středník, BOM, sloupce ID testu / Datum / Přezdívka / 8 výkonů /
      Body / Hodnost; čas v sekundách, přeskočený cvik = prázdná buňka. Body a hodnost se
      při importu ignorují a počítají znovu. Import: nové ID se přidá, smazané se obnoví,
      aktivní duplicity se přeskočí, chybné řádky se přeskočí a vypíšou. Texty začínající
      `= + - @` dostanou apostrof (import ho odebere). Váha se neukládá ani neexportuje.
- [x] **Fáze 4 – Supabase:** `supabase/schema.sql`, RLS, zámek historie, synchronizace.
      Hotovo, když bez hesla nejde přes API nic přečíst, zapsat ani smazat (kromě
      čtení `ping`) a test z jednoho telefonu je vidět na druhém.
      Uděláno: `schema.sql` (tabulky `tests` + `ping`, RLS jen pro UID týmového účtu,
      explicitní GRANTy, žádné DELETE), `js/config.js`, `js/db.js` (supabase-js 2.118.0
      z jsDelivr, načítá se až při potřebě). Historie je za zámkem (heslo, Zamknout),
      u testů je stav "na serveru / čeká na odeslání" (`synced` v `storage.js`; bez příznaku
      = čeká). Synchronizace = odeslat čekající, pak stáhnout vše; běží po přihlášení,
      po změně, při návratu online a ručně. Offline s dřívějším přihlášením se historie
      z telefonu ukáže. Ověřeno: RLS (anon nic nepřečte ani nezapíše kromě čtení `ping`) i přihlášení se synchronizací.
- [x] **Fáze 5 – neaktivní databáze:** žlutá lišta, keepalive workflow.
      Uděláno: `checkHealth()` v `db.js` čte `ping` přes `fetch` (8 s limit, bez přihlášení)
      při otevření, při změně připojení a při návratu do appky (max. 1× za minutu);
      lišta `#banner` v `index.html`: databáze nejde = žlutá s e-mailem a "Naposledy
      dostupná", offline = "Jsi offline". `.github/workflows/keepalive.yml`: 4× denně
      (`23 */6 * * *`) + ruční spuštění. Ověřeno: lišta i workflow na GitHubu (po pushi
      Actions → keepalive → Run workflow).
      Hotovo, když se lišta ukáže při ručně pozastaveném projektu.
- [ ] **Fáze 6 – nasazení:** veřejný GitHub repo, Pages, test na mobilu.

## Co dodá Tomáš
- Kdykoli před fází 6: `git init` a GitHub repozitář.
- Před fází 4: Supabase projekt (URL + publishable klíč) a týmový účet s heslem.
- Před fází 5: nic (kontakt v liště je e-mail `alpakatester@gmail.com`).

## Mimo MVP
Offline PWA, grafy zlepšení, žebříček, samostatné účty pro každého.
