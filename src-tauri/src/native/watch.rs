//! Change notifications for open documents.
//!
//! The web view names the files it has open; each must be in the file scope.
//! Their parent folders are watched (editors often save by replacing the
//! file, which ends a watch on the file itself), and a `file-changed` event
//! carries the path of any watched file that changes. The web view decides
//! whether the change is new by comparing modification times.

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, Runtime, State};

use super::files::{FileError, FileScope};

pub const FILE_CHANGED_EVENT: &str = "file-changed";

#[derive(Default)]
pub struct FileWatcher {
    inner: Mutex<Option<RecommendedWatcher>>,
}

/// Watched files whose change this event reports.
pub fn changed_paths(event: &notify::Event, watched: &HashSet<PathBuf>) -> Vec<PathBuf> {
    if matches!(event.kind, EventKind::Access(_)) {
        return Vec::new();
    }
    event
        .paths
        .iter()
        .filter(|path| watched.contains(*path))
        .cloned()
        .collect()
}

#[tauri::command]
pub async fn watch_paths<R: Runtime>(
    app: AppHandle<R>,
    scope: State<'_, FileScope>,
    watcher: State<'_, FileWatcher>,
    paths: Vec<String>,
) -> Result<(), FileError> {
    let files: HashSet<PathBuf> = paths
        .iter()
        .filter_map(|path| scope.check(Path::new(path)).ok())
        .collect();
    let folders: HashSet<PathBuf> = files
        .iter()
        .filter_map(|file| file.parent().map(Path::to_path_buf))
        .collect();
    let watched = Arc::new(files);
    let emitter = app.clone();
    let filter = Arc::clone(&watched);
    let mut next = notify::recommended_watcher(move |result: notify::Result<notify::Event>| {
        if let Ok(event) = result {
            for path in changed_paths(&event, &filter) {
                let _ = emitter.emit(FILE_CHANGED_EVENT, path.to_string_lossy().into_owned());
            }
        }
    })
    .map_err(|e| FileError::Io(format!("watching files: {e}")))?;
    for folder in &folders {
        next.watch(folder, RecursiveMode::NonRecursive)
            .map_err(|e| FileError::Io(format!("watching {}: {e}", folder.display())))?;
    }
    *watcher.inner.lock().expect("watcher lock") = Some(next);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use notify::event::{AccessKind, CreateKind, ModifyKind};

    #[test]
    fn reports_only_watched_paths_and_ignores_reads() {
        let watched: HashSet<PathBuf> = [PathBuf::from("/notes/a.md")].into();
        let modify = notify::Event::new(EventKind::Modify(ModifyKind::Any))
            .add_path("/notes/a.md".into())
            .add_path("/notes/b.md".into());
        assert_eq!(
            changed_paths(&modify, &watched),
            [PathBuf::from("/notes/a.md")]
        );
        let create =
            notify::Event::new(EventKind::Create(CreateKind::File)).add_path("/notes/a.md".into());
        assert_eq!(changed_paths(&create, &watched).len(), 1);
        let read =
            notify::Event::new(EventKind::Access(AccessKind::Any)).add_path("/notes/a.md".into());
        assert!(changed_paths(&read, &watched).is_empty());
    }
}
