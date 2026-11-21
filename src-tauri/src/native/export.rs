//! Direct PDF export (REQ-011): standalone HTML rendered by headless Chromium.
//!
//! The renderer runs with its sandbox on, a throwaway profile in a private
//! temporary folder, no network (an unreachable proxy), no extensions, and a
//! time limit. The destination is written atomically, and only after the
//! renderer produced a PDF, so a cancel or failure leaves it untouched.

use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Runtime, State};
use tauri_plugin_dialog::DialogExt;

use super::files::{FileError, FileScope, write_bytes};

/// Longest a PDF render may take before the renderer is stopped.
pub const RENDER_TIMEOUT: Duration = Duration::from_secs(60);
/// Overrides renderer discovery, for example with a Chromium outside PATH.
pub const RENDERER_ENV: &str = "RE_EDIT_CHROMIUM";
const RENDERERS: &[&str] = &[
    "chromium-browser",
    "chromium",
    "google-chrome-stable",
    "google-chrome",
];

/// The Chromium-based browser that renders PDFs, if one is installed.
pub fn find_renderer() -> Option<PathBuf> {
    if let Some(path) = env::var_os(RENDERER_ENV).map(PathBuf::from) {
        return path.is_file().then_some(path);
    }
    let search = env::var_os("PATH")?;
    RENDERERS.iter().find_map(|name| {
        env::split_paths(&search)
            .map(|dir| dir.join(name))
            .find(|candidate| candidate.is_file())
    })
}

/// Renders standalone HTML to PDF bytes with `renderer`.
pub fn render_pdf(renderer: &Path, html: &str, timeout: Duration) -> Result<Vec<u8>, FileError> {
    let failed = |message: String| FileError::RendererFailed(message);
    // tempfile creates the folder owner-only (0700).
    let work = tempfile::Builder::new()
        .prefix("re-edit-export-")
        .tempdir()
        .map_err(|e| failed(format!("temporary folder: {e}")))?;
    let page = work.path().join("document.html");
    let output = work.path().join("document.pdf");
    let profile = work.path().join("profile");
    fs::File::create(&page)
        .and_then(|mut file| file.write_all(html.as_bytes()))
        .map_err(|e| failed(format!("temporary page: {e}")))?;

    let mut child = Command::new(renderer)
        .args([
            "--headless",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--disable-sync",
            "--disable-background-networking",
            "--disable-component-update",
            "--disable-default-apps",
            "--mute-audio",
            // Exports embed everything they show; nothing may load from the network.
            "--proxy-server=127.0.0.1:9",
            "--proxy-bypass-list=<-loopback>",
            "--no-pdf-header-footer",
        ])
        .arg(format!("--user-data-dir={}", profile.display()))
        .arg(format!("--print-to-pdf={}", output.display()))
        .arg(format!("file://{}", page.display()))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| failed(format!("{}: {e}", renderer.display())))?;

    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() >= timeout => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(failed(format!(
                    "the renderer did not finish within {} seconds",
                    timeout.as_secs()
                )));
            }
            Ok(None) => thread::sleep(Duration::from_millis(50)),
            Err(e) => return Err(failed(e.to_string())),
        }
    };
    if !status.success() {
        return Err(failed(format!("the renderer exited with {status}")));
    }
    let bytes = fs::read(&output).map_err(|_| failed("the renderer wrote no PDF".into()))?;
    if !bytes.starts_with(b"%PDF-") {
        return Err(failed("the renderer output is not a PDF".into()));
    }
    Ok(bytes)
}

/// Renders `html` and writes the PDF to `target` only when rendering worked.
pub fn export_pdf_to(
    renderer: &Path,
    html: &str,
    target: &Path,
    timeout: Duration,
) -> Result<u64, FileError> {
    let bytes = render_pdf(renderer, html, timeout)?;
    write_bytes(target, &bytes, None)
}

/// Export destination chooser shared by HTML and PDF. The extension is
/// added when the name has none, and the path joins the file scope.
#[tauri::command]
pub async fn pick_export_path<R: Runtime>(
    app: AppHandle<R>,
    scope: State<'_, FileScope>,
    suggested_name: String,
    format: String,
) -> Result<Option<String>, FileError> {
    let (name, extension) = match format.as_str() {
        "pdf" => ("PDF", "pdf"),
        _ => ("HTML", "html"),
    };
    let Some(path) = app
        .dialog()
        .file()
        .set_file_name(&suggested_name)
        .add_filter(name, &[extension])
        .blocking_save_file()
        .and_then(|path| path.into_path().ok())
    else {
        return Ok(None);
    };
    let has_extension = path.extension().is_some_and(|e| {
        e.eq_ignore_ascii_case(extension) || (extension == "html" && e.eq_ignore_ascii_case("htm"))
    });
    let path = if has_extension {
        path
    } else {
        let mut named = path.into_os_string();
        named.push(format!(".{extension}"));
        PathBuf::from(named)
    };
    Ok(Some(scope.allow(&path)?.to_string_lossy().into_owned()))
}

/// Renders standalone HTML to a PDF at `path`, a destination from
/// [`pick_export_path`]. Returns the file's modification time.
#[tauri::command]
pub async fn export_pdf(
    scope: State<'_, FileScope>,
    path: String,
    html: String,
) -> Result<u64, FileError> {
    let target = scope.check(Path::new(&path))?;
    let renderer = find_renderer().ok_or_else(|| {
        FileError::RendererMissing(
            "install Chromium (sudo dnf install chromium) to export PDF".into(),
        )
    })?;
    tauri::async_runtime::spawn_blocking(move || {
        export_pdf_to(&renderer, &html, &target, RENDER_TIMEOUT)
    })
    .await
    .map_err(|e| FileError::RendererFailed(e.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    /// A stand-in renderer: a shell script that receives Chromium's flags.
    fn fake_renderer(dir: &Path, body: &str) -> PathBuf {
        let path = dir.join("fake-chromium");
        fs::write(&path, format!("#!/bin/sh\n{body}\n")).unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o755)).unwrap();
        path
    }

    const WRITES_PDF: &str = r#"for arg in "$@"; do case "$arg" in --print-to-pdf=*) printf '%%PDF-1.7 fake' > "${arg#--print-to-pdf=}";; esac; done"#;

    #[test]
    fn writes_the_pdf_only_after_a_successful_render() {
        let dir = tempfile::tempdir().unwrap();
        let renderer = fake_renderer(dir.path(), WRITES_PDF);
        let target = dir.path().join("out.pdf");
        export_pdf_to(&renderer, "<p>hi</p>", &target, Duration::from_secs(5)).unwrap();
        assert!(fs::read(&target).unwrap().starts_with(b"%PDF-"));
    }

    #[test]
    fn passes_a_private_profile_and_no_network() {
        let dir = tempfile::tempdir().unwrap();
        let log = dir.path().join("args");
        let renderer = fake_renderer(
            dir.path(),
            &format!("printf '%s\\n' \"$@\" > {}\n{WRITES_PDF}", log.display()),
        );
        render_pdf(&renderer, "<p>hi</p>", Duration::from_secs(5)).unwrap();
        let args = fs::read_to_string(log).unwrap();
        assert!(args.contains("--headless"));
        assert!(args.contains("--user-data-dir="));
        assert!(args.contains("--proxy-server=127.0.0.1:9"));
        assert!(!args.contains("--no-sandbox"));
        assert!(
            args.lines()
                .any(|a| a.starts_with("file://") && a.ends_with("document.html"))
        );
    }

    #[test]
    fn failures_leave_the_destination_untouched() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("keep.pdf");
        fs::write(&target, "original").unwrap();
        for body in [
            "exit 3",
            "exit 0",
            "for arg in \"$@\"; do case \"$arg\" in --print-to-pdf=*) echo nope > \"${arg#--print-to-pdf=}\";; esac; done",
        ] {
            let renderer = fake_renderer(dir.path(), body);
            let result = export_pdf_to(&renderer, "<p>x</p>", &target, Duration::from_secs(5));
            assert!(
                matches!(result, Err(FileError::RendererFailed(_))),
                "{body}: {result:?}"
            );
            assert_eq!(fs::read_to_string(&target).unwrap(), "original");
        }
    }

    #[test]
    fn stops_a_renderer_that_runs_too_long() {
        let dir = tempfile::tempdir().unwrap();
        let renderer = fake_renderer(dir.path(), "exec sleep 30");
        let target = dir.path().join("slow.pdf");
        let started = Instant::now();
        let result = export_pdf_to(&renderer, "<p>x</p>", &target, Duration::from_millis(300));
        assert!(matches!(result, Err(FileError::RendererFailed(_))));
        assert!(started.elapsed() < Duration::from_secs(5));
        assert!(!target.exists());
    }

    /// Manual check with a real browser:
    /// `RE_EDIT_CHROMIUM=/path/to/chrome RE_EDIT_EXPORT_SAMPLE=page.html
    /// RE_EDIT_EXPORT_OUT=out.pdf cargo test -- --ignored renders_a_real_pdf`
    #[test]
    #[ignore = "needs Chromium and a sample page"]
    fn renders_a_real_pdf() {
        let renderer = find_renderer().expect("no Chromium found");
        let html = fs::read_to_string(env::var("RE_EDIT_EXPORT_SAMPLE").unwrap()).unwrap();
        let target = PathBuf::from(env::var("RE_EDIT_EXPORT_OUT").unwrap());
        export_pdf_to(&renderer, &html, &target, RENDER_TIMEOUT).unwrap();
        assert!(fs::read(&target).unwrap().starts_with(b"%PDF-"));
    }

    #[test]
    fn leaves_no_temporary_files() {
        let dir = tempfile::tempdir().unwrap();
        let log = dir.path().join("page");
        let renderer = fake_renderer(
            dir.path(),
            &format!(
                "for arg in \"$@\"; do case \"$arg\" in file://*) echo \"${{arg#file://}}\" > {};; esac; done\n{WRITES_PDF}",
                log.display()
            ),
        );
        render_pdf(&renderer, "<p>x</p>", Duration::from_secs(5)).unwrap();
        let page = PathBuf::from(fs::read_to_string(log).unwrap().trim());
        assert!(!page.exists());
        assert!(!page.parent().unwrap().exists());
    }
}
