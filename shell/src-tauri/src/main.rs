//! Netzwerk-Labor – Desktop-Hülle (Tauri 2). Dünn: Fenster (Leiste/Voll), Tray, Speichern, Autostart, Einzelinstanz.
//! Alle Spiellogik liegt im Web-Teil (web/index.html). Konzept § 9, Architektur § 8.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod fenster;
mod speicher;
mod tray;

use serde_json::{json, Value};
use std::{
    env, fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering::SeqCst},
        Mutex,
    },
};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// Zustand der Hülle (für fenster.rs und tray.rs)
pub struct Labor {
    pub ordner: PathBuf,
    pub merker: Mutex<fenster::Merker>,
    pub modus: Mutex<String>,
    pub zuletzt: Mutex<String>,
    pub groesse: Mutex<(f64, f64)>,
    pub tooltip: Mutex<String>,
    pub punkt: AtomicBool,
    pub ruhe_bis: AtomicU64,
    pub vollbild_versteckt: AtomicBool,
    pub hotkey_ok: AtomicBool,
    pub ruhig_bis: AtomicU64,
    pub kann_oben: bool,
    pub tray_ok: bool,
    pub sitzung: &'static str,
    pub test: bool,
    pub selbsttest: bool,
}

fn st(app: &AppHandle) -> tauri::State<'_, Labor> {
    app.state::<Labor>()
}

/* ---------- Befehle für die Seite (invoke) ---------- */
#[tauri::command]
fn speichern(app: AppHandle, json: String) -> Result<(), String> {
    speicher::speichern(&st(&app).ordner, &json)
}
#[tauri::command]
fn fenster_modus(app: AppHandle, modus: String) -> Result<(), String> {
    fenster::modus(&app, &modus, false)
}
#[tauri::command]
fn fenster_groesse(app: AppHandle, b: f64, h: f64) -> Result<(), String> {
    fenster::groesse(&app, b, h)
}
#[tauri::command]
fn fenster_ecke(app: AppHandle, ecke: String) -> Result<(), String> {
    fenster::ecke(&app, &ecke)
}
#[tauri::command]
fn fenster_zustand(app: AppHandle) -> Value {
    fenster::zustand(&app)
}
#[tauri::command]
fn immer_oben(app: AppHandle, an: bool) -> bool {
    fenster::immer_oben(&app, an)
}
#[tauri::command]
fn abzeichen(app: AppHandle, n: u32, text: String) {
    tray::abzeichen(&app, n, &text);
}
#[tauri::command]
fn autostart(app: AppHandle, an: bool) -> Result<bool, String> {
    let m = app.autolaunch();
    if an { m.enable() } else { m.disable() }.map_err(|e| e.to_string())?;
    let ist = m.is_enabled().unwrap_or(false);
    tray::haken(&app, "autostart", ist);
    Ok(ist)
}
#[tauri::command]
fn autostart_status(app: AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}
/* Dateidialoge blockieren – deshalb async (läuft nicht auf dem Hauptthread) */
#[tauri::command]
async fn exportieren(app: AppHandle, name: String, inhalt: String) -> Result<bool, String> {
    let Some(ziel) = app.dialog().file().set_file_name(&name).add_filter("Spielstand", &["json"]).blocking_save_file() else { return Ok(false) };
    let pfad = ziel.into_path().map_err(|e| e.to_string())?;
    fs::write(&pfad, inhalt).map_err(|e| e.to_string())?;
    Ok(true)
}
#[tauri::command]
async fn importieren(app: AppHandle) -> Result<Option<String>, String> {
    let Some(q) = app.dialog().file().add_filter("Spielstand", &["json"]).blocking_pick_file() else { return Ok(None) };
    let pfad = q.into_path().map_err(|e| e.to_string())?;
    let text = fs::read_to_string(&pfad).map_err(|e| e.to_string())?;
    if text.len() > speicher::MAX_BYTES { return Err("Datei zu groß".into()); }
    Ok(Some(text))
}
#[tauri::command]
fn plattform_info(app: AppHandle) -> Value {
    let s = st(&app);
    fenster::info(&s, s.hotkey_ok.load(SeqCst))
}
#[tauri::command]
fn ruhe(app: AppHandle, an: bool) {
    tray::ruhe(&app, an);
}
#[tauri::command]
fn beenden(app: AppHandle) {
    fenster::merker_schreiben(&app);
    app.exit(0);
}
/* Selbsttest (LABOR_SELBSTTEST=1): die Seite meldet ihr Ergebnis, die Hülle schreibt es in eine Datei und endet */
#[tauri::command]
fn selbsttest_ergebnis(app: AppHandle, json: String) -> Result<(), String> {
    let datei = env::var("LABOR_SELBSTTEST_DATEI").unwrap_or_else(|_| st(&app).ordner.join("selbsttest.json").display().to_string());
    let mut v: Value = serde_json::from_str(&json).unwrap_or(json!({"roh": json}));
    v["fenster"] = fenster::zustand(&app);
    v["plattform"] = fenster::info(&st(&app), st(&app).hotkey_ok.load(SeqCst));
    speicher::atomar_schreiben(&PathBuf::from(&datei), serde_json::to_string_pretty(&v).unwrap_or_default().as_bytes())?;
    if st(&app).selbsttest {
        let a = app.clone();
        std::thread::spawn(move || { std::thread::sleep(std::time::Duration::from_millis(300)); a.exit(0); });
    }
    Ok(())
}

fn datenordner(app: &AppHandle) -> PathBuf {
    if let Ok(d) = env::var("LABOR_DATEN") { return PathBuf::from(d); }
    app.path().app_data_dir().unwrap_or_else(|_| env::temp_dir().join("netzwerk-labor"))
}

fn main() {
    let start_im_tray = env::args().any(|a| a == "--tray" || a == "--autostart");
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| fenster::zweiter_start(app, args)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--tray"])))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, _sc, ev| { if ev.state() == ShortcutState::Pressed { fenster::umschalten(app, "hotkey"); } })
            .build())
        .invoke_handler(tauri::generate_handler![speichern, fenster_modus, fenster_groesse, fenster_ecke, fenster_zustand, immer_oben, abzeichen,
            autostart, autostart_status, exportieren, importieren, plattform_info, ruhe, beenden, selbsttest_ergebnis])
        .setup(move |app| {
            let h = app.handle().clone();
            let ordner = datenordner(&h);
            let _ = fs::create_dir_all(&ordner);
            let sitzung = fenster::sitzung();
            let merker = fenster::merker_laden(&ordner);
            let tray_moeglich = fenster::tray_dienst();
            /* Tray zuerst (braucht den Zustand erst bei Ereignissen); ohne Tray-Dienst unter Linux beendet Schließen das Programm */
            let tray_ok = tray_moeglich && tray::einrichten(&h, merker.immer_oben, h.autolaunch().is_enabled().unwrap_or(false)).is_ok();
            app.manage(Labor {
                ordner: ordner.clone(), merker: Mutex::new(merker), modus: Mutex::new("tray".into()), zuletzt: Mutex::new("voll".into()),
                groesse: Mutex::new(fenster::LEISTE), tooltip: Mutex::new("Netzwerk-Labor".into()), punkt: AtomicBool::new(false),
                ruhe_bis: AtomicU64::new(0), vollbild_versteckt: AtomicBool::new(false), hotkey_ok: AtomicBool::new(false), ruhig_bis: AtomicU64::new(0),
                kann_oben: sitzung != "wayland", tray_ok, sitzung,
                test: env::var("LABOR_DATEN").is_ok(), selbsttest: env::var("LABOR_SELBSTTEST").map(|v| v == "1").unwrap_or(false),
            });
            /* Globales Tastenkürzel Strg+Alt+L (unter Wayland nicht möglich) */
            if sitzung != "wayland" {
                let ok = h.global_shortcut().register(Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyL)).is_ok();
                st(&h).hotkey_ok.store(ok, SeqCst);
            }
            /* Spielstand und Plattform-Fähigkeiten VOR allen Seitenskripten bereitstellen (kern/basis.js liest sie synchron) */
            let geladen = speicher::laden(&ordner);
            let info = fenster::info(&st(&h), st(&h).hotkey_ok.load(SeqCst));
            let init = format!(
                "window.__LABOR_SPEICHER__ = {};\nwindow.__LABOR_PLATTFORM__ = {};",
                json!({"daten": geladen.daten, "meldung": geladen.meldung, "pfad": ordner.display().to_string()}),
                info
            );
            let w = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("Netzwerk-Labor")
                .inner_size(1280.0, 800.0)
                .min_inner_size(880.0, 560.0)
                .visible(false)
                .transparent(true)
                .initialization_script(init.as_str())
                .build()?;
            let h2 = h.clone();
            w.on_window_event(move |ev| match ev {
                WindowEvent::CloseRequested { api, .. } => { api.prevent_close(); fenster::schliessen(&h2); }
                WindowEvent::Moved(_) => fenster::bewegt(&h2),
                _ => {}
            });
            #[cfg(windows)]
            fenster::waechter(h.clone());
            tray::ruhe_waechter(h.clone());
            let start = if start_im_tray { if st(&h).tray_ok { "tray" } else { "leiste" } } else { "voll" };
            let _ = fenster::modus(&h, start, true);
            let _ = h.emit("labor-start", json!({"modus": start}));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Netzwerk-Labor konnte nicht starten");
}
