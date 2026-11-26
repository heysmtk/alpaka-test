// Veřejná konfigurace. Smí tu být jen URL projektu a publishable klíč (chrání je RLS).
// Nikdy sem nedávej secret / service_role klíč ani heslo.
export const SUPABASE_URL = 'https://povxuknpbashnyqlabgj.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_1FW7eQ8HlwcItPsPSbkENA_T8W9PbBK';

// E-mail týmového účtu v Supabase Auth. Heslo zadává uživatel a ověřuje ho server.
export const TEAM_EMAIL = 'alpakatester@gmail.com';

// supabase-js z CDN s pevnou verzí (načítá se až když je potřeba, appka funguje i bez něj)
export const SUPABASE_JS_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';

// Kam se má psát, když je databáze neaktivní (zobrazí se ve žluté liště). Je veřejně vidět.
export const CONTACT_EMAIL = 'alpakatester@gmail.com';
