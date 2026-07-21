import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { DEFAULT_MINIMAX_CONFIG, synthesizeSegment } from "./minimax-client.js";

const SAFE_SEGMENT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

export const validateSegmentsDocument = (document) => {
  if (!document || typeof document !== "object" || !Array.isArray(document.segments)) {
    throw new TypeError("segments document must contain a segments array");
  }
  if (document.segments.length === 0) {
    throw new Error("segments document must contain at least one segment");
  }

  const seen = new Set();
  for (const [index, segment] of document.segments.entries()) {
    if (!segment || typeof segment !== "object") {
      throw new TypeError(`segment ${index} must be an object`);
    }
    if (typeof segment.segment_id !== "string" || !SAFE_SEGMENT_ID.test(segment.segment_id)) {
      throw new Error(`segment ${index} must have a safe segment_id`);
    }
    if (seen.has(segment.segment_id)) {
      throw new Error(`duplicate segment_id: ${segment.segment_id}`);
    }
    seen.add(segment.segment_id);
    if (typeof segment.narration !== "string" || segment.narration.trim().length === 0) {
      throw new Error(`segment ${segment.segment_id} must have non-empty narration`);
    }
    if (
      segment.pause_after_ms !== undefined &&
      (!Number.isInteger(segment.pause_after_ms) || segment.pause_after_ms < 0)
    ) {
      throw new Error(`segment ${segment.segment_id} has an invalid pause_after_ms`);
    }
  }

  return document;
};

export const synthesizeTimeline = async ({
  document,
  outputDir,
  apiKey,
  config = DEFAULT_MINIMAX_CONFIG,
  synthesize = synthesizeSegment,
  defaultPauseMs = 250,
}) => {
  validateSegmentsDocument(document);
  if (typeof outputDir !== "string" || outputDir.length === 0) {
    throw new Error("outputDir is required");
  }
  if (!Number.isInteger(defaultPauseMs) || defaultPauseMs < 0) {
    throw new Error("defaultPauseMs must be a non-negative integer");
  }

  const audioDir = join(outputDir, "audio");
  await mkdir(audioDir, { recursive: true });

  let cursorMs = 0;
  const timelineSegments = [];

  for (const [index, segment] of document.segments.entries()) {
    const result = await synthesize({
      apiKey,
      text: segment.narration,
      config,
    });
    if (!Buffer.isBuffer(result.audio) || result.audio.length === 0) {
      throw new Error(`segment ${segment.segment_id} returned empty audio`);
    }
    if (!Number.isFinite(result.durationMs) || result.durationMs <= 0) {
      throw new Error(`segment ${segment.segment_id} returned an invalid duration`);
    }

    const durationMs = Math.round(result.durationMs);
    const startMs = cursorMs;
    const endMs = startMs + durationMs;
    const isFinal = index === document.segments.length - 1;
    const pauseAfterMs = isFinal
      ? 0
      : (segment.pause_after_ms ?? defaultPauseMs);
    const audioFilename = `${segment.segment_id}.mp3`;

    await writeFile(join(audioDir, audioFilename), result.audio);

    timelineSegments.push({
      segment_id: segment.segment_id,
      scene_id: segment.scene_id ?? null,
      beat_type: segment.beat_type ?? null,
      narration: segment.narration,
      source_refs: Array.isArray(segment.source_refs) ? segment.source_refs : [],
      audio_file: `audio/${audioFilename}`,
      start_ms: startMs,
      end_ms: endMs,
      duration_ms: durationMs,
      pause_after_ms: pauseAfterMs,
      trace_id: result.traceId ?? null,
      usage_characters: result.usageCharacters ?? null,
    });

    cursorMs = endMs + pauseAfterMs;
  }

  const timeline = {
    timing_status: "narration_locked",
    model: config.model,
    voice_id: config.voiceId,
    audio_format: config.format,
    sample_rate: config.sampleRate,
    segments: timelineSegments,
    narration_duration_ms: timelineSegments.at(-1).end_ms,
  };

  await writeFile(
    join(outputDir, "timeline.json"),
    `${JSON.stringify(timeline, null, 2)}\n`,
    "utf8",
  );

  return timeline;
};

