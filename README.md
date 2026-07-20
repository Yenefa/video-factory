# Video Factory

An AI video-production pipeline. Each stage is a self-contained tool; together they turn raw research material into a finished MP4.

## 主流程（9 层）

| # | Stage | Purpose | Status |
|---|-------|---------|--------|
| ⓪ | **Fetch** | Actively harvest materials from the web (docs, papers, Reddit, blogs) | ✅ v1.0-20260720 |
| ① | **Collect (Raw)** | Gather all raw materials (container, also receives manual drops) | ✅ v1.0-20260720 |
| ② | **Research** | Distill credible knowledge | ✅ v1.0-20260720 (RAG topic, 48 sources -> research package) |
| ③ | **Script** | Turn knowledge into a narration script | 🔲 planned |
| ④ | **Visual Language** | Translate each abstract line into a visual expression (metaphor, diagram, flow, icon) | 🔲 planned |
| ⑤ | **Asset Planning** | List every asset this episode needs (SVG, icons, logos, illustrations, AI images) | 🔲 planned |
| ⑥ | **Storyboard** | Shot order, duration, transitions, pacing | 🔲 planned |
| ⑦ | **HyperFrames** | Auto-generate the HTML / CSS / GSAP animation engineering | 🔲 planned |
| ⑧ | **Render** | Export the MP4 | 🔲 planned |

## Textize（上方横切服务，不占层号）

Textize 是上方基础设施服务，作用点在 ① Raw 和 ② Research 之间：从 raw 取文件，文本化成干净 `.md`，从上方"箭头指下"喂给 research（及未来任何需要文本的层）。**它不是流程串联层，主流程 9 层不变。**

```
                    ┌─────────────────────────────────┐
                    │            Textize                │  ← 上方服务（不占层号）
                    │     raw 文件  ->  干净 .md 文本     │
                    │  · born-digital PDF  -> pypdf      │
                    │  · 扫描版 PDF / 图片 -> OCR/VLM     │
                    │  · HTML              -> 去噪提正文  │
                    │  · DOCX              -> 提取        │
                    └────────────────┬──────────────────┘
                                     │ 文本（.md）
                                     ↓ extracted/
  ⓪ Fetch  ->  ① Raw  ->  ② Research  ->  ③ Script  ->  ④ Visual  ->  …  ->  ⑧ Render
                                  ↑ 消费 extracted/，不再碰文件解析
```

- **Spec:** [`textize/README.md`](./textize/README.md)
- **Status:** v1.0-20260720 spec only. Scripts planned for v1.5. Interim: reuse `00-fetch/scripts/extract_pdf_text.py` for born-digital PDF pypdf extraction.

> **Layout note:** stage ⓪ (Fetch) lives in `00-fetch/`. Textize (上方服务) lives in `textize/` (no number - it's a service, not a flow stage). Stage ① (Collect) code lives at the repo root (`src/`, `src-tauri/`). When later stages arrive the tree will be reorganized into per-stage directories via `git mv`. **Versioning is Anthropic-style** (family / minor / date-stamp), see `docs/versioning.md`.

---

## Stage ⓪ - Fetch (资料抓取)

The upstream feeder. Given a topic, it actively harvests materials from the web (official docs, arxiv papers, Reddit, blogs, GitHub) and writes them into stage ① Collect's `raw/` directory. Fetch is the active harvester; Collect is the passive container.

- **Spec & overview:** [`00-fetch/README.md`](./00-fetch/README.md)
- **Lessons learned:** [`00-fetch/lessons-learned.md`](./00-fetch/lessons-learned.md)
- **Sources playbook:** [`00-fetch/sources-playbook.md`](./00-fetch/sources-playbook.md)
- **Scripts:** [`00-fetch/scripts/`](./00-fetch/scripts/)

**First run (2026-07-20, RAG topic):** 48 materials harvested - 13 official docs (.md) + 21 arxiv papers (.pdf) + 14 Reddit r/Rag posts (.md), 49 MB. Broke Reddit's 403 anti-bot wall with puppeteer + real Edge.

---

## Stage ① - Collect (Raw Material Collector)

A Windows-first desktop app that is the **container** for all raw materials - both those harvested by stage ⓪ Fetch and those the user manually drops/pastes.

It is a **container** - not a note app, not a knowledge base, not an AI app. No AI, no organization, no summaries, no classification, no dedup. You throw files in; Textize (上方服务) and ② Research process them later.

Built with **Tauri 2 + React + TypeScript + Tailwind CSS**.

### Features

**Topics** - each Topic = one video project or series. Unlimited topics.

**Per-topic workspace** - large "Drop anything here." drop zone; read-only file list; "Open folder" reveals the topic's raw folder in Explorer.

**Drag & drop** - Markdown, PDF, Word (.docx), TXT, HTML, images, and any unknown file (copied as-is, never modified, never renamed). Duplicates get a `-1`, `-2`, ... suffix; files are never overwritten. Folder drops are copied recursively, preserving structure.

**Paste (Ctrl+V)** - clipboard text -> `Clipboard-YYYY-MM-DD-HHMMSS.md`; clipboard image -> `.png`. Ignored while focus is in an input field.

**Quick Drop Mode** - top-right toggle that locks a topic as the default destination. While active, everything dropped or pasted goes straight in with no confirmation dialog.

**Delete** - hover a collected row to reveal its delete button; hover a topic in the sidebar to reveal its trash button (with a confirm dialog).

**Settings** - change the workspace root folder; theme light / dark / system.

**100% local** - no cloud, no database, no login, no sync. Files live on your disk; the app just reads and writes them.

### Storage layout

Default workspace root is configurable in Settings. Each topic is a directory; every collected file lands in that topic's `raw\` subfolder, byte-for-byte identical to the source.

```
<workspace root>\
  <Topic Name>\
    raw\           ← stage ⓪ Fetch writes here; stage ① Collect also drops here
      <original files, untouched>
    extracted\     ← Textize writes here (clean .md) - 上方服务输出
    research\      ← stage ② Research writes here (research package)
```

### Prerequisites

- **Node.js 18+** (developed on v24) and **npm**.
- **Rust toolchain** (`stable-msvc`) via [rustup](https://rustup.rs).
- **Microsoft Visual C++ Build Tools** - MSVC C++ workload.
- **Microsoft Edge WebView2 Runtime** - preinstalled on Windows 11.

### Install & run

```bash
npm install          # install frontend deps
npm run tauri:dev    # run the desktop app in dev mode (vite on :1420 + rust)
```

### Build a distributable

```bash
npm run tauri:build  # produces an installer under src-tauri/target/release/bundle/
```

### Project structure

```
├── 00-fetch/              ← stage ⓪ (Fetch workflow)
├── textize/               ← 上方服务（Textize spec，scripts TBD）- 无编号
├── package.json           ← stage ① (Collect app)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── index.html
├── src\
│   ├── main.tsx
│   ├── App.tsx
│   ├── components\
│   ├── store\
│   ├── lib\
│   ├── hooks\
│   ├── types\
│   └── styles\
├── src-tauri\
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities\
│   ├── src\
│   │   └── lib.rs
│   └── icons\
└── docs\
    ├── PLANNING.md        ← full project planning (2026-07-20 snapshot)
    ├── versioning.md      ← Anthropic-style versioning policy
    ├── research-agent-spec-v1.0.md   ← stage ② spec
    └── superpowers\
        └── specs\
```

### Architecture notes

- **Filesystem is the single source of truth.** The topic list is derived by scanning the workspace directory - there is no metadata database.
- **All file operations are Rust commands** (copy with collision handling, recursive folder copy, save text/image, list, delete). The React frontend calls them via Tauri's `invoke`.
- **State** is managed with [Zustand](https://github.com/pmndrs/zustand); user settings are persisted via `tauri-plugin-store` in AppData.
- **Reserved extension point:** `src/lib/pipeline.ts` (planned, not implemented) - future stages will read `<workspace>/<Topic>/raw/*` from here.

### Raw philosophy (invariants)

- Never modify user files.
- Never rename.
- Never summarize.
- Never classify.
- Never organize.
- Never delete duplicates.

The app is a **container only**.

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+V` | Paste clipboard into the current / Quick-Drop topic (text -> `.md`, image -> `.png`) |
| `Enter`  | Confirm dialogs |
| `Esc`    | Close dialogs |
