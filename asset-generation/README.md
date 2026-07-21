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

## Image Model & Prompt Reference

**Current model:** SiliconFlow `Kwai-Kolors/Kolors` (text-to-image). Configured in `src/siliconflow-client.js` (`KOLORS_MODEL`, `SILICONFLOW_BASE_URL`).

**Prompt reference:** [awesome-nano-banana-pro-prompts](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts) — 通用生图提示词技巧集（结构化描述、风格关键词、构图、negative prompt 等原则跨模型通用）。当前仅作参考，未集成进代码；⑤ 的 job fixture prompt 为手写，可参考此 skill 优化。

**替换说明（以后随时换模型）：** 提示词技巧通用，但同一 prompt 在不同模型上出图效果有差异（训练数据、敏感词过滤、prompt 格式偏好）。如换模型（如 Gemini nano-banana）：

1. 提示词原则可复用，但需按新模型微调 prompt；
2. 更新 `src/siliconflow-client.js` 的 model ID / endpoint / 请求参数；
3. 更新 `run-live.ps1` 的环境变量名与 DPAPI 凭证路径；
4. 重跑 `npm test` 确认 client 测试通过。
