# Copilot Instructions — rego-tutorial

## Project Overview

This is an interactive Rego tutorial website built with **VitePress** (Markdown-driven static site generator) and **Killercoda** (cloud sandbox provider). The tutorial content is written in Chinese (zh-CN).

- **Frontend**: VitePress site under `docs/`, deployed to GitHub Pages via GitHub Actions.
- **Sandbox scenarios**: Killercoda scenario definitions under `rego-tutorial/`, each providing a real Linux terminal with conftest pre-installed.
- **CI/CD**: `.github/workflows/deploy.yml` — pushes to `main` trigger `npm run build` → deploy to GitHub Pages.

## Repository Structure

```
docs/                              # VitePress content (Markdown files)
  index.md                         # Homepage (layout: home), NOT a tutorial chapter
  .vitepress/
    config.mjs                     # VitePress config (sidebar auto-managed)
    theme/index.js                 # Custom theme — registers global Vue components
    components/
      KillercodaEmbed.vue          # <KillercodaEmbed> component (link button, NOT iframe)

rego-tutorial/                     # Killercoda scenario definitions
  structure.json                   # Lists all scenarios for Killercoda discovery
  <scenario-name>/                 # One directory per scenario
    index.json                     # Scenario metadata, step list, asset mapping
    init/
      background.sh                # Silent setup (sources setup-common.sh, seeds files)
      foreground.sh                # User-facing progress messages
      init.md                      # Intro page shown before Step 1
    step1/text.md                  # Each step is a directory with text.md
    finish/finish.md               # Completion page
    assets/
      setup-common.sh              # AUTO-GENERATED — do not edit
      *.rego                       # Rego policy files
      *.tf / *.yaml / Dockerfile   # Config files to be tested by conftest

scripts/
  setup-common.sh                  # Shared setup functions (SOURCE OF TRUTH)
  sync-setup-common.mjs            # Copies setup-common.sh into every scenario's assets/
  sync-sidebar.mjs                 # Auto-generates sidebar from docs/*.md frontmatter

.github/workflows/deploy.yml      # GitHub Pages deployment pipeline
```

## Key Conventions

### Adding a New Tutorial Chapter

Every tutorial chapter MUST have a corresponding Killercoda hands-on scenario under `rego-tutorial/`. The tutorial page (`docs/<slug>.md`) provides the reading material, and the Killercoda scenario provides the interactive lab environment. They always come in pairs — do NOT create a tutorial chapter without its Killercoda scenario, and vice versa.

1. Create `docs/<slug>.md` with required frontmatter:
   ```markdown
   ---
   order: <number>       # Sidebar sort order (lower = higher)
   title: <display text> # Sidebar label (falls back to first H1 heading)
   ---
   ```
   **File naming**: Do NOT put sequence numbers in the filename (e.g. use `rules-and-assignment.md`, NOT `01-rules-and-assignment.md`). Chapter ordering is controlled solely by the `order` field in frontmatter.
2. Create the matching Killercoda scenario under `rego-tutorial/<scenario-name>/` (see "Adding a New Killercoda Scenario" below).
3. Link to the sandbox in the tutorial page:
   ```markdown
   <KillercodaEmbed src="https://killercoda.com/<account>/course/rego-tutorial/<SCENARIO_NAME>" />
   ```
4. Run `npm run sync-sidebar` (or it runs automatically during `npm run build` via the `prebuild` hook).

### Adding a New Killercoda Scenario

1. Create a new directory under `rego-tutorial/<scenario-name>/`.
2. Add the scenario to `rego-tutorial/structure.json`.
3. Every scenario MUST use the standard directory layout (init/, step*/, finish/, assets/).
4. The `init/background.sh` should source `/root/setup-common.sh` and call shared functions.
5. The `init/foreground.sh` polls `while [ ! -f /tmp/.setup-done ]` and prints progress messages.

#### Scenario Directory Layout

Reference: [terraform-tutorial scenarios](https://github.com/lonegunmanb/terraform-tutorial/tree/main/terraform-tutorial)

```
rego-tutorial/<scenario-name>/
  index.json                     # Scenario metadata, step list, asset mapping
  init/
    background.sh                # Silent setup (sources setup-common.sh, seeds files)
    foreground.sh                # User-facing progress messages
    init.md                      # Intro page shown before Step 1
  step1/text.md                  # Each step is a directory with text.md
  step2/text.md
  ...
  finish/finish.md               # Completion page
  assets/
    setup-common.sh              # AUTO-GENERATED — do not edit
    *.rego                       # Rego policy files
    *.tf / *.yaml / Dockerfile   # Config files to be tested by conftest
```

#### `index.json` Template

```json
{
  "title": "场景标题（中文）",
  "description": "场景描述（中文）",
  "details": {
    "intro": {
      "text": "init/init.md",
      "background": "init/background.sh",
      "foreground": "init/foreground.sh"
    },
    "steps": [
      { "title": "步骤标题", "text": "step1/text.md" }
    ],
    "finish": {
      "text": "finish/finish.md"
    },
    "assets": {
      "host01": [
        { "file": "setup-common.sh", "target": "/root", "chmod": "+x" },
        { "file": "example.rego", "target": "/root/workspace" }
      ]
    }
  },
  "backend": {
    "imageid": "ubuntu"
  },
  "interface": {
    "layout": "editor-terminal"
  }
}
```

#### `background.sh` Pattern

```bash
#!/bin/bash
exec > /tmp/background.log 2>&1
set -x

source /root/setup-common.sh

# Seed workspace files (fallback if assets copy fails)
mkdir -p /root/workspace
cd /root/workspace

# ... inline heredocs to seed .rego / config files ...

install_conftest      # always needed
# install_opa         # only if scenario needs standalone OPA
finish_setup          # MUST be called last — touches /tmp/.setup-done
```

#### `foreground.sh` Pattern

```bash
#!/bin/bash

echo "========================================="
echo "  正在为你准备实验环境..."
echo "  请稍候，预计需要 15-30 秒"
echo "========================================="

while [ ! -f /tmp/.setup-done ]; do
  sleep 2
  echo "⏳ 环境初始化中..."
done

echo ""
echo "✅ 环境准备就绪！"
echo ""
echo "👉 进入工作目录开始实验：cd /root/workspace"
echo ""
```

### Shared Setup Script (`setup-common.sh`)

- **Source of truth**: `scripts/setup-common.sh` — edit ONLY this file.
- **Auto-copied**: `scripts/sync-setup-common.mjs` copies it into every scenario's `assets/`.
- Available functions: `install_conftest`, `install_opa`, `finish_setup`.
- `install_conftest` installs the conftest binary for policy testing.
- `install_opa` installs the standalone OPA binary (optional, for scenarios that need it).
- Versions can be overridden via env vars: `CONFTEST_VERSION`, `OPA_VERSION`.
- Do NOT edit `rego-tutorial/*/assets/setup-common.sh` directly.

### Sidebar Auto-Sync

- The sidebar in `config.mjs` is managed by `scripts/sync-sidebar.mjs`.
- The managed region is delimited by `// @auto-sidebar-start` and `// @auto-sidebar-end`.
- Do NOT remove or modify these markers.

## Build & Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start VitePress dev server with hot reload |
| `npm run build` | Production build (auto-runs prebuild: sidebar sync + setup sync) |
| `npm run preview` | Preview the production build locally |
| `npm run sync-sidebar` | Manually sync sidebar config from `docs/*.md` frontmatter |
| `npm run sync-setup` | Manually copy `scripts/setup-common.sh` into every scenario's `assets/` |

## Things to Avoid

- Do NOT edit the sidebar block in `config.mjs` by hand.
- Do NOT remove the `// @auto-sidebar-start` / `// @auto-sidebar-end` markers.
- Do NOT use `docker-compose` (v1) — use `docker compose` (v2 plugin) instead.
- Do NOT skip the `touch /tmp/.setup-done` signal at the end of `background.sh`.
- Do NOT use flat step files (`step1.md`) — must be `step1/text.md` directory format.
- Do NOT edit `rego-tutorial/*/assets/setup-common.sh` directly — it is auto-generated.
