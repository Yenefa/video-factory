import {createHash, randomUUID} from "node:crypto";
import {lstat, mkdir, readFile, rename, rm, rmdir, writeFile} from "node:fs/promises";
import path from "node:path";

const SAFE_ASSET_ID = /^[a-z0-9][a-z0-9-]*$/;
const SOURCE_METADATA_KEYS = [
  "creator_or_publisher",
  "attribution",
  "ancestor_asset_id",
  "unknown_reason",
];

const extensionFor = (contentType) => {
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  return "bin";
};

const statIfPresent = async (filePath) => {
  try {
    return await lstat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
};

const assertNotSymlink = async (filePath, label) => {
  const stats = await statIfPresent(filePath);
  if (stats?.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link`);
  return stats;
};

const readManifest = async (manifestPath) => {
  const stats = await assertNotSymlink(manifestPath, "asset manifest");
  if (!stats) return [];
  if (!stats.isFile()) throw new Error("asset manifest must be a regular file");

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("asset manifest contains invalid JSON");
    throw error;
  }
  if (!Array.isArray(manifest)) throw new Error("asset manifest must contain an array");
  return manifest;
};

const sourceProvenanceFor = (job) => {
  const suppliedSource = job.source && typeof job.source === "object" && !Array.isArray(job.source)
    ? job.source
    : {};
  const reference = suppliedSource.reference ?? `generator-output:${job.id}`;
  if (typeof reference !== "string"
    || reference.trim() === ""
    || /(?:https?|ftp):\/\//i.test(reference)
    || /[\r\n]/.test(reference)) {
    throw new Error("source.reference must be a stable non-secret identifier");
  }

  const source = {
    kind: suppliedSource.kind ?? "generated",
    reference: reference.trim(),
    license: suppliedSource.license ?? "unknown",
  };
  for (const key of SOURCE_METADATA_KEYS) {
    source[key] = job.source_metadata?.[key] ?? null;
  }
  return source;
};

const removeIfPresent = async (filePath) => {
  try {
    await rm(filePath, {force: true});
  } catch {
    // Preserve the persistence error while making a best effort to clean up.
  }
};

export const persistGeneratedAsset = async ({outputDir, episodeId, job, image, generation}) => {
  if (typeof outputDir !== "string" || outputDir.trim() === "") {
    throw new Error("outputDir must be a non-empty string");
  }
  if (typeof job?.id !== "string" || !SAFE_ASSET_ID.test(job.id)) {
    throw new Error("job.id must match ^[a-z0-9][a-z0-9-]*$");
  }
  if (!Buffer.isBuffer(image?.bytes)) throw new Error("image.bytes must be a Buffer");

  const resolvedOutputDir = path.resolve(outputDir);
  await mkdir(resolvedOutputDir, {recursive: true});
  const outputStats = await assertNotSymlink(resolvedOutputDir, "outputDir");
  if (!outputStats?.isDirectory()) throw new Error("outputDir must be a directory");

  const lockPath = path.join(resolvedOutputDir, ".asset-manifest.lock");
  try {
    await mkdir(lockPath);
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("asset manifest persistence is already in progress");
    throw error;
  }

  try {
  const assetsDir = path.join(resolvedOutputDir, "assets");
  await mkdir(assetsDir, {recursive: true});
  const assetsStats = await assertNotSymlink(assetsDir, "assets directory");
  if (!assetsStats?.isDirectory()) throw new Error("assets path must be a directory");

  const extension = extensionFor(image.contentType);
  const relativeFile = `assets/${job.id}.${extension}`;
  const imagePath = path.join(assetsDir, `${job.id}.${extension}`);
  const manifestPath = path.join(resolvedOutputDir, "asset-manifest.json");
  const manifest = await readManifest(manifestPath);
  if (manifest.some((record) => record?.id === job.id)) {
    throw new Error(`duplicate asset id: ${job.id}`);
  }
  if (await statIfPresent(imagePath)) {
    throw new Error(`asset file already exists for id: ${job.id}`);
  }

  const record = {
    id: job.id,
    episode_id: episodeId,
    scene_id: job.scene_id,
    name: job.name,
    source: "ai_generate",
    classification: job.classification,
    file: relativeFile,
    sha256: createHash("sha256").update(image.bytes).digest("hex"),
    content_type: image.contentType,
    model: generation?.model,
    seed: generation?.seed,
    trace_id: generation?.traceId,
    image_size: job.image_size,
    prompt: job.prompt,
    negative_prompt: job.negative_prompt,
    reusable: job.reusable,
    cost_status: "unknown",
    generated_at: new Date().toISOString(),
    source_provenance: sourceProvenanceFor(job),
    provenance: {
      created_by: "asset_planning",
      provider: "unknown",
      provider_url: null,
    },
  };

  const nonce = randomUUID();
  const temporaryImagePath = path.join(assetsDir, `.${job.id}.${nonce}.tmp`);
  const temporaryManifestPath = path.join(resolvedOutputDir, `.asset-manifest.${nonce}.tmp`);
  let imageInstalled = false;
  try {
    await writeFile(temporaryImagePath, image.bytes, {flag: "wx"});
    await writeFile(
      temporaryManifestPath,
      `${JSON.stringify([...manifest, record], null, 2)}\n`,
      {encoding: "utf8", flag: "wx"},
    );
    if (await statIfPresent(imagePath)) throw new Error(`asset file already exists for id: ${job.id}`);
    await rename(temporaryImagePath, imagePath);
    imageInstalled = true;
    await rename(temporaryManifestPath, manifestPath);
    return record;
  } catch (error) {
    await removeIfPresent(temporaryImagePath);
    await removeIfPresent(temporaryManifestPath);
    if (imageInstalled) await removeIfPresent(imagePath);
    throw error;
  }
  } finally {
    try {
      await rmdir(lockPath);
    } catch {
      // The completed write is authoritative; stale-lock cleanup is best effort.
    }
  }
};
