# Hand-Off: Post-Mac-Sync Lint Cleanup

**Datum:** 2026-04-24
**Domain:** apps/nextjs — Cross-Platform Setup + React Compiler Rules

## Summary

Nach Sync eines größeren Mac-Commits (Next.js 16 Upgrade inkl. React Compiler ESLint-Rules) waren auf Windows folgende Probleme aufgetreten:

1. **`Module not found: 'jose'`** beim `make dev` Start — fehlende `node_modules` nach `git pull`.
2. **2 ESLint-Errors** in `apps/nextjs/src/app/(app)/dashboard/page.tsx` durch die neue `react-hooks/preserve-manual-memoization` Rule.
3. **30 ESLint-Warnings** (unused `_props`, `<img>`-Element, RHF `watch()` Incompatibility).

Nach den Fixes: `make format && make type-check && make lint && make build && pnpm test` alle grün. 83/83 Tests passed.

## Key Decisions

### 1. Dependency Install statt Config-Änderung

- Root cause war nur `pnpm install` — keine Änderung an `package.json`/`pnpm-lock.yaml` nötig. Native Module (`argon2`, `web-push`) bauen auf Windows ohne Probleme.

### 2. ESLint-Config: `_`-Prefix Convention aktiviert

- Statt 11 `_props`-Warnings einzeln zu fixen oder die Parameter zu entfernen, wurde `@typescript-eslint/no-unused-vars` mit `argsIgnorePattern: "^_"` / `varsIgnorePattern: "^_"` konfiguriert. Dies folgt TypeScript-Standardkonvention und zukunftssicher für weitere Widgets.
- Datei: [apps/nextjs/eslint.config.mjs](../../apps/nextjs/eslint.config.mjs)

### 3. React Compiler Rules: eslint-disable statt Refactor

- **`react-hooks/preserve-manual-memoization`** (2× in `dashboard/page.tsx`): Die betroffenen `useCallback`-Blöcke nutzen Stable-Refs (`widgetsRef`, `activeRef`) als bewusstes Pattern für das Autosave-Flow. Ein Refactor zum Compiler-kompatiblen Pattern hätte die Debouncing-/Flush-Semantik gebrochen.
- **`react-hooks/incompatible-library`** (6× mit RHF `watch()`): RHF's `watch()` gibt Non-memoizable Funktionen zurück — bekanntes React-Compiler-Limit, dokumentiert in offiziellen Docs. Alternative (`useWatch`) hätte größeren Refactor in 6 Forms erfordert ohne funktionalen Gewinn.
- Lösung: Lokale `eslint-disable-next-line` Kommentare mit **inline Begründung** (nicht nur Rule-Name).
- **Wichtig:** Disable muss VOR dem `useCallback`-Start stehen, nicht vor dem Deps-Array.

### 4. `<img>` → kein `next/image`-Refactor

- Alle 8 `<img>`-Stellen laden entweder:
  - **Interne API-Routen** (`/api/uploads/*`, `/api/share/*`) für User-Uploads
  - **Blob-URLs** (Client-seitige Upload-Previews)
  - **Runtime-zoom-transformierte** Images (Document-Preview mit `transform: scale()`)
- `next/image` würde `remotePatterns`-Konfiguration ODER `unoptimized`-Flag erfordern und bei Blob-URLs / Transforms keine Vorteile bringen.
- Lösung: `eslint-disable-next-line @next/next/no-img-element` pro Stelle mit Kontext-Kommentar.

## Changed Files

**Config**

- `apps/nextjs/eslint.config.mjs` — `^_` Ignore-Pattern für unused-vars

**Dashboard Errors**

- `apps/nextjs/src/app/(app)/dashboard/page.tsx` — 2× preserve-manual-memoization disable

**Dead Code Removal**

- `apps/nextjs/src/app/(app)/properties/[id]/page.tsx` — `updateMutation` + `utils` entfernt
- `apps/nextjs/src/app/(app)/properties/page.tsx` — `Badge`-Import entfernt
- `apps/nextjs/src/components/dashboard/widgets/kpi-bar-widget.tsx` — `Card, CardContent`-Import entfernt
- `apps/nextjs/src/server/routers/properties.ts` — 4× redundante eslint-disable-line entfernt (durch neue Config abgedeckt)

**`<img>` Disables (8×)**

- `apps/nextjs/src/app/(app)/properties/page.tsx`
- `apps/nextjs/src/app/share/[token]/page.tsx`
- `apps/nextjs/src/components/app-shell.tsx` (2×)
- `apps/nextjs/src/components/documents/document-preview.tsx`
- `apps/nextjs/src/components/properties/property-card.tsx`
- `apps/nextjs/src/components/properties/thumbnail-upload.tsx`
- `apps/nextjs/src/components/settings/profile-section.tsx`

**RHF `watch()` Disables (6×)**

- `apps/nextjs/src/components/properties/add-property-wizard.tsx`
- `apps/nextjs/src/components/properties/edit-property-dialog.tsx`
- `apps/nextjs/src/components/properties/expenses-section.tsx`
- `apps/nextjs/src/components/tenants/add-tenant-dialog.tsx`
- `apps/nextjs/src/components/tenants/edit-tenant-dialog.tsx`

## Maintenance Notes

### Wenn React Compiler später in `next.config.ts` aktiviert wird

- Die `preserve-manual-memoization` disables in `dashboard/page.tsx` sollten mit Compiler-Aktivierung re-evaluiert werden: entweder `useCallback` ganz entfernen (Compiler übernimmt Memoization) oder auf Non-Ref-basierte Closures refactoren.

### Wenn neue `<img>` Tags hinzukommen

- **User-Uploads / Dynamic URLs:** eslint-disable + Begründungs-Kommentar.
- **Statische Assets (Logo, Icons):** `next/image` verwenden.

### Wenn neue Forms mit RHF hinzukommen

- Bei einfachem `watch("field")` als Select-Value: eslint-disable mit Referenz auf dieses Hand-off.
- Bei komplexem State-derived Logic: `useWatch({ control, name })` als idiomatischer Fix erwägen.

## Known Issues / Technical Debt

1. **React Compiler nicht explizit aktiviert:** `next.config.ts` hat kein `reactCompiler`-Flag. Rules sind aktiv, Compiler nicht. Sollte klargestellt/konsolidiert werden.
2. **RHF `watch()`-Pattern durchzieht die Forms:** Bei größerem Forms-Refactor sollte global auf `useWatch` umgestellt werden.
3. **`<img>` vs `next/image`:** Keine Optimierungs-Pipeline für User-Uploads. LCP/Bandwidth suboptimal — für Production sollte ein Image-Proxy/CDN mit `next/image` `loader` erwogen werden.

## Verification

- `make format` ✓
- `make type-check` ✓ (4/5 projects)
- `make lint` ✓ (0 errors, 0 warnings)
- `make build` ✓ (Next.js standalone)
- `pnpm --filter @repo/shared test` ✓ (83/83)
