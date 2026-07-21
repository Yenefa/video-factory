import assert from "node:assert/strict";
import {mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {fileURLToPath} from "node:url";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const credentialScript = path.resolve(testDirectory, "../credential-store.ps1");
const runLiveScript = path.resolve(testDirectory, "../run-live.ps1");

const quotePowerShell = (value) => `'${value.replaceAll("'", "''")}'`;

test("DPAPI credential store round-trips a secret for the current Windows user", () => {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "video-factory-credential-"));
  const credentialPath = path.join(temporaryDirectory, "minimax.dpapi");
  const command = [
    `. ${quotePowerShell(credentialScript)}`,
    "$secure = ConvertTo-SecureString 'test-secret-not-a-real-key' -AsPlainText -Force",
    `Save-VideoFactoryCredential -SecureValue $secure -Path ${quotePowerShell(credentialPath)}`,
    `$loaded = Get-VideoFactoryCredential -Path ${quotePowerShell(credentialPath)}`,
    "$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($loaded)",
    "try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }",
  ].join("; ");

  try {
    const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-NonInteractive", "-Command", command], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "test-secret-not-a-real-key");
  } finally {
    rmSync(temporaryDirectory, {recursive: true, force: true});
  }
});

test("credential store reports a clear recovery action for invalid data", () => {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "video-factory-credential-"));
  const credentialPath = path.join(temporaryDirectory, "minimax.dpapi");
  const command = [
    `. ${quotePowerShell(credentialScript)}`,
    `Set-Content -LiteralPath ${quotePowerShell(credentialPath)} -Value 'not-dpapi-data' -Encoding UTF8`,
    `Get-VideoFactoryCredential -Path ${quotePowerShell(credentialPath)}`,
  ].join("; ");

  try {
    const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-NonInteractive", "-Command", command], {
      encoding: "utf8",
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ResetCredential/);
  } finally {
    rmSync(temporaryDirectory, {recursive: true, force: true});
  }
});

test("live runner reuses a saved credential without prompting or making a request", () => {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "video-factory-credential-"));
  const credentialPath = path.join(temporaryDirectory, "minimax.dpapi");
  const command = [
    `. ${quotePowerShell(credentialScript)}`,
    "$secure = ConvertTo-SecureString 'test-secret-not-a-real-key' -AsPlainText -Force",
    `Save-VideoFactoryCredential -SecureValue $secure -Path ${quotePowerShell(credentialPath)}`,
    `& ${quotePowerShell(runLiveScript)} -CredentialPath ${quotePowerShell(credentialPath)} -SaveCredentialOnly`,
  ].join("; ");

  try {
    const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-NonInteractive", "-Command", command], {
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Using the MiniMax credential saved/);
    assert.match(result.stdout, /No MiniMax request was made/);
    assert.doesNotMatch(result.stdout, /Enter MINIMAX_API_KEY/);
  } finally {
    rmSync(temporaryDirectory, {recursive: true, force: true});
  }
});
