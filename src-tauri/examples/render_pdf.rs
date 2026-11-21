//! Renders a standalone HTML file to PDF exactly as File → Export as PDF
//! does, with the same renderer discovery, flags, time limit, and atomic
//! write. The Fedora packaging job runs it against the distribution's
//! Chromium: `render_pdf <page.html> <out.pdf>`.

use std::fs;
use std::path::Path;
use std::process::ExitCode;

use re_edit_lib::{RENDER_TIMEOUT, export_pdf_to, find_renderer};

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let [_, page, out] = args.as_slice() else {
        eprintln!("usage: render_pdf <page.html> <out.pdf>");
        return ExitCode::from(2);
    };
    let Some(renderer) = find_renderer() else {
        eprintln!("no Chromium found on PATH or in RE_EDIT_CHROMIUM");
        return ExitCode::from(3);
    };
    let html = match fs::read_to_string(page) {
        Ok(html) => html,
        Err(error) => {
            eprintln!("{page}: {error}");
            return ExitCode::from(2);
        }
    };
    match export_pdf_to(&renderer, &html, Path::new(out), RENDER_TIMEOUT) {
        Ok(_) => {
            println!("{out} written with {}", renderer.display());
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("{error:?}");
            ExitCode::FAILURE
        }
    }
}
