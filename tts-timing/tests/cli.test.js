import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { runCli } from "../src/cli.js";

const writeSegments = async () => {
  const directory = await mkdtemp(join(tmpdir(), "tts-cli-"));
  const path = join(directory, "segments.json");
  await writeFile(
    path,
    JSON.stringify({
      timing_status: "draft",
      segments: [
        { segment_id: "beat-01", narration: "第一段。" },
        { segment_id: "beat-02", narration: "第二段。" },
      ],
    }),
    "utf8",
  );
  return { directory, path };
};

const capture = () => {
  const lines = [];
  return {
    lines,
    write: (value) => lines.push(String(value)),
  };
};

test("validate command checks segments without requiring an API key", async () => {
  const { path } = await writeSegments();
  const stdout = capture();
  const stderr = capture();

  const exitCode = await runCli({
    argv: ["validate", "--segments", path],
    env: {},
    stdout,
    stderr,
  });

  assert.equal(exitCode, 0);
  assert.match(stdout.lines.join(""), /2 semantic segments/);
  assert.equal(stderr.lines.join(""), "");
});

test("synthesize command refuses to run without MINIMAX_API_KEY", async () => {
  const { directory, path } = await writeSegments();
  const stdout = capture();
  const stderr = capture();
  let called = false;

  const exitCode = await runCli({
    argv: ["synthesize", "--segments", path, "--output", directory],
    env: {},
    stdout,
    stderr,
    synthesizeTimelineImpl: async () => {
      called = true;
    },
  });

  assert.equal(exitCode, 2);
  assert.equal(called, false);
  assert.match(stderr.lines.join(""), /MINIMAX_API_KEY/);
});

test("retime command accelerates an existing timeline without an API key", async () => {
  const stdout = capture();
  const stderr = capture();
  let received;

  const exitCode = await runCli({
    argv: ["retime", "--timeline", "source/timeline.json", "--output", "output", "--rate", "1.2"],
    env: {},
    stdout,
    stderr,
    accelerateTimelineImpl: async (options) => {
      received = options;
      return {segments: [{}, {}], narration_duration_ms: 1234};
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(received.rate, 1.2);
  assert.match(received.timelinePath, /source[\\/]timeline\.json$/);
  assert.match(received.outputDir, /output$/);
  assert.match(stdout.lines.join(""), /Retimed 2 segments.*1234 ms/);
  assert.equal(stderr.lines.join(""), "");
});
