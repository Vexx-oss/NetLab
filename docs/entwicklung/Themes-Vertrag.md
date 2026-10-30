# Themes-Vertrag (2.3.1)

Fünf zusätzliche Themes zum POLARIS-Frontend. Jedes Theme ist eine eigene Stildatei
`src/stil/zzz-thema-<id>.css` und wird vom Bau automatisch nach `zz-polaris.css` eingebunden
(`bauen.py` sammelt alle `src/stil/*.css`, `basis.css` zuerst, danach alphabetisch).

## Technik

Jedes Theme definiert seine Tokens ausschließlich in einem Block
`:root[data-theme="<id>"]{ … }`. Der Selektor enthält `root`; damit gelten die Ethos-Regeln
R1–R5 für Token-Blöcke (Farb-/Schrift-/Abstands-/Zeit-/Längen-Literale sind dort erlaubt).

Zusätzliche Regeln außerhalb des Token-Blocks sind erlaubt, müssen aber mit
`html[data-theme="<id>"] …` beginnen (eindeutiger Selektor, keine Dopplung mit anderen Themes)
und dürfen nur `var(--…)`-Farben/Radien/Schriften verwenden (Ethos R1/R2/R3).

## Pflicht-Tokens (alle setzen)

Farben: `--bg --bg-raster --panel --panel-2 --panel-3 --line --line-2 --ink --muted --faint
--accent --accent-ink --accent-soft --mint --iris --amber --koralle
--ok --ok-soft --warn --warn-soft --bad --bad-soft --info --info-soft --geld --ruf
--glas --leiste-bg`
Form: `--radius --radius-s --radius-xs --schatten --glow`
Schrift: `--display --body --mono` (nur lokal vorhandene System-/Projektschriften, keine Web-Abrufe)
Optional: `--raster --bg-raster` für eigene Textur, `--p-*`, `--vlan-*`, `--zone-*`, `--typ-*`,
`--dauer-*`, `--ease-*`.

## Lesbarkeit (Pflicht)

- Fließtext `--ink` auf `--bg` und `--panel`: **≥ 7:1**, nie unter 4.5:1.
- `--muted` ≥ 4.5:1, `--faint` ≥ 4.5:1 auf `--bg`/`--panel`.
- Akzentfarben nur mit dunkler/heller passender `--accent-ink`-Paarung.
- Keine externen Assets, keine Webfonts, keine Bilder; Textur nur per CSS-Gradienten.

## Vorschau (ohne Repo-Bau)

1. `web/index.html` nach `%TEMP%` kopieren.
2. Die eigene CSS-Datei als `<style>` **vor dem letzten `</body>`** einhängen,
   dazu `setTimeout(() => document.documentElement.dataset.theme = "<id>", 900)`.
3. Edge headless: `--window-size=1466,993 --virtual-time-budget=6000 --screenshot=…`
   für Ansicht „heute" (Standard) und „labor" (Klick auf `.dock-knopf[data-ansicht="labor"]`).
4. PNGs unter `Nachweise/themes/<id>/` ablegen, mit `read_image` selbst prüfen und nachbessern.

## Abgabe je Theme

- `src/stil/zzz-thema-<id>.css` (einziger Schreibbereich im Code)
- `Nachweise/themes/<id>/DESIGN.md` (Vibe, Palette, Typo, Besonderheiten, Kontrastwerte, Referenzen)
- `Nachweise/themes/<id>/hub.png` und `labor.png` (1440), optional `hub-720.png`
