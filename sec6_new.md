## 6. Varnost

Sistem implementira večplastni varnostni model (defence in depth) z 26 varnostnimi mehanizmi, razporejenimi po vseh plasteh arhitekture.

---

### 6.1 Transport

#### HTTPS / TLS 1.3
Vsa komunikacija med odjemalci (spletna app, mobilna app) in API-jem poteka izključno prek HTTPS. Fly.io zagotavlja avtomatsko izdajo in obnovo Let's Encrypt certifikatov.

#### CORS (Cross-Origin Resource Sharing)
API dovoli zahtevke samo s točno določenih originov (`api/src/app.js`):

```
https://projekt2026.fly.dev  |  https://sirena-web.fly.dev
http://localhost:3000 / :5173 / :19006  ← samo razvoj
```

Katerikoli drug origin prejme HTTP 403 brez nadaljnje obdelave.

---

### 6.2 Avtentikacija

#### JWT (JSON Web Token) — 8h veljavnost
Vsak uspešen login vrne JWT token s payload `{ id, email, vloga }` in veljavnostjo 8 ur. Brez veljavnega tokena ni dostopa do nobenega zaščitenega endpointa. Token se preveri z `app.authenticate` hook-om pred vsakim route handler-jem.

#### Token refresh brez ponovne prijave
Ko token poteče (HTTP 401), Axios interceptor na mobilni in spletni aplikaciji samodejno pokliče `POST /api/v1/auth/refresh` in pridobi nov token. Če refresh ne uspe, se token izbriše in uporabnik je preusmerjen na login.

#### bcryptjs — work factor 12
Gesla se nikoli ne shranjujejo v čistem tekstu. Ob registraciji in spremembi gesla se hash izračuna z bcryptjs z 12 solnimi rundami (≈300 ms/hash), kar naredi dictionary in brute-force napade časovno neizvedljive.

#### Rate limiting na loginu — 3 req/min
Login endpoint ima ločen, strožji rate limit: **3 zahtevki/minuto na IP**. Po prekoračitvi API vrne HTTP 429. Ščiti pred avtomatiziranimi brute-force napadi na gesla.

---

### 6.3 Avtorizacija (RBAC)

Vsak endpoint preverja vlogo iz JWT payloada (`request.user.vloga`) in lastništvo vira (`request.user.id`). Voznik ne more dostopati do podatkov drugega voznika, četudi pozna njegov ID.

| Vloga | Koda | Opis dostopa |
|---|---|---|
| Voznik | 1 | Lastne vožnje, lastni tahograf, lastni urnik, lastni računi |
| Administrator | 2 | Vse rute voznika + upravljanje vseh voznikov, voznega parka, strank, dashboard, audit log, uvoz DDD |
| Vodstvo | 3 | Dashboard, audit log, vsi računi — brez pravic upravljanja |

---

### 6.4 Podatki v bazi

#### AES-256-GCM šifriranje EMŠO
EMŠO je PII podatek, ki po GDPR zahteva posebno zaščito. Pred shranjevanjem v stolpec `emso_crypted` se šifrira z AES-256-GCM (`api/src/plugins/crypto.js`). GCM način zagotavlja **authenticated encryption** — baza vsebuje šifriran tekst + IV + authentication tag. Šifrirni ključ (`ENCRYPTION_KEY`) je shranjen samo v okoljski spremenljivki, ločen od baze.

#### Prisma ORM — zaščita pred SQL injection
Vse poizvedbe potekajo prek Prisma ORM s parametriziranimi stavki. Ni nobene dinamične konkatenacije SQL stringov — SQL injection ni mogoč.

#### PostgreSQL na Fly.io Frankfurt (EU jurisdikcija)
Baza podatkov se nahaja v EU datacenterju (Frankfurt), kar zadosti zahtevam GDPR glede shranjevanja podatkov znotraj EU.

---

### 6.5 GDPR skladnost

#### Soglasje ob registraciji
Polje `gdpr_soglasje` (boolean) in `gdpr_datum` (timestamp) sta obvezni del registracije. Brez `gdpr_soglasje: true` registracija vrne HTTP 400.

#### Pravica do izbrisa — anonimizacija
`DELETE /api/v1/auth/me` anonimizira osebne podatke (ne briše zapisov, da se ohrani audit trail):

```
ime / priimek  → "IZBRISANO"
email          → "deleted_{id}_{timestamp}@izbrisano.si"
emso_crypted   → null
geslo          → "IZBRISANO"
```

#### Audit middleware — sledljivost dostopa do občutljivih endpointov
`api/src/plugins/audit.js` se registrira kot Fastify `onResponse` hook. Beleži vsak uspešen POST/PUT/DELETE/PATCH na: `/voznje`, `/admin`, `/tahograf`, `/stranke`, `/vozila`, `/racuni`, `/urnik`, `/dashboard`, `/log`. Zapis vsebuje `timestamp`, HTTP metodo, URL in ID uporabnika iz JWT tokena.

---

### 6.6 API zaščita

#### Globalni rate limiting — 100 req/min
Vsi endpointi imajo skupni limit 100 zahtevkov/minuto na IP naslov. Ščiti pred DoS napadi in prekomerno obremenitvijo baze.

#### Input validacija — Fastify JSON Schema
Vsak endpoint definira JSON Schema za telo zahtevka. Fastify zavrne vsak neveljaven zahtevek preden doseže route handler. Primer iz `/auth/login`:

```json
{ "email": { "type": "string", "format": "email" }, "geslo": { "type": "string", "minLength": 6 } }
```

#### Swagger UI — Basic Auth zaščita
Dokumentacija API-ja (`/docs`) je zaščitena z HTTP Basic Auth (`DOCS_USER` / `DOCS_PASS` iz okoljskih spremenljivk). Struktura API-ja ni javno vidna.

---

### 6.7 Mobilna aplikacija

#### JWT v SecureStore (ne AsyncStorage)
JWT token je shranjen v `expo-secure-store`, ki na iOS-u uporablja Keychain, na Androidu pa Android Keystore — obe sta hardversko zaščiteni shrambi.

#### Axios token refresh interceptor
`mobile/src/api/client.js` implementira response interceptor, ki ob HTTP 401 samodejno poskuša obnoviti token prek `/auth/refresh`, shrani nov token v SecureStore in ponovi originalni zahtevek.

#### Obfuskiran lokalni tahograf cache
Aktivno stanje in čakajoče akcije se lokalno shranijo v `AsyncStorage` v obfuscirani obliki (`mobile/src/store/tahografCache.js`): podatki so Base64-kodirani z SHA-256 hash prefixom kot kontrolno vsoto za detekcijo manipulacije.

#### NetInfo offline sinhronizacija
`useSinhronizacija.js` prisluškuje omrežnemu stanju z `NetInfo`. Ko se naprava poveže, se vse čakajoče akcije (zacni/zakljuci) avtomatsko sinhronizirajo s strežnikom. Zagotavlja integriteto tahografskih zapisov pri nestabilni povezavi.

---

### 6.8 Spletna aplikacija — HTTP varnostni headerji

Nginx (`web/nginx.conf`) nastavi varnostne headerje na vseh odgovorih:

| Header | Vrednost | Namen |
|---|---|---|
| `X-Frame-Options` | `DENY` | Preprečuje clickjacking (iframe embedding) |
| `X-Content-Type-Options` | `nosniff` | Preprečuje MIME-type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Vgrajeni brskalniški XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Omeji deljenje URL info pri cross-origin zahtevkih |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Onemogoči dostop do napravnih API-jev |
| `Content-Security-Policy` | `default-src 'self'; connect-src 'self' https://projekt2026.fly.dev` | Dovoli samo lastne skripte in API klice na produkcijsko domeno |

---

### 6.9 Infrastruktura

#### GitHub Actions CI/CD
Deploy na produkcijo je avtomatiziran prek GitHub Actions. Ni možnosti ročnega uploada artefaktov ali bypassa CI procesa.

#### Docker — izoliran container
API in spletna aplikacija tečeta v ločenih Docker containerjih. Izolacija preprečuje lateralno premikanje med storitvami v primeru kompromitacije.

#### Fly.io Secrets — skrivnosti nikoli v kodi
`JWT_SECRET`, `ENCRYPTION_KEY`, `DOCS_USER`, `DOCS_PASS` so shranjeni v Fly.io Secrets (encrypted at rest). Nikoli niso prisotni v kodi ali git historiji.

---

### Pregledna tabela varnostnih mehanizmov

| # | Mehanizem | Plast | Implementacija |
|---|---|---|---|
| 1 | HTTPS / TLS 1.3 | Transport | Fly.io Let's Encrypt |
| 2 | CORS whitelist | Transport | `@fastify/cors` — `app.js` |
| 3 | JWT (8h expiry) | Avtentikacija | `@fastify/jwt` |
| 4 | Token refresh | Avtentikacija | `POST /auth/refresh` + Axios interceptor |
| 5 | bcryptjs (12 rounds) | Avtentikacija | `auth.js` register/login |
| 6 | Rate limit login (3/min) | Avtentikacija | `@fastify/rate-limit` per-route |
| 7 | RBAC (vloge 1/2/3) | Avtorizacija | JWT payload `vloga` check |
| 8 | Per-user data isolation | Avtorizacija | `request.user.id` filter |
| 9 | AES-256-GCM (EMŠO) | Podatki | `crypto.js` plugin |
| 10 | Prisma ORM (SQL injection) | Podatki | Parametrizirane poizvedbe |
| 11 | PostgreSQL Frankfurt EU | Podatki | Fly.io managed DB |
| 12 | GDPR soglasje ob registraciji | GDPR | `gdpr_soglasje` polje |
| 13 | GDPR anonimizacija | GDPR | `DELETE /auth/me` |
| 14 | Audit middleware | Sledljivost | `audit.js` onResponse hook |
| 15 | Rate limit global (100/min) | API | `@fastify/rate-limit` global |
| 16 | Input validacija | API | Fastify JSON Schema |
| 17 | Swagger Basic Auth | API | `@fastify/basic-auth` |
| 18 | JWT v SecureStore | Mobile | `expo-secure-store` |
| 19 | Axios 401 interceptor | Mobile | `mobile/src/api/client.js` |
| 20 | Obfuskiran lokalni cache | Mobile | `tahografCache.js` + expo-crypto |
| 21 | NetInfo offline sync | Mobile | `useSinhronizacija.js` |
| 22 | X-Frame-Options DENY | Web | `nginx.conf` |
| 23 | Content-Security-Policy | Web | `nginx.conf` |
| 24 | Permissions-Policy | Web | `nginx.conf` |
| 25 | Fly.io Secrets | Infrastruktura | Encrypted env vars |
| 26 | Docker izolacija | Infrastruktura | Ločeni containerji |

