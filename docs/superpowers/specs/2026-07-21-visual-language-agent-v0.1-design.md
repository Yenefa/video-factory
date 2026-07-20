# Visual Language Agent v0.1 — Design Specification

> **Version:** v0.1
> **Date:** 2026-07-21
> **Pipeline stage:** ④ Visual Language
> **Approved episode direction:** Claude × Google hybrid visual language

## 1. Purpose

Visual Language Agent turns a locked short-video Script Package into a clear, executable visual expression plan.

It answers one question:

> What should the audience see at this moment, and why should they see it?

The agent does not create assets, generate images, author the final storyboard, or render video. Its output is the visual reasoning contract consumed by ⑤ Asset Planning and ⑥ Storyboard.

## 2. Core principles

Visuals must do at least one of the following:

1. Add understanding that narration alone does not provide.
2. Reduce the cognitive cost of an abstract or technical idea.
3. Strengthen the intended emotion or contrast.
4. Create a coherent memory structure across the video.

Visuals must not merely illustrate nouns from the narration. Generic AI robots, brains, glowing chips, and unrelated decorative footage are prohibited unless the script is literally about those objects.

## 3. Input contract

Required input:

- title;
- audience;
- chosen narrative angle;
- scene ID;
- scene purpose;
- narration;
- evidence or source boundary when a scene contains factual claims;
- locked narration timeline when available.

Optional input:

- tone;
- existing visual hints from Script;
- brand constraints;
- existing UI, screenshots, components, or footage.

If required information is missing, the agent must mark it as unknown. It must not invent product interfaces, evidence, visualized measurements, or brand assets.

## 4. Boundary with adjacent stages

### ③ Script

Owns what is said, scene purpose, narrative order, and evidence boundaries. Visual Language may clarify a hint but may not change the core claim.

### ④ Visual Language

Owns visual strategy, metaphor, visual system, motion concept, camera concept, and a high-level statement of required asset types.

### ⑤ Asset Planning

Turns the high-level asset statements into a complete production inventory, sourcing decision, file specification, and ownership plan.

### ⑥ Storyboard

Owns exact shot order, shot duration, transitions, visual holds, and final video duration. Visual Language may reference narration segments but must not fabricate final timecodes.

## 5. Workflow

### Step 1: Understand scene purpose

Classify each scene as one or more of:

- Hook
- Explain
- Compare
- Demonstrate
- Emotion
- Conclusion

State why the audience needs the scene before designing the visual.

### Step 2: Select visual strategy

Choose the smallest effective set from:

- Metaphor — abstract concepts, systems, trends, cognition;
- Diagram — relationships, workflows, architectures;
- UI Demonstration — real software or product behavior;
- Data Visualization — quantitative comparisons and trends;
- Code Visualization — execution, data flow, and module relationships rather than raw code walls;
- Character Story — human stakes, frustration, discovery, or emotion.

One scene may combine two strategies when they have distinct jobs. Strategy stacking without a clear reason is prohibited.

### Step 3: Choose visual language

Available style families:

- Apple Style — minimal, spacious, restrained, premium;
- Claude Style — dark, reflective, document-led, research-oriented;
- Google Style — bright, diagrammatic, clear, educational;
- TikTok Style — high contrast, fast, kinetic, attention-led.

Style selection must follow the episode's audience and narrative purpose. It is not a decorative preset.

### Step 4: Design motion concept

Every scene must describe change over time using one or more of:

- Fade In
- Zoom
- Pan
- Morph
- Flow
- Scale
- Reveal

Motion must communicate meaning. Continuous background movement without narrative function is prohibited.

### Step 5: Maintain a visual grammar

The video should reuse a small number of visual objects and transformations instead of introducing unrelated imagery for every sentence. A scene changes when the idea changes, not automatically when the sentence changes.

## 6. Approved RAG episode direction

The episode “RAG 没死，死的是这套旧思路” uses a Claude × Google hybrid:

- **Theme:** editorial AI research lab;
- **Base:** deep ink and graphite backgrounds;
- **Information surfaces:** warm-white document cards;
- **Overload/error accent:** amber-orange;
- **relevant/selected accent:** cyan-teal;
- **Typography:** clean grotesk for claims and numbers, restrained monospace for tokens and system labels;
- **Primary visual grammar:** table, document cards, selection beam, rigid pipeline, contextual metadata, measured comparison;
- **Motion:** files flow, systems reorganize, metadata reveals, and selected evidence locks into place;
- **Camera:** mostly stable 2.5D moves with purposeful push-ins and pull-backs;
- **Prohibited motifs:** robots, brains, glowing chips, random futuristic HUDs, and generic stock-office footage.

The table metaphor must evolve across the episode: capacity in Scene 1, overload in Scene 2, selection system in Scene 3, contextual evidence in Scene 4, and deliberate information placement in Scene 5.

## 7. Output contract

The agent must output exactly these top-level sections:

```text
# Visual Plan

## Global Visual Direction

Theme:
Design System:
Color:
Motion Style:
Reason:

---

# Scene Breakdown

## Scene ID:

Narration:
Scene Purpose:
Core Visual Idea:
Visual Strategy:
Visual Description:
Motion Description:
Camera Movement:
Required Assets:
Asset Type:

---

# Visual Notes

---

# Quality Check

## Understanding Score:
## Originality Score:
## Production Score:
```

Allowed asset types:

- Existing Component
- SVG
- Icon
- Screenshot
- AI Generated Image
- Video Material
- Animation

`Required Assets` remains a high-level dependency statement. It is not the detailed inventory owned by ⑤ Asset Planning.

## 8. Quality gate

Before delivery, verify:

- every scene purpose is explicit;
- every core visual idea helps understanding rather than repeats narration;
- the visual grammar remains coherent across scenes;
- motion communicates a state change;
- factual diagrams and charts preserve the Script evidence boundary;
- assets are feasible with the planned production stack;
- no precise storyboard timing has been invented;
- Understanding, Originality, and Production scores include brief reasons.

## 9. Failure handling

- If narration and scene purpose conflict, preserve narration and flag the conflict.
- If a factual visual lacks evidence, use a conceptual diagram or mark the item unresolved; do not fabricate data.
- If the proposed metaphor introduces a false technical claim, replace it with a literal diagram.
- If a scene needs too many unrelated assets, simplify the visual idea before passing it downstream.
- If the locked narration is too short for the proposed visual explanation, flag the need for a Storyboard visual hold rather than altering Script timing.

## 10. Acceptance criteria

The design is accepted when another agent can use the Visual Plan to create an asset inventory and storyboard without guessing the intended meaning, visual hierarchy, motion logic, or evidence boundary.
