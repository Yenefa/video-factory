const ALLOWED_IMAGE_SIZES = Object.freeze(["1024x1024", "960x1280", "768x1024", "720x1440", "720x1280"]);
const ALLOWED_IMAGE_SIZE_SET = new Set(ALLOWED_IMAGE_SIZES);
const ALLOWED_POLICY_KEYS = new Set([
  "max_generated_assets",
  "batch_size",
  "max_attempts_per_asset",
  "retry_on_failure",
]);

export const TEST_GENERATION_POLICY = Object.freeze({
  model: "Kwai-Kolors/Kolors",
  maxGeneratedAssets: 3,
  batchSize: 1,
  maxAttemptsPerAsset: 1,
  retryOnFailure: false,
  allowedImageSizes: ALLOWED_IMAGE_SIZES,
});

const VALID_SOURCES = new Set(["library", "modify", "code", "capture", "external", "ai_generate"]);

const requiredString = (value, field) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
};

const normalizePolicy = (suppliedPolicy) => {
  if (suppliedPolicy === null || typeof suppliedPolicy !== "object" || Array.isArray(suppliedPolicy)) {
    throw new Error("policy must be an object");
  }
  for (const key of Object.keys(suppliedPolicy)) {
    if (!ALLOWED_POLICY_KEYS.has(key)) throw new Error(`policy contains unsupported key: ${key}`);
  }

  const policy = {
    ...TEST_GENERATION_POLICY,
    allowedImageSizes: [...ALLOWED_IMAGE_SIZES],
    maxGeneratedAssets: suppliedPolicy.max_generated_assets ?? TEST_GENERATION_POLICY.maxGeneratedAssets,
    batchSize: suppliedPolicy.batch_size ?? TEST_GENERATION_POLICY.batchSize,
    maxAttemptsPerAsset: suppliedPolicy.max_attempts_per_asset ?? TEST_GENERATION_POLICY.maxAttemptsPerAsset,
    retryOnFailure: suppliedPolicy.retry_on_failure ?? TEST_GENERATION_POLICY.retryOnFailure,
  };

  if (!Number.isInteger(policy.maxGeneratedAssets) || policy.maxGeneratedAssets < 0 || policy.maxGeneratedAssets > TEST_GENERATION_POLICY.maxGeneratedAssets) {
    throw new Error("max_generated_assets may be at most 3");
  }
  if (policy.batchSize !== TEST_GENERATION_POLICY.batchSize) {
    throw new Error("batch_size must be 1");
  }
  if (policy.maxAttemptsPerAsset !== TEST_GENERATION_POLICY.maxAttemptsPerAsset) {
    throw new Error("max_attempts_per_asset must be 1");
  }
  if (policy.retryOnFailure !== TEST_GENERATION_POLICY.retryOnFailure) {
    throw new Error("retry_on_failure must be false");
  }

  return policy;
};

const validateJob = (job, index, jobIds) => {
  if (job === null || typeof job !== "object" || Array.isArray(job)) {
    throw new Error(`jobs[${index}] must be an object`);
  }

  const id = requiredString(job.id, `jobs[${index}].id`);
  if (jobIds.has(id)) throw new Error(`job id must be unique: ${id}`);
  jobIds.add(id);

  const sceneId = requiredString(job.scene_id, `jobs[${index}].scene_id`);
  const source = requiredString(job.source, `jobs[${index}].source`);
  if (!VALID_SOURCES.has(source)) throw new Error(`jobs[${index}].source is not supported`);

  if (source === "ai_generate") {
    const prompt = requiredString(job.prompt, `jobs[${index}].prompt`);
    const negativePrompt = requiredString(job.negative_prompt, `jobs[${index}].negative_prompt`);
    const imageSize = requiredString(job.image_size, `jobs[${index}].image_size`);
    if (!ALLOWED_IMAGE_SIZE_SET.has(imageSize)) {
      throw new Error(`jobs[${index}].image_size is not supported`);
    }
    return {
      ...job,
      id,
      scene_id: sceneId,
      source,
      prompt,
      negative_prompt: negativePrompt,
      image_size: imageSize,
    };
  }

  return {...job, id, scene_id: sceneId, source};
};

export const validateAssetJobsDocument = (document) => {
  const episodeId = requiredString(document?.episode_id, "episode_id");
  if (!Array.isArray(document?.jobs) || document.jobs.length === 0) {
    throw new Error("jobs must be a non-empty array");
  }

  const suppliedPolicy = document?.policy === undefined ? {} : document.policy;
  const policy = normalizePolicy(suppliedPolicy);
  const jobIds = new Set();
  const jobs = document.jobs.map((job, index) => validateJob(job, index, jobIds));
  const aiGenerationJobs = jobs.filter(({source}) => source === "ai_generate");
  if (aiGenerationJobs.length > policy.maxGeneratedAssets) {
    throw new Error(`ai_generate jobs may be at most ${policy.maxGeneratedAssets}`);
  }

  return {episodeId, policy, jobs, aiGenerationJobs};
};
