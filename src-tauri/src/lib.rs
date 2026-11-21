mod native;

use tauri::Manager;

use native::files::{self, FileScope};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let store = app
                .path()
                .app_data_dir()
                .ok()
                .map(|dir| dir.join("file-scope.json"));
            app.manage(FileScope::load(store));
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            native::app_info,
            files::pick_open_file,
            files::pick_folder,
            files::pick_save_path,
            files::read_text_file,
            files::write_text_file,
            files::list_folder,
            native::images::read_document_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running re-edit");
}
