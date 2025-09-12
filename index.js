import SpotifyWebApi from 'spotify-web-api-node';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

const playlistId = process.env.PLAYLIST_ID;

// Kartenlayout auf A4
const CARDS_PER_ROW = 4;       // 4 Karten pro Reihe
const CARDS_PER_COLUMN = 6;    // 6 Karten pro Spalte
const CARDS_PER_PAGE = CARDS_PER_ROW * CARDS_PER_COLUMN;
const PAGE_WIDTH = 595.28;     // DIN A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 10;
const CARD_WIDTH = (PAGE_WIDTH - MARGIN * 2) / CARDS_PER_ROW;
const CARD_HEIGHT = (PAGE_HEIGHT - MARGIN * 2) / CARDS_PER_COLUMN;

async function main() {
    // Authentifizieren
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);

    // Playlist Tracks abrufen
    const playlistData = await spotifyApi.getPlaylistTracks(playlistId, { limit: 100 });
    const tracks = playlistData.body.items.map(item => {
        const track = item.track;
        return {
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            year: track.album.release_date.split('-')[0],
            url: track.external_urls.spotify,
        };
    });

    // PDF erstellen
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(fs.createWriteStream('hitster_cards.pdf'));

    // Vorderseiten (QR-Code)
    for (let i = 0; i < tracks.length; i += CARDS_PER_PAGE) {
        const pageTracks = tracks.slice(i, i + CARDS_PER_PAGE);
        doc.addPage({ size: 'A4', margin: 0 });

        for (let j = 0; j < pageTracks.length; j++) {
            const track = pageTracks[j];
            const qrDataUrl = await QRCode.toDataURL(track.url);

            const col = j % CARDS_PER_ROW;
            const row = Math.floor(j / CARDS_PER_ROW);
            const x = MARGIN + col * CARD_WIDTH;
            const y = MARGIN + row * CARD_HEIGHT;

            // Rahmen um Karte
            doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT).stroke();

            // QR-Code zentriert
            const qrSize = Math.min(CARD_WIDTH, CARD_HEIGHT) * 0.8;
            doc.image(qrDataUrl, x + (CARD_WIDTH - qrSize) / 2, y + (CARD_HEIGHT - qrSize) / 2, { width: qrSize, height: qrSize });
        }
    }

    // Rückseiten (Songinfos, vertikal zentriert)
    for (let i = 0; i < tracks.length; i += CARDS_PER_PAGE) {
        const pageTracks = tracks.slice(i, i + CARDS_PER_PAGE);
        doc.addPage({ size: 'A4', margin: 0 });

        for (let j = 0; j < pageTracks.length; j++) {
            const track = pageTracks[j];

            const col = j % CARDS_PER_ROW;
            const row = Math.floor(j / CARDS_PER_ROW);
            const x = MARGIN + col * CARD_WIDTH;
            const y = MARGIN + row * CARD_HEIGHT;

            // Rahmen um Karte
            doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT).stroke();

            // Textgrößen
            const artistSize = 12;
            const yearSize = 18;
            const titleSize = 12;
            const spacing = 5; // Abstand zwischen Textzeilen

            // Gesamthöhe des Textblocks berechnen
            const textHeight = artistSize + spacing + yearSize + spacing + titleSize;

            // Start-y für vertikale Zentrierung
            const startY = y + (CARD_HEIGHT - textHeight) / 2;

            const textX = x;
            const textWidth = CARD_WIDTH;

            doc.fontSize(artistSize).text(track.artist, textX, startY, { width: textWidth, align: 'center' });
            doc.fontSize(yearSize).text(track.year, textX, startY + artistSize + spacing, { width: textWidth, align: 'center' });
            doc.fontSize(titleSize).text(track.title, textX, startY + artistSize + spacing + yearSize + spacing, { width: textWidth, align: 'center' });
        }
    }

    doc.end();
    console.log('PDF mit 24 Kärtchen pro A4-Seite (4x6), Rahmen und vertikal zentriertem Text erstellt: hitster_cards.pdf');
}

main().catch(console.error);
