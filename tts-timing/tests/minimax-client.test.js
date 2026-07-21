import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_MINIMAX_CONFIG,
  buildSynthesisRequest,
  synthesizeSegment,
} from "../src/minimax-client.js";

test("buildSynthesisRequest uses the approved podcast configuration", () => {
  const request = buildSynthesisRequest("你好，欢迎收听。", DEFAULT_MINIMAX_CONFIG);

  assert.deepEqual(request, {
    model: "speech-2.6-turbo",
    text: "你好，欢迎收听。",
    stream: false,
    language_boost: "Chinese",
    voice_setting: {
      voice_id: "Podcast_girl",
      speed: 1,
      vol: 1,
      pitch: 0,
      emotion: "fluent",
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
    subtitle_enable: false,
    output_format: "hex",
  });
});

test("buildSynthesisRequest rejects empty and overlong text", () => {
  assert.throws(
    () => buildSynthesisRequest("   ", DEFAULT_MINIMAX_CONFIG),
    /non-empty/,
  );
  assert.throws(
    () => buildSynthesisRequest("字".repeat(10000), DEFAULT_MINIMAX_CONFIG),
    /fewer than 10000/,
  );
});

test("synthesizeSegment sends Bearer auth and decodes measured audio", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify({
        data: { audio: "494433", status: 2 },
        extra_info: { audio_length: 1840, usage_characters: 8 },
        trace_id: "trace-123",
        base_resp: { status_code: 0, status_msg: "success" },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const result = await synthesizeSegment({
    apiKey: "secret-test-key",
    text: "你好，欢迎收听。",
    fetchImpl,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.minimaxi.com/v1/t2a_v2");
  assert.equal(calls[0].options.headers.Authorization, "Bearer secret-test-key");
  assert.equal(JSON.parse(calls[0].options.body).voice_setting.voice_id, "Podcast_girl");
  assert.deepEqual(result.audio, Buffer.from("494433", "hex"));
  assert.equal(result.durationMs, 1840);
  assert.equal(result.traceId, "trace-123");
  assert.equal(result.usageCharacters, 8);
});

test("synthesizeSegment reports MiniMax errors without exposing credentials", async () => {
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        base_resp: { status_code: 20132, status_msg: "invalid voice_id" },
        trace_id: "trace-error",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  await assert.rejects(
    synthesizeSegment({
      apiKey: "must-not-appear",
      text: "测试",
      fetchImpl,
    }),
    (error) => {
      assert.match(error.message, /20132/);
      assert.match(error.message, /invalid voice_id/);
      assert.doesNotMatch(error.message, /must-not-appear/);
      return true;
    },
  );
});

