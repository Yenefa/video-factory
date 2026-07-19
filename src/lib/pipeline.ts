// Reserved extension point for future AI-powered processing stages.
//
// Raw Material Collector deliberately does NOT implement any AI. Its job ends
// once files are sitting untouched inside `<workspace>/<Topic>/raw/`. A future
// pipeline can read those files and run downstream stages (transcription,
// summarization, indexing, retrieval, etc.) without this app participating.
//
// The contract below is intentionally a stub. Implement it in a future
// iteration - never add processing logic to this collector itself, so the
// "raw container" invariants stay intact.

import type { TopicInfo } from '../types';

/**
 * A future pipeline stage.
 *
 * Input: a topic (its `raw/` folder of untouched source files).
 * Output: whatever the stage produces - intentionally left open until the
 * pipeline is designed.
 */
export interface PipelineStage {
  readonly id: string;
  readonly name: string;
  run(topic: TopicInfo): Promise<unknown>;
}

// No stages are registered yet. Future code plugs stages in here, giving the
// pipeline a single, obvious entry point.
export const PIPELINE_STAGES: readonly PipelineStage[] = [];

/**
 * Run every registered stage for a topic. Currently a no-op because no stages
 * exist yet; left here so the wiring location is unambiguous later.
 */
export async function runPipeline(_topic: TopicInfo): Promise<void> {
  for (const stage of PIPELINE_STAGES) {
    await stage.run(_topic);
  }
}
