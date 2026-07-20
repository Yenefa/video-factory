# Visual Language Agent v0.1 RAG Episode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formalize Visual Language Agent v0.1 and produce a complete, traceable Visual Plan for the 65.866-second RAG episode.

**Architecture:** The tracked agent specification defines the reusable stage contract. A single episode-specific Markdown artifact maps the five Script scenes and all thirteen narration segments into one coherent table/document/selection visual grammar. The artifact stops at high-level asset dependencies; exact shot timing remains owned by Storyboard.

**Tech Stack:** Markdown, JSON source timeline, Git, ripgrep, Node.js one-line validation

---

## File structure

- Create `docs/visual-language-agent-spec-v0.1.md` — reusable ④ Visual Language role, workflow, input boundary, output format, and rules.
- Create `docs/examples/visual-language-v0.1-rag-plan.md` — episode-specific Visual Plan in the required v0.1 output format.
- Modify `README.md` — mark stage ④ as v0.1 with a tracked RAG example.
- Modify `docs/versioning.md` — register the v0.1 specification and the RAG episode output.

## Task 1: Publish the reusable v0.1 agent specification

**Files:**

- Create: `docs/visual-language-agent-spec-v0.1.md`
- Reference: `docs/superpowers/specs/2026-07-21-visual-language-agent-v0.1-design.md`

- [x] **Step 1: Create the specification header and boundaries**

Write the version, role, and adjacent-stage ownership explicitly:

```markdown
> **Version:** v0.1
> **Stage:** ④ Visual Language

Visual Language decides what the audience should see and why. It does not create assets, generate images, set final shot timing, or render video.
```

- [x] **Step 2: Encode the complete workflow**

Include scene-purpose analysis, strategy selection, style selection, motion design, and cross-scene visual grammar. Preserve the approved strategy library and the rule that scene changes follow idea changes rather than sentence boundaries.

- [x] **Step 3: Encode the strict output contract**

Require these top-level headings and fields:

```text
# Visual Plan
## Global Visual Direction
# Scene Breakdown
## Scene ID:
# Visual Notes
# Quality Check
```

Each scene must contain Narration, Scene Purpose, Core Visual Idea, Visual Strategy, Visual Description, Motion Description, Camera Movement, Required Assets, and Asset Type.

- [x] **Step 4: Verify the reusable specification**

Run:

```powershell
rg -n "^# Visual Plan|^## Global Visual Direction|^# Scene Breakdown|^# Visual Notes|^# Quality Check|Required Assets|Asset Type" docs/visual-language-agent-spec-v0.1.md
rg -n "TBD|TODO|机器人|大脑|芯片" docs/visual-language-agent-spec-v0.1.md
```

Expected: every required output field is present; no placeholders; prohibited motifs appear only inside the prohibition rule.

## Task 2: Produce the RAG episode Visual Plan

**Files:**

- Create: `docs/examples/visual-language-v0.1-rag-plan.md`
- Reference: `docs/examples/script-agent-v2-rag-draft.md`
- Reference: `RawMaterialCollector/RAG/script/tts-1.2x/timeline.json`

- [x] **Step 1: Write the global direction**

Use the approved Claude × Google hybrid:

- editorial AI research lab theme;
- deep ink and graphite background;
- warm-white document surfaces;
- amber-orange for overload or failure;
- cyan-teal for relevant or selected information;
- clean grotesk plus restrained monospace;
- purposeful file flow, morph, reveal, and selection motion;
- stable 2.5D camera with motivated push-ins and pull-backs.

- [x] **Step 2: Design Scene 1 — Capacity is not selection**

Map `scene-01-beat-01` and `scene-01-beat-02` to one evolving visual: “1,000,000 TOKENS” expands into a huge table, then the camera reveals that a search beam still cannot identify the correct document. The visual must separate capacity from retrieval without illustrating the words literally.

- [x] **Step 3: Design Scene 2 — The overloaded company table**

Map both Scene 2 beats to an overhead table receiving contracts, reports, private files, and cost counters. Reveal the three unresolved constraints in order: cost meter, privacy boundary, buried answer card. Reuse the table established in Scene 1.

- [x] **Step 4: Design Scene 3 — Rigid pipeline becomes dynamic selection**

Map all three Scene 3 beats to a morphing system. Begin with a rigid “chunk → vector search → top-k” conveyor where a mechanical selector grabs arbitrary fragments. Reconfigure the same components into a question-led selector that activates only relevant external sources. End by widening the chunk container without implying selection has been solved.

- [x] **Step 5: Design Scene 4 — Context changes retrieval quality**

Map all three Scene 4 beats to a literal mechanism plus data evidence. Begin with an ambiguous fragment card, reveal 50–100 tokens of document context, and show the card becoming retrievable. Then reveal retrieval-failure reduction of 49% and 67% as a measured comparison. Preserve the qualification that results vary by data and system; do not visualize the figures as universal accuracy.

- [x] **Step 6: Design Scene 5 — Deliberate information placement**

Map all three Scene 5 beats back to the table. Replace the false “long context versus RAG” split with a timing gate. A selector chooses three relevant documents and places them on the enlarged table exactly when needed. End on the visual state, not a redundant paragraph of text.

- [x] **Step 7: Add high-level asset dependencies**

Keep dependencies within the v0.1 boundary:

- reusable table plane;
- document-card system;
- privacy lock and cost-meter icons;
- rigid pipeline nodes and connectors;
- selection beam and timing gate;
- contextual metadata card;
- two-step measured comparison chart;
- type treatments for numeric claims.

Do not specify filenames, sourcing vendors, resolutions, or production ownership; those belong to ⑤ Asset Planning.

- [x] **Step 8: Score and explain quality**

Score Understanding, Originality, and Production from 0–10 with one evidence-based reason each. Production must account for the current HyperFrames/Remotion-capable stack and avoid requiring AI-generated footage.

## Task 3: Update pipeline status

**Files:**

- Modify: `README.md`
- Modify: `docs/versioning.md`

- [x] **Step 1: Update README stage ④**

Change the Stage ④ status from planned to v0.1 and link both the reusable specification and tracked RAG Visual Plan.

- [x] **Step 2: Register versioning entries**

Add:

```text
④ Visual Language | v0.1-20260721 | First reusable visual-direction contract
④ Visual Language sample (RAG topic) | per v0.1-20260721 | Five scenes; thirteen narration segments covered
```

- [x] **Step 3: Check the documentation diff**

Run:

```powershell
git diff --check
git diff -- README.md docs/versioning.md docs/visual-language-agent-spec-v0.1.md docs/examples/visual-language-v0.1-rag-plan.md
```

Expected: no whitespace errors; stage ownership remains ④ Visual Language → ⑤ Asset Planning → ⑥ Storyboard.

## Task 4: Validate the completed episode contract

**Files:**

- Verify: `docs/examples/visual-language-v0.1-rag-plan.md`
- Verify: `RawMaterialCollector/RAG/script/tts-1.2x/timeline.json`

- [x] **Step 1: Verify five-scene coverage**

Run:

```powershell
rg -n "^## Scene ID: scene-0[1-5]$" docs/examples/visual-language-v0.1-rag-plan.md
```

Expected: exactly five matches.

- [x] **Step 2: Verify all thirteen narration segments are traceable**

Run:

```powershell
node -e "const fs=require('fs');const t=JSON.parse(fs.readFileSync('RawMaterialCollector/RAG/script/tts-1.2x/timeline.json','utf8'));const p=fs.readFileSync('docs/examples/visual-language-v0.1-rag-plan.md','utf8');const missing=t.segments.filter(s=>!p.includes(s.segment_id));console.log('segments='+t.segments.length);console.log('missing='+missing.map(s=>s.segment_id).join(','));process.exit(t.segments.length===13&&missing.length===0?0:1)"
```

Expected:

```text
segments=13
missing=
```

- [x] **Step 3: Verify prohibited scope is absent**

Run:

```powershell
rg -n "生成图片|下载素材|最终镜头时长|渲染视频|机器人|大脑|芯片|TBD|TODO" docs/examples/visual-language-v0.1-rag-plan.md
```

Expected: no matches.

- [x] **Step 4: Commit the completed stage artifacts**

Run:

```powershell
git add README.md docs/versioning.md docs/visual-language-agent-spec-v0.1.md docs/examples/visual-language-v0.1-rag-plan.md docs/superpowers/plans/2026-07-21-visual-language-agent-v0.1-rag-plan.md
git commit -m "feat: add visual language agent v0.1 RAG plan"
```

Expected: one commit containing only the v0.1 specification, episode Visual Plan, execution plan, and pipeline documentation.
