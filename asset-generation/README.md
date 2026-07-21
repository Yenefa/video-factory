# Asset Generation

Constrained SiliconFlow Kolors image generation for Video Factory stage ⑤ (Asset Planning). Validates an asset-job document, preflights the model, generates at most three images per run, downloads each immediately, and persists a local asset manifest with checksums.

## Operation

```powershell
cd asset-generation
npm.cmd test
npm.cmd run validate -- --jobs ../docs/examples/asset-planning-v0.3-rag-jobs.json
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-live.ps1 -SaveCredentialOnly
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-live.ps1
```

The first `-SaveCredentialOnly` run prompts once for a newly rotated `SILICONFLOW_API_KEY` and stores it with Windows DPAPI at `%LOCALAPPDATA%\VideoFactory\credentials\siliconflow-api-key.dpapi` (outside this repository). Later runs reuse the stored credential and never prompt.

## Hard limits

- At most **3 generated images** per run.
- **One output per request** (batch size 1).
- **One attempt per asset**; no automatic retry.
- **No provider fallback**; if Kolors is unavailable the run stops.
- **Immediate download** of every returned image URL.

## Output

`generate` writes into the output directory:

- `assets/<job-id>.<ext>` - the downloaded image
- `asset-manifest.json` - one record per generated asset with `sha256`, content type, model, seed, trace id, image size, prompt, negative prompt, and `cost_status: "unknown"`.

The remote response URL is **transient** and is never persisted. `asset-manifest.json` records `cost_status: "unknown"` because account-specific pricing is not established by this repository; operators must check their SiliconFlow account before spending.

## Credentials

The API key never appears in source control, logs, or the manifest. `run-live.ps1` sets `SILICONFLOW_API_KEY` in the environment only long enough to invoke the CLI, redacts `sk-...` patterns in output, and clears the variable in a `finally` block. Use `-ResetCredential` to replace a stored key.
