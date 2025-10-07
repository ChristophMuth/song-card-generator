# 🎵 Song Card Generator

Dieses Projekt erzeugt eine **druckfertige PDF-Erweiterung** für ein bekannten Musikratespiels.  
Es werden Karten mit **QR-Codes zu Spotify-Songs** (Vorderseite) und **Song-Infos (Interpret, Jahr, Titel)** (Rückseite) generiert, sodass man eigene Playlists in das Spiel integrieren kann.

---

## ✨ Features

- Liest Songs aus einer **Spotify-Playlist** über die Spotify Web API.
- Erstellt **Karten mit 65×65 mm** Größe (passt ins HITSTER-Format).
- **12 Karten pro A4-Seite** (3 Spalten × 4 Reihen).
- **Abwechselnd Vorder- und Rückseiten** für Duplexdruck (beidseitig).
- Rückseiten sind **horizontal gespiegelt**, damit sie exakt passen (Duplex „Flip on short edge“).
- QR-Codes verlinken direkt auf die Songs bei Spotify.
- Interpret oben, Jahr mittig (fett), Titel unten.

---

## 🚀 Voraussetzungen

- Ein Spotify Developer Account, um eine App zu erstellen und Client ID/Secret zu erhalten
- .env.template nach .env umbenennen und mit den eigenen Spotify API Credentials füllen

## 📦 Installation

    npm i

## 🎮 Nutzung

    node index.js

## 🚀 Start

    npm run start
