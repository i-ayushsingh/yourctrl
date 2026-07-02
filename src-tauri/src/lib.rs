use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;

// ----------------------------------------------------------------------------
// Updater module
// ----------------------------------------------------------------------------

#[cfg(desktop)]
mod app_updates {
    use std::sync::Mutex;
    use serde::Serialize;
    use tauri::{ipc::Channel, AppHandle, State};
    use tauri_plugin_updater::{Update, UpdaterExt};

    #[derive(Debug, thiserror::Error)]
    pub enum Error {
        #[error(transparent)]
        Updater(#[from] tauri_plugin_updater::Error),
        #[error("there is no pending update")]
        NoPendingUpdate,
    }

    impl Serialize for Error {
        fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
        where
            S: serde::Serializer,
        {
            serializer.serialize_str(self.to_string().as_str())
        }
    }

    type Result<T> = std::result::Result<T, Error>;

    #[derive(Clone, Serialize)]
    #[serde(tag = "event", content = "data")]
    pub enum DownloadEvent {
        #[serde(rename_all = "camelCase")]
        Started { content_length: Option<u64> },
        #[serde(rename_all = "camelCase")]
        Progress { chunk_length: usize },
        Finished,
    }

    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    pub struct UpdateMetadata {
        pub version: String,
        pub current_version: String,
        pub body: Option<String>,
    }

    pub struct PendingUpdate(pub Mutex<Option<Update>>);

    #[tauri::command]
    pub async fn fetch_update(
        app: AppHandle,
        pending_update: State<'_, PendingUpdate>,
    ) -> Result<Option<UpdateMetadata>> {
        let update = app
            .updater_builder()
            .build()?
            .check()
            .await?;

        let update_metadata = update.as_ref().map(|update| UpdateMetadata {
            version: update.version.clone(),
            current_version: update.current_version.clone(),
            body: update.body.clone(),
        });

        *pending_update.0.lock().unwrap() = update;

        Ok(update_metadata)
    }

    #[tauri::command]
    pub async fn install_update(
        pending_update: State<'_, PendingUpdate>,
        on_event: Channel<DownloadEvent>,
    ) -> Result<()> {
        let Some(update) = pending_update.0.lock().unwrap().take() else {
            return Err(Error::NoPendingUpdate);
        };

        let mut started = false;

        update
            .download_and_install(
                |chunk_length, content_length| {
                    if !started {
                        let _ = on_event.send(DownloadEvent::Started { content_length });
                        started = true;
                    }
                    let _ = on_event.send(DownloadEvent::Progress { chunk_length });
                },
                || {
                    let _ = on_event.send(DownloadEvent::Finished);
                },
            )
            .await?;

        Ok(())
    }
}

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------

#[derive(Default, Clone, Serialize)]
struct ActiveApp {
    app_name: Option<String>,
    process_name: String,
}

#[cfg(windows)]
fn set_autostart(enabled: bool) {
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_str = exe_path.to_string_lossy();
        if enabled {
            let _ = std::process::Command::new("reg")
                .args(&[
                    "add",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "/v",
                    "YourCtrl",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &format!("\"{}\" --minimized", exe_str),
                    "/f",
                ])
                .output();
        } else {
            let _ = std::process::Command::new("reg")
                .args(&[
                    "delete",
                    "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                    "/v",
                    "YourCtrl",
                    "/f",
                ])
                .output();
        }
    }
}

#[derive(Serialize, Deserialize)]
struct Settings {
    #[serde(default = "default_theme")]
    theme: String,
    #[serde(default)]
    excluded: Vec<String>,
    #[serde(default = "default_hold_ms")]
    hold_ms: u64,
    #[serde(default = "default_trigger_type")]
    trigger_type: String,
    #[serde(default)]
    autostart: bool,
    #[serde(default)]
    start_minimized: bool,
    #[serde(default)]
    disable_unsupported_trigger: bool,
    #[serde(default = "default_popover_position")]
    popover_position: String,
    #[serde(default = "default_popover_opacity")]
    popover_opacity: f64,
    #[serde(default = "default_popover_scale")]
    popover_scale: f64,
    #[serde(default = "default_global_hotkey")]
    global_hotkey: String,
    #[serde(default = "default_search_scope")]
    search_scope: String,
    #[serde(default = "default_auto_focus_search")]
    auto_focus_search: bool,
    #[serde(default = "default_show_shortcut_count_badge")]
    show_shortcut_count_badge: bool,
    #[serde(default = "default_auto_update")]
    auto_update: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            excluded: Vec::new(),
            hold_ms: default_hold_ms(),
            trigger_type: default_trigger_type(),
            autostart: false,
            start_minimized: false,
            disable_unsupported_trigger: false,
            popover_position: default_popover_position(),
            popover_opacity: default_popover_opacity(),
            popover_scale: default_popover_scale(),
            global_hotkey: default_global_hotkey(),
            search_scope: default_search_scope(),
            auto_focus_search: default_auto_focus_search(),
            show_shortcut_count_badge: default_show_shortcut_count_badge(),
            auto_update: default_auto_update(),
        }
    }
}

fn default_theme() -> String {
    "system".into()
}
fn default_hold_ms() -> u64 {
    700
}
fn default_trigger_type() -> String {
    "hold".into()
}
fn default_popover_position() -> String {
    "Center".into()
}
fn default_popover_opacity() -> f64 {
    0.9
}
fn default_popover_scale() -> f64 {
    1.0
}
fn default_global_hotkey() -> String {
    "Ctrl+Shift+Y".into()
}
fn default_search_scope() -> String {
    "all".into()
}
fn default_auto_focus_search() -> bool {
    true
}
fn default_show_shortcut_count_badge() -> bool {
    true
}
fn default_auto_update() -> bool {
    true
}

struct AppState {
    db_pool: Pool<SqliteConnectionManager>,
    /// lowercase process basename -> app display name
    process_map: Mutex<HashMap<String, String>>,
    excluded: Mutex<HashSet<String>>,
    active: Mutex<ActiveApp>,
    hold_ms: AtomicU64,
    trigger_type: Mutex<String>,
    settings_path: Mutex<PathBuf>,
    disable_unsupported_trigger: std::sync::atomic::AtomicBool,
    popover_position: Mutex<String>,
    popover_opacity: Mutex<f64>,
    popover_scale: Mutex<f64>,
    global_hotkey: Mutex<String>,
    search_scope: Mutex<String>,
}

// ----------------------------------------------------------------------------
// Settings persistence (JSON file in the app data dir)
// ----------------------------------------------------------------------------

fn read_settings(path: &PathBuf) -> Settings {
    let mut settings: Settings = std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    // Sanitize settings to prevent corrupted/zeroed files from breaking the app.
    if settings.hold_ms < 150 {
        settings.hold_ms = default_hold_ms();
    }
    if settings.trigger_type.is_empty() {
        settings.trigger_type = default_trigger_type();
    }
    if settings.popover_position.is_empty() {
        settings.popover_position = default_popover_position();
    }
    if settings.popover_opacity < 0.1 || settings.popover_opacity > 1.0 {
        settings.popover_opacity = default_popover_opacity();
    }
    if settings.popover_scale < 0.5 || settings.popover_scale > 2.0 {
        settings.popover_scale = default_popover_scale();
    }
    if settings.global_hotkey.is_empty() {
        settings.global_hotkey = default_global_hotkey();
    }
    if settings.search_scope.is_empty() {
        settings.search_scope = default_search_scope();
    }
    if settings.theme.is_empty() {
        settings.theme = default_theme();
    }

    settings
}

fn write_settings(path: &PathBuf, settings: &Settings) {
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(settings) {
        let _ = std::fs::write(path, json);
    }
}

// ----------------------------------------------------------------------------
// Foreground-window / active-key detection (Windows)
// ----------------------------------------------------------------------------

/// Resolve a PID to its lowercased executable basename (e.g. "chrome.exe").
#[cfg(windows)]
fn process_name_of_pid(pid: u32) -> Option<String> {
    use windows::core::PWSTR;
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };

    if pid == 0 {
        return None;
    }
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let mut buf = [0u16; 512];
        let mut size = buf.len() as u32;
        let res =
            QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, PWSTR(buf.as_mut_ptr()), &mut size);
        let _ = CloseHandle(handle);
        res.ok()?;
        let path = String::from_utf16_lossy(&buf[..size as usize]);
        let base = path
            .rsplit(|c| c == '\\' || c == '/')
            .next()
            .unwrap_or(&path)
            .to_lowercase();
        Some(base)
    }
}

/// UWP / packaged apps (Calculator, Settings, Photos, Snipping Tool, Store, …)
/// are hosted by these processes; the real app runs in a child window with a
/// different PID. We have to unwrap them to detect the real foreground app.
#[cfg(windows)]
fn is_ui_host(name: &str) -> bool {
    matches!(
        name,
        "applicationframehost.exe" | "windowsapprunner.exe"
    )
}

#[cfg(windows)]
struct ChildScan {
    host_pid: u32,
    found_pid: u32,
}

#[cfg(windows)]
unsafe extern "system" fn scan_child_proc(
    hwnd: windows::Win32::Foundation::HWND,
    lparam: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::BOOL {
    use windows::Win32::Foundation::BOOL;
    use windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId;

    let scan = &mut *(lparam.0 as *mut ChildScan);
    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    if pid != 0 && pid != scan.host_pid {
        scan.found_pid = pid;
        return BOOL(0); // stop enumerating — we found the hosted app
    }
    BOOL(1) // keep going
}

#[cfg(windows)]
fn foreground_process_name() -> Option<String> {
    use windows::Win32::Foundation::LPARAM;
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumChildWindows, GetForegroundWindow, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return None;
        }
        let mut name = process_name_of_pid(pid)?;

        // Unwrap UWP host processes to the actual hosted application.
        if is_ui_host(&name) {
            let mut scan = ChildScan {
                host_pid: pid,
                found_pid: 0,
            };
            let _ = EnumChildWindows(
                Some(hwnd),
                Some(scan_child_proc),
                LPARAM(&mut scan as *mut _ as isize),
            );
            if let Some(child) = process_name_of_pid(scan.found_pid) {
                name = child;
            }
        }

        Some(name)
    }
}

#[cfg(not(windows))]
fn foreground_process_name() -> Option<String> {
    None
}

#[cfg(windows)]
fn key_down(vk: i32) -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::GetAsyncKeyState;
    unsafe { (GetAsyncKeyState(vk) as u16 & 0x8000) != 0 }
}

#[cfg(windows)]
fn ctrl_pressed() -> bool {
    key_down(0x11) // VK_CONTROL
}

#[cfg(windows)]
fn other_key_down() -> bool {
    for vk in 0x07..=0xFEi32 {
        if vk == 0x11 || vk == 0xA2 || vk == 0xA3 {
            continue;
        }
        if key_down(vk) {
            return true;
        }
    }
    false
}

#[cfg(windows)]
fn check_hotkey_pressed(hotkey_str: &str) -> bool {
    if hotkey_str.is_empty() {
        return false;
    }
    for part in hotkey_str.split('+') {
        let vk = match part.trim().to_lowercase().as_str() {
            "ctrl" => 0x11,
            "shift" => 0x10,
            "alt" => 0x12,
            "win" => 0x5B, // Left Win
            "a" => 0x41, "b" => 0x42, "c" => 0x43, "d" => 0x44, "e" => 0x45,
            "f" => 0x46, "g" => 0x47, "h" => 0x48, "i" => 0x49, "j" => 0x4A,
            "k" => 0x4B, "l" => 0x4C, "m" => 0x4D, "n" => 0x4E, "o" => 0x4F,
            "p" => 0x50, "q" => 0x51, "r" => 0x52, "s" => 0x53, "t" => 0x54,
            "u" => 0x55, "v" => 0x56, "w" => 0x57, "x" => 0x58, "y" => 0x59,
            "z" => 0x5A,
            _ => return false,
        };
        if !key_down(vk) {
            return false;
        }
    }
    true
}

#[cfg(windows)]
fn cursor_position() -> Option<(i32, i32)> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
    let mut pt = POINT::default();
    if unsafe { GetCursorPos(&mut pt).is_ok() } {
        Some((pt.x, pt.y))
    } else {
        None
    }
}

/// Returns true if the foreground window is running in exclusive fullscreen mode
/// (covers the entire primary monitor and has WS_EX_TOPMOST style).
/// This is used to suppress Ctrl-hold triggers inside fullscreen games.
#[cfg(windows)]
fn foreground_is_fullscreen() -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowLongW, GetWindowRect,
        GWL_EXSTYLE, WS_EX_TOPMOST,
    };
    use windows::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTOPRIMARY};

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return false;
        }

        // Check WS_EX_TOPMOST (exclusive fullscreen windows always set this)
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        if (ex_style & WS_EX_TOPMOST.0) == 0 {
            return false;
        }

        // Check if the window rect covers the monitor exactly
        let mut wr = windows::Win32::Foundation::RECT::default();
        if GetWindowRect(hwnd, &mut wr).is_err() {
            return false;
        }

        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTOPRIMARY);
        let mut mi = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if GetMonitorInfoW(monitor, &mut mi).as_bool() {
            let mr = mi.rcMonitor;
            return wr.left <= mr.left && wr.top <= mr.top
                && wr.right >= mr.right && wr.bottom >= mr.bottom;
        }
        false
    }
}

#[cfg(not(windows))]
fn foreground_is_fullscreen() -> bool { false }

/// Attempt to register the global hotkey with Windows to detect conflicts.
/// Returns Ok(true) if registered successfully, Ok(false) if already claimed by another app.
#[cfg(windows)]
fn check_hotkey_conflict(hotkey_str: &str) -> bool {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        RegisterHotKey, UnregisterHotKey, MOD_CONTROL, MOD_SHIFT,
    };
    // Parse the hotkey string to get modifiers and key
    let mut modifiers = 0u32;
    let mut vk: u16 = 0;
    for part in hotkey_str.split('+') {
        match part.trim().to_lowercase().as_str() {
            "ctrl"  => modifiers |= MOD_CONTROL.0,
            "shift" => modifiers |= MOD_SHIFT.0,
            s if s.len() == 1 => {
                if let Some(c) = s.chars().next() {
                    vk = (c.to_ascii_uppercase() as u8) as u16;
                }
            }
            _ => {}
        }
    }
    if vk == 0 { return false; }
    unsafe {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::Input::KeyboardAndMouse::HOT_KEY_MODIFIERS;
        let ok = RegisterHotKey(
            Some(HWND(std::ptr::null_mut())),
            0x1337,
            HOT_KEY_MODIFIERS(modifiers),
            vk as u32,
        ).is_ok();
        if ok {
            // Immediately unregister — we only wanted to probe availability
            let _ = UnregisterHotKey(Some(HWND(std::ptr::null_mut())), 0x1337);
        }
        !ok // conflict = registration failed
    }
}

#[cfg(not(windows))]
fn check_hotkey_conflict(_hotkey_str: &str) -> bool { false }

fn configure_popover_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("popover") {
        let (position_pref, scale_pref) = {
            let state = app.state::<AppState>();
            let pos = state.popover_position.lock().unwrap().clone();
            let scale = *state.popover_scale.lock().unwrap();
            (pos, scale)
        };

        // Resize first
        let _ = win.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 440.0 * scale_pref,
            height: 520.0 * scale_pref,
        }));

        // Position second
        if position_pref == "Center" {
            let _ = win.center();
        } else if let Ok(Some(monitor)) = win.current_monitor() {
            let m_size = monitor.size();
            let scale_factor = monitor.scale_factor();
            
            let w_width = (440.0 * scale_pref * scale_factor) as i32;
            let w_height = (520.0 * scale_pref * scale_factor) as i32;
            
            let m_width = m_size.width as i32;
            let m_height = m_size.height as i32;

            let pos = match position_pref.as_str() {
                "Top-Center" => {
                    let x = (m_width - w_width) / 2;
                    let y = (50.0 * scale_factor) as i32;
                    Some((x, y))
                }
                "Bottom-Center" => {
                    let x = (m_width - w_width) / 2;
                    let y = m_height - w_height - (50.0 * scale_factor) as i32;
                    Some((x, y))
                }
                "Near Cursor" => {
                    if let Some((cx, cy)) = cursor_position() {
                        let x = (cx - w_width / 2).clamp(0, m_width - w_width);
                        let y = (cy - w_height / 2).clamp(0, m_height - w_height);
                        Some((x, y))
                    } else {
                        None
                    }
                }
                _ => None,
            };

            if let Some((x, y)) = pos {
                let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
            } else {
                let _ = win.center();
            }
        } else {
            let _ = win.center();
        }
    }
}

// ----------------------------------------------------------------------------
// Popover triggering
// ----------------------------------------------------------------------------
fn trigger_popover(app: &tauri::AppHandle) {
    let proc = foreground_process_name().unwrap_or_default();
    let state = app.state::<AppState>();
    let app_name = state.process_map.lock().unwrap().get(&proc).cloned();

    // If the setting is on and the app is unsupported, do not trigger the popover.
    // Except for explorer.exe which represents the desktop (we always want to allow the desktop popover).
    if app_name.is_none() && proc != "explorer.exe" && state.disable_unsupported_trigger.load(Ordering::Relaxed) {
        return;
    }

    // Respect the per-app exclusion list.
    if let Some(ref name) = app_name {
        if state.excluded.lock().unwrap().contains(name) {
            return;
        }
    }

    {
        let mut active = state.active.lock().unwrap();
        active.app_name = app_name.clone();
        active.process_name = proc.clone();
    }

    let _ = app.emit(
        "active-app-changed",
        ActiveApp {
            app_name: app_name.clone(),
            process_name: proc.clone(),
        },
    );

    // Give frontend a tiny slice of time (25ms) to receive event and re-render
    // before making the window visible, preventing any flash of previous state.
    std::thread::sleep(std::time::Duration::from_millis(25));

    configure_popover_window(app);
    if let Some(win) = app.get_webview_window("popover") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

fn trigger_popover_desktop(app: &tauri::AppHandle) {
    let state = app.state::<AppState>();
    {
        let mut active = state.active.lock().unwrap();
        active.app_name = None;
        active.process_name = "explorer.exe".to_string();
    }

    let _ = app.emit(
        "active-app-changed",
        ActiveApp {
            app_name: None,
            process_name: "explorer.exe".to_string(),
        },
    );

    // Give frontend a tiny slice of time (25ms) to receive event and re-render
    // before making the window visible, preventing any flash of previous state.
    std::thread::sleep(std::time::Duration::from_millis(25));

    configure_popover_window(app);
    if let Some(win) = app.get_webview_window("popover") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[cfg(windows)]
fn spawn_detection(app: tauri::AppHandle) {
    use std::time::{Duration, Instant};
    std::thread::spawn(move || {
        let mut start: Option<Instant> = None;
        let mut latched = false;
        
        let mut last_ctrl_state = false;
        let mut press_count = 0;
        let mut last_press_time = Instant::now();

        let mut popover_shown_by_hold = false;
        let mut waiting_for_release_after_hold = false;

        let mut last_hotkey_state = false;

        let mut sleep_ms = 60;
        loop {
            std::thread::sleep(Duration::from_millis(sleep_ms));

            // 1. Read settings dynamically (trigger_type is ignored now)
            let (hold_ms, global_hotkey) = {
                let state = app.state::<AppState>();
                let hold = state.hold_ms.load(Ordering::Relaxed);
                let gh = state.global_hotkey.lock().unwrap().clone();
                (hold, gh)
            };

            // 1b. Skip all triggers when the foreground app is in exclusive fullscreen
            //     (prevents interrupting fullscreen games and media players).
            if foreground_is_fullscreen() {
                sleep_ms = 60;
                continue;
            }

            // 2. Check Global Hotkey
            let hotkey_pressed = check_hotkey_pressed(&global_hotkey);
            if hotkey_pressed && !last_hotkey_state {
                if let Some(main_win) = app.get_webview_window("main") {
                    if main_win.is_visible().unwrap_or(false) {
                        let _ = main_win.hide();
                    } else {
                        let _ = main_win.show();
                        let _ = main_win.set_focus();
                    }
                }
            }
            last_hotkey_state = hotkey_pressed;

            // 3. Check Popover Visibility
            let popover_visible = if let Some(win) = app.get_webview_window("popover") {
                win.is_visible().unwrap_or(false)
            } else {
                false
            };

            if !popover_visible {
                popover_shown_by_hold = false;
                waiting_for_release_after_hold = false;
            }

            // 4. Check Trigger Key states (always Ctrl 0x11)
            let ctrl = ctrl_pressed();
            let other = other_key_down();

            // 5. Clicks tracking (Double Press Ctrl always triggers Desktop Popover)
            if ctrl && !last_ctrl_state && !other {
                let now = Instant::now();
                if now.duration_since(last_press_time) < Duration::from_millis(350) {
                    press_count += 1;
                } else {
                    press_count = 1;
                }
                last_press_time = now;

                if press_count == 2 {
                    press_count = 0;
                    if let Some(win) = app.get_webview_window("popover") {
                        if win.is_visible().unwrap_or(false) {
                            let _ = win.hide();
                        } else {
                            trigger_popover_desktop(&app);
                        }
                    }
                }
            }

            // 6. Hold detection (always active, triggers Active App Popover)
            if popover_visible {
                if waiting_for_release_after_hold {
                    if !ctrl {
                        waiting_for_release_after_hold = false;
                        popover_shown_by_hold = true;
                    }
                } else if popover_shown_by_hold {
                    if ctrl && !last_ctrl_state {
                        if let Some(win) = app.get_webview_window("popover") {
                            let _ = win.hide();
                        }
                        popover_shown_by_hold = false;
                        last_ctrl_state = true;
                        std::thread::sleep(Duration::from_millis(300));
                        continue;
                    }
                }
            } else {
                if ctrl && !other {
                    match start {
                        None => start = Some(Instant::now()),
                        Some(t) => {
                            let hold = Duration::from_millis(hold_ms);
                            if !latched && t.elapsed() >= hold {
                                latched = true;
                                trigger_popover(&app);
                                waiting_for_release_after_hold = true;
                            }
                        }
                    }
                } else {
                    start = None;
                    if !ctrl {
                        latched = false;
                    }
                }
            }

            last_ctrl_state = ctrl;

            if ctrl || other || hotkey_pressed || popover_visible {
                sleep_ms = 30;
            } else {
                sleep_ms = 60;
            }
        }
    });
}

#[cfg(not(windows))]
fn spawn_detection(_app: tauri::AppHandle) {}

// ----------------------------------------------------------------------------
// Commands
// ----------------------------------------------------------------------------

#[tauri::command]
fn show_popover(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("popover")
        .ok_or_else(|| "popover window not found".to_string())?;
    configure_popover_window(&app);
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn hide_popover(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("popover") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn focus_main(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(windows)]
unsafe extern "system" fn enum_windows_proc(
    hwnd: windows::Win32::Foundation::HWND,
    lparam: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::BOOL {
    use windows::Win32::Foundation::BOOL;
    use windows::Win32::UI::WindowsAndMessaging::{IsWindowVisible, GetWindowThreadProcessId};

    let list = &mut *(lparam.0 as *mut Vec<u32>);
    if IsWindowVisible(hwnd).as_bool() {
        let mut pid = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid != 0 && !list.contains(&pid) {
            list.push(pid);
        }
    }
    BOOL(1)
}

#[tauri::command]
fn get_running_apps(state: tauri::State<AppState>) -> Vec<String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::LPARAM;
        use windows::Win32::UI::WindowsAndMessaging::EnumWindows;
        use std::collections::HashSet;

        let mut pids = Vec::new();
        unsafe {
            let _ = EnumWindows(
                Some(enum_windows_proc),
                LPARAM(&mut pids as *mut _ as isize),
            );
        }

        let mut running_apps = HashSet::new();
        let process_map = state.process_map.lock().unwrap();

        for pid in pids {
            if let Some(proc_name) = process_name_of_pid(pid) {
                if let Some(app_name) = process_map.get(&proc_name.to_lowercase()) {
                    if app_name.to_lowercase() != "yourctrl" {
                        running_apps.insert(app_name.clone());
                    }
                }
            }
        }

        let mut res: Vec<String> = running_apps.into_iter().collect();
        res.sort();
        res
    }
    #[cfg(not(windows))]
    {
        Vec::new()
    }
}

#[tauri::command]
fn get_active_app(state: tauri::State<AppState>) -> ActiveApp {
    state.active.lock().unwrap().clone()
}

#[tauri::command]
fn get_apps(state: tauri::State<AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db_pool.get().map_err(|e| e.to_string())?;
    
    let mut stmt_apps = conn.prepare(
        "SELECT id, app_name, process_name, category, brand_color, icon_slug, platforms 
         FROM apps ORDER BY app_name ASC"
    ).map_err(|e| e.to_string())?;

    let mut stmt_shortcuts = conn.prepare(
        "SELECT section, keys, action, description, os, source, confidence, verified_against_official 
         FROM shortcuts WHERE app_id = ?1"
    ).map_err(|e| e.to_string())?;
    
    let app_rows = stmt_apps.query_map([], |row| {
        let app_id: i64 = row.get(0)?;
        let app_name: String = row.get(1)?;
        let process_name: String = row.get(2)?;
        let category: String = row.get(3)?;
        let brand_color: Option<String> = row.get(4)?;
        let icon_slug: Option<String> = row.get(5)?;
        let platforms_str: String = row.get(6)?;

        let platforms: serde_json::Value = serde_json::from_str(&platforms_str).unwrap_or(serde_json::Value::Array(vec![]));

        Ok((app_id, app_name, process_name, category, brand_color, icon_slug, platforms))
    }).map_err(|e| e.to_string())?;

    let mut apps_list = Vec::new();
    for app_res in app_rows {
        if let Ok((app_id, app_name, process_name, category, brand_color, icon_slug, platforms)) = app_res {
            let shortcut_rows = stmt_shortcuts.query_map([app_id], |row| {
                let section: String = row.get(0)?;
                let keys_str: String = row.get(1)?;
                let action: String = row.get(2)?;
                let description: Option<String> = row.get(3)?;
                let os: String = row.get(4)?;
                let source: String = row.get(5)?;
                let confidence: String = row.get(6)?;
                let verified_val: i32 = row.get(7)?;

                let keys: serde_json::Value = serde_json::from_str(&keys_str).unwrap_or(serde_json::Value::Array(vec![]));
                let verified_against_official = verified_val != 0;

                Ok(serde_json::json!({
                    "section": section,
                    "keys": keys,
                    "action": action,
                    "description": description,
                    "os": os,
                    "source": source,
                    "confidence": confidence,
                    "verified_against_official": verified_against_official
                }))
            }).map_err(|e| e.to_string())?;

            let mut shortcuts = Vec::new();
            for sh in shortcut_rows {
                if let Ok(sh_json) = sh {
                    shortcuts.push(sh_json);
                }
            }

            apps_list.push(serde_json::json!({
                "app_name": app_name,
                "process_name": process_name,
                "category": category,
                "platforms": platforms,
                "icon_slug": icon_slug,
                "brand_color": brand_color,
                "shortcuts": shortcuts
            }));
        }
    }

    Ok(serde_json::Value::Array(apps_list))
}

#[tauri::command]
fn load_settings(state: tauri::State<AppState>) -> Settings {
    let path = state.settings_path.lock().unwrap().clone();
    read_settings(&path)
}

#[tauri::command]
fn save_settings(
    state: tauri::State<AppState>,
    theme: String,
    excluded: Vec<String>,
    hold_ms: u64,
    trigger_type: String,
    autostart: bool,
    start_minimized: bool,
    disable_unsupported_trigger: bool,
    popover_position: String,
    popover_opacity: f64,
    popover_scale: f64,
    global_hotkey: String,
    search_scope: String,
    auto_focus_search: bool,
    show_shortcut_count_badge: bool,
    auto_update: bool,
) {
    state.hold_ms.store(hold_ms.max(150), Ordering::Relaxed);
    state.disable_unsupported_trigger.store(disable_unsupported_trigger, Ordering::Relaxed);
    {
        let mut tr = state.trigger_type.lock().unwrap();
        *tr = trigger_type.clone();
    }
    {
        let mut ex = state.excluded.lock().unwrap();
        *ex = excluded.iter().cloned().collect();
    }
    {
        let mut pp = state.popover_position.lock().unwrap();
        *pp = popover_position.clone();
    }
    {
        let mut po = state.popover_opacity.lock().unwrap();
        *po = popover_opacity;
    }
    {
        let mut ps = state.popover_scale.lock().unwrap();
        *ps = popover_scale;
    }
    {
        let mut gh = state.global_hotkey.lock().unwrap();
        *gh = global_hotkey.clone();
    }
    {
        let mut ss = state.search_scope.lock().unwrap();
        *ss = search_scope.clone();
    }

    #[cfg(windows)]
    set_autostart(autostart);

    let path = state.settings_path.lock().unwrap().clone();
    write_settings(
        &path,
        &Settings {
            theme,
            excluded,
            hold_ms,
            trigger_type,
            autostart,
            start_minimized,
            disable_unsupported_trigger,
            popover_position,
            popover_opacity,
            popover_scale,
            global_hotkey,
            search_scope,
            auto_focus_search,
            show_shortcut_count_badge,
            auto_update,
        },
    );
}

#[tauri::command]
fn refresh_database(state: tauri::State<AppState>) -> Result<serde_json::Value, String> {
    let mut raw = None;

    // Check current working directory (in development)
    if let Ok(cwd) = std::env::current_dir() {
        let seed_path = cwd.join("src-tauri").join("seed").join("apps.json");
        if seed_path.exists() {
            raw = std::fs::read_to_string(seed_path).ok();
        }
    }

    // Check app data directory (in production)
    if raw.is_none() {
        let settings_path = state.settings_path.lock().unwrap().clone();
        if let Some(parent) = settings_path.parent() {
            let seed_path = parent.join("apps.json");
            if seed_path.exists() {
                raw = std::fs::read_to_string(seed_path).ok();
            }
        }
    }

    let raw = match raw {
        Some(content) => content,
        None => include_str!("../seed/apps.json").to_string(),
    };

    // Backup the current database before wiping it.
    let db_path = get_db_path();
    let bak_path = db_path.with_extension("db.bak");
    let _ = std::fs::copy(&db_path, &bak_path);

    let apps: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    let conn = state.db_pool.get().map_err(|e| e.to_string())?;

    // Clear existing
    conn.execute("DELETE FROM shortcuts", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM apps", []).map_err(|e| e.to_string())?;

    // Seed
    if let Some(apps_list) = apps.as_array() {
        for app in apps_list {
            let app_name = app["app_name"].as_str().unwrap_or("");
            let process_name = app["process_name"].as_str().unwrap_or("");
            let category = app["category"].as_str().unwrap_or("");
            let brand_color = app["brand_color"].as_str();
            let icon_slug = app["icon_slug"].as_str();
            let platforms = app["platforms"].to_string();

            let _ = conn.execute(
                "INSERT INTO apps (app_name, process_name, category, brand_color, icon_slug, platforms) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                (app_name, process_name, category, brand_color, icon_slug, platforms),
            );
            let app_id = conn.last_insert_rowid();

            if let Some(shortcuts_list) = app["shortcuts"].as_array() {
                for sh in shortcuts_list {
                    let section = sh["section"].as_str().unwrap_or("");
                    let keys = sh["keys"].to_string();
                    let action = sh["action"].as_str().unwrap_or("");
                    let description = sh["description"].as_str();
                    let os = sh["os"].as_str().unwrap_or("windows");
                    let source = sh["source"].as_str().unwrap_or("manual");
                    let confidence = sh["confidence"].as_str().unwrap_or("high");
                    let verified = if sh["verified_against_official"].as_bool().unwrap_or(true) { 1 } else { 0 };

                    let _ = conn.execute(
                        "INSERT INTO shortcuts (app_id, section, keys, action, description, os, source, confidence, verified_against_official)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                        (app_id, section, keys, action, description, os, source, confidence, verified),
                    );
                }
            }
        }
    }

    // Rebuild process map
    let mut process_map = HashMap::new();
    if let Some(arr) = apps.as_array() {
        for app in arr {
            if let (Some(proc), Some(name)) = (
                app.get("process_name").and_then(|v| v.as_str()),
                app.get("app_name").and_then(|v| v.as_str()),
            ) {
                process_map.insert(proc.to_lowercase(), name.to_string());
            }
        }
    }

    let alias_raw = include_str!("../seed/process_aliases.json");
    if let Ok(aliases) = serde_json::from_str::<HashMap<String, String>>(alias_raw) {
        for (real, canonical) in &aliases {
            if let Some(name) = process_map.get(&canonical.to_lowercase()).cloned() {
                process_map.insert(real.to_lowercase(), name);
            }
        }
    }

    {
        let mut pm = state.process_map.lock().unwrap();
        *pm = process_map;
    }

    get_apps(state)
}

#[tauri::command]
fn search_shortcuts(state: tauri::State<AppState>, query: String) -> Result<serde_json::Value, String> {
    let conn = state.db_pool.get().map_err(|e| e.to_string())?;
    
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Ok(serde_json::Value::Array(vec![]));
    }

    let fts_query = format!("\"{}\"", trimmed.replace("\"", ""));

    let mut stmt = conn.prepare(
        "SELECT s.section, s.keys, s.action, s.description, s.os, s.source, s.confidence, s.verified_against_official, a.app_name, a.brand_color, a.icon_slug
         FROM shortcuts_fts f
         JOIN shortcuts s ON s.id = f.shortcut_id
         JOIN apps a ON a.id = s.app_id
         WHERE shortcuts_fts MATCH ?1
         LIMIT 50"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([fts_query], |row| {
        let section: String = row.get(0)?;
        let keys_str: String = row.get(1)?;
        let action: String = row.get(2)?;
        let description: Option<String> = row.get(3)?;
        let os: String = row.get(4)?;
        let source: String = row.get(5)?;
        let confidence: String = row.get(6)?;
        let verified_val: i32 = row.get(7)?;
        let app_name: String = row.get(8)?;
        let brand_color: Option<String> = row.get(9)?;
        let icon_slug: Option<String> = row.get(10)?;

        let keys: serde_json::Value = serde_json::from_str(&keys_str).unwrap_or(serde_json::Value::Array(vec![]));
        let verified_against_official = verified_val != 0;

        Ok(serde_json::json!({
            "section": section,
            "keys": keys,
            "action": action,
            "description": description,
            "os": os,
            "source": source,
            "confidence": confidence,
            "verified_against_official": verified_against_official,
            "app_name": app_name,
            "brand_color": brand_color,
            "icon_slug": icon_slug
        }))
    });

    let mut results = Vec::new();
    if let Ok(rows) = rows {
        for r in rows {
            if let Ok(obj) = r {
                results.push(obj);
            }
        }
    } else {
        // Fallback to simple LIKE search if FTS MATCH query fails
        let like_query = format!("%{}%", trimmed);
        let mut fallback_stmt = conn.prepare(
            "SELECT s.section, s.keys, s.action, s.description, s.os, s.source, s.confidence, s.verified_against_official, a.app_name, a.brand_color, a.icon_slug
             FROM shortcuts s
             JOIN apps a ON a.id = s.app_id
             WHERE s.action LIKE ?1 OR s.section LIKE ?1 OR s.description LIKE ?1
             LIMIT 50"
        ).map_err(|e| e.to_string())?;

        // Collect eagerly so fallback_stmt can drop before this block ends.
        let fallback_rows: Vec<_> = match fallback_stmt
            .query_map([like_query], |row| {
                let section: String = row.get(0)?;
                let keys_str: String = row.get(1)?;
                let action: String = row.get(2)?;
                let description: Option<String> = row.get(3)?;
                let os: String = row.get(4)?;
                let source: String = row.get(5)?;
                let confidence: String = row.get(6)?;
                let verified_val: i32 = row.get(7)?;
                let app_name: String = row.get(8)?;
                let brand_color: Option<String> = row.get(9)?;
                let icon_slug: Option<String> = row.get(10)?;

                let keys: serde_json::Value = serde_json::from_str(&keys_str)
                    .unwrap_or(serde_json::Value::Array(vec![]));
                let verified_against_official = verified_val != 0;

                Ok(serde_json::json!({
                    "section": section,
                    "keys": keys,
                    "action": action,
                    "description": description,
                    "os": os,
                    "source": source,
                    "confidence": confidence,
                    "verified_against_official": verified_against_official,
                    "app_name": app_name,
                    "brand_color": brand_color,
                    "icon_slug": icon_slug
                }))
            }) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(_) => Vec::new(),
        };

        results.extend(fallback_rows);
    }

    Ok(serde_json::Value::Array(results))
}

// Helper to resolve AppData/com.yourctrl.app/yourctrl.db path
fn get_db_path() -> PathBuf {
    let app_data_dir = std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("com.yourctrl.app");
    
    let _ = std::fs::create_dir_all(&app_data_dir);
    app_data_dir.join("yourctrl.db")
}

// Helper to initialize database tables, triggers, and FTS5 virtual table
fn init_db(conn: &rusqlite::Connection) -> Result<(), rusqlite::Error> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS apps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name TEXT NOT NULL UNIQUE,
            process_name TEXT NOT NULL,
            category TEXT NOT NULL,
            brand_color TEXT,
            icon_slug TEXT,
            platforms TEXT NOT NULL,
            official_website_url TEXT,
            official_docs_url TEXT,
            github_url TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS shortcuts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
            section TEXT NOT NULL,
            action TEXT NOT NULL,
            keys TEXT NOT NULL,
            description TEXT,
            os TEXT NOT NULL,
            source TEXT NOT NULL,
            confidence TEXT NOT NULL,
            verified_against_official INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS shortcut_overrides (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
            shortcut_id INTEGER REFERENCES shortcuts(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            keys TEXT NOT NULL,
            section TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS shortcuts_fts USING fts5(
            shortcut_id UNINDEXED,
            app_name,
            action,
            section,
            keys,
            description
        )",
        [],
    )?;

    conn.execute("DROP TRIGGER IF EXISTS shortcuts_ai", [])?;
    conn.execute("DROP TRIGGER IF EXISTS shortcuts_ad", [])?;
    conn.execute("DROP TRIGGER IF EXISTS shortcuts_au", [])?;

    conn.execute(
        "CREATE TRIGGER shortcuts_ai AFTER INSERT ON shortcuts BEGIN
            INSERT INTO shortcuts_fts(shortcut_id, app_name, action, section, keys, description)
            SELECT new.id, a.app_name, new.action, new.section, new.keys, new.description
            FROM apps a WHERE a.id = new.app_id;
        END;",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER shortcuts_ad AFTER DELETE ON shortcuts BEGIN
            DELETE FROM shortcuts_fts WHERE shortcut_id = old.id;
        END;",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER shortcuts_au AFTER UPDATE ON shortcuts BEGIN
            UPDATE shortcuts_fts SET
                action = new.action,
                section = new.section,
                keys = new.keys,
                description = new.description
            WHERE shortcut_id = new.id;
        END;",
        [],
    )?;

    Ok(())
}

fn build_state() -> AppState {
    let db_path = get_db_path();
    let manager = SqliteConnectionManager::file(&db_path);
    let db_pool = Pool::new(manager).expect("Failed to create SQLite connection pool");

    // Initialize schema and seed database if empty
    {
        let conn = db_pool.get().expect("Failed to get connection from pool during init");
        init_db(&conn).expect("Failed to initialize database tables and triggers");
        
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM apps", [], |row| row.get(0)).unwrap_or(0);
        if count == 0 {
            // Seed database from embedded apps.json
            let raw = include_str!("../seed/apps.json");
            if let Ok(apps_val) = serde_json::from_str::<serde_json::Value>(raw) {
                if let Some(apps_list) = apps_val.as_array() {
                    for app in apps_list {
                        let app_name = app["app_name"].as_str().unwrap_or("");
                        let process_name = app["process_name"].as_str().unwrap_or("");
                        let category = app["category"].as_str().unwrap_or("");
                        let brand_color = app["brand_color"].as_str();
                        let icon_slug = app["icon_slug"].as_str();
                        let platforms = app["platforms"].to_string();

                        let _ = conn.execute(
                            "INSERT INTO apps (app_name, process_name, category, brand_color, icon_slug, platforms) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                            (app_name, process_name, category, brand_color, icon_slug, platforms),
                        );
                        let app_id = conn.last_insert_rowid();

                        if let Some(shortcuts_list) = app["shortcuts"].as_array() {
                            for sh in shortcuts_list {
                                let section = sh["section"].as_str().unwrap_or("");
                                let keys = sh["keys"].to_string();
                                let action = sh["action"].as_str().unwrap_or("");
                                let description = sh["description"].as_str();
                                let os = sh["os"].as_str().unwrap_or("windows");
                                let source = sh["source"].as_str().unwrap_or("manual");
                                let confidence = sh["confidence"].as_str().unwrap_or("high");
                                let verified = if sh["verified_against_official"].as_bool().unwrap_or(true) { 1 } else { 0 };

                                let _ = conn.execute(
                                    "INSERT INTO shortcuts (app_id, section, keys, action, description, os, source, confidence, verified_against_official)
                                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                                    (app_id, section, keys, action, description, os, source, confidence, verified),
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    // Build process map from database
    let mut process_map = HashMap::new();
    {
        let conn = db_pool.get().expect("Failed to get connection for process map building");
        let mut stmt = match conn.prepare("SELECT app_name, process_name FROM apps") {
            Ok(s) => s,
            Err(_) => { /* skip if table not ready */ return AppState {
                db_pool,
                process_map: Mutex::new(process_map),
                excluded: Mutex::new(HashSet::new()),
                active: Mutex::new(ActiveApp::default()),
                hold_ms: AtomicU64::new(default_hold_ms()),
                trigger_type: Mutex::new(default_trigger_type()),
                settings_path: Mutex::new(PathBuf::new()),
                disable_unsupported_trigger: std::sync::atomic::AtomicBool::new(false),
                popover_position: Mutex::new(default_popover_position()),
                popover_opacity: Mutex::new(default_popover_opacity()),
                popover_scale: Mutex::new(default_popover_scale()),
                global_hotkey: Mutex::new(default_global_hotkey()),
                search_scope: Mutex::new(default_search_scope()),
            }; }
        };
        // Eagerly collect into Vec so `stmt` and `conn` can both drop cleanly.
        let pairs: Vec<(String, String)> = stmt
            .query_map([], |row| {
                let name: String = row.get(0)?;
                let proc: String = row.get(1)?;
                Ok((proc, name))
            })
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default();

        for (proc, name) in pairs {
            process_map.insert(proc.to_lowercase(), name);
        }
    }

    // Fold in process_aliases
    let alias_raw = include_str!("../seed/process_aliases.json");
    if let Ok(aliases) = serde_json::from_str::<HashMap<String, String>>(alias_raw) {
        for (real, canonical) in &aliases {
            if let Some(name) = process_map.get(&canonical.to_lowercase()).cloned() {
                process_map.insert(real.to_lowercase(), name);
            }
        }
    }

    AppState {
        db_pool,
        process_map: Mutex::new(process_map),
        excluded: Mutex::new(HashSet::new()),
        active: Mutex::new(ActiveApp::default()),
        hold_ms: AtomicU64::new(default_hold_ms()),
        trigger_type: Mutex::new(default_trigger_type()),
        settings_path: Mutex::new(PathBuf::new()),
        disable_unsupported_trigger: std::sync::atomic::AtomicBool::new(false),
        popover_position: Mutex::new(default_popover_position()),
        popover_opacity: Mutex::new(default_popover_opacity()),
        popover_scale: Mutex::new(default_popover_scale()),
        global_hotkey: Mutex::new(default_global_hotkey()),
        search_scope: Mutex::new(default_search_scope()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .manage(build_state())
        .manage(app_updates::PendingUpdate(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            show_popover,
            hide_popover,
            focus_main,
            get_active_app,
            get_running_apps,
            get_apps,
            load_settings,
            save_settings,
            refresh_database,
            search_shortcuts,
            app_updates::fetch_update,
            app_updates::install_update
        ])
        .on_window_event(|window, event| {
            // Closing the main window hides it to the tray instead of quitting.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            let handle = app.handle();

            // Resolve + load persisted settings.
            if let Ok(dir) = app.path().app_data_dir() {
                let path = dir.join("settings.json");
                let settings = read_settings(&path);
                {
                    let state = app.state::<AppState>();
                    *state.settings_path.lock().unwrap() = path;
                    *state.excluded.lock().unwrap() = settings.excluded.iter().cloned().collect();
                    state.hold_ms.store(settings.hold_ms.max(150), Ordering::Relaxed);
                    *state.trigger_type.lock().unwrap() = settings.trigger_type.clone();
                    state.disable_unsupported_trigger.store(settings.disable_unsupported_trigger, Ordering::Relaxed);
                    *state.popover_position.lock().unwrap() = settings.popover_position.clone();
                    *state.popover_opacity.lock().unwrap() = settings.popover_opacity;
                    *state.popover_scale.lock().unwrap() = settings.popover_scale;
                    *state.global_hotkey.lock().unwrap() = settings.global_hotkey.clone();
                    *state.search_scope.lock().unwrap() = settings.search_scope.clone();
                }

                let args: Vec<String> = std::env::args().collect();
                let should_minimize = args.iter().any(|arg| arg == "--minimized") || settings.start_minimized;
                if should_minimize {
                    if let Some(main_win) = app.get_webview_window("main") {
                        let _ = main_win.hide();
                    }
                }
            }

            // System tray — keeps the app alive in the background.
            let show = MenuItem::with_id(app, "show", "Open YourCtrl", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit YourCtrl", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            let mut tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("YourCtrl — hold Ctrl for shortcuts")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            // Spawn active app tracking thread (polls active process name every 250ms, ignoring yourctrl)
            let handle_clone = handle.clone();
            std::thread::spawn(move || {
                use std::time::Duration;
                loop {
                    std::thread::sleep(Duration::from_millis(250));
                    if let Some(proc) = foreground_process_name() {
                        let proc_lower = proc.to_lowercase();
                        if proc_lower != "yourctrl.exe" && !proc_lower.is_empty() {
                            let state = handle_clone.state::<AppState>();
                            let app_name = {
                                if let Ok(pm) = state.process_map.lock() {
                                    pm.get(&proc_lower).cloned()
                                } else {
                                    None
                                }
                            };
                            let changed = {
                                if let Ok(mut active) = state.active.lock() {
                                    if active.process_name != proc {
                                        active.app_name = app_name.clone();
                                        active.process_name = proc.clone();
                                        true
                                    } else {
                                        false
                                    }
                                } else {
                                    false
                                }
                            };
                            if changed {
                                let _ = handle_clone.emit(
                                    "active-app-changed",
                                    ActiveApp {
                                        app_name,
                                        process_name: proc,
                                    },
                                );
                            }
                        }
                    }
                }
            });

            // Start the global Ctrl-hold detector.
            spawn_detection(handle.clone());

            // Check for hotkey conflicts and warn the frontend.
            {
                let state = app.state::<AppState>();
                let hotkey = state.global_hotkey.lock().unwrap().clone();
                if check_hotkey_conflict(&hotkey) {
                    let _ = handle.emit("hotkey-conflict", &hotkey);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
