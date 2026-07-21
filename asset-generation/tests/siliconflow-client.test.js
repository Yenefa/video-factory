import assert from "node:assert/strict";
import {EventEmitter} from "node:events";
import {Readable} from "node:stream";
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
  assert.equal(calls[0][1].redirect, "error");
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

test("preflight reports successful malformed provider responses safely", async (t) => {
  for (const scenario of [
    {name: "missing JSON content type", response: new Response("{}", {status: 200})},
    {name: "wrong content type", response: new Response("{}", {status: 200, headers: {"content-type": "text/plain"}})},
    {name: "malformed JSON", response: new Response("private response body", {status: 200, headers: {"content-type": "application/json"}})},
    {name: "invalid schema", response: jsonResponse({unexpected: []})},
  ]) {
    await t.test(scenario.name, async () => {
      await assert.rejects(
        () => assertKolorsAvailable({apiKey: "secret-never-log", fetchImpl: async () => scenario.response}),
        (error) => error.message === "model preflight returned a malformed response"
          && !error.message.includes("secret-never-log")
          && !error.message.includes("private response body"),
      );
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
  assert.equal(calls[0][1].redirect, "error");
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

test("generation reports successful malformed provider responses safely", async (t) => {
  for (const scenario of [
    {name: "wrong content type", response: new Response("{}", {status: 200, headers: {"content-type": "text/plain"}})},
    {name: "malformed JSON", response: new Response("private response body", {status: 200, headers: {"content-type": "application/json"}})},
    {name: "invalid schema", response: jsonResponse({images: []})},
  ]) {
    await t.test(scenario.name, async () => {
      await assert.rejects(
        () => createKolorsImage({
          apiKey: "secret-never-log",
          job: {prompt: "p", negative_prompt: "n", image_size: "720x1280"},
          fetchImpl: async () => scenario.response,
        }),
        (error) => error.message === "image generation returned a malformed response"
          && !error.message.includes("secret-never-log")
          && !error.message.includes("private response body"),
      );
    });
  }
});

const forbiddenImageUrls = [
  "http://public.example/image.png",
  "https://user:password@public.example/image.png",
  "https://localhost/image.png",
  "https://preview.localhost/image.png",
  "https://127.0.0.1/image.png",
  "https://10.0.0.1/image.png",
  "https://172.16.0.1/image.png",
  "https://192.168.0.1/image.png",
  "https://169.254.1.1/image.png",
  "https://[::1]/image.png",
  "https://[fc00::1]/image.png",
  "https://[fd00::1]/image.png",
  "https://[fe80::1]/image.png",
  "https://[::ffff:127.0.0.1]/image.png",
];

test("generation rejects unsafe returned image URLs without exposing them", async (t) => {
  for (const url of ["not a URL", ...forbiddenImageUrls]) {
    await t.test(url, async () => {
      await assert.rejects(
        () => createKolorsImage({
          apiKey: "secret",
          job: {prompt: "p", negative_prompt: "n", image_size: "720x1280"},
          fetchImpl: async () => jsonResponse({images: [{url}]}),
        }),
        (error) => error.message === "image generation returned an unsafe image URL"
          && !error.message.includes(url),
      );
    });
  }
});

const publicLookup = (_hostname, options, callback) => {
  assert.deepEqual(options, {all: true, verbatim: true});
  callback(null, [{address: "93.184.216.34", family: 4}]);
};

const imageResponse = ({chunks = [new Uint8Array([1, 2, 3])], statusCode = 200, headers = {"content-type": "image/png"}} = {}) => {
  const response = Readable.from(chunks);
  response.statusCode = statusCode;
  response.headers = headers;
  return response;
};

const downloadTransport = ({response = imageResponse(), requestError} = {}) => {
  const calls = [];
  const requestImpl = (url, options, onResponse) => {
    const request = new EventEmitter();
    const call = {url, options, pinned: undefined};
    calls.push(call);
    request.end = () => {
      options.lookup(url.hostname, {}, (error, address, family) => {
        call.pinned = {address, family};
        queueMicrotask(() => {
          if (error) request.emit("error", error);
          else if (requestError) request.emit("error", requestError);
          else onResponse(response);
        });
      });
    };
    return request;
  };
  return {calls, requestImpl, response};
};

test("download pins a validated public resolution for TLS and returns bytes", async () => {
  const harness = downloadTransport();
  const lookupCalls = [];
  const lookupImpl = (hostname, options, callback) => {
    lookupCalls.push({hostname, options});
    callback(null, [
      {address: "93.184.216.34", family: 4},
      {address: "2606:2800:220:1:248:1893:25c8:1946", family: 6},
    ]);
  };

  const result = await downloadImage({
    url: "https://temporary.example/image.png",
    requestImpl: harness.requestImpl,
    lookupImpl,
    fetchImpl: async () => { throw new Error("legacy fetch transport used"); },
  });

  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].url.href, "https://temporary.example/image.png");
  assert.equal(harness.calls[0].options.method, "GET");
  assert.equal(harness.calls[0].options.servername, "temporary.example");
  assert.equal(harness.calls[0].options.headers.Authorization, undefined);
  assert.deepEqual(lookupCalls, [{
    hostname: "temporary.example",
    options: {all: true, verbatim: true},
  }]);
  assert.deepEqual(harness.calls[0].pinned, {address: "93.184.216.34", family: 4});
  assert.ok(Buffer.isBuffer(result.bytes));
  assert.deepEqual([...result.bytes], [1, 2, 3]);
  assert.equal(result.contentType, "image/png");
});

test("download rejects a public-looking hostname resolving to loopback before sending", async () => {
  const harness = downloadTransport();
  const lookupImpl = (_hostname, options, callback) => {
    assert.deepEqual(options, {all: true, verbatim: true});
    callback(null, [{address: "127.0.0.1", family: 4}]);
  };

  await assert.rejects(
    () => downloadImage({
      url: "https://public-looking.example/image.png",
      requestImpl: harness.requestImpl,
      lookupImpl,
      fetchImpl: async () => { throw new Error("legacy fetch transport used"); },
    }),
    (error) => error.message === "image download resolved to a non-public address",
  );
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.response.readableDidRead, false);
});

test("download rejects all DNS results when any A or AAAA address is non-public", async () => {
  const harness = downloadTransport();
  const lookupImpl = (_hostname, _options, callback) => callback(null, [
    {address: "93.184.216.34", family: 4},
    {address: "fd00::1", family: 6},
  ]);

  await assert.rejects(
    () => downloadImage({
      url: "https://mixed.example/image.png",
      requestImpl: harness.requestImpl,
      lookupImpl,
      fetchImpl: async () => { throw new Error("legacy fetch transport used"); },
    }),
    /resolved to a non-public address/,
  );
});

test("download rejects reserved, documentation, and multicast DNS addresses", async (t) => {
  for (const resolved of [
    {address: "192.0.2.1", family: 4},
    {address: "224.0.0.1", family: 4},
    {address: "2001:db8::1", family: 6},
    {address: "ff02::1", family: 6},
  ]) {
    await t.test(resolved.address, async () => {
      const harness = downloadTransport();
      await assert.rejects(
        () => downloadImage({
          url: "https://public-looking.example/image.png",
          requestImpl: harness.requestImpl,
          lookupImpl: (_hostname, _options, callback) => callback(null, [resolved]),
        }),
        /resolved to a non-public address/,
      );
    });
  }
});

test("download errors hide the temporary URL and response details and are not retried", async (t) => {
  const unsafeUrl = "https://temporary.example/private-token.png";
  for (const scenario of [
    {
      name: "HTTP failure",
      harness: downloadTransport({response: imageResponse({statusCode: 403, headers: {}})}),
      expected: "image download failed with HTTP 403",
    },
    {
      name: "network failure",
      harness: downloadTransport({requestError: new Error(`private response body ${unsafeUrl}`)}),
      expected: "image download request failed",
    },
  ]) {
    await t.test(scenario.name, async () => {
      await assert.rejects(
        () => downloadImage({url: unsafeUrl, requestImpl: scenario.harness.requestImpl, lookupImpl: publicLookup}),
        (error) => error.message === scenario.expected
          && !error.message.includes(unsafeUrl)
          && !error.message.includes("private response body"),
      );
      assert.equal(scenario.harness.calls.length, 1);
    });
  }
});

test("download never follows redirects", async () => {
  const harness = downloadTransport({response: imageResponse({
    statusCode: 302,
    headers: {location: "https://127.0.0.1/private"},
  })});

  await assert.rejects(
    () => downloadImage({
      url: "https://temporary.example/image.png",
      requestImpl: harness.requestImpl,
      lookupImpl: publicLookup,
    }),
    /image download failed with HTTP 302/,
  );
  assert.equal(harness.calls.length, 1);
});

test("download rejects unsafe URLs before creating a request", async (t) => {
  for (const url of ["not a URL", ...forbiddenImageUrls]) {
    await t.test(url, async () => {
      const harness = downloadTransport();
      await assert.rejects(
        () => downloadImage({url, requestImpl: harness.requestImpl, lookupImpl: publicLookup}),
        (error) => error.message === "image download URL is not allowed"
          && !error.message.includes(url),
      );
      assert.equal(harness.calls.length, 0);
    });
  }
});

test("download requires an image content type", async (t) => {
  for (const headers of [{}, {"content-type": "text/plain"}]) {
    await t.test(headers["content-type"] ?? "missing", async () => {
      const harness = downloadTransport({response: imageResponse({headers})});
      await assert.rejects(
        () => downloadImage({
          url: "https://temporary.example/image.png",
          requestImpl: harness.requestImpl,
          lookupImpl: publicLookup,
        }),
        (error) => error.message === "image download returned an unsupported content type",
      );
    });
  }
});

test("download rejects a declared body larger than 20 MiB without reading it", async () => {
  const response = imageResponse({headers: {
    "content-type": "image/png",
    "content-length": "20971521",
  }});
  const harness = downloadTransport({response});

  await assert.rejects(
    () => downloadImage({
      url: "https://temporary.example/image.png",
      requestImpl: harness.requestImpl,
      lookupImpl: publicLookup,
    }),
    (error) => error.message === "image download exceeded the 20 MiB limit",
  );
  assert.equal(response.readableDidRead, false);
});

test("download destroys a streamed response when it exceeds 20 MiB", async () => {
  const chunk = new Uint8Array(10 * 1024 * 1024);
  const response = imageResponse({chunks: [chunk, chunk, new Uint8Array([1])]});
  const harness = downloadTransport({response});

  await assert.rejects(
    () => downloadImage({
      url: "https://temporary.example/image.png",
      requestImpl: harness.requestImpl,
      lookupImpl: publicLookup,
    }),
    (error) => error.message === "image download exceeded the 20 MiB limit",
  );
  assert.equal(response.destroyed, true);
});

test("download checks chunk byteLength before converting an oversized chunk", async () => {
  let destroyed = false;
  const oversizedChunk = {
    byteLength: 20971521,
    valueOf() { throw new Error("Buffer.from was called"); },
  };
  const response = {
    statusCode: 200,
    headers: {"content-type": "image/png"},
    destroy() { destroyed = true; },
    async *[Symbol.asyncIterator]() { yield oversizedChunk; },
  };
  const harness = downloadTransport({response});

  await assert.rejects(
    () => downloadImage({
      url: "https://temporary.example/image.png",
      requestImpl: harness.requestImpl,
      lookupImpl: publicLookup,
    }),
    (error) => error.message === "image download exceeded the 20 MiB limit",
  );
  assert.equal(destroyed, true);
});
