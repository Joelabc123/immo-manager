# 2026-05-01 — AI Reply: Tenant Context, Signature & Overwrite Popup

## Summary

Erweiterung des Gemini-basierten E-Mail-Reply-Workflows um personalisierte
Anrede und Schlussformel sowie Ablösung des nativen `window.confirm()` durch
ein eigenes Popup. Zusätzlich Komplett-Fix der transliterierten Umlaute in der
deutschen i18n-Datei.

## Changes

### Backend (Gemini Prompt)

- [`apps/nextjs/src/server/routers/ai.ts`](../../apps/nextjs/src/server/routers/ai.ts)
  - `loadOwnedEmail` führt jetzt einen `leftJoin` auf `tenants` aus und
    liefert `tenantId`, `firstName`, `lastName`, `gender` mit.
  - Neue Hilfsfunktion `loadEmailSignature(userId)` lädt die `emailSignature`
    aus `users` (nicht im JWT enthalten, daher Extra-Query).
  - `generateReply`-Procedure übergibt `tenant`, `signatureName`,
    `signatureBlock` an den AI-Service.

- [`apps/nextjs/src/server/services/ai.ts`](../../apps/nextjs/src/server/services/ai.ts)
  - `GenerateReplyInput` um `tenant`, `signatureBlock` erweitert.
  - Neue `TONE_CLOSING`-Map: pro Tone Schlussformel auf Deutsch und Englisch
    (formal: „Mit freundlichen Grüßen" / „Best regards", friendly: „Liebe
    Grüße" / „Kind regards", short: „Grüße" / „Regards").
  - Prompt-Body enthält jetzt:
    - Recipient-Block mit Tenant-Name + Gender-Hint, oder generischer Hinweis
      bei unbekanntem Empfänger.
    - Explizite Sprach-Detection-Anweisung (Sprache der Quell-Mail
      erkennen, in dieser antworten, Default Deutsch).
    - Tone-spezifische Schlussformel + Signaturblock (`emailSignature` aus
      Settings, Fallback `user.name`).

### Frontend (Overwrite-Popup)

- [`apps/nextjs/src/components/ai/ai-overwrite-popover.tsx`](../../apps/nextjs/src/components/ai/ai-overwrite-popover.tsx) — neue Komponente.
  Render-Prop-API: `children({onClick}) => ReactNode`. Wenn `hasContent` falsch
  ist, ruft `onClick` direkt `onConfirm` auf; sonst öffnet ein an den Trigger
  geankertes Base-UI-Popover mit „Überschreiben" (destructive) /
  „Abbrechen".

- [`apps/nextjs/src/components/tasks/task-dialog.tsx`](../../apps/nextjs/src/components/tasks/task-dialog.tsx)
  - `window.confirm()` für AI-Generierung entfernt.
  - `AiGenerateButton` ist jetzt in `<AiOverwritePopover>` gewrappt; öffnet
    Popover wenn Titel oder Beschreibung gefüllt sind.

- [`apps/nextjs/src/components/mail/reply-editor.tsx`](../../apps/nextjs/src/components/mail/reply-editor.tsx)
  - Tone-Auswahl im Dropdown setzt jetzt `pendingTone`-State und öffnet einen
    kleinen Dialog (statt stillschweigend zu überschreiben). Erst nach
    Bestätigung wird die KI gerufen.

### i18n

- [`apps/nextjs/messages/de.json`](../../apps/nextjs/messages/de.json):
  Komplett-Fix transliterierter Umlaute (`Foermlich` → `Förmlich`,
  `ueberschreiben` → `überschreiben`, `loeschen` → `löschen`, `Faellig` →
  `Fällig`, `Prioritaet` → `Priorität`, `Anhaenge` → `Anhänge`, `Strasse` →
  `Straße`, `Gruessen` → `Grüßen`, …) sowie neue Keys `ai.overwriteTitle`,
  `ai.overwriteAction`, `ai.cancel` in `tasks.ai` und `email.ai`.

- [`apps/nextjs/messages/en.json`](../../apps/nextjs/messages/en.json):
  Gleiche neuen Keys ergänzt.

## Decisions

1. **Tenant-Anrede via Prompt-Kontext, nicht Hardcoding.**
   Tenants haben kein `salutation`-Feld; daher gehen Vorname + Nachname +
   Gender als Hint in den Prompt, und die KI formuliert die Anrede passend
   zur Tone und Sprache der eingehenden E-Mail.

2. **`emailSignature` nicht im JWT.**
   Stattdessen Extra-DB-Query in der Procedure. Vermeidet das Aufblähen aller
   Access-Tokens für ein Feld, das nur beim AI-Reply gebraucht wird.

3. **Reply-Editor: Dialog statt Popover.**
   Da das Bestätigen erst _nach_ Schließen des Tone-Dropdowns ausgelöst wird,
   gibt es keinen natürlichen Anker für ein Popover. Ein kleiner Dialog wirkt
   konsistenter. Im Task-Dialog ist die Quelle der Aktion direkt der
   AI-Button — dort wird das Popover am Button geankert.

4. **Sprach-Detection delegiert an Gemini.**
   Quellsprache wird im Prompt explizit detektiert und als `language`-Feld
   im Response-Schema zurückgeliefert. Default Deutsch bei Mehrdeutigkeit.

5. **Umlaut-Fix per Python-Script + JSON-Walk auf Werten.**
   Sicheres Vorgehen: nur String-VALUES werden ersetzt, JSON-Keys (englische
   camelCase-Identifier) bleiben unangetastet. Curated Word-Map vermeidet
   Falsch-Treffer (z.B. wird `address` nicht zu `addreß`).

## Root Cause: Transliterated Umlauts

Datei war ohne BOM in UTF-8 gespeichert. Vorherige Edits hatten Umlaute
manuell transliteriert (`Foermlich`, `ueberschreiben` etc.) — vermutlich als
Workaround gegen Windows-PowerShell-Default-Codepage-Probleme bei früheren
Edits via Terminal. Ursache der Datei selbst ist sauber; einmaliger Fix
behebt die Anzeige. Empfehlung: zukünftige Edits an `de.json` über VS-Code
oder mit explizitem `-Encoding UTF8` durchführen.

## Future Work

- Andere `window.confirm()`-Aufrufe (`task-dialog#L228`, `tasks/page#L107`,
  `tasks-widget#L165`, `dashboard/page#L277`) ebenfalls durch ein
  wiederverwendbares Confirm-Dialog ersetzen.
- Property-Adresse + Thread-History in den Reply-Prompt aufnehmen für noch
  präzisere Antworten.
- Tenant-Kontext auch im `generateTaskFromEmail`-Prompt verwenden, damit
  Aufgabenbeschreibungen den Mieternamen direkt referenzieren.

## Maintenance

- Bei Schema-Änderung an `tenants` (neue Anrede-/Gender-Felder) entsprechend
  in [`ai.ts`](../../apps/nextjs/src/server/routers/ai.ts) `loadOwnedEmail`
  und im Prompt-Builder in [`services/ai.ts`](../../apps/nextjs/src/server/services/ai.ts)
  nachziehen.
- Neue Tones erfordern Erweiterung von `TONE_INSTRUCTIONS` _und_
  `TONE_CLOSING` (jeweils mit `de`+`en`).

## Verification

- `cmd /c "pnpm --filter @repo/nextjs type-check"` — passes
- `cmd /c "pnpm --filter @repo/nextjs lint"` — 0 Errors (4 pre-existing
  unused-import warnings in unrelated files)
- `cmd /c "pnpm --filter @repo/nextjs build"` — Compiled successfully
- Prettier auf allen geänderten Dateien angewendet
