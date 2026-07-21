# Script Agent v2.0 Timing Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Script Agent from a long-form narration spec to a short-video strategy spec whose timing is estimated from the finished draft and locked from measured TTS audio.

**Architecture:** Keep Script as stage ③ and add TTS/Timing as a cross-cutting service rather than a numbered pipeline stage. Script produces semantic segments and an estimated duration range; TTS/Timing measures narration audio; Storyboard owns any additional visual holds and the final video duration.

**Tech Stack:** Markdown specifications, JSON interchange contracts, repository documentation.

---

### Task 1: Publish the v2.0 specification

**Files:**
- Create: `docs/script-agent-spec-v2.0.md`
- Preserve: `docs/script-agent-spec-v1.0.md`

- [x] Define the short-form strategist identity and angle-first workflow.
- [x] Preserve research traceability and unresolved-conflict handling.
- [x] Define semantic-beat segmentation instead of punctuation-only splitting.
- [x] Separate draft estimates, narration timing lock, and final storyboard duration.
- [x] Define `segments.json` and downstream `timeline.json` ownership.

### Task 2: Add a tracked RAG example

**Files:**
- Create: `docs/examples/script-agent-v2-rag-angles.md`
- Create: `docs/examples/script-agent-v2-rag-draft.md`

- [x] Record and compare four evidence-backed angle candidates.
- [x] Convert the first RAG trial to the v2 draft format.
- [x] Replace false exact timecodes with estimated scene ranges.
- [x] Add evidence references and a pacing evaluation.

### Task 3: Synchronize project status

**Files:**
- Modify: `README.md`
- Modify: `docs/versioning.md`

- [x] Mark stage ③ as specification plus first-trial status, not production-complete.
- [x] Register `v2.0-20260721` and explain why it is a family-level change.
- [x] Document that TTS/Timing implementation remains pending.

### Task 4: Verify the documentation contract

**Files:**
- Verify all files above.

- [x] Confirm all required Script output headings and five scene blocks exist in the example.
- [x] Confirm no draft field claims an exact locked duration.
- [x] Confirm README and versioning point to the v2.0 spec.
- [x] Inspect `git diff --check` and repository status.
