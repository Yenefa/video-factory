import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {probeDurationMs, transcodeAtTempo} from "./ffmpeg-audio.js";
import {accelerateTimeline} from "./retime.js";
import { synthesizeTimeline, validateSegmentsDocument } from "./timeline.js";

const parseArgs = (argv) => {
  const [command, ...tokens] = argv;
  const options = {};

  for (let index = 0; index < tokens.length; index += 2) {
    const flag = tokens[index];
    const value = tokens[index + 1];
    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(`invalid argument near ${flag ?? "end of command"}`);
    }
    options[flag.slice(2)] = value;
  }

  return { command, options };
};

const readSegmentsDocument = async (path) => {
  if (!path) {
    throw new Error("--segments is required");
  }
  let document;
  try {
    document = JSON.parse(await readFile(resolve(path), "utf8"));
  } catch (error) {
    throw new Error(`cannot read segments JSON: ${error.message}`);
  }
  return validateSegmentsDocument(document);
};

export const runCli = async ({
  argv,
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr,
  synthesizeTimelineImpl = synthesizeTimeline,
  accelerateTimelineImpl = accelerateTimeline,
}) => {
  try {
    const { command, options } = parseArgs(argv);
    if (command !== "validate" && command !== "synthesize" && command !== "retime") {
      throw new Error("command must be validate, synthesize, or retime");
    }

    if (command === "retime") {
      if (!options.timeline || !options.output) {
        throw new Error("--timeline and --output are required for retime");
      }
      const rate = Number(options.rate);
      if (!Number.isFinite(rate) || rate < 0.5 || rate > 2) {
        throw new Error("--rate must be between 0.5 and 2");
      }
      const timeline = await accelerateTimelineImpl({
        timelinePath: resolve(options.timeline),
        outputDir: resolve(options.output),
        rate,
        transcode: transcodeAtTempo,
        probeDurationMs,
      });
      stdout.write(
        `Retimed ${timeline.segments.length} segments at ${rate}x; narration ${timeline.narration_duration_ms} ms\n`,
      );
      return 0;
    }

    const document = await readSegmentsDocument(options.segments);

    if (command === "validate") {
      stdout.write(`Valid: ${document.segments.length} semantic segments\n`);
      return 0;
    }

    if (!env.MINIMAX_API_KEY) {
      stderr.write("MINIMAX_API_KEY is not set; synthesis was not started\n");
      return 2;
    }
    if (!options.output) {
      throw new Error("--output is required for synthesis");
    }

    const defaultPauseMs = options["pause-ms"] === undefined
      ? 250
      : Number(options["pause-ms"]);
    if (!Number.isInteger(defaultPauseMs) || defaultPauseMs < 0) {
      throw new Error("--pause-ms must be a non-negative integer");
    }

    const timeline = await synthesizeTimelineImpl({
      document,
      outputDir: resolve(options.output),
      apiKey: env.MINIMAX_API_KEY,
      defaultPauseMs,
    });
    stdout.write(
      `Synthesized ${timeline.segments.length} segments; narration ${timeline.narration_duration_ms} ms\n`,
    );
    return 0;
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 1;
  }
};

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  process.exitCode = await runCli({ argv: process.argv.slice(2) });
}
