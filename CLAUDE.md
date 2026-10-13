# CLAUDE.md

Guidance for working in this repository.

## What this is

`dumi-plugin-mermaid` renders ` ```mermaid ` code fences in dumi@2 docs as live
Mermaid diagrams at runtime (no build-time/headless screenshot rendering).

Single package, built with [father](https://github.com/umijs/father); `playground/`
is a pnpm workspace member holding the dumi docs site.

## Commands

Run from the repo root:

```bash
pnpm install              # postinstall runs `husky install && father build`
pnpm test                 # vitest watch (use `pnpm exec vitest run` for one-shot)
pnpm run test:coverage
pnpm run type-check       # tsc -p tsconfig-check.json, noEmit
pnpm run lint             # eslint over src + tests
pnpm run build            # father build -> lib/ (cjs) + es/ (esm + d.ts)
pnpm run dev              # dumi dev server for playground/
pnpm run docs:build       # dumi build -> .doc/
pnpm run ci               # lint + type-check + doctor + build (what CI runs)
```

There is no single-test-by-name script; use `pnpm exec vitest run tests/rehypePlugin.test.ts`
or `-t '<name>'`.

## Architecture

The pipeline is three stages, split between build time (remark/rehype) and browser
runtime (React components).

1. **`src/core/remarkPlugin.ts`** — mdast pass. Matches `code` nodes with
   `lang === 'mermaid'` and replaces them with a raw HTML placeholder
   `<pre data-dumi-mermaid>source</pre>` (source is HTML-escaped).
   Exports the shared constants `MERMAID_MARKER_ATTR` (`data-dumi-mermaid`),
   `MERMAID_MARKER_PROP` (hast camelCase form `dataDumiMermaid`),
   `MERMAID_LANG`, and `hasMermaidMarker()`.
   It runs _before_ dumi rewrites `<pre><code>` into `<SourceCode>`, which is why
   it emits a plain `<pre>` rather than a `code` node.

2. **`src/core/rehypePlugin.ts`** — hast pass. Finds elements carrying the marker
   and swaps them for a `<DumiPluginMermaid />` element, passing `code` and the
   optional serialized `mermaidConfig` via `JSXAttributes`.

3. **`src/component/*`** — the runtime React implementation.

`src/index.ts` is the dumi plugin entry: it aliases
`dumi-plugin-mermaid/component` to the built `es/component/index.js`, prepends both
plugins to `extraRemarkPlugins` / `extraRehypePlugins`, and registers
`DumiPluginMermaid` as a dumi builtin (via `modifyTheme`).

### Components (`src/component/`)

- `Mermaid` — renders only the diagram, no controls. Shares the three-state body
  (svg / loading / error) with `MermaidViewer` via `Mermaid/MermaidBody.tsx`, and
  fires `onRender(serializedSvg)` through `useOnRender`.
- `MermaidViewer` — **the interactive chart**: `MermaidBody` + overlay controls +
  modal. Props `toolbar` and `panZoom` (both default `true`) turn the two control
  groups off independently.
- `MermaidToggle` — toolbar with Preview/Code tabs; the Preview branch renders
  `MermaidViewer`. **This is the package default export** (i.e. what the builtin
  resolves to).
- `MermaidModal` — zero-dependency portal modal: Esc, mask click, Tab trap, focus
  restore, body scroll lock with scrollbar-width compensation.
- `MermaidSource` — source view; applies `prismjs` mermaid highlighting and
  delegates to dumi's `SourceCode` builtin so the site theme controls styling.
- `MermaidViewer/Stage.tsx` — viewport + the pan/zoom transform state (each `Stage`
  instance owns its own state, so the modal is independent from the inline view).
- `MermaidViewer/Controls.tsx` — top-right tool group and the bottom-right 3×3
  pan/zoom pad, both built on a shared `IconButton`.
- `useMermaid` — dynamic-imports mermaid and returns `{ svg, error, loading }`.
- `useColorScheme` — reads `data-prefers-color` on `<html>` and watches it with a
  `MutationObserver`, so diagrams follow dumi's light/dark toggle.
- `useCopyDiagram` + `clipboard.ts` — copy the **mermaid source** / a PNG image to the
  clipboard, with download fallback and a temporary "Copied!"/`Downloaded` bubble.
- `transform.ts`, `svg.ts` — dependency-free pure helpers (pan/zoom math; SVG
  string normalization), the only parts covered by unit tests.

`src/component/index.ts` is the `dumi-plugin-mermaid/component` entry point.

## Conventions and gotchas

- **Everything user-visible is Chinese-commented and documented in Chinese**;
  match that when touching `src/`, README, and `playground/docs/`.
- Commits must follow Conventional Commits (`@commitlint/config-conventional`);
  releases are automated by semantic-release on `master`/`beta`.
- `mermaidConfig` must stay JSON-serializable — it crosses the remark/rehype
  boundary as an attribute string, not a live object.
- The marker is emitted as raw HTML and consumed in hast, so it appears in _both_
  kebab-case and camelCase forms; always use `hasMermaidMarker()` rather than
  checking one spelling.
- `.less` files zero out outer specificity with `:where()` on purpose, so themes
  can override; keep inner selectors specific.
- **Keep a stylesheet in the module that renders the markup it styles.** `package.json`
  declares `sideEffects: ["**/*.less"]`, so an unreferenced component module gets
  dropped _together with its stylesheet import_. `Mermaid/index.less` was silently
  tree-shaken away once `MermaidToggle` stopped importing `Mermaid`: the diagram lost
  its centering and padding and fell back to `display: inline`, flush left. Chart-body
  styles therefore live in `Mermaid/MermaidBody.less`, beside the component that
  renders `.dumi-plugin-mermaid` (reached by both `Mermaid` and `Stage`).
- `es/` and `lib/` are build artifacts and gitignored. The plugin aliases
  `es/component/index.js` at runtime, so `pnpm run build` must run before the
  playground (or the published plugin) reflects component changes.
- `father` emits the component bundle at `es/component` via an `overrides` entry in
  `.fatherrc.ts` to match the `./component` export map.
- mermaid defaults to `useMaxWidth: true`, so the root `<svg>` carries
  `width="100%" style="max-width: {natural}px"`. The inline view keeps that (so the
  diagram never blows past its natural size); the modal and every export path strip
  it via `svg.ts` — inline styles beat CSS, so this **must** be done in JS, not with
  a stylesheet rule.
- **Never rasterize the SVG through a `blob:` (or same-origin) URL.** Chrome treats
  "SVG image loaded from blob/same-origin URL that contains `<foreignObject>`" as
  not origin-clean and taints the canvas, making `toBlob` throw `SecurityError`.
  mermaid puts labels in `foreignObject` for flowchart / journey / mindmap / class /
  state / ER / block — measured 7 of 17 diagram types. A `data:` URL does **not**
  taint; `clipboard.ts` uses one. `htmlLabels: false` also works but only for 6 of
  those 7 (journey hardcodes it), and the `%%{init}%%` directive is silently
  ignored, so neither is a substitute.
- Wheel zoom is deliberately **Ctrl/Cmd + wheel only**; plain wheel must keep
  scrolling the document. Pointer drag ignores `pointerType === 'touch'` so mobile
  page scrolling still works.

## Testing notes

- `vitest.config.ts` aliases `dumi-plugin-mermaid` -> `src`, plus two dumi theme
  modules to lightweight stubs in `tests/mocks/` (`SourceCode`, `Loading`) because
  the real ones need dumi's build/runtime context. If you import another
  `dumi/theme/*` module in `src`, add a matching alias and stub.
- Core plugins are tested as plain functions over hand-built trees, no dumi needed.
  Component tests only assert the export surface (`tests/__snapshots__/`);
  update snapshots with `pnpm run test:unit:update` when exports change.
