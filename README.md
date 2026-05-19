# Immo Manager

Immobilien-Management-System — gebaut als pnpm-Monorepo mit Next.js 16, tRPC v11, Drizzle ORM, PostgreSQL 17, Redis 7, WebSocket-Service, IMAP-E-Mail-Sync und Google Gemini AI.

## Features

- **Immobilien & Mieteinheiten** — Verwaltung von Objekten, Einheiten, Mietern, Mietzahlungen und wiederkehrenden Ausgaben
- **Mahnwesen (Dunning)** — Forderungen, Mahnstufen, Mahnvorlagen, PDF-Generierung und Archivierung
- **E-Mail-Client** — Bidirektionale E-Mail-Verwaltung (IMAP-Sync + SMTP-Versand) mit Tiptap-Editor, Vorlagen und Verfassen
- **KI-Assistent** — Google Gemini: Aufgaben aus E-Mails generieren, Antworten entwerfen, E-Mail-Entwürfe verbessern
- **Aufgaben** — Aufgabenverwaltung mit Aktionszentrum und Regeln
- **Finanzanalyse** — Cashflow, Amortisation, Sondertilgung, Refinanzierung, Stresstest, Ausstiegsstrategie, Vermögensprognose, Gesundheits-Score
- **Dokumente** — Dokumentenverwaltung mit Upload und Share-Links
- **Dashboard** — Konfigurierbare Widgets und Presets
- **Benachrichtigungen** — Web-Push-Benachrichtigungen (VAPID)
- **Audit-Trail** — Vollständige Änderungshistorie aller relevanten Aktionen
- **Internationalisierung** — Deutsch / Englisch (next-intl)
- **Admin-Bereich** — Benutzerverwaltung und Systemkonfiguration

## Voraussetzungen

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 10
- [Docker](https://www.docker.com/) (für PostgreSQL, Redis, Mailpit)

## Schnellstart

```bash
# 1. Projekt klonen
git clone https://github.com/Joelabc123/immo-manager.git
cd immo-manager

# 2. Umgebungsvariablen setzen
cp .env.example .env
# .env anpassen (JWT-Secrets, GEMINI_API_KEY, VAPID-Keys, ...)

# 3. Dependencies installieren
pnpm install

# 4. Infrastruktur starten (PostgreSQL + Redis + Mailpit)
docker compose -f docker-compose.dev.yml up -d

# 5. Datenbank-Schema anwenden
pnpm --filter @repo/shared db:push

# 6. Demodaten laden
pnpm --filter @repo/shared db:seed

# 7. Dev-Server starten
pnpm --filter @repo/nextjs dev
```

Die Applikation ist dann erreichbar unter: [http://localhost:3000](http://localhost:3000)  
Mailpit (lokales SMTP-Testpostfach): [http://localhost:8025](http://localhost:8025)

## Demo-Login

Nach `db:seed` steht folgender Demo-User zur Verfügung:

| Feld     | Wert                   |
| -------- | ---------------------- |
| E-Mail   | `demo@immo-manager.de` |
| Passwort | `Demo12345!`           |

Das Passwort erfüllt die Passwort-Policy (mindestens 10 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen).

Der Demo-User "Max Mustermann" wird mit dem Seed erstellt und enthält:

- 4 Immobilien (Berlin, München, Hamburg, Frankfurt)
- 4 Kredite bei verschiedenen Banken
- 8 Mieteinheiten
- 7 Mieter mit Kontaktdaten
- 5 wiederkehrende Ausgaben
- 21 Mietzahlungen (letzte 3 Monate)

## Windows-Hinweis

Das `Makefile` nutzt `/bin/zsh` und funktioniert nur auf Linux/macOS. Unter Windows die Befehle direkt mit `pnpm` ausführen:

```powershell
# Statt "make dev":
docker compose -f docker-compose.dev.yml up -d
pnpm --filter @repo/nextjs dev

# Statt "make type-check":
pnpm -r type-check

# Statt "make lint":
pnpm -r lint

# Statt "make build":
pnpm --filter @repo/nextjs build

# Statt "make db-generate":
pnpm --filter @repo/shared db:generate

# Statt "make db-push":
pnpm --filter @repo/shared db:push

# Statt "make db-seed":
pnpm --filter @repo/shared db:seed

# Statt "make db-studio":
pnpm --filter @repo/shared db:studio
```

## Datenbank zurücksetzen

Um die Datenbank komplett zurückzusetzen und neu zu seeden:

```bash
# Container stoppen und Volumes löschen
docker compose -f docker-compose.dev.yml down -v

# Neu starten
docker compose -f docker-compose.dev.yml up -d

# Schema anwenden + seeden
pnpm --filter @repo/shared db:push
pnpm --filter @repo/shared db:seed
```

## Projektstruktur

```
immo-manager/
├── apps/
│   ├── nextjs/                    # Next.js 16 Frontend + API
│   │   ├── src/
│   │   │   ├── app/               # App Router (Pages)
│   │   │   │   ├── (admin)/       # Admin-Bereich (Benutzerverwaltung)
│   │   │   │   ├── (app)/         # Authentifizierte Seiten
│   │   │   │   │   ├── analysis/  # Finanzanalyse
│   │   │   │   │   ├── audit/     # Audit-Trail
│   │   │   │   │   ├── dashboard/ # Dashboard mit Widgets
│   │   │   │   │   ├── documents/ # Dokumentenverwaltung
│   │   │   │   │   ├── mail/      # E-Mail-Client + Compose
│   │   │   │   │   ├── properties/# Immobilien & Einheiten
│   │   │   │   │   ├── settings/  # Einstellungen
│   │   │   │   │   ├── tasks/     # Aufgabenverwaltung
│   │   │   │   │   └── tenants/   # Mieter
│   │   │   │   ├── (auth)/        # Login / Register / Password-Flows
│   │   │   │   ├── api/           # tRPC + Upload API Routes
│   │   │   │   ├── offline/       # Offline-Seite (PWA)
│   │   │   │   └── share/         # Öffentliche Share-Links
│   │   │   ├── components/        # React-Komponenten
│   │   │   │   ├── ui/            # shadcn/ui Basis-Komponenten (Base UI)
│   │   │   │   ├── ai/            # KI-Hilfskomponenten (GenerateButton)
│   │   │   │   ├── analysis/      # Finanzanalyse-Charts & Rechner
│   │   │   │   ├── audit/         # Audit-Trail-Komponenten
│   │   │   │   ├── auth/          # Auth-Shell & Illustration
│   │   │   │   ├── dashboard/     # Dashboard-Widgets
│   │   │   │   ├── data-table/    # Generische DataTable-Komponente
│   │   │   │   ├── documents/     # Dokumenten-Upload & -Liste
│   │   │   │   ├── mail/          # E-Mail-Client (Tiptap-Editor)
│   │   │   │   ├── notifications/ # Push-Benachrichtigungen
│   │   │   │   ├── properties/    # Immobilien-Komponenten
│   │   │   │   ├── settings/      # Einstellungen
│   │   │   │   ├── tasks/         # Aufgaben & Aktionszentrum
│   │   │   │   └── tenants/       # Mieter + Mahnwesen (Dunning)
│   │   │   ├── server/            # Server-seitiger Code
│   │   │   │   ├── routers/       # tRPC Router
│   │   │   │   ├── services/      # Business-Logik (inkl. AI, Dunning)
│   │   │   │   ├── auth/          # Authentifizierung (JWT, Sessions)
│   │   │   │   ├── cron/          # Cron-Jobs (node-cron)
│   │   │   │   └── mail/          # Nodemailer Konfiguration
│   │   │   ├── lib/               # Client Utilities
│   │   │   └── i18n/              # Internationalisierung (DE/EN)
│   │   ├── messages/              # Übersetzungsdateien (de.json, en.json)
│   │   └── public/                # Statische Assets, PWA-Icons, sw.js
│   ├── email/                     # IMAP-E-Mail-Sync-Service (node-cron)
│   └── websocket/                 # WebSocket-Server (ws, JWT-Auth)
├── packages/
│   └── shared/                    # Geteilte Logik (@repo/shared)
│       └── src/
│           ├── db/                # Drizzle ORM Schema + Migrationen
│           │   └── schema/        # Tabellen-Definitionen (28 Tabellen)
│           ├── calculations/      # Finanzberechnungen
│           │   ├── amortization   # Tilgungsplan
│           │   ├── cashflow       # Cashflow-Analyse
│           │   ├── dunning        # Mahnlogik + dt. Geschäftstage
│           │   ├── exit-strategy  # Ausstiegsstrategie
│           │   ├── health-score   # Portfolio-Gesundheits-Score
│           │   ├── refinancing    # Refinanzierungsrechner
│           │   ├── special-repayment # Sondertilgung
│           │   ├── stress-test    # Stresstest
│           │   └── wealth-forecast# Vermögensprognose
│           ├── types/             # Geteilte TypeScript-Typen
│           ├── validation/        # Zod-Schemas
│           └── utils/             # Hilfsfunktionen
├── _docs/                         # Projekt-Dokumentation
│   ├── api/                       # API-Dokumentation
│   ├── architecture/              # Architektur-Entscheidungen
│   ├── hand-offs/                 # Feature-Hand-offs
│   └── use-cases/                 # Use-Cases
├── docker-compose.dev.yml         # Dev-Infrastruktur (PostgreSQL, Redis, Mailpit)
├── docker-compose.yml             # Produktions-Stack
├── Dockerfile                     # Multi-Stage Build
└── Makefile                       # Entwicklungs-Befehle (Linux/macOS)
```

## tRPC Router-Übersicht

| Router               | Beschreibung                                          |
| -------------------- | ----------------------------------------------------- |
| `ai`                 | Gemini AI (Aufgaben generieren, Antworten/Entwürfe)   |
| `analysis`           | Finanzanalyse-Berechnungen                            |
| `audit`              | Audit-Trail-Abfragen                                  |
| `auth`               | Authentifizierung (Login, Register, Passwort-Reset)   |
| `dashboard`          | Dashboard-Daten + `dashboard-presets`                 |
| `documents`          | Dokument-Upload und -Verwaltung                       |
| `dunning`            | Mahnwesen (Records, Claims, Settings, Templates)      |
| `email`              | E-Mail-Konten, IMAP-Ordner, Senden                    |
| `expenses`           | Wiederkehrende Ausgaben                               |
| `loans`              | Kredite + Tilgungspläne                               |
| `market-data`        | Marktdaten                                            |
| `notifications`      | Web-Push-Abonnements                                  |
| `properties`         | Immobilien-CRUD                                       |
| `rent-adjustments`   | Mietanpassungen                                       |
| `rent-payments`      | Mietzahlungen                                         |
| `rental-units`       | Mieteinheiten                                         |
| `scenarios`          | Finanz-Szenarien                                      |
| `sessions`           | Session-Verwaltung (Refresh-Token-Liste)              |
| `share-links`        | Öffentliche Share-Links für Dokumente                 |
| `tags`               | Tags für Mieter/Objekte                               |
| `tasks`              | Aufgaben + Aktionszentrum                             |
| `tenants`            | Mieter-CRUD + E-Mail-Empfänger-Lookup                 |
| `user-settings`      | Nutzer-Einstellungen                                  |
| `admin`              | Benutzerverwaltung (Admin-only)                       |

## Make-Befehle

| Befehl              | Beschreibung                                     |
| ------------------- | ------------------------------------------------ |
| `make help`         | Alle verfügbaren Befehle anzeigen                |
| `make setup`        | Initiales Projekt-Setup (einmalig ausführen)     |
| `make install`      | Dependencies installieren                        |
| **Entwicklung**     |                                                  |
| `make dev`          | Dev-Server starten (Infrastruktur + Next.js)     |
| `make up`           | Infrastruktur-Container starten                  |
| `make down`         | Infrastruktur-Container stoppen                  |
| `make logs`         | Infrastruktur-Logs anzeigen                      |
| **Datenbank**       |                                                  |
| `make db-generate`  | Drizzle Migrationen generieren                   |
| `make db-push`      | Schema direkt auf DB anwenden (nur Dev)          |
| `make db-migrate`   | Ausstehende Migrationen ausführen                |
| `make db-studio`    | Drizzle Studio öffnen (Datenbank-GUI)            |
| `make db-reset`     | Datenbank zurücksetzen (löscht alle Daten!)      |
| `make db-seed`      | Datenbank mit Demodaten befüllen                 |
| **Code-Qualität**   |                                                  |
| `make type-check`   | TypeScript Type Checking                         |
| `make lint`         | ESLint ausführen                                 |
| `make lint-fix`     | ESLint mit Auto-Fix                              |
| `make format`       | Code mit Prettier formatieren                    |
| `make format-check` | Formatierung prüfen                              |
| `make check`        | Alle Checks ausführen (type-check, lint, format) |
| **Build**           |                                                  |
| `make build`        | Applikation für Produktion bauen                 |
| **Produktion**      |                                                  |
| `make prod-up`      | Produktions-Stack starten (Docker)               |
| `make prod-down`    | Produktions-Stack stoppen                        |
| `make prod-logs`    | Produktions-Logs anzeigen                        |
| `make prod-ps`      | Container-Status anzeigen                        |
| `make prod-restart` | Produktions-Stack neustarten                     |
| `make prod-reset`   | Produktions-Daten zurücksetzen                   |
| **Aufräumen**       |                                                  |
| `make clean`        | Build-Artefakte und Dependencies löschen         |
| `make clean-all`    | Alles inkl. Docker-Volumes löschen               |

## Umgebungsvariablen

Siehe [.env.example](.env.example) für alle verfügbaren Variablen:

| Variable                       | Beschreibung                                        | Standard                                                     |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`                 | PostgreSQL Connection String                        | `postgresql://postgres:postgres@localhost:5432/immo_manager` |
| `REDIS_URL`                    | Redis Connection String                             | `redis://localhost:6379`                                     |
| `NEXT_PUBLIC_APP_URL`          | Öffentliche URL der Applikation                     | `http://localhost:3000`                                      |
| `WS_PORT`                      | WebSocket-Server Port                               | `3002`                                                       |
| `NEXT_PUBLIC_WS_URL`           | WebSocket-URL (Client-seitig)                       | `ws://localhost:3002`                                        |
| `ADMIN_EMAIL`                  | E-Mail, die automatisch Admin-Rechte erhält         | `admin@example.com`                                          |
| `JWT_ACCESS_SECRET`            | Secret für Access-Tokens (min. 32 Zeichen)          | —                                                            |
| `JWT_REFRESH_SECRET`           | Secret für Refresh-Tokens (min. 32 Zeichen)         | —                                                            |
| `SMTP_HOST`                    | SMTP Server Host                                    | —                                                            |
| `SMTP_PORT`                    | SMTP Server Port                                    | `587`                                                        |
| `SMTP_SECURE`                  | TLS verwenden                                       | `false`                                                      |
| `SMTP_USER`                    | SMTP Benutzername                                   | —                                                            |
| `SMTP_PASS`                    | SMTP Passwort                                       | —                                                            |
| `SMTP_FROM`                    | Absender-Adresse                                    | Wert von `SMTP_USER`                                         |
| `EMAIL_ENCRYPTION_KEY`         | AES-Schlüssel für IMAP-Passwort-Verschlüsselung     | —                                                            |
| `VAPID_PUBLIC_KEY`             | VAPID Public Key für Web-Push                       | —                                                            |
| `VAPID_PRIVATE_KEY`            | VAPID Private Key für Web-Push                      | —                                                            |
| `VAPID_SUBJECT`                | Kontakt-URI für Web-Push                            | `mailto:admin@immo-manager.local`                            |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID Public Key (Client-seitig, gleich wie oben)   | —                                                            |
| `GEMINI_API_KEY`               | Google Gemini API-Key (aistudio.google.com/apikey)  | —                                                            |
| `AI_DAILY_LIMIT_PER_USER`      | Max. KI-Anfragen pro User pro Tag                   | `50`                                                         |

VAPID-Keys generieren:

```bash
npx web-push generate-vapid-keys
```

JWT-Secrets generieren:

```bash
openssl rand -base64 48
```

## Authentifizierung

- JWT-basierte Session mit Access- (15 min) und Refresh-Token (30 Tage).
- Refresh-Token-Rotation mit Reuse-Detection (kompromittierter Token → alle Sessions gelöscht).
- CSRF-Schutz via Double-Submit-Cookie.
- E-Mail-Verifizierung beim Signup (außer für die in `ADMIN_EMAIL` hinterlegte Adresse).
- Passwort-Policy: min. 10 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen.
- "Angemeldet bleiben" auf `/login` steuert, ob das Refresh-Cookie persistent (30 Tage) oder als Session-Cookie gesetzt wird.

## Tech-Stack

| Bereich            | Technologie                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Framework          | [Next.js](https://nextjs.org/) 16 (App Router) + React 19                                   |
| API                | [tRPC](https://trpc.io/) v11                                                                 |
| Datenbank          | [PostgreSQL](https://www.postgresql.org/) 17 + [Drizzle ORM](https://orm.drizzle.team/)     |
| Cache / Realtime   | [Redis](https://redis.io/) 7 + [WebSocket](https://github.com/websockets/ws) (ws)           |
| Validierung        | [Zod](https://zod.dev/) v4                                                                   |
| Styling            | [Tailwind CSS](https://tailwindcss.com/) v4 + [Base UI](https://base-ui.com/) (shadcn/ui)   |
| Rich Text          | [Tiptap](https://tiptap.dev/) v3                                                             |
| E-Mail (Outbound)  | [Nodemailer](https://nodemailer.com/)                                                        |
| E-Mail (Inbound)   | [ImapFlow](https://imapflow.com/) + IMAP-Sync-Service                                       |
| KI                 | [Google Gemini](https://ai.google.dev/) (gemini-2.5-flash) via `@google/genai`              |
| PDF                | [@react-pdf/renderer](https://react-pdf.org/)                                                |
| Cron-Jobs          | [node-cron](https://github.com/node-cron/node-cron)                                         |
| State Management   | [TanStack React Query](https://tanstack.com/query)                                           |
| Auth               | Argon2id Passwort-Hashing + JWT via `jose`                                                   |
| Push               | Web Push API (VAPID) via `web-push`                                                          |
| Animationen        | [Framer Motion](https://www.framer.com/motion/)                                              |
| Karten             | [Leaflet](https://leafletjs.com/)                                                            |
| i18n               | [next-intl](https://next-intl.dev/) (DE / EN)                                               |
| Tests              | [Vitest](https://vitest.dev/) (`packages/shared`)                                            |
