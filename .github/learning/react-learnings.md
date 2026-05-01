# React Learnings

## React Compiler ESLint Rules (Next.js 16)

**Timestamp:** 2026-04-24 22:15

Next.js 16 ships with `eslint-config-next/core-web-vitals` containing React Compiler rules
even when the compiler itself is NOT enabled in `next.config.ts`. Two common rules that fire:

### `react-hooks/preserve-manual-memoization`

- **Trigger:** Manual `useCallback` / `useMemo` deps arrays that don't match the compiler's inferred deps.
- **Example error:** "Inferred dependency was `setDraftWidgets`, but source dependencies were `[scheduleSave]`".
- **Fix options:**
  1. Remove manual memoization (let compiler handle) — only safe when compiler is enabled.
  2. Refactor closures to match inferred deps.
  3. `// eslint-disable-next-line react-hooks/preserve-manual-memoization` BEFORE the callback/memo start (NOT before deps array) with justification.
- **Gotcha:** The disable comment must be placed BEFORE the `useCallback(` line — placing it before the deps array makes it an "unused directive".

### `react-hooks/incompatible-library`

- **Trigger:** Using libraries that return non-memoizable functions (e.g. React Hook Form's `watch()`).
- **Affected APIs:** RHF `useForm().watch`, `form.watch()` — inline in JSX or at component top-level.
- **Fix options:**
  1. Switch to `useWatch({ control, name })` — idiomatic, compiler-compatible.
  2. `// eslint-disable-next-line react-hooks/incompatible-library` with justification.
- **Decision:** For many existing forms, disable is pragmatic. For new forms, prefer `useWatch`.

## ESLint `_`-Prefix Convention

**Timestamp:** 2026-04-24 22:15

Default `@typescript-eslint/no-unused-vars` does NOT ignore `_`-prefixed identifiers.
Add this to `eslint.config.mjs` to follow TypeScript convention:

```js
{
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      },
    ],
  },
}
```

This fixes all `_props`-style intentionally-unused parameters and eliminates need for per-line disables.

## React Compiler Form Initialization

**Timestamp:** 2026-05-01 23:57

- `react-hooks/set-state-in-effect` fires when forms copy query data into local state inside `useEffect`.
- Prefer derived state from server data plus small user override states, or a keyed uncontrolled `<form>` with `defaultValue` and `FormData` submit handling.
- Avoid broad disable comments: React Compiler often reports unused disables after a refactor.
- `Date.now()` during component render is flagged as an impure call. Move default date logic into a lazy `useState` initializer helper, e.g. `useState(getDefaultDateString)`.

## `<img>` in Next.js App Router

**Timestamp:** 2026-04-24 22:15

- `@next/next/no-img-element` fires on ALL `<img>` tags.
- `next/image` requires configured `remotePatterns` for remote sources OR `unoptimized` flag.
- **Legitimate `<img>` cases (disable with justification):**
  - Dynamic user-uploaded content via internal API routes (`/api/uploads/*`, `/api/share/*`)
  - Client-side Blob-URL previews (before upload)
  - Runtime-transformed images (zoom, custom CSS transforms)
- **Use `next/image` for:** Static bundled assets, known-size remote images from allowed domains.
