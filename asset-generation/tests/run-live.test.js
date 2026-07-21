import {test} from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const runLivePs1 = path.join(__dirname, "..", "run-live.ps1");
const credentialStorePs1 = path.join(repoRoot, "tts-timing", "credential-store.ps1");

const escapeSingle = (value) => value.replace(/'/g, "''");

const runPowerShell = (script, cwd) => new Promise((resolve, reject) => {
  const child = spawn("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-NonInteractive",
    "-Command", script,
  ], {cwd: cwd ?? path.dirname(runLivePs1)});
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => resolve({code, stdout, stderr}));
});

test("secure launcher reuses a saved credential without prompting or requesting", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "vf-asset-launcher-"));
  try {
    const credentialPath = path.join(tempDir, "siliconflow.dpapi");

    const saveScript = [
      `. '${escapeSingle(credentialStorePs1)}'`,
      `$secure = ConvertTo-SecureString 'test-secret-not-a-real-key' -AsPlainText -Force`,
      `Save-VideoFactoryCredential -SecureValue $secure -Path '${escapeSingle(credentialPath)}'`,
    ].join("; ");
    const saveResult = await runPowerShell(saveScript);
    assert.equal(saveResult.code, 0, `save failed: ${saveResult.stderr}`);

    const runScript = `& '${escapeSingle(runLivePs1)}' -CredentialPath '${escapeSingle(credentialPath)}' -SaveCredentialOnly`;
    const result = await runPowerShell(runScript);

    assert.equal(result.code, 0, `launcher exited ${result.code}: ${result.stderr}`);
    assert.match(result.stdout, /Using the SiliconFlow credential saved for this Windows account\./);
    assert.match(result.stdout, /No SiliconFlow request was made\./);
    assert.doesNotMatch(result.stdout, /Enter SILICONFLOW_API_KEY/);
  } finally {
    await rm(tempDir, {recursive: true, force: true});
  }
});
