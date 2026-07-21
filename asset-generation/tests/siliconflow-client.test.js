import assert from "node:assert/strict";
import test from "node:test";

import {
  KOLORS_MODEL,
  SILICONFLOW_BASE_URL,
  assertKolorsAvailable,
  createKolorsImage,
  downloadImage,
} from "../src/siliconflow-client.js";

const jsonResponse = (body, init = {}) => new Response(JSON.stringify(body), {
  status: 200,
  ...init,
  headers: {"content-type": "application/json", ...init.headers},
});

test("preflight accepts the configured model from data with one authenticated GET", async () => {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return jsonResponse({data: [{id: KOLORS_MODEL}]});
  };

  await assert.doesNotReject(() => assertKolorsAvailable({apiKey: "secret", fetchImpl}));

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], `${SILICONFLOW_BASE_URL}/models?type=image&sub_type=text-to-image`);
  assert.equal(calls[0][1].method, "GET");
  assert.deepEqual(calls[0][1].headers, {Authorization: "Bearer secret"});
});

test("preflight also accepts the configured model from models", async () => {
  const fetchImpl = async () => jsonResponse({models: [{id: KOLORS_MODEL}]});

  await assert.doesNotReject(() => assertKolorsAvailable({apiKey: "secret", fetchImpl}));
});

test("preflight rejects a missing configured model without exposing its key", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    return jsonResponse({data: []});
  };

  await assert.rejects(
    () => assertKolorsAvailable({apiKey: "secret-never-log", fetchImpl}),
    (error) => !error.message.includes("secret-never-log")
      && error.message === `configured model ${KOLORS_MODEL} is not available`,
  );
  assert.equal(attempts, 1);
});

test("preflight HTTP and network errors are safe and never retried", async (t) => {
  for (const scenario of [
    {
      name: "HTTP failure",
      fetchImpl: async () => new Response("private response body", {status: 401}),
      expected: "model preflight failed with HTTP 401",
    },
    {
      name: "network failure",
      fetchImpl: async () => { throw new Error("secret-never-log private response body"); },
      expected: "model preflight request failed",
    },
  ]) {
    await t.test(scenario.name, async () => {
      let attempts = 0;
      const fetchImpl = async (...args) => {
        attempts += 1;
        return scenario.fetchImpl(...args);
      };
      await assert.rejects(
        () => assertKolorsAvailable({apiKey: "secret-never-log", fetchImpl}),
        (error) => error.message === scenario.expected,
      );
      assert.equal(attempts, 1);
    });
  }
});

test("generation uses one Kolors image with the approved request body", async () => {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return jsonResponse(
      {images: [{url: "https://temporary.example/image.png"}], seed: 7, traceId: "body-trace"},
      {headers: {"x-siliconcloud-trace-id": "header-trace"}},
    );
  };

  const result = await createKolorsImage({
    apiKey: "secret",
    job: {prompt: "p", negative_prompt: "n", image_size: "720x1280"},
    fetchImpl,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], `${SILICONFLOW_BASE_URL}/images/generations`);
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(calls[0][1].headers, {
    Authorization: "Bearer secret",
    "Content-Type": "application/json",
  });
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    model: KOLORS_MODEL,
    prompt: "p",
    negative_prompt: "n",
    image_size: "720x1280",
    batch_size: 1,
    num_inference_steps: 20,
    guidance_scale: 7.5,
  });
  assert.deepEqual(result, {
    url: "https://temporary.example/image.png",
    seed: 7,
    traceId: "header-trace",
  });
});

test("generation accepts a trace id from the response body", async () => {
  const fetchImpl = async () => jsonResponse({
    images: [{url: "https://temporary.example/image.png"}],
    seed: 8,
    trace_id: "body-trace",
  });

  const result = await createKolorsImage({
    apiKey: "secret",
    job: {prompt: "p", negative_prompt: "n", image_size: "720x1280"},
    fetchImpl,
  });

  assert.equal(result.traceId, "body-trace");
});

test("generation requires exactly one non-empty temporary URL and keeps errors safe", async (t) => {
  const unsafeUrl = "https://temporary.example/do-not-log.png";
  const scenarios = [
    {name: "no images", response: jsonResponse({images: []})},
    {name: "empty URL", response: jsonResponse({images: [{url: "  "}]})},
    {name: "multiple images", response: jsonResponse({images: [{url: unsafeUrl}, {url: "https://temporary.example/two.png"}]})},
    {name: "HTTP failure", response: new Response(`secret-never-log ${unsafeUrl}`, {status: 500})},
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      let attempts = 0;
      const fetchImpl = async () => {
        attempts += 1;
        return scenario.response;
      };
      await assert.rejects(
        () => createKolorsImage({
          apiKey: "secret-never-log",
          job: {prompt: "p", negative_prompt: "n", image_size: "720x1280"},
          fetchImpl,
        }),
        (error) => /image generation/.test(error.message)
          && !error.message.includes("secret-never-log")
          && !error.message.includes(unsafeUrl),
      );
      assert.equal(attempts, 1);
    });
  }
});

test("generation network errors are safe and never retried", async () => {
  let attempts = 0;
  const fetchImpl = async () => {
    attempts += 1;
    throw new Error("secret-never-log https://temporary.example/private.png");
  };

  await assert.rejects(
    () => createKolorsImage({
      apiKey: "secret-never-log",
      job: {prompt: "p", negative_prompt: "n", image_size: "720x1280"},
      fetchImpl,
    }),
    (error) => error.message === "image generation request failed",
  );
  assert.equal(attempts, 1);
});

test("download returns buffered bytes and content type without Authorization", async () => {
  const calls = [];
  const fetchImpl = async (...args) => {
    calls.push(args);
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: {"content-type": "image/png"},
    });
  };

  const result = await downloadImage({url: "https://temporary.example/image.png", fetchImpl});

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://temporary.example/image.png");
  assert.equal(calls[0][1]?.headers?.Authorization, undefined);
  assert.ok(Buffer.isBuffer(result.bytes));
  assert.deepEqual([...result.bytes], [1, 2, 3]);
  assert.equal(result.contentType, "image/png");
});

test("download errors hide the temporary URL and response body and are not retried", async (t) => {
  const unsafeUrl = "https://temporary.example/private-token.png";
  for (const scenario of [
    {
      name: "HTTP failure",
      fetchImpl: async () => new Response("private response body", {status: 403}),
      expected: "image download failed with HTTP 403",
    },
    {
      name: "network failure",
      fetchImpl: async () => { throw new Error(`private response body ${unsafeUrl}`); },
      expected: "image download request failed",
    },
  ]) {
    await t.test(scenario.name, async () => {
      let attempts = 0;
      const fetchImpl = async (...args) => {
        attempts += 1;
        return scenario.fetchImpl(...args);
      };
      await assert.rejects(
        () => downloadImage({url: unsafeUrl, fetchImpl}),
        (error) => error.message === scenario.expected
          && !error.message.includes(unsafeUrl)
          && !error.message.includes("private response body"),
      );
      assert.equal(attempts, 1);
    });
  }
});
