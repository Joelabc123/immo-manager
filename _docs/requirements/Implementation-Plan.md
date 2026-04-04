# Implementation Plan - Immo Manager

> Erstellt: 2026-04-03 | Status: Draft
> Reihenfolge: Fundament -> Kerndaten -> Features -> Analyse -> Kommunikation -> Polish

---

## Phase 0: Projekt-Fundament & Infrastruktur

**Ziel:** Technische Basis, die alle weiteren Phasen traegt.

### 0.1: Monorepo-Umstrukturierung

- [ ] Monorepo-Struktur gemaess copilot-instructions.md aufsetzen
  - `packages/shared/` (DB Schema, Types, Validierung, Berechnungen)
  - `apps/nextjs/` (Frontend + tRPC API)
  - `apps/websocket/` (WebSocket Server)
  - `apps/email/` (E-Mail Sync Worker, laeuft im selben Prozess)
- [ ] pnpm Workspace konfigurieren
- [ ] Shared tsconfig, ESLint, Prettier configs
- [ ] Makefile aktualisieren fuer Monorepo-Befehle

### 0.2: Datenbank-Schema (Kern)

- [ ] Vollstaendiges Drizzle-Schema erstellen (alle Tabellen aus FR)
- [ ] Alle Betraege als Integer (Cents) definieren
- [ ] UUID fuer alle Primary Keys
- [ ] Enum-artige Werte als `text` + Zod-Validierung + `as const` Objekte
- [ ] Sinnvolle Indizes auf allen FK-Spalten und haeufig gefilterten Feldern
- [ ] Foreign Key Constraints mit `onDelete: 'cascade'` wo sinnvoll
- [ ] Migration generieren + anwenden
- [ ] Seed-Daten / Fixtures fuer Entwicklung erstellen

### 0.3: Authentifizierung (Eigene Loesung)

- [ ] User-Tabelle erweitern: password_hash, avatar_url, settings (JSONB), tax_rate, retirement_year, language, currency
- [ ] Passwort-Hashing mit argon2/bcrypt
- [ ] Session-Management (DB-basierte Sessions oder HTTP-only Cookie + JWT)
- [ ] Register-Endpoint (tRPC Mutation)
- [ ] Login-Endpoint (tRPC Mutation)
- [ ] Logout-Endpoint
- [ ] Auth-Middleware fuer tRPC (protectedProcedure)
- [ ] Login-Page & Register-Page UI
- [ ] Auth-Guard fuer geschuetzte Routen

### 0.4: Logging & Error-Tracking

- [ ] Pino als Server-Logger installieren und konfigurieren
- [ ] Sentry SDK installieren (Next.js + Node.js)
- [ ] Sentry Error Boundary in Layout
- [ ] Strukturierte Logs fuer alle Server-Actions

### 0.5: CI/CD Pipeline

- [ ] GitHub Actions Workflow: type-check, lint, format-check, test, build
- [ ] Trigger: Push + Pull Request auf main/develop

### 0.6: i18n Setup

- [ ] i18n-Library integrieren (next-intl oder eigene Loesung mit React Context)
- [ ] Translation-Dateien: `de.json`, `en.json`
- [ ] Sprachumschaltung in Settings
- [ ] Waehrungsformatierung (EUR/USD/CHF) basierend auf User-Setting
- [ ] Datums-/Zahlenformatierung nach Locale

**Abhaengigkeiten:** Keine  
**Geschaetzter Umfang:** Gross

---

## Phase 1: Immobilien-CRUD & Kernstruktur

**Ziel:** Properties anlegen, bearbeiten, anzeigen, loeschen. Grundlage fuer alles Weitere.

### 1.1: Properties tRPC Router

- [ ] `properties.create` - Anlage-Wizard (mehrstufig)
- [ ] `properties.list` - Alle Properties eines Users (mit Pagination, Suche, Sortierung)
- [ ] `properties.getById` - Einzelne Property mit allen Relationen
- [ ] `properties.update` - Stammdaten bearbeiten
- [ ] `properties.delete` - Hard Delete mit Abhaengigkeits-Check + Kaskadenloeschung
- [ ] `properties.duplicate` - Mit auswaehlbaren Unterdaten
- [ ] Input-Validierung mit Zod fuer alle Mutations

### 1.2: Property Types & Status

- [ ] `as const` Objekte definieren:
  - `PROPERTY_TYPES`: single_family, semi_detached, terraced, apartment, commercial, land, garage, other, multi_family
  - `PROPERTY_STATUS`: rented, vacant, owner_occupied, fix_flip, renovation, sale_planned
- [ ] Mapping: Welche Typen erlauben mehrere Mieteinheiten (multi_family, commercial, terraced)

### 1.3: Immobilien-UI

- [ ] Portfolio-Listenseite mit Objekt-Karten
- [ ] Such- & Filterleiste
- [ ] Sortierungs-Dropdown
- [ ] Aggregierte KPI-Kopfzeile
- [ ] "Immobilie hinzufuegen"-Button + Wizard (Dialog/Multi-Step Form)
- [ ] Property-Detail-Page (Stammdaten, Hero-Bereich)
- [ ] Bearbeiten-Dialog
- [ ] Loesch-Warnung-Modal mit Abhaengigkeits-Auflistung
- [ ] Duplizier-Dialog mit Checkbox-Auswahl

### 1.4: Bild-Upload

- [ ] Clientseitige Komprimierung (Browser Canvas API)
- [ ] Upload-Endpoint (API Route oder tRPC)
- [ ] Lokale Speicherung: `/uploads/{user_id}/{property_id}/thumbnail.{ext}`
- [ ] Vorschau in Objekt-Karten + Detailansicht

### 1.5: Tags & Labels

- [ ] Tags-Tabelle (oder JSONB-Array am Property)
- [ ] Tag-CRUD
- [ ] Tag-Filter in der Uebersicht

### 1.6: Geocoding & Karte

- [ ] Nominatim (OSM) Integration fuer Geocoding (Adresse -> Koordinaten)
- [ ] Leaflet + react-leaflet Karte in der Uebersicht
- [ ] Marker-Clustering (react-leaflet-cluster)
- [ ] Klick auf Marker -> Property-Karte highlighten
- [ ] Karte in der Detailansicht (Mikro-/Makrolage)

### 1.7: POI & Mikrolagen-Scoring

- [ ] Overpass API (OSM) fuer POI-Abfrage (Restaurants, Aerzte, Kitas, Supermaerkte)
- [ ] Distanzberechnung
- [ ] Automatischer Gesamt-Score
- [ ] Manuelle Ueberschreibung

**Abhaengigkeiten:** Phase 0  
**Geschaetzter Umfang:** Gross

---

## Phase 2: Finanzierung, Mieter & Miet-Tracking

**Ziel:** Wirtschaftliche Daten pro Immobilie erfassen und verwalten.

### 2.1: Kredite (Loans)

- [ ] `loans` tRPC Router (CRUD)
- [ ] Mehrere Kredite pro Immobilie
- [ ] Annuitaetendarlehen Tilgungsplan-Berechnung (Kernlogik in `packages/shared/src/calculations/`)
- [ ] Tilgungsplan UI (Akkordeon mit jaehrlicher Aufschluesselung)
- [ ] Zinsen vs. Tilgung Gegenuberstellung (Chart)

### 2.2: Mieteinheiten (Rental Units)

- [ ] `rental_units` tRPC Router (CRUD)
- [ ] Automatische Erstellung bei Property-Anlage (basierend auf Typ + Anzahl)
- [ ] Unit-Verwaltung in Property-Detail

### 2.3: Mieter (Tenants)

- [ ] `tenants` tRPC Router (CRUD)
- [ ] Stammdaten: Vorname, Nachname, Email(s), Telefon, Geschlecht, IBAN, ehemalige Adresse, aktuelle Adresse
- [ ] Mietvertrags-Details: Kaltmiete, Warmmiete, Mietbeginn, Mietende, Kuendigungsfrist, Staffelmiete, Indexmiete
- [ ] Kaution: Boolean
- [ ] Kuendigungsstatus
- [ ] Mieter-Historie pro Einheit (vergangene Mieter einsehbar)
- [ ] Mietanpassungen (History + Planung)
- [ ] Automatische Leerstand-Erkennung bei Vertragsablauf

### 2.4: Mieteinnahmen-Tracking

- [ ] `rent_payments` tRPC Router
- [ ] Monatliche Soll-Generierung basierend auf Mietvertrag
- [ ] Manuelle Zahlungserfassung
- [ ] Status-Tracking (Ausstehend, Bezahlt, Ueberfaellig, Teilzahlung)
- [ ] Ueberfaelligkeits-Warnung (farblich + Action Center)

### 2.5: Nebenkosten & Ausgaben

- [ ] `expenses` tRPC Router (CRUD)
- [ ] Aufgeschluesselte Nebenkosten (Heizung, Wasser, Muell, etc.)
- [ ] Umlagefaehig vs. nicht umlagefaehig
- [ ] Einmalig vs. wiederkehrend

### 2.6: Instandhaltungsruecklage

- [ ] Berechnung basierend auf Baujahr + qm
- [ ] Monatlicher Beitrag konfigurierbar
- [ ] Saldo nach Abzug erfasster Ausgaben

### 2.7: Cashflow-Berechnung

- [ ] Kernlogik in `packages/shared/src/calculations/cashflow.ts`
- [ ] Kaltmiete - NK(nicht umlagefaehig) - Bankrate = Cashflow vor Steuern
- [ ] Cashflow nach Steuern (konfigurierbarer Steuersatz)
- [ ] Wasserfall-Chart (Tremor Raw)

### 2.8: Steuer-Daten

- [ ] AfA pro Property (Anschaffungskosten Gebaeude, AfA-Satz, Beginn)
- [ ] Grundsteuer
- [ ] Integration in Cashflow-nach-Steuern Berechnung

### 2.9: Mahn-Workflow

- [ ] Mahnungs-Generierung (PDF) auf Bedarf
- [ ] Mahn-Stufen konfigurierbar (Erinnerung, 1./2./3. Mahnung)
- [ ] Mahnungshistorie pro Mieter (Datum, Stufe, Betrag)
- [ ] KEIN automatischer Versand

### 2.10: Unit Tests fuer Kernlogik

- [ ] Vitest Setup
- [ ] Tests: Annuitaets-Tilgungsplan
- [ ] Tests: Cashflow-Berechnung
- [ ] Tests: Ruecklage-Berechnung
- [ ] Tests: Leerstand-Erkennung

**Abhaengigkeiten:** Phase 1  
**Geschaetzter Umfang:** Sehr gross

---

## Phase 3: Dashboard

**Ziel:** Aggregierte Uebersicht ueber das gesamte Portfolio.

### 3.1: KPI-Berechnungen (Server)

- [ ] Nettovermoegen (Summe Marktwerte - Summe Restschulden)
- [ ] Vermoegensentwicklung (absolut + relativ, Zeitraum konfigurierbar)
- [ ] Health Score (gewichteter Durchschnitt aus Cashflow, LTV, Rendite)
- [ ] Optimierungspotenzial (Summe Action Center Items)
- [ ] `dashboard` tRPC Router

### 3.2: KPI-UI (Obere Leiste)

- [ ] KPI-Karten mit Formatierung (Waehrung, Prozent)
- [ ] Health Score Karte mit dynamischer Farbe
- [ ] Sub-Metriken Fortschrittsbalken
- [ ] Info-Tooltips fuer Fachbegriffe

### 3.3: Vermoegensentwicklung Chart

- [ ] Area Chart (Tremor Raw): Marktwert, Restschuld, Netto-Vermoegen
- [ ] Y-Achse abgekuerzt
- [ ] Wachstums-Slider (Echtzeit)
- [ ] Zeithorizont-Buttons (5J, 10J, 20J, Renteneintritt)
- [ ] Szenarien-Vergleich (gestrichelte Linie)
- [ ] Szenarien speichern/laden
- [ ] Komplexes Prognose-Modell (Inflation, Tilgung, Mietentwicklung)
- [ ] Endwert-Karten

### 3.4: Portfolio-Allokation

- [ ] Donut-Chart mit Objektanzahl im Zentrum
- [ ] "Sonstige"-Gruppierung (< 5%)
- [ ] Toggle Marktwert/Gleichgewichtet
- [ ] Interaktive Legende

### 3.5: Action Center

- [ ] Regelbasierte Erkennung (konfigurierbar):
  - Leerstand (sofort)
  - Negativer Cashflow
  - Ueberfaellige Miete
  - Mietpotenzial (Mietspiegel-Vergleich)
  - Zinsbindung laeuft aus
  - Vertrag laeuft aus
- [ ] Zwei-Spalten UI (Handlungsbedarf + Chancen)
- [ ] Sortierung nach finanziellem Hebel
- [ ] Gruppierung identischer Typen (Akkordeon)
- [ ] Ignorieren-Funktion
- [ ] In-Context CTAs (Modals)
- [ ] Zaehler-Badges

### 3.6: Unit Tests

- [ ] Tests: Health Score Berechnung
- [ ] Tests: Vermoegens-Prognose-Modell
- [ ] Tests: Action Center Regeln

**Abhaengigkeiten:** Phase 2  
**Geschaetzter Umfang:** Gross

---

## Phase 4: Analyse-Module

**Ziel:** Finanzielle Simulationen und Optimierungen.

### 4.1: Analyse-Cockpit Navigation

- [ ] Sticky Navigation (Sidebar oder Top-Bar)
- [ ] Smooth Scrolling zu Modulen
- [ ] Portfolio-Vitalitaet Score + Status-Text
- [ ] Break-Even Zinssatz (Portfolio-weit + pro Objekt)
- [ ] Ampel-Fortschrittsbalken (aktueller Zins <-> Break-Even)
- [ ] Refinanzierungsrisiko Metrik

### 4.2: Zins-Stress-Test

- [ ] Kernlogik in `packages/shared/src/calculations/stress-test.ts`
- [ ] Slider 0-15% (0.1% Schritte)
- [ ] Cashflow-Delta Berechnung
- [ ] DSCR Berechnung
- [ ] DSCR Warnungen + CTAs
- [ ] Liniendiagramm: Baseline vs. Stress-Szenario (Zinskosten/Jahr)

### 4.3: Sondertilgungs-Rechner

- [ ] Kernlogik in `packages/shared/src/calculations/special-repayment.ts`
- [ ] Slider: Jaehrliche Summe + Anschlusszins
- [ ] Vertragliche Sondertilgungslimits pruefen
- [ ] ETF-Vergleich vor UND nach Steuern (25% Kapitalertragsteuer)
- [ ] Gewinner-Ermittlung + Fazit-Karte
- [ ] Zeit-/Zinsersparnis
- [ ] Flaechendiagramm (Restschuld + ETF-Sparplan)
- [ ] KEINE VFE

### 4.4: Zins-Optimierer

- [ ] Kernlogik in `packages/shared/src/calculations/refinancing.ts`
- [ ] Slider neuer Sollzins
- [ ] Kostenlose Marktzins-API (Bundesbank/EZB) als Orientierung
- [ ] Fixe Umschuldungskosten Eingabe
- [ ] Objektspezifische Berechnung
- [ ] Amortisationsrechner (Jahre)
- [ ] Aggregiertes jaehrliches Einsparpotenzial
- [ ] KEINE VFE

### 4.5: Exit-Strategie & Steuer-Check

- [ ] Kernlogik in `packages/shared/src/calculations/exit-strategy.ts`
- [ ] Slider: Verkaufszeitpunkt + jaehrliche Wertentwicklung (konfigurierbar)
- [ ] Maklercourtage (konfigurierbar)
- [ ] Spekulationsfrist-Check (Deutsche 10-Jahres-Frist)
- [ ] Objekt-Timeline (Zeitstrahl mit Farbcodierung)
- [ ] Erloes: Brutto (Verkaufspreis - Restschuld) + Netto (nach Spekulationssteuer mit persoenlichem Steuersatz)
- [ ] KEINE VFE

### 4.6: Szenarien-Management

- [ ] Szenarien speichern/laden/benennen fuer alle Module
- [ ] tRPC Router fuer Szenarien-CRUD
- [ ] PDF-Export mit eingefrorenen Slider-Einstellungen

### 4.7: Globaler PDF-Report

- [ ] Alle Analyse-Module als zusammenhaengender Report
- [ ] Charts als Bilder rendern
- [ ] Aktuelle Einstellungen einfrieren

### 4.8: Unit Tests

- [ ] Tests: Break-Even Berechnung
- [ ] Tests: DSCR Berechnung
- [ ] Tests: Sondertilgung vs. ETF
- [ ] Tests: Amortisation
- [ ] Tests: Exit-Erloes + Spekulationssteuer
- [ ] Tests: Stress-Test Auswirkungen
- [ ] Coverage-Ziel: 90% fuer calculations/

**Abhaengigkeiten:** Phase 2 (braucht Kredit-/Mieter-Daten)  
**Geschaetzter Umfang:** Sehr gross

---

## Phase 5: E-Mail-System & Benachrichtigungen

**Ziel:** Mieter-Kommunikation zentralisieren.

### 5.1: IMAP/SMTP Konfiguration

- [ ] Email-Account tRPC Router (CRUD)
- [ ] Credentials-Verschluesselung (AES-256-GCM)
- [ ] Verbindungstest-Endpoint
- [ ] Settings-UI fuer Postfach-Anbindung

### 5.2: E-Mail-Sync (Cron)

- [ ] ImapFlow Integration
- [ ] Cron-Job: Alle 15 Minuten neue E-Mails abrufen
- [ ] Nur Metadaten speichern (Absender, Betreff, Datum, Message-ID, In-Reply-To)
- [ ] E-Mail-Body on-demand vom IMAP-Server laden
- [ ] Anhaenge on-demand laden
- [ ] Limit: Letzte 100 E-Mails pro Account

### 5.3: Mieter-Matching

- [ ] Absender-Adresse gegen alle Mieter-E-Mail-Adressen matchen
- [ ] Mehrere E-Mails pro Mieter unterstuetzen
- [ ] Automatische Zuordnung zu Mieter + Unit + Property
- [ ] Nicht gematchte E-Mails -> "Sonstiges"

### 5.4: Thread-Erkennung

- [ ] Message-ID / In-Reply-To basiertes Threading
- [ ] Betreffzeilen-Fallback
- [ ] Thread-Zusammenfuehrung

### 5.5: Posteingang UI

- [ ] Zugeordnete Inbox (chronologische Liste)
- [ ] Objekt/Mieter Badges
- [ ] "Sonstiges" Tab
- [ ] Manuelle Zuweisung Dropdown
- [ ] Unread-Counter

### 5.6: Mail-Reader UI

- [ ] Split-Screen Layout
- [ ] Kontext-Panel (Mieter-Stammdaten)
- [ ] Rich-Text Antwort-Editor (Tiptap)
- [ ] E-Mail-Vorlagen mit Platzhaltern ({{mieter_name}}, {{objekt_adresse}} etc.)
- [ ] E-Mail-Signatur
- [ ] Versand via SMTP

### 5.7: Versand-Tracking

- [ ] Tracking-Pixel fuer Gelesen-Status (optional, Privacy-bedenken dokumentieren)

### 5.8: Anhang-Management

- [ ] Anhang-Vorschau (PDF, JPG, PNG)
- [ ] 1-Klick Transfer in Immobilien-Akte
- [ ] Kategorisierungs-Modal
- [ ] Rueckverlinkung im Reader

### 5.9: In-App Benachrichtigungen

- [ ] Notifications-Tabelle in DB
- [ ] Bell-Icon mit Zaehler in Navigation
- [ ] Notification-Feed (Click to navigate)
- [ ] Events: Neue E-Mail, ueberfaellige Miete, Vertragsende, Action Center

### 5.10: Browser Push Notifications

- [ ] Service Worker Registration
- [ ] Push-Subscription Management
- [ ] Web Push API (VAPID Keys)
- [ ] Opt-in pro Nutzer in Settings
- [ ] Push bei: Neue E-Mail, ueberfaellige Miete, Vertragsende

### 5.11: WebSocket Integration

- [ ] WebSocket Server aufsetzen
- [ ] Real-Time Events: Neue E-Mail angekommen, neue Benachrichtigung
- [ ] Client-seitige WS-Connection

**Abhaengigkeiten:** Phase 2 (braucht Mieter-Daten fuer Matching)  
**Geschaetzter Umfang:** Sehr gross

---

## Phase 6: Dokumente & Berichte

**Ziel:** Datei-Management und Export-Funktionen.

### 6.1: Dokumenten-Upload

- [ ] Upload-API (multipart/form-data oder tRPC mit Base64)
- [ ] MIME-Type Validierung (PDF, JPG, PNG, GIF, WEBP)
- [ ] Groessen-Limit 25 MB
- [ ] Lokale Speicherung: `/uploads/{user_id}/{property_id}/{category}/`
- [ ] Kategorien: Kaufvertrag, Mietvertraege, Nebenkostenabrechnungen, Bilder, Maengelanzeigen, Sonstige

### 6.2: Dokumenten-UI

- [ ] Drag & Drop Upload-Zone
- [ ] Kategorisierte Ansicht
- [ ] Vorschau (PDF inline, Bilder Lightbox)
- [ ] Umbenennen, Loeschen, Kategorie aendern

### 6.3: PDF-Export

- [ ] @react-pdf/renderer Integration
- [ ] Immobilien-Detail als PDF (alle Daten + Charts)
- [ ] Analyse-Report als PDF
- [ ] Mahnungs-PDF

### 6.4: Sharing Links

- [ ] Token-Generierung (crypto.randomBytes(32))
- [ ] Share-Links Tabelle (token, property_id, expires_at)
- [ ] Public Route: `/share/{token}` - Read-Only Property-Ansicht
- [ ] Ablauf konfigurierbar (1 Tag - 30 Tage)

**Abhaengigkeiten:** Phase 1 (Properties), Phase 2 (Mieter fuer Mahnungen)  
**Geschaetzter Umfang:** Mittel

---

## Phase 7: Audit Trail & Marktdaten

**Ziel:** Nachvollziehbarkeit und externe Datenquellen.

### 7.1: Audit Trail

- [ ] `audit_logs` Tabelle (user_id, entity_type, entity_id, action, field_name, old_value, new_value, timestamp)
- [ ] Middleware/Hook in tRPC fuer automatisches Logging bei Mutations
- [ ] Audit-Log Ansicht pro Objekt + global

### 7.2: Marktdaten-Integration

- [ ] Mietspiegel-Daten (manuell oder API falls verfuegbar)
- [ ] `market_data_cache` Tabelle
- [ ] Historische Speicherung
- [ ] Bundesbank/EZB API fuer aktuelle Zinsen
- [ ] Integration in Action Center (Mietpotenzial-Erkennung)

**Abhaengigkeiten:** Phase 2  
**Geschaetzter Umfang:** Mittel

---

## Phase 8: Settings, PWA Vorbereitung & Polish

**Ziel:** Benutzererlebnis abrunden.

### 8.1: Settings-Tab (komplett)

- [ ] Alle konfigurierbaren Optionen aus FR-1.2
- [ ] Profil-Bearbeitung (Name, E-Mail, Passwort aendern)
- [ ] Avatar-Upload
- [ ] Sprachumschaltung (DE/EN)
- [ ] Waehrungsauswahl (EUR/USD/CHF)

### 8.2: Responsive Polish

- [ ] Mobile Navigation (Bottom Tab Bar)
- [ ] Alle Views auf 360px testen und optimieren
- [ ] Touch-optimierte Slider und Interaktionen

### 8.3: PWA Vorbereitung

- [ ] Web App Manifest (`manifest.json`)
- [ ] Service Worker (Caching Strategy)
- [ ] Offline-Fallback Page
- [ ] Install-Prompt

### 8.4: Sticky Footer (Globale Objekt-Aktionen)

- [ ] Fixierte Leiste: Bearbeiten, Duplizieren, Loeschen, Dokumente
- [ ] Kontextsensitiv (nur in Detailansicht sichtbar)

### 8.5: Seed Data & Demo-Modus

- [ ] Demo-Immobilien mit realistischen Daten
- [ ] Demo-Mieter, Kredite, Zahlungen
- [ ] Seed-Script (`make db-seed`)

**Abhaengigkeiten:** Alle vorherigen Phasen  
**Geschaetzter Umfang:** Mittel

---

## Zusammenfassung der Phasen

| Phase | Titel                                | Abhaengigkeit | Umfang     |
| ----- | ------------------------------------ | ------------- | ---------- |
| **0** | Projekt-Fundament & Infrastruktur    | Keine         | Gross      |
| **1** | Immobilien-CRUD & Kernstruktur       | Phase 0       | Gross      |
| **2** | Finanzierung, Mieter & Miet-Tracking | Phase 1       | Sehr gross |
| **3** | Dashboard                            | Phase 2       | Gross      |
| **4** | Analyse-Module                       | Phase 2       | Sehr gross |
| **5** | E-Mail-System & Benachrichtigungen   | Phase 2       | Sehr gross |
| **6** | Dokumente & Berichte                 | Phase 1+2     | Mittel     |
| **7** | Audit Trail & Marktdaten             | Phase 2       | Mittel     |
| **8** | Settings, PWA & Polish               | Alle          | Mittel     |

**Hinweis:** Phase 3, 4, 5, 6 und 7 koennen teilweise parallel bearbeitet werden, da sie alle auf Phase 2 aufbauen aber untereinander wenig Abhaengigkeiten haben.

---

## Technologie-Stack (Final)

| Bereich       | Technologie                                |
| ------------- | ------------------------------------------ |
| Framework     | Next.js 16 + React 19                      |
| API           | tRPC v11 + Zod v4                          |
| DB            | PostgreSQL 17 + Drizzle ORM                |
| Styling       | Tailwind CSS v4 + shadcn/ui (base-nova)    |
| State         | React Query v5 (Server) + Zustand (Client) |
| Charts        | Tremor Raw (Recharts-basiert)              |
| Karten        | Leaflet + react-leaflet + Nominatim        |
| PDF           | @react-pdf/renderer                        |
| Auth          | Eigene Loesung (argon2 + Sessions)         |
| Uploads       | Lokales Dateisystem                        |
| E-Mail (Read) | ImapFlow (IMAP)                            |
| E-Mail (Send) | Nodemailer (SMTP)                          |
| Rich-Text     | Tiptap                                     |
| Forms         | react-hook-form + @hookform/resolvers      |
| i18n          | next-intl                                  |
| Datum         | date-fns                                   |
| Logging       | Pino + Sentry                              |
| Testing       | Vitest                                     |
| CI/CD         | GitHub Actions                             |
| Real-Time     | WebSocket (ws)                             |
| Push          | Web Push API                               |
| Deployment    | Docker Compose (Self-Hosted)               |
