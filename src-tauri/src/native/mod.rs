//! Native service boundary.
//!
//! Every operation the web view can request from the host goes through a
//! command in this module. Commands return serializable types that mirror
//! `src/services/native/types.ts` on the frontend.

use serde::Serialize;

pub mod files;

/// Static facts about the running application.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub platform: String,
}

impl AppInfo {
    fn current() -> Self {
        Self {
            name: env!("CARGO_PKG_NAME").to_owned(),
            version: env!("CARGO_PKG_VERSION").to_owned(),
            platform: std::env::consts::OS.to_owned(),
        }
    }
}

/// Returns the application name, version, and host platform.
#[tauri::command]
pub fn app_info() -> AppInfo {
    AppInfo::current()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_info_reports_package_metadata() {
        let info = app_info();
        assert_eq!(info.name, "re-edit");
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
        assert_eq!(info.platform, std::env::consts::OS);
    }

    #[test]
    fn app_info_serializes_camel_case() {
        let json = serde_json::to_value(app_info()).expect("serializes");
        assert!(json.get("name").is_some());
        assert!(json.get("version").is_some());
        assert!(json.get("platform").is_some());
    }
}
