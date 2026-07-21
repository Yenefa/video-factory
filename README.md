# Video Factory

An AI video-production pipeline. Each stage is a self-contained tool; together they turn raw research material into a finished MP4.

## 主流程（9 层）

| # | Stage | Purpose | Status |
|---|-------|---------|--------|
| ⓪ | **Fetch** | Actively harvest materials from the web (docs, papers, Reddit, blogs) | ✅ v1.0-20260720 |
| ① | **Collect (Raw)** | Gather all raw materials (container, also receives manual drops) | ✅ v1.0-20260720 |
| ② | **Research** | Distill credible knowledge | ✅ v1.0-20260720 (RAG topic, 48 sources -> research package) |
| ③ | **Script** | Turn knowledge into a narration script | ✅ v3.0-20260722 spec (Director, 7-step) + v2.0 RAG draft + live-verified TTS/Timing (13 segments, 65.866 s at 1.2×) |
| ④ | **Visual Language** | Translate each abstract line into an executable visual expression system | ✅ v0.1-20260721 spec + tracked RAG Visual Plan |
| ⑤ | **Asset Planning** | List every asset this episode needs (SVG, icons, logos, illustrations, AI images) | ✅ v0.3-20260721 spec + constrained SiliconFlow Kolors generation + DPAPI launcher + RAG test-job fixture |
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

## TTS / Timing（横切服务，不占层号）

③ Script v3.0 输出 Narration Timeline（含 `estimated_duration` 粗估）。TTS/Timing 按语义节拍生成语音、用 API 实测每段真实时长覆盖粗估，输出 measured narration timeline；⑥ Storyboard 再加入视觉停留、转场和静默，锁定最终视频时长。

```text
③ Script -> Script Lock -> semantic segments
                             ├── TTS / Timing -> measured narration timeline ─┐
                             └── ④ Visual -> ⑤ Assets ───────────────────────┤
                                                                            ↓
                                                                      ⑥ Storyboard
```

- **Spec:** [`docs/tts-agent-spec-v1.0.md`](./docs/tts-agent-spec-v1.0.md)
- **Upstream:** [`docs/script-agent-spec-v3.0.md`](./docs/script-agent-spec-v3.0.md)（③ Script）
- **Tracked example:** [`docs/examples/script-agent-v2-rag-draft.md`](./docs/examples/script-agent-v2-rag-draft.md)
- **Implementation:** [`tts-timing/`](./tts-timing/) — MiniMax `speech-2.6-turbo`, `Podcast_girl`, semantic-segment MP3 generation and measured `timeline.json`.
- **Status:** Live generation verified on 2026-07-21: 13 `Podcast_girl` MP3 segments; raw narration 78.178 seconds, locally retimed with pitch-preserving `atempo=1.2` to a measured 65.866 seconds.

## Visual Language（④）

Visual Language 把 Script 的抽象概念、技术关系、情绪和叙事目的转换为可执行的视觉表达，但不制作素材、不锁定最终镜头时间，也不渲染视频。

- **Spec:** [`docs/visual-language-agent-spec-v0.1.md`](./docs/visual-language-agent-spec-v0.1.md)
- **Tracked example:** [`docs/examples/visual-language-v0.1-rag-plan.md`](./docs/examples/visual-language-v0.1-rag-plan.md)
- **Status:** v0.1-20260721 ready; RAG episode covers 5 scenes and all 13 locked narration segments with one coherent table/document/selection visual grammar.

## Asset Planning（⑤）

Asset Planning turns the Visual Plan into a production inventory and can auto-generate at most three test images through SiliconFlow Kolors, with DPAPI-protected credentials and no per-image confirmation.

- **Spec:** [`docs/asset-planning-agent-spec-v0.3.md`](./docs/asset-planning-agent-spec-v0.3.md)
- **Tracked jobs:** [`docs/examples/asset-planning-v0.3-rag-jobs.json`](./docs/examples/asset-planning-v0.3-rag-jobs.json)
- **Implementation:** [`asset-generation/`](./asset-generation/) - constrained Kolors generation, atomic local manifest, DPAPI launcher.
- **Status:** v0.3-20260721 ready; RAG fixture has 4 jobs (3 ai_generate backgrounds + 1 code diagram); smoke test verified Kolors image generation.

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
├── tts-timing/            ← 横切服务（semantic segments -> MP3 + measured timeline）
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
    ├── script-agent-spec-v1.0.md     ← stage ③ historical long-form spec
    ├── script-agent-spec-v2.0.md     ← stage ③ current short-form + timing contract
    ├── examples\                     ← tracked pipeline examples
    └── superpowers\
        ├── specs\
        └── plans\
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
