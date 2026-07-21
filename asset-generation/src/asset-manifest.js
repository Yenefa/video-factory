import {createHash, randomUUID} from "node:crypto";
import * as nodeFileSystem from "node:fs/promises";
import path from "node:path";

const SAFE_ASSET_ID = /^[a-z0-9][a-z0-9-]*$/;
const SOURCE_METADATA_KEYS = [
  "creator_or_publisher",
  "attribution",
  "ancestor_asset_id",
  "unknown_reason",
];
const TAINTED_FIELD = /^(?:authorization|headers?|provider_url|url|api[_-]?key|access[_-]?token|token|secret)$/i;
const JOURNAL_NAME = ".asset-manifest-transaction.json";
const LOCK_NAME = ".asset-manifest.lock";

const extensionFor = (contentType) => {
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  return "bin";
};

const requiredString = (value, field) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
};

const rejectTaintedFields = (value, label) => {
  if (value === null || typeof value !== "object" || Buffer.isBuffer(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (TAINTED_FIELD.test(key)) throw new Error(`${label} contains unsupported field: ${key}`);
    rejectTaintedFields(child, `${label}.${key}`);
  }
};

const validateRequest = ({outputDir, episodeId, job, image, generation}) => {
  const validatedOutputDir = requiredString(outputDir, "outputDir");
  const validatedEpisodeId = requiredString(episodeId, "episodeId");
  if (job === null || typeof job !== "object" || Array.isArray(job)) throw new Error("job must be an object");
  if (image === null || typeof image !== "object" || Array.isArray(image)) throw new Error("image must be an object");
  if (generation === null || typeof generation !== "object" || Array.isArray(generation)) {
    throw new Error("generation must be an object");
  }
  rejectTaintedFields(job, "job");
  rejectTaintedFields(image, "image");
  rejectTaintedFields(generation, "generation");

  const id = requiredString(job.id, "job.id");
  if (!SAFE_ASSET_ID.test(id)) throw new Error("job.id must match ^[a-z0-9][a-z0-9-]*$");
  if (job.source !== "ai_generate") throw new Error("job.source must be ai_generate");
  if (job.source_metadata === null
    || typeof job.source_metadata !== "object"
    || Array.isArray(job.source_metadata)) {
    throw new Error("job.source_metadata must be an object");
  }
  for (const key of SOURCE_METADATA_KEYS) {
    if (!Object.hasOwn(job.source_metadata, key) || job.source_metadata[key] !== null) {
      throw new Error(`job.source_metadata.${key} must be null for ai_generate`);
    }
  }

  const imageSize = requiredString(job.image_size, "job.image_size");
  const dimensions = /^(\d+)x(\d+)$/.exec(imageSize);
  if (!dimensions || Number(dimensions[1]) <= 0 || Number(dimensions[2]) <= 0) {
    throw new Error("job.image_size must contain positive width and height");
  }
  if (typeof job.reusable !== "boolean") throw new Error("job.reusable must be a boolean");
  if (!Buffer.isBuffer(image.bytes)) throw new Error("image.bytes must be a Buffer");
  const contentType = requiredString(image.contentType, "image.contentType").toLowerCase();
  const model = requiredString(generation.model, "generation.model");
  if (!((typeof generation.seed === "number" && Number.isFinite(generation.seed))
    || (typeof generation.seed === "string" && generation.seed.trim() !== ""))) {
    throw new Error("generation.seed is required");
  }

  return {
    outputDir: validatedOutputDir,
    episodeId: validatedEpisodeId,
    job: {
      id,
      scene_id: requiredString(job.scene_id, "job.scene_id"),
      name: requiredString(job.name, "job.name"),
      classification: requiredString(job.classification, "job.classification"),
      prompt: requiredString(job.prompt, "job.prompt"),
      negative_prompt: requiredString(job.negative_prompt, "job.negative_prompt"),
      image_size: imageSize,
      reusable: job.reusable,
    },
    image: {bytes: image.bytes, contentType},
    generation: {
      model,
      seed: generation.seed,
      traceId: requiredString(generation.traceId, "generation.traceId"),
    },
    width: Number(dimensions[1]),
    height: Number(dimensions[2]),
  };
};

const statIfPresent = async (fileSystem, filePath) => {
  try {
    return await fileSystem.lstat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
};

const assertNotSymlink = async (fileSystem, filePath, label) => {
  const stats = await statIfPresent(fileSystem, filePath);
  if (stats?.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link`);
  return stats;
};

const readJson = async (fileSystem, filePath, label) => {
  try {
    return JSON.parse(await fileSystem.readFile(filePath, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${label} contains invalid JSON`);
    throw error;
  }
};

const readManifest = async (fileSystem, manifestPath) => {
  const stats = await assertNotSymlink(fileSystem, manifestPath, "asset manifest");
  if (!stats) return [];
  if (!stats.isFile()) throw new Error("asset manifest must be a regular file");
  const manifest = await readJson(fileSystem, manifestPath, "asset manifest");
  if (!Array.isArray(manifest)) throw new Error("asset manifest must contain an array");
  return manifest;
};

const removeIfPresent = async (fileSystem, filePath) => {
  try {
    await fileSystem.rm(filePath, {force: true});
  } catch {
    // Preserve the persistence error while making a best effort to clean up.
  }
};

const removeAndConfirmAbsent = async (fileSystem, filePath) => {
  try {
    await fileSystem.rm(filePath, {force: true});
    return !(await statIfPresent(fileSystem, filePath));
  } catch {
    return false;
  }
};

const processIsAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
};

const acquireLock = async (fileSystem, lockPath) => {
  const contents = `${JSON.stringify({pid: process.pid, nonce: randomUUID()})}\n`;
  try {
    await fileSystem.writeFile(lockPath, contents, {encoding: "utf8", flag: "wx"});
    return;
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }

  const stats = await assertNotSymlink(fileSystem, lockPath, "asset manifest lock");
  if (!stats?.isFile()) throw new Error("asset manifest persistence is already in progress");
  let existingLock;
  try {
    existingLock = await readJson(fileSystem, lockPath, "asset manifest lock");
  } catch {
    throw new Error("asset manifest persistence is already in progress");
  }
  if (Number.isInteger(existingLock?.pid) && processIsAlive(existingLock.pid)) {
    throw new Error("asset manifest persistence is already in progress");
  }
  await removeIfPresent(fileSystem, lockPath);
  try {
    await fileSystem.writeFile(lockPath, contents, {encoding: "utf8", flag: "wx"});
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("asset manifest persistence is already in progress");
    throw error;
  }
};

const validatedJournal = (journal) => {
  if (journal?.version !== 1 || typeof journal !== "object") throw new Error("asset transaction journal is invalid");
  const id = journal.asset_id;
  if (typeof id !== "string" || !SAFE_ASSET_ID.test(id)) throw new Error("asset transaction journal is invalid");
  if (!new RegExp(`^assets/${id}\\.(?:png|jpg|bin)$`).test(journal.file)
    || !new RegExp(`^assets/\\.${id}\\.[a-z0-9-]+\\.tmp$`, "i").test(journal.image_temp)
    || !/^\.asset-manifest\.[a-z0-9-]+\.tmp$/i.test(journal.manifest_temp)) {
    throw new Error("asset transaction journal is invalid");
  }
  return journal;
};

const recoverTransaction = async ({fileSystem, outputDir, manifestPath, journalPath}) => {
  const stats = await assertNotSymlink(fileSystem, journalPath, "asset transaction journal");
  if (!stats) return;
  if (!stats.isFile()) throw new Error("asset transaction journal must be a regular file");
  const journal = validatedJournal(await readJson(fileSystem, journalPath, "asset transaction journal"));
  const manifest = await readManifest(fileSystem, manifestPath);
  const committed = manifest.some((record) => record?.asset_id === journal.asset_id);
  if (!committed) await removeIfPresent(fileSystem, path.join(outputDir, ...journal.file.split("/")));
  await removeIfPresent(fileSystem, path.join(outputDir, ...journal.image_temp.split("/")));
  await removeIfPresent(fileSystem, path.join(outputDir, journal.manifest_temp));
  await removeIfPresent(fileSystem, journalPath);
};

const buildRecord = ({episodeId, job, image, generation, width, height}) => {
  const extension = extensionFor(image.contentType);
  return {
    asset_id: job.id,
    id: job.id,
    episode_id: episodeId,
    scene_id: job.scene_id,
    stage: "asset_planning",
    stage_boundary: {upstream: "visual_language", downstream: "storyboard"},
    route: "ai_generate",
    status: "ready",
    reusable: job.reusable,
    technical_spec: {width, height, format: extension, alpha: false},
    source: {
      kind: "generated",
      reference: `generator-output:${job.id}`,
      license: "unknown",
      creator_or_publisher: null,
      attribution: null,
      ancestor_asset_id: null,
      unknown_reason: null,
    },
    provenance: {created_by: "asset_planning", provider: "unknown", provider_url: null},
    name: job.name,
    classification: job.classification,
    file: `assets/${job.id}.${extension}`,
    sha256: createHash("sha256").update(image.bytes).digest("hex"),
    content_type: image.contentType,
    model: generation.model,
    seed: generation.seed,
    trace_id: generation.traceId,
    image_size: job.image_size,
    prompt: job.prompt,
    negative_prompt: job.negative_prompt,
    cost_status: "unknown",
    generated_at: new Date().toISOString(),
  };
};

export const persistGeneratedAsset = async (request, {fileSystem = nodeFileSystem} = {}) => {
  const validated = validateRequest(request);
  const resolvedOutputDir = path.resolve(validated.outputDir);
  await fileSystem.mkdir(resolvedOutputDir, {recursive: true});
  const outputStats = await assertNotSymlink(fileSystem, resolvedOutputDir, "outputDir");
  if (!outputStats?.isDirectory()) throw new Error("outputDir must be a directory");

  const lockPath = path.join(resolvedOutputDir, LOCK_NAME);
  await acquireLock(fileSystem, lockPath);
  try {
    const assetsDir = path.join(resolvedOutputDir, "assets");
    const manifestPath = path.join(resolvedOutputDir, "asset-manifest.json");
    const journalPath = path.join(resolvedOutputDir, JOURNAL_NAME);
    await recoverTransaction({fileSystem, outputDir: resolvedOutputDir, manifestPath, journalPath});
    await fileSystem.mkdir(assetsDir, {recursive: true});
    const assetsStats = await assertNotSymlink(fileSystem, assetsDir, "assets directory");
    if (!assetsStats?.isDirectory()) throw new Error("assets path must be a directory");

    const record = buildRecord(validated);
    const imagePath = path.join(resolvedOutputDir, ...record.file.split("/"));
    const manifest = await readManifest(fileSystem, manifestPath);
    if (manifest.some((existing) => existing?.asset_id === record.asset_id || existing?.id === record.id)) {
      throw new Error(`duplicate asset id: ${record.asset_id}`);
    }
    if (await statIfPresent(fileSystem, imagePath)) throw new Error(`asset file already exists for id: ${record.asset_id}`);

    const nonce = randomUUID();
    const imageTempRelative = `assets/.${record.asset_id}.${nonce}.tmp`;
    const manifestTempRelative = `.asset-manifest.${nonce}.tmp`;
    const imageTempPath = path.join(resolvedOutputDir, ...imageTempRelative.split("/"));
    const manifestTempPath = path.join(resolvedOutputDir, manifestTempRelative);
    const journalTempPath = path.join(resolvedOutputDir, `.${JOURNAL_NAME}.${nonce}.tmp`);
    const journal = {
      version: 1,
      asset_id: record.asset_id,
      file: record.file,
      image_temp: imageTempRelative,
      manifest_temp: manifestTempRelative,
    };
    let imageInstalled = false;
    try {
      await fileSystem.writeFile(imageTempPath, validated.image.bytes, {flag: "wx"});
      await fileSystem.writeFile(
        manifestTempPath,
        `${JSON.stringify([...manifest, record], null, 2)}\n`,
        {encoding: "utf8", flag: "wx"},
      );
      await fileSystem.writeFile(journalTempPath, `${JSON.stringify(journal)}\n`, {encoding: "utf8", flag: "wx"});
      await fileSystem.rename(journalTempPath, journalPath);
      if (await statIfPresent(fileSystem, imagePath)) throw new Error(`asset file already exists for id: ${record.asset_id}`);
      await fileSystem.rename(imageTempPath, imagePath);
      imageInstalled = true;
      await fileSystem.rename(manifestTempPath, manifestPath);
      await removeIfPresent(fileSystem, journalPath);
      return record;
    } catch (error) {
      await removeIfPresent(fileSystem, imageTempPath);
      await removeIfPresent(fileSystem, manifestTempPath);
      await removeIfPresent(fileSystem, journalTempPath);
      if (imageInstalled && !(await removeAndConfirmAbsent(fileSystem, imagePath))) {
        throw new Error("asset rollback incomplete; recovery journal retained");
      }
      await removeIfPresent(fileSystem, journalPath);
      throw error;
    }
  } finally {
    await removeIfPresent(fileSystem, lockPath);
  }
};
