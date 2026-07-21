import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";

export const retimeTimeline = ({source, rate, measuredDurationsMs}) => {
  if (!source || !Array.isArray(source.segments) || source.segments.length === 0) {
    throw new TypeError("source timeline must contain segments");
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new TypeError("rate must be a positive number");
  }
  if (!(measuredDurationsMs instanceof Map)) {
    throw new TypeError("measuredDurationsMs must be a Map");
  }

  let cursorMs = 0;
  const segments = source.segments.map((segment, index) => {
    const measuredDurationMs = measuredDurationsMs.get(segment.segment_id);
    if (!Number.isFinite(measuredDurationMs) || measuredDurationMs <= 0) {
      throw new Error(`missing measured duration for ${segment.segment_id}`);
    }

    const durationMs = Math.round(measuredDurationMs);
    const startMs = cursorMs;
    const endMs = startMs + durationMs;
    const isFinal = index === source.segments.length - 1;
    const pauseAfterMs = isFinal ? 0 : (segment.pause_after_ms ?? 0);
    cursorMs = endMs + pauseAfterMs;

    return {
      ...segment,
      source_duration_ms: segment.duration_ms,
      start_ms: startMs,
      end_ms: endMs,
      duration_ms: durationMs,
      pause_after_ms: pauseAfterMs,
    };
  });

  return {
    ...source,
    timing_status: "narration_locked",
    tempo_multiplier: rate,
    audio_processing: "ffmpeg_atempo",
    segments,
    narration_duration_ms: segments.at(-1).end_ms,
  };
};

export const accelerateTimeline = async ({
  timelinePath,
  outputDir,
  rate,
  transcode,
  probeDurationMs,
}) => {
  if (typeof transcode !== "function" || typeof probeDurationMs !== "function") {
    throw new TypeError("transcode and probeDurationMs functions are required");
  }

  const source = JSON.parse(await readFile(timelinePath, "utf8"));
  if (!Array.isArray(source.segments) || source.segments.length === 0) {
    throw new TypeError("source timeline must contain segments");
  }

  const sourceDirectory = path.dirname(path.resolve(timelinePath));
  const resolvedOutputDir = path.resolve(outputDir);
  const outputAudioDir = path.join(resolvedOutputDir, "audio");
  await mkdir(outputAudioDir, {recursive: true});

  const measuredDurationsMs = new Map();
  for (const segment of source.segments) {
    const inputPath = path.resolve(sourceDirectory, segment.audio_file);
    if (!inputPath.startsWith(`${sourceDirectory}${path.sep}`)) {
      throw new Error(`audio path escapes source directory: ${segment.audio_file}`);
    }
    const outputPath = path.join(outputAudioDir, `${segment.segment_id}.mp3`);
    await transcode({inputPath, outputPath, rate});
    measuredDurationsMs.set(segment.segment_id, await probeDurationMs(outputPath));
  }

  const timeline = retimeTimeline({source, rate, measuredDurationsMs});
  await writeFile(
    path.join(resolvedOutputDir, "timeline.json"),
    `${JSON.stringify(timeline, null, 2)}\n`,
    "utf8",
  );
  return timeline;
};
