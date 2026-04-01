# Immo Manager

Immobilien Management System — gebaut mit Next.js, tRPC, Drizzle ORM, PostgreSQL, Nodemailer und node-cron.

## Voraussetzungen

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 10
- [Docker](https://www.docker.com/) (für PostgreSQL)

## Installation

```bash
# Projekt klonen
git clone https://github.com/Joelabc123/immo-manager.git
cd immo-manager

# Automatisches Setup (installiert Dependencies, startet DB, generiert Migrationen)
make setup

# Oder manuell:
cp .env.example .env        # Umgebungsvariablen anpassen
make install                 # Dependencies installieren
make up                      # PostgreSQL starten
make db-generate             # Migrationen generieren
make db-push                 # Schema auf DB anwenden
```

## Entwicklung

```bash
make dev          # Startet PostgreSQL + Next.js Dev-Server (mit Hot-Reload)
```

Die Applikation ist dann erreichbar unter: [http://localhost:3000](http://localhost:3000)

## Projektstruktur

```
src/
├── app/                    # Next.js App Router
│   ├── api/trpc/[trpc]/    # tRPC API Handler
│   ├── providers.tsx       # React Query + tRPC Provider
│   ├── layout.tsx          # Root Layout
│   └── page.tsx            # Startseite
├── components/ui/          # UI-Komponenten (shadcn)
├── db/                     # Datenbank (Drizzle ORM)
│   ├── schema/             # Tabellen-Definitionen
│   └── migrations/         # Generierte Migrationen
├── lib/
│   ├── trpc.ts             # tRPC Client Hooks
│   └── utils.ts            # Hilfsfunktionen
└── server/
    ├── trpc.ts             # tRPC Initialisierung & Procedure Builder
    ├── routers/            # tRPC Router
    │   └── _app.ts         # Root Router
    ├── cron/               # Cron-Job Infrastruktur
    │   └── index.ts        # Job-Registry & Scheduler
    └── mail/               # E-Mail Infrastruktur
        └── index.ts        # Nodemailer Transporter & Hilfsfunktionen
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
| `make db-studio`    | Drizzle Studio öffnen (Datenbank-GUI)            |
| `make db-reset`     | Datenbank zurücksetzen (löscht alle Daten!)      |
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