# Video Factory

An 8-stage AI video-production pipeline. Each stage is a self-contained tool; together they turn raw research material into a finished MP4.

| # | Stage | Purpose | Status |
|---|-------|---------|--------|
| ① | **Collect** | Gather all raw materials | ✅ done · 2026-07-20 |
| ② | **Research** | Distill credible knowledge | 🔲 planned |
| ③ | **Script** | Turn knowledge into a narration script | 🔲 planned |
| ④ | **Visual Language** | Translate each abstract line into a visual expression (metaphor, diagram, flow, icon) | 🔲 planned |
| ⑤ | **Asset Planning** | List every asset this episode needs (SVG, icons, logos, illustrations, AI images) | 🔲 planned |
| ⑥ | **Storyboard** | Shot order, duration, transitions, pacing | 🔲 planned |
| ⑦ | **HyperFrames** | Auto-generate the HTML / CSS / GSAP animation engineering | 🔲 planned |
| ⑧ | **Render** | Export the MP4 | 🔲 planned |

> **Layout note:** the repo root currently holds stage ①. When later stages arrive the tree will be reorganized into per-stage directories (`01-collect/`, `02-research/`, ...) via `git mv`, so history is preserved.

---

## Stage ① — Collect (Raw Material Collector)

A Windows-first desktop app that is the **first step** of the pipeline. Its only job: collect raw materials as fast as possible.

It is a **container** — not a note app, not a knowledge base, not an AI app. No AI, no organization, no summaries, no classification, no dedup. You throw files in; later stages process them.

Built with **Tauri 2 + React + TypeScript + Tailwind CSS**.

### Features

**Topics**
- Each **Topic** = one video project or series. Unlimited topics.
- Sidebar lists all topics; a large **`+`** button creates a new topic (asks only for a name).

**Per-topic workspace**
- Each topic has its own workspace with a large **"Drop anything here."** drop zone.
- A read-only file list shows what's already been collected.
- **"Open folder"** reveals the topic's raw folder in Windows Explorer.

**Drag & drop** — accepts Markdown, PDF, Word (`.docx`), TXT, HTML, images, and **any unknown file** (copied as-is, never modified, never renamed). Duplicates get a `-1`, `-2`, ... suffix; **files are never overwritten.** Folder drops are copied recursively, preserving structure.

**Paste (Ctrl+V)**
- Clipboard **text** → `Clipboard-YYYY-MM-DD-HHMMSS.md`
- Clipboard **image** → a `.png` file
- Ignored while focus is in an input field.

**Quick Drop Mode** — a top-right toggle that locks a topic as the default destination. While active, everything dropped or pasted goes straight in with no confirmation dialog — ideal for long research sessions.

**Delete** — hover a collected row to reveal its delete button; hover a topic in the sidebar to reveal its trash button (with a confirm dialog).

**Settings** — change the workspace root folder; theme light / dark / system.

**100% local** — no cloud, no database, no login, no sync. Files live on your disk; the app just reads and writes them.

### Storage layout

Default workspace root is configurable in Settings. Each topic is a directory; every collected file lands in that topic's `raw\` subfolder, byte-for-byte identical to the source.

```
<workspace root>\
  <Topic Name>\
    raw\
      <original files, untouched>
```

### Prerequisites

- **Node.js 18+** (developed on v24) and **npm**.
- **Rust toolchain** (`stable-msvc`) via [rustup](https://rustup.rs).
- **Microsoft Visual C++ Build Tools** — MSVC C++ workload, required by Rust/Tauri linking on Windows.
- **Microsoft Edge WebView2 Runtime** — preinstalled on Windows 11.

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
├── package.json
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
    └── superpowers\
        └── specs\
```

### Architecture notes

- **Filesystem is the single source of truth.** The topic list is derived by scanning the workspace directory — there is no metadata database.
- **All file operations are Rust commands** (copy with collision handling, recursive folder copy, save text/image, list, delete). The React frontend calls them via Tauri's `invoke`.
- **State** is managed with [Zustand](https://github.com/pmndrs/zustand); user settings are persisted via `tauri-plugin-store` in AppData.
- **Reserved extension point:** `src/lib/pipeline.ts` (planned, not implemented) — future stages will read `<workspace>/<Topic>/raw/*` from here.

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
| `Ctrl+V` | Paste clipboard into the current / Quick-Drop topic (text → `.md`, image → `.png`) |
| `Enter`  | Confirm dialogs |
| `Esc`    | Close dialogs |
