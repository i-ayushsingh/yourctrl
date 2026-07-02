// Thin passthrough — all application logic lives in lib.rs (required for mobile builds).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    yourctrl_lib::run()
}
