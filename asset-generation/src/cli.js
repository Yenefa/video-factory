import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {validateAssetJobsDocument} from "./asset-job.js";
import {
  assertKolorsAvailable,
  createKolorsImage,
  downloadImage,
  KOLORS_MODEL,
} from "./siliconflow-client.js";
import {persistGeneratedAsset} from "./asset-manifest.js";

const parseArgs = (argv) => {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    if (flag === "--jobs") {
      options.jobs = rest[i + 1];
      i += 1;
    } else if (flag === "--output") {
      options.output = rest[i + 1];
      i += 1;
    }
  }
  return {command, ...options};
};

const redact = (text) => text
  .replace(/https?:\/\/\S+/gi, "[redacted-url]")
  .replace(/\bsk-[a-z0-9_-]{8,}\b/gi, "[redacted-key]");

const safeMessage = (error) => redact(error instanceof Error ? error.message : String(error));

const defaultReadJobsDocument = async (jobsPath) => {
  const raw = await readFile(jobsPath, "utf8");
  return JSON.parse(raw);
};

export const runCli = async ({
  argv = process.argv.slice(2),
  stdout = process.stdout,
  stderr = process.stderr,
  env = process.env,
  readJobsDocument = defaultReadJobsDocument,
  assertKolorsAvailableImpl = assertKolorsAvailable,
  createKolorsImageImpl = createKolorsImage,
  downloadImageImpl = downloadImage,
  persistGeneratedAssetImpl = persistGeneratedAsset,
} = {}) => {
  const {command, jobs: jobsPath, output} = parseArgs(argv);

  if (command !== "validate" && command !== "generate") {
    stderr.write(`unknown command: ${command ?? "(none)"}\n`);
    return 2;
  }

  if (!jobsPath) {
    stderr.write("--jobs is required\n");
    return 2;
  }

  let document;
  try {
    document = await readJobsDocument(jobsPath);
  } catch (error) {
    stderr.write(`could not read jobs document: ${safeMessage(error)}\n`);
    return 1;
  }

  let validated;
  try {
    validated = validateAssetJobsDocument(document);
  } catch (error) {
    stderr.write(`invalid jobs document: ${safeMessage(error)}\n`);
    return 1;
  }

  if (command === "validate") {
    stdout.write(`Valid: ${validated.jobs.length} asset jobs; ${validated.aiGenerationJobs.length} AI-generation jobs\n`);
    return 0;
  }

  if (!output) {
    stderr.write("--output is required for generate\n");
    return 2;
  }

  const apiKey = env.SILICONFLOW_API_KEY;
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    stderr.write("SILICONFLOW_API_KEY is not set\n");
    return 2;
  }

  try {
    await assertKolorsAvailableImpl({apiKey});
    for (const job of validated.aiGenerationJobs) {
      const generation = await createKolorsImageImpl({apiKey, job});
      const image = await downloadImageImpl({url: generation.url});
      await persistGeneratedAssetImpl({
        outputDir: output,
        episodeId: validated.episodeId,
        job,
        image,
        generation: {
          model: KOLORS_MODEL,
          seed: generation.seed,
          traceId: generation.traceId,
        },
      });
    }
  } catch (error) {
    stderr.write(`${safeMessage(error)}\n`);
    return 1;
  }

  return 0;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli();
}
