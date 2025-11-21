#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cli_manager;

use cli_manager::{CliProcessManager, CliStatus};
use serde_json::json;
use tauri::menu::Menu;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone)]
pub struct AppState {
    pub manager: CliProcessManager,
}

#[tauri::command]
fn cli_get_status(state: tauri::State<AppState>) -> CliStatus {
    state.manager.status()
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            manager: CliProcessManager::new(),
        })
        .setup(|app| {
            build_menu(&app.handle())?;
            let dev_mode = cfg!(debug_assertions) || std::env::var("TAURI_DEV").is_ok();
            let app_handle = app.handle().clone();
            let manager = app.state::<AppState>().manager.clone();
            std::thread::spawn(move || {
                if let Err(err) = manager.start(app_handle.clone(), dev_mode) {
                    let _ = app_handle.emit(
                        "cli:error",
                        json!({"message": err.to_string()}),
                    );
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![cli_get_status])
        .on_menu_event(|_app_handle, _event| {
            // No menu items defined currently
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::ExitRequested { .. } => {
                    let app = app_handle.clone();
                    std::thread::spawn(move || {
                        if let Some(state) = app.try_state::<AppState>() {
                            let _ = state.manager.stop();
                        }
                        app.exit(0);
                    });
                }
                tauri::RunEvent::WindowEvent { event: tauri::WindowEvent::Destroyed, .. } => {
                    if app_handle.webview_windows().len() <= 1 {
                        let app = app_handle.clone();
                        std::thread::spawn(move || {
                            if let Some(state) = app.try_state::<AppState>() {
                                let _ = state.manager.stop();
                            }
                            app.exit(0);
                        });
                    }
                }
                _ => {}
            }
        });
}

fn build_menu(app: &AppHandle) -> tauri::Result<()> {
    // Minimal empty menu for now (Tauri v2 menu API differs from v1 roles).
    let menu = Menu::new(app)?;
    app.set_menu(menu)?;
    Ok(())
}
