# Project Brief: tour360

> Lebendes Konzept-Dokument. Wird mit jeder geklärten Architektur-Entscheidung
> aktualisiert. Bei Konflikt mit dem Code: Code gewinnt, Brief anpassen.

---

## Vision

Open-Source-Web-App, mit der man virtuelle 360°-Touren erstellen, gestalten
und teilen kann. Funktional an [Kuula](https://kuula.co/) angelehnt, aber:

- Komplett ohne Lizenzkosten
- Self-hostbar (eigenes GitHub Pages, Netlify, Server)
- Volle Kontrolle über die eigenen Daten

Zielnutzer ist erst mal der Repo-Eigentümer selbst – wenn das Projekt sauber
läuft, später offen für andere.

## Inspiration & Abgrenzung

**Was Kuula gut macht (übernehmen):**
- Klare Tour-Editor-Oberfläche mit Drag-and-Drop für Bilder
- Hotspots als Verknüpfungen zwischen Panoramen
- Embed-Code für Webseiten
- Mobile-Wiedergabe ohne Plugin

**Was wir bewusst NICHT übernehmen (zumindest erstmal):**
- VR-Headset-Support
- Komplexe User-Verwaltung
- Cloud-Storage als Pflichtkomponente
- Premium-Features hinter Paywall

## Use Cases (priorisiert)

1. **Hobby-Fotograf** zeigt eine Wanderung als Tour mit mehreren Stationen
2. **Immobilienmakler** zeigt Wohnung/Haus mit verknüpften Räumen
3. **Hotelier oder Gastgeber** zeigt seine Räume + Außenbereich
4. **Museum / Ausstellung / Event** zeigt Raum-Übersicht mit Hotspots zu Exponaten

## Phasenplanung

### Phase 1 – MVP (Single-User, lokal)
- Foto-Upload (equirectangular 2:1 Bilder)
- Anzeige eines einzelnen 360°-Panoramas
- Speichern einer Tour als JSON
- Laden einer Tour über URL-Parameter oder Tour-Auswahl
- Mobile-Responsive

### Phase 2 – Touren-Editor
- Mehrere Panoramen zu einer Tour verbinden
- Hotspots setzen (zu anderen Panoramen, externe Links, Info-Texte)
- Tour-Metadaten (Titel, Beschreibung, Vorschau-Bild)
- Embed-Snippet generieren

### Phase 3 – Sharing & Hosting
- Tour-Veröffentlichung über GitHub Pages oder ähnliche Static-Hosts
- Tour-Bibliothek (eigene Touren auflisten)
- Optional: Backend für Cloud-Storage, Sharing-Links

### Out of Scope (zumindest in Phase 1–3)
- Echtzeit-Kollaboration
- Kommentare unter Touren
- Bezahlfunktionen
- VR-Headset-Modus
- Foto-Stitching (User liefert bereits equirectangulare Bilder)

## Tech-Stack (geplant)

| Bereich | Vorschlag | Lizenz | Alternative |
|---------|-----------|--------|-------------|
| 360°-Viewer | **Pannellum** | MIT | Marzipano (Apache 2.0) |
| Sprache | Vanilla JS (ES2022+) | – | – |
| Build | keiner zum Start, später ggf. Vite | MIT | – |
| Styling | Vanilla CSS mit Custom Properties | – | – |
| Testing | Vitest + Playwright | MIT / Apache 2.0 | – |
| Hosting (MVP) | GitHub Pages oder Netlify | – | – |

### Warum Pannellum (MVP-Empfehlung)
- Sehr leichtgewichtig (~50kB)
- Direkt im Browser ohne Build-Step
- Native Hotspot-Unterstützung
- Aktive Maintenance, breite Browser-Kompatibilität
- MIT-Lizenz

### Warum kein Framework am Anfang
- 360°-Viewer-Logik ist überschaubar
- Keine Build-Tools nötig → einfacheres Setup
- Wenn das Projekt wächst und State-Management komplex wird, kann
  später Svelte oder Vue dazukommen – aber bewusst, nicht reflexartig

---

## Offene Architektur-Entscheidungen

Diese Punkte sollten beim ersten Codex-Lauf mit dem Repo-Eigentümer geklärt
werden, bevor entsprechender Code geschrieben wird.

### 1. 360°-Viewer-Library
- **Vorschlag:** Pannellum (MIT)
- **Alternative:** Marzipano (Apache 2.0, näher an Kuula in puncto Features)
- **Status:** entschieden: Pannellum bleibt die empfohlene Viewer-Library für den späteren echten 360°-Renderer. Der erste Code-Schritt nutzt noch keine externe Dependency und kapselt die aktuelle Panorama-Darstellung in `src/js/viewer.js`, damit Pannellum später ohne Datenmodellbruch angeschlossen werden kann.

### 2. Backend ja/nein in Phase 1
- **Vorschlag:** Nein. Pure Frontend, Touren als JSON im public-Ordner, Bilder als Files daneben.
- **Konsequenz dieser Wahl:** GitHub-Pages-tauglich, kein Server-Setup, aber:
  Foto-Upload geht nur lokal (User legt Datei im public-Ordner ab), kein Cloud-Sharing.
- **Status:** entschieden: Phase 1 startet als reines statisches Frontend ohne Backend. Tour-Daten liegen unter `public/tours/<tour-id>/tour.json`, damit die App direkt über Static Hosting lauffähig bleibt.

### 3. Tour-Persistenz
- **Optionen:**
  - JSON-Datei im Repo (versionierbar, GitHub-Pages-tauglich)
  - LocalStorage (browser-lokal, kein Sharing)
  - IndexedDB (für größere Touren mit vielen Bildern)
- **Vorschlag MVP:** JSON-Datei im Repo
- **Status:** entschieden: MVP-Touren werden zunächst als JSON-Dateien im Repo geladen. LocalStorage/IndexedDB bleiben spätere Optionen für Editor-Zwischenspeicher, sind aber nicht Teil des ersten Viewers.

### 4. Foto-Upload-Mechanismus in Phase 1
- Da pure Frontend: Drag-and-Drop ins Editor-UI, Verarbeitung im Browser,
  resultierende Datei wird vom User in `public/tours/<tour-id>/images/` gespeichert
- **Status:** offen (insb. die UX rund um „User muss Datei selbst ablegen")

### 5. URL-Routing
- **Optionen:**
  - Query-Parameter (`?tour=xxx`)
  - Hash-Routing (`#/tour/xxx`)
  - Echtes Routing (braucht Build / Backend)
- **Vorschlag MVP:** Hash-Routing
- **Status:** entschieden: Hash-Routing (`#/tour/<id>`) wird für den statischen MVP-Viewer genutzt, damit GitHub Pages ohne Server-Fallback funktioniert.

### 6. Editor vs. Viewer
- Eine einzelne `index.html` mit Mode-Switch, oder zwei getrennte HTMLs
  (`index.html` als Viewer, `editor.html` als Editor)?
- **Vorschlag:** zwei getrennte HTMLs – sauberer Code, weniger Bundle für reine Viewer-Aufrufe
- **Status:** vorläufig entschieden: `index.html` startet als Viewer. Ein separates `editor.html` bleibt für Phase 2 sinnvoll, sobald Editor-Funktionen tatsächlich umgesetzt werden.

---

## Nicht-funktionale Anforderungen

- **Performance:** Tour-Wechsel unter 500ms (lokal). Erstes Panorama unter 2s (gute Verbindung).
- **Zugänglichkeit:** Tastatur-Navigation funktioniert. alt-Texte für Bilder. Hotspots haben ARIA-Labels.
- **Mobile:** Touch-Gesten (Drag/Pinch) für Panorama-Navigation funktionieren auf iOS Safari und Chrome Android.
- **Browser:** letzte zwei Hauptversionen von Chrome, Firefox, Safari, Edge. Keine IE-Unterstützung.

## Erfolgskriterien für MVP

- Eine Tour mit 3 Panoramen und 2 Hotspots kann erstellt, gespeichert und im Browser angesehen werden.
- Die fertige Tour lässt sich über GitHub Pages oder Netlify veröffentlichen.
- Auf einem Smartphone funktioniert die Anzeige sauber.
- Kein einziges Stück Code mit nicht-permissiver Lizenz im Repo.
