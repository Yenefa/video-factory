export const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
export const KOLORS_MODEL = "Kwai-Kolors/Kolors";

const authorizationHeaders = (apiKey) => ({Authorization: `Bearer ${apiKey}`});

const requestOnce = async (fetchImpl, url, options, operation) => {
  try {
    return await fetchImpl(url, options);
  } catch {
    throw new Error(`${operation} request failed`);
  }
};

const readJson = async (response, operation) => {
  let body;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok) throw new Error(`${operation} failed with HTTP ${response.status}`);
  return body;
};

export const assertKolorsAvailable = async ({apiKey, fetchImpl = fetch}) => {
  const response = await requestOnce(
    fetchImpl,
    `${SILICONFLOW_BASE_URL}/models?type=image&sub_type=text-to-image`,
    {method: "GET", headers: authorizationHeaders(apiKey)},
    "model preflight",
  );
  const body = await readJson(response, "model preflight");
  const models = [
    ...(Array.isArray(body?.data) ? body.data : []),
    ...(Array.isArray(body?.models) ? body.models : []),
  ];
  if (!models.some((model) => model?.id === KOLORS_MODEL)) {
    throw new Error(`configured model ${KOLORS_MODEL} is not available`);
  }
};

export const createKolorsImage = async ({apiKey, job, fetchImpl = fetch}) => {
  const payload = {
    model: KOLORS_MODEL,
    prompt: job.prompt,
    negative_prompt: job.negative_prompt,
    image_size: job.image_size,
    batch_size: 1,
    num_inference_steps: 20,
    guidance_scale: 7.5,
  };
  const response = await requestOnce(
    fetchImpl,
    `${SILICONFLOW_BASE_URL}/images/generations`,
    {
      method: "POST",
      headers: {...authorizationHeaders(apiKey), "Content-Type": "application/json"},
      body: JSON.stringify(payload),
    },
    "image generation",
  );
  const body = await readJson(response, "image generation");
  const images = body?.images;
  if (!Array.isArray(images)
    || images.length !== 1
    || typeof images[0]?.url !== "string"
    || images[0].url.trim() === "") {
    throw new Error("image generation returned an invalid image URL");
  }

  return {
    url: images[0].url.trim(),
    seed: body?.seed,
    traceId: response.headers.get("x-siliconcloud-trace-id") ?? body?.traceId ?? body?.trace_id,
  };
};

export const downloadImage = async ({url, fetchImpl = fetch}) => {
  const response = await requestOnce(fetchImpl, url, {}, "image download");
  if (!response.ok) throw new Error(`image download failed with HTTP ${response.status}`);

  let bytes;
  try {
    bytes = Buffer.from(await response.arrayBuffer());
  } catch {
    throw new Error("image download response failed");
  }

  return {
    bytes,
    contentType: response.headers.get("content-type"),
  };
};
