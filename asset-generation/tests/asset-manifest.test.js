import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import * as fs from "node:fs/promises";
import {mkdtemp, mkdir, readFile, symlink, writeFile} from "node:fs/promises";
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
  source: "ai_generate",
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
    job: baseJob,
    image: {bytes, contentType: "image/png"},
    generation: {
      model: "Kwai-Kolors/Kolors",
      seed: 7,
      traceId: "trace-1",
    },
  });

  assert.equal(record.asset_id, "hook");
  assert.equal(record.id, "hook");
  assert.equal(record.stage, "asset_planning");
  assert.deepEqual(record.stage_boundary, {upstream: "visual_language", downstream: "storyboard"});
  assert.equal(record.route, "ai_generate");
  assert.equal(record.status, "ready");
  assert.deepEqual(record.technical_spec, {width: 720, height: 1280, format: "png", alpha: false});
  assert.equal(record.cost_status, "unknown");
  assert.equal(record.file, "assets/hook.png");
  assert.equal(record.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.match(record.generated_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(record.source, {
    kind: "generated",
    reference: "generator-output:hook",
    license: "unknown",
    creator_or_publisher: null,
    attribution: null,
    ancestor_asset_id: null,
    unknown_reason: null,
  });
  assert.equal("source_provenance" in record, false);
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

test("validates all required inputs before creating output files", async () => {
  const outputDir = path.join(await makeOutputDirectory(), "not-created");
  const requiredCases = [
    {label: "episodeId", request: {episodeId: ""}},
    {label: "scene_id", request: {job: {...baseJob, scene_id: ""}}},
    {label: "name", request: {job: {...baseJob, name: undefined}}},
    {label: "classification", request: {job: {...baseJob, classification: ""}}},
    {label: "prompt", request: {job: {...baseJob, prompt: ""}}},
    {label: "negative_prompt", request: {job: {...baseJob, negative_prompt: undefined}}},
    {label: "image_size", request: {job: {...baseJob, image_size: "720/1280"}}},
    {label: "reusable", request: {job: {...baseJob, reusable: "false"}}},
    {label: "source", request: {job: {...baseJob, source: "external"}}},
    {label: "image.bytes", request: {image: {bytes: new Uint8Array([1]), contentType: "image/png"}}},
    {label: "contentType", request: {image: {bytes: Buffer.from([1]), contentType: ""}}},
    {label: "model", request: {generation: {model: "", seed: 1, traceId: "trace"}}},
    {label: "seed", request: {generation: {model: "model", seed: undefined, traceId: "trace"}}},
    {label: "traceId", request: {generation: {model: "model", seed: 1, traceId: ""}}},
  ];

  for (const {label, request} of requiredCases) {
    await assert.rejects(
      persistGeneratedAsset({
        outputDir,
        episodeId: request.episodeId ?? "episode-1",
        job: request.job ?? baseJob,
        image: request.image ?? {bytes: Buffer.from([1]), contentType: "image/png"},
        generation: request.generation ?? {model: "model", seed: 1, traceId: "trace"},
      }),
      new RegExp(label.replace(".", "\\."), "i"),
    );
  }
  await assert.rejects(readFile(path.join(outputDir, "asset-manifest.json")), /ENOENT/);
});

test("rejects tainted fields and non-null generated provenance before writing", async () => {
  const taintedRequests = [
    {job: {...baseJob, provider_url: "https://temporary.example/image.png"}},
    {job: {...baseJob, authorization: "Bearer secret"}},
    {job: {...baseJob, source_metadata: {...baseJob.source_metadata, attribution: "secret"}}},
    {generation: {model: "model", seed: 1, traceId: "trace", apiKey: "secret"}},
    {generation: {model: "model", seed: 1, traceId: "trace", url: "https://temporary.example/image.png"}},
    {image: {bytes: Buffer.from([1]), contentType: "image/png", url: "https://temporary.example/image.png"}},
  ];

  for (const request of taintedRequests) {
    const outputDir = path.join(await makeOutputDirectory(), "not-created");
    await assert.rejects(
      persistGeneratedAsset({
        outputDir,
        episodeId: "episode-1",
        job: request.job ?? baseJob,
        image: request.image ?? {bytes: Buffer.from([1]), contentType: "image/png"},
        generation: request.generation ?? {model: "model", seed: 1, traceId: "trace"},
      }),
      /unsupported|source_metadata/i,
    );
    await assert.rejects(readFile(path.join(outputDir, "asset-manifest.json")), /ENOENT/);
  }
});

test("rejects credentials and explicit URLs hidden in persisted field values", async () => {
  const taintedValues = [
    {job: {...baseJob, prompt: "Bearer top-secret-token"}},
    {job: {...baseJob, name: "https://temporary.example/image.png"}},
    {generation: {model: "sk-1234567890abcdef", seed: 1, traceId: "trace"}},
    {generation: {model: "model", seed: 1, traceId: "https://temporary.example/trace"}},
  ];

  for (const request of taintedValues) {
    const outputDir = path.join(await makeOutputDirectory(), "not-created");
    await assert.rejects(
      persistGeneratedAsset({
        outputDir,
        episodeId: "episode-1",
        job: request.job ?? baseJob,
        image: {bytes: Buffer.from([1]), contentType: "image/png"},
        generation: request.generation ?? {model: "model", seed: 1, traceId: "trace"},
      }),
      (error) => {
        assert.match(error.message, /unsafe persisted value/i);
        assert.doesNotMatch(error.message, /top-secret|temporary\.example|sk-123/i);
        return true;
      },
    );
    await assert.rejects(readFile(path.join(outputDir, "asset-manifest.json")), /ENOENT/);
  }

  const safeOutputDir = await makeOutputDirectory();
  const safeRecord = await persistGeneratedAsset({
    outputDir: safeOutputDir,
    episodeId: "episode-1",
    job: {...baseJob, prompt: "Avoid https references in the composition"},
    image: {bytes: Buffer.from([1]), contentType: "image/png"},
    generation: {model: "model", seed: 1, traceId: "trace"},
  });
  assert.equal(safeRecord.prompt, "Avoid https references in the composition");
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

test("two contenders cannot both reclaim the same stale lock", async () => {
  const outputDir = await makeOutputDirectory();
  const lockPath = path.join(outputDir, ".asset-manifest.lock");
  await writeFile(lockPath, JSON.stringify({pid: 2147483647, nonce: "stale-owner"}));

  let staleReads = 0;
  let releaseReads;
  const bothRead = new Promise((resolve) => { releaseReads = resolve; });
  let releaseFirstRemover;
  const secondOwnerInstalled = new Promise((resolve) => { releaseFirstRemover = resolve; });
  const sharedReadFile = async (...args) => {
    const result = await fs.readFile(...args);
    if (path.resolve(args[0]) === path.resolve(lockPath)) {
      staleReads += 1;
      if (staleReads === 2) releaseReads();
      await bothRead;
    }
    return result;
  };
  const firstFs = {
    ...fs,
    readFile: sharedReadFile,
    rm: async (target, options) => {
      if (path.resolve(target) === path.resolve(lockPath)) {
        const currentLock = JSON.parse(await fs.readFile(target, "utf8"));
        if (currentLock.nonce === "stale-owner") await secondOwnerInstalled;
      }
      return fs.rm(target, options);
    },
  };
  const secondFs = {
    ...fs,
    readFile: sharedReadFile,
    writeFile: async (target, data, options) => {
      const result = await fs.writeFile(target, data, options);
      if (path.resolve(target) === path.resolve(lockPath) && options?.flag === "wx") {
        releaseFirstRemover();
      }
      return result;
    },
  };
  const persist = (id, fileSystem) => persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: {...baseJob, id},
    image: {bytes: Buffer.from([1]), contentType: "image/png"},
    generation: {model: "model", seed: 1, traceId: "trace"},
  }, {fileSystem});

  const results = await Promise.allSettled([persist("first", firstFs), persist("second", secondFs)]);
  assert.equal(results.filter(({status}) => status === "fulfilled").length, 1);
  assert.equal(results.filter(({status}) => status === "rejected").length, 1);
  assert.equal(JSON.parse(await readFile(path.join(outputDir, "asset-manifest.json"), "utf8")).length, 1);
});

test("rolls back the image and journal when the manifest rename fails", async () => {
  const outputDir = await makeOutputDirectory();
  const failingFs = {
    ...fs,
    rename: async (source, destination) => {
      if (path.basename(destination) === "asset-manifest.json") {
        throw new Error("injected manifest rename failure");
      }
      return fs.rename(source, destination);
    },
  };

  await assert.rejects(
    persistGeneratedAsset({
      outputDir,
      episodeId: "episode-1",
      job: baseJob,
      image: {bytes: Buffer.from([1]), contentType: "image/png"},
      generation: {model: "model", seed: 1, traceId: "trace"},
    }, {fileSystem: failingFs}),
    /injected manifest rename failure/,
  );
  await assert.rejects(readFile(path.join(outputDir, "assets", "hook.png")), /ENOENT/);
  await assert.rejects(readFile(path.join(outputDir, ".asset-manifest-transaction.json")), /ENOENT/);
});

test("retains the journal when image rollback fails so the next invocation recovers", async () => {
  const outputDir = await makeOutputDirectory();
  let imageCleanupFailed = false;
  const failingFs = {
    ...fs,
    rename: async (source, destination) => {
      if (path.basename(destination) === "asset-manifest.json") {
        throw new Error("injected manifest rename failure");
      }
      return fs.rename(source, destination);
    },
    rm: async (target, options) => {
      if (!imageCleanupFailed && path.basename(target) === "hook.png") {
        imageCleanupFailed = true;
        throw new Error("injected sensitive cleanup failure");
      }
      return fs.rm(target, options);
    },
  };

  await assert.rejects(
    persistGeneratedAsset({
      outputDir,
      episodeId: "episode-1",
      job: baseJob,
      image: {bytes: Buffer.from([9]), contentType: "image/png"},
      generation: {model: "model", seed: 1, traceId: "trace"},
    }, {fileSystem: failingFs}),
    (error) => {
      assert.match(error.message, /rollback incomplete.*journal retained/i);
      assert.doesNotMatch(error.message, /sensitive|injected/i);
      return true;
    },
  );
  assert.deepEqual(await readFile(path.join(outputDir, "assets", "hook.png")), Buffer.from([9]));
  await readFile(path.join(outputDir, ".asset-manifest-transaction.json"), "utf8");

  await persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: {...baseJob, id: "second"},
    image: {bytes: Buffer.from([2]), contentType: "image/png"},
    generation: {model: "model", seed: 2, traceId: "trace-2"},
  });

  await assert.rejects(readFile(path.join(outputDir, "assets", "hook.png")), /ENOENT/);
  assert.deepEqual(await readFile(path.join(outputDir, "assets", "second.png")), Buffer.from([2]));
  await assert.rejects(readFile(path.join(outputDir, ".asset-manifest-transaction.json")), /ENOENT/);
});

test("next persistence recovers an orphan image from an interrupted transaction", async () => {
  const outputDir = await makeOutputDirectory();
  await mkdir(path.join(outputDir, "assets"));
  await writeFile(path.join(outputDir, "assets", "orphan.png"), Buffer.from([9]));
  await writeFile(path.join(outputDir, ".asset-manifest-transaction.json"), JSON.stringify({
    version: 1,
    asset_id: "orphan",
    file: "assets/orphan.png",
    image_temp: "assets/.orphan.interrupted.tmp",
    manifest_temp: ".asset-manifest.interrupted.tmp",
  }));

  await persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: baseJob,
    image: {bytes: Buffer.from([1]), contentType: "image/png"},
    generation: {model: "model", seed: 1, traceId: "trace"},
  });

  await assert.rejects(readFile(path.join(outputDir, "assets", "orphan.png")), /ENOENT/);
  await assert.rejects(readFile(path.join(outputDir, ".asset-manifest-transaction.json")), /ENOENT/);
});

test("recovery retains its journal when orphan deletion fails and succeeds next time", async () => {
  const outputDir = await makeOutputDirectory();
  const orphanPath = path.join(outputDir, "assets", "orphan.png");
  const journalPath = path.join(outputDir, ".asset-manifest-transaction.json");
  await mkdir(path.dirname(orphanPath));
  await writeFile(orphanPath, Buffer.from([9]));
  await writeFile(journalPath, JSON.stringify({
    version: 1,
    asset_id: "orphan",
    file: "assets/orphan.png",
    image_temp: "assets/.orphan.interrupted.tmp",
    manifest_temp: ".asset-manifest.interrupted.tmp",
  }));
  let failedOnce = false;
  const failingFs = {
    ...fs,
    rm: async (target, options) => {
      if (!failedOnce && path.resolve(target) === path.resolve(orphanPath)) {
        failedOnce = true;
        throw new Error("injected sensitive recovery failure");
      }
      return fs.rm(target, options);
    },
  };

  await assert.rejects(
    persistGeneratedAsset({
      outputDir,
      episodeId: "episode-1",
      job: baseJob,
      image: {bytes: Buffer.from([1]), contentType: "image/png"},
      generation: {model: "model", seed: 1, traceId: "trace"},
    }, {fileSystem: failingFs}),
    (error) => {
      assert.match(error.message, /recovery incomplete.*journal retained/i);
      assert.doesNotMatch(error.message, /sensitive|injected/i);
      return true;
    },
  );
  assert.deepEqual(await readFile(orphanPath), Buffer.from([9]));
  await readFile(journalPath, "utf8");

  await persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: baseJob,
    image: {bytes: Buffer.from([1]), contentType: "image/png"},
    generation: {model: "model", seed: 1, traceId: "trace"},
  });
  await assert.rejects(readFile(orphanPath), /ENOENT/);
  await assert.rejects(readFile(journalPath), /ENOENT/);
});

test("next persistence retains an asset already committed in the manifest", async () => {
  const outputDir = await makeOutputDirectory();
  await persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: baseJob,
    image: {bytes: Buffer.from([1]), contentType: "image/png"},
    generation: {model: "model", seed: 1, traceId: "trace"},
  });
  await writeFile(path.join(outputDir, ".asset-manifest-transaction.json"), JSON.stringify({
    version: 1,
    asset_id: "hook",
    file: "assets/hook.png",
    image_temp: "assets/.hook.interrupted.tmp",
    manifest_temp: ".asset-manifest.interrupted.tmp",
  }));

  await persistGeneratedAsset({
    outputDir,
    episodeId: "episode-1",
    job: {...baseJob, id: "second"},
    image: {bytes: Buffer.from([2]), contentType: "image/png"},
    generation: {model: "model", seed: 2, traceId: "trace-2"},
  });

  assert.deepEqual(await readFile(path.join(outputDir, "assets", "hook.png")), Buffer.from([1]));
  assert.equal(JSON.parse(await readFile(path.join(outputDir, "asset-manifest.json"), "utf8")).length, 2);
  await assert.rejects(readFile(path.join(outputDir, ".asset-manifest-transaction.json")), /ENOENT/);
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
