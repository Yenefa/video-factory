import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdtemp, readFile, symlink} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";

import {persistGeneratedAsset} from "../src/asset-manifest.js";

const makeOutputDirectory = () => mkdtemp(path.join(tmpdir(), "asset-manifest-"));

const baseJob = {
  id: "hook",
  scene_id: "scene-1",
  name: "Hook",
  prompt: "p",
  negative_prompt: "n",
  image_size: "720x1280",
  classification: "emotional",
  reusable: false,
  source: {
    kind: "generated",
    reference: "generator-output:hook",
    license: "unknown",
  },
  source_metadata: {
    creator_or_publisher: null,
    attribution: null,
    ancestor_asset_id: null,
    unknown_reason: null,
  },
};

test("manifest persistence writes exact bytes, checksum, and safe provenance", async () => {
  const outputDir = await makeOutputDirectory();
  const bytes = Buffer.from([1, 2, 3]);
  const record = await persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: {
      ...baseJob,
      provider_url: "https://temporary.example/image.png?secret=api-key-test-string",
      authorization: "Bearer api-key-test-string",
    },
    image: {bytes, contentType: "image/png", url: "https://temporary.example/image.png"},
    generation: {
      model: "Kwai-Kolors/Kolors",
      seed: 7,
      traceId: "trace-1",
      url: "https://temporary.example/image.png",
      apiKey: "api-key-test-string",
      Authorization: "Bearer api-key-test-string",
    },
  });

  assert.equal(record.source, "ai_generate");
  assert.equal(record.cost_status, "unknown");
  assert.equal(record.file, "assets/hook.png");
  assert.equal(record.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.match(record.generated_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(record.source_provenance, {
    kind: "generated",
    reference: "generator-output:hook",
    license: "unknown",
    creator_or_publisher: null,
    attribution: null,
    ancestor_asset_id: null,
    unknown_reason: null,
  });
  assert.deepEqual(record.provenance, {
    created_by: "asset_planning",
    provider: "unknown",
    provider_url: null,
  });
  assert.deepEqual(await readFile(path.join(outputDir, "assets", "hook.png")), bytes);

  const manifestText = await readFile(path.join(outputDir, "asset-manifest.json"), "utf8");
  assert.deepEqual(JSON.parse(manifestText), [record]);
  assert.doesNotMatch(manifestText, /Authorization|api-key-test-string|https?:\/\//i);
});

test("uses jpg and bin extensions from MIME type", async () => {
  const outputDir = await makeOutputDirectory();
  const jpeg = await persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: {...baseJob, id: "photo"},
    image: {bytes: Buffer.from([4]), contentType: "image/jpeg"},
    generation: {model: "model", seed: 1, traceId: "trace"},
  });
  const fallback = await persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: {...baseJob, id: "fallback"},
    image: {bytes: Buffer.from([5]), contentType: "image/webp"},
    generation: {model: "model", seed: 2, traceId: "trace"},
  });

  assert.equal(jpeg.file, "assets/photo.jpg");
  assert.equal(fallback.file, "assets/fallback.bin");
});

test("rejects invalid and duplicate IDs without overwriting files", async () => {
  const outputDir = await makeOutputDirectory();
  const original = Buffer.from([1, 2, 3]);
  await persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: baseJob,
    image: {bytes: original, contentType: "image/png"},
    generation: {model: "model", seed: 1, traceId: "trace"},
  });

  await assert.rejects(
    persistGeneratedAsset({
      outputDir,
      episodeId: "episode-1",
      job: baseJob,
      image: {bytes: Buffer.from([9]), contentType: "image/png"},
      generation: {model: "model", seed: 2, traceId: "trace"},
    }),
    /duplicate asset id/i,
  );
  await assert.rejects(
    persistGeneratedAsset({
      outputDir,
      episodeId: "episode-1",
      job: {...baseJob, id: "../escape"},
      image: {bytes: Buffer.from([9]), contentType: "image/png"},
      generation: {model: "model", seed: 2, traceId: "trace"},
    }),
    /job\.id/i,
  );
  assert.deepEqual(await readFile(path.join(outputDir, "assets", "hook.png")), original);
  assert.equal(JSON.parse(await readFile(path.join(outputDir, "asset-manifest.json"), "utf8")).length, 1);
});

test("concurrent writes cannot overwrite the same asset ID", async () => {
  const outputDir = await makeOutputDirectory();
  const persist = (byte) => persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: baseJob,
    image: {bytes: Buffer.from([byte]), contentType: "image/png"},
    generation: {model: "model", seed: byte, traceId: "trace"},
  });

  const results = await Promise.allSettled([persist(1), persist(2)]);
  assert.equal(results.filter(({status}) => status === "fulfilled").length, 1);
  assert.equal(results.filter(({status}) => status === "rejected").length, 1);
  assert.equal(JSON.parse(await readFile(path.join(outputDir, "asset-manifest.json"), "utf8")).length, 1);
});

test("rejects a symlinked assets directory", async (t) => {
  const outputDir = await makeOutputDirectory();
  const targetDir = await makeOutputDirectory();
  try {
    await symlink(targetDir, path.join(outputDir, "assets"), "junction");
  } catch (error) {
    if (error?.code === "EPERM") return t.skip("symlinks are not permitted on this host");
    throw error;
  }

  await assert.rejects(
    persistGeneratedAsset({
      outputDir,
      episodeId: "episode-1",
      job: baseJob,
      image: {bytes: Buffer.from([1]), contentType: "image/png"},
      generation: {model: "model", seed: 1, traceId: "trace"},
    }),
    /symbolic link/i,
  );
});
