# Projekt2026 — Multi-platformni logistični sistem

> Digitalni sistem za upravljanje logistike, tahografskih zapisov in voznega parka za podjetje **Sirena d.o.o.**

![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Mobile%20%7C%20API-blue)
![Node](https://img.shields.io/badge/node-20.x-green)
![React](https://img.shields.io/badge/react-19-61DAFB)
![Expo](https://img.shields.io/badge/expo-54-black)
![Deployment](https://img.shields.io/badge/deploy-Fly.io-purple)
![License](https://img.shields.io/badge/license-Univerzetni%20projekt-lightgrey)

---

## Kazalo vsebine

1. [Pregled sistema](#1-pregled-sistema)
2. [Ekipa](#2-ekipa)
3. [Arhitektura](#3-arhitektura)
4. [Tok podatkov](#4-tok-podatkov)
5. [Use Case diagram](#5-use-case-diagram)
6. [Sequence diagrami](#6-sequence-diagrami)
7. [Diagrami aktivnosti](#7-diagrami-aktivnosti)
8. [Varnost](#8-varnost)
9. [API referenca](#9-api-referenca)
10. [Baza podatkov](#10-baza-podatkov)
11. [Arhitekturne odločitve](#11-arhitekturne-odlo%C4%8Ditve)
12. [Vodenje projekta](#12-vodenje-projekta)
13. [Razvoj in lokalna namestitev](#13-razvoj-in-lokalna-namestitev)
14. [Deployment](#14-deployment)
15. [Zagotavljanje kakovosti](#15-zagotavljanje-kakovosti)
16. [Znane omejitve](#16-znane-omejitve)
17. [Testiranje uporabniške izkušnje (SUS)](#17-testiranje-uporabni%C5%A1ke-izku%C5%A1nje-sus)
18. [Možne nadgradnje v prihodnosti](#18-mo%C5%BEne-nadgradnje-v-prihodnosti)

---

## 1. Pregled sistema

### Problem statement

Logistična podjetja, ki upravljajo vozne parke in zaposlujejo voznike, se soočajo s kompleksnimi regulativnimi zahtevami EU glede tahografskih zapisov. Vozniki morajo natančno beležiti čas vožnje, odmorov in počitka. Administrativni procesi — od razporedov in urnikov do obračuna plač in računov — so pogosto ročni in podvrženi napakam. Sistem Projekt2026 digitalizira te procese v enotni platformi za podjetje Sirena d.o.o.

### Ključne funkcionalnosti

- Sledenje tahografskim stanjem v realnem času prek mobilne aplikacije (VOZNJA, ODMOR, POCITEK, DELO, RAZPOLOZLJIVOST, DRUGO)
- **Offline delovanje mobilne aplikacije** — tahografska stanja se shranjujejo lokalno ob izpadu povezave in se avtomatsko sinhronizirajo ob ponovni vzpostavitvi
- Uvoz Excel datotek prek spletnega vmesnika
- Upravljanje vožnje: beleženje, pregledovanje in brisanje posameznih voženj
- Načrtovanje prevozov: dodeljevanje voznikov, vozil in strank
- Vozni park: evidenca vozil in tipov vozil
- Upravljanje strank (naročnikov)
- Administrativni dashboard z agregiranim pregledom nad vsemi vozniki
- Audit log vseh sprememb podatkov (POST/PUT/DELETE/PATCH)
- GDPR skladnost: anonimizacija osebnih podatkov prek API klica (`DELETE /auth/me`) — UI gumb ni implementiran
- Google Calendar integracija za urnik v mobilni aplikaciji

### Uporabniški profili

| Vloga   | Koda | Opis                                                                                                        |
| ------- | ---- | ----------------------------------------------------------------------------------------------------------- |
| Voznik  | 1    | Beleži vožnje in tahografska stanja prek mobilne aplikacije; pregleduje lastne vožnje                       |
| Admin   | 2    | Upravlja vozni park, stranke, voznike in prevozi; dostopa do dashboard-a, audit logov in uvoza excel datotek  |
| Vodstvo | 3    | Pregleduje vse prevozi in finančne podatke; dostopa do dashboard-a in analitike; uvoz in izvoz excel datotek                             |

---

## 2. Ekipa

| Član            | GitHub                                           | Vloga                                                |
| --------------- | ------------------------------------------------ | ---------------------------------------------------- |
| Valeri Kamburov | [@Valeri123car](https://github.com/Valeri123car) | Vodja projekta, full-stack razvoj (API, Web, Mobile) |
| Luka Crešnar    | [@LukaCresnar](https://github.com/LukaCresnar)   | Web razvoj, baza podatkov, API, testiranje                |
| Rok Krajnc      | [@kranjo4](https://github.com/kranjo4)           | Web razvoj, baza podatkov, API, testiranje                |

**Skrbnik projekta:** Sirena d.o.o.

---

## 3. Arhitektura

Sistem sledi klasični **3-tier arhitekturi**: mobilni in spletni odjemalec komunicirata z Fastify REST API-jem, ki upravlja bazo podatkov PostgreSQL prek Prisma ORM-a. Python skripte se izvajajo kot subprocesi za obdelavo tahografskih datotek.

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
        PY["Python Subprocess\nreadExcelFile.py"]
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

Diagram prikazuje 7 entitet v bazi podatkov skupaj z vsemi relacijami in kardinalnostmi. Centralna entiteta je `Uporabnik`, ki je povezana z večino ostalih tabel. `TahografZapis` ima poseben atribut `vir` (`POSNETO` ali `UVOZ`), ki razlikuje med ročno snemanjem prek mobilne aplikacije in uvozom DDD/Excel datotek. `Voznja` vsebuje poslovne podatke (cena, stranka, relacija) in je neodvisna od tahografskih tehničnih zapisov.

```mermaid
erDiagram
    Uporabnik {
        int id_uporabnik PK
        string ime
        string priimek
        string email
        string geslo
        int dostop
        string emso_crypted
        bool gdpr_soglasje
        datetime gdpr_datum
    }

    Voznja {
        int id_voznja PK
        date datum
        datetime zacetek
        datetime konc
        int fk_uporabnik FK
        int fk_vozilo FK
        int fk_stranka FK
        string stranka_ime
        string relacija
        string opis
        float cena
        bool placano
        datetime timestamp_zapis
    }

    TahografZapis {
        int id_zapis PK
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
        datetime timestamp_zapis
    }

    Vozilo {
        int id_vozilo PK
        string registerska
        int st_sedezev
        int dolzina
        int fk_tip_vozila FK
    }

    TipVozila {
        int id_tip_vozila PK
        string naziv
    }

    Stranka {
        int id_stranka PK
        string naziv
        string email
        string telefonska
        int davcna_st
    }

    LOG_voznja {
        int idLOG PK
        datetime timestamp
        string TYPE
        string metoda
        string url
        int voznja_id_voznja
        int voznja_fk_uporabnik FK
    }

    Uporabnik ||--o{ Voznja : "ima"
    Uporabnik ||--o{ TahografZapis : "ima"
    Uporabnik ||--o{ LOG_voznja : "beleži"
    Voznja }o--o| Vozilo : "uporablja"
    Voznja }o--o| Stranka : "za stranko"
    Vozilo }o--|| TipVozila : "je tipa"
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

## 4. Tok podatkov

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

### b) Tahograf recording flow z offline podporo (mobilna aplikacija)

Voznik na mobilni aplikaciji ročno beleži tahografska stanja. Sistem podpira offline delovanje — ob izpadu povezave se stanje shrani lokalno v `AsyncStorage` prek `tahografCache.js`. Ob ponovni vzpostavitvi povezave `useSinhronizacija.js` hook avtomatsko posreduje čakajoče zahtevke na API.

```mermaid
flowchart TD
    A[Voznik izbere stanje\npr. VOZNJA] --> B{Internetna\npovezava?}
    B -->|Da| C[POST /api/v1/tahograf/zacni]
    B -->|Ne| D[Shrani lokalno\ntahografCache.js\nAsyncStorage]
    D --> E[Prikaži timer\niz lokalnega stanja]
    C --> F[JWT verifikacija]
    F --> G{Obstaja aktivno\nstanje?}
    G -->|Da| H[HTTP 409 Conflict]
    G -->|Ne| I[Ustvari TahografZapis\nvir = POSNETO\nzacetek = NOW]
    I --> J[HTTP 201: Created zapis]
    J --> K[Shrani lokalno\nshraniAktivnoLokalno]
    K --> E
    E --> L[Voznik zaključi stanje]
    L --> M{Internetna\npovezava?}
    M -->|Da| N[POST /api/v1/tahograf/zakljuci]
    M -->|Ne| O[Shrani zakljuci\nv čakajočo vrsto\ndodajCakajoci]
    O --> P[useSinhronizacija hook\nzazna vzpostavitev povezave]
    P --> Q[Posreduj vse čakajoče\nzahtevke po vrsti]
    Q --> R[Osveži podatke\nnaloziPodatke]
    N --> S[Posodobi TahografZapis\nkonec + trajanje_min]
    S --> R
```

### c) Tahografska datoteka import flow

Uvoz tahografskih datotek je večstopenjski proces. Fastify sprejme datoteko prek multipart forme, jo posreduje Python subprocesu. Rezultat (JSON) se transakcijsko uvozi v bazo.

```mermaid
flowchart TD
    A[Admin naloži Excel datoteko\nspletni vmesnik] --> B[POST /api/v1/ddd_upload/upload\nmultipart/form-data, max 50MB]
    B --> C[JWT verifikacija\nRBAC: samo admin]
    C --> F[Node.js: spawn Python\nreadExcelFile.py filepath]
    F --> H[Python razčleni Excel\ntahografske podatke]
    H --> I[Python stdout: JSON array\ntahografskih zapisov]
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
    B --> C[JWT verifikacija\nRBAC: admin + vodstvo]
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

## 5. Use Case diagram

Use case diagram prikazuje vse akterje sistema (Voznik, Admin, Računovodja, Sistem) in vse akcije, ki jih posamezni akter lahko izvede. Sistem nastopa kot avtonomen akter pri avtomatskih procesih (audit log, JWT refresh, rate limiting).

```mermaid
graph LR
    VOZNIK((Voznik))
    ADMIN((Admin))
    VODSTVO((Vodstvo))
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
        UC8[Ogled voženj vseh voznikov]
    end

    subgraph Tahograf
        UC9[Začetek tahografskega stanja]
        UC10[Zaključek tahografskega stanja]
        UC11[Ogled aktivnega stanja]
        UC12[Ogled zgodovine stanj]
        UC13[Ogled dnevnega povzetka]
        UC14[Uvoz DDD/Excel datoteke]
        UC31[Offline beleženje stanj]
        UC32[Avtomatska sinhronizacija]
    end

    subgraph Prevozi
        UC15[Ogled urnika voženj]
        UC16[Upravljanje prevozov]
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
    VOZNIK --> UC31
    VOZNIK --> UC32

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

    VODSTVO --> UC1
    VODSTVO --> UC8
    VODSTVO --> UC24

    SIS --> UC28
    SIS --> UC29
    SIS --> UC30
    SIS --> UC3
```

---

## 6. Sequence diagrami

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

### b) Zapis tahografskega stanja z offline podporo (mobile → cache → API → DB)

Voznik prek mobilne aplikacije začne in zaključi tahografsko stanje. Sistem podpira offline delovanje prek lokalnega `AsyncStorage` casha. Ko je voznik brez povezave, se stanje shrani lokalno; `useSinhronizacija` hook zazna vzpostavitev povezave in posreduje čakajoče zahtevke.

```mermaid
sequenceDiagram
    participant MOB as Mobilna aplikacija
    participant CACHE as tahografCache\n(AsyncStorage)
    participant API as Fastify API
    participant DB as PostgreSQL

    MOB->>MOB: Voznik pritisne VOZNJA
    MOB->>CACHE: shraniAktivnoLokalno(noviZapis)
    MOB->>MOB: Prikaži timer (lokalno)

    alt Online
        MOB->>API: POST /api/v1/tahograf/zacni\n{stanje, registrska}
        API->>DB: INSERT TahografZapis\nvir=POSNETO, zacetek=NOW()
        DB-->>API: Ustvarjeni zapis
        API-->>MOB: HTTP 201 {id, stanje, zacetek}
        MOB->>CACHE: shraniAktivnoLokalno(serverZapis)
    else Offline
        MOB->>CACHE: dodajCakajoci({tip: "zacni", stanje, cas})
        MOB->>MOB: Alert "Shranjeno lokalno"
    end

    Note over MOB,CACHE: Voznik menja stanja med offline

    MOB->>CACHE: preberiCakajoche()
    CACHE-->>MOB: Seznam čakajočih zahtevkov

    Note over MOB,API: Vzpostavitev internetne povezave

    MOB->>API: useSinhronizacija hook — posreduj čakajoče
    loop Za vsak čakajoči zahtevek
        MOB->>API: POST /tahograf/zacni ali zakljuci
        API->>DB: INSERT/UPDATE TahografZapis
        DB-->>API: OK
        API-->>MOB: HTTP 201/200
    end
    MOB->>CACHE: izbrisiCakajoche()
    MOB->>API: naloziPodatke() — osveži vse
```

### c) Uvoz Excel datoteke (web → API → Python → DB)

Uvoz Excel datoteke je edini primer integracije med Node.js in Python. Fastify zažene Python skript kot subprocess, bere stdout za JSON rezultat in ga transakcijsko uvozi. Ta pristop je bil izbran, ker Python ekosistem ponuja boljše knjižnice za branje excel formatov kot Node.js.

```mermaid
sequenceDiagram
    participant WEB as Spletna aplikacija
    participant API as Fastify API
    participant PY as Python (subprocess)
    participant DB as PostgreSQL

    WEB->>API: POST /api/v1/ddd_upload/upload\nmultipart/form-data (max 50MB)\n.ddd ali .xlsx datoteka
    API->>API: JWT verifikacija\nRBAC: dostop === 2 (admin)
    API->>API: Shrani datoteko na disk (temp)
    API->>PY: spawn: python readExcelFile.py <filepath>
    PY->>PY: Razčleni Excel format
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

## 8. Varnost

### JWT avtentikacija

API uporablja JSON Web Tokens z 8-urno veljavnostjo access tokena. Payload vsebuje `id` in `dostop` (vloga). Refresh token mehanizem omogoča brezšivno obnovo seje. Vsaka zaščitena ruta zahteva `Authorization: Bearer <token>` header, ki ga Fastify plugin preveri pred izvedbo route handler-ja.

### AES-256-GCM šifriranje EMŠO

EMŠO (Enotna matična številka občana) je osebni identifikator, ki po GDPR spada med posebej varovane osebne podatke (PII). Sistem ga šifrira z AES-256-GCM algoritmom pred shranjevanjem v stolpec `emso_crypted`. GCM način zagotavlja tako zaupnost kot integriteto podatkov (authenticated encryption). Šifrirni ključ je shranjen v okoljski spremenljivki, ločeni od baze.

### bcryptjs gesla

Gesla se nikoli ne shranjujejo v čistem tekstu. Ob registraciji se geslo hashira z bcryptjs z work factor 12 (12 roundov), kar naredi brute-force napade nepraktične. 12 roundov je izbira, ki zagotavlja ravnovesje med varnostjo in hitrostjo (≈300ms na hash).

### RBAC (Role-Based Access Control)

Vsak endpoint ima definirano zahtevano vlogo. Middleware preveri `dostop` vrednost iz JWT payloada pred izvajanjem handler-ja.

| Vloga   | Koda | Dostopni endpointi                                                                                                             |
| ------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| Voznik  | 1    | `/auth/*`, `/voznje` (lastne), `/tahograf/*`                                                                                   |
| Admin   | 2    | Vse rute voznika + `/admin/*`, `/vozila/*`, `/tipi-vozil/*`, `/stranke/*`, `/dashboard/*`, `/ddd_upload/upload`               |
| Vodstvo | 3    | `/auth/*`, `/admin/voznje`, `/admin/vozniki`, `/admin/stranke`, `/admin/vozila`, `/dashboard/*`                                |

### Audit log

Fastify plugin `audit.js` se registrira kot `onResponse` hook in zabeleži vsak POST, PUT, DELETE ali PATCH zahtevek v tabelo `LOG_voznja`. Beleži se: timestamp, HTTP metoda, URL, ID vožnje (če relevantno) in ID voznika. Audit log je namenjen sledljivosti sprememb in je dostopen adminu prek `/admin/audit` z paginacijo.

### Rate limiting

Globalni rate limit: **100 zahtevkov/minuto** na IP naslov. Login endpoint ima strožji limit: **3 zahtevki/minuto** za preprečevanje brute-force napadov na gesla. Ob prekoračitvi API vrne HTTP 429 Too Many Requests.

### GDPR

Endpoint `DELETE /auth/me` omogoča anonimizacijo podatkov prijavljenega uporabnika. Sistem ne briše zapisov (za namen audit trail-a), ampak prepiše PII z anonimnimi vrednostmi: `ime` in `priimek` → `"IZBRISANO"`, `email` → `"deleted_{id}_{timestamp}@izbrisano.si"` (unikatno, da ne krši UNIQUE omejitve), `emso_crypted` → `null`, `geslo` → `"IZBRISANO"` (neveljavni bcrypt hash, kar trajno zaklene račun). `gdpr_soglasje` in `gdpr_datum` polja beležijo soglasje pri registraciji.

**Omejitev:** Endpoint obstaja in deluje na ravni API-ja, vendar nobena stran spletne ali mobilne aplikacije trenutno ne ponuja UI gumba za sprožitev tega klica. Klic je mogoč le neposredno prek API-ja (npr. curl ali Swagger).

### CORS in Swagger

API ima konfigurirano CORS politiko za specifične dovoljene origine (produkcijska spletna aplikacija). Swagger UI dokumentacija (`/docs`) je zaščitena z basic auth, da ni javno dostopna.

---

## 9. API referenca

Vsi endpointi so na base poti `/api/v1`. JWT token se pošlje v `Authorization: Bearer <token>` headerju.

### Avtentikacija

| Metoda | Pot              | Dostop  | Opis                        |
| ------ | ---------------- | ------- | --------------------------- |
| POST   | `/auth/login`    | Javno   | Prijava; rate limit 3/min   |
| POST   | `/auth/register` | Javno   | Registracija novega voznika |
| POST   | `/auth/refresh`  | Javno   | Osvežitev JWT tokena        |
| DELETE | `/auth/me`       | Voznik+ | GDPR anonimizacija          |

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

| Metoda | Pot                   | Dostop  | Opis                          |
| ------ | --------------------- | ------- | ----------------------------- |
| GET    | `/voznje`             | Voznik+ | Seznam lastnih voženj         |
| POST   | `/voznje`             | Voznik+ | Dodajanje nove vožnje         |
| DELETE | `/voznje/:id`         | Voznik+ | Brisanje vožnje (samo lastne) |
| GET    | `/voznje/voznjeMesec` | Admin   | Mesečne vožnje vseh voznikov  |

### Tahograf

| Metoda | Pot                   | Dostop  | Opis                                |
| ------ | --------------------- | ------- | ----------------------------------- |
| GET    | `/tahograf/aktivno`   | Voznik+ | Trenutno aktivno stanje             |
| GET    | `/tahograf/zgodovina` | Voznik+ | Zgodovina stanj z datumskim filtrom |
| GET    | `/tahograf/povzetek`  | Voznik+ | Dnevni povzetek po stanjih          |
| POST   | `/tahograf/zacni`     | Voznik+ | Začetek novega stanja               |
| POST   | `/tahograf/zakljuci`  | Voznik+ | Zaključek aktivnega stanja          |

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

| Metoda | Pot                 | Dostop | Opis                          |
| ------ | ------------------- | ------ | ----------------------------- |
| GET    | `/admin/vozniki`    | Admin  | Seznam vseh voznikov          |
| GET    | `/admin/voznje`     | Admin  | Vse vožnje vseh voznikov      |
| GET    | `/admin/audit`      | Admin  | Audit logi s paginacijo       |
| POST   | `/admin/uporabniki` | Admin  | Ustvarjanje novega uporabnika |

### Vozni park

| Metoda     | Pot               | Dostop  | Opis                         |
| ---------- | ----------------- | ------- | ---------------------------- |
| GET/POST   | `/vozila`         | Voznik+ | Seznam/dodajanje vozil       |
| PUT/DELETE | `/vozila/:id`     | Admin   | Urejanje/brisanje vozila     |
| GET/POST   | `/tipi-vozil`     | Admin   | Kategorije vozil             |
| PUT/DELETE | `/tipi-vozil/:id` | Admin   | Urejanje/brisanje kategorije |

### Stranke

| Metoda              | Pot        | Dostop  | Opis            |
| ------------------- | ---------- | ------- | --------------- |
| GET/POST/PUT/DELETE | `/stranke` | Voznik+ | CRUD za stranke |

### Ostalo

| Metoda | Pot                  | Dostop          | Opis                             |
| ------ | -------------------- | --------------- | -------------------------------- |
| GET    | `/dashboard`         | Admin + Vodstvo | Agregirani dashboard podatki     |
| POST   | `/ddd_upload/upload` | Admin      | Uvoz DDD/Excel tahograf datoteke |
| GET    | `/docs`              | Basic auth | Swagger UI dokumentacija         |
| GET    | `/health`            | Javno      | Health check                     |

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

## 10. Baza podatkov

### Modeli in namen

**Uporabnik** je centralna entiteta sistema. Poleg osnovnih profilnih podatkov vsebuje šifrirani EMŠO (`emso_crypted`) za GDPR-skladno obdelavo PII. Vloge so kodirane numerično (1/2/3) namesto z enum tipom, kar olajša razširitev v prihodnosti brez migracije sheme.

**Voznja** beleži posamezno delovno vožnjo voznika. Vsebuje poslovne podatke (stranka, relacija, opis, cena, placano) in opcijske FK na `Vozilo` in `Stranka` za sledljivost virov. Polje `stranka_ime` omogoča zapis stranke kot prostega besedila, kadar stranka ni formalno registrirana v sistemu.

**TahografZapis** ima poseben stolpec `vir` z vrednostma `POSNETO` ali `UVOZ`. To razlikovanje je kritično, ker EU regulativa zahteva sledljivost med ročno snemani in uvoženi podatki iz DDD čipa. Uvoženi podatki imajo absolutno prednost pred ročnimi vnosi pri morebitnih inšpekcijah.

**LOG_voznja** je audit tabela za beleženje sprememb. Vsebuje samo tiste podatke, ki so potrebni za rekonstrukcijo zgodovine (HTTP metoda, URL, ID vožnje, ID voznika). Ne vsebuje celotnih payloadov zahtevkov, ker bi to povzročilo prekomerno rast tabele.

**Vozilo / TipVozila** sta v relaciji 1:M — vsako vozilo spada v en tip. Ta normalizacija omogoča grupiranje statistik po tipu vozila brez podvajanja podatkov.

**Stranka** shranjuje naročnike voženj. Ker je `fk_stranka` v `Voznja` opcijski, je mogoče beležiti vožnje brez formalno registrirane stranke (npr. interne vožnje).

### Indeksi

Priporočeni indeksi za produkcijsko delovanje:

```sql
CREATE INDEX idx_voznja_fk_uporabnik ON "Voznja"(fk_uporabnik);
CREATE INDEX idx_voznja_fk_vozilo ON "Voznja"(fk_vozilo);
CREATE INDEX idx_voznja_fk_stranka ON "Voznja"(fk_stranka);
CREATE INDEX idx_tahograf_fk_uporabnik ON "TahografZapis"(fk_uporabnik);
CREATE INDEX idx_tahograf_stanje ON "TahografZapis"(stanje);
CREATE INDEX idx_tahograf_vir ON "TahografZapis"(vir);
CREATE INDEX idx_log_voznja_timestamp ON "LOG_voznja"(timestamp);
CREATE INDEX idx_log_voznja_uporabnik ON "LOG_voznja"(voznja_fk_uporabnik);
```

### Razlog za izbiro PostgreSQL

PostgreSQL 16 je bil izbran pred alternativami (MySQL, SQLite) zaradi:

- Podpira transakcije ACID, kritične pri `createMany` uvozu tahografskih podatkov
- `jsonb` tip za morebitno shranjevanje kompleksnih Python parsing rezultatov
- Prisma ORM ima odlično podporo za PostgreSQL
- Fly.io ponuja managed PostgreSQL instance

---

## 11. Arhitekturne odločitve

Ta sekcija dokumentira ključne arhitekturne odločitve (Architecture Decision Records — ADR) s pojasnilom konteksta, alternativ in razlogov za vsako odločitev.

### ADR-001: Monorepo struktura

**Odločitev:** Vse tri komponente (`api/`, `web/`, `mobile/`) so v enem Git repozitoriju.

**Kontekst:** Projekt ima tesno sklopljene komponente — vsaka sprememba API-ja zahteva usklajeno spremembo frontend-a ali mobilne aplikacije.

**Alternative:** Ločeni repozitoriji za vsako komponento (polyrepo).

**Razlog za izbiro monorepa:**

- Atomarni commiti za medsebojno odvisne spremembe
- Enotno sledenje nalogam in verzijam prek enega repozitorija
- Poenostavljen CI/CD — en GitHub Actions konfiguracija za vse komponente

**Kompromisi:** Večji repozitorij, potencialno daljši `git clone` — za projekt tega obsega ni relevantno.

---

### ADR-002: Fastify namesto Express

**Odločitev:** Backend API temelji na Fastify 5.x, ne na bolj razširjenem Express.js.

**Kontekst:** API mora biti zmogljiv pri obdelavi tahografskih uvozov (50MB multipart) in hkratnih zahtevkov od mobilne in spletne aplikacije.

**Alternative:** Express.js (de-facto standard), Hono, NestJS.

**Razlog za izbiro Fastify:**

- Vgrajeni JSON Schema validacija za request/response
- Avtomatska generacija Swagger dokumentacije iz shem
- Plugin sistem (cryptoPlugin, prismaPlugin, auditPlugin) spodbuja modularnost
- Zmogljivost: Fastify je ~35% hitrejši od Express pri JSON serializaciji

---

### ADR-003: Prisma ORM namesto raw SQL

**Odločitev:** Vsi dostopi do baze gredo prek Prisma ORM-a.

**Kontekst:** Baza ima 7 tabel z medsebojnimi relacijami. 

**Alternative:** Raw SQL (pg driver), Knex.js, Drizzle ORM.

**Razlog za izbiro Prisma:**

- Type-safe poizvedbe preprečijo kategorijo runtime napak
- Migracije (`prisma migrate dev`) zagotavljajo verzioniranje sheme
- Prisma Studio poenostavi razvoj in debugging
- Odlična integracija z Fly.io PostgreSQL

---

### ADR-004: Python subprocess za Excel parsing

**Odločitev:** Excel tahografske datoteke se razčlenijo prek Python subprocesov, ki jih Node.js zažene sinhrono.

**Kontekst:** Node.js nima ustreznih knjižnic za razčlenjevanje tahografskih Excel formatov; Python ima `openpyxl`.

**Alternative:** Python mikroservis z REST/gRPC vmesnikom; Node.js implementacija parserja.

**Razlog za izbiro subprocesov:**

- Najhitreje implementirati brez vzdrževanja ločenega mikroservisa
- Zadostuje za obseg uvozov (priložnostni admin uvozi)
- Python rezultat (JSON array) je preprost za konsumpcijo v Node.js prek `stdout`

**Kompromisi:** Vsak uvoz doda ≈1-2s latency za inicializacijo Python procesa.

---

### ADR-005: JWT brez server-side shranjevanja tokenov

**Odločitev:** Access tokeni (8h) so stateless JWT; refresh tokeni so hranjeni na strani odjemalca.

**Kontekst:** Sistem mora podpirati mobilne odjemalce z intermitentno povezavo.

**Alternative:** Server-side session shranjevanje (Redis), opaque tokeni.

**Razlog za izbiro stateless JWT:**

- Brez potrebe po Redis infrastrukturi za ta obseg projekta
- Horizontalna skalabilnost brez deljene seje
- Eksplicitna veljavnost (8h) zmanjša tveganje pri kompromitiranem tokenu

**Kompromisi:** Ni možnosti takojšnje invalidacije tokena pred potekom.

---

### ADR-006: Fly.io namesto AWS/Azure/GCP

**Odločitev:** Produkcijsko okolje je Fly.io v regiji Frankfurt (fra).

**Kontekst:** Sistem obdeluje EMŠO (PII) in mora biti skladen z EU GDPR — podatki morajo ostati v EU.

**Alternative:** AWS EU, Heroku, DigitalOcean.

**Razlog za izbiro Fly.io:**

- Nativna podpora za Dockerfile deploy brez kompleksne konfiguracije
- Integriran PostgreSQL addon v isti regiji (brez cross-region latency)
- Avtomatski TLS certifikati
- GitHub Actions integracija prek `flyctl` je enostavna

---

### ADR-007: AsyncStorage offline cache za tahograf (mobilna aplikacija)

**Odločitev:** Mobilna aplikacija shranjuje tahografska stanja lokalno v `AsyncStorage` prek `tahografCache.js` ob izpadu internetne povezave.

**Kontekst:** Vozniki pogosto delajo na lokacijah z nezanesljivo internetno pokritostjo. EU regulativa zahteva neprekinjeno beleženje tahografskih stanj.

**Alternative:** Zahtevati stalno internetno povezavo; SharedWorker za background sync.

**Razlog za izbiro AsyncStorage offline casha:**

- `useSinhronizacija` hook zazna vzpostavitev povezave in avtomatsko posreduje čakajoče zahtevke v pravilnem vrstnem redu
- Voznik dobi takojšen vizualni feedback (timer teče) tudi brez povezave
- Registrska številka vozila se persistira med menjava stanj, kar odpravi ponavljajoče vnose

**Kompromisi:** Čakajoči zahtevki se izgubijo ob prisilnem zaprtju aplikacije pred sinhronizacijo.

---

### ADR-008: Numerične vloge namesto enum

**Odločitev:** Polje `dostop` v tabeli `Uporabnik` shranjuje numerično vrednost (1, 2, 3) namesto string enum-a.

**Kontekst:** Sistem ima 3 vloge z hierarhičnim dostopom.

**Alternative:** PostgreSQL ENUM tip, string vrednosti.

**Razlog za numerične vrednosti:**

- Enostavno preverjanje hierarhičnih pravic: `dostop >= 2`
- Dodajanje nove vloge ne zahteva migracije sheme
- JWT payload je manjši z numeričnim tipom

---

## 12. Vodenje projekta

### Organizacija dela

Projekt je bil organiziran po **Kanban metodologiji** z uporabo **Trello** orodja za sledenje nalogam. (https://trello.com/b/IctSFTeg/sirena)

**Repozitorij:** [https://github.com/Valeri123car/Projekt2026](https://github.com/Valeri123car/Projekt2026)

### Delitev nalog

| Področje                                | Odgovorna oseba(e)            |
| --------------------------------------- | ----------------------------- |
| Backend API (Fastify, Prisma, routes)   | Vsi  |
| Spletna aplikacija (React, dashboard)   | Vsi                           |
| Mobilna aplikacija (React Native, Expo) | Valeri Kamburov               |
| Baza podatkov (shema, migracije)        | Luka Crešnar, Valeri Kamburov |
| Varnost (JWT, RBAC, GDPR, šifriranje)   | Valeri Kamburov               |
| CI/CD pipeline (GitHub Actions, Fly.io) | Valeri Kamburov               |
| Testiranje (ročno, Vitest, SonarCloud)  | Vsi člani                     |
| Dokumentacija                           | Vsi člani                     |

### Git workflow

Projekt sledi **trunk-based development** z `main` kot edino produkcijsko vejo. Vsak commit na `main` sproži avtomatski deploy na Fly.io.

```mermaid
gitGraph
   commit id: "init: projekt scaffold"
   commit id: "feat: auth JWT + RBAC"
   commit id: "feat: tahograf recording"
   commit id: "feat: offline cache + sync"
   commit id: "feat: DDD import Python"
   commit id: "feat: admin dashboard"
   commit id: "feat: mobilna app"
   commit id: "feat: SonarCloud CI"
   commit id: "refactor: unified voznja schema"
   commit id: "fix: dropdown vozilo/stranka"
```

### Mejniki projekta

| Faza                   | Opis                                            | Status     |
| ---------------------- | ----------------------------------------------- | ---------- |
| Analiza in načrtovanje | Definicija zahtev, UML diagrami, shema baze     | Zaključeno |
| Backend API            | Vsi endpointi, JWT auth, RBAC, Prisma migracije | Zaključeno |
| Spletna aplikacija     | Dashboard, vožnje, admin panel, DDD uvoz        | Zaključeno |
| Mobilna aplikacija     | Tahograf, offline cache, Google Calendar        | Zaključeno |
| Varnost in GDPR        | AES-256 šifriranje, audit log, rate limiting    | Zaključeno |
| Deployment             | Fly.io produkcija, GitHub Actions CI/CD         | Zaključeno |
| Testiranje             | Vitest, SonarCloud analiza, ročno testiranje    | Zaključeno |
| Dokumentacija          | README, UML diagrami, SUS testiranje            | Zaključeno |

---

## 13. Razvoj in lokalna namestitev

### Predpogoji

| Orodje                  | Verzija | Namen                   |
| ----------------------- | ------- | ----------------------- |
| Node.js                 | 20.x    | Fastify API in frontend |
| Docker + Docker Compose | Latest  | Lokalni PostgreSQL      |
| Python                  | 3.10+   | DDD/Excel parser        |
| Expo CLI                | Latest  | Mobilna aplikacija      |
| npm                     | 9+      | Package manager         |

### Korak-po-korak namestitev

```bash
# 1. Kloniranje repozitorija
git clone https://github.com/Valeri123car/Projekt2026.git
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

| Spremenljivka        | Opis                                 | Primer vrednosti                                    |
| -------------------- | ------------------------------------ | --------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string         | `postgresql://user:pass@localhost:5432/projekt2026` |
| `JWT_SECRET`         | Skrivni ključ za JWT podpisovanje    | `super_secret_jwt_key_min_32_chars`                 |
| `JWT_REFRESH_SECRET` | Skrivni ključ za refresh token       | `another_secret_refresh_key`                        |
| `ENCRYPTION_KEY`     | 32-bytni ključ za AES-256-GCM (EMŠO) | `0123456789abcdef0123456789abcdef`                  |
| `SWAGGER_USER`       | Uporabnik za Swagger basic auth      | `admin`                                             |
| `SWAGGER_PASS`       | Geslo za Swagger basic auth          | `swaggerpass`                                       |
| `PORT`               | Port strežnika                       | `3000`                                              |
| `NODE_ENV`           | Okolje                               | `development`                                       |

#### Web (`web/.env`)

| Spremenljivka  | Opis               | Primer vrednosti               |
| -------------- | ------------------ | ------------------------------ |
| `VITE_API_URL` | URL Fastify API-ja | `http://localhost:3000/api/v1` |

#### Mobile (`mobile/.env` ali `app.config.js`)

| Spremenljivka         | Opis                               | Primer vrednosti                   |
| --------------------- | ---------------------------------- | ---------------------------------- |
| `EXPO_PUBLIC_API_URL` | URL Fastify API-ja                 | `http://192.168.1.100:3000/api/v1` |
| `GOOGLE_CLIENT_ID`    | Google OAuth client ID za Calendar | `xxx.apps.googleusercontent.com`   |

> **Opomba:** Na mobilni aplikaciji mora biti `API_URL` IP naslov razvojnega računalnika (ne `localhost`), ker Expo mobilna aplikacija ne more dostopati do `localhost` gostitelja.

---

## 14. Deployment

### UML Deployment diagram

```mermaid
graph TB
    subgraph Dev["Razvijalčev računalnik"]
        DEVNODE["Node.js 20\nnpm run dev"]
        DEVWEB["Vite Dev Server\nlocalhost:5173"]
        DEVM["Expo Dev Server\nlocalhost:19006"]
        DEVPG["Docker Compose\nPostgreSQL 16\nlocalhost:5433"]
    end

    subgraph GitHub["GitHub (github.com)"]
        REPO["Git Repozitorij\nValeri123car/Projekt2026"]
        GHA1["Actions: deploy.yml\nAPI deploy"]
        GHA2["Actions: deploy-web.yml\nWeb deploy"]
        GHA3["Actions: sonar.yml\nSonarCloud analiza"]
    end

    subgraph FlyIO["Fly.io — Frankfurt (fra)"]
        subgraph APINODE["API Node (projekt2026.fly.dev)"]
            CONT1["Docker Container\nnode:20-alpine + Python3\nFastify 5.8.5 :3000"]
        end
        subgraph WEBNODE["Web Node (sirena-web.fly.dev)"]
            CONT2["Docker Container\nnginx:alpine\nReact 19 SPA"]
        end
        subgraph DBNODE["Database Node"]
            PG["Fly Postgres\nPostgreSQL 16\n(privaten, samo API dostop)"]
        end
    end

    subgraph Odjemalci["Odjemalci"]
        BROWSER["Spletni brskalnik\nHTTPS sirena-web.fly.dev"]
        MOBILE["Mobilna naprava\nExpo Go / APK"]
    end

    SONAR["SonarCloud\nCloud analiza kakovosti"]

    REPO -->|push na main| GHA1
    REPO -->|push na main + web/** filter| GHA2
    REPO -->|push/PR na main| GHA3
    GHA1 -->|flyctl deploy| CONT1
    GHA2 -->|flyctl deploy| CONT2
    GHA3 -->|analiza| SONAR

    BROWSER -->|HTTPS :443| CONT2
    MOBILE -->|HTTPS :443| CONT1
    CONT2 -->|REST API HTTPS| CONT1
    CONT1 -->|TCP :5432 interno| PG

    DEVNODE -.->|razvoj| DEVPG
    DEVWEB -.->|proxy /api → localhost:3000| DEVNODE
    DEVM -.->|REST API| DEVNODE
```

### CI/CD pipeline

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

Secrets, ki morajo biti konfigurirani v GitHub repozitoriju:

- `FLY_API_TOKEN` — Fly.io API token za avtentikacijo `flyctl` ukaza

---

## 15. Zagotavljanje kakovosti

### Audit logging

Audit log je implementiran kot Fastify `onResponse` hook, kar pomeni, da se beležijo samo uspešno zaključeni zahtevki. Beleži se: `timestamp`, HTTP metoda, URL, ID vožnje (kjer relevantno) in ID voznika iz JWT tokena.

### Swagger dokumentacija

API je dokumentiran s Swagger UI, dostopnim na `/docs`. Generira se avtomatsko iz Fastify JSON Schema definicij. Dostop je zaščiten z basic auth.

### Error handling

API sledi enotnemu formatu napak:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Obvezno polje 'stanje' manjka"
}
```

### Rate limiting

Dvonivojski rate limiting ščiti sistem pred zlorabo:

- **Globalni limit** (100 req/min): ščiti pred DoS napadi
- **Login limit** (3 req/min): ščiti pred brute-force napadi na gesla

### SonarCloud analiza kakovosti kode

Koda se avtomatsko analizira ob vsakem pushu/PR na `main` prek `sonar.yml` GitHub Actions workflow-a. SonarCloud analizira varnostne ranljivosti, code smells, pokritost s testi in podvajanje kode.

### Ročno testiranje

| Scenarij                                | Vloga  | Pričakovani izid                              |
| --------------------------------------- | ------ | --------------------------------------------- |
| Prijava z napačnim geslom (3×)          | Vsi    | HTTP 429 po 3. poskusu                        |
| Voznik dostopa do `/admin/vozniki`      | Voznik | HTTP 403 Forbidden                            |
| Uvoz veljavne DDD datoteke              | Admin  | Pravilno število uvoženih zapisov             |
| GDPR brisanje (DELETE /auth/me)         | Voznik | Anonimizacija PII v bazi                      |
| Zagon tahografa brez aktivnega stanja   | Voznik | HTTP 201, nov zapis                           |
| Zagon tahografa z aktivnim stanjem      | Voznik | HTTP 409 Conflict                             |
| Menjava stanja brez internetne povezave | Voznik | Shrani lokalno, timer teče                    |
| Vzpostavitev povezave po offline        | Voznik | Avtomatska sinhronizacija čakajočih zahtevkov |

---

## 16. Znane omejitve

- **Offline podpora je omejena na tahografska stanja** — mobilna aplikacija podpira offline beleženje tahografskih stanj prek lokalnega `AsyncStorage` casha z avtomatsko sinhronizacijo. Ročni vnos vožnje (`NovaVoznjaScreen`) zahteva aktivno internetno povezavo. Čakajoči zahtevki se izgubijo ob prisilnem zaprtju aplikacije pred sinhronizacijo.
- **Mock lokacije na dashboardu** — Leaflet karta na admin dashboardu prikazuje zadnje znane lokacije voznikov iz tahografskih zapisov, ki niso nujno v realnem času. Prava real-time sledenje bi zahtevalo WebSocket ali SSE integracijo.
- **Python subprocess overhead** — vsak uvoz excel datoteke zažene nov Python proces (~1-2s latency). Za produkcijo z veliko uvoži bi bila boljša rešitev Python Worker Service z message queue.
- **Refresh token brez rotacije** — trenutna implementacija ne rotira refresh tokenov ob vsaki uporabi, kar zmanjšuje varnost pri kraji tokena.
- **EMŠO šifrirni ključ v env** — ključ za AES-256-GCM je shranjen v okoljski spremenljivki, ne v namenski key management rešitvi (npr. HashiCorp Vault, AWS KMS).
- **Tehnični dolg v shemi** — polja `aktivnost`, `registerska`, `posadka`, `trajanje` so bila del originalnega `Voznja` modela in so bila odstranjena v refactoringu. Migracija je čista, ampak obstoječi podatki iz pred-migracijske faze nimajo `fk_vozilo` in `fk_stranka` vrednosti.

---

## 7. Diagrami aktivnosti

### Pregled vožnj

```mermaid
flowchart TD
    S([Začetek]) --> A[Uporabnik odpre /voznje]
    A --> B{Vloga?}
    B -->|1 Voznik| C[GET /voznje\nfiltrirano po ID-ju iz žetona]
    B -->|2 Admin / 3 Računovodja| D[GET /admin/voznje\nvsi vozniki]
    C --> E[Prikaži tabelo\nbrez stolpca voznik\nbrez uvoza DDD\nbrez izvoza]
    D --> F[Prikaži polno tabelo\nfilter po vozniku\nuvoz DDD in izvoz\nza Admin in Računovodjo]
    E --> EN([Konec])
    F --> EN
```

### Prijava

```mermaid
flowchart TD
    S([Začetek]) --> A[Uporabnik odpre /login]
    A --> B[Vnese e-pošto in geslo]
    B --> C[POST /auth/login]
    C --> D{Podatki veljavni?}
    D -->|Ne| E[Prikaži sporočilo o napaki]
    E --> B
    D -->|Da| F[Prejme JWT žeton in vlogo]
    F --> G[Shrani žeton in vlogo v localStorage]
    G --> H{Vloga?}
    H -->|1 Voznik| I[Preusmeri na /voznje]
    H -->|2 Admin| J[Preusmeri na /]
    H -->|3 Računovodja| K[Preusmeri na /]
    I --> EN([Konec])
    J --> EN
    K --> EN
```

### Offline tahograf beleženje

```mermaid
flowchart TD
    S([Začetek]) --> A[Voznik izbere novo stanje]
    A --> B[Shrani lokalno\ntahografCache.js]
    B --> C{Internetna\npovezava?}
    C -->|Da| D[POST /tahograf/zacni]
    D --> E{API uspešen?}
    E -->|Da| F[Posodobi lokalni cache\ns serverskim zapisom]
    E -->|Ne| G[Dodaj v čakajočo vrsto\ndodajCakajoci]
    C -->|Ne| G
    G --> H[Prikaži timer\niz lokalnega stanja]
    F --> H
    H --> I{Vzpostavitev\npovezave?}
    I -->|Da| J[useSinhronizacija hook]
    J --> K[Posreduj čakajoče\nzahtevke po vrsti]
    K --> L[Osveži podatke iz API]
    L --> EN([Konec])
    I -->|Ne| H
```

### Izvoz delovnega zapisa (Excel)

```mermaid
flowchart TD
    S([Začetek]) --> A[Admin/Računovodja izbere voznike in mesec]
    A --> B[Klikne Izvozi]
    B --> C[Prikaži nalagalni krog]
    C --> D[GET /voznjeMesec/export\nfk_uporabnik + od + do]
    D --> E[Poizvedba TahografZapis\nza izbrani mesec po vozniku]
    E --> F[Poizvedba TahografZapis\nzadnjih 16 tednov DELO/VOZNJA\nseštej trajanje_min]
    F --> G[Sestavi JSON niz izpis]
    G --> H[Zapiši JSON v začasno datoteko]
    H --> I[Zaženi json_to_delovni_zapis.py\ninput.json output.xlsx]
    I --> J{Python uspešen?}
    J -->|Ne| K[Vrni 500]
    K --> L[Prikaži opozorilo]
    L --> EN([Konec])
    J -->|Da| M[Preberi xlsx v medpomnilnik]
    M --> N[Izbriši začasne datoteke]
    N --> O[Pošlji xlsx z glavo\nContent-Disposition: attachment]
    O --> P[Brskalnik prenese datoteko]
    P --> Q[Skrij nalagalni krog]
    Q --> EN
```

---

## 17. Testiranje uporabniške izkušnje (SUS)

Uporabniška izkušnja sistema je bila ocenjena z uveljavljenim **SUS vprašalnikom** (System Usability Scale), ki je standardiziran instrument za merjenje zaznanega ravni uporabnosti programskih rešitev.

### Metodologija

- **Instrument:** System Usability Scale (Brooke, 1996) — 10 trditev, 5-stopenjska Likertova lestvica
- **Lestvica:** 1 = Sploh se ne strinjam → 5 = Popolnoma se strinjam
- **Vzorec:** N = 2
- **Datum izvedbe:** 5.06.2026
- **Ciljne vloge:** Voznik (mobilna app), Admin (spletna app)

### Vprašalnik — Mobilna aplikacija (Voznik)

| #   | Trditev                                                                         | 1 — Sploh se ne strinjam |  2  |  3  |  4  | 5 — Popolnoma se strinjam |
| --- | ------------------------------------------------------------------------------- | :----------------------: | :-: | :-: | :-: | :-----------------------: |
| 1   | Menim, da bi ta sistem rad pogosto uporabljal.                                  |            ☐             |  ☐  |  ☐  |  ☐  |             X             |
| 2   | Sistem se mi je zdel po nepotrebnem zapleten.                                   |            X             |  ☐  |  ☐  |  ☐  |             ☐             |
| 3   | Sistem se mi je zdel enostaven za uporabo.                                      |            ☐             |  ☐  |  ☐  |  ☐  |             X             |
| 4   | Menim, da bi za uporabo tega sistema potreboval pomoč tehnika.                  |            X             |  ☐  |  ☐  |  ☐  |             ☐             |
| 5   | Različne funkcije tega sistema so se mi zdele dobro povezane v smiselno celoto. |            ☐             |  ☐  |  ☐  |  ☐  |             X             |
| 6   | Sistem se mi je zdel preveč nekonsistenten.                                     |            X             |  ☐  |  ☐  |  ☐  |             ☐             |
| 7   | Menim, da bi se večina uporabnikov zelo hitro naučila uporabljati ta sistem.    |            ☐             |  ☐  |  ☐  |  ☐  |             X             |
| 8   | Sistem se mi je zdel neroden za uporabo.                                        |            X             |  ☐  |  ☐  |  ☐  |             ☐             |
| 9   | Pri uporabi sistema sem bil zelo suveren.                                       |            ☐             |  ☐  |  ☐  |  ☐  |             X             |
| 10  | Preden sem osvojil uporabo tega sistema, sem se moral naučiti veliko stvari.    |            X             |  ☐  |  ☐  |  ☐  |             ☐             |

### Vprašalnik — Spletna aplikacija (Admin)

| #   | Trditev                                                                         | 1 — Sploh se ne strinjam |  2  |  3  |  4  | 5 — Popolnoma se strinjam |
| --- | ------------------------------------------------------------------------------- | :----------------------: | :-: | :-: | :-: | :-----------------------: |
| 1   | Menim, da bi ta sistem rad pogosto uporabljal.                                  |            ☐             |  ☐  |  ☐  |  X  |             ☐             |
| 2   | Sistem se mi je zdel po nepotrebnem zapleten.                                   |            X             |  ☐  |  ☐  |  ☐  |             ☐             |
| 3   | Sistem se mi je zdel enostaven za uporabo.                                      |            ☐             |  ☐  |  ☐  |  ☐  |             X             |
| 4   | Menim, da bi za uporabo tega sistema potreboval pomoč tehnika.                  |            X             |  ☐  |  ☐  |  ☐  |             ☐             |
| 5   | Različne funkcije tega sistema so se mi zdele dobro povezane v smiselno celoto. |            ☐             |  ☐  |  ☐  |  X  |             ☐             |
| 6   | Sistem se mi je zdel preveč nekonsistenten.                                     |            ☐             |  X  |  ☐  |  ☐  |             ☐             |
| 7   | Menim, da bi se večina uporabnikov zelo hitro naučila uporabljati ta sistem.    |            ☐             |  ☐  |  ☐  |  X  |             ☐             |
| 8   | Sistem se mi je zdel neroden za uporabo.                                        |            X             |  ☐  |  ☐  |  ☐  |             ☐             |
| 9   | Pri uporabi sistema sem bil zelo suveren.                                       |            ☐             |  ☐  |  ☐  |  ☐  |             X             |
| 10  | Preden sem osvojil uporabo tega sistema, sem se moral naučiti veliko stvari.    |            X             |  ☐  |  ☐  |  ☐  |             ☐             |

### Izračun SUS ocene

SUS ocena se izračuna po standardni formuli:

- Za **lihe trditve** (1, 3, 5, 7, 9): prispevek = izbrana vrednost − 1
- Za **sode trditve** (2, 4, 6, 8, 10): prispevek = 5 − izbrana vrednost
- **SUS ocena** = vsota vseh prispevkov × 2,5 (rezultat je med 0 in 100)

| Ocena SUS | Razred | Interpretacija               |
| --------- | ------ | ---------------------------- |
| ≥ 85      | A+     | Odlično — vzorčna uporabnost |
| 72 – 84   | B      | Dobro — nad povprečjem       |
| 52 – 71   | C      | Sprejemljivo — povprečje     |
| 38 – 51   | D      | Slabo — pod povprečjem       |
| < 38      | F      | Neustrezno                   |

### Rezultati

| Metrika                  | Vrednost                        |
| ------------------------ | ------------------------------- |
| Število udeležencev      | 2                               |
| Mobilna aplikacija       | 100,0 / 100 — Razred A+         |
| Spletna aplikacija       | 90,0 / 100 — Razred A+          |
| Povprečna SUS ocena      | 95,0                            |
| Razred uporabnosti       | A+                              |

> Povprečna SUS ocena 95,0 uvršča sistem v razred A+ (odlično — vzorčna uporabnost). Mobilna aplikacija je prejela maksimalno oceno 100,0, kar odraža intuitivno zasnovo tahografskega modula in enostavnost vnosa voženj. Spletni administrativni vmesnik je dosegel oceno 90,0 — rahlo nižjo zaradi večje funkcionalne kompleksnosti, zaradi administrativnih orodji.


---

## 18. Možne nadgradnje v prihodnosti

V sklopu projekta smo s stranko (Sirena d.o.o.) identificirali več potencialnih razširitev sistema, ki bi dodatno povečale njegovo vrednost v poslovnem okolju.

- **Neposredno branje DDD datotek** — Implementacija lastnega parserja za binarni EU Digital Tachograph format je bila preučena, vendar se je izkazala kot izjemno zahtevna zaradi stroge zakonodajske regulacije formata ( in odsotnosti odprtokodnih knjižnic z zadostno pokritostjo formatov. Funkcionalnost ostaja odprta za prihodnje iteracije.
- **Generiranje računov** — Avtomatsko generiranje računov na podlagi opravljenih prevozov in dogovorjenih cen s strankami, z izvozom v PDF format.
- **Modul za upravljanje avtodelavnice** — Dodaten odsek za beleženje servisnih posegov, tehničnih pregledov, sledenje inventarja in materialov za avtodelavnico