// Typed wrappers around the Rust commands defined in `src-tauri/src/lib.rs`.
// All paths are absolute strings. Keep these signatures in sync with the Rust side.

import { invoke } from '@tauri-apps/api/core';
import type { FileInfo, TopicInfo } from '../types';

/** Create the workspace root directory if it does not yet exist. */
export async function ensureWorkspace(workspaceRoot: string): Promise<void> {
  await invoke('ensure_workspace', { workspaceRoot });
}

/**
 * Create a topic folder (with a `raw` subfolder) and return its absolute path.
 * The Rust side performs name sanitization; passing a validated name is fine too.
 */
export async function createTopic(workspaceRoot: string, name: string): Promise<string> {
  return invoke<string>('create_topic', { workspaceRoot, name });
}

/** List all topic folders directly under the workspace root. */
export async function listTopics(workspaceRoot: string): Promise<TopicInfo[]> {
  return invoke<TopicInfo[]>('list_topics', { workspaceRoot });
}

/** List the files inside a topic's `raw` folder. */
export async function listFiles(topicPath: string): Promise<FileInfo[]> {
  return invoke<FileInfo[]>('list_files', { topicPath });
}

/**
 * Copy a source file into the topic's `raw` folder, resolving name collisions
 * with a `-1`, `-2`... suffix (never overwrites). Returns the destination path.
 */
export async function copyFileIntoTopic(src: string, topicPath: string): Promise<string> {
  return invoke<string>('copy_file_into_topic', { src, topicPath });
}

/** Write a text file (e.g. a clipboard snippet) into the topic's `raw` folder. */
export async function saveTextFile(
  topicPath: string,
  filename: string,
  content: string,
): Promise<string> {
  return invoke<string>('save_text_file', { topicPath, filename, content });
}

/** Encode raw RGBA pixels as PNG and save into the topic's `raw` folder. */
export async function saveImageFile(
  topicPath: string,
  filename: string,
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<string> {
  return invoke<string>('save_image_file', {
    topicPath,
    filename,
    rgba: Array.from(rgba),
    width,
    height,
  });
}

/** Reveal a path in Windows Explorer. */
export async function openInExplorer(path: string): Promise<void> {
  await invoke('open_in_explorer', { path });
}

/** Delete a single file from a topic's `raw` folder. */
export async function deleteFile(topicPath: string, fileName: string): Promise<void> {
  await invoke('delete_file', { topicPath, fileName });
}

/** Delete an entire topic folder and all collected files inside it. */
export async function deleteTopic(workspaceRoot: string, topicPath: string): Promise<void> {
  await invoke('delete_topic', { workspaceRoot, topicPath });
}
