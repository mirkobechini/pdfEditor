# Feature: Icona App + Branding

**Issue:** — _(da creare)_
**Branch:** `feature/<numero>-icona-app-branding`

## Obiettivo

Sostituire il default favicon di Next.js con un logo personalizzato per il progetto. Il logo deve essere unico e coerente su web (favicon, navbar), desktop (icona app Tauri) e futuro mobile. Disegnato con Penpot.

## Dipendenze

- Nessuna — può partire subito o essere incluso nella Issue #0 (Prototipo Penpot)

## Stack

| Componente        | Tecnologia                                                   |
| ----------------- | ------------------------------------------------------------ |
| **Design**        | Penpot (MCP)                                                 |
| **Icone desktop** | Tauri icons (1024×1024 PNG → generate per .ico, .icns, .png) |
| **Favicon web**   | SVG + ico + PNG multi-size                                   |
| **Navbar logo**   | SVG inline o PNG in React component                          |

## Output atteso

| Formato          | Dove va                                                    | Dimensione       |
| ---------------- | ---------------------------------------------------------- | ---------------- |
| SVG              | `frontend/public/favicon.svg` + `frontend/public/logo.svg` | Scalabile        |
| ICO              | `frontend/public/favicon.ico`                              | 32×32            |
| PNG (multi-size) | `frontend/public/icon-{192,512}.png`                       | 192×192, 512×512 |
| PNG 1024×1024    | `desktop/src-tauri/icons/`                                 | 1024×1024        |
| ICO Windows      | Generato da Tauri icons                                    | —                |
| ICNS macOS       | Generato da Tauri icons                                    | —                |
| PNG Linux        | Generato da Tauri icons                                    | —                |

## Sotto-task

### 1. Design icona (Penpot)

- [ ] Creare design logo in Penpot
- [ ] Esportare SVG + PNG 1024×1024
- [ ] Approvare con utente

### 2. Web

- [ ] Sostituire `favicon.ico` e `favicon.svg` in `frontend/public/`
- [ ] Aggiungere `<link rel="icon">` e `<link rel="apple-touch-icon">` in layout
- [ ] Aggiungere logo in navbar (componente React)
- [ ] Verificare su browser (tab, bookmark, homescreen Android/iOS)

### 3. Desktop

- [ ] Copiare PNG 1024×1024 in `desktop/src-tauri/icons/`
- [ ] Generare icone multi-formato con `npx tauri icon`
- [ ] Verificare su Windows, macOS, Linux

### 4. Mobile (futuro)

- [ ] Esportare asset da Penpot per React Native
- [ ] Aggiungere icone per Google Play e App Store

## Status

[ ] Non iniziata
