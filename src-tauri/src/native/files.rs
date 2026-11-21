//! File access for the web view, limited to paths the user picked.
//!
//! The web view can only read, write, or list a path inside the [`FileScope`]:
//! a file or folder chosen in a native dialog. Picks persist across restarts so
//! recent files and recovered drafts stay reachable.

use std::collections::HashSet;
use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use serde::Serialize;
use tauri::{AppHandle, Runtime, State};
use tauri_plugin_dialog::DialogExt;

/// Largest text file the editor opens.
pub const MAX_FILE_BYTES: u64 = 20 * 1024 * 1024;
/// Folder walk limits, so a huge folder cannot stall the app.
pub const MAX_DEPTH: usize = 8;
pub const MAX_ENTRIES: usize = 5000;
const SKIPPED_FOLDERS: &[&str] = &["node_modules", "target", "dist", "build"];

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", content = "message", rename_all = "camelCase")]
pub enum FileError {
    OutsideScope(String),
    NotFound(String),
    TooLarge(String),
    NotText(String),
    Io(String),
}

impl FileError {
    fn io(path: &Path, error: io::Error) -> Self {
        if error.kind() == io::ErrorKind::NotFound {
            Self::NotFound(format!("{} does not exist", path.display()))
        } else {
            Self::Io(format!("{}: {error}", path.display()))
        }
    }
}

/// Files and folders the user picked. A folder grants everything inside it.
pub struct FileScope {
    roots: Mutex<Vec<PathBuf>>,
    store: Option<PathBuf>,
}

impl FileScope {
    pub fn load(store: Option<PathBuf>) -> Self {
        let roots = store
            .as_ref()
            .and_then(|path| fs::read_to_string(path).ok())
            .and_then(|text| serde_json::from_str::<Vec<PathBuf>>(&text).ok())
            .unwrap_or_default();
        Self {
            roots: Mutex::new(roots),
            store,
        }
    }

    pub fn allow(&self, path: &Path) -> Result<PathBuf, FileError> {
        let canonical = canonicalize_lenient(path)?;
        let mut roots = self.roots.lock().expect("scope lock");
        if !roots.contains(&canonical) {
            roots.push(canonical.clone());
            if let Some(store) = &self.store {
                if let Some(parent) = store.parent() {
                    let _ = fs::create_dir_all(parent);
                }
                let _ = fs::write(store, serde_json::to_string(&*roots).unwrap_or_default());
            }
        }
        Ok(canonical)
    }

    pub fn check(&self, path: &Path) -> Result<PathBuf, FileError> {
        let canonical = canonicalize_lenient(path)?;
        let roots = self.roots.lock().expect("scope lock");
        if roots.iter().any(|root| canonical.starts_with(root)) {
            Ok(canonical)
        } else {
            Err(FileError::OutsideScope(format!(
                "{} is outside the files and folders you opened",
                path.display()
            )))
        }
    }
}

/// Canonical path for an existing path, or for a new file in an existing folder.
fn canonicalize_lenient(path: &Path) -> Result<PathBuf, FileError> {
    if path.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err(FileError::OutsideScope(format!(
            "{} contains '..'",
            path.display()
        )));
    }
    match fs::canonicalize(path) {
        Ok(canonical) => Ok(canonical),
        Err(error) if error.kind() == io::ErrorKind::NotFound => {
            let parent = path
                .parent()
                .ok_or_else(|| FileError::NotFound(path.display().to_string()))?;
            let name = path
                .file_name()
                .ok_or_else(|| FileError::NotFound(path.display().to_string()))?;
            let parent = fs::canonicalize(parent).map_err(|e| FileError::io(parent, e))?;
            Ok(parent.join(name))
        }
        Err(error) => Err(FileError::io(path, error)),
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextFile {
    pub content: String,
    pub modified_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderEntry {
    pub path: String,
    pub name: String,
    pub parent: String,
    pub kind: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderListing {
    pub root: String,
    pub entries: Vec<FolderEntry>,
    pub truncated: bool,
}

fn modified_ms(path: &Path) -> u64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn read_text(path: &Path) -> Result<TextFile, FileError> {
    let metadata = fs::metadata(path).map_err(|e| FileError::io(path, e))?;
    if metadata.len() > MAX_FILE_BYTES {
        return Err(FileError::TooLarge(format!(
            "{} is larger than {} MB",
            path.display(),
            MAX_FILE_BYTES / 1024 / 1024
        )));
    }
    let bytes = fs::read(path).map_err(|e| FileError::io(path, e))?;
    let content = String::from_utf8(bytes)
        .map_err(|_| FileError::NotText(format!("{} is not UTF-8 text", path.display())))?;
    Ok(TextFile {
        content,
        modified_ms: modified_ms(path),
    })
}

pub fn write_text(path: &Path, content: &str) -> Result<u64, FileError> {
    fs::write(path, content).map_err(|e| FileError::io(path, e))?;
    Ok(modified_ms(path))
}

/// Folders and supported files under `root`, folders first, then by name.
pub fn walk(root: &Path, extensions: &[String]) -> Result<FolderListing, FileError> {
    let wanted: HashSet<String> = extensions
        .iter()
        .map(|e| e.trim_start_matches('.').to_lowercase())
        .collect();
    let mut entries = Vec::new();
    let mut truncated = false;
    let mut stack = vec![(root.to_path_buf(), 0usize)];
    while let Some((folder, depth)) = stack.pop() {
        let mut children: Vec<_> = fs::read_dir(&folder)
            .map_err(|e| FileError::io(&folder, e))?
            .filter_map(Result::ok)
            .collect();
        children.sort_by_key(|entry| {
            let is_file = entry.file_type().map(|t| !t.is_dir()).unwrap_or(true);
            (is_file, entry.file_name().to_string_lossy().to_lowercase())
        });
        for child in children {
            let name = child.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') {
                continue;
            }
            let Ok(file_type) = child.file_type() else {
                continue;
            };
            let path = child.path();
            let kind = if file_type.is_dir() {
                if SKIPPED_FOLDERS.contains(&name.as_str()) {
                    continue;
                }
                if depth + 1 < MAX_DEPTH {
                    stack.push((path.clone(), depth + 1));
                } else {
                    truncated = true;
                }
                "folder"
            } else if file_type.is_file() {
                let extension = path
                    .extension()
                    .map(|e| e.to_string_lossy().to_lowercase())
                    .unwrap_or_default();
                if !wanted.contains(&extension) {
                    continue;
                }
                "file"
            } else {
                continue;
            };
            if entries.len() >= MAX_ENTRIES {
                truncated = true;
                break;
            }
            entries.push(FolderEntry {
                path: path.to_string_lossy().into_owned(),
                name,
                parent: folder.to_string_lossy().into_owned(),
                kind,
            });
        }
    }
    Ok(FolderListing {
        root: root.to_string_lossy().into_owned(),
        entries,
        truncated,
    })
}

fn picked(path: Option<tauri_plugin_dialog::FilePath>) -> Option<PathBuf> {
    path.and_then(|p| p.into_path().ok())
}

#[tauri::command]
pub async fn pick_open_file<R: Runtime>(
    app: AppHandle<R>,
    scope: State<'_, FileScope>,
    extensions: Vec<String>,
) -> Result<Option<String>, FileError> {
    let filters: Vec<&str> = extensions
        .iter()
        .map(|e| e.trim_start_matches('.'))
        .collect();
    let Some(path) = picked(
        app.dialog()
            .file()
            .add_filter("Documents", &filters)
            .blocking_pick_file(),
    ) else {
        return Ok(None);
    };
    Ok(Some(scope.allow(&path)?.to_string_lossy().into_owned()))
}

#[tauri::command]
pub async fn pick_folder<R: Runtime>(
    app: AppHandle<R>,
    scope: State<'_, FileScope>,
) -> Result<Option<String>, FileError> {
    let Some(path) = picked(app.dialog().file().blocking_pick_folder()) else {
        return Ok(None);
    };
    Ok(Some(scope.allow(&path)?.to_string_lossy().into_owned()))
}

#[tauri::command]
pub async fn pick_save_path<R: Runtime>(
    app: AppHandle<R>,
    scope: State<'_, FileScope>,
    suggested_name: String,
) -> Result<Option<String>, FileError> {
    let Some(path) = picked(
        app.dialog()
            .file()
            .set_file_name(&suggested_name)
            .blocking_save_file(),
    ) else {
        return Ok(None);
    };
    Ok(Some(scope.allow(&path)?.to_string_lossy().into_owned()))
}

#[tauri::command]
pub async fn read_text_file(
    scope: State<'_, FileScope>,
    path: String,
) -> Result<TextFile, FileError> {
    read_text(&scope.check(Path::new(&path))?)
}

#[tauri::command]
pub async fn write_text_file(
    scope: State<'_, FileScope>,
    path: String,
    content: String,
) -> Result<u64, FileError> {
    write_text(&scope.check(Path::new(&path))?, &content)
}

#[tauri::command]
pub async fn list_folder(
    scope: State<'_, FileScope>,
    path: String,
    extensions: Vec<String>,
) -> Result<FolderListing, FileError> {
    walk(&scope.check(Path::new(&path))?, &extensions)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tree() -> tempfile::TempDir {
        let dir = tempfile::tempdir().expect("tempdir");
        let root = dir.path();
        fs::create_dir_all(root.join("notes/deep")).unwrap();
        fs::create_dir_all(root.join(".git")).unwrap();
        fs::create_dir_all(root.join("node_modules/pkg")).unwrap();
        fs::write(root.join("readme.md"), "# Readme").unwrap();
        fs::write(root.join("notes/a.markdown"), "a").unwrap();
        fs::write(root.join("notes/deep/b.MD"), "b").unwrap();
        fs::write(root.join("notes/image.png"), [0u8, 1]).unwrap();
        fs::write(root.join(".hidden.md"), "h").unwrap();
        fs::write(root.join("node_modules/pkg/x.md"), "x").unwrap();
        dir
    }

    #[test]
    fn scope_allows_inside_picked_folder_only() {
        let dir = tree();
        let other = tempfile::tempdir().unwrap();
        fs::write(other.path().join("secret.md"), "s").unwrap();
        let scope = FileScope::load(None);
        scope.allow(dir.path()).unwrap();
        assert!(scope.check(&dir.path().join("notes/a.markdown")).is_ok());
        assert!(scope.check(&dir.path().join("notes/new.md")).is_ok());
        assert!(matches!(
            scope.check(&other.path().join("secret.md")),
            Err(FileError::OutsideScope(_))
        ));
        assert!(matches!(
            scope.check(&dir.path().join("notes/../../etc/passwd")),
            Err(FileError::OutsideScope(_))
        ));
    }

    #[test]
    fn scope_for_a_file_does_not_grant_its_siblings() {
        let dir = tree();
        let scope = FileScope::load(None);
        scope.allow(&dir.path().join("readme.md")).unwrap();
        assert!(scope.check(&dir.path().join("readme.md")).is_ok());
        assert!(scope.check(&dir.path().join("notes/a.markdown")).is_err());
    }

    #[test]
    fn scope_rejects_symlinks_that_escape() {
        let dir = tree();
        let other = tempfile::tempdir().unwrap();
        fs::write(other.path().join("secret.md"), "s").unwrap();
        std::os::unix::fs::symlink(other.path().join("secret.md"), dir.path().join("link.md"))
            .unwrap();
        let scope = FileScope::load(None);
        scope.allow(dir.path()).unwrap();
        assert!(scope.check(&dir.path().join("link.md")).is_err());
    }

    #[test]
    fn scope_persists_and_reloads() {
        let dir = tree();
        let store = tempfile::tempdir().unwrap().keep().join("scope.json");
        FileScope::load(Some(store.clone()))
            .allow(dir.path())
            .unwrap();
        let reloaded = FileScope::load(Some(store));
        assert!(reloaded.check(&dir.path().join("readme.md")).is_ok());
    }

    #[test]
    fn walk_lists_folders_and_supported_files() {
        let dir = tree();
        let root = fs::canonicalize(dir.path()).unwrap();
        let listing = walk(&root, &[".md".into(), ".markdown".into()]).unwrap();
        let names: Vec<_> = listing.entries.iter().map(|e| e.name.as_str()).collect();
        assert_eq!(names, ["notes", "readme.md", "deep", "a.markdown", "b.MD"]);
        assert!(!listing.truncated);
        let deep = listing.entries.iter().find(|e| e.name == "b.MD").unwrap();
        assert!(deep.parent.ends_with("deep"));
        assert_eq!(deep.kind, "file");
    }

    #[test]
    fn read_and_write_round_trip_and_reject_binary() {
        let dir = tree();
        let path = dir.path().join("readme.md");
        write_text(&path, "updated").unwrap();
        assert_eq!(read_text(&path).unwrap().content, "updated");
        fs::write(dir.path().join("bad.md"), [0xff, 0xfe, 0x00]).unwrap();
        assert!(matches!(
            read_text(&dir.path().join("bad.md")),
            Err(FileError::NotText(_))
        ));
        assert!(matches!(
            read_text(&dir.path().join("missing.md")),
            Err(FileError::NotFound(_))
        ));
    }
}
