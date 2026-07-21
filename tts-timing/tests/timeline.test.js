import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { synthesizeTimeline, validateSegmentsDocument } from "../src/timeline.js";

const validDocument = () => ({
  timing_status: "draft",
  estimated_duration_range_ms: [3000, 5000],
  segments: [
    {
      segment_id: "scene-01-beat-01",
      scene_id: "scene-01",
      beat_type: "hook",
      narration: "第一段。",
      source_refs: ["insights.md #1"],
      pause_after_ms: 200,
    },
    {
      segment_id: "scene-01-beat-02",
      scene_id: "scene-01",
      beat_type: "contrast",
      narration: "第二段。",
      source_refs: ["report.md §1"],
    },
    {
      segment_id: "scene-02-beat-01",
      scene_id: "scene-02",
      beat_type: "problem",
      narration: "第三段。",
      source_refs: [],
      pause_after_ms: 999,
    },
  ],
});

test("validateSegmentsDocument rejects unsafe and duplicate segment IDs", () => {
  const unsafe = validDocument();
  unsafe.segments[0].segment_id = "../escape";
  assert.throws(() => validateSegmentsDocument(unsafe), /safe segment_id/);

  const duplicate = validDocument();
  duplicate.segments[1].segment_id = duplicate.segments[0].segment_id;
  assert.throws(() => validateSegmentsDocument(duplicate), /duplicate segment_id/);
});

test("synthesizeTimeline writes measured audio and accumulates exact timing", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "tts-timing-"));
  const durations = [1000, 1500, 500];
  const calls = [];
  const synthesize = async ({ text }) => {
    const index = calls.length;
    calls.push(text);
    return {
      audio: Buffer.from(`audio-${index}`),
      durationMs: durations[index],
      traceId: `trace-${index}`,
      usageCharacters: text.length,
    };
  };

  const timeline = await synthesizeTimeline({
    document: validDocument(),
    outputDir,
    apiKey: "test-key",
    synthesize,
    defaultPauseMs: 300,
  });

  assert.deepEqual(calls, ["第一段。", "第二段。", "第三段。"]);
  assert.deepEqual(
    timeline.segments.map(({ start_ms, end_ms, duration_ms, pause_after_ms }) => ({
      start_ms,
      end_ms,
      duration_ms,
      pause_after_ms,
    })),
    [
      { start_ms: 0, end_ms: 1000, duration_ms: 1000, pause_after_ms: 200 },
      { start_ms: 1200, end_ms: 2700, duration_ms: 1500, pause_after_ms: 300 },
      { start_ms: 3000, end_ms: 3500, duration_ms: 500, pause_after_ms: 0 },
    ],
  );
  assert.equal(timeline.narration_duration_ms, 3500);
  assert.equal(timeline.timing_status, "narration_locked");
  assert.equal(timeline.model, "speech-2.6-turbo");
  assert.equal(timeline.voice_id, "Podcast_girl");

  assert.equal(
    await readFile(join(outputDir, "audio", "scene-01-beat-01.mp3"), "utf8"),
    "audio-0",
  );
  assert.deepEqual(
    JSON.parse(await readFile(join(outputDir, "timeline.json"), "utf8")),
    timeline,
  );
});

