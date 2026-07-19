//! Raw Material Collector - Tauri 2 backend.
//!
//! Exposes filesystem commands that the React frontend invokes through
//! `@tauri-apps/api/core`'s `invoke(...)`. Each command returns
//! `Result<T, String>` so that errors surface as rejected promises on
//! the JS side.
//!
//! All paths are absolute strings. The frontend passes camelCase argument
//! names; Tauri automatically converts them to the snake_case parameter
//! names used here.

use std::fs;
use std::path::{Path, PathBuf};

// ---------------------------------------------------------------------------
// Data types (must mirror the TypeScript interfaces in `src/types.ts`).
// `rename_all = "camelCase"` keeps the serialized JSON in sync with the
// frontend's naming convention.
// ---------------------------------------------------------------------------

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicInfo {
    pub name: String,
    pub path: String,
    pub created_at: i64,
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified_at: i64,
    pub is_dir: bool,
}

// ---------------------------------------------------------------------------
// App entry point.
// ---------------------------------------------------------------------------

/// Build and run the Tauri application, registering plugins and the
/// command handler used by the frontend.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            ensure_workspace,
            create_topic,
            list_topics,
            list_files,
            copy_file_into_topic,
            save_text_file,
            save_image_file,
            open_in_explorer,
            delete_file,
            delete_topic,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ---------------------------------------------------------------------------
// Commands.
// ---------------------------------------------------------------------------

/// Create the workspace root directory (and any missing parents) if it
/// does not yet exist. Idempotent.
#[tauri::command]
fn ensure_workspace(workspace_root: String) -> Result<(), String> {
    fs::create_dir_all(&workspace_root).map_err(|e| e.to_string())?;
    Ok(())
}

/// Create a new topic folder beneath the workspace root. The folder name
/// is sanitized (illegal filesystem characters are replaced with `_`) and
/// a `raw` subfolder is created inside it to hold collected files.
/// Returns the absolute path of the topic folder.
#[tauri::command]
fn create_topic(workspace_root: String, name: String) -> Result<String, String> {
    let clean = sanitize_topic_name(&name);
    let topic = PathBuf::from(&workspace_root).join(&clean);
    fs::create_dir_all(topic.join("raw")).map_err(|e| e.to_string())?;
    Ok(topic.to_string_lossy().to_string())
}

/// List every directory directly beneath the workspace root. Each entry
/// is reported as a `TopicInfo` with its creation time (falling back to
/// the modification time when creation time is unavailable). The vector
/// is returned unsorted; the frontend is responsible for ordering.
#[tauri::command]
fn list_topics(workspace_root: String) -> Result<Vec<TopicInfo>, String> {
    let mut topics = Vec::new();
    let entries = fs::read_dir(&workspace_root).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        if !file_type.is_dir() {
            continue;
        }
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        // Prefer creation time; fall back to modification time on platforms
        // or filesystems where `created()` is not supported.
        let created = system_time_ms(metadata.created().or_else(|_| metadata.modified()));
        topics.push(TopicInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            created_at: created,
        });
    }
    Ok(topics)
}

/// List every regular file inside a topic's `raw` subfolder. Each file is
/// reported as a `FileInfo` with its byte size and modification time.
#[tauri::command]
fn list_files(topic_path: String) -> Result<Vec<FileInfo>, String> {
    let raw_dir = PathBuf::from(&topic_path).join("raw");
    let mut files = Vec::new();
    let entries = fs::read_dir(&raw_dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        // Include regular files and directories; skip symlinks and other
        // special types so the listing reflects collectible material.
        if !file_type.is_file() && !file_type.is_dir() {
            continue;
        }
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        files.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            size: metadata.len(),
            modified_at: system_time_ms(metadata.modified()),
            is_dir: file_type.is_dir(),
        });
    }
    Ok(files)
}

/// Copy an external file into a topic's `raw` subfolder. Collisions are
/// resolved by inserting a `-N` suffix (1, 2, ...) before the file
/// extension so that existing files are never overwritten. Returns the
/// absolute destination path.
#[tauri::command]
fn copy_file_into_topic(src: String, topic_path: String) -> Result<String, String> {
    let dest_dir = PathBuf::from(&topic_path).join("raw");
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let src_path = PathBuf::from(&src);
    let filename = src_path
        .file_name()
        .ok_or_else(|| "source path has no file name component".to_string())?
        .to_string_lossy()
        .to_string();

    let dest = unique_path(&dest_dir, &filename);
    if fs::metadata(&src_path).map_err(|e| e.to_string())?.is_dir() {
        copy_dir_recursive(&src_path, &dest)?;
    } else {
        fs::copy(&src_path, &dest).map_err(|e| e.to_string())?;
    }
    Ok(dest.to_string_lossy().to_string())
}

/// Write a text snippet (e.g. a clipboard text payload) into a topic's
/// `raw` subfolder as a new file. Collisions are resolved the same way
/// as `copy_file_into_topic`. Returns the absolute destination path.
#[tauri::command]
fn save_text_file(
    topic_path: String,
    filename: String,
    content: String,
) -> Result<String, String> {
    let dest_dir = PathBuf::from(&topic_path).join("raw");
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let dest = unique_path(&dest_dir, &filename);
    fs::write(&dest, content).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().to_string())
}

/// Encode raw RGBA pixel data as a PNG and save it into a topic's `raw`
/// subfolder. The `rgba` buffer must contain exactly `width * height * 4`
/// bytes. Collisions are resolved with the same `-N` suffix strategy.
/// Returns the absolute destination path.
#[tauri::command]
fn save_image_file(
    topic_path: String,
    filename: String,
    rgba: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let dest_dir = PathBuf::from(&topic_path).join("raw");
    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let dest = unique_path(&dest_dir, &filename);

    let img = image::ImageBuffer::<image::Rgba<u8>, Vec<u8>>::from_raw(width, height, rgba)
        .ok_or_else(|| "invalid image dimensions: rgba length does not match width * height * 4".to_string())?;

    img.save_with_format(&dest, image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    Ok(dest.to_string_lossy().to_string())
}

/// Reveal a file or folder in Windows Explorer. When `path` points to a
/// directory, Explorer opens at that location. When it points to a file,
/// Explorer opens the parent folder with the file pre-selected.
#[tauri::command]
fn open_in_explorer(path: String) -> Result<(), String> {
    let is_dir = PathBuf::from(&path).is_dir();
    let mut cmd = std::process::Command::new("explorer");
    if is_dir {
        cmd.arg(&path);
    } else {
        // `/select,` must be passed as its own argument, followed by the
        // full path of the file to highlight.
        cmd.arg("/select,").arg(&path);
    }
    cmd.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

/// Delete a single file from a topic's `raw` subfolder. `file_name` must be a
/// bare filename (a single normal path component) so the call can never
/// resolve to a path outside the topic's `raw` folder. Returns an error if
/// the file does not exist.
#[tauri::command]
fn delete_file(topic_path: String, file_name: String) -> Result<(), String> {
    let mut comps = Path::new(&file_name).components();
    let valid =
        matches!(comps.next(), Some(std::path::Component::Normal(_))) && comps.next().is_none();
    if !valid {
        return Err("invalid file name".to_string());
    }
    let target = PathBuf::from(&topic_path).join("raw").join(&file_name);
    if target.is_dir() {
        fs::remove_dir_all(&target).map_err(|e| e.to_string())?;
    } else if target.is_file() {
        fs::remove_file(&target).map_err(|e| e.to_string())?;
    } else {
        return Err("file not found".to_string());
    }
    Ok(())
}

/// Delete an entire topic folder along with all files collected inside it.
/// The folder must be a direct child of the workspace root (after
/// canonicalization) so the call cannot delete arbitrary directories.
#[tauri::command]
fn delete_topic(workspace_root: String, topic_path: String) -> Result<(), String> {
    let topic = PathBuf::from(&topic_path);
    if !topic.is_dir() {
        return Err("topic not found".to_string());
    }
    let root_canon = fs::canonicalize(&workspace_root).map_err(|e| e.to_string())?;
    let topic_canon = fs::canonicalize(&topic).map_err(|e| e.to_string())?;
    if !topic_canon.starts_with(&root_canon) {
        return Err("topic is outside the workspace".to_string());
    }
    if topic_canon.parent() != Some(root_canon.as_path()) {
        return Err("not a direct topic folder".to_string());
    }
    fs::remove_dir_all(&topic_canon).map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

/// Replace characters that are illegal in Windows filenames (`\ / : * ? " < > |`)
/// with underscores, then trim leading/trailing whitespace. An empty result
/// (e.g. if the input was all illegal characters) falls back to `untitled`.
fn sanitize_topic_name(name: &str) -> String {
    const ILLEGAL: &[char] = &['\\', '/', ':', '*', '?', '"', '<', '>', '|'];
    let cleaned: String = name
        .chars()
        .map(|c| if ILLEGAL.contains(&c) { '_' } else { c })
        .collect::<String>()
        .trim()
        .to_string();
    if cleaned.is_empty() {
        "untitled".to_string()
    } else {
        cleaned
    }
}

/// Resolve a filename collision inside `dir` by inserting `-N` (starting
/// at 1) before the file extension. Files without an extension receive
/// the suffix at the end of the stem. The returned path is guaranteed not
/// to exist at call time (though a TOCTOU race is theoretically possible
/// and acceptable for this single-user desktop app).
fn unique_path(dir: &Path, filename: &str) -> PathBuf {
    let candidate = dir.join(filename);
    if !candidate.exists() {
        return candidate;
    }

    let path = Path::new(filename);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(filename);
    let ext = path.extension().and_then(|s| s.to_str());

    // Try `stem-1.ext`, `stem-2.ext`, ... up to a large N. The loop is
    // practically always short; the bound just prevents infinite loops.
    for n in 1..1_000_000u64 {
        let new_name = match ext {
            Some(e) => format!("{}-{}.{}", stem, n, e),
            None => format!("{}-{}", stem, n),
        };
        let next = dir.join(&new_name);
        if !next.exists() {
            return next;
        }
    }

    // Should be unreachable for any realistic workload.
    candidate
}

/// Recursively copy a directory tree from `src` into `dest` (which is created
/// if missing). Symlinks and other non-file/non-dir entries are skipped to
/// avoid following links outside the source tree.
fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let from = entry.path();
        let to = dest.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else if file_type.is_file() {
            fs::copy(&from, &to).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Convert a `SystemTime` result to milliseconds since the Unix epoch.
/// Any I/O error or pre-epoch time yields `0`, which is safe for the
/// frontend to display.
fn system_time_ms(t: std::io::Result<std::time::SystemTime>) -> i64 {
    t.map(|st| {
        st.duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0)
    })
    .unwrap_or(0)
}
