//! Ein Fenster, zwei Ansichten (Leiste/Voll) plus Tray. Position der Leiste je Monitor, ehrliche Fähigkeiten.
//! Regel: nie ein Mutex halten, während eine Fenster-Methode läuft (die läuft ggf. über den Haupt-Thread).

use crate::Labor;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, fs, path::Path, sync::atomic::Ordering::SeqCst, thread, time::Duration};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, Monitor, PhysicalPosition, PhysicalSize, WebviewWindow};

pub const LEISTE: (f64, f64) = (300.0, 56.0);
const VOLL: (f64, f64) = (1280.0, 800.0);
const RAND: f64 = 12.0;

#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct Merker {
    /// Monitor-Schlüssel → linke obere Ecke der zugeklappten Leiste (physische Pixel)
    pub leiste: HashMap<String, [i32; 2]>,
    pub monitor: Option<String>,
    pub voll: Option<[f64; 2]>,
    pub voll_max: bool,
    pub immer_oben: bool,
}

impl Default for Merker {
    fn default() -> Self {
        Merker { leiste: HashMap::new(), monitor: None, voll: None, voll_max: false, immer_oben: true }
    }
}

pub fn merker_laden(ordner: &Path) -> Merker {
    fs::read_to_string(ordner.join("fenster.json")).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default()
}

pub fn merker_schreiben(app: &AppHandle) {
    let Some(st) = app.try_state::<Labor>() else { return };
    let m = st.merker.lock().unwrap().clone();
    if let Ok(t) = serde_json::to_string_pretty(&m) {
        let _ = crate::speicher::atomar_schreiben(&st.ordner.join("fenster.json"), t.as_bytes());
    }
}

fn haupt(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window("main").ok_or_else(|| "Fenster fehlt".to_string())
}

fn schluessel(m: &Monitor) -> String {
    let (p, s) = (m.position(), m.size());
    format!("{}|{}x{}|{},{}", m.name().map(String::as_str).unwrap_or("?"), s.width, s.height, p.x, p.y)
}

/// Programmgesteuerte Fensteränderungen lösen verspätete Moved-Ereignisse aus. Die dürfen nicht als
/// „Nutzer hat die Leiste verschoben“ gemerkt werden: kurz danach werden Bewegungen ignoriert.
pub fn jetzt_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}
fn beruhigen(st: &Labor) {
    st.ruhig_bis.store(jetzt_ms() + 900, SeqCst);
}

fn px(v: f64, skala: f64) -> i32 {
    (v * skala).round() as i32
}

/// Arbeitsfläche (ohne Taskleiste) als (x, y, b, h)
fn flaeche(m: &Monitor) -> (i32, i32, i32, i32) {
    let wa = m.work_area();
    (wa.position.x, wa.position.y, wa.size.width as i32, wa.size.height as i32)
}

/// Leiste auf ihren gemerkten Platz setzen (je Monitor), sonst unten rechts über der Taskleiste.
fn leiste_platzieren(w: &WebviewWindow, st: &Labor) {
    let monitore = w.available_monitors().unwrap_or_default();
    let gemerkt = st.merker.lock().unwrap().clone();
    let Some(ziel) = gemerkt
        .monitor
        .as_ref()
        .and_then(|k| monitore.iter().find(|m| &schluessel(m) == k).cloned())
        .or_else(|| w.primary_monitor().ok().flatten())
        .or_else(|| monitore.first().cloned())
    else {
        return; // z. B. Wayland ohne Monitorliste: der Compositor platziert
    };
    let k = schluessel(&ziel);
    let s = ziel.scale_factor();
    let (b, h) = (px(LEISTE.0, s), px(LEISTE.1, s));
    let (x, y, fb, fh) = flaeche(&ziel);
    let standard = [x + fb - b - px(RAND, s), y + fh - h - px(RAND, s)];
    let pos = gemerkt
        .leiste
        .get(&k)
        .copied()
        .filter(|p| p[0] >= x && p[1] >= y && p[0] + b <= x + fb && p[1] + h <= y + fh)
        .unwrap_or(standard);
    st.merker.lock().unwrap().monitor = Some(k);
    *st.groesse.lock().unwrap() = LEISTE;
    beruhigen(st);
    let _ = w.set_position(PhysicalPosition::new(pos[0], pos[1]));
    let _ = w.set_size(PhysicalSize::new(b as u32, h as u32));
}

/// Nach dem Verschieben (Ziehen der Leiste): Platz für diesen Monitor merken – als Ecke der ZUGEKLAPPTEN Leiste,
/// verankert an der Kante, an der sie liegt (rechts/unten), damit Auf-/Zuklappen sie nicht wandern lässt.
pub fn bewegt(app: &AppHandle) {
    let Some(st) = app.try_state::<Labor>() else { return };
    if *st.modus.lock().unwrap() != "leiste" || jetzt_ms() < st.ruhig_bis.load(SeqCst) {
        return;
    }
    let Ok(w) = haupt(app) else { return };
    let (Ok(pos), Ok(gr), Ok(Some(mon))) = (w.outer_position(), w.outer_size(), w.current_monitor()) else { return };
    let s = mon.scale_factor();
    let (b, h) = (px(LEISTE.0, s), px(LEISTE.1, s));
    let (fx, fy, fb, fh) = flaeche(&mon);
    let (gb, gh) = (gr.width as i32, gr.height as i32);
    let x = if pos.x + gb / 2 > fx + fb / 2 { pos.x + gb - b } else { pos.x };
    let y = if pos.y + gh / 2 > fy + fh / 2 { pos.y + gh - h } else { pos.y };
    let mut m = st.merker.lock().unwrap();
    let k = schluessel(&mon);
    m.leiste.insert(k.clone(), [x, y]);
    m.monitor = Some(k);
}

/// Größe der Leiste ändern (aufklappen 320×220, zuklappen 300×56), die anliegende Kante bleibt stehen.
pub fn groesse(app: &AppHandle, b: f64, h: f64) -> Result<(), String> {
    let w = haupt(app)?;
    let st = app.state::<Labor>();
    let (b, h) = (b.clamp(120.0, 4000.0), h.clamp(32.0, 3000.0));
    if *st.modus.lock().unwrap() != "leiste" {
        /* Nur die Leiste ändert ihre Größe selbst. Ein verspäteter Aufruf (Zuklappen beim Wechsel zur Vollansicht)
           darf das große Fenster nicht auf Leistengröße schrumpfen. */
        return Ok(());
    }
    *st.groesse.lock().unwrap() = (b, h);
    beruhigen(&st);
    let (Ok(pos), Ok(gr), Ok(Some(mon))) = (w.outer_position(), w.outer_size(), w.current_monitor()) else {
        return w.set_size(LogicalSize::new(b, h)).map_err(|e| e.to_string());
    };
    let s = mon.scale_factor();
    let (nb, nh) = (px(b, s), px(h, s));
    let (fx, fy, fb, fh) = flaeche(&mon);
    let (gb, gh) = (gr.width as i32, gr.height as i32);
    let x = if pos.x + gb / 2 > fx + fb / 2 { pos.x + gb - nb } else { pos.x };
    let y = if pos.y + gh / 2 > fy + fh / 2 { pos.y + gh - nh } else { pos.y };
    let x = x.clamp(fx, (fx + fb - nb).max(fx));
    let y = y.clamp(fy, (fy + fh - nh).max(fy));
    let _ = w.set_position(PhysicalPosition::new(x, y));
    w.set_size(PhysicalSize::new(nb as u32, nh as u32)).map_err(|e| e.to_string())
}

/// Leiste in eine Ecke der Arbeitsfläche setzen ("unten-rechts", "unten-links", "oben-rechts", "oben-links")
pub fn ecke(app: &AppHandle, ecke: &str) -> Result<(), String> {
    let w = haupt(app)?;
    let mon = w.current_monitor().ok().flatten().ok_or("Kein Monitor bekannt")?;
    let gr = w.outer_size().map_err(|e| e.to_string())?;
    let s = mon.scale_factor();
    let (x, y, fb, fh) = flaeche(&mon);
    let r = px(RAND, s);
    let nx = if ecke.ends_with("links") { x + r } else { x + fb - gr.width as i32 - r };
    let ny = if ecke.starts_with("oben") { y + r } else { y + fh - gr.height as i32 - r };
    w.set_position(PhysicalPosition::new(nx, ny)).map_err(|e| e.to_string())
}

fn voll_merken(w: &WebviewWindow, st: &Labor) {
    let max = w.is_maximized().unwrap_or(false);
    let groesse = w.inner_size().ok().zip(w.scale_factor().ok()).map(|(g, s)| [g.width as f64 / s, g.height as f64 / s]);
    let mut m = st.merker.lock().unwrap();
    m.voll_max = max;
    if let (false, Some(g)) = (max, groesse) {
        if g[0] >= 880.0 && g[1] >= 560.0 {
            m.voll = Some(g);
        }
    }
}

/// Moduswechsel. `melden` = die Seite erfährt es per Ereignis "fenster-modus" (nur wenn Rust selbst wechselt).
pub fn modus(app: &AppHandle, neu: &str, melden: bool) -> Result<(), String> {
    let w = haupt(app)?;
    let st = app.state::<Labor>();
    let alt = st.modus.lock().unwrap().clone();
    beruhigen(&st);
    match neu {
        "tray" => {
            if alt == "voll" {
                voll_merken(&w, &st);
            }
            if st.tray_ok {
                let _ = w.hide();
            } else {
                // Ohne Tray-Dienst: minimieren statt verstecken, sonst wäre das Programm nicht mehr erreichbar
                let _ = w.set_skip_taskbar(false);
                let _ = w.minimize();
            }
        }
        "leiste" => {
            if alt == "voll" {
                voll_merken(&w, &st);
                if w.is_maximized().unwrap_or(false) {
                    let _ = w.unmaximize();
                }
            }
            let sichtbar = w.is_visible().unwrap_or(false) && !w.is_minimized().unwrap_or(false);
            if alt != "leiste" || !sichtbar {
                let _ = w.hide(); // unsichtbar umbauen: kein Flackern, keine Aktivierung
                let _ = w.set_focusable(false);
                let _ = w.set_decorations(false);
                let _ = w.set_shadow(false);
                let _ = w.set_resizable(false);
                let _ = w.set_min_size(None::<LogicalSize<f64>>);
                let _ = w.set_skip_taskbar(true);
                leiste_platzieren(&w, &st);
            }
            let oben = st.merker.lock().unwrap().immer_oben && st.kann_oben;
            let _ = w.set_always_on_top(true); // einmal nach oben holen (ohne Fokus) …
            if !oben {
                let _ = w.set_always_on_top(false); // … und nur auf Wunsch oben bleiben
            }
            let _ = w.show();
        }
        "voll" => {
            if alt != "voll" {
                let _ = w.hide();
                let _ = w.set_always_on_top(false);
                let _ = w.set_skip_taskbar(false);
                let _ = w.set_focusable(true);
                let _ = w.set_decorations(true);
                let _ = w.set_shadow(true);
                let _ = w.set_resizable(true);
                let _ = w.set_min_size(Some(LogicalSize::new(880.0, 560.0)));
                let (gemerkt, max) = {
                    let m = st.merker.lock().unwrap();
                    (m.voll, m.voll_max)
                };
                let (mut b, mut h) = gemerkt.filter(|g| g[0] >= 880.0 && g[1] >= 560.0).map(|g| (g[0], g[1])).unwrap_or(VOLL);
                if let Ok(Some(mon)) = w.current_monitor().or_else(|_| w.primary_monitor()) {
                    let (_, _, fb, fh) = flaeche(&mon);
                    b = b.min(fb as f64 / mon.scale_factor() * 0.95);
                    h = h.min(fh as f64 / mon.scale_factor() * 0.95);
                }
                let _ = w.set_size(LogicalSize::new(b, h));
                let _ = w.center();
                if max {
                    let _ = w.maximize();
                }
            }
            let _ = w.unminimize();
            let _ = w.show();
            let _ = w.set_focus(); // die Vollansicht öffnet der Nutzer selbst: Fokus ist hier gewollt
        }
        _ => return Err(format!("Unbekannter Modus: {neu}")),
    }
    *st.modus.lock().unwrap() = neu.to_string();
    if neu != "tray" {
        *st.zuletzt.lock().unwrap() = neu.to_string();
    }
    st.vollbild_versteckt.store(false, SeqCst);
    if alt != neu {
        merker_schreiben(app);
    }
    if melden {
        let _ = app.emit("fenster-modus", neu);
    }
    Ok(())
}

pub fn immer_oben(app: &AppHandle, an: bool) -> bool {
    let st = app.state::<Labor>();
    let an = an && st.kann_oben;
    st.merker.lock().unwrap().immer_oben = an;
    if *st.modus.lock().unwrap() == "leiste" {
        if let Ok(w) = haupt(app) {
            let _ = w.set_always_on_top(an);
        }
    }
    crate::tray::haken(app, "oben", an);
    merker_schreiben(app);
    an
}

/// Tray-Linksklick, Menü „Leiste ein/aus“ und Strg+Alt+L: sichtbar → Tray, versteckt → Leiste.
pub fn umschalten(app: &AppHandle, quelle: &str) {
    let Some(st) = app.try_state::<Labor>() else { return };
    let m = st.modus.lock().unwrap().clone();
    let sichtbar = haupt(app).map(|w| w.is_visible().unwrap_or(false) && !w.is_minimized().unwrap_or(false)).unwrap_or(false);
    let ziel = if m != "tray" && sichtbar { "tray" } else { "leiste" };
    crate::tray::ruhe(app, false);
    let _ = modus(app, ziel, true);
    let _ = app.emit(quelle, json!({ "sichtbar": ziel != "tray" }));
}

/// Zweiter Programmstart: kein zweites Programm, sondern die Leiste (bzw. die offene Vollansicht) nach vorn.
pub fn zweiter_start(app: &AppHandle, args: Vec<String>) {
    let Some(st) = app.try_state::<Labor>() else { return };
    crate::tray::ruhe(app, false);
    let m = st.modus.lock().unwrap().clone();
    let _ = modus(app, if m == "voll" { "voll" } else { "leiste" }, m != "leiste" && m != "voll");
    let _ = app.emit("zweiter-start", json!({ "args": args }));
}

/// Schließen-Knopf: ins Tray (wenn es eines gibt), sonst sauber beenden.
pub fn schliessen(app: &AppHandle) {
    if app.state::<Labor>().tray_ok {
        let _ = modus(app, "tray", true);
    } else {
        beenden_anfragen(app);
    }
}

/// Beenden: erst der Seite Gelegenheit geben, den Speicher zu schreiben (store.sofort), dann spätestens nach 4 s schließen.
pub fn beenden_anfragen(app: &AppHandle) {
    merker_schreiben(app);
    if app.emit("labor-beenden", ()).is_err() {
        app.exit(0);
        return;
    }
    let a = app.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_secs(4));
        a.exit(0);
    });
}

#[cfg(windows)]
fn vordergrund(w: &WebviewWindow) -> (Value, Value) {
    use windows_sys::Win32::UI::{Input::KeyboardAndMouse::GetActiveWindow, WindowsAndMessaging::GetForegroundWindow};
    match w.hwnd() {
        Ok(h) => unsafe { (json!(h.0 as isize == GetForegroundWindow() as isize), json!(h.0 as isize == GetActiveWindow() as isize)) },
        Err(_) => (Value::Null, Value::Null),
    }
}
#[cfg(not(windows))]
fn vordergrund(_: &WebviewWindow) -> (Value, Value) {
    (Value::Null, Value::Null)
}

/// Fensterzustand für Tests (CDP, Selbsttest). vordergrund/aktiv nur unter Windows.
pub fn zustand(app: &AppHandle) -> Value {
    let (Ok(w), Some(st)) = (haupt(app), app.try_state::<Labor>()) else { return Value::Null };
    let s = w.scale_factor().unwrap_or(1.0);
    let pos = w.outer_position().ok();
    let gr = w.inner_size().ok();
    let mon = w.current_monitor().ok().flatten();
    let (vg, aktiv) = vordergrund(&w);
    json!({
        "modus": *st.modus.lock().unwrap(),
        "sichtbar": w.is_visible().ok(), "minimiert": w.is_minimized().ok(), "fokus": w.is_focused().ok(),
        "vordergrund": vg, "aktiv": aktiv,
        "immerOben": w.is_always_on_top().ok(), "dekoration": w.is_decorated().ok(),
        "x": pos.map(|p| p.x), "y": pos.map(|p| p.y),
        "b": gr.map(|g| (g.width as f64 / s).round()), "h": gr.map(|g| (g.height as f64 / s).round()), "skala": s,
        "monitor": mon.as_ref().map(schluessel), "arbeitsflaeche": mon.as_ref().map(|m| { let f = flaeche(m); [f.0, f.1, f.2, f.3] }),
        "ruheBis": st.ruhe_bis.load(SeqCst), "punkt": st.punkt.load(SeqCst), "tooltip": *st.tooltip.lock().unwrap(),
        "vollbildVersteckt": st.vollbild_versteckt.load(SeqCst),
    })
}

/// Windows: Vollbild/Präsentation blendet die Leiste aus (SHQueryUserNotificationState, alle 2 s, nur im Leistenmodus).
/// Dabei auch prüfen, ob die Leiste nach einer geänderten Monitoranordnung noch sichtbar liegt.
#[cfg(windows)]
pub fn waechter(app: AppHandle) {
    use windows_sys::Win32::UI::Shell::{SHQueryUserNotificationState, QUNS_BUSY, QUNS_PRESENTATION_MODE, QUNS_RUNNING_D3D_FULL_SCREEN};
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(2));
        let Some(st) = app.try_state::<Labor>() else { continue };
        if *st.modus.lock().unwrap() != "leiste" || st.ruhe_bis.load(SeqCst) != 0 {
            continue;
        }
        let mut q = 0;
        let voll = unsafe { SHQueryUserNotificationState(&mut q) } == 0
            && matches!(q, QUNS_BUSY | QUNS_RUNNING_D3D_FULL_SCREEN | QUNS_PRESENTATION_MODE);
        let Ok(w) = haupt(&app) else { continue };
        let versteckt = st.vollbild_versteckt.load(SeqCst);
        if voll && !versteckt {
            st.vollbild_versteckt.store(true, SeqCst);
            let _ = w.hide();
        } else if !voll && versteckt {
            st.vollbild_versteckt.store(false, SeqCst);
            let _ = w.show();
        } else if !voll && w.is_visible().unwrap_or(false) {
            let (Ok(p), Ok(g)) = (w.outer_position(), w.outer_size()) else { continue };
            let (cx, cy) = (p.x + g.width as i32 / 2, p.y + g.height as i32 / 2);
            let drin = w.available_monitors().unwrap_or_default().iter().any(|m| {
                let (x, y, b, h) = flaeche(m);
                cx >= x && cy >= y && cx < x + b && cy < y + h
            });
            if !drin {
                leiste_platzieren(&w, &st);
            }
        }
    });
}

/// Sitzungsart: unter Linux fragt GTK, welches Backend wirklich läuft.
#[cfg(target_os = "linux")]
pub fn sitzung() -> &'static str {
    use gtk::prelude::*;
    match gtk::gdk::Display::default().map(|d| d.type_().name().to_string()) {
        Some(n) if n.contains("Wayland") => "wayland",
        Some(n) if n.contains("X11") => "x11",
        _ => "unbekannt",
    }
}
#[cfg(not(target_os = "linux"))]
pub fn sitzung() -> &'static str {
    "windows"
}

/// Linux: Gibt es einen Tray-Dienst (StatusNotifierWatcher auf dem Sitzungs-Bus)?
#[cfg(target_os = "linux")]
pub fn tray_dienst() -> bool {
    let Ok(c) = zbus::blocking::Connection::session() else { return false };
    c.call_method(Some("org.freedesktop.DBus"), "/org/freedesktop/DBus", Some("org.freedesktop.DBus"), "NameHasOwner", &("org.kde.StatusNotifierWatcher",))
        .ok()
        .and_then(|m| m.body().deserialize::<bool>().ok())
        .unwrap_or(false)
}
#[cfg(not(target_os = "linux"))]
pub fn tray_dienst() -> bool {
    true
}

/// plattform_info: was geht auf diesem System – mit einem Satz Begründung, wo etwas fehlt oder eingeschränkt ist.
pub fn info(st: &Labor, hotkey_ok: bool) -> Value {
    let s = st.sitzung;
    let wayland = s == "wayland";
    let mut kann = serde_json::Map::new();
    let mut gruende = serde_json::Map::new();
    let mut setze = |f: &str, ja: bool, grund: Option<&str>| {
        kann.insert(f.into(), json!(ja));
        if let Some(g) = grund {
            gruende.insert(f.into(), json!(g));
        }
    };
    setze("leiste", true, wayland.then_some("Unter Wayland platziert der Desktop die Leiste selbst; verschiebe sie mit der Maus an den Rand."));
    setze("immerOben", st.kann_oben, (!st.kann_oben).then_some("Wayland erlaubt Programmen nicht, sich selbst im Vordergrund zu halten. Nutze dafür das Fenstermenü deines Desktops."));
    setze("tray", st.tray_ok, (!st.tray_ok).then_some("Kein Tray-Dienst gefunden. Unter GNOME braucht es die Erweiterung „AppIndicator and KStatusNotifierItem Support“. Schließen beendet das Programm deshalb."));
    setze("autostart", true, (s != "windows").then_some("Legt einen Eintrag in ~/.config/autostart an; das wirkt nur in Desktops, die diesen Ordner beachten (GNOME, KDE)."));
    let hk = hotkey_ok && !wayland;
    setze("hotkey", hk, (!hk).then_some(if wayland {
        "Unter Wayland gibt es keine globalen Tastenkürzel für Programme. Nutze das Tray-Menü."
    } else {
        "Das Tastenkürzel Strg+Alt+L ist schon belegt oder das System lässt es nicht zu. Nutze das Tray-Menü."
    }));
    setze("klickdurch", false, Some("Noch nicht eingebaut: Die Leiste besteht fast nur aus Bedienelementen. Zum Ausblenden: Strg+Alt+L oder „Ruhe 1 h“ im Tray-Menü."));
    let vb = s == "windows";
    setze("vollbildErkennen", vb, (!vb).then_some("Unter Linux erkennt das Programm Vollbild und Präsentation nicht. Blende die Leiste bei Bedarf aus."));
    setze("benachrichtigen", false, Some("Systemmitteilungen sind nicht eingebaut. Neue Tickets zeigt der Punkt am Tray-Symbol – ohne Ton und ohne Pop-up."));
    json!({
        "os": std::env::consts::OS, "sitzung": s, "version": env!("CARGO_PKG_VERSION"),
        "datenordner": st.ordner.display().to_string(), "test": st.test, "selbsttest": st.selbsttest,
        "kann": kann, "gruende": gruende,
    })
}
