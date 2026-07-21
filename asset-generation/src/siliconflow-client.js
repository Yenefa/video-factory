import {lookup as dnsLookup} from "node:dns";
import {request as httpsRequest} from "node:https";

export const SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";
export const KOLORS_MODEL = "Kwai-Kolors/Kolors";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

class SafeDownloadError extends Error {}

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

const isNonPublicIpv4 = ([first, second, third, fourth]) => first === 127
  || first === 0
  || first === 10
  || (first === 100 && second >= 64 && second <= 127)
  || (first === 172 && second >= 16 && second <= 31)
  || (first === 192 && second === 168)
  || (first === 169 && second === 254)
  || (first === 192 && second === 0 && third === 0 && fourth !== 9 && fourth !== 10)
  || (first === 192 && second === 0 && third === 2)
  || (first === 192 && second === 88 && third === 99)
  || (first === 198 && (second === 18 || second === 19))
  || (first === 198 && second === 51 && third === 100)
  || (first === 203 && second === 0 && third === 113)
  || first >= 224;

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

const embeddedIpv4 = (parts, index) => [
  parts[index] >> 8,
  parts[index] & 0xff,
  parts[index + 1] >> 8,
  parts[index + 1] & 0xff,
];

const isNonPublicIpv6 = (parts) => {
  const loopback = parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1;
  const unspecified = parts.every((part) => part === 0);
  const uniqueLocal = (parts[0] & 0xfe00) === 0xfc00;
  const linkLocal = (parts[0] & 0xffc0) === 0xfe80;
  const siteLocal = (parts[0] & 0xffc0) === 0xfec0;
  const multicast = (parts[0] & 0xff00) === 0xff00;
  const discardOnly = parts[0] === 0x0100 && parts.slice(1, 4).every((part) => part === 0);
  const documentation = parts[0] === 0x2001 && parts[1] === 0x0db8;
  const benchmarking = parts[0] === 0x2001 && parts[1] === 0x0002 && parts[2] === 0;
  const orchid = parts[0] === 0x2001 && ((parts[1] & 0xfff0) === 0x0010 || (parts[1] & 0xfff0) === 0x0020);
  const ipv4Mapped = parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
  const ipv4Compatible = parts.slice(0, 6).every((part) => part === 0);
  const nat64 = parts[0] === 0x0064 && parts[1] === 0xff9b && parts.slice(2, 6).every((part) => part === 0);
  const sixToFour = parts[0] === 0x2002;
  const embeddedNonPublic = (ipv4Mapped || ipv4Compatible || nat64)
    && isNonPublicIpv4(embeddedIpv4(parts, 6));
  const sixToFourNonPublic = sixToFour && isNonPublicIpv4(embeddedIpv4(parts, 1));
  return loopback
    || unspecified
    || uniqueLocal
    || linkLocal
    || siteLocal
    || multicast
    || discardOnly
    || documentation
    || benchmarking
    || orchid
    || embeddedNonPublic
    || sixToFourNonPublic;
};

const isPublicResolvedAddress = ({address, family}) => {
  if (typeof address !== "string") return false;
  if (family === 4 || family === "IPv4") {
    const ipv4 = parseIpv4(address);
    return Boolean(ipv4 && !isNonPublicIpv4(ipv4));
  }
  if (family === 6 || family === "IPv6") {
    let canonicalHostname;
    try {
      canonicalHostname = new URL(`https://[${address}]/`).hostname;
    } catch {
      return false;
    }
    const ipv6 = parseIpv6(canonicalHostname);
    return Boolean(ipv6 && !isNonPublicIpv6(ipv6));
  }
  return false;
};

const pinnedPublicLookup = (lookupImpl) => (hostname, _options, callback) => {
  const onLookup = (error, addresses) => {
    if (error || !Array.isArray(addresses) || addresses.length === 0) {
      callback(new SafeDownloadError("image download address resolution failed"));
      return;
    }
    if (addresses.some((address) => !isPublicResolvedAddress(address))) {
      callback(new SafeDownloadError("image download resolved to a non-public address"));
      return;
    }
    const [{address, family}] = addresses;
    callback(null, address, family);
  };
  try {
    lookupImpl(hostname, {all: true, verbatim: true}, onLookup);
  } catch {
    callback(new SafeDownloadError("image download address resolution failed"));
  }
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
    || (ipv4 && isNonPublicIpv4(ipv4))
    || (ipv6 && isNonPublicIpv6(ipv6))) {
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

const openImageResponse = ({url, requestImpl, lookupImpl}) => new Promise((resolve, reject) => {
  let request;
  try {
    request = requestImpl(url, {
      method: "GET",
      headers: {},
      lookup: pinnedPublicLookup(lookupImpl),
      servername: url.hostname,
    }, resolve);
    request.once("error", (error) => {
      reject(error instanceof SafeDownloadError
        ? error
        : new SafeDownloadError("image download request failed"));
    });
    request.end();
  } catch {
    reject(new SafeDownloadError("image download request failed"));
  }
});

const destroyResponse = (response) => {
  try {
    response.destroy?.();
  } catch {
    // Preserve the original sanitized error.
  }
};

export const downloadImage = async ({url, requestImpl = httpsRequest, lookupImpl = dnsLookup}) => {
  const safeUrl = parseSafeImageUrl(url, "image download URL is not allowed");
  const parsedUrl = new URL(safeUrl);
  const response = await openImageResponse({url: parsedUrl, requestImpl, lookupImpl});
  if (!Number.isInteger(response.statusCode)) {
    destroyResponse(response);
    throw new SafeDownloadError("image download returned a malformed response");
  }
  if (response.statusCode < 200 || response.statusCode >= 300) {
    destroyResponse(response);
    throw new SafeDownloadError(`image download failed with HTTP ${response.statusCode}`);
  }

  const rawContentType = response.headers?.["content-type"];
  const contentType = typeof rawContentType === "string"
    ? rawContentType.split(";", 1)[0].trim().toLowerCase()
    : undefined;
  if (!contentType || !/^image\/[^\s/]+$/.test(contentType)) {
    destroyResponse(response);
    throw new SafeDownloadError("image download returned an unsupported content type");
  }
  const contentLength = response.headers?.["content-length"];
  if (/^\d+$/.test(contentLength ?? "") && BigInt(contentLength) > BigInt(MAX_IMAGE_BYTES)) {
    destroyResponse(response);
    throw new SafeDownloadError("image download exceeded the 20 MiB limit");
  }

  const chunks = [];
  let totalBytes = 0;
  try {
    for await (const chunk of response) {
      const chunkBytes = chunk?.byteLength;
      if (!Number.isSafeInteger(chunkBytes) || chunkBytes < 0) {
        destroyResponse(response);
        throw new SafeDownloadError("image download response failed");
      }
      if (chunkBytes > MAX_IMAGE_BYTES - totalBytes) {
        destroyResponse(response);
        throw new SafeDownloadError("image download exceeded the 20 MiB limit");
      }
      let bufferedChunk;
      try {
        bufferedChunk = Buffer.from(chunk);
      } catch {
        destroyResponse(response);
        throw new SafeDownloadError("image download response failed");
      }
      totalBytes += chunkBytes;
      chunks.push(bufferedChunk);
    }
  } catch (error) {
    if (error instanceof SafeDownloadError) throw error;
    throw new SafeDownloadError("image download response failed");
  }

  return {
    bytes: Buffer.concat(chunks, totalBytes),
    contentType,
  };
};
