# Immo Manager

Immobilien Management System — gebaut mit Next.js, tRPC, Drizzle ORM, PostgreSQL, Nodemailer und node-cron.

## Voraussetzungen

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 10
- [Docker](https://www.docker.com/) (fuer PostgreSQL)

## Schnellstart

```bash
# 1. Projekt klonen
git clone https://github.com/Joelabc123/immo-manager.git
cd immo-manager

# 2. Umgebungsvariablen setzen
cp .env.example .env

# 3. Dependencies installieren
pnpm install

# 4. PostgreSQL starten (Docker)
docker compose -f docker-compose.dev.yml up -d

# 5. Datenbank-Schema anwenden
pnpm --filter @repo/shared db:push

# 6. Demodaten laden
pnpm --filter @repo/shared db:seed

# 7. Dev-Server starten
pnpm --filter @repo/nextjs dev
```

Die Applikation ist dann erreichbar unter: [http://localhost:3000](http://localhost:3000)

## Demo-Login

| Feld     | Wert                       |
| -------- | -------------------------- |
| E-Mail   | `demo@immo-manager.de`     |
| Passwort | `demo1234`                 |

Der Demo-User "Max Mustermann" wird mit dem Seed erstellt und enthaelt:
- 4 Immobilien (Berlin, Muenchen, Hamburg, Frankfurt)
- 4 Kredite bei verschiedenen Banken
- 8 Mieteinheiten
- 7 Mieter mit Kontaktdaten
- 5 wiederkehrende Ausgaben
- 21 Mietzahlungen (letzte 3 Monate)

## Windows-Hinweis

Das `Makefile` nutzt `/bin/zsh` und funktioniert nur auf Linux/macOS. Unter Windows die Befehle direkt mit `pnpm` ausfuehren:

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

# Statt "make db-push":
pnpm --filter @repo/shared db:push

# Statt "make db-seed":
pnpm --filter @repo/shared db:seed

# Statt "make db-studio":
pnpm --filter @repo/shared db:studio
```

## Datenbank zuruecksetzen

Um die Datenbank komplett zurueckzusetzen und neu zu seeden:

```bash
# Container stoppen und Volume loeschen
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
│   ├── nextjs/                 # Next.js 16 Frontend + API
│   │   ├── src/
│   │   │   ├── app/            # App Router (Pages)
│   │   │   │   ├── (app)/      # Authentifizierte Seiten
│   │   │   │   ├── (auth)/     # Login / Register
│   │   │   │   └── api/        # tRPC + Upload API Routes
│   │   │   ├── components/     # React-Komponenten
│   │   │   │   ├── ui/         # shadcn/ui Basis-Komponenten
│   │   │   │   ├── properties/ # Immobilien-Komponenten
│   │   │   │   ├── tenants/    # Mieter-Komponenten
│   │   │   │   ├── dashboard/  # Dashboard-Widgets
│   │   │   │   ├── analysis/   # Analyse-Tools
│   │   │   │   ├── documents/  # Dokumentenverwaltung
│   │   │   │   ├── mail/       # E-Mail Client
│   │   │   │   ├── settings/   # Einstellungen
│   │   │   │   └── audit/      # Audit-Trail
│   │   │   ├── server/         # Server-seitiger Code
│   │   │   │   ├── routers/    # tRPC Router (21 Dateien)
│   │   │   │   ├── services/   # Business-Logik
│   │   │   │   ├── auth/       # Authentifizierung
│   │   │   │   ├── cron/       # Cron-Jobs
│   │   │   │   └── mail/       # Nodemailer Konfiguration
│   │   │   ├── lib/            # Client Utilities
│   │   │   └── i18n/           # Internationalisierung (DE/EN)
│   │   └── messages/           # Uebersetzungsdateien
│   └── websocket/              # WebSocket-Server
├── packages/
│   └── shared/                 # Geteilte Logik
│       └── src/
│           ├── db/             # Drizzle ORM Schema + Migrationen
│           │   └── schema/     # 24 Tabellen-Definitionen
│           ├── calculations/   # Finanzberechnungen
│           ├── types/          # Geteilte TypeScript-Typen
│           ├── validation/     # Zod-Schemas
│           └── utils/          # Hilfsfunktionen
├── docker-compose.dev.yml      # Dev-Infrastruktur (PostgreSQL)
├── docker-compose.yml          # Produktions-Stack
├── Dockerfile                  # Multi-Stage Build
└── Makefile                    # Entwicklungs-Befehle (Linux/macOS)
```

## Make-Befehle

| Befehl              | Beschreibung                                     |
| ------------------- | ------------------------------------------------ |
| `make help`         | Alle verfügbaren Befehle anzeigen                |
| `make setup`        | Initiales Projekt-Setup (einmalig ausführen)     |
| `make install`      | Dependencies installieren                        |
| **Entwicklung**     |                                                  |
| `make dev`          | Dev-Server starten (PostgreSQL + Next.js)        |
| `make up`           | PostgreSQL Container starten                     |
| `make down`         | PostgreSQL Container stoppen                     |
| `make logs`         | Infrastruktur-Logs anzeigen                      |
| **Datenbank**       |                                                  |
| `make db-generate`  | Drizzle Migrationen generieren                   |
| `make db-push`      | Schema direkt auf DB anwenden (nur Dev)          |
| `make db-migrate`   | Ausstehende Migrationen ausführen                |
| `make db-studio`    | Drizzle Studio oeffnen (Datenbank-GUI)            |
| `make db-reset`     | Datenbank zuruecksetzen (loescht alle Daten!)      |
| `make db-seed`      | Datenbank mit Demodaten befuellen                  |
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

| Variable              | Beschreibung                    | Standard                                                     |
| --------------------- | ------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`        | PostgreSQL Connection String    | `postgresql://postgres:postgres@localhost:5432/immo_manager` |
| `NEXT_PUBLIC_APP_URL` | Öffentliche URL der Applikation | `http://localhost:3000`                                      |
| `SMTP_HOST`           | SMTP Server Host                | —                                                            |
| `SMTP_PORT`           | SMTP Server Port                | `587`                                                        |
| `SMTP_SECURE`         | TLS verwenden                   | `false`                                                      |
| `SMTP_USER`           | SMTP Benutzername               | —                                                            |
| `SMTP_PASS`           | SMTP Passwort                   | —                                                            |
| `SMTP_FROM`           | Absender-Adresse                | Wert von `SMTP_USER`                                         |

## Tech-Stack

- **Framework:** [Next.js](https://nextjs.org/) 16 (App Router)
- **API:** [tRPC](https://trpc.io/) v11
- **Datenbank:** [PostgreSQL](https://www.postgresql.org/) 17 + [Drizzle ORM](https://orm.drizzle.team/)
- **Validierung:** [Zod](https://zod.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) v4 + [shadcn/ui](https://ui.shadcn.com/)
- **E-Mail:** [Nodemailer](https://nodemailer.com/)
- **Cron-Jobs:** [node-cron](https://github.com/node-cron/node-cron)
- **State Management:** [TanStack React Query](https://tanstack.com/query)
