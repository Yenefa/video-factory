export const DEFAULT_MINIMAX_ENDPOINT = "https://api.minimaxi.com/v1/t2a_v2";

export const DEFAULT_MINIMAX_CONFIG = Object.freeze({
  model: "speech-2.6-turbo",
  languageBoost: "Chinese",
  voiceId: "Podcast_girl",
  speed: 1,
  volume: 1,
  pitch: 0,
  emotion: "fluent",
  sampleRate: 32000,
  bitrate: 128000,
  format: "mp3",
  channel: 1,
});

export const buildSynthesisRequest = (text, config = DEFAULT_MINIMAX_CONFIG) => {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new TypeError("MiniMax synthesis text must be non-empty");
  }
  if (text.length >= 10000) {
    throw new RangeError("MiniMax synthesis text must contain fewer than 10000 characters");
  }

  return {
    model: config.model,
    text,
    stream: false,
    language_boost: config.languageBoost,
    voice_setting: {
      voice_id: config.voiceId,
      speed: config.speed,
      vol: config.volume,
      pitch: config.pitch,
      emotion: config.emotion,
    },
    audio_setting: {
      sample_rate: config.sampleRate,
      bitrate: config.bitrate,
      format: config.format,
      channel: config.channel,
    },
    subtitle_enable: false,
    output_format: "hex",
  };
};

const parseJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    throw new Error(`MiniMax returned a non-JSON response (HTTP ${response.status})`);
  }
};

export const synthesizeSegment = async ({
  apiKey,
  text,
  config = DEFAULT_MINIMAX_CONFIG,
  endpoint = DEFAULT_MINIMAX_ENDPOINT,
  fetchImpl = globalThis.fetch,
}) => {
  if (typeof apiKey !== "string" || apiKey.length === 0) {
    throw new Error("MINIMAX_API_KEY is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required");
  }

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildSynthesisRequest(text, config)),
  });
  const payload = await parseJsonResponse(response);

  const statusCode = payload?.base_resp?.status_code;
  if (!response.ok || statusCode !== 0) {
    const statusMessage = payload?.base_resp?.status_msg || `HTTP ${response.status}`;
    const trace = payload?.trace_id ? ` (trace_id: ${payload.trace_id})` : "";
    throw new Error(`MiniMax API error ${statusCode ?? response.status}: ${statusMessage}${trace}`);
  }

  const audioHex = payload?.data?.audio;
  if (
    typeof audioHex !== "string" ||
    audioHex.length === 0 ||
    audioHex.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(audioHex)
  ) {
    throw new Error("MiniMax response did not contain valid hex audio");
  }

  const durationMs = payload?.extra_info?.audio_length;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("MiniMax response did not contain a valid audio_length");
  }

  return {
    audio: Buffer.from(audioHex, "hex"),
    durationMs,
    traceId: payload.trace_id ?? null,
    usageCharacters: payload?.extra_info?.usage_characters ?? null,
  };
};

