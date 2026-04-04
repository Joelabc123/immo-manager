# Non-Functional Requirements - Immo Manager

> Erstellt: 2026-04-03 | Status: Draft

---

## NFR-1: Architektur

| ID      | Anforderung                                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1.1 | **Monorepo-Struktur** gemaess copilot-instructions.md mit isolierten Services: shared, websocket, nextjs, redis, code-executor, email. |
| NFR-1.2 | **Self-Hosted Deployment** auf eigenem Server via Docker Compose. Kein Vercel, kein Cloud-Provider.                                    |
| NFR-1.3 | **Standalone Next.js Build** (`output: "standalone"`) fuer containerisierte Deployments.                                               |
| NFR-1.4 | **WebSocket-Support** fuer Real-Time Updates (neue E-Mails, Dashboard-Refresh, Benachrichtigungen).                                    |
| NFR-1.5 | **Cron-Jobs im Next.js-Prozess** (kein separater Worker Service). E-Mail-Sync alle 15 Min, Leerstand-Check taeglich.                   |
| NFR-1.6 | **PWA-Ready** Architektur. Service Worker, Manifest, Offline-Faehigkeit als spaeteres Feature eingeplant.                              |

---

## NFR-2: Performance

| ID      | Anforderung                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| NFR-2.1 | Dashboard-Ladezeit < 2 Sekunden bei bis zu 50 Immobilien.                                                                    |
| NFR-2.2 | Analyse-Slider-Berechnungen MUESSEN clientseitig in < 100ms aktualisiert werden (keine Server-Roundtrips fuer Simulationen). |
| NFR-2.3 | Karten-Rendering mit Marker-Clustering MUSS bei 100+ Objekten fluessig bleiben.                                              |
| NFR-2.4 | E-Mail-Sync DARF den Hauptprozess nicht blockieren (async/non-blocking).                                                     |
| NFR-2.5 | DB-Queries MUESSEN ueber sinnvolle Indizes optimiert sein (user_id, property_id, tenant_id, email FK-Spalten).               |
| NFR-2.6 | Monetaere Werte werden als Integer (Cents) gespeichert, um Gleitkomma-Fehler zu vermeiden.                                   |

---

## NFR-3: Sicherheit

| ID      | Anforderung                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-3.1 | Passwoerter gehasht mit bcrypt oder argon2 (min. Cost-Factor 12).                                                                    |
| NFR-3.2 | IMAP/SMTP-Credentials verschluesselt in der DB (AES-256-GCM, Schluessel aus Env-Variable).                                           |
| NFR-3.3 | Alle API-Endpunkte (tRPC Procedures) MUESSEN authentifiziert sein (ausser Login/Register).                                           |
| NFR-3.4 | Row-Level Security: Nutzer duerfen NUR auf eigene Daten zugreifen (user_id Filter in jeder Query).                                   |
| NFR-3.5 | CSRF-Schutz fuer alle Mutationen.                                                                                                    |
| NFR-3.6 | Input-Validierung mit Zod auf ALLEN Eingaben (Server-seitig).                                                                        |
| NFR-3.7 | Sharing-Links: Kryptographisch sichere Tokens (min. 32 Bytes, URL-safe Base64).                                                      |
| NFR-3.8 | File-Upload: MIME-Type Validierung + Groessen-Limit (25 MB). Kein Executable-Upload.                                                 |
| NFR-3.9 | OWASP Top 10 Konformitaet: SQL-Injection (Drizzle ORM parametrisiert), XSS (React escaping + CSP), SSRF (Validierung externer URLs). |

---

## NFR-4: Zuverlaessigkeit

| ID      | Anforderung                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------- |
| NFR-4.1 | Docker Healthchecks fuer PostgreSQL und App-Container.                                                         |
| NFR-4.2 | `restart: unless-stopped` fuer alle Production-Container.                                                      |
| NFR-4.3 | DB-Migrations via Drizzle (`db:generate` + `db:migrate`) mit Migrations-Journal. Kein `db:push` in Production. |
| NFR-4.4 | Graceful Shutdown: Cron-Jobs und DB-Connections MUESSEN sauber beendet werden.                                 |

---

## NFR-5: Logging & Monitoring

| ID      | Anforderung                                                            |
| ------- | ---------------------------------------------------------------------- |
| NFR-5.1 | **Pino** als strukturierter JSON-Logger fuer alle Server-Side Logs.    |
| NFR-5.2 | **Sentry** (Free Tier) fuer Error-Tracking und Performance-Monitoring. |
| NFR-5.3 | Log-Levels: error, warn, info, debug. Production Default: info.        |
| NFR-5.4 | Cron-Job Ausfuehrungen MUESSEN geloggt werden (Start, Erfolg, Fehler). |

---

## NFR-6: Testing

| ID      | Anforderung                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-6.1 | **Unit Tests** (Vitest) fuer Kernlogik und Algorithmen: Cashflow, DSCR, Break-Even, Tilgungsplan, Sondertilgung, Exit-Erloes, Health Score. |
| NFR-6.2 | Keine E2E-Tests in der ersten Phase.                                                                                                        |
| NFR-6.3 | Test-Coverage fuer Berechnungsmodule: mind. 90%.                                                                                            |

---

## NFR-7: CI/CD

| ID      | Anforderung                                                                         |
| ------- | ----------------------------------------------------------------------------------- |
| NFR-7.1 | **GitHub Actions** Pipeline mit: type-check, lint, format-check, unit tests, build. |
| NFR-7.2 | Pipeline MUSS bei jedem Push und Pull Request laufen.                               |
| NFR-7.3 | Build-Artefakt: Docker Image (optional: Push zu Container Registry).                |

---

## NFR-8: Internationalisierung (i18n)

| ID      | Anforderung                                                                 |
| ------- | --------------------------------------------------------------------------- |
| NFR-8.1 | Zwei Sprachen: Deutsch (Default) + Englisch.                                |
| NFR-8.2 | Sprachumschaltung im Einstellungen-Tab (instant, ohne Reload).              |
| NFR-8.3 | Alle UI-Texte, Labels, Tooltips, Fehlermeldungen MUESSEN uebersetzbar sein. |
| NFR-8.4 | Datums- und Zahlenformatierung abhaengig von Locale.                        |
| NFR-8.5 | Waehrungsformatierung abhaengig von Benutzer-Einstellung (EUR/USD/CHF).     |

---

## NFR-9: Responsive Design

| ID      | Anforderung                                                             |
| ------- | ----------------------------------------------------------------------- |
| NFR-9.1 | Mobile-First Design. Alle Views MUESSEN auf 360px Breite nutzbar sein.  |
| NFR-9.2 | Breakpoints: Mobile (< 768px), Tablet (768-1024px), Desktop (> 1024px). |
| NFR-9.3 | Charts MUESSEN responsive sein und sich an Container-Groesse anpassen.  |
| NFR-9.4 | Karte MUSS Touch-Gesten unterstuetzen (Pinch-to-Zoom, Drag).            |
| NFR-9.5 | Navigation: Bottom-Tab-Bar auf Mobile, Sidebar auf Desktop.             |

---

## NFR-10: Code-Qualitaet

| ID       | Anforderung                                                                                  |
| -------- | -------------------------------------------------------------------------------------------- |
| NFR-10.1 | Strict TypeScript (`strict: true`). Kein `any` (ausser explizite eslint-disable Kommentare). |
| NFR-10.2 | Code, Variablen, Funktionen, Kommentare in **Englisch**.                                     |
| NFR-10.3 | `interface` fuer Object Shapes, `type` fuer Unions/Intersections.                            |
| NFR-10.4 | Keine `enum` - stattdessen `as const` Objekte oder Union Types.                              |
| NFR-10.5 | Prettier + ESLint (Next.js + TypeScript Config).                                             |
| NFR-10.6 | `make check` (type-check + lint + format-check) MUSS vor jedem Commit bestehen.              |

---

## NFR-11: Daten-Integritaet

| ID       | Anforderung                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| NFR-11.1 | Hard Deletes (keine Soft Deletes).                                                                                    |
| NFR-11.2 | Kaskadierendes Loeschen mit vorheriger UI-Warnung und Auflistung.                                                     |
| NFR-11.3 | Audit Trail fuer alle geschaeftsrelevanten Aenderungen.                                                               |
| NFR-11.4 | UUID v4 als Primary Key fuer alle Tabellen.                                                                           |
| NFR-11.5 | Enum-artige Werte als typ-sichere `as const` Objekte in der App-Schicht mit Text-Feldern in der DB + Zod-Validierung. |
| NFR-11.6 | Foreign Key Constraints in der DB.                                                                                    |

---

## NFR-12: Datei-Speicherung

| ID       | Anforderung                                                                      |
| -------- | -------------------------------------------------------------------------------- |
| NFR-12.1 | Lokale Speicherung auf dem Server-Dateisystem.                                   |
| NFR-12.2 | Organisationsstruktur: `/uploads/{user_id}/{property_id}/{category}/{filename}`. |
| NFR-12.3 | Vorschaubild pro Immobilie: Clientseitig komprimiert vor Upload.                 |
| NFR-12.4 | Max. 25 MB pro Datei.                                                            |
| NFR-12.5 | MIME-Type Whitelist: PDF, JPG, JPEG, PNG, GIF, WEBP.                             |
