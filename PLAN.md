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
   > <telefon> o obnovení. Testovat můžeš dál, výsledky se uloží v telefonu.

   Pokud telefon databázi dřív viděl, doplní se "Naposledy dostupná: <datum>".
   Bez internetu se místo toho ukáže "Jsi offline".
3. **Obnovení:** supabase.com → projekt → Resume project.

Telefon bude v `js/config.js`. Pozor: je pak veřejně vidět na webu i v repu.

## Struktura
    index.html
    css/style.css
    img/favicon.svg, img/logo.svg
    js/config.js      URL, publishable klíč, telefon, týmový e-mail
    js/scoring.js     disciplíny, body, hodnosti, "další bod za", zátěž 80 %
    js/storage.js     lokální data (zatím jen rozdělaný test) a fronta k odeslání
    js/db.js          Supabase (přihlášení, synchronizace, ping)
    js/csv.js         export / import
    js/app.js         obrazovky
    tests.html        testy bodování (celá bodovací tabulka), otevře se v prohlížeči
    supabase/schema.sql
    .github/workflows/keepalive.yml
    .gitignore        mimo jiné src/ (podklady do veřejného repa nepatří)
    src/              jen lokálně: bodovací tabulka (xlsx), hodnosti (jpeg)

## Fáze
Postupuj po jedné fázi. Po každé: spustit, ukázat Tomášovi, po odsouhlasení odškrtnout
tady a udělat commit. **Další na řadě: fáze 3.**

- [x] **Fáze 0 – příprava:** plán, CLAUDE.md, design (`design/`), logo, favicon, .gitignore
- [x] **Fáze 1 – bodování:** `js/scoring.js`, `tests.html`.
      Hotovo, když projdou testy hraničních hodnot všech disciplín i hodností.
- [x] **Fáze 2 – appka:** kostra se 3 záložkami (mobil + web podle designu), průchod
      testem, výsledek, průběžné ukládání, kalkulačka. Zkopírovat `favicon.svg` a `logo.svg`.
      Hotovo, když jde na šířce 360 px projít celý test a obnovení stránky nic nesmaže.
- [ ] **Fáze 3 – lokální historie:** ukládání, mazání s potvrzením, export / import CSV
      (zatím bez zámku). Hotovo, když export → smazání → import vrátí stejná data.
      Pozn.: záložka Historie je zatím placeholder; dokončený test se teď drží jen jako
      "draft" v `storage.js` (do historie se uloží až tady).
- [ ] **Fáze 4 – Supabase:** `supabase/schema.sql`, RLS, zámek historie, synchronizace.
      Hotovo, když bez hesla nejde přes API nic přečíst, zapsat ani smazat (kromě
      čtení `ping`) a test z jednoho telefonu je vidět na druhém.
- [ ] **Fáze 5 – neaktivní databáze:** žlutá lišta, keepalive workflow.
      Hotovo, když se lišta ukáže při ručně pozastaveném projektu.
- [ ] **Fáze 6 – nasazení:** veřejný GitHub repo, Pages, test na mobilu.

## Co dodá Tomáš
- Kdykoli před fází 6: `git init` a GitHub repozitář.
- Před fází 4: Supabase projekt (URL + publishable klíč) a týmový účet s heslem.
- Před fází 5: telefonní číslo.

## Mimo MVP
Offline PWA, grafy zlepšení, žebříček, samostatné účty pro každého.
