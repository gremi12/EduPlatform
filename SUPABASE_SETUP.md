# Conectare Supabase pentru EduPlatform

## 1. Creează proiectul în Supabase

1. Intră în [Supabase](https://supabase.com/).
2. Creează un proiect nou.
3. Salvează parola bazei de date și regiunea aleasă.

## 2. Activează autentificarea cu email/parolă

1. În dashboard, mergi la `Authentication` -> `Providers`.
2. Verifică să fie activ providerul `Email`.
3. Pentru testare rapidă, poți dezactiva confirmarea pe email din `Authentication` -> `Sign In / Providers`, dar în producție e mai bine să rămână activă.

## 3. Creează tabelele și politicile

1. Mergi la `SQL Editor`.
2. Rulează conținutul din [supabase/schema.sql](/D:/siteEducational/eduplatform_corrected_full_site/supabase/schema.sql).

Ce creează scriptul:

- tabelul `profiles`
- tabelul `resources`
- trigger automat pentru creare profil după signup
- bucket-ul Storage `resources`
- politici RLS pentru profiluri, resurse și upload
- coloana `class_level` pentru conturile de elev

## 4. Copiază cheia publică în proiect

1. Mergi la `Project Settings` -> `API`.
2. Copiază:
   - `Project URL`
   - `anon public key`
3. Pune valorile în [js/supabaseClient.js](/D:/siteEducational/eduplatform_corrected_full_site/js/supabaseClient.js):

```js
window.EDUPLATFORM_SUPABASE_CONFIG = {
  url: "https://proiectul-tau.supabase.co",
  anonKey: "cheia-ta-anon",
};
```

Important:

- Folosește doar `anon key` în frontend.
- Nu pune niciodată `service_role key` în fișierele site-ului.

## 5. Testează fluxul

1. Deschide [login.html](/D:/siteEducational/eduplatform_corrected_full_site/login.html).
2. Creează un cont nou.
3. Dacă alegi rolul `elev`, selectează și clasa.
4. Autentifică-te.
5. Dacă rolul este `profesor`, vei fi trimis în [teachers-dashboard.html](/D:/siteEducational/eduplatform_corrected_full_site/teachers-dashboard.html).
6. Verifică apoi [profile.html](/D:/siteEducational/eduplatform_corrected_full_site/profile.html).

Notă:

- dacă ai rulat deja schema mai veche, rulează din nou [supabase/schema.sql](/D:/siteEducational/eduplatform_corrected_full_site/supabase/schema.sql) ca să se adauge coloana `class_level`

## 6. Ce este deja conectat în proiect

- [login.html](/D:/siteEducational/eduplatform_corrected_full_site/login.html): login + register cu Supabase Auth
- [profile.html](/D:/siteEducational/eduplatform_corrected_full_site/profile.html): profil citit din tabela `profiles`
- [teachers-dashboard.html](/D:/siteEducational/eduplatform_corrected_full_site/teachers-dashboard.html): upload fișier în Supabase Storage + salvare metadata în tabela `resources`
- [js/auth.js](/D:/siteEducational/eduplatform_corrected_full_site/js/auth.js): logica de autentificare
- [js/profile.js](/D:/siteEducational/eduplatform_corrected_full_site/js/profile.js): încărcare profil și resurse
- [js/teacher-dashboard.js](/D:/siteEducational/eduplatform_corrected_full_site/js/teacher-dashboard.js): upload și statistici

## 7. Următorii pași recomandați

1. Să conectăm și pagina `resources.html` la date reale din Supabase.
2. Să adăugăm editare profil.
3. Să facem butoane reale de download și incrementare `download_count`.
4. Să ascundem butoanele de autentificare când utilizatorul este deja logat.
