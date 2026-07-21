export const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
export const KOLORS_MODEL = "Kwai-Kolors/Kolors";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const authorizationHeaders = (apiKey) => ({Authorization: `Bearer ${apiKey}`});

const requestOnce = async (fetchImpl, url, options, operation) => {
  try {
    return await fetchImpl(url, options);
  } catch {
    throw new Error(`${operation} request failed`);
  }
};

const readJson = async (response, operation) => {
  if (!response.ok) throw new Error(`${operation} failed with HTTP ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new Error(`${operation} returned a malformed response`);
  }
  try {
    return await response.json();
  } catch {
    throw new Error(`${operation} returned a malformed response`);
  }
};

const parseIpv4 = (hostname) => {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return undefined;
  const octets = hostname.split(".").map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : undefined;
};

const isPrivateIpv4 = ([first, second]) => first === 127
  || first === 10
  || (first === 172 && second >= 16 && second <= 31)
  || (first === 192 && second === 168)
  || (first === 169 && second === 254);

const parseIpv6 = (hostname) => {
  const unwrapped = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  if (!unwrapped.includes(":")) return undefined;
  const halves = unwrapped.split("::");
  if (halves.length > 2) return undefined;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const zeroCount = halves.length === 2 ? 8 - left.length - right.length : 0;
  if (zeroCount < 0 || (halves.length === 1 && left.length !== 8)) return undefined;
  const parts = [...left, ...Array(zeroCount).fill("0"), ...right];
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/i.test(part))) return undefined;
  return parts.map((part) => Number.parseInt(part, 16));
};

const isPrivateIpv6 = (parts) => {
  const loopback = parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1;
  const unspecified = parts.every((part) => part === 0);
  const uniqueLocal = (parts[0] & 0xfe00) === 0xfc00;
  const linkLocal = (parts[0] & 0xffc0) === 0xfe80;
  const ipv4Mapped = parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
  const mappedPrivate = ipv4Mapped && isPrivateIpv4([
    parts[6] >> 8,
    parts[6] & 0xff,
    parts[7] >> 8,
    parts[7] & 0xff,
  ]);
  return loopback || unspecified || uniqueLocal || linkLocal || mappedPrivate;
};

const parseSafeImageUrl = (value, errorMessage) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(errorMessage);
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, "");
  const ipv4 = parseIpv4(hostname);
  const ipv6 = parseIpv6(hostname);
  if (parsed.protocol !== "https:"
    || parsed.username !== ""
    || parsed.password !== ""
    || hostname === "localhost"
    || hostname.endsWith(".localhost")
    || (ipv4 && isPrivateIpv4(ipv4))
    || (ipv6 && isPrivateIpv6(ipv6))) {
    throw new Error(errorMessage);
  }
  return parsed.href;
};

export const assertKolorsAvailable = async ({apiKey, fetchImpl = fetch}) => {
  const response = await requestOnce(
    fetchImpl,
    `${SILICONFLOW_BASE_URL}/models?type=image&sub_type=text-to-image`,
    {method: "GET", headers: authorizationHeaders(apiKey), redirect: "error"},
    "model preflight",
  );
  const body = await readJson(response, "model preflight");
  const modelLists = [body?.data, body?.models].filter(Array.isArray);
  if (modelLists.length === 0) throw new Error("model preflight returned a malformed response");
  const models = modelLists.flat();
  if (models.some((model) => model === null
    || typeof model !== "object"
    || typeof model.id !== "string"
    || model.id.trim() === "")) {
    throw new Error("model preflight returned a malformed response");
  }
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
      redirect: "error",
    },
    "image generation",
  );
  const body = await readJson(response, "image generation");
  const images = body?.images;
  if (!Array.isArray(images)
    || images.length !== 1
    || typeof images[0]?.url !== "string"
    || images[0].url.trim() === "") {
    throw new Error("image generation returned a malformed response");
  }
  const url = parseSafeImageUrl(
    images[0].url.trim(),
    "image generation returned an unsafe image URL",
  );

  return {
    url,
    seed: body?.seed,
    traceId: response.headers.get("x-siliconcloud-trace-id") ?? body?.traceId ?? body?.trace_id,
  };
};

export const downloadImage = async ({url, fetchImpl = fetch}) => {
  const safeUrl = parseSafeImageUrl(url, "image download URL is not allowed");
  const response = await requestOnce(fetchImpl, safeUrl, {redirect: "error"}, "image download");
  if (!response.ok) throw new Error(`image download failed with HTTP ${response.status}`);

  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (!contentType || !/^image\/[^\s/]+$/.test(contentType)) {
    throw new Error("image download returned an unsupported content type");
  }
  const contentLength = response.headers.get("content-length");
  if (/^\d+$/.test(contentLength ?? "") && BigInt(contentLength) > BigInt(MAX_IMAGE_BYTES)) {
    throw new Error("image download exceeded the 20 MiB limit");
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    if (response.body === null) return {bytes: Buffer.alloc(0), contentType};
    throw new Error("image download response failed");
  }
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    let result;
    try {
      result = await reader.read();
    } catch {
      throw new Error("image download response failed");
    }
    if (result.done) break;
    const chunk = Buffer.from(result.value);
    totalBytes += chunk.length;
    if (totalBytes > MAX_IMAGE_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancellation failures and preserve the safe size error.
      }
      throw new Error("image download exceeded the 20 MiB limit");
    }
    chunks.push(chunk);
  }

  return {
    bytes: Buffer.concat(chunks, totalBytes),
    contentType,
  };
};
