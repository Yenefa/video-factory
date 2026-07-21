import assert from "node:assert/strict";
import {mkdtemp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";

import {accelerateTimeline, retimeTimeline} from "../src/retime.js";

test("retimeTimeline rebuilds a continuous timeline from measured accelerated audio", () => {
  const source = {
    timing_status: "narration_locked",
    model: "speech-2.6-turbo",
    voice_id: "Podcast_girl",
    audio_format: "mp3",
    sample_rate: 32000,
    segments: [
      {
        segment_id: "one",
        audio_file: "audio/one.mp3",
        start_ms: 0,
        end_ms: 1200,
        duration_ms: 1200,
        pause_after_ms: 250,
      },
      {
        segment_id: "two",
        audio_file: "audio/two.mp3",
        start_ms: 1450,
        end_ms: 2050,
        duration_ms: 600,
        pause_after_ms: 0,
      },
    ],
    narration_duration_ms: 2050,
  };

  const result = retimeTimeline({
    source,
    rate: 1.2,
    measuredDurationsMs: new Map([
      ["one", 1000],
      ["two", 500],
    ]),
  });

  assert.equal(result.tempo_multiplier, 1.2);
  assert.equal(result.audio_processing, "ffmpeg_atempo");
  assert.equal(result.segments[0].source_duration_ms, 1200);
  assert.equal(result.segments[0].duration_ms, 1000);
  assert.equal(result.segments[0].start_ms, 0);
  assert.equal(result.segments[0].end_ms, 1000);
  assert.equal(result.segments[1].start_ms, 1250);
  assert.equal(result.segments[1].end_ms, 1750);
  assert.equal(result.narration_duration_ms, 1750);
});

test("retimeTimeline rejects missing measurements", () => {
  const source = {
    segments: [{segment_id: "one", duration_ms: 1200, pause_after_ms: 0}],
  };

  assert.throws(
    () => retimeTimeline({source, rate: 1.2, measuredDurationsMs: new Map()}),
    /missing measured duration.*one/,
  );
});

test("accelerateTimeline processes every source MP3 and writes the measured timeline", async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "video-factory-retime-"));
  const sourceDirectory = path.join(temporaryDirectory, "source");
  const outputDirectory = path.join(temporaryDirectory, "output");
  const audioDirectory = path.join(sourceDirectory, "audio");
  await mkdir(audioDirectory, {recursive: true});
  await writeFile(path.join(audioDirectory, "one.mp3"), "one");
  await writeFile(path.join(audioDirectory, "two.mp3"), "two");
  await writeFile(
    path.join(sourceDirectory, "timeline.json"),
    JSON.stringify({
      segments: [
        {segment_id: "one", audio_file: "audio/one.mp3", duration_ms: 1200, pause_after_ms: 250},
        {segment_id: "two", audio_file: "audio/two.mp3", duration_ms: 600, pause_after_ms: 0},
      ],
      narration_duration_ms: 2050,
    }),
  );

  const calls = [];
  try {
    const timeline = await accelerateTimeline({
      timelinePath: path.join(sourceDirectory, "timeline.json"),
      outputDir: outputDirectory,
      rate: 1.2,
      transcode: async ({inputPath, outputPath, rate}) => {
        calls.push({inputPath, outputPath, rate});
        await writeFile(outputPath, "accelerated");
      },
      probeDurationMs: async (outputPath) => outputPath.endsWith("one.mp3") ? 1000 : 500,
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].rate, 1.2);
    assert.equal(timeline.narration_duration_ms, 1750);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDirectory, "timeline.json"), "utf8")),
      timeline,
    );
  } finally {
    await rm(temporaryDirectory, {recursive: true, force: true});
  }
});
