# 🎵 Song Card Generator

Generate beautiful printable song cards from your Spotify playlists! This tool creates PDF cards with QR codes on one side and song information (artist, year, title) on colorful backgrounds on the other side - perfect for music games like Hitster.

## ✨ Features

- **Beautiful Web Interface**: Easy-to-use HTML interface for entering Spotify credentials
- **Spotify Integration**: Fetches tracks directly from your Spotify playlists
- **QR Code Generation**: Creates QR codes linking to Spotify tracks
- **Print-Ready PDFs**: Generates properly formatted cards for duplex printing
- **Colorful Design**: Random background colors for each card's back side
- **Custom Fonts**: Uses beautiful Sunflower font family

## 🚀 Quick Start

### Web Interface (Recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

4. **Get Spotify credentials:**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Copy your Client ID and Client Secret

5. **Generate cards:**
   - Enter your Spotify credentials in the web form
   - Enter your playlist ID (from the Spotify playlist URL)
   - Click "Generate Song Cards"
   - The PDF will automatically download in your browser!

### Command Line Interface (Alternative)

You can still use the original command-line version:

1. **Create a `.env` file:**
   ```env
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   PLAYLIST_ID=your_playlist_id_here
   ```

2. **Run the generator:**
   ```bash
   npm run cli
   ```

## 📋 How to Get Spotify Credentials

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the app details (name, description)
5. Copy your **Client ID** and **Client Secret**

## 🎯 How to Get Playlist ID

1. Open your playlist in Spotify (web or app)
2. Click "Share" → "Copy link to playlist"
3. Extract the ID from the URL:
   - From: `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`
   - ID is: `37i9dQZF1DXcBWIGoYBM5M`

## 🖨️ Printing Instructions

For best results when printing your song cards:

1. **Paper**: Use cardstock or thick paper (200-300gsm)
2. **Print Settings**: 
   - Select "Duplex" or "Double-sided"
   - Choose "Flip on short edge" / "Spiegeln an der kurzen Seite"
3. **Cutting**: Cut along the card boundaries to separate individual cards

## 📁 Project Structure

```
song-card-generator/
├── index.html             # Web interface
├── server.js              # Express server with PDF generation
├── index.js               # Command-line version
├── fonts/                 # Sunflower font files
│   ├── Sunflower-Bold.ttf
│   ├── Sunflower-Light.ttf
│   └── Sunflower-Medium.ttf
├── img/
│   └── qr_bg.png         # QR code background image
└── package.json
```

## 🛠️ Technical Details

- **Frontend**: Modern HTML5 with responsive CSS and vanilla JavaScript
- **Backend**: Node.js with Express.js server
- **PDF Generation**: Server-side PDF generation using PDFKit
- **QR Codes**: Server-side QR code generation using npm qrcode library
- **Spotify API**: Server-side API calls using spotify-web-api-node
- **File Download**: Direct browser download of generated PDFs

## 📦 Dependencies

- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `spotify-web-api-node` - Spotify Web API wrapper
- `pdfkit` - PDF generation
- `qrcode` - QR code generation
- `dotenv` - Environment variable management

## 🎮 Game Ideas

These cards are perfect for music guessing games:

1. **Hitster Style**: Play the song via QR code, guess the year
2. **Artist Challenge**: Show the year and title, guess the artist
3. **Timeline Game**: Arrange songs chronologically
4. **Memory Game**: Match QR codes with song information

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Dieses Projekt erzeugt eine **druckfertige PDF-Erweiterung** für ein bekanntes Musikratespiel.  
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
