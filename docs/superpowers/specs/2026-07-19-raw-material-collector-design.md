# Raw Material Collector — Design Spec

- **Date:** 2026-07-19
- **Status:** Approved
- **Stack:** Tauri 2 · React 18 · TypeScript · Vite · Tailwind CSS · Motion · Zustand
- **Target:** Windows-first desktop app

## 1. Purpose

The first step of a future AI video-production pipeline. Its **only** job: collect raw materials as fast as possible.

It is NOT a note app, NOT a knowledge base, NOT an AI app. No AI, no organization, no summaries, no analysis, no classification, no dedup. It is a container. The user throws everything in; future AI workflows process the files later.

## 2. Directories

- **Project source root:** `D:\raw app\`
- **Materials workspace root** (absolute, stored in app settings, configurable): `D:\raw app\RawMaterialCollector\`
- Workspace layout — each Topic is one folder, raw files live under its `raw\` subfolder:

```
D:\raw app\RawMaterialCollector\
  Agent Engineering\
    raw\
      xxxx.md
      xxxx.pdf
      xxxx.docx
  RAG\
    raw\
      ...
```

The workspace root contains **only** topic folders, so scanning the root yields the topic list. No cloud, no DB, no login, no sync.

## 3. Tech Stack

- **Tauri 2** (Rust backend) for desktop shell, filesystem, clipboard, dialogs.
- **React 18 + TypeScript + Vite** frontend.
- **Tailwind CSS** for styling.
- **Motion** (framer-motion) for subtle animations.
- **Zustand** for lightweight state.
- **Tauri plugins:** `fs`, `dialog`, `clipboard-manager`, `store`, `shell`.
- **Fonts:** Instrument Sans (UI/body) + Instrument Serif (display) — distinctive, editorial, non-generic.

## 4. Core Architecture Decision

**Topic list is derived by scanning the workspace directory** (filesystem is the single source of truth), not persisted in a metadata file.

- Rationale: matches the "container" philosophy; the app is an observer; external folder changes are reflected automatically; no drift.
- Topic display name = folder name. Sorted by folder mtime, newest first.
- Rejected alternative: `topics.json` metadata (faster but drifts, contradicts "never organize").

## 5. Data Flow

### Create Topic
Click `+` → enter name → sanitize illegal chars (`\ / : * ? " < > |` → `_`) → create `RawMaterialCollector\<Topic>\raw\` → refresh list.

### Drag & Drop
Drop files on DropZone → Tauri yields file paths → **copy** (never move; never touch the user's original) into current topic's `raw\` → on name collision append `-1`, `-2`… (never overwrite, never delete duplicates) → inline confirmation of files added.

Supported: `.md`, `.pdf`, `.docx`, `.txt`, `.html`, images, and any unknown file (copied as-is).

### Paste (Ctrl+V)
- Clipboard text → `Clipboard-YYYY-MM-DD-HHMMSS.md` saved into current topic's `raw\`.
- Clipboard image → `Clipboard-YYYY-MM-DD-HHMMSS.png`.
- Clipboard files (copied from Explorer) → handled like drag & drop.

### Quick Drop Mode
Top-right obvious toggle. When ON, a target topic is locked; all drops/pastes from any screen go directly there — no confirmation, no extra clicks. Designed for long research sessions. State + target persisted via Tauri store.

### Settings
- Workspace root path (folder picker via Tauri dialog).
- Light/dark theme (default: follow system).
- Stored in AppData via `tauri-plugin-store`.

## 6. File Structure

```
D:\raw app\
├── package.json, vite.config.ts, tailwind.config.ts, postcss.config.js,
│   tsconfig.json, tsconfig.node.json, index.html, README.md
├── docs/superpowers/specs/2026-07-19-raw-material-collector-design.md
├── src/                          # React frontend
│   ├── main.tsx, App.tsx
│   ├── styles/index.css          # Tailwind + fonts + design tokens
│   ├── components/
│   │   ├── Sidebar.tsx, TopicItem.tsx, NewTopicDialog.tsx
│   │   ├── Workspace.tsx, DropZone.tsx, EmptyState.tsx
│   │   ├── QuickDropToggle.tsx, SettingsPanel.tsx, FileList.tsx
│   │   ├── Toast.tsx
│   │   └── ui/                   # Button, Dialog, Toggle, IconButton (reusable primitives)
│   ├── store/useAppStore.ts      # zustand
│   ├── lib/  fs.ts, clipboard.ts, files.ts, errors.ts
│   ├── hooks/  usePaste.ts, useDragDrop.ts, useTopics.ts
│   └── types/index.ts
└── src-tauri/                    # Rust backend
    ├── Cargo.toml, tauri.conf.json, build.rs
    ├── icons/
    ├── capabilities/default.json # Tauri 2 permissions (fs scoped to workspace)
    └── src/  main.rs, lib.rs      # Rust commands: copy, collision, list, save text
```

## 7. Rust Backend Commands

Core file operations live in Rust for speed, robust errors, and copy-with-collision:

- `create_topic(workspace_root, name) -> topic_path` — sanitize + mkdir `raw\`.
- `list_topics(workspace_root) -> Vec<TopicInfo>` — scan root for directories; return name + mtime.
- `list_files(topic_path) -> Vec<FileInfo>` — list `raw\` entries (name, size, mtime).
- `copy_file_into_topic(src, topic_path) -> dest_path` — copy with collision suffix.
- `save_text_file(topic_path, filename, content) -> path` — for clipboard text.
- `open_in_explorer(path)` — via shell plugin.

Capabilities scope `fs` access to the workspace path (security). Frontend uses these commands through a typed `lib/fs.ts` wrapper.

## 8. Aesthetic Direction

- **Tone:** refined minimalism (Linear / Raycast / Notion / Apple). Generous whitespace, restrained motion, paper-and-ink feel (echoes "raw material").
- **Color:** warm paper white (`#FAFAF9`) + deep ink text + one low-saturation accent; dark mode = deep charcoal. Very-low-opacity noise texture for paper feel.
- **Motion:** staggered sidebar fade-in on load; crossfade on topic switch; subtle scale/glow on dragover; gentle breath on empty-state `+`.
- **Window:** v1 uses native Windows chrome (reliable, Windows-first); interior designed to feel app-like.

## 9. Error Handling

- Workspace root missing/inaccessible → empty state guiding the user to choose a directory.
- Per-file copy failure → per-file toast, continue with remaining files.
- Invalid topic name → inline validation in the dialog.
- Directory/clipboard failures → explicit toast with reason.

## 10. Raw Philosophy (Invariants)

Never modify user files. Never rename files. Never summarize. Never classify. Never organize. Never delete duplicates. The app is a container only.

Note: collision suffixes (`file-1.pdf`) create a new file in the container; the source file is never renamed or removed. This preserves "never delete duplicates."

## 11. Future AI Integration

Topics are plain folders; files are untouched. A `lib/pipeline.ts` extension point is reserved (interface + comments only, no AI implementation). Future AI stages read `<workspace>\<Topic>\raw\*` and process downstream. This app never participates.

## 12. Prerequisites

- ✅ Node v24.15.0, npm 11.17.0, WebView2 runtime.
- ⚠️ Rust toolchain (rustup, stable-msvc) + MSVC C++ build tools — needed for `tauri dev` / `tauri build`. Installing in parallel during scaffolding.
