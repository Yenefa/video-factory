# MiniMax TTS Timing Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Script Agent semantic segments into MiniMax MP3 files and a measured narration `timeline.json` using `speech-2.6-turbo` with `Podcast_girl`.

**Architecture:** A standalone Node.js service uses the MiniMax CN HTTP T2A endpoint and reads the API key only from `MINIMAX_API_KEY`. Each semantic segment is synthesized sequentially; MiniMax's returned `extra_info.audio_length` supplies measured milliseconds; the pipeline saves audio and accumulates deterministic start/end times.

**Tech Stack:** Node.js 24, native `fetch`, native `node:test`, MiniMax T2A HTTP API.

---

### Task 1: MiniMax client contract

**Files:**
- Create: `tts-timing/package.json`
- Create: `tts-timing/tests/minimax-client.test.js`
- Create: `tts-timing/src/minimax-client.js`

- [x] Write tests that require the exact model, voice, Chinese language boost, MP3 settings, Bearer header, hex decoding, and API error handling.
- [x] Run `npm.cmd test -- tests/minimax-client.test.js` and confirm failure because the production module is absent.
- [x] Implement request construction and response parsing without logging the API key.
- [x] Run the client tests and confirm they pass.

### Task 2: Timeline pipeline

**Files:**
- Create: `tts-timing/tests/timeline.test.js`
- Create: `tts-timing/src/timeline.js`

- [x] Write tests for unique safe segment IDs, sequential audio files, measured start/end times, explicit pauses, and zero pause after the final segment.
- [x] Run the timeline tests and confirm failure because the module is absent.
- [x] Implement segment validation, sequential synthesis, MP3 writing, and `timeline.json` output.
- [x] Run all tests and confirm they pass.

### Task 3: CLI and tracked RAG input

**Files:**
- Create: `tts-timing/tests/cli.test.js`
- Create: `tts-timing/src/cli.js`
- Create: `tts-timing/README.md`
- Create: `docs/examples/script-agent-v2-rag-segments.json`
- Modify: `README.md`

- [x] Write CLI tests for dry-run validation and missing-key refusal.
- [x] Run the CLI tests and confirm failure because the CLI module is absent.
- [x] Implement `validate` and `synthesize` commands with environment-only credentials.
- [x] Add the 13 semantic beats from the approved RAG draft and document safe usage.
- [x] Run all unit tests and a no-cost validation command.

### Task 4: Live verification gate

- [x] Check whether `MINIMAX_API_KEY` is set without printing it.
- [x] If set, synthesize the RAG segments and verify MP3/timeline outputs; if not set, report live verification as blocked without embedding the pasted key.
- [x] Run `git diff --check` and inspect repository status.
