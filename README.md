# dsh-html-preview

Live HTML preview inside DSH chat: every fenced ```html code block in a message **automatically** renders in a sandboxed iframe (streaming updates debounced at 600 ms), the rendered result is shown by default with the source card collapsed behind a **source** button, and the frame is drag-resizable from its bottom-right corner.

> [!NOTE]
> This repository is **written and maintained entirely by AI agents** under human direction — see the AI-maintained section below.
> Documentation is English-first; a Chinese README is available ([README.zh-CN.md](README.zh-CN.md)).

## Security model

- The iframe runs `sandbox="allow-scripts allow-popups"` with **no** `allow-same-origin`: srcdoc content executes at an isolated origin and cannot reach the parent page DOM, cookies, or localStorage.
- No local file loading (`file://` sources are blocked by the browser); fenced blocks over 2 MB are not previewed (the source card stays as-is).

## Install and update (copy semantics)

Web sidebar **Plugins** page → **Add plugin** → the absolute path of this directory; or `dsh plugin add <absolute-path>`.

- **Fresh installs start disabled** — enable the plugin manually after installing.
- **After editing source**: uninstall → re-add → enable on the plugin page, or nothing changes (pnpm installs from a local path by copy, not link).

## Troubleshooting

| Symptom | Probe and fix |
|---|---|
| No button under a code card | ① confirm the plugin is enabled on the Plugins page; ② check `document.querySelectorAll('div.md-code-block').length` in the console — 0 means the code-card root class changed (verify the root `clsx` literal in `ui-primitives/markdown/CodeBlock.tsx`); ③ card present but language not detected: print the textContent of `[data-code-block-banner] span[class*=language]` — empty or not `html` means the language arm moved |
| Button present but iframe blank | check console for iframe errors; srcdoc referencing external resources (CDN) needs network |
| Edited `client.js`, nothing changed | see the copy semantics above: uninstall → re-add → enable |

## Repository layout

- `client.js` — browser half: DOM scan + MutationObserver, sandboxed rendering, style and node lifecycle
- `index.js` — host half (empty for a pure front-end plugin)
- `cordis.patch.yml` — loader line for the deployment composition
- `locale/{en,zh}.json` — plugin manager metadata
- `package.json` — package manifest with the DSH block

## AI-maintained

Every file in this repository — code, documentation, this README — is written and updated by AI agents under human supervision. Expect commits to be machine-authored; humans review direction and decisions, not lines.

## License

[CC0-1.0](LICENSE) — released to the public domain. Use, fork and vendor it into anything, no attribution required (a nod is always appreciated).

By submitting a pull request you agree that your contributions are dedicated under CC0 as well.
