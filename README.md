# Projekt2026 — Multi-platformni logistični sistem
 
> Digitalni sistem za upravljanje logistike, tahografskih zapisov in voznega parka za podjetje **Jakob d.o.o. (Sirena logistics)**
 
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Mobile%20%7C%20API-blue)
![Node](https://img.shields.io/badge/node-20.x-green)
![React](https://img.shields.io/badge/react-19-61DAFB)
![Expo](https://img.shields.io/badge/expo-54-black)
![Deployment](https://img.shields.io/badge/deploy-Fly.io-purple)
![License](https://img.shields.io/badge/license-Univerzetni%20projekt-lightgrey)
 
---
 
## Kazalo vsebine
 
1. [Pregled sistema](#1-pregled-sistema)
2. [Arhitektura](#2-arhitektura)
3. [Tok podatkov](#3-tok-podatkov)
4. [Use Case diagram](#4-use-case-diagram)
5. [Sequence diagrami](#5-sequence-diagrami)
6. [Varnost](#6-varnost)
7. [API referenca](#7-api-referenca)
8. [Baza podatkov](#8-baza-podatkov)
9. [Razvoj in lokalna namestitev](#9-razvoj-in-lokalna-namestitev)
10. [Deployment](#10-deployment)
11. [Zagotavljanje kakovosti](#11-zagotavljanje-kakovosti)
12. [Roadmap in znane omejitve](#12-roadmap-in-znane-omejitve)
---
 
## 1. Pregled sistema
 
### Problem statement
 
Logistična podjetja, ki upravljajo vozne parke in zaposlujejo voznike, se soočajo s kompleksnimi regulativnimi zahtevami EU glede tahografskih zapisov. Vozniki morajo natančno beležiti čas vožnje, odmorov in počitka. Administrativni procesi — od razporedov in urnikov do obračuna plač in računov — so pogosto ročni in podvrženi napakam. Sistem Projekt2026 digitalizira te procese v enotni platformi.
 
### Ključne funkcionalnosti
 
- Sledenje tahografskim stanjem v realnem času prek mobilne aplikacije (VOZNJA, ODMOR, POCITEK, DELO, RAZPOLOZLJIVOST, DRUGO)
- Uvoz binarnih EU Digital Tachograph datotek (DDD format) in Excel datotek prek spletnega vmesnika
- Upravljanje vožnje: beleženje, pregledovanje in brisanje posameznih voženj
- Razpored voznikov: urniki, dodeljevanje vozil in strank
- Vozni park: evidenca vozil in tipov vozil
- Upravljanje strank (naročnikov)
- Obračun plač: generiranje računov na podlagi urnih postavk
- Administrativni dashboard z agregirani pregled nad vsemi vozniki
- Audit log vseh sprememb podatkov (POST/PUT/DELETE/PATCH)
- GDPR skladnost: anonimizacija osebnih podatkov na zahtevo
- Google Calendar integracija za urnik v mobilni aplikaciji
### Uporabniški profili
 
| Vloga | Koda | Opis |
|---|---|---|
| Voznik | 1 | Beleži vožnje in tahografska stanja prek mobilne aplikacije; pregleduje lastne urnike in račune |
| Admin | 2 | Upravlja vozni park, stranke, voznike in urnike; dostopa do dashboard-a, audit logov in uvoza DDD datotek |
| Računovodja | 3 | Pregleduje vse račune in finančne podatke; nima dostopa do admin funkcij upravljanja |
 
---
 
## 2. Arhitektura
 
Sistem sledi klasični **3-tier arhitekturi**: mobilni in spletni odjemalec komunicirata z Fastify REST API-jem, ki upravlja bazo podatkov PostgreSQL prek Prisma ORM-a. Python skripte se izvajajo kot subprocesi za obdelavo binarnih tahografskih datotek.
 
### Arhitekturni diagram
 
```mermaid
graph TB
    subgraph Odjemalci
        MOB["📱 Mobilna aplikacija\nReact Native + Expo 54"]
        WEB["🌐 Spletna aplikacija\nReact 19 + Vite"]
    end
 
    subgraph API["Fastify API — Fly.io (projekt2026.fly.dev)"]
        GW["Fastify 5.8.5\nJWT Auth + RBAC + Rate Limiting"]
        PL["Plugins\naudit.js / crypto.js / prisma.js"]
        RT["Routes\n12 modulov"]
        PY["Python Subprocess\nreadDDDfile.py\nreadExcelFile.py"]
    end
 
    subgraph Infrastruktura
        DB["🐘 PostgreSQL 16\nvia Prisma ORM 5.22.0"]
        FLY["☁️ Fly.io\nProdukcijsko okolje"]
        GHA["⚙️ GitHub Actions\nCI/CD Pipeline"]
        DOC["🐳 Docker Compose\nLokalni razvoj (PostgreSQL)"]
    end
 
    MOB -->|REST API / HTTPS| GW
    WEB -->|REST API / HTTPS| GW
    GW --> PL
    PL --> RT
    RT --> PY
    RT -->|Prisma| DB
    GHA -->|flyctl deploy| FLY
    FLY --> GW
    DOC -.->|lokalni razvoj| DB
```
 
### ER diagram
 
Spodnji diagram prikazuje vseh 10 entitet v bazi podatkov skupaj z vsemi relacijami in kardinalnostmi. Centralna entiteta je `Uporabnik`, ki je povezana z večino ostalih tabel. `TahografZapis` ima poseben atribut `vir`, ki razlikuje med ročno snemanjem prek mobilne aplikacije in uvozom DDD/Excel datotek.
 
```mermaid
erDiagram
    Uporabnik {
        int id PK
        string ime
        string priimek
        string email
        string geslo
        int dostop
        string emso_crypted
        int fk_postavka FK
        bool gdpr_soglasje
        datetime gdpr_datum
    }
 
    Voznja {
        int id PK
        date datum
        time zacetek
        time konc
        int trajanje
        string aktivnost
        string registerska
        bool posadka
        string stranka
        string relacija
        string opis
        int fk_uporabnik FK
        datetime timestamp_zapis
    }
 
    TahografZapis {
        int id PK
        int fk_uporabnik FK
        string stanje
        datetime zacetek
        datetime konec
        int trajanje_min
        string lokacija_zac
        string lokacija_kon
        string registrska
        bool posadka
        string vir
    }
 
    Urnik {
        int id PK
        date datum
        decimal cena
        string naziv
        bool placano
        int fk_vozilo FK
        int fk_uporabnik FK
        int fk_stranka FK
    }
 
    Vozilo {
        int id PK
        string registerska
        int st_sedezev
        decimal dolzina
        int fk_tip_vozila FK
    }
 
    TipVozila {
        int id PK
        string naziv
    }
 
    Stranka {
        int id PK
        string naziv
        string email
        string telefonska
        string davcna_st
    }
 
    Racun {
        int id PK
        date datum_izdaje
        int st_ur
        decimal placa
        int fk_uporabnik FK
    }
 
    UrnaPostavka {
        int id PK
        decimal postavka
    }
 
    LOG_voznja {
        int id PK
        datetime timestamp
        string TYPE
        string metoda
        string url
        int voznja_id_voznja
        int voznja_fk_uporabnik
    }
 
    Uporabnik ||--o{ Voznja : "ima"
    Uporabnik ||--o{ TahografZapis : "ima"
    Uporabnik ||--o{ Urnik : "ima"
    Uporabnik ||--o{ Racun : "ima"
    Uporabnik }o--|| UrnaPostavka : "uporablja"
    Urnik }o--|| Vozilo : "uporablja"
    Urnik }o--|| Stranka : "za"
    Vozilo }o--|| TipVozila : "je tipa"
    Voznja ||--o{ LOG_voznja : "beleži"
```
 
### Razredni diagram
 
Razredni diagram prikazuje logično strukturo Fastify API-ja. `app.js` je vstopna točka, ki registrira vse Fastify plugine in route module. Vsak plugin enkapsulira specifično odgovornost (šifriranje, ORM, audit), medtem ko route moduli implementirajo posamezna poslovna področja.
 
```mermaid
classDiagram
    class App {
        +registerPlugins()
        +registerRoutes()
        +listen()
    }
 
    class CryptoPlugin {
        -key: Buffer
        +encryptEMSO(emso: string): string
        +decryptEMSO(encrypted: string): string
    }
 
    class PrismaPlugin {
        +client: PrismaClient
        +connect()
        +disconnect()
    }
 
    class AuditPlugin {
        +logRequest(req, reply, done)
        -shouldLog(method: string): boolean
    }
 
    class AuthRoutes {
        +login(req, reply)
        +register(req, reply)
        +refresh(req, reply)
        +deleteMe(req, reply)
    }
 
    class VoznjeRoutes {
        +getVoznje(req, reply)
        +postVoznja(req, reply)
        +deleteVoznja(req, reply)
        +getVoznjeMesec(req, reply)
    }
 
    class TahografRoutes {
        +getAktivno(req, reply)
        +getZgodovina(req, reply)
        +getPovzetek(req, reply)
        +zacni(req, reply)
        +zakljuci(req, reply)
    }
 
    class AdminRoutes {
        +getVozniki(req, reply)
        +getVoznje(req, reply)
        +getAudit(req, reply)
        +createUporabnik(req, reply)
    }
 
    class DddUploadRoutes {
        +upload(req, reply)
        -spawnPython(filepath: string): Promise~JSON~
    }
 
    class DashboardRoutes {
        +getDashboard(req, reply)
    }
 
    App --> CryptoPlugin : registrira
    App --> PrismaPlugin : registrira
    App --> AuditPlugin : registrira
    App --> AuthRoutes : registrira
    App --> VoznjeRoutes : registrira
    App --> TahografRoutes : registrira
    App --> AdminRoutes : registrira
    App --> DddUploadRoutes : registrira
    App --> DashboardRoutes : registrira
    AuditPlugin ..> PrismaPlugin : uporablja
    AuthRoutes ..> CryptoPlugin : šifrira EMŠO
    AuthRoutes ..> PrismaPlugin : dostopa do DB
    VoznjeRoutes ..> PrismaPlugin : dostopa do DB
    TahografRoutes ..> PrismaPlugin : dostopa do DB
    AdminRoutes ..> PrismaPlugin : dostopa do DB
    DddUploadRoutes ..> PrismaPlugin : uvozi zapise
```
 
---
 
## 3. Tok podatkov
 
### a) Login flow
 
Ko uporabnik vnese kredenciale, API preveri geslo z bcrypt primerjavo, generira JWT access token (8h) in refresh token. Refresh token mehanizem omogoča brezšivno obnovo seje brez ponovne prijave.
 
```mermaid
flowchart TD
    A[Uporabnik vnese email + geslo] --> B[POST /api/v1/auth/login]
    B --> C{Rate limit\n3 req/min?}
    C -->|Prekoračen| D[HTTP 429 Too Many Requests]
    C -->|OK| E[Poišči uporabnika po emailu\nPrisma: findUnique]
    E --> F{Uporabnik\nobstaja?}
    F -->|Ne| G[HTTP 401 Unauthorized]
    F -->|Da| H[bcryptjs.compare\ngeslo vs hash]
    H --> I{Geslo\nveljavno?}
    I -->|Ne| G
    I -->|Da| J[Generiraj JWT access token\n8h veljavnost]
    J --> K[Generiraj refresh token]
    K --> L[HTTP 200: access_token + refresh_token + user data]
    L --> M[Odjemalec shrani token\nExpo: expo-secure-store\nWeb: Zustand store]
```
 
### b) Tahograf recording flow (mobilna aplikacija)
 
Voznik na mobilni aplikaciji ročno beleži tahografska stanja. Ko začne stanje, API preveri, ali ni že kakšno stanje aktivno, ter ustvari nov zapis. Ob zaključku izračuna trajanje in posodobi zapis.
 
```mermaid
flowchart TD
    A[Voznik izbere stanje\npr. VOZNJA] --> B[POST /api/v1/tahograf/zacni]
    B --> C[JWT verifikacija]
    C --> D{Obstaja aktivno\nstanje?}
    D -->|Da| E[HTTP 409 Conflict\nZapri prejšnje stanje]
    D -->|Ne| F[Ustvari TahografZapis\nvir = POSNETO\nzacetek = NOW]
    F --> G[HTTP 201: Created zapis]
    G --> H[Mobilna app prikaže\naktivno stanje + timer]
    H --> I[Voznik zaključi stanje]
    I --> J[POST /api/v1/tahograf/zakljuci]
    J --> K[Poišči aktivni zapis\nfk_uporabnik = JWT user]
    K --> L[Izračunaj trajanje_min\nkonec - zacetek]
    L --> M[Posodobi TahografZapis\nkonec + trajanje_min]
    M --> N[HTTP 200: posodobljen zapis]
```
 
### c) DDD datoteka import flow
 
Uvoz binarnih tahografskih datotek je večstopenjski proces. Fastify sprejme datoteko prek multipart forme, jo posreduje Python subprocesu, ki dekodira binarni EU Digital Tachograph format. Rezultat (JSON) se transakcijsko uvozi v bazo.
 
```mermaid
flowchart TD
    A[Admin naloži DDD ali Excel datoteko\nspletni vmesnik] --> B[POST /api/v1/ddd_upload/upload\nmultipart/form-data, max 50MB]
    B --> C[JWT verifikacija\nRBAC: samo admin]
    C --> D{Tip datoteke?}
    D -->|.ddd| E[Node.js: spawn Python\nreadDDDfile.py filepath]
    D -->|.xlsx| F[Node.js: spawn Python\nreadExcelFile.py filepath]
    E --> G[Python razčleni binarni\nEU Digital Tachograph format]
    F --> H[Python razčleni Excel\ntahografske podatke]
    G --> I[Python stdout: JSON array\ntahografskih zapisov]
    H --> I
    I --> J[Node.js: JSON.parse stdout]
    J --> K{JSON validen?}
    K -->|Ne| L[HTTP 500: Python parsing error]
    K -->|Da| M[Prisma: createMany v transakciji\nvir = UVOZ za vse zapise]
    M --> N{Transakcija\nuspešna?}
    N -->|Ne| O[Rollback + HTTP 500]
    N -->|Da| P[HTTP 200: število uvoženih zapisov]
```
 
### d) Admin dashboard flow
 
Admin dashboard agregira podatke iz več tabel hkrati. API vrne pregled aktivnih voznikov, stanje tahografov in seznam voženj, frontend pa jih prikaže na interaktivni Leaflet karti in v tabelah.
 
```mermaid
flowchart TD
    A[Admin odpre dashboard\nspletna aplikacija] --> B[GET /api/v1/dashboard]
    B --> C[JWT verifikacija\nRBAC: samo admin]
    C --> D[Prisma: paralelne poizvedbe]
    D --> D1[Štetje voznikov\npo statusu]
    D --> D2[Zadnje tahografske\nlokacije voznikov]
    D --> D3[Agregirane vožnje\nza tekoči dan]
    D --> D4[Statistike voznega\nparkovega parka]
    D1 & D2 & D3 & D4 --> E[Sestavi agregirani JSON odgovor]
    E --> F[HTTP 200: dashboard data]
    F --> G[React Query cache + Zustand store]
    G --> H[Leaflet karta: prikaz\nlokacij voznikov]
    G --> I[Tabele: vožnje in urniki]
    G --> J[Statistike: vozni park]
```
 
---
 
## 4. Use Case diagram
 
Use case diagram prikazuje vse akterje sistema (Voznik, Admin, Računovodja, Sistem) in vse akcije, ki jih posamezni akter lahko izvede. Sistem nastopa kot avtonomen akter pri avtomatskih procesih (audit log, JWT refresh, rate limiting).
 
```mermaid
graph LR
    VOZNIK((Voznik))
    ADMIN((Admin))
    RACUN((Računovodja))
    SIS((Sistem))
 
    subgraph Avtentikacija
        UC1[Prijava]
        UC2[Registracija]
        UC3[Osvežitev JWT tokena]
        UC4[GDPR brisanje podatkov]
    end
 
    subgraph Vožnje
        UC5[Ogled lastnih voženj]
        UC6[Dodajanje vožnje]
        UC7[Brisanje vožnje]
        UC8[Ogled mesečnih voženj vseh voznikov]
    end
 
    subgraph Tahograf
        UC9[Začetek tahografskega stanja]
        UC10[Zaključek tahografskega stanja]
        UC11[Ogled aktivnega stanja]
        UC12[Ogled zgodovine stanj]
        UC13[Ogled dnevnega povzetka]
        UC14[Uvoz DDD/Excel datoteke]
    end
 
    subgraph Urnik
        UC15[Ogled urnika]
        UC16[Upravljanje urnika]
        UC17[Google Calendar sinhronizacija]
    end
 
    subgraph Administracija
        UC18[Ogled vseh voznikov]
        UC19[Ustvarjanje uporabnika]
        UC20[Upravljanje voznega parka]
        UC21[Upravljanje tipov vozil]
        UC22[Upravljanje strank]
        UC23[Ogled audit logov]
        UC24[Ogled dashboard-a]
    end
 
    subgraph Financ[Finance]
        UC25[Ogled lastnih računov]
        UC26[Ogled vseh računov]
        UC27[Upravljanje urnih postavk]
    end
 
    subgraph Sistem_UC[Sistemski procesi]
        UC28[Avtomatski audit log]
        UC29[Rate limiting]
        UC30[JWT validacija]
    end
 
    VOZNIK --> UC1
    VOZNIK --> UC4
    VOZNIK --> UC5
    VOZNIK --> UC6
    VOZNIK --> UC7
    VOZNIK --> UC9
    VOZNIK --> UC10
    VOZNIK --> UC11
    VOZNIK --> UC12
    VOZNIK --> UC13
    VOZNIK --> UC15
    VOZNIK --> UC17
    VOZNIK --> UC25
 
    ADMIN --> UC1
    ADMIN --> UC2
    ADMIN --> UC8
    ADMIN --> UC14
    ADMIN --> UC16
    ADMIN --> UC18
    ADMIN --> UC19
    ADMIN --> UC20
    ADMIN --> UC21
    ADMIN --> UC22
    ADMIN --> UC23
    ADMIN --> UC24
    ADMIN --> UC26
    ADMIN --> UC27
 
    RACUN --> UC1
    RACUN --> UC26
 
    SIS --> UC28
    SIS --> UC29
    SIS --> UC30
    SIS --> UC3
```
 
---
 
## 5. Sequence diagrami
 
### a) Login s refresh token mehanizmom
 
Diagram prikazuje celoten tok prijave od odjemalca do baze, vključno z mehanizmom obnove JWT tokena. Ko access token poteče, odjemalec samodejno pošlje refresh token in dobi nov par tokenov brez ponovne prijave.
 
```mermaid
sequenceDiagram
    participant C as Odjemalec (Web/Mobile)
    participant API as Fastify API
    participant DB as PostgreSQL
 
    C->>API: POST /api/v1/auth/login\n{email, geslo}
    API->>API: Rate limit check (3/min)
    API->>DB: SELECT * FROM Uporabnik WHERE email = ?
    DB-->>API: Uporabnik record
    API->>API: bcryptjs.compare(geslo, hash)
    alt Geslo napačno
        API-->>C: HTTP 401 Unauthorized
    else Geslo pravilno
        API->>API: JWT sign (payload: id, dostop, 8h)
        API->>API: Generate refresh token
        API-->>C: HTTP 200 {access_token, refresh_token, user}
        C->>C: Shrani tokena (secure store)
    end
 
    Note over C,API: Po 8 urah — access token poteče
 
    C->>API: POST /api/v1/auth/refresh\n{refresh_token}
    API->>API: Preveri veljavnost refresh tokena
    alt Refresh token neveljaven
        API-->>C: HTTP 401 — Ponovna prijava potrebna
    else Veljaven
        API->>API: JWT sign (nov access token, 8h)
        API-->>C: HTTP 200 {access_token}
        C->>C: Posodobi shranjeni token
    end
```
 
### b) Zapis tahografskega stanja (mobile → API → DB)
 
Voznik prek mobilne aplikacije začne in zaključi tahografsko stanje. Sequence diagram prikazuje, kako API preveri morebitno aktivno stanje, ustvari nov zapis in ga ob zaključku posodobi z izračunanim trajanjem.
 
```mermaid
sequenceDiagram
    participant MOB as Mobilna aplikacija
    participant API as Fastify API
    participant DB as PostgreSQL
 
    MOB->>API: POST /api/v1/tahograf/zacni\nAuthorization: Bearer <JWT>\n{stanje: "VOZNJA", registrska, lokacija_zac}
    API->>API: JWT verifikacija + RBAC
    API->>DB: SELECT * FROM TahografZapis\nWHERE fk_uporabnik = ? AND konec IS NULL
    DB-->>API: Aktivni zapis (ali null)
    alt Aktivno stanje obstaja
        API-->>MOB: HTTP 409 Conflict
    else Ni aktivnega stanja
        API->>DB: INSERT INTO TahografZapis\n{fk_uporabnik, stanje, zacetek: NOW(), vir: "POSNETO"}
        DB-->>API: Ustvarjeni zapis z id
        API-->>MOB: HTTP 201 {id, stanje, zacetek}
        MOB->>MOB: Prikaži timer aktivnega stanja
    end
 
    Note over MOB,API: Voznik zaključi stanje
 
    MOB->>API: POST /api/v1/tahograf/zakljuci\nAuthorization: Bearer <JWT>\n{lokacija_kon}
    API->>DB: SELECT * FROM TahografZapis\nWHERE fk_uporabnik = ? AND konec IS NULL
    DB-->>API: Aktivni zapis
    API->>API: Izračunaj trajanje_min = NOW() - zacetek
    API->>DB: UPDATE TahografZapis\nSET konec = NOW(), trajanje_min = ?
    DB-->>API: Posodobljeni zapis
    API-->>MOB: HTTP 200 {id, stanje, zacetek, konec, trajanje_min}
    MOB->>MOB: Skrij timer, prikaži zaključeno stanje
```
 
### c) Uvoz DDD datoteke (web → API → Python → DB)
 
Uvoz DDD datoteke je edini primer integracije med Node.js in Python. Fastify zažene Python skript kot subprocess, bere stdout za JSON rezultat in ga transakcijsko uvozi. Ta pristop je bil izbran, ker Python ekosistem ponuja boljše knjižnice za razčlenjevanje binarnih tahografskih formatov kot Node.js.
 
```mermaid
sequenceDiagram
    participant WEB as Spletna aplikacija
    participant API as Fastify API
    participant PY as Python (subprocess)
    participant DB as PostgreSQL
 
    WEB->>API: POST /api/v1/ddd_upload/upload\nmultipart/form-data (max 50MB)\n.ddd ali .xlsx datoteka
    API->>API: JWT verifikacija\nRBAC: dostop === 2 (admin)
    API->>API: Shrani datoteko na disk (temp)
    alt DDD binarni format
        API->>PY: spawn: python readDDDfile.py <filepath>
    else Excel format
        API->>PY: spawn: python readExcelFile.py <filepath>
    end
    PY->>PY: Razčleni binarni/Excel format
    PY-->>API: stdout: JSON array tahografskih zapisov
    API->>API: JSON.parse(stdout)
    alt Parsing error
        API-->>WEB: HTTP 500 Python parsing failed
    else JSON veljaven
        API->>DB: BEGIN TRANSACTION
        API->>DB: createMany TahografZapis[]\nvir = "UVOZ" za vse zapise
        alt Transakcija uspešna
            DB-->>API: Število uvoženih zapisov
            API->>DB: COMMIT
            API-->>WEB: HTTP 200 {uvozenih: N}
        else Napaka
            API->>DB: ROLLBACK
            API-->>WEB: HTTP 500 DB transaction failed
        end
    end
    API->>API: Izbriši temp datoteko
```
 
---
 
## 6. Varnost
 
### JWT avtentikacija
 
API uporablja JSON Web Tokens z 8-urno veljavnostjo access tokena. Payload vsebuje `id` in `dostop` (vloga). Refresh token mehanizem omogoča brezšivno obnovo seje. Vsaka zaščitena ruta zahteva `Authorization: Bearer <token>` header, ki ga Fastify plugin preveri pred izvedbo route handler-ja.
 
### AES-256-GCM šifriranje EMŠO
 
EMŠO (Enotna matična številka občana) je osebni identifikator, ki po GDPR spada med posebej varovane osebne podatke (PII). Sistem ga šifrira z AES-256-GCM algoritmom pred shranjevanjem v stolpec `emso_crypted`. GCM način zagotavlja tako zaupnost kot integriteto podatkov (authenticated encryption). Šifrirni ključ je shranjen v okoljski spremenljivki, ločeni od baze.
 
### bcryptjs gesla
 
Gesla se nikoli ne shranjujejo v čistem tekstu. Ob registraciji se geslo hashira z bcryptjs z work factor 12 (12 roundov), kar naredi brute-force napade nepraktične. 12 roundov je izbira, ki zagotavlja ravnovesje med varnostjo in hitrostjo (≈300ms na hash).
 
### RBAC (Role-Based Access Control)
 
Vsak endpoint ima definirano zahtevano vlogo. Middleware preveri `dostop` vrednost iz JWT payloada pred izvajanjem handler-ja.
 
| Vloga | Koda | Dostopni endpointi |
|---|---|---|
| Voznik | 1 | `/auth/*`, `/voznje` (lastne), `/tahograf/*`, `/urnik` (lastni), `/racuni` (lastni) |
| Admin | 2 | Vse rute voznika + `/admin/*`, `/vozila/*`, `/tipi-vozil/*`, `/stranke/*`, `/racuni/vse`, `/urna-postavka/*`, `/dashboard`, `/ddd_upload/upload` |
| Računovodja | 3 | `/auth/*`, `/racuni/vse` |
 
### Audit log
 
Fastify plugin `audit.js` se registrira kot `onResponse` hook in zabeleži vsak POST, PUT, DELETE ali PATCH zahtevek v tabelo `LOG_voznja`. Beleži se: timestamp, HTTP metoda, URL, ID vožnje (če relevantno) in ID voznika. Audit log je namenjen sledljivosti sprememb in je dostopen adminu prek `/admin/audit` z paginacijo.
 
### Rate limiting
 
Globalni rate limit: **100 zahtevkov/minuto** na IP naslov. Login endpoint ima strožji limit: **3 zahtevki/minuto** za preprečevanje brute-force napadov na gesla. Ob prekoračitvi API vrne HTTP 429 Too Many Requests.
 
### GDPR
 
Voznik lahko prek `DELETE /auth/me` zahteva anonimizacijo svojih podatkov. Sistem ne briše zapisov (za namen audit trail-a), ampak anonimizira PII: ime, priimek, email in EMŠO se nadomestijo z anonimnimi vrednostmi. `gdpr_soglasje` in `gdpr_datum` polja beležijo soglasje uporabnika.
 
### CORS in Swagger
 
API ima konfigurirano CORS politiko za specifične dovoljene origine (produkcijska spletna aplikacija). Swagger UI dokumentacija (`/docs`) je zaščitena z basic auth, da ni javno dostopna.
 
---
 
## 7. API referenca
 
Vsi endpointi so na base poti `/api/v1`. JWT token se pošlje v `Authorization: Bearer <token>` headerju.
 
### Avtentikacija
 
| Metoda | Pot | Dostop | Opis |
|---|---|---|---|
| POST | `/auth/login` | Javno | Prijava; rate limit 3/min |
| POST | `/auth/register` | Javno | Registracija novega voznika |
| POST | `/auth/refresh` | Javno | Osvežitev JWT tokena |
| DELETE | `/auth/me` | Voznik+ | GDPR anonimizacija |
 
**POST /auth/login — primer:**
```json
// Request
{
  "email": "voznik@sirena.si",
  "geslo": "mojeGeslo123"
}
 
// Response 200
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "user": {
    "id": 5,
    "ime": "Janez",
    "priimek": "Novak",
    "email": "voznik@sirena.si",
    "dostop": 1
  }
}
```
 
### Vožnje
 
| Metoda | Pot | Dostop | Opis |
|---|---|---|---|
| GET | `/voznje` | Voznik+ | Seznam lastnih voženj |
| POST | `/voznje` | Voznik+ | Dodajanje nove vožnje |
| DELETE | `/voznje/:id` | Voznik+ | Brisanje vožnje (samo lastne) |
| GET | `/voznje/voznjeMesec` | Admin | Mesečne vožnje vseh voznikov |
 
### Tahograf
 
| Metoda | Pot | Dostop | Opis |
|---|---|---|---|
| GET | `/tahograf/aktivno` | Voznik+ | Trenutno aktivno stanje |
| GET | `/tahograf/zgodovina` | Voznik+ | Zgodovina stanj z datumskim filtrom |
| GET | `/tahograf/povzetek` | Voznik+ | Dnevni povzetek po stanjih |
| POST | `/tahograf/zacni` | Voznik+ | Začetek novega stanja |
| POST | `/tahograf/zakljuci` | Voznik+ | Zaključek aktivnega stanja |
 
**POST /tahograf/zacni — primer:**
```json
// Request
{
  "stanje": "VOZNJA",
  "registrska": "MB 123-AB",
  "posadka": false,
  "lokacija_zac": "Maribor"
}
 
// Response 201
{
  "id": 42,
  "fk_uporabnik": 5,
  "stanje": "VOZNJA",
  "zacetek": "2026-06-02T08:30:00.000Z",
  "konec": null,
  "trajanje_min": null,
  "registrska": "MB 123-AB",
  "vir": "POSNETO"
}
```
 
### Admin
 
| Metoda | Pot | Dostop | Opis |
|---|---|---|---|
| GET | `/admin/vozniki` | Admin | Seznam vseh voznikov |
| GET | `/admin/voznje` | Admin | Vse vožnje vseh voznikov |
| GET | `/admin/audit` | Admin | Audit logi s paginacijo |
| POST | `/admin/uporabniki` | Admin | Ustvarjanje novega uporabnika |
 
### Vozni park
 
| Metoda | Pot | Dostop | Opis |
|---|---|---|---|
| GET/POST | `/vozila` | Admin | Seznam/dodajanje vozil |
| PUT/DELETE | `/vozila/:id` | Admin | Urejanje/brisanje vozila |
| GET/POST | `/tipi-vozil` | Admin | Kategorije vozil |
| PUT/DELETE | `/tipi-vozil/:id` | Admin | Urejanje/brisanje kategorije |
 
### Stranke in urnik
 
| Metoda | Pot | Dostop | Opis |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/stranke` | Admin | CRUD za stranke |
| GET/POST/PUT/DELETE | `/urnik` | Voznik+ | CRUD za urnike |
 
### Finance
 
| Metoda | Pot | Dostop | Opis |
|---|---|---|---|
| GET | `/racuni` | Voznik+ | Lastni računi |
| GET | `/racuni/vse` | Admin/Računovodja | Vsi računi |
| GET/POST/PUT/DELETE | `/urna-postavka` | Admin | Urne postavke |
 
### Ostalo
 
| Metoda | Pot | Dostop | Opis |
|---|---|---|---|
| GET | `/dashboard` | Admin | Agregirani dashboard podatki |
| POST | `/ddd_upload/upload` | Admin | Uvoz DDD/Excel tahograf datoteke |
| GET | `/docs` | Basic auth | Swagger UI dokumentacija |
| GET | `/health` | Javno | Health check |
 
**POST /ddd_upload/upload — primer:**
```json
// Request: multipart/form-data s poljem "file" (.ddd ali .xlsx)
 
// Response 200
{
  "uvozenih": 47,
  "sporocilo": "Uspešno uvoženih 47 tahografskih zapisov"
}
```
 
---
 
## 8. Baza podatkov
 
### Modeli in namen
 
**Uporabnik** je centralna entiteta sistema. Poleg osnovnih profilnih podatkov vsebuje šifrirani EMŠO (`emso_crypted`) in FK na urno postavko (`fk_postavka`), ki se uporablja pri izračunu plače. Vloge so kodirane numerično (1/2/3) namesto z enum tipom, kar olajša razširitev v prihodnosti.
 
**Voznja** beleži posamezno delovno vožnjo voznika. Razlikuje se od `TahografZapis` po tem, da je ročni vnos voznika in vsebuje poslovne podatke (stranka, relacija, opis), medtem ko je tahograf tehnični zapis.
 
**TahografZapis** ima poseben stolpec `vir` z vrednostma `POSNETO` ali `UVOZ`. To razlikovanje je kritično, ker EU regulativa zahteva sledljivost med ročno snemanima in uvoženim podatki iz DDD čipa. Uvoženi podatki imajo absolutno prednost pred ročnimi vnosi pri morebitnih inšpekcijah.
 
**Urnik** je M:N prehodna tabela med `Uporabnik`, `Vozilo` in `Stranka`, z dodatnimi polji (cena, naziv, placano). To je načrtovana denormalizacija — alternativa bi bila ločena tabela za vsako relacijo, kar bi zakompliciralo poizvedbe.
 
**LOG_voznja** je audit tabela za beleženje sprememb vožnje. Vsebuje samo tiste podatke, ki so potrebni za rekonstrukcijo zgodovine (HTTP metoda, URL, ID vožnje, ID voznika). Ne vsebuje celotnih payloadov zahtevkov, ker bi to povzročilo prekomerno rast tabele.
 
**UrnaPostavka** je referenčna tabela z urnimi postavkami. Voznik ima FK nanjo, kar omogoča centralno upravljanje plačnih razredov brez potrebe po posodabljanju vsakega voznika posebej.
 
### Indeksi
 
Priporočeni indeksi za produkcijsko delovanje:
 
```sql
CREATE INDEX idx_voznja_fk_uporabnik ON "Voznja"(fk_uporabnik);
CREATE INDEX idx_tahograf_fk_uporabnik ON "TahografZapis"(fk_uporabnik);
CREATE INDEX idx_tahograf_zacetek ON "TahografZapis"(zacetek);
CREATE INDEX idx_tahograf_vir ON "TahografZapis"(vir);
CREATE INDEX idx_urnik_fk_uporabnik ON "Urnik"(fk_uporabnik);
CREATE INDEX idx_log_voznja_id ON "LOG_voznja"(voznja_id_voznja);
```
 
### Razlog za izbiro PostgreSQL
 
PostgreSQL 16 je bil izbran pred alternativami (MySQL, SQLite) zaradi:
- Podpre transakcije ACID, kritične pri `createMany` uvozu DDD podatkov
- `jsonb` tip za morebitno shranjevanje kompleksnih Python parsing rezultatov
- Prisma ORM ima odlično podporo za PostgreSQL
- Fly.io ponuja managed PostgreSQL instance
---
 
## 9. Razvoj in lokalna namestitev
 
### Predpogoji
 
| Orodje | Verzija | Namen |
|---|---|---|
| Node.js | 20.x | Fastify API in frontend |
| Docker + Docker Compose | Latest | Lokalni PostgreSQL |
| Python | 3.10+ | DDD/Excel parser |
| Expo CLI | Latest | Mobilna aplikacija |
| npm | 9+ | Package manager |
 
### Korak-po-korak namestitev
 
```bash
# 1. Kloniranje repozitorija
git clone https://github.com/<org>/Projekt2026.git
cd Projekt2026
 
# 2. Zagon PostgreSQL prek Docker Compose
docker compose up -d
 
# 3. Namestitev in konfiguracija API-ja
cd api
cp .env.example .env
# Uredi .env z lokalnimi vrednostmi
 
npm install
 
# 4. Migracija baze podatkov
npx prisma migrate dev
npx prisma generate
 
# 5. Zagon API strežnika
npm run dev
# API dostopen na http://localhost:3000
 
# 6. Spletna aplikacija
cd ../web
cp .env.example .env
npm install
npm run dev
# Spletna app dostopna na http://localhost:5173
 
# 7. Mobilna aplikacija
cd ../mobile
npm install
npx expo start
# Skeniranje QR kode z Expo Go aplikacijo
```
 
### Okoljske spremenljivke
 
#### API (`api/.env`)
 
| Spremenljivka | Opis | Primer vrednosti |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/projekt2026` |
| `JWT_SECRET` | Skrivni ključ za JWT podpisovanje | `super_secret_jwt_key_min_32_chars` |
| `JWT_REFRESH_SECRET` | Skrivni ključ za refresh token | `another_secret_refresh_key` |
| `ENCRYPTION_KEY` | 32-bytni ključ za AES-256-GCM (EMŠO) | `0123456789abcdef0123456789abcdef` |
| `SWAGGER_USER` | Uporabnik za Swagger basic auth | `admin` |
| `SWAGGER_PASS` | Geslo za Swagger basic auth | `swaggerpass` |
| `PORT` | Port strežnika | `3000` |
| `NODE_ENV` | Okolje | `development` |
 
#### Web (`web/.env`)
 
| Spremenljivka | Opis | Primer vrednosti |
|---|---|---|
| `VITE_API_URL` | URL Fastify API-ja | `http://localhost:3000/api/v1` |
 
#### Mobile (`mobile/.env` ali `app.config.js`)
 
| Spremenljivka | Opis | Primer vrednosti |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | URL Fastify API-ja | `http://192.168.1.100:3000/api/v1` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID za Calendar | `xxx.apps.googleusercontent.com` |
 
> **Opomba:** Na mobilni aplikaciji mora biti `API_URL` IP naslov razvojnega računalnika (ne `localhost`), ker Expo mobilna aplikacija ne more dostopati do `localhost` gostitelja.
 
---
 
## 10. Deployment
 
### CI/CD pipeline
 
GitHub Actions pipeline skrbi za avtomatski deploy na Fly.io ob vsakem pushu na `main` vejo. Web aplikacija se deploya samo ob spremembi datotek v mapi `web/**`, da se prepreči nepotrebni redeploy.
 
```mermaid
flowchart TD
    DEV[Developer: git push origin main] --> GHA[GitHub Actions sprožen]
    GHA --> PA[deploy.yml\nAPI deploy]
    GHA --> PW{deploy-web.yml\nSprememba v web/**?}
    
    PA --> A1[Checkout kode]
    A1 --> A2[flyctl deploy --remote-only\niz /api mape]
    A2 --> A3[Fly.io zgradi Docker image\nza API]
    A3 --> A4[Deploy API na Fly.io\nprojekt2026.fly.dev]
    
    PW -->|Da| W1[Checkout kode]
    PW -->|Ne| SKIP[Skip web deploy]
    W1 --> W2[flyctl deploy --remote-only\niz /web mape]
    W2 --> W3[Fly.io zgradi Docker image\nza Web]
    W3 --> W4[Deploy Web na Fly.io]
    
    A4 & W4 --> DONE[Produkcija posodobljena]
```
 
### GitHub Actions konfiguracija
 
Workflow datoteke se nahajajo v `.github/workflows/`:
 
- `deploy.yml` — deploy API-ja ob vsakem pushu na `main`
- `deploy-web.yml` — deploy spletne aplikacije samo ob spremembi `web/**` datotek
Secrets, ki morajo biti konfigurirani v GitHub repozitoriju:
- `FLY_API_TOKEN` — Fly.io API token za avtentikacijo `flyctl` ukaza
### Fly.io konfiguracija
 
Vsaka aplikacija (API in Web) ima svojo `fly.toml` konfiguracijsko datoteko. Fly.io skrbi za:
- SSL/TLS certifikate (Let's Encrypt)
- Avtomatsko skaliranje
- Health check monitoring (`/health` endpoint)
- PostgreSQL addon (produkcijska baza)
Produkcijska URL: `https://projekt2026.fly.dev`
 
### Lokalni razvoj vs produkcija
 
| Okolje | PostgreSQL | API | Web |
|---|---|---|---|
| Lokalno | Docker Compose | `npm run dev` | `npm run dev` |
| Produkcija | Fly.io managed | Fly.io container | Fly.io container |
 
---
 
## 11. Zagotavljanje kakovosti
 
### Monorepo struktura
 
Projekt je organiziran kot monorepo z ločenimi mapami za `api/`, `web/` in `mobile/`. Prednosti tega pristopa:
- En repozitorij za vse komponente poenostavi koordinacijo sprememb (npr. API sprememba + frontend posodobitev v enem PR-ju)
- Deljene TypeScript tipe bi bilo mogoče izluščiti v skupno mapo `shared/`
- Jasna ločitev odgovornosti med komponentami
### Audit logging
 
Audit log je implementiran kot Fastify `onResponse` hook, kar pomeni, da se beleži samo uspešno zaključene zahtevke. To je zavestna odločitev — neuspele zahtevke (npr. 401, 403) ni smiselno beležiti, ker ne spremenijo stanja podatkov. Beleži se: `timestamp`, HTTP metoda, URL, ID vožnje (kjer relevantno) in ID voznika iz JWT tokena.
 
### Swagger dokumentacija
 
API je dokumentiran s Swagger UI, dostopnim na `/docs`. Generira se avtomatsko iz Fastify JSON Schema definicij v route moduli (`api/src/schemas/`). Dostop je zaščiten z basic auth, da se prepreči razkritje API strukture nepooblaščenim osebam. Za razvijalce je Swagger ključno orodje za testiranje endpointov brez potrebe po Postman kolekcijah.
 
### Error handling
 
API sledi enotnemu formatu napak:
 
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Obvezno polje 'stanje' manjka"
}
```
 
Fastify-jev vgrajeni error handler se dopolni z domačimi validacijskimi napakami iz Prisma ORM-a (npr. `P2002` za unique constraint violations).
 
### Rate limiting
 
Dvonivojski rate limiting ščiti sistem pred zlorabo:
- **Globalni limit** (100 req/min): ščiti pred DoS napadi in prekomerno obremenitvijo baze
- **Login limit** (3 req/min): ščiti pred brute-force napadi na gesla
### Priporočila za testiranje
 
Ker projekt nima implementiranih avtomatiziranih testov, so tukaj predlogi za prihodnje:
 
**Unit testi** (Jest + Prisma mock):
- `crypto.js` plugin: test šifriranja/dešifriranja EMŠO
- Rate limiting logika
- JWT generiranje in validacija
**Integration testi** (Fastify inject):
- Login flow s pravilnimi/napačnimi kredenciali
- RBAC: preveriti, da voznik ne more dostopati do admin endpointov (pričakovan HTTP 403)
- Tahograf: začetek → zaključek → preveriti trajanje_min
**E2E testi** (Playwright za web, Detox za mobile):
- Celoten login → dodajanje vožnje → odjava scenarij
- Uvoz DDD datoteke → preveriti uvožene zapise
---
 
## 12. Roadmap in znane omejitve
 
### Znane omejitve
 
- **Ni avtomatiziranih testov** — sistem nima unit, integration ali E2E testov. Vse testiranje je bilo ročno.
- **Mock lokacije na dashboardu** — Leaflet karta na admin dashboardu prikazuje zadnje znane lokacije voznikov iz tahografskih zapisov, ki niso nujno v realnem času. Prava real-time sledenje bi zahtevalo WebSocket ali SSE integracijo.
- **Python subprocess overhead** — vsak uvoz DDD datoteke zažene nov Python proces, kar doda latency (≈1-2s). Za produkcijo z veliko uvoži bi bila boljša rešitev Python mikroservis z gRPC ali REST vmesnikom.
- **Refresh token brez rotacije** — trenutni implementacija ne rotira refresh tokenov ob vsaki uporabi, kar zmanjšuje varnost pri kraji tokena.
- **Ni offline podpore za mobilno** — mobilna aplikacija zahteva aktivno internetno povezavo. Tahografski zapisi se ne shranjujejo lokalno ob izpadu povezave.
- **EMŠO šifrirni ključ v env** — ključ za AES-256-GCM je shranjen v okoljski spremenljivki, ne v namenski key management rešitvi (npr. HashiCorp Vault, AWS KMS).
### Roadmap
 
**Kratkoročno:**
- Implementacija unit in integration testov (Jest)
- Refresh token rotacija za višjo varnost
- Offline modo za mobilno aplikacijo (lokalni SQLite cache s sinhronizacijo)
**Srednjeročno:**
- Python mikroservis za DDD/Excel parsing (FastAPI) namesto subprocess
- Real-time dashboard posodabljanje prek WebSocket
- Push notifikacije za voznike ob novem urniku (FCM/APNs)
- Večjezičnost (i18n) za slovenščino in angleščino
**Dolgoročno:**
- Zamenjava Excel/DDD parserjev z validiranim EU tahografskim modulom
- Integracija z zunanjimi fleet management sistemi
- Mobile biometric authentication (Face ID / Touch ID prek expo-local-authentication)
- Napredna analitika voženj in izvedbene statistike
