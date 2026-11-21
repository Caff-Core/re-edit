//! File access for the web view, limited to paths the user picked.
//!
//! The web view can only read, write, or list a path inside the [`FileScope`]:
//! a file or folder chosen in a native dialog. Picks persist across restarts so
//! recent files and recovered drafts stay reachable.

use std::collections::HashSet;
use std::fs;
use std::io::{self, Read, Write};
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
    /// The file changed on disk since the version the editor knows.
    Conflict(String),
    Io(String),
    /// No Chromium-based browser was found to render a PDF.
    RendererMissing(String),
    /// The PDF renderer failed, timed out, or produced no PDF.
    RendererFailed(String),
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
            // A dangling symlink also reports NotFound. Writing through it
            // would create its target, possibly outside the scope.
            if fs::symlink_metadata(path).is_ok_and(|m| m.file_type().is_symlink()) {
                return Err(FileError::OutsideScope(format!(
                    "{} is a link to a missing file",
                    path.display()
                )));
            }
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
    let mut bytes = Vec::new();
    open_no_follow(path, false)?
        .read_to_end(&mut bytes)
        .map_err(|e| FileError::io(path, e))?;
    let content = String::from_utf8(bytes)
        .map_err(|_| FileError::NotText(format!("{} is not UTF-8 text", path.display())))?;
    Ok(TextFile {
        content,
        modified_ms: modified_ms(path),
    })
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileStat {
    pub exists: bool,
    pub modified_ms: u64,
}

pub fn stat(path: &Path) -> FileStat {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.is_file() => FileStat {
            exists: true,
            modified_ms: modified_ms(path),
        },
        _ => FileStat {
            exists: false,
            modified_ms: 0,
        },
    }
}

static TEMP_SEQUENCE: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

/// Writes `content` atomically: a temporary file in the same folder is
/// written, flushed to disk, given the target's permissions, and renamed over
/// the target. A failure at any step leaves the target as it was.
///
/// With `expected_modified_ms`, the write is refused with
/// [`FileError::Conflict`] when the file on disk is not the version the editor
/// last read or wrote.
pub fn write_text(
    path: &Path,
    content: &str,
    expected_modified_ms: Option<u64>,
) -> Result<u64, FileError> {
    write_bytes(path, content.as_bytes(), expected_modified_ms)
}

/// [`write_text`] for any bytes, such as a rendered PDF.
pub fn write_bytes(
    path: &Path,
    content: &[u8],
    expected_modified_ms: Option<u64>,
) -> Result<u64, FileError> {
    // Commands pass canonical paths, so a symlink here means one was swapped
    // in after the scope check. Never replace or follow it.
    if fs::symlink_metadata(path).is_ok_and(|m| m.file_type().is_symlink()) {
        return Err(FileError::OutsideScope(format!(
            "{} is a symbolic link",
            path.display()
        )));
    }
    if let Some(expected) = expected_modified_ms {
        let current = stat(path);
        if !current.exists || current.modified_ms != expected {
            return Err(FileError::Conflict(format!(
                "{} changed on disk since it was opened",
                path.display()
            )));
        }
    }
    let folder = path
        .parent()
        .ok_or_else(|| FileError::NotFound(path.display().to_string()))?;
    let name = path
        .file_name()
        .ok_or_else(|| FileError::NotFound(path.display().to_string()))?
        .to_string_lossy();
    let sequence = TEMP_SEQUENCE.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    let temp = folder.join(format!(
        ".{name}.re-edit-{}-{sequence}.tmp",
        std::process::id()
    ));
    let result = (|| {
        use std::os::unix::fs::OpenOptionsExt;
        // An existing file keeps its permissions. The temporary file starts
        // owner-only and takes the target's mode before any content is
        // written, so a private document is never readable by others, even
        // briefly. A new file gets the usual 0666 minus the umask.
        let target_permissions = fs::metadata(path).ok().map(|m| m.permissions());
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(if target_permissions.is_some() {
                0o600
            } else {
                0o666
            })
            .custom_flags(libc::O_NOFOLLOW)
            .open(&temp)
            .map_err(|e| FileError::io(path, e))?;
        if let Some(permissions) = target_permissions {
            file.set_permissions(permissions)
                .map_err(|e| FileError::io(path, e))?;
        }
        file.write_all(content)
            .map_err(|e| FileError::io(path, e))?;
        file.sync_all().map_err(|e| FileError::io(path, e))?;
        fs::rename(&temp, path).map_err(|e| FileError::io(path, e))?;
        if let Ok(dir) = fs::File::open(folder) {
            let _ = dir.sync_all();
        }
        Ok(modified_ms(path))
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result
}

/// Opens `path` without following a symlink in its last component, so a link
/// swapped in after the scope check fails instead of leaving the scope.
fn open_no_follow(path: &Path, write: bool) -> Result<fs::File, FileError> {
    use std::os::unix::fs::OpenOptionsExt;
    let mut options = fs::OpenOptions::new();
    if write {
        options.write(true).create(true).truncate(true);
    } else {
        options.read(true);
    }
    options.custom_flags(libc::O_NOFOLLOW);
    options.open(path).map_err(|error| {
        if error.raw_os_error() == Some(libc::ELOOP) {
            FileError::OutsideScope(format!("{} is a symbolic link", path.display()))
        } else {
            FileError::io(path, error)
        }
    })
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
    expected_modified_ms: Option<u64>,
) -> Result<u64, FileError> {
    write_text(
        &scope.check(Path::new(&path))?,
        &content,
        expected_modified_ms,
    )
}

#[tauri::command]
pub async fn stat_file(scope: State<'_, FileScope>, path: String) -> Result<FileStat, FileError> {
    Ok(stat(&scope.check(Path::new(&path))?))
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
    fn scope_rejects_dangling_symlinks_and_never_writes_through_them() {
        let dir = tree();
        let other = tempfile::tempdir().unwrap();
        let outside = other.path().join("created-outside.md");
        std::os::unix::fs::symlink(&outside, dir.path().join("dangling.md")).unwrap();
        let scope = FileScope::load(None);
        scope.allow(dir.path()).unwrap();
        assert!(matches!(
            scope.check(&dir.path().join("dangling.md")),
            Err(FileError::OutsideScope(_))
        ));
        // Even with the check bypassed, the write refuses to follow the link.
        assert!(matches!(
            write_text(&dir.path().join("dangling.md"), "x", None),
            Err(FileError::OutsideScope(_))
        ));
        assert!(!outside.exists());
    }

    #[test]
    fn reads_refuse_symlinks_in_the_last_component() {
        let dir = tree();
        std::os::unix::fs::symlink(dir.path().join("readme.md"), dir.path().join("alias.md"))
            .unwrap();
        assert!(matches!(
            read_text(&dir.path().join("alias.md")),
            Err(FileError::OutsideScope(_))
        ));
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
    fn atomic_write_keeps_permissions_and_leaves_no_temp_files() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tree();
        let path = dir.path().join("readme.md");
        fs::set_permissions(&path, fs::Permissions::from_mode(0o640)).unwrap();
        let modified = write_text(&path, "new", None).unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "new");
        assert_eq!(
            fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o640
        );
        assert_eq!(stat(&path).modified_ms, modified);
        let leftovers = fs::read_dir(dir.path())
            .unwrap()
            .filter_map(Result::ok)
            .filter(|e| e.file_name().to_string_lossy().contains("re-edit-"))
            .count();
        assert_eq!(leftovers, 0);
    }

    #[test]
    fn atomic_write_keeps_private_files_private() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tree();
        let path = dir.path().join("private.md");
        fs::write(&path, "secret").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o600)).unwrap();
        write_text(&path, "still secret", None).unwrap();
        assert_eq!(
            fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o600
        );
        // A new file follows the umask like any other created file.
        let fresh = dir.path().join("fresh.md");
        write_text(&fresh, "new", None).unwrap();
        let mode = fs::metadata(&fresh).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode & 0o600, 0o600);
        assert_eq!(mode & 0o111, 0);
    }

    #[test]
    fn write_refuses_when_the_file_changed_on_disk() {
        let dir = tree();
        let path = dir.path().join("readme.md");
        let known = stat(&path).modified_ms;
        // Another program rewrites the file with a later modification time.
        std::thread::sleep(std::time::Duration::from_millis(20));
        fs::write(&path, "theirs").unwrap();
        assert!(matches!(
            write_text(&path, "mine", Some(known)),
            Err(FileError::Conflict(_))
        ));
        assert_eq!(fs::read_to_string(&path).unwrap(), "theirs");
        let current = stat(&path).modified_ms;
        assert!(write_text(&path, "mine", Some(current)).is_ok());
        assert!(matches!(
            write_text(&dir.path().join("gone.md"), "x", Some(1)),
            Err(FileError::Conflict(_))
        ));
    }

    #[test]
    fn failed_write_leaves_the_original_untouched() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tree();
        let folder = dir.path().join("locked");
        fs::create_dir(&folder).unwrap();
        let path = folder.join("doc.md");
        fs::write(&path, "original").unwrap();
        fs::set_permissions(&folder, fs::Permissions::from_mode(0o500)).unwrap();
        let result = write_text(&path, "lost?", None);
        fs::set_permissions(&folder, fs::Permissions::from_mode(0o700)).unwrap();
        assert!(matches!(result, Err(FileError::Io(_))));
        assert_eq!(fs::read_to_string(&path).unwrap(), "original");
    }

    #[test]
    fn read_and_write_round_trip_and_reject_binary() {
        let dir = tree();
        let path = dir.path().join("readme.md");
        write_text(&path, "updated", None).unwrap();
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
