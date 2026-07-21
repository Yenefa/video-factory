import assert from "node:assert/strict";
import test from "node:test";

import {TEST_GENERATION_POLICY, validateAssetJobsDocument} from "../src/asset-job.js";

const aiJob = {
  id: "hook",
  scene_id: "scene-1",
  source: "ai_generate",
  classification: "emotional",
  name: "Hook",
  prompt: "abstract document field",
  negative_prompt: "text",
  image_size: "720x1280",
  reusable: false,
};

test("accepts at most three explicit Kolors jobs", () => {
  const result = validateAssetJobsDocument({
    episode_id: "episode",
    policy: {},
    jobs: [{...aiJob, prompt: " abstract document field ", negative_prompt: " text ", image_size: " 720x1280 "}],
  });

  assert.equal(result.aiGenerationJobs.length, 1);
  assert.equal(result.policy.model, TEST_GENERATION_POLICY.model);
  assert.equal(result.aiGenerationJobs[0].prompt, "abstract document field");
  assert.equal(result.aiGenerationJobs[0].negative_prompt, "text");
  assert.equal(result.aiGenerationJobs[0].image_size, "720x1280");
});

test("rejects more than three generation jobs", () => {
  assert.throws(
    () => validateAssetJobsDocument({
      episode_id: "episode",
      policy: {},
      jobs: [aiJob, {...aiJob, id: "two"}, {...aiJob, id: "three"}, {...aiJob, id: "four"}],
    }),
    /at most 3/,
  );
});

test("rejects whitespace-padded generation sources over the limit", () => {
  assert.throws(
    () => validateAssetJobsDocument({
      episode_id: "episode",
      policy: {},
      jobs: [
        {...aiJob, source: " ai_generate "},
        {...aiJob, id: "two", source: " ai_generate "},
        {...aiJob, id: "three", source: " ai_generate "},
        {...aiJob, id: "four", source: " ai_generate "},
      ],
    }),
    /at most 3/,
  );
});

test("rejects an unsupported Kolors image size and retry policy", () => {
  assert.throws(
    () => validateAssetJobsDocument({episode_id: "episode", policy: {retry_on_failure: true}, jobs: [aiJob]}),
    /retry_on_failure/,
  );
  assert.throws(
    () => validateAssetJobsDocument({episode_id: "episode", policy: {}, jobs: [{...aiJob, image_size: "1080x1920"}]}),
    /image_size/,
  );
});

test("does not allow a returned policy to expand supported image sizes", () => {
  const result = validateAssetJobsDocument({episode_id: "episode", policy: {}, jobs: [aiJob]});
  result.policy.allowedImageSizes.push("1x1");

  assert.throws(
    () => validateAssetJobsDocument({episode_id: "episode", policy: {}, jobs: [{...aiJob, image_size: "1x1"}]}),
    /image_size/,
  );
});

test("rejects null and unknown policy keys", () => {
  assert.throws(
    () => validateAssetJobsDocument({episode_id: "episode", policy: null, jobs: [aiJob]}),
    /policy must be an object/,
  );
  assert.throws(
    () => validateAssetJobsDocument({episode_id: "episode", policy: {model: "other"}, jobs: [aiJob]}),
    /policy contains unsupported key: model/,
  );
});
