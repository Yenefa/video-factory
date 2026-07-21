# TTS / Timing Service

Cross-cutting service between stage ③ Script and stage ⑥ Storyboard.

It converts Script Agent semantic segments into MiniMax MP3 files and a measured narration timeline. It does not guess duration from character counts: the service uses `extra_info.audio_length` returned for each generated audio file by the MiniMax T2A API.

## Locked configuration

```text
endpoint: https://api.minimaxi.com/v1/t2a_v2
model: speech-2.6-turbo
voice_id: Podcast_girl
language_boost: Chinese
emotion: fluent
format: mp3
sample_rate: 32000
bitrate: 128000
channel: 1
```

## Security

The live PowerShell runner stores the API key with Windows DPAPI. The encrypted file is bound to the current Windows account and lives outside the repository at `%LOCALAPPDATA%\VideoFactory\credentials\minimax-api-key.dpapi`.

- Never paste the key into JSON, source code, command arguments, or Git-tracked files.
- The CLI never prints the key.
- TLS verification remains enabled.

## Validate without spending API quota

From this directory:

```powershell
npm.cmd run validate -- --segments ..\docs\examples\script-agent-v2-rag-segments.json
```

## Synthesize

```powershell
npm.cmd run synthesize -- `
  --segments ..\docs\examples\script-agent-v2-rag-segments.json `
  --output ..\RawMaterialCollector\RAG\script\tts
```

For a one-time interactive run without saving the key, use:

```powershell
.\run-live.ps1
```

The first run asks for the key once and saves it with Windows DPAPI. Later runs load it automatically. To replace the saved key without making an API request:

```powershell
.\run-live.ps1 -ResetCredential -SaveCredentialOnly
```

To replace the key and immediately run synthesis, use `-ResetCredential` without `-SaveCredentialOnly`.

## Local speed adjustment (no API request)

Existing generated audio can be accelerated locally with FFmpeg `atempo`, which changes tempo while preserving pitch. The original output directory is not modified:

```powershell
npm run retime -- --timeline "..\RawMaterialCollector\RAG\script\tts\timeline.json" --output "..\RawMaterialCollector\RAG\script\tts-1.2x" --rate 1.2
```

The command writes new MP3 files and a new timeline whose durations are measured with FFprobe. It does not read `MINIMAX_API_KEY` or call MiniMax.

The script masks keyboard input, keeps the key only in the child process environment, and clears it when synthesis finishes.

Optional default pause between segments:

```powershell
--pause-ms 250
```

An explicit `pause_after_ms` on a segment overrides the default. The final segment always has zero trailing pause; Storyboard owns any ending hold.

## Output

```text
<output>/
  audio/
    scene-01-beat-01.mp3
    ...
  timeline.json
```

`timeline.json` contains measured `start_ms`, `end_ms`, `duration_ms`, pauses, model, voice, source references and MiniMax trace IDs. It never contains credentials.

## Tests

```powershell
npm.cmd test
```

The tests use injected HTTP responses and temporary directories; they do not call MiniMax or consume quota.

## Failure behavior

- Missing `MINIMAX_API_KEY`: synthesis exits before any API call.
- Invalid `Podcast_girl` for the account: the MiniMax status code, message and trace ID are reported without exposing the key.
- Invalid or duplicate segment IDs: validation stops before synthesis.
- Partial API failure: `timeline.json` is not written; already generated MP3 files remain available for diagnosis.
