import assert from "node:assert/strict";
import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";

import {probeDurationMs, transcodeAtTempo} from "../src/ffmpeg-audio.js";

const createSilentWav = ({durationMs, sampleRate = 8000}) => {
  const sampleCount = Math.round(sampleRate * durationMs / 1000);
  const dataSize = sampleCount * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);
  return wav;
};

test("FFmpeg atempo 1.2 produces audio measured near one second from a 1.2-second source", async () => {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "video-factory-ffmpeg-"));
  const inputPath = path.join(temporaryDirectory, "input.wav");
  const outputPath = path.join(temporaryDirectory, "output.mp3");

  try {
    await writeFile(inputPath, createSilentWav({durationMs: 1200}));
    await transcodeAtTempo({inputPath, outputPath, rate: 1.2});
    const durationMs = await probeDurationMs(outputPath);
    assert.ok(durationMs >= 950 && durationMs <= 1100, `unexpected duration: ${durationMs}ms`);
  } finally {
    await rm(temporaryDirectory, {recursive: true, force: true});
  }
});
