# Email Tenant Re-Match on Sync

Date: 2026-04-26

## Summary

Beim Klick auf "Synchronisieren" im Mail-Tab (sowie bei jedem Cron-Sync) werden
nicht mehr nur neu eingehende Mails gegen die Mieter-Adressen kategorisiert,
sondern alle bereits in der DB liegenden eingehenden Inbox-Mails des Accounts
neu aufgelöst. Damit erscheinen Mieter-Mails sofort kategorisiert, auch
unmittelbar nach Account-Erstanlage oder nachdem eine Mieter-Email-Adresse
nachträglich eingetragen wurde.

## Changes

- `apps/email/src/sync/tenant-matcher.ts`
  - Neue Funktion `rematchAccountEmails(accountId, userId)`.
  - Lädt einmalig `tenantEmails` JOIN `tenants` JOIN `rentalUnits` für den User
    in eine `Map<normalizedEmail, { tenantId, propertyId }>`.
  - Selektiert alle `emails` des Accounts mit `isInbound = true` aus Foldern
    mit `type = 'inbox'`.
  - Diff-Check pro Mail: führt nur dann ein `UPDATE` aus, wenn sich
    `tenantId` oder `propertyId` ändert (vermeidet unnötige Writes).
  - Liefert `{ updated, cleared }`.
- `apps/email/src/sync/email-sync.ts`
  - `SyncResult` um Feld `rematched: number` erweitert.
  - Aufruf von `rematchAccountEmails` nach der Folder-Sync-Schleife,
    in `try/catch` gewrappt — Fehler erhöhen `errors`, brechen den Sync nicht
    ab.
  - Logger gibt zusätzlich `rematched` aus.
- `apps/email/src/events/redis-events.ts`
  - `publishSyncComplete` akzeptiert optional `rematched` (Default 0) und
    propagiert es im Payload.
- `packages/shared/src/utils/redis.ts`
  - `EmailSyncCompletePayload` um optionales Feld `rematched?: number`
    erweitert (backwards-kompatibel).

## Decisions

- **Scope: alle eingehenden Inbox-Mails** (nicht nur `tenantId IS NULL`).
  Begründung: ermöglicht Korrektur bestehender Zuordnungen, wenn eine
  Mieter-Email geändert oder entfernt wird. Mit dem Diff-Check entstehen keine
  unnötigen Writes.
- **Trigger im `syncEmailAccount`** — wirkt automatisch sowohl bei
  `EMAIL_SYNC_REQUEST` (Button) als auch beim Cron-Lauf. Keine separate
  Mutation nötig.
- **Keine Schema-Änderung**: arbeitet rein auf bestehenden Spalten
  (`emails.tenantId`, `emails.propertyId`, `emails.isInbound`,
  `emailFolders.type`).
- **Sent/Drafts/Trash bleiben außen vor** (gleiches Kriterium wie der
  bestehende `matchSenderToTenant`).
- **`rematched` als optionales Payload-Feld**, damit ältere Subscriber
  (Next.js) ohne Anpassung weiterlaufen.

## Future Maintenance / Extensions

- Wenn die Anzahl Inbox-Mails pro Account stark wächst (>>1000), das
  Iterieren mit Einzel-`UPDATE` durch eine gruppierte Bulk-Update-Strategie
  ersetzen (z.B. `WHERE id IN (...)` pro Ziel-Tenant).
- Für Fuzzy-/Domain-Matching die Lookup-Map in `tenant-matcher.ts` erweitern;
  `rematchAccountEmails` kann die gleiche Logik wie `matchSenderToTenant`
  weiternutzen, wenn beide gemeinsam auf eine zentrale Resolver-Funktion
  umgestellt werden.
- Falls eine Re-Match-Statistik im UI gewünscht ist, das Feld `rematched`
  des `EMAIL_SYNC_COMPLETE`-Events im Next.js-Listener auswerten und in der
  Toast-Meldung "Sync abgeschlossen" mit anzeigen.

## Known Issues / Tech Debt

- Re-Match läuft auf jedem Cron-Tick. Für Accounts ohne Adressänderungen sind
  die Lese-Queries jedes Mal vorhanden (Diff-Check verhindert nur Writes).
  Bei Bedarf könnte ein Hash über `tenantEmails`-Zustand gecached werden, um
  Re-Match nur bei Änderungen auszuführen.
- Bestehende Limitierung des Initial-Fetch (max. 200 Mails pro Folder) ist
  unverändert. Re-Match wirkt nur auf bereits importierte Mails.
- Kein Re-Match für ausgehende Mails (Sent-Folder) — bestehende Architektur-
  Entscheidung.

## Verification

- `cmd /c "pnpm -r type-check"` — OK
- `cmd /c "pnpm -r lint"` — OK (nur pre-existing Warnings in `apps/nextjs`)
- `cmd /c "pnpm --filter @repo/email build"` — OK
- `cmd /c "pnpm --filter @repo/nextjs build"` — OK
