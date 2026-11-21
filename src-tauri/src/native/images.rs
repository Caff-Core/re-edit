//! Local images for the Markdown preview and export.
//!
//! A document may show images stored next to it. The request names the
//! document (which must be in the file scope) and the image source from the
//! Markdown. The image must resolve inside the document's folder, be an image
//! type, and stay under a size cap. This grants sibling images of an opened
//! file without granting the rest of its folder.

use std::fs;
use std::io::Read;
use std::os::unix::fs::OpenOptionsExt;
use std::path::{Component, Path, PathBuf};

use base64::Engine;
use serde::Serialize;
use tauri::State;

use super::files::{FileError, FileScope};

pub const MAX_IMAGE_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageData {
    pub mime: &'static str,
    pub base64: String,
}

fn mime_for(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_string_lossy().to_lowercase();
    Some(match extension.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "svg" => "image/svg+xml",
        _ => return None,
    })
}

/// Decodes %XX escapes in a Markdown image source.
fn percent_decode(src: &str) -> Option<String> {
    let bytes = src.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = std::str::from_utf8(bytes.get(i + 1..i + 3)?).ok()?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// Resolves `src` against `document`'s folder, refusing anything that leaves it.
pub fn resolve(document: &Path, src: &str) -> Result<PathBuf, FileError> {
    let outside = || FileError::OutsideScope(format!("{src} is outside the document's folder"));
    let src = src.split(['?', '#']).next().unwrap_or_default();
    if src.is_empty() || src.contains(':') {
        return Err(outside());
    }
    let decoded = percent_decode(src).ok_or_else(outside)?;
    let relative = Path::new(&decoded);
    if relative.is_absolute()
        || relative
            .components()
            .any(|c| !matches!(c, Component::Normal(_) | Component::CurDir))
    {
        return Err(outside());
    }
    let folder = document.parent().ok_or_else(outside)?;
    let folder = fs::canonicalize(folder).map_err(|_| outside())?;
    let candidate = folder.join(relative);
    let canonical = fs::canonicalize(&candidate).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            FileError::NotFound(format!("{src} was not found next to the document"))
        } else {
            FileError::Io(format!("{src}: {error}"))
        }
    })?;
    if !canonical.starts_with(&folder) {
        return Err(outside());
    }
    Ok(canonical)
}

pub fn read_image(document: &Path, src: &str) -> Result<ImageData, FileError> {
    // The base folder comes from a real document. A folder (for example a
    // scope root) or a path that does not exist would move the base up a
    // level, outside what the user granted.
    if !fs::metadata(document).is_ok_and(|m| m.is_file()) {
        return Err(FileError::OutsideScope(format!(
            "{} is not an open document",
            document.display()
        )));
    }
    let path = resolve(document, src)?;
    let mime = mime_for(&path)
        .ok_or_else(|| FileError::NotText(format!("{src} is not a supported image type")))?;
    let mut file = fs::OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NOFOLLOW)
        .open(&path)
        .map_err(|e| FileError::Io(format!("{src}: {e}")))?;
    let size = file.metadata().map(|m| m.len()).unwrap_or(0);
    if size > MAX_IMAGE_BYTES {
        return Err(FileError::TooLarge(format!(
            "{src} is larger than {} MB",
            MAX_IMAGE_BYTES / 1024 / 1024
        )));
    }
    let mut bytes = Vec::with_capacity(size as usize);
    file.read_to_end(&mut bytes)
        .map_err(|e| FileError::Io(format!("{src}: {e}")))?;
    Ok(ImageData {
        mime,
        base64: base64::engine::general_purpose::STANDARD.encode(bytes),
    })
}

#[tauri::command]
pub async fn read_document_image(
    scope: State<'_, FileScope>,
    document_path: String,
    src: String,
) -> Result<ImageData, FileError> {
    let document = scope.check(Path::new(&document_path))?;
    read_image(&document, &src)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn folder() -> (tempfile::TempDir, PathBuf) {
        let dir = tempfile::tempdir().unwrap();
        let docs = dir.path().join("docs");
        fs::create_dir_all(docs.join("img")).unwrap();
        fs::write(docs.join("a.md"), "# A").unwrap();
        fs::write(docs.join("img/dot.png"), [137, 80, 78, 71]).unwrap();
        fs::write(docs.join("my pic.jpg"), [255, 216]).unwrap();
        fs::write(docs.join("notes.txt"), "text").unwrap();
        fs::write(dir.path().join("secret.png"), [1, 2, 3]).unwrap();
        let document = docs.join("a.md");
        (dir, document)
    }

    #[test]
    fn reads_images_next_to_the_document() {
        let (_dir, document) = folder();
        let image = read_image(&document, "img/dot.png").unwrap();
        assert_eq!(image.mime, "image/png");
        assert_eq!(image.base64, "iVBORw==");
        assert_eq!(
            read_image(&document, "./my%20pic.jpg").unwrap().mime,
            "image/jpeg"
        );
        assert!(read_image(&document, "img/dot.png?v=2#x").is_ok());
    }

    #[test]
    fn refuses_paths_that_leave_the_folder() {
        let (dir, document) = folder();
        for src in [
            "../secret.png",
            "img/../../secret.png",
            "%2e%2e/secret.png",
            "/etc/passwd",
            "file:///etc/passwd",
            "https://example.com/a.png",
            "",
        ] {
            assert!(
                matches!(read_image(&document, src), Err(FileError::OutsideScope(_))),
                "{src} should be refused"
            );
        }
        std::os::unix::fs::symlink(
            dir.path().join("secret.png"),
            document.with_file_name("link.png"),
        )
        .unwrap();
        assert!(matches!(
            read_image(&document, "link.png"),
            Err(FileError::OutsideScope(_))
        ));
    }

    #[test]
    fn refuses_a_folder_or_missing_file_as_the_document() {
        let (dir, document) = folder();
        let docs = document.parent().unwrap();
        // Passing the folder itself would make its parent the image base.
        assert!(matches!(
            read_image(docs, "secret.png"),
            Err(FileError::OutsideScope(_))
        ));
        assert!(matches!(
            read_image(&docs.join("not-there.md"), "img/dot.png"),
            Err(FileError::OutsideScope(_))
        ));
        assert!(dir.path().join("secret.png").exists());
    }

    #[test]
    fn refuses_non_images_and_missing_files() {
        let (_dir, document) = folder();
        assert!(matches!(
            read_image(&document, "notes.txt"),
            Err(FileError::NotText(_))
        ));
        assert!(matches!(
            read_image(&document, "missing.png"),
            Err(FileError::NotFound(_))
        ));
    }
}
