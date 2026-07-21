import {test} from "node:test";
import assert from "node:assert/strict";
import {runCli} from "../src/cli.js";

const codeJob = (overrides = {}) => ({
  id: "code",
  scene_id: "scene",
  source: "code",
  classification: "information",
  name: "Diagram",
  reusable: true,
  ...overrides,
});

const aiJob = (overrides = {}) => ({
  id: "ai-1",
  scene_id: "scene-1",
  source: "ai_generate",
  classification: "emotional",
  name: "Background",
  prompt: "a background",
  negative_prompt: "text",
  image_size: "1024x1024",
  reusable: false,
  source_metadata: {
    creator_or_publisher: null,
    attribution: null,
    ancestor_asset_id: null,
    unknown_reason: null,
  },
  ...overrides,
});

test("validate reports total and AI job counts", async () => {
  let output = "";
  const code = await runCli({
    argv: ["validate", "--jobs", "jobs.json"],
    stdout: {write: (value) => { output += value; }},
    readJobsDocument: async () => ({
      episode_id: "episode",
      policy: {},
      jobs: [codeJob()],
    }),
  });
  assert.equal(code, 0);
  assert.match(output, /Valid: 1 asset jobs; 0 AI-generation jobs/);
});

test("generate requires a credential and does not call a provider without it", async () => {
  let output = "";
  const code = await runCli({
    argv: ["generate", "--jobs", "jobs.json", "--output", "out"],
    env: {},
    stderr: {write: (value) => { output += value; }},
    readJobsDocument: async () => ({
      episode_id: "episode",
      policy: {},
      jobs: [codeJob()],
    }),
  });
  assert.equal(code, 2);
  assert.match(output, /SILICONFLOW_API_KEY is not set/);
});

test("generate orchestrates one preflight and one generation/download/persist per AI job", async () => {
  const preflight = [];
  const generations = [];
  const downloads = [];
  const persists = [];

  const code = await runCli({
    argv: ["generate", "--jobs", "jobs.json", "--output", "out"],
    env: {SILICONFLOW_API_KEY: "test-key"},
    stdout: {write: () => {}},
    stderr: {write: () => {}},
    readJobsDocument: async () => ({
      episode_id: "episode",
      policy: {},
      jobs: [
        codeJob({id: "code-1"}),
        aiJob({id: "ai-1"}),
        aiJob({id: "ai-2", scene_id: "scene-2"}),
      ],
    }),
    assertKolorsAvailableImpl: async ({apiKey}) => { preflight.push({apiKey}); },
    createKolorsImageImpl: async ({apiKey, job}) => {
      generations.push({apiKey, jobId: job.id});
      return {url: "https://example.com/image.png", seed: 42, traceId: "trace-1"};
    },
    downloadImageImpl: async ({url}) => {
      downloads.push({url});
      return {bytes: Buffer.from("data"), contentType: "image/png"};
    },
    persistGeneratedAssetImpl: async (request) => { persists.push(request); },
  });

  assert.equal(code, 0);
  assert.equal(preflight.length, 1);
  assert.equal(generations.length, 2);
  assert.equal(downloads.length, 2);
  assert.equal(persists.length, 2);
  assert.deepEqual(generations.map((g) => g.jobId), ["ai-1", "ai-2"]);
});

test("generate stops on the first provider failure and does not continue", async () => {
  const generations = [];
  let output = "";
  const code = await runCli({
    argv: ["generate", "--jobs", "jobs.json", "--output", "out"],
    env: {SILICONFLOW_API_KEY: "test-key"},
    stderr: {write: (value) => { output += value; }},
    readJobsDocument: async () => ({
      episode_id: "episode",
      policy: {},
      jobs: [
        aiJob({id: "ai-1"}),
        aiJob({id: "ai-2", scene_id: "scene-2"}),
      ],
    }),
    assertKolorsAvailableImpl: async () => {},
    createKolorsImageImpl: async ({job}) => {
      generations.push(job.id);
      if (job.id === "ai-1") {
        throw new Error("provider rejected the request");
      }
      return {url: "https://example.com/image.png", seed: 1, traceId: "t"};
    },
    downloadImageImpl: async () => ({bytes: Buffer.from("x"), contentType: "image/png"}),
    persistGeneratedAssetImpl: async () => {},
  });
  assert.equal(code, 1);
  assert.equal(generations.length, 1);
  assert.match(output, /provider rejected the request/);
});
