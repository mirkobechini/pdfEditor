# 📄 PdfEditor

**Edit, view and manage PDF files — cross-platform, offline-first, open source.**

[![Desktop latest](https://img.shields.io/github/v/release/mirkobechini/pdfEditor?label=desktop&logo=windows&filter=!*-mobile)](https://github.com/mirkobechini/pdfEditor/releases)
[![Mobile latest](https://img.shields.io/github/v/release/mirkobechini/pdfEditor?filter=*-mobile&label=mobile&logo=android)](https://github.com/mirkobechini/pdfEditor/releases)
[![License](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)

---

## 🚀 Platforms

- 🌐 **Web** — Next.js 16 + TailwindCSS v4
- 🖥️ **Desktop** — Tauri v2 (Windows, macOS, Linux) + PyInstaller sidecar
- 📱 **Mobile** — Expo SDK 57 + React Native (Android)

## ✨ Features

- 🔍 PDF viewer with zoom and page navigation
- 🔀 Merge multiple PDFs
- ✂️ Split PDF by page selection
- 📋 Reorder pages
- 🗑️ Remove pages from PDF
- 📝 Edit metadata (title, author)
- 📸 Camera scanner → PDF conversion
- 🌙 Dark mode
- 🔐 Email/password & guest authentication
- 🌐 Internationalization (IT/EN)

## ⬇️ Quick download

| Platform   | Latest version                                                                      |
| ---------- | ----------------------------------------------------------------------------------- |
| 🖥️ Desktop | [Download v0.1.35](https://github.com/mirkobechini/pdfEditor/releases/latest)       |
| 📱 Mobile  | [Download v0.1.0](https://github.com/mirkobechini/pdfEditor/releases) (APK Android) |

## 🛠️ Tech stack

### Backend

![FastAPI](https://img.shields.io/badge/FastAPI-005571?logo=fastapi&logoColor=white)
![PyMuPDF](https://img.shields.io/badge/PyMuPDF-FF6F00?logo=python&logoColor=white)
![Neon PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white)

### Web

![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=next.js&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS_v4-06B6D4?logo=tailwindcss&logoColor=white)

### Desktop

![Tauri](https://img.shields.io/badge/Tauri_v2-FFC131?logo=tauri&logoColor=black)
![Rust](https://img.shields.io/badge/Rust-000?logo=rust&logoColor=white)

### Mobile

![Expo](https://img.shields.io/badge/Expo_SDK_57-000?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-61DAFB?logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)

## 📚 Documentation

| File                                       | Content                                        |
| ------------------------------------------ | ---------------------------------------------- |
| [📋 BRIEF](./BRIEF.md)                     | Vision, roadmap and general decisions          |
| [🏗️ ADR](./ADR.md)                         | Architecture decisions (web, desktop, backend) |
| [📱 ADR Mobile](./mobile/ADR.md)           | Mobile architecture decisions                  |
| [📜 CHANGELOG](./CHANGELOG.md)             | Complete release history                       |
| [🐞 KNOWN_ISSUES](./KNOWN_ISSUES.md)       | Open bugs and technical debt                   |
| [📖 LESSONS_LEARNED](./LESSONS_LEARNED.md) | Lessons learned during development             |

## 📄 License

AGPL-3.0 — compatible with PyMuPDF. See [LICENSE](LICENSE) for details.
