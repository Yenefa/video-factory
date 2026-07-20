# Asset Planning v0.3 and SiliconFlow Kolors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Asset Planning produce a local, reproducible asset manifest and let it automatically generate at most three test-video images through SiliconFlow Kolors, using a Windows-DPAPI-protected credential and no per-image confirmation.

**Architecture:** Add a small independent Node.js package at `asset-generation/`. Its pure modules validate a constrained asset-job document, preflight the configured image model, call the image API once per approved job, download temporary image URLs immediately, calculate a checksum, and atomically update a local asset manifest. A PowerShell launcher reuses the existing shared DPAPI helpers to obtain the secret without exposing it in source control, logs, or the manifest.

**Tech Stack:** Node.js 18+ native `fetch`, `node:test`, PowerShell 5+ with Windows DPAPI, SiliconFlow Images API, JSON asset manifests.

---

## File structure

- Create: `docs/asset-planning-agent-spec-v0.3.md` — the durable stage contract, source-routing policy, generated-asset metadata, and safety limits.
- Create: `docs/examples/asset-planning-v0.3-rag-jobs.json` — no-more-than-three approved jobs for the tracked RAG visual plan; it must not request images for code/SVG scenes.
- Create: `asset-generation/package.json` — isolated package scripts and Node version.
- Create: `asset-generation/src/asset-job.js` — strict input validation and default policy enforcement.
- Create: `asset-generation/src/siliconflow-client.js` — model-list preflight, request builder, safe API failures, and image download helper.
- Create: `asset-generation/src/asset-manifest.js` — manifest shape, checksum calculation, path-safe asset writes, and atomic manifest persistence.
- Create: `asset-generation/src/cli.js` — `validate` and unattended `generate` commands.
- Create: `asset-generation/run-live.ps1` — first-run secure prompt, DPAPI reuse, environment-only secret handoff, redacted logs, and reset option.
- Create: `asset-generation/tests/asset-job.test.js` — policy and job validation tests.
- Create: `asset-generation/tests/siliconflow-client.test.js` — preflight/request/error/download tests with injected fetch.
- Create: `asset-generation/tests/asset-manifest.test.js` — manifest and checksum tests under an OS temp directory.
- Create: `asset-generation/tests/cli.test.js` — CLI argument and orchestration tests with injected implementations.
- Create: `asset-generation/tests/run-live.test.js` — PowerShell DPAPI launcher reuse and no-request save-only test.
- Create: `asset-generation/README.md` — local setup, non-secret operation, output layout, and operational constraints.
- Modify: `README.md` — change Asset Planning from planned to v0.3 ready after implementation.
- Modify: `docs/versioning.md` — register Asset Planning v0.3 only if its existing version table has a matching stage list.

## Automatic policy contract

The implementation must use exactly these test defaults unless the caller supplies a stricter value:

```js
export const TEST_GENERATION_POLICY = Object.freeze({
  model: "Kwai-Kolors/Kolors",
  maxGeneratedAssets: 3,
  batchSize: 1,
  maxAttemptsPerAsset: 1,
  retryOnFailure: false,
  allowedImageSizes: ["1024x1024", "960x1280", "768x1024", "720x1440", "720x1280"],
});
```

The runner may only generate jobs explicitly marked `source: "ai_generate"`; it must never silently fall back to a paid or unconfigured provider. It must call `GET /v1/models?type=image&sub_type=text-to-image` before generation and reject the run if `Kwai-Kolors/Kolors` is absent. It must call `POST /v1/images/generations`, immediately download every returned image URL, and persist only the local file path and non-secret request metadata. It must not record Authorization headers or API keys.

## Task 1: Define the Asset Planning contract and approved test jobs

**Files:**
- Create: `docs/asset-planning-agent-spec-v0.3.md`
- Create: `docs/examples/asset-planning-v0.3-rag-jobs.json`

- [ ] **Step 1: Write the stage contract before the code**

Create `docs/asset-planning-agent-spec-v0.3.md` with these required sections:

```markdown
# Asset Planning Agent Specification v0.3

## Stage boundary

Asset Planning owns production inventory, source selection, local asset metadata, and reproducible generation requests. It does not alter Script claims, invent product screenshots, lock storyboard timing, or render video.

## Automatic routing

1. Internal library
2. Modification of an existing asset
3. Code/SVG component
4. Product capture or permitted external source
5. SiliconFlow Kolors only when a job explicitly requires `ai_generate`

## Test safety policy

- At most three generated assets per run.
- One generated image per request.
- One attempt per asset; no automatic retry.
- No automatic fallback provider.
- Download a returned image URL immediately; its remote URL is transient.
- Store DPAPI-encrypted credentials outside the repository.
```

Include the exact manifest schema, source and license fields, and failure behavior from the policy contract above. State `cost_status: "unknown"` instead of describing Kolors as free, because account-specific pricing is not established by this repository.

- [ ] **Step 2: Create a job fixture that proves code/SVG scenes remain code/SVG**

Create `docs/examples/asset-planning-v0.3-rag-jobs.json` with this complete shape; prompts must be descriptive but must not make factual claims absent from the Visual Plan:

```json
{
  "episode_id": "rag-2026-07-21",
  "policy": {
    "max_generated_assets": 3,
    "batch_size": 1,
    "max_attempts_per_asset": 1,
    "retry_on_failure": false
  },
  "jobs": [
    {
      "id": "rag-s1-hook-background",
      "scene_id": "scene-1",
      "source": "ai_generate",
      "classification": "emotional",
      "name": "RAG hook abstract background",
      "prompt": "Abstract editorial background for a vertical technology short: a dark research desk seen from above, scattered neutral document rectangles forming an uncertain maze, one warm coral path emerging from the center, no text, no logos, no people, clean Claude x Google visual language",
      "negative_prompt": "letters, numbers, watermark, logo, brand mark, UI screenshot, robot, brain, chip",
      "image_size": "720x1280",
      "reusable": false
    },
    {
      "id": "rag-s3-retrieval-atmosphere",
      "scene_id": "scene-3",
      "source": "ai_generate",
      "classification": "emotional",
      "name": "Retrieval selection atmosphere",
      "prompt": "Vertical abstract technology editorial illustration: a quiet dark field of pale document cards, a single focused beam isolates three relevant cards while the rest recede softly, warm coral accent, teal supporting accent, no text, no logos, no characters, restrained research-document mood",
      "negative_prompt": "letters, numbers, watermark, logo, brand mark, robot, brain, chip",
      "image_size": "720x1280",
      "reusable": false
    },
    {
      "id": "rag-s5-ending-background",
      "scene_id": "scene-5",
      "source": "ai_generate",
      "classification": "emotional",
      "name": "RAG ending abstract background",
      "prompt": "Minimal vertical closing visual for a technology short: a sparse dark space with a few document cards aligning into one clear route, generous negative space, warm coral focal glow, muted teal details, editorial research aesthetic, no text, no logos, no people",
      "negative_prompt": "letters, numbers, watermark, logo, brand mark, robot, brain, chip",
      "image_size": "720x1280",
      "reusable": false
    },
    {
      "id": "rag-s2-context-diagram",
      "scene_id": "scene-2",
      "source": "code",
      "classification": "information",
      "name": "Context overload diagram",
      "component": "ContextOverloadDiagram",
      "reusable": true
    }
  ]
}
```

- [ ] **Step 3: Validate the fixture after the validation command exists**

Run: `npm.cmd run validate -- --jobs ../docs/examples/asset-planning-v0.3-rag-jobs.json` from `asset-generation/`

Expected: `Valid: 4 asset jobs; 3 AI-generation jobs`

- [ ] **Step 4: Commit only the new contract and fixture**

```powershell
git add docs/asset-planning-agent-spec-v0.3.md docs/examples/asset-planning-v0.3-rag-jobs.json
git commit -m "docs: define asset planning agent v0.3"
```

## Task 2: Build and test asset-job validation

**Files:**
- Create: `asset-generation/package.json`
- Create: `asset-generation/src/asset-job.js`
- Create: `asset-generation/tests/asset-job.test.js`

- [ ] **Step 1: Write failing validation tests**

Create `asset-generation/tests/asset-job.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {TEST_GENERATION_POLICY, validateAssetJobsDocument} from "../src/asset-job.js";

const aiJob = {
  id: "hook", scene_id: "scene-1", source: "ai_generate", classification: "emotional",
  name: "Hook", prompt: "abstract document field", negative_prompt: "text", image_size: "720x1280", reusable: false,
};

test("accepts at most three explicit Kolors jobs", () => {
  const result = validateAssetJobsDocument({episode_id: "episode", policy: {}, jobs: [aiJob]});
  assert.equal(result.aiGenerationJobs.length, 1);
  assert.equal(result.policy.model, TEST_GENERATION_POLICY.model);
});

test("rejects more than three generation jobs", () => {
  assert.throws(() => validateAssetJobsDocument({episode_id: "episode", policy: {}, jobs: [aiJob, {...aiJob, id: "two"}, {...aiJob, id: "three"}, {...aiJob, id: "four"}]}), /at most 3/);
});

test("rejects an unsupported Kolors image size and retry policy", () => {
  assert.throws(() => validateAssetJobsDocument({episode_id: "episode", policy: {retry_on_failure: true}, jobs: [aiJob]}), /retry_on_failure/);
  assert.throws(() => validateAssetJobsDocument({episode_id: "episode", policy: {}, jobs: [{...aiJob, image_size: "1080x1920"}]}), /image_size/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --test-name-pattern="asset"`

Expected: FAIL because `../src/asset-job.js` does not exist.

- [ ] **Step 3: Implement the validator**

Create `asset-generation/src/asset-job.js` exporting `TEST_GENERATION_POLICY` exactly as documented and a `validateAssetJobsDocument(document)` function. It must:

```js
const requiredString = (value, field) => {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field} must be a non-empty string`);
  return value.trim();
};

export const validateAssetJobsDocument = (document) => {
  const episodeId = requiredString(document?.episode_id, "episode_id");
  if (!Array.isArray(document?.jobs) || document.jobs.length === 0) throw new Error("jobs must be a non-empty array");
  const suppliedPolicy = document.policy ?? {};
  const policy = {
    ...TEST_GENERATION_POLICY,
    maxGeneratedAssets: suppliedPolicy.max_generated_assets ?? TEST_GENERATION_POLICY.maxGeneratedAssets,
    batchSize: suppliedPolicy.batch_size ?? TEST_GENERATION_POLICY.batchSize,
    maxAttemptsPerAsset: suppliedPolicy.max_attempts_per_asset ?? TEST_GENERATION_POLICY.maxAttemptsPerAsset,
    retryOnFailure: suppliedPolicy.retry_on_failure ?? TEST_GENERATION_POLICY.retryOnFailure,
  };
  if (policy.maxGeneratedAssets > TEST_GENERATION_POLICY.maxGeneratedAssets) throw new Error("max_generated_assets may be at most 3");
  if (policy.batchSize !== 1 || policy.maxAttemptsPerAsset !== 1 || policy.retryOnFailure !== false) throw new Error("batch_size must be 1, max_attempts_per_asset must be 1, and retry_on_failure must be false");
  return {episodeId, policy, jobs, aiGenerationJobs};
};
```

Require unique job IDs; validate `source` against `library`, `modify`, `code`, `capture`, `external`, and `ai_generate`; require prompt, negative prompt, and supported image size only for `ai_generate`; and reject more than `policy.maxGeneratedAssets` AI jobs.

Create `asset-generation/package.json`:

```json
{
  "name": "video-factory-asset-generation",
  "version": "0.3.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "validate": "node src/cli.js validate",
    "generate": "node src/cli.js generate"
  },
  "engines": {"node": ">=18"}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd test -- --test-name-pattern="asset"`

Expected: PASS.

- [ ] **Step 5: Commit the isolated validator**

```powershell
git add asset-generation/package.json asset-generation/src/asset-job.js asset-generation/tests/asset-job.test.js
git commit -m "feat: validate constrained asset jobs"
```

## Task 3: Build and test the SiliconFlow client

**Files:**
- Create: `asset-generation/src/siliconflow-client.js`
- Create: `asset-generation/tests/siliconflow-client.test.js`

- [ ] **Step 1: Write failing client tests with an injected fetch implementation**

Create `asset-generation/tests/siliconflow-client.test.js` that verifies all of the following:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {assertKolorsAvailable, createKolorsImage, downloadImage} from "../src/siliconflow-client.js";

test("preflight accepts the configured model", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({data: [{id: "Kwai-Kolors/Kolors"}]}), {status: 200});
  await assert.doesNotReject(() => assertKolorsAvailable({apiKey: "secret", fetchImpl}));
});

test("preflight rejects a missing configured model without exposing its key", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({data: []}), {status: 200});
  await assert.rejects(() => assertKolorsAvailable({apiKey: "secret-never-log", fetchImpl}), (error) => !error.message.includes("secret-never-log") && /not available/.test(error.message));
});

test("generation uses one Kolors image with the approved request body", async () => {
  let request;
  const fetchImpl = async (_url, options) => { request = options; return new Response(JSON.stringify({images: [{url: "https://temporary.example/image.png"}], seed: 7}), {status: 200}); };
  const response = await createKolorsImage({apiKey: "secret", job: {prompt: "p", negative_prompt: "n", image_size: "720x1280"}, fetchImpl});
  assert.deepEqual(JSON.parse(request.body), {model: "Kwai-Kolors/Kolors", prompt: "p", negative_prompt: "n", image_size: "720x1280", batch_size: 1, num_inference_steps: 20, guidance_scale: 7.5});
  assert.equal(response.url, "https://temporary.example/image.png");
});

test("download returns bytes and rejects unsuccessful responses", async () => {
  const bytes = await downloadImage({url: "https://temporary.example/image.png", fetchImpl: async () => new Response(new Uint8Array([1, 2, 3]), {status: 200, headers: {"content-type": "image/png"}})});
  assert.deepEqual([...bytes.bytes], [1, 2, 3]);
  await assert.rejects(() => downloadImage({url: "https://temporary.example/missing", fetchImpl: async () => new Response("no", {status: 403})}), /download failed/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --test-name-pattern="preflight|generation|download"`

Expected: FAIL because `../src/siliconflow-client.js` does not exist.

- [ ] **Step 3: Implement the no-retry API client**

Create `asset-generation/src/siliconflow-client.js` with:

```js
export const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
export const KOLORS_MODEL = "Kwai-Kolors/Kolors";

const authorizationHeaders = (apiKey) => ({Authorization: `Bearer ${apiKey}`});
const readJson = async (response, operation) => {
  let body;
  try { body = await response.json(); } catch { body = undefined; }
  if (!response.ok) throw new Error(`${operation} failed with HTTP ${response.status}`);
  return body;
};
```

`assertKolorsAvailable` must GET `/models?type=image&sub_type=text-to-image`, accept either a `data` or `models` array of objects with `id`, and fail with `configured model Kwai-Kolors/Kolors is not available` if absent. `createKolorsImage` must POST `/images/generations` with the tested fixed payload, verify exactly one non-empty URL, and return `{url, seed, traceId}`. `downloadImage` must use the temporary URL without Authorization, return `{bytes: Buffer, contentType}`, and never retry. None of its errors may interpolate an API key or response body.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd test -- --test-name-pattern="preflight|generation|download"`

Expected: PASS.

- [ ] **Step 5: Commit the client**

```powershell
git add asset-generation/src/siliconflow-client.js asset-generation/tests/siliconflow-client.test.js
git commit -m "feat: add siliconflow kolors client"
```

## Task 4: Persist generated assets and their provenance safely

**Files:**
- Create: `asset-generation/src/asset-manifest.js`
- Create: `asset-generation/tests/asset-manifest.test.js`

- [ ] **Step 1: Write failing manifest tests**

Create `asset-generation/tests/asset-manifest.test.js` that creates a temporary directory and checks that `persistGeneratedAsset`:

```js
const record = await persistGeneratedAsset({
  outputDir: temporaryDirectory,
  episodeId: "episode-1",
  job: {id: "hook", scene_id: "scene-1", name: "Hook", prompt: "p", negative_prompt: "n", image_size: "720x1280", classification: "emotional", reusable: false},
  image: {bytes: Buffer.from([1, 2, 3]), contentType: "image/png"},
  generation: {model: "Kwai-Kolors/Kolors", seed: 7, traceId: "trace-1"},
});
assert.equal(record.source, "ai_generate");
assert.equal(record.cost_status, "unknown");
assert.equal(record.file, "assets/hook.png");
assert.match(record.sha256, /^[a-f0-9]{64}$/);
```

The test must also verify that `asset-manifest.json` contains the record but has neither `Authorization` nor an API-key test string.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --test-name-pattern="manifest"`

Expected: FAIL because `../src/asset-manifest.js` does not exist.

- [ ] **Step 3: Implement atomic local persistence**

Create `asset-generation/src/asset-manifest.js`. Use `mkdir`, `writeFile`, `rename`, `readFile`, and `createHash` from Node built-ins. `persistGeneratedAsset` must create `<outputDir>/assets`, derive only a safe filename from `job.id` using `/^[a-z0-9][a-z0-9-]*$/`, map `image/png` to `.png`, `image/jpeg` to `.jpg`, and default all other types to `.bin`, then atomically write the file and `<outputDir>/asset-manifest.json`.

Every manifest record must contain:

```js
{
  id, episode_id, scene_id, name, source: "ai_generate", classification,
  file: "assets/<safe-id>.<extension>", sha256, content_type,
  model: "Kwai-Kolors/Kolors", seed, trace_id,
  image_size, prompt, negative_prompt, reusable,
  cost_status: "unknown", generated_at
}
```

Do not persist temporary provider URLs, HTTP headers, request bodies beyond the safe prompt fields, or secrets. Reject duplicate asset IDs in a manifest instead of overwriting them.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm.cmd test -- --test-name-pattern="manifest"`

Expected: PASS.

- [ ] **Step 5: Commit the persistence layer**

```powershell
git add asset-generation/src/asset-manifest.js asset-generation/tests/asset-manifest.test.js
git commit -m "feat: persist generated asset manifests"
```

## Task 5: Assemble the command-line generation workflow

**Files:**
- Create: `asset-generation/src/cli.js`
- Create: `asset-generation/tests/cli.test.js`

- [ ] **Step 1: Write failing CLI tests**

Create `asset-generation/tests/cli.test.js` that imports `runCli` and tests:

```js
test("validate reports total and AI job counts", async () => {
  let output = "";
  const code = await runCli({argv: ["validate", "--jobs", "jobs.json"], stdout: {write: (value) => { output += value; }}, readJobsDocument: async () => ({episode_id: "episode", policy: {}, jobs: [{id: "code", scene_id: "scene", source: "code", classification: "information", name: "Diagram", component: "Diagram", reusable: true}]} )});
  assert.equal(code, 0);
  assert.match(output, /Valid: 1 asset jobs; 0 AI-generation jobs/);
});

test("generate requires a credential and does not call a provider without it", async () => {
  let output = "";
  const code = await runCli({argv: ["generate", "--jobs", "jobs.json", "--output", "out"], env: {}, stderr: {write: (value) => { output += value; }}});
  assert.equal(code, 2);
  assert.match(output, /SILICONFLOW_API_KEY is not set/);
});
```

Add a third test that injects `assertKolorsAvailableImpl`, `createKolorsImageImpl`, `downloadImageImpl`, and `persistGeneratedAssetImpl`, then asserts exactly one preflight and one generation/download/persist sequence per AI job.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --test-name-pattern="validate reports|generate requires|orchestration"`

Expected: FAIL because `../src/cli.js` does not exist.

- [ ] **Step 3: Implement the CLI orchestration**

Create `asset-generation/src/cli.js` with `validate` and `generate` commands only. It must require `--jobs` for both and `--output` for generate. `validate` reads JSON and prints the exact expected line. `generate` validates first, returns exit code 2 if `SILICONFLOW_API_KEY` is absent, runs preflight exactly once, then processes only `aiGenerationJobs` sequentially in fixture order. For each asset, it calls generation, downloads immediately, and persists it. On the first provider, download, or persistence failure, print one safe error and return 1; do not continue to another asset and do not retry.

Never print an environment value. Direct execution must set `process.exitCode = await runCli(...)`.

- [ ] **Step 4: Run the test suite and fixture validation**

Run:

```powershell
npm.cmd test
npm.cmd run validate -- --jobs ../docs/examples/asset-planning-v0.3-rag-jobs.json
```

Expected: all `asset-generation` tests pass, then `Valid: 4 asset jobs; 3 AI-generation jobs`.

- [ ] **Step 5: Commit the CLI**

```powershell
git add asset-generation/src/cli.js asset-generation/tests/cli.test.js
git commit -m "feat: automate constrained asset generation"
```

## Task 6: Add the one-time Windows secure credential launcher

**Files:**
- Create: `asset-generation/run-live.ps1`
- Create: `asset-generation/tests/run-live.test.js`
- Modify: `tts-timing/credential-store.ps1` only if its error wording is generalized without changing behavior.

- [ ] **Step 1: Write a failing secure-launcher test**

Create `asset-generation/tests/run-live.test.js`. It must make an OS temp directory and run PowerShell with `-NoProfile -ExecutionPolicy Bypass -NonInteractive`. Dot-source `../../tts-timing/credential-store.ps1`, store `test-secret-not-a-real-key` at a temporary `siliconflow.dpapi` path, then invoke `run-live.ps1 -CredentialPath <path> -SaveCredentialOnly`. Assert exit status 0, output contains `Using the SiliconFlow credential saved for this Windows account.`, output contains `No SiliconFlow request was made.`, and output does not contain `Enter SILICONFLOW_API_KEY`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --test-name-pattern="secure launcher"`

Expected: FAIL because `run-live.ps1` does not exist.

- [ ] **Step 3: Implement secure key reuse and redacted logging**

Create `asset-generation/run-live.ps1` with these parameters:

```powershell
param(
  [string]$Jobs = "..\docs\examples\asset-planning-v0.3-rag-jobs.json",
  [string]$Output = "..\RawMaterialCollector\RAG\script\assets",
  [string]$CredentialPath = (Join-Path $env:LOCALAPPDATA "VideoFactory\credentials\siliconflow-api-key.dpapi"),
  [switch]$ResetCredential,
  [switch]$SaveCredentialOnly
)
```

Dot-source `../tts-timing/credential-store.ps1`. Follow the existing `tts-timing/run-live.ps1` BSTR lifecycle exactly: load existing credential unless reset, otherwise call `Read-Host "Enter SILICONFLOW_API_KEY (saved securely after this prompt)" -AsSecureString`, save through `Save-VideoFactoryCredential`, convert only long enough to set `$env:SILICONFLOW_API_KEY`, invoke `npm.cmd run generate -- --jobs $Jobs --output $Output`, then always remove the environment variable and zero the BSTR. Log only redacted output and errors; redact `sk-[A-Za-z0-9_-]+` patterns, but do not treat logs as secret storage.

Do not make an API request for `-SaveCredentialOnly`.

- [ ] **Step 4: Run the secure-launcher test and full package test suite**

Run:

```powershell
npm.cmd test -- --test-name-pattern="secure launcher"
npm.cmd test
```

Expected: PASS, then all tests pass.

- [ ] **Step 5: Commit only the new launcher and test**

```powershell
git add asset-generation/run-live.ps1 asset-generation/tests/run-live.test.js
git commit -m "feat: add secure siliconflow launcher"
```

## Task 7: Document operation and update the pipeline index

**Files:**
- Create: `asset-generation/README.md`
- Modify: `README.md`
- Modify: `docs/versioning.md`

- [ ] **Step 1: Write the package README**

Create `asset-generation/README.md` including exactly these operating commands:

```powershell
cd asset-generation
npm.cmd test
npm.cmd run validate -- --jobs ../docs/examples/asset-planning-v0.3-rag-jobs.json
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-live.ps1 -SaveCredentialOnly
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-live.ps1
```

Explain that the first save-only run prompts once for a newly rotated key; later runs reuse Windows-DPAPI storage. State all current hard limits: 3 images total, one output per request, one attempt, no automatic retry, no provider fallback, and immediate download. State that the remote response URL is transient and that `asset-manifest.json` records `cost_status: "unknown"`; operators must check their SiliconFlow account before spending.

- [ ] **Step 2: Update pipeline status without overwriting unrelated user changes**

In `README.md`, change only the Asset Planning row to state that v0.3 has a spec, constrained automatic SiliconFlow Kolors generation, a DPAPI launcher, and a tracked RAG test-job fixture. In `docs/versioning.md`, add an Asset Planning v0.3 entry only if the document has a version table; preserve all existing uncommitted lines.

- [ ] **Step 3: Run all relevant validations**

Run:

```powershell
git diff --check
cd asset-generation; npm.cmd test
cd ..; git status --short
```

Expected: no whitespace errors; all tests pass; status shows only intended Asset Planning additions/modifications plus the pre-existing unrelated changes.

- [ ] **Step 4: Commit safely**

```powershell
git add asset-generation/README.md README.md docs/versioning.md
git commit -m "docs: document automated asset planning"
```

Before committing `README.md` or `docs/versioning.md`, inspect their diff and stage only the intended hunks. If pre-existing changes cannot be separated safely, do not commit these two modified files; report them as left unstaged.

## Task 8: Real-account smoke test after the user rotates and locally saves a new key

**Files:**
- Uses: `asset-generation/run-live.ps1`
- Uses: `docs/examples/asset-planning-v0.3-rag-jobs.json`
- Output: `RawMaterialCollector/RAG/script/assets/`

- [ ] **Step 1: Save the newly rotated key locally**

Run from `asset-generation/`:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-live.ps1 -ResetCredential -SaveCredentialOnly
```

Expected: a local secure prompt appears once; it reports that the credential is saved with Windows DPAPI and explicitly reports that no SiliconFlow request was made.

- [ ] **Step 2: Run the constrained real generation**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-live.ps1
```

Expected: one model preflight, then at most three sequential generation requests. Any failure stops the run immediately; it does not retry or fall back to another provider.

- [ ] **Step 3: Inspect only non-secret output metadata**

Run:

```powershell
Get-Content -Raw ..\RawMaterialCollector\RAG\script\assets\asset-manifest.json
Get-ChildItem ..\RawMaterialCollector\RAG\script\assets\assets
```

Expected: up to three local image files and an `asset-manifest.json` containing checksums, prompts, model identifiers, and `cost_status: "unknown"`, but no API key, Authorization header, or temporary provider URL.

## Review checklist

- [ ] The job validator rejects more than three `ai_generate` jobs, batch sizes other than one, automatic retries, unsupported sizes, duplicate IDs, and missing prompt fields.
- [ ] The provider client preflights model availability, requests one image at a time, immediately downloads returned URLs, and never emits a secret.
- [ ] The manifest is atomic, stores local files and checksums, rejects duplicate records, and excludes provider URLs and credentials.
- [ ] The PowerShell launcher uses the existing DPAPI helper, does not request a secret when one is saved, and clears the temporary environment variable in `finally`.
- [ ] The generated test fixture contains exactly three `ai_generate` jobs and at least one `code` job to prove not every scene is routed through image generation.
- [ ] `git diff --check` and `asset-generation` tests pass before completion.
