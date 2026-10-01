//! Tray-Symbol: Punkt bei neuen Tickets (ohne Ton, ohne Pop-up), Tooltip „2 Tickets · 38 €/h“,
//! Linksklick = Leiste ein/aus, Menü: Öffnen, Leiste, Ruhe 1 h, Immer oben, Autostart, Beenden.
use crate::{fenster, Labor};
use std::{
    sync::atomic::Ordering::SeqCst,
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{
    image::Image,
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Wry,
};

const ICON: &[u8] = include_bytes!("../icons/tray.png");
const ICON_PUNKT: &[u8] = include_bytes!("../icons/tray-punkt.png");
const RUHE_S: u64 = 3600;

pub struct TrayTeile {
    oben: CheckMenuItem<Wry>,
    ruhe: CheckMenuItem<Wry>,
    autostart: CheckMenuItem<Wry>,
}

fn jetzt_s() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

pub fn einrichten(app: &AppHandle, oben: bool, autostart: bool) -> tauri::Result<()> {
    let oeffnen = MenuItem::with_id(app, "oeffnen", "Netzwerk-Labor öffnen", true, None::<&str>)?;
    let leiste = MenuItem::with_id(app, "leiste", "Leiste ein/aus (Strg+Alt+L)", true, None::<&str>)?;
    let ruhe_i = CheckMenuItem::with_id(app, "ruhe", "Ruhe 1 h", true, false, None::<&str>)?;
    let oben_i = CheckMenuItem::with_id(app, "oben", "Leiste immer im Vordergrund", true, oben, None::<&str>)?;
    let auto_i = CheckMenuItem::with_id(app, "autostart", "Mit dem System starten", true, autostart, None::<&str>)?;
    let beenden = MenuItem::with_id(app, "beenden", "Beenden", true, None::<&str>)?;
    let t1 = PredefinedMenuItem::separator(app)?;
    let t2 = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&oeffnen, &leiste, &t1, &ruhe_i, &oben_i, &auto_i, &t2, &beenden])?;
    TrayIconBuilder::with_id("haupt")
        .icon(Image::from_bytes(ICON)?)
        .tooltip("Netzwerk-Labor")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, ev| match ev.id().as_ref() {
            "oeffnen" => {
                ruhe(app, false);
                let _ = fenster::modus(app, "voll", true);
            }
            "leiste" => fenster::umschalten(app, "tray-klick"),
            "ruhe" => {
                let an = app.state::<Labor>().ruhe_bis.load(SeqCst) == 0;
                ruhe(app, an);
            }
            "oben" => {
                let an = !app.state::<Labor>().merker.lock().unwrap().immer_oben;
                fenster::immer_oben(app, an);
            }
            "autostart" => {
                use tauri_plugin_autostart::ManagerExt;
                let m = app.autolaunch();
                let an = !m.is_enabled().unwrap_or(false);
                let _ = if an { m.enable() } else { m.disable() };
                haken(app, "autostart", m.is_enabled().unwrap_or(false));
            }
            "beenden" => fenster::beenden_anfragen(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, ev| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = ev {
                fenster::umschalten(tray.app_handle(), "tray-klick");
            }
        })
        .build(app)?;
    app.manage(TrayTeile { oben: oben_i, ruhe: ruhe_i, autostart: auto_i });
    Ok(())
}

/// Häkchen im Tray-Menü nachziehen (z. B. wenn die Einstellung aus der Seite kommt)
pub fn haken(app: &AppHandle, id: &str, an: bool) {
    let Some(t) = app.try_state::<TrayTeile>() else { return };
    let item = match id {
        "oben" => &t.oben,
        "ruhe" => &t.ruhe,
        "autostart" => &t.autostart,
        _ => return,
    };
    let _ = item.set_checked(an);
}

/// Ruhe 1 h: alles ausblenden, danach kommt die Leiste von selbst zurück (ruhe_waechter)
pub fn ruhe(app: &AppHandle, an: bool) {
    let Some(st) = app.try_state::<Labor>() else { return };
    let war = st.ruhe_bis.load(SeqCst) != 0;
    if an {
        st.ruhe_bis.store(jetzt_s() + RUHE_S, SeqCst);
    } else {
        st.ruhe_bis.store(0, SeqCst);
    }
    haken(app, "ruhe", an);
    if an {
        let _ = fenster::modus(app, "tray", true);
    }
    if an != war {
        let _ = app.emit("ruhe", an);
    }
}

pub fn ruhe_waechter(app: AppHandle) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(20));
        let Some(st) = app.try_state::<Labor>() else { continue };
        let bis = st.ruhe_bis.load(SeqCst);
        if bis != 0 && jetzt_s() >= bis {
            ruhe(&app, false);
            let _ = fenster::modus(&app, "leiste", true);
        }
    });
}

/// Neue Tickets: nur Punkt am Symbol und Tooltip – kein Ton, kein Pop-up, kein Fokus
pub fn abzeichen(app: &AppHandle, n: u32, text: &str) {
    let Some(st) = app.try_state::<Labor>() else { return };
    let punkt = n > 0;
    let alt = st.punkt.swap(punkt, SeqCst);
    let tip = if text.is_empty() { "Netzwerk-Labor".to_string() } else { format!("Netzwerk-Labor – {text}") };
    *st.tooltip.lock().unwrap() = tip.clone();
    if let Some(t) = app.tray_by_id("haupt") {
        if alt != punkt {
            if let Ok(img) = Image::from_bytes(if punkt { ICON_PUNKT } else { ICON }) {
                let _ = t.set_icon(Some(img));
            }
        }
        let _ = t.set_tooltip(Some(&tip));
    }
}
