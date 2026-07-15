//! Globaler Capture-Hotkey über einen Low-Level-Keyboard-Hook
//! (WH_KEYBOARD_LL) statt RegisterHotKey: Star Citizen liest die Tastatur
//! per Raw Input und unterdrückt damit die Erzeugung klassischer
//! Tastatur-Messages, an denen der RegisterHotKey-Mechanismus hängt —
//! RegisterHotKey-Hotkeys feuern deshalb nie, solange das Spiel den
//! Fokus hat (am 15.07.2026 live nachgewiesen). Ein LL-Hook sitzt vor
//! dieser Filterung; dieselbe Technik nutzen Discord und AutoHotkey.
//!
//! Anti-Cheat-Grenze (CLAUDE.md/README) bleibt gewahrt: Der Hook-Callback
//! läuft vollständig im Companion-Prozess, es wird nichts in den
//! Spielprozess injiziert. Der Tastendruck wird zudem immer unverändert
//! an das System weitergereicht (CallNextHookEx), das Spiel sieht ihn
//! also weiterhin.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::OnceLock;

use tauri::AppHandle;
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, GetMessageW, SetWindowsHookExW, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL,
    WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};

/// Geparster Hotkey; das String-Format ("ctrl+alt+r") ist dasselbe, das
/// der HotkeyRecorder im Frontend erzeugt.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Hotkey {
    pub ctrl: bool,
    pub alt: bool,
    pub shift: bool,
    pub win: bool,
    pub vk: u32,
}

static APP: OnceLock<AppHandle> = OnceLock::new();
static HOOK_INSTALLED: AtomicBool = AtomicBool::new(false);
/// Aktiver Hotkey, gepackt für lock-freien Zugriff aus dem Hook-Callback
/// (im LL-Hook darf nichts blockieren). 0 = kein Hotkey gesetzt.
static ACTIVE_HOTKEY: AtomicU64 = AtomicU64::new(0);
/// Unterdrückt Auto-Repeat: gesetzt ab dem ersten Match bis zum KeyUp.
static HELD: AtomicBool = AtomicBool::new(false);

const FLAG_VALID: u64 = 1 << 36;
const FLAG_CTRL: u64 = 1 << 32;
const FLAG_ALT: u64 = 1 << 33;
const FLAG_SHIFT: u64 = 1 << 34;
const FLAG_WIN: u64 = 1 << 35;

fn encode(hotkey: Hotkey) -> u64 {
    u64::from(hotkey.vk)
        | FLAG_VALID
        | if hotkey.ctrl { FLAG_CTRL } else { 0 }
        | if hotkey.alt { FLAG_ALT } else { 0 }
        | if hotkey.shift { FLAG_SHIFT } else { 0 }
        | if hotkey.win { FLAG_WIN } else { 0 }
}

fn decode(packed: u64) -> Option<Hotkey> {
    if packed & FLAG_VALID == 0 {
        return None;
    }
    Some(Hotkey {
        ctrl: packed & FLAG_CTRL != 0,
        alt: packed & FLAG_ALT != 0,
        shift: packed & FLAG_SHIFT != 0,
        win: packed & FLAG_WIN != 0,
        vk: (packed & 0xFFFF_FFFF) as u32,
    })
}

/// Virtual-Key-Code für die Nicht-Modifier-Taste des Recorder-Formats:
/// Buchstaben, Ziffern und F1–F24.
fn vk_for_key(token: &str) -> Option<u32> {
    match token.as_bytes() {
        [c @ b'a'..=b'z'] => Some(u32::from(c - b'a') + 0x41),
        [c @ b'0'..=b'9'] => Some(u32::from(c - b'0') + 0x30),
        _ => {
            let number: u32 = token.strip_prefix('f')?.parse().ok()?;
            // VK_F1 = 0x70
            (1..=24).contains(&number).then(|| 0x6F + number)
        }
    }
}

pub fn parse_hotkey(combo: &str) -> Result<Hotkey, String> {
    let mut hotkey = Hotkey {
        ctrl: false,
        alt: false,
        shift: false,
        win: false,
        vk: 0,
    };
    for token in combo.trim().to_lowercase().split('+') {
        match token.trim() {
            "ctrl" | "control" => hotkey.ctrl = true,
            "alt" => hotkey.alt = true,
            "shift" => hotkey.shift = true,
            "super" | "win" | "cmd" | "meta" => hotkey.win = true,
            key => {
                let vk = vk_for_key(key)
                    .ok_or_else(|| format!("unsupported key '{key}' in '{combo}'"))?;
                if hotkey.vk != 0 {
                    return Err(format!("more than one key in '{combo}'"));
                }
                hotkey.vk = vk;
            }
        }
    }
    if hotkey.vk == 0 {
        return Err(format!("no key in '{combo}'"));
    }
    Ok(hotkey)
}

/// Reiner Vergleich: exakte Modifier-Übereinstimmung, damit z. B.
/// Strg+Alt+R nicht auch bei Strg+Alt+Shift+R feuert.
fn matches(hotkey: Hotkey, vk: u32, ctrl: bool, alt: bool, shift: bool, win: bool) -> bool {
    hotkey.vk == vk
        && hotkey.ctrl == ctrl
        && hotkey.alt == alt
        && hotkey.shift == shift
        && hotkey.win == win
}

fn modifier_pressed(vk: i32) -> bool {
    (unsafe { GetAsyncKeyState(vk) } as u16) & 0x8000 != 0
}

unsafe extern "system" fn hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    if code == 0 {
        let message = wparam.0 as u32;
        let event = unsafe { &*(lparam.0 as *const KBDLLHOOKSTRUCT) };
        if let Some(hotkey) = decode(ACTIVE_HOTKEY.load(Ordering::Relaxed)) {
            match message {
                WM_KEYDOWN | WM_SYSKEYDOWN => {
                    let hit = matches(
                        hotkey,
                        event.vkCode,
                        modifier_pressed(i32::from(VK_CONTROL.0)),
                        modifier_pressed(i32::from(VK_MENU.0)),
                        modifier_pressed(i32::from(VK_SHIFT.0)),
                        modifier_pressed(i32::from(VK_LWIN.0))
                            || modifier_pressed(i32::from(VK_RWIN.0)),
                    );
                    if hit && !HELD.swap(true, Ordering::SeqCst) {
                        if let Some(app) = APP.get() {
                            crate::on_capture_hotkey(app);
                        }
                    }
                }
                WM_KEYUP | WM_SYSKEYUP if event.vkCode == hotkey.vk => {
                    HELD.store(false, Ordering::SeqCst);
                }
                _ => {}
            }
        }
    }
    unsafe { CallNextHookEx(None, code, wparam, lparam) }
}

/// Installiert den Hook auf einem dedizierten Thread mit Message-Loop
/// (LL-Hooks brauchen eine laufende Loop auf dem installierenden Thread).
/// Idempotent — nur der erste Aufruf startet den Thread.
pub fn start(app: AppHandle) {
    if APP.set(app).is_err() {
        return;
    }
    std::thread::spawn(|| unsafe {
        match SetWindowsHookExW(WH_KEYBOARD_LL, Some(hook_proc), None, 0) {
            Ok(_hook) => {
                HOOK_INSTALLED.store(true, Ordering::SeqCst);
                let mut message = MSG::default();
                while GetMessageW(&mut message, None, 0, 0).as_bool() {}
            }
            Err(error) => eprintln!("keyboard hook installation failed: {error}"),
        }
    });
}

pub fn hook_installed() -> bool {
    HOOK_INSTALLED.load(Ordering::SeqCst)
}

pub fn set_hotkey(hotkey: Hotkey) {
    ACTIVE_HOTKEY.store(encode(hotkey), Ordering::SeqCst);
    HELD.store(false, Ordering::SeqCst);
}

pub fn active_hotkey() -> Option<Hotkey> {
    decode(ACTIVE_HOTKEY.load(Ordering::SeqCst))
}

#[cfg(test)]
mod tests {
    use super::{decode, encode, matches, parse_hotkey, vk_for_key, Hotkey};

    #[test]
    fn parses_the_default_hotkey() {
        assert_eq!(
            parse_hotkey("ctrl+alt+r").unwrap(),
            Hotkey {
                ctrl: true,
                alt: true,
                shift: false,
                win: false,
                vk: 0x52,
            }
        );
    }

    /// Der HotkeyRecorder im Frontend erzeugt ctrl/alt/shift/super +
    /// Buchstabe/Ziffer/F-Taste — dieser Wertebereich muss parsen.
    #[test]
    fn parses_the_recorder_output_space() {
        for combo in [
            "ctrl+alt+m",
            "ctrl+shift+3",
            "super+k",
            "f5",
            "ctrl+alt+shift+f13",
        ] {
            assert!(parse_hotkey(combo).is_ok(), "combo: {combo}");
        }
    }

    #[test]
    fn parses_case_insensitively_and_trims() {
        assert_eq!(
            parse_hotkey(" Ctrl+Alt+R ").unwrap(),
            parse_hotkey("ctrl+alt+r").unwrap()
        );
    }

    #[test]
    fn rejects_garbage() {
        assert!(parse_hotkey("strg+ö").is_err());
        assert!(parse_hotkey("ctrl+alt").is_err());
        assert!(parse_hotkey("ctrl+a+b").is_err());
        assert!(parse_hotkey("f25").is_err());
        assert!(parse_hotkey("").is_err());
    }

    #[test]
    fn maps_virtual_keys() {
        assert_eq!(vk_for_key("a"), Some(0x41));
        assert_eq!(vk_for_key("z"), Some(0x5A));
        assert_eq!(vk_for_key("0"), Some(0x30));
        assert_eq!(vk_for_key("9"), Some(0x39));
        assert_eq!(vk_for_key("f1"), Some(0x70));
        assert_eq!(vk_for_key("f24"), Some(0x87));
        assert_eq!(vk_for_key("escape"), None);
    }

    #[test]
    fn encode_decode_roundtrip() {
        let hotkey = parse_hotkey("ctrl+shift+f13").unwrap();
        assert_eq!(decode(encode(hotkey)), Some(hotkey));
        assert_eq!(decode(0), None);
    }

    #[test]
    fn matching_requires_exact_modifiers() {
        let hotkey = parse_hotkey("ctrl+alt+r").unwrap();
        assert!(matches(hotkey, 0x52, true, true, false, false));
        // Zusätzlicher oder fehlender Modifier darf nicht feuern.
        assert!(!matches(hotkey, 0x52, true, true, true, false));
        assert!(!matches(hotkey, 0x52, true, false, false, false));
        // Andere Taste darf nicht feuern.
        assert!(!matches(hotkey, 0x53, true, true, false, false));
    }
}
