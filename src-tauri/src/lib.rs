use tauri::menu::{
    AboutMetadata, MenuBuilder, MenuItemBuilder, SubmenuBuilder, HELP_SUBMENU_ID, WINDOW_SUBMENU_ID,
};
use tauri::Emitter;

const MENU_OPEN_SETTINGS: &str = "open_settings";
const MENU_OPEN_SHORTCUTS: &str = "open_shortcuts";

#[cfg(target_os = "macos")]
const SETTINGS_MENU_LABEL: &str = "Preferences...";
#[cfg(not(target_os = "macos"))]
const SETTINGS_MENU_LABEL: &str = "Settings...";

#[cfg(target_os = "macos")]
const SETTINGS_MENU_ACCELERATOR: &str = "Cmd+,";
#[cfg(not(target_os = "macos"))]
const SETTINGS_MENU_ACCELERATOR: &str = "Ctrl+,";

#[cfg(target_os = "macos")]
const SHORTCUTS_MENU_ACCELERATOR: &str = "Cmd+K";
#[cfg(not(target_os = "macos"))]
const SHORTCUTS_MENU_ACCELERATOR: &str = "Ctrl+K";

fn build_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<tauri::menu::Menu<R>> {
    let about_metadata = AboutMetadata {
        name: Some(app.package_info().name.clone()),
        version: Some(app.package_info().version.to_string()),
        copyright: app.config().bundle.copyright.clone(),
        authors: app.config().bundle.publisher.clone().map(|p| vec![p]),
        ..Default::default()
    };

    let settings_item = MenuItemBuilder::with_id(MENU_OPEN_SETTINGS, SETTINGS_MENU_LABEL)
        .accelerator(SETTINGS_MENU_ACCELERATOR)
        .build(app)?;
    let shortcuts_item = MenuItemBuilder::with_id(MENU_OPEN_SHORTCUTS, "Keyboard Shortcuts...")
        .accelerator(SHORTCUTS_MENU_ACCELERATOR)
        .build(app)?;

    #[cfg(target_os = "macos")]
    {
        let app_menu = SubmenuBuilder::new(app, app.package_info().name.clone())
            .about(Some(about_metadata.clone()))
            .separator()
            .item(&settings_item)
            .item(&shortcuts_item)
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .quit()
            .build()?;

        let file_menu = SubmenuBuilder::new(app, "File").close_window().build()?;

        let edit_menu = SubmenuBuilder::new(app, "Edit")
            .undo()
            .redo()
            .separator()
            .cut()
            .copy()
            .paste()
            .select_all()
            .build()?;

        let window_menu = SubmenuBuilder::with_id(app, WINDOW_SUBMENU_ID, "Window")
            .minimize()
            .maximize()
            .separator()
            .close_window()
            .build()?;

        let help_menu = SubmenuBuilder::with_id(app, HELP_SUBMENU_ID, "Help").build()?;

        window_menu.set_as_windows_menu_for_nsapp()?;
        help_menu.set_as_help_menu_for_nsapp()?;

        return MenuBuilder::new(app)
            .item(&app_menu)
            .item(&file_menu)
            .item(&edit_menu)
            .item(&window_menu)
            .item(&help_menu)
            .build();
    }

    #[cfg(not(target_os = "macos"))]
    {
        #[cfg(any(
            target_os = "linux",
            target_os = "dragonfly",
            target_os = "freebsd",
            target_os = "netbsd",
            target_os = "openbsd"
        ))]
        let file_menu = SubmenuBuilder::new(app, "File")
            .item(&settings_item)
            .item(&shortcuts_item)
            .build()?;

        #[cfg(not(any(
            target_os = "linux",
            target_os = "dragonfly",
            target_os = "freebsd",
            target_os = "netbsd",
            target_os = "openbsd"
        )))]
        let file_menu = SubmenuBuilder::new(app, "File")
            .item(&settings_item)
            .item(&shortcuts_item)
            .separator()
            .close_window()
            .quit()
            .build()?;

        let edit_menu = SubmenuBuilder::new(app, "Edit")
            .undo()
            .redo()
            .separator()
            .cut()
            .copy()
            .paste()
            .select_all()
            .build()?;

        let help_menu = SubmenuBuilder::new(app, "Help")
            .about(Some(about_metadata))
            .build()?;

        return MenuBuilder::new(app)
            .item(&file_menu)
            .item(&edit_menu)
            .item(&help_menu)
            .build();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let menu = build_menu(app.handle())?;
            app.set_menu(menu)?;

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            let event_id = event.id().as_ref();
            match event_id {
                MENU_OPEN_SETTINGS => {
                    let _ = app.emit("menu:open-settings", ());
                }
                MENU_OPEN_SHORTCUTS => {
                    let _ = app.emit("menu:open-shortcuts", ());
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
