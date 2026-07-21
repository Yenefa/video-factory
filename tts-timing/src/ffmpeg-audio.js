import {spawn} from "node:child_process";
import {createRequire} from "node:module";

const require = createRequire(import.meta.url);
const ffmpegPath = require.resolve("@ffmpeg-installer/win32-x64/ffmpeg.exe");
const ffprobePath = require.resolve("@ffprobe-installer/win32-x64/ffprobe.exe");

const runBinary = (binaryPath, args) => new Promise((resolve, reject) => {
  const child = spawn(binaryPath, args, {windowsHide: true});
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => {
    if (code === 0) {
      resolve({stdout, stderr});
      return;
    }
    reject(new Error(`media command failed with exit code ${code}: ${stderr.trim()}`));
  });
});

export const transcodeAtTempo = async ({inputPath, outputPath, rate}) => {
  if (!Number.isFinite(rate) || rate < 0.5 || rate > 2) {
    throw new RangeError("rate must be between 0.5 and 2");
  }
  await runBinary(ffmpegPath, [
    "-hide_banner",
    "-loglevel", "error",
    "-y",
    "-i", inputPath,
    "-filter:a", `atempo=${rate}`,
    "-codec:a", "libmp3lame",
    "-b:a", "128k",
    "-ar", "32000",
    "-ac", "1",
    outputPath,
  ]);
};

export const probeDurationMs = async (audioPath) => {
  const {stdout} = await runBinary(ffprobePath, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    audioPath,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`ffprobe returned an invalid duration for ${audioPath}`);
  }
  return Math.round(seconds * 1000);
};
