# Email-System Gesamtanalyse

**Erstellt:** 20. April 2026
**Scope:** Registrierung, Synchronisation und Verarbeitung von E-Mails in Immo Manager

---

## Inhaltsverzeichnis

1. [Systemuebersicht & Architektur](#1-systemuebersicht--architektur)
2. [Datenbank-Schema](#2-datenbank-schema)
3. [Mail-Account Registrierung](#3-mail-account-registrierung)
4. [E-Mail Synchronisation (IMAP Fetch)](#4-e-mail-synchronisation-imap-fetch)
5. [E-Mail Verarbeitung (Processing Pipeline)](#5-e-mail-verarbeitung-processing-pipeline)
6. [E-Mail Versand (SMTP)](#6-e-mail-versand-smtp)
7. [Frontend-Darstellung](#7-frontend-darstellung)
8. [Sicherheitsanalyse](#8-sicherheitsanalyse)
9. [Schwachstellen & Verbesserungspotenzial](#9-schwachstellen--verbesserungspotenzial)
10. [Datenfluss-Diagramm](#10-datenfluss-diagramm)

---

## 1. Systemuebersicht & Architektur

Das E-Mail-System ist als **Microservice-Architektur** implementiert, bestehend aus drei Hauptkomponenten:

| Komponente             | Service                                   | Rolle                                                                     |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| **Email Microservice** | `apps/email/`                             | Standalone-Service fuer IMAP-Sync, Cron-Scheduling, Event-Handling        |
| **Next.js Backend**    | `apps/nextjs/src/server/routers/email.ts` | tRPC-Router fuer Account-CRUD, Senden, Anhang-Transfer, Label-Management  |
| **Next.js Frontend**   | `apps/nextjs/src/components/mail/`        | UI-Komponenten fuer E-Mail-Liste, Reader, Reply-Editor, Anhang-Verwaltung |

**Kommunikation zwischen Services:**

- **Redis Pub/Sub** als Event-Bus zwischen Next.js und Email-Service
- **PostgreSQL** (via Drizzle ORM) als gemeinsame Datenbank (`@repo/shared`)
- **Keine direkte HTTP/gRPC-Kommunikation** zwischen den Services

### Service-Interaktionsmodell

```
Next.js (tRPC)                    Email Service
       |                                |
       |--- Redis: EMAIL_SYNC_REQUEST ->|  (Manueller Sync-Trigger)
       |--- Redis: EMAIL_ACCOUNT_UPDATED ->| (Account erstellt/aktualisiert/geloescht)
       |                                |
       |<- Redis: EMAIL_NEW ------------|  (Neue E-Mails synchronisiert)
       |<- Redis: EMAIL_SYNC_COMPLETE --|  (Sync abgeschlossen)
       |<- Redis: EMAIL_SYNC_ERROR ----|  (Sync fehlgeschlagen)
       |                                |
       |---- PostgreSQL (shared) -------|  (Gemeinsame Datenbank)
```

---

## 2. Datenbank-Schema

### Tabellen-Uebersicht

**5 Haupttabellen + 1 Template-Tabelle:**

#### `email_accounts`

| Spalte                    | Typ                    | Beschreibung                          |
| ------------------------- | ---------------------- | ------------------------------------- |
| `id`                      | UUID (PK)              | Account-ID                            |
| `user_id`                 | UUID (FK -> users)     | Besitzer                              |
| `label`                   | text                   | Anzeigename                           |
| `imap_host` / `imap_port` | text / int             | IMAP-Verbindungsdaten                 |
| `smtp_host` / `smtp_port` | text / int             | SMTP-Verbindungsdaten                 |
| `username`                | text                   | Login-Username                        |
| `encrypted_password`      | text                   | AES-256-GCM verschluesseltes Passwort |
| `encryption_iv`           | text                   | Initialisierungsvektor (hex)          |
| `encryption_tag`          | text                   | Auth-Tag (hex)                        |
| `from_address`            | text                   | Absenderadresse                       |
| `sync_interval_minutes`   | int (default: 15)      | Sync-Intervall (5, 10, 15, 30, 60)    |
| `sync_status`             | text (default: "idle") | "idle" / "syncing" / "error"          |
| `sync_error`              | text                   | Letzte Fehlermeldung                  |
| `is_active`               | boolean                | Aktiv/Deaktiviert                     |
| `last_sync_at`            | timestamp              | Letzter erfolgreicher Sync            |

#### `email_folders`

| Spalte                               | Typ       | Beschreibung                                                          |
| ------------------------------------ | --------- | --------------------------------------------------------------------- |
| `id`                                 | UUID (PK) | Ordner-ID                                                             |
| `email_account_id`                   | UUID (FK) | Zugehoeriger Account                                                  |
| `name` / `path`                      | text      | Ordnername und IMAP-Pfad                                              |
| `type`                               | text      | "inbox" / "sent" / "drafts" / "trash" / "spam" / "archive" / "custom" |
| `uid_validity`                       | int       | IMAP UID-Validity (fuer Mailbox-Reset-Erkennung)                      |
| `last_sync_uid`                      | int       | Hoechste synchronisierte UID                                          |
| `total_messages` / `unread_messages` | int       | Nachrichten-Zaehler                                                   |
| **Unique Constraint**                |           | `(email_account_id, path)`                                            |

#### `emails`

| Spalte                          | Typ                 | Beschreibung                            |
| ------------------------------- | ------------------- | --------------------------------------- |
| `id`                            | UUID (PK)           | E-Mail-ID                               |
| `email_account_id`              | UUID (FK)           | Zugehoeriger Account                    |
| `folder_id`                     | UUID (FK)           | Zugehoeriger Ordner                     |
| `tenant_id`                     | UUID (FK, nullable) | Automatisch/manuell zugewiesener Mieter |
| `property_id`                   | UUID (FK, nullable) | Zugewiesene Immobilie                   |
| `message_id`                    | text                | RFC-2822 Message-ID                     |
| `in_reply_to`                   | text                | In-Reply-To Header (Threading)          |
| `thread_id`                     | text                | Thread-Identifier                       |
| `from_address` / `to_addresses` | text                | Absender / Empfaenger                   |
| `subject`                       | text                | Betreff                                 |
| `html_body` / `text_body`       | text                | E-Mail-Inhalt                           |
| `snippet`                       | text                | Vorschau (erste 200 Zeichen)            |
| `is_read` / `is_inbound`        | boolean             | Gelesen-Status / Eingehend              |
| `uid`                           | int                 | IMAP UID                                |
| `has_attachments`               | boolean             | Anhaenge vorhanden                      |
| `tracking_token`                | text                | Tracking-Pixel Token                    |
| `opened_at`                     | timestamp           | Zeitpunkt der Oeffnung (via Pixel)      |

**Indices:** `email_account_id`, `folder_id`, `message_id`, `from_address`, `tenant_id`, `thread_id`, `(folder_id, uid)`

#### `email_labels` / `email_email_labels`

- **6 vordefinierte Labels:** Vertrag (blau), Mahnung (rot), Reparatur (orange), Anfrage (gruen), Kuendigung (lila), Nebenkosten (gelb)
- Many-to-Many Beziehung ueber Junction-Tabelle

#### `email_templates`

- Wiederverwendbare Vorlagen mit `name`, `subject`, `body`
- Template-Variablen: `{{tenant_name}}`, `{{property_address}}`, `{{cold_rent}}`, etc.

---

## 3. Mail-Account Registrierung

### Ablauf

```
Benutzer (UI) --> tRPC: createAccount --> Verschluesselung --> DB Insert --> Redis Event --> Email Service
```

**Datei:** `apps/nextjs/src/server/routers/email.ts` - `createAccount` Procedure

### Schritt-fuer-Schritt

1. **Eingabe validieren:** IMAP/SMTP Host, Port, Username, Passwort, From-Address, Sync-Intervall
2. **Passwort verschluesseln:** `encryptEmailPassword()` -> AES-256-GCM mit `EMAIL_ENCRYPTION_KEY`
   - Erzeugt: `{ encrypted, iv, tag }` (alle hex-codiert)
3. **DB Insert:** Neuer Eintrag in `email_accounts` mit verschluesseltem Passwort
4. **Labels anlegen:** 6 vordefinierte Labels (Vertrag, Mahnung, etc.) werden fuer den Benutzer erzeugt
5. **Redis Event:** `EMAIL_ACCOUNT_UPDATED` mit `action: "create"` wird publiziert
6. **Email-Service reagiert:**
   - Empfaengt Event via `onAccountUpdated()`
   - Erstellt Cron-Job fuer den Account (z.B. `*/15 * * * *`)
   - Fuehrt **sofortigen Initial-Sync** durch

### Verbindungstest

- `testConnection` Procedure: Testet IMAP **und** SMTP getrennt
- IMAP: Verbindet via ImapFlow, listet Mailboxen auf
- SMTP: Erstellt Nodemailer-Transporter, verifiziert Verbindung

### Account-Management

| Procedure           | Aktion                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| `updateAccount`     | Aktualisiert Felder + optional neues Passwort re-encrypted + Redis Event |
| `deleteAccount`     | Loescht Account (CASCADE loescht Ordner + E-Mails) + Redis Event         |
| `setDefaultAccount` | Markiert einen Account als Standard                                      |
| `getAccounts`       | Listet alle Accounts des Users (ohne Passwort)                           |

---

## 4. E-Mail Synchronisation (IMAP Fetch)

### Trigger-Mechanismen

| Trigger            | Quelle           | Beschreibung                                        |
| ------------------ | ---------------- | --------------------------------------------------- |
| **Cron-Job**       | Email-Service    | Pro Account konfigurierbar (5/10/15/30/60 Min)      |
| **Manueller Sync** | Next.js -> Redis | `syncNow` Procedure publiziert `EMAIL_SYNC_REQUEST` |
| **Initial-Sync**   | Email-Service    | Automatisch bei Account-Erstellung                  |

### Scheduling-System

**Datei:** `apps/email/src/index.ts`

- Ein `Map<string, cron.ScheduledTask>` speichert aktive Jobs
- `minutesToCron()`: z.B. 15 -> `*/15 * * * *`, 60 -> `0 * * * *`
- **Schutz vor Doppel-Ausfuehrung:** Pruefen ob `syncStatus === "syncing"` -> Skip
- **Lifecycle:** Account deaktiviert/geloescht -> Job gestoppt und entfernt

### Sync-Ablauf (pro Account)

**Datei:** `apps/email/src/sync/email-sync.ts` - `syncEmailAccount()`

```
1. Status setzen: syncStatus = "syncing"
2. Passwort entschluesseln (AES-256-GCM)
3. IMAP-Verbindung oeffnen (ImapFlow)
4. Ordner synchronisieren (syncFolders)
5. Pro Ordner: E-Mails synchronisieren (syncFolder)
6. Status setzen: syncStatus = "idle", lastSyncAt = now()
7. Redis Events publizieren (EMAIL_NEW, EMAIL_SYNC_COMPLETE)
```

### Ordner-Synchronisation

**Datei:** `apps/email/src/sync/folder-sync.ts` - `syncFolders()`

1. `client.list()` -> Alle IMAP-Mailboxen abrufen
2. Nicht-selektierbare Ordner ueberspringen (`\Noselect`, `\NonExistent`)
3. Ordnertyp bestimmen via IMAP-Flags:
   - `\Inbox` oder Name "INBOX" -> `inbox`
   - `\Sent` -> `sent`
   - `\Drafts` -> `drafts`
   - `\Trash` / `\Junk` -> `trash`
   - `\Spam` -> `spam`
   - `\Archive` / `\All` -> `archive`
   - Alles andere -> `custom`
4. **Status abfragen:** `client.status()` -> `messages`, `unseen`, `uidValidity`
5. **Upsert:** Ordner in DB erstellen oder aktualisieren
6. **Aufraemen:** Ordner in DB loeschen, die nicht mehr auf IMAP existieren

### E-Mail-Synchronisation (pro Ordner)

**Datei:** `apps/email/src/sync/email-sync.ts` - `syncFolder()`

1. **Mailbox sperren:** `client.getMailboxLock(folderPath)`
2. **UID-Validity pruefen:**
   - Falls geaendert (Mailbox-Reset) -> Alle E-Mails des Ordners loeschen, von vorne beginnen
3. **Fetch-Range bestimmen:**
   - `lastSyncUid + 1 : *` (nur neue E-Mails)
   - Falls kein lastSyncUid -> `1:*` (alle)
4. **Deduplizierung:** Bestehende `messageId`s aus DB laden -> Set fuer O(1)-Lookup
5. **E-Mails abrufen:** `client.fetch()` mit `envelope`, `uid`, `flags`, `bodyStructure`, `source`
6. **Limit:** Max. 200 E-Mails pro Ordner pro Sync-Zyklus
7. **Pro E-Mail: Verarbeitungs-Pipeline** (siehe Abschnitt 5)
8. **Ordner-Status aktualisieren:** `lastSyncUid`, `lastSyncAt`, `uidValidity`, `totalMessages`

---

## 5. E-Mail Verarbeitung (Processing Pipeline)

Fuer jede neue E-Mail (innerhalb von `syncFolder()`):

### 5.1 Parsing

- **Library:** `mailparser.simpleParser()`
- **Extraktion:** HTML-Body, Text-Body, Attachments-Flag
- **Envelope-Daten:** From, To, Subject, Date, MessageId, InReplyTo, Flags

### 5.2 Thread-Zuordnung

**Datei:** `apps/email/src/sync/thread-resolver.ts` - `resolveThreadId()`

```
if inReplyTo existiert:
    -> Suche E-Mail mit messageId = inReplyTo im gleichen Account
    -> Falls gefunden: threadId = parent.threadId (bestehender Thread)
    -> Falls nicht gefunden: threadId = eigene messageId (neuer Thread)
else:
    -> threadId = eigene messageId (neuer Thread)
```

**Einschraenkungen:**

- Nutzt **nur** `In-Reply-To` Header, nicht `References`
- Der `_subject` Parameter wird uebergeben, aber **nicht verwendet** (kein Subject-basiertes Matching)
- Funktioniert nur wenn die Parent-E-Mail bereits synchronisiert wurde

### 5.3 Mieter-Zuordnung (Tenant Matching)

**Datei:** `apps/email/src/sync/tenant-matcher.ts` - `matchSenderToTenant()`

- **Nur fuer Inbox-E-Mails** (nicht fuer Sent, Drafts, etc.)
- Extrahiert E-Mail aus "Name \<email\>" Format via Regex
- Normalisierung: `toLowerCase().trim()`
- **Lookup:** `tenantEmails` Tabelle -> JOIN auf `tenants` (gleicher User)
- **Rueckgabe:** `{ tenantId, propertyId }` oder `null`
- PropertyId wird ueber `tenants.rentalUnitId` -> `rentalUnits.propertyId` aufgeloest

### 5.4 Snippet-Generierung

- Text-Body auf 200 Zeichen kuerzen
- Whitespace normalisieren (`\s+` -> einzelnes Leerzeichen)

### 5.5 Speicherung

Neuer Eintrag in `emails` Tabelle mit allen extrahierten Metadaten, Thread-ID, Tenant-Zuordnung.

---

## 6. E-Mail Versand (SMTP)

**Datei:** `apps/nextjs/src/server/routers/email.ts` - `send` Procedure

### Ablauf

1. **Account-Berechtigung pruefen** (Account gehoert dem User)
2. **User-Einstellungen laden:** Signatur, Tracking-Pixel-Einstellung
3. **Passwort entschluesseln** fuer SMTP-Auth
4. **Nodemailer Transporter erstellen:** `smtpHost:smtpPort`, TLS wenn Port 465
5. **HTML-Body zusammensetzen:**
   - User-Signatur anhaengen (falls konfiguriert)
   - Tracking-Pixel anhaengen (falls aktiviert) - 1x1 transparentes Bild
6. **MessageId generieren:** `<timestamp.random@smtpHost>`
7. **E-Mail senden** via SMTP
8. **In DB speichern:**
   - `isInbound: false`, `isRead: true`
   - In "sent" Ordner einordnen (falls vorhanden)
   - Thread-ID beibehalten (bei Reply) oder neue erstellen
   - Tracking-Token speichern

### Tracking-System

- Tracking-Pixel: `<img src="{baseUrl}/api/track/{token}" width="1" height="1" />`
- Token: 32 Bytes, base64url-kodiert
- Bei Oeffnung: `openedAt` Timestamp wird gesetzt

---

## 7. Frontend-Darstellung

### Komponenten-Hierarchie

```
Mail-Seite
  |-- AccountSelector / FolderSelector / FilterControls
  |-- EmailList (email-list.tsx)
  |    |-- EmailListItem (email-list-item.tsx)  x N
  |    |-- Pagination Controls
  |-- MailReader (mail-reader.tsx)
       |-- Header (Subject, From, Date, Labels)
       |-- ThreadView (Expandable Thread-Nachrichten)
       |-- EmailBody (HTML oder Plaintext)
       |-- AttachmentList (attachment-list.tsx)
       |    |-- TransferAttachmentDialog
       |-- ReplyEditor (reply-editor.tsx, dynamic import)
       |    |-- TipTap Editor (Bold, Italic, Listen)
       |    |-- TemplateSelector (template-selector.tsx)
       |-- ManualAssignDialog (manual-assign-dialog.tsx)
```

### Email-Liste

- **Paginierung:** 50 E-Mails pro Seite
- **Filter:** Account, Ordner, Mieter, Label, Nur-Eingehend, Matched/Unmatched
- **Anzeige pro E-Mail:** Absender, Betreff, Snippet, Datum, Gelesen-Status, Anhangs-Icon, Mieter-Badge

### Mail-Reader

- **Automatisches "Als gelesen markieren"** beim Oeffnen
- **Thread-Ansicht:** Alle E-Mails im gleichen Thread, chronologisch, aufklappbar
- **Body-Rendering:** `dangerouslySetInnerHTML` (Server-seitig sanitized)
- **Labels:** Farbige Badges mit Zuweisung/Entfernung

### Reply-Editor

- **TipTap Rich-Text-Editor** mit Toolbar
- **Template-Auswahl** fuer vordefinierte Vorlagen
- **Signatur** wird automatisch angehaengt
- **Dynamic Import** um SSR-Probleme zu vermeiden

### Anhaenge

- **On-Demand Fetching:** Anhaenge werden erst bei Bedarf von IMAP geholt (nicht gecached)
- **Transfer zu Dokumenten:** Anhaenge koennen einer Immobilie als Dokument zugewiesen werden
- **Kategorie:** Standard `"email-attachment"`

---

## 8. Sicherheitsanalyse

### Positiv

| Aspekt                        | Implementierung                                        | Bewertung   |
| ----------------------------- | ------------------------------------------------------ | ----------- |
| **Passwort-Verschluesselung** | AES-256-GCM mit 32-Byte Key, separatem IV und Auth-Tag | Gut         |
| **Key-Validierung**           | 64-Zeichen Hex-String wird beim Start validiert        | Gut         |
| **Account-Ownership**         | `verifyAccountOwnership()` bei jeder Aktion            | Gut         |
| **Protected Procedures**      | Alle tRPC-Procedures erfordern Authentifizierung       | Gut         |
| **Cascade Deletes**           | Account-Loeschung entfernt alle zugehoerigen Daten     | Gut         |
| **IMAP TLS**                  | Automatisch aktiviert bei Port 993                     | Ausreichend |

### Potenzielle Risiken

| Risiko                           | Beschreibung                                                                                                                                                                       | Schwere |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **dangerouslySetInnerHTML**      | HTML-Body wird direkt gerendert. Server-seitige Sanitization ist erwaehnt, aber es ist unklar welche Library/Methode verwendet wird. **XSS-Risiko falls nicht korrekt sanitized.** | Hoch    |
| **Kein SMTP-TLS fuer nicht-465** | `secure: account.smtpPort === 465` - Port 587 (STARTTLS) wird nicht explizit behandelt                                                                                             | Mittel  |
| **Tracking-Pixel Basis-URL**     | Fallback wenn `NEXTAUTH_URL` nicht gesetzt - potenzielle URL-Inkonsistenz                                                                                                          | Niedrig |
| **Passwort in Memory**           | Entschluesseltes Passwort existiert temporaer im Speicher (unvermeidbar)                                                                                                           | Niedrig |

---

## 9. Schwachstellen & Verbesserungspotenzial

### Architektur

| #   | Thema                              | Beschreibung                                                                                                      | Prioritaet |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| A1  | **Kein Retry-Mechanismus**         | Fehlgeschlagene Syncs werden nur geloggt, nicht wiederholt. Kein exponentielles Backoff.                          | Hoch       |
| A2  | **Sequentielle Ordner-Syncs**      | Ordner werden nacheinander synchronisiert (`for...of` Loop), nicht parallel. Bei vielen Ordnern langsam.          | Mittel     |
| A3  | **200 E-Mails Limit pro Sync**     | Hart-kodiertes Limit. Bei Initial-Sync eines grossen Postfachs (z.B. 10.000 E-Mails) dauert es viele Zyklen.      | Mittel     |
| A4  | **Kein Delta-Sync fuer Flags**     | Nur neue E-Mails werden geholt. Aenderungen am Gelesen-Status auf dem Server werden nicht zurueck-synchronisiert. | Mittel     |
| A5  | **Keine IMAP IDLE Unterstuetzung** | Nur Polling via Cron. Keine Echtzeit-Benachrichtigung bei neuen E-Mails.                                          | Niedrig    |

### Threading

| #   | Thema                                      | Beschreibung                                                                                                         | Prioritaet |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| T1  | **Nur In-Reply-To**                        | `References` Header wird ignoriert. E-Mails die den Header nicht korrekt setzen, werden nicht korrekt zugeordnet.    | Hoch       |
| T2  | **Subject-Parameter ungenutzt**            | `_subject` wird an `resolveThreadId()` uebergeben aber nie verwendet. Kein Fallback auf Subject-basiertes Threading. | Mittel     |
| T3  | **Race Condition bei gleichzeitigem Sync** | Wenn Parent-E-Mail noch nicht synchronisiert ist, wird neuer Thread erstellt statt korrekt zugeordnet.               | Mittel     |

### Tenant-Matching

| #   | Thema                        | Beschreibung                                                                                                  | Prioritaet |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------- |
| M1  | **Nur Inbox-Matching**       | Sent-E-Mails werden nicht gematcht (keine To-Adresse Analyse).                                                | Mittel     |
| M2  | **Nur exaktes E-Mail-Match** | Keine Fuzzy-Suche, keine Domain-basierte Zuordnung, keine Alias-Erkennung.                                    | Niedrig    |
| M3  | **Kein Re-Matching**         | Wenn ein Mieter nachtraeglich eine E-Mail-Adresse hinzufuegt, werden bestehende E-Mails nicht neu zugeordnet. | Niedrig    |

### Anhaenge

| #   | Thema                           | Beschreibung                                                                               | Prioritaet |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| AT1 | **Kein Attachment-Caching**     | Jeder Abruf erfordert eine neue IMAP-Verbindung. Langsam und belastet den Mailserver.      | Hoch       |
| AT2 | **Keine Groessen-Limits**       | Keine Pruefung auf maximale Anhangsgroesse beim Abruf/Transfer.                            | Mittel     |
| AT3 | **Attachment-Metadaten fehlen** | Nur `hasAttachments` Boolean. Keine persistierte Liste von Dateinamen/Groessen/MIME-Types. | Mittel     |

### Sync-Robustheit

| #   | Thema                           | Beschreibung                                                                                                               | Prioritaet |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| S1  | **Kein Health-Check**           | Email-Service hat keinen Health-Endpoint. Kein Monitoring ob Service laeuft.                                               | Hoch       |
| S2  | **Sync-Status "syncing" Stuck** | Wenn der Service waehrend eines Syncs abstuerzt, bleibt `syncStatus = "syncing"` permanent stecken. Kein Timeout/Recovery. | Hoch       |
| S3  | **Keine Connection-Pool**       | Jeder Sync erstellt eine neue IMAP-Verbindung. Kein Verbindungs-Pooling.                                                   | Mittel     |
| S4  | **Kein Rate-Limiting**          | Manueller Sync (`syncNow`) kann beliebig oft getriggert werden.                                                            | Niedrig    |

### E-Mail-Versand

| #   | Thema                         | Beschreibung                                                                                                                                                  | Prioritaet |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| V1  | **Kein SMTP-Connection-Pool** | Pro Versand wird ein neuer Transporter erstellt.                                                                                                              | Mittel     |
| V2  | **Sent-Ordner Sync-Luecke**   | Gesendete E-Mail wird lokal in DB gespeichert, aber nicht via IMAP APPEND in den Sent-Ordner auf dem Server gelegt. Naechster Sync koennte Duplikat erzeugen. | Hoch       |
| V3  | **Kein BCC-Self**             | Gesendete E-Mails haben keinen BCC-an-sich-selbst Mechanismus als Backup.                                                                                     | Niedrig    |

---

## 10. Datenfluss-Diagramm

### Registrierung eines Mail-Accounts

```
User (Browser)
    |
    v
[Next.js Frontend] -- tRPC createAccount -->
    |
    v
[Next.js Server]
    |-- 1. Validierung der Eingabedaten
    |-- 2. encryptEmailPassword(password, EMAIL_ENCRYPTION_KEY)
    |       -> { encrypted, iv, tag }
    |-- 3. INSERT INTO email_accounts (... encrypted_password, iv, tag ...)
    |-- 4. INSERT INTO email_labels (6x vordefinierte Labels)
    |-- 5. Redis PUBLISH email:account-updated { accountId, action: "create" }
    |
    v
[Email Service]
    |-- 6. onAccountUpdated() empfaengt Event
    |-- 7. Cron-Job erstellen (z.B. */15 * * * *)
    |-- 8. Sofortiger Initial-Sync (syncEmailAccount)
```

### E-Mail Synchronisation

```
[Cron-Job / Redis Event]
    |
    v
[Email Service: syncEmailAccount()]
    |-- 1. SET syncStatus = "syncing"
    |-- 2. decryptCredential(encrypted, iv, tag, key)
    |-- 3. ImapFlow.connect(host, port, user, password)
    |
    v
[syncFolders()]
    |-- 4. client.list() -> IMAP Mailbox-Liste
    |-- 5. Pro Ordner: client.status() -> Messages, Unseen, UidValidity
    |-- 6. UPSERT email_folders
    |-- 7. DELETE nicht mehr existierende Ordner
    |
    v
[syncFolder() - pro Ordner]
    |-- 8. client.getMailboxLock(path)
    |-- 9. Pruefen: uidValidity geaendert? -> Reset
    |-- 10. client.fetch(lastUid+1:*, { envelope, source, flags })
    |-- 11. Limit: max 200 E-Mails
    |
    v
[Pro E-Mail]
    |-- 12. Deduplizierung: messageId schon in DB? -> Skip
    |-- 13. simpleParser(source) -> htmlBody, textBody, attachments
    |-- 14. resolveThreadId(messageId, inReplyTo, subject, accountId)
    |-- 15. matchSenderToTenant(fromAddress, userId)  [nur Inbox]
    |-- 16. generateSnippet(textBody)
    |-- 17. INSERT INTO emails (... alle Felder ...)
    |
    v
[Abschluss]
    |-- 18. UPDATE email_folders SET lastSyncUid, lastSyncAt
    |-- 19. SET syncStatus = "idle", lastSyncAt = NOW()
    |-- 20. Redis PUBLISH email:new { count }
    |-- 21. Redis PUBLISH email:sync-complete { newEmails, matched, errors }
```

### E-Mail Versand

```
User (Reply-Editor)
    |
    v
[Next.js Frontend] -- tRPC send -->
    |
    v
[Next.js Server]
    |-- 1. verifyAccountOwnership()
    |-- 2. User-Settings laden (Signatur, Tracking)
    |-- 3. decryptEmailPassword()
    |-- 4. nodemailer.createTransport(smtp)
    |-- 5. HTML-Body + Signatur + Tracking-Pixel zusammensetzen
    |-- 6. transporter.sendMail({ from, to, subject, html, messageId })
    |-- 7. INSERT INTO emails (isInbound: false, isRead: true, folderId: sent)
    |
    v
[Empfaenger-Mailserver]
```

---

## Zusammenfassung

Das E-Mail-System ist **funktional solide** mit einer sauberen Trennung zwischen IMAP-Sync (Microservice) und Business-Logik (Next.js). Die **Verschluesselung** ist korrekt implementiert, und die **Event-basierte Architektur** ueber Redis erlaubt lose Kopplung.

Die **kritischsten Verbesserungsbereiche** sind:

1. **Stuck-Sync-Recovery** (S2) - syncStatus kann permanent auf "syncing" haengen bleiben
2. **Sent-Folder Sync-Luecke** (V2) - Gesendete E-Mails werden nicht per IMAP APPEND gespeichert
3. **HTML-Sanitization** - Unklar ob XSS-Schutz korrekt implementiert ist
4. **Kein Retry-Mechanismus** (A1) - Fehlgeschlagene Syncs werden nicht wiederholt
5. **Attachment-Caching** (AT1) - Jeder Abruf erfordert neue IMAP-Verbindung
6. **Threading nur via In-Reply-To** (T1) - References-Header wird ignoriert
