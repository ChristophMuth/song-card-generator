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
const CARDS_PER_ROW = 4;
const CARDS_PER_COLUMN = 6;
const CARDS_PER_PAGE = CARDS_PER_ROW * CARDS_PER_COLUMN;
const PAGE_WIDTH = 595.28;  // DIN A4 in points
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 10;      // Abstand zum Seitenrand
const CARD_GAP = 4;          // Abstand zwischen Karten
const CARD_WIDTH = (PAGE_WIDTH - 2 * PAGE_MARGIN - (CARDS_PER_ROW - 1) * CARD_GAP) / CARDS_PER_ROW;
const CARD_HEIGHT = (PAGE_HEIGHT - 2 * PAGE_MARGIN - (CARDS_PER_COLUMN - 1) * CARD_GAP) / CARDS_PER_COLUMN;

// Padding innerhalb der Karten
const TEXT_PADDING_X = 8;  // links/rechts
const TEXT_PADDING_Y = 8;  // oben/unten

async function main() {
    // Spotify authentifizieren
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);

    // Playlist abrufen
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

    // --- Vorderseiten (QR-Code) ---
    for (let i = 0; i < tracks.length; i += CARDS_PER_PAGE) {
        const pageTracks = tracks.slice(i, i + CARDS_PER_PAGE);
        doc.addPage({ size: 'A4', margin: 0 });

        for (let j = 0; j < pageTracks.length; j++) {
            const track = pageTracks[j];
            const qrDataUrl = await QRCode.toDataURL(track.url);

            const col = j % CARDS_PER_ROW;
            const row = Math.floor(j / CARDS_PER_ROW);
            const x = PAGE_MARGIN + col * (CARD_WIDTH + CARD_GAP);
            const y = PAGE_MARGIN + row * (CARD_HEIGHT + CARD_GAP);

            // Rahmen um Karte
            doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT).stroke();

            // QR-Code zentrieren
            const qrSize = Math.min(CARD_WIDTH, CARD_HEIGHT) * 0.6;
            doc.image(qrDataUrl, x + (CARD_WIDTH - qrSize) / 2, y + (CARD_HEIGHT - qrSize) / 2, { width: qrSize, height: qrSize });
        }
    }

    // --- Rückseiten ---
    for (let i = 0; i < tracks.length; i += CARDS_PER_PAGE) {
        const pageTracks = tracks.slice(i, i + CARDS_PER_PAGE);
        doc.addPage({ size: 'A4', margin: 0 });

        for (let j = 0; j < pageTracks.length; j++) {
            const track = pageTracks[j];

            const col = j % CARDS_PER_ROW;
            const row = Math.floor(j / CARDS_PER_ROW);
            const x = PAGE_MARGIN + col * (CARD_WIDTH + CARD_GAP);
            const y = PAGE_MARGIN + row * (CARD_HEIGHT + CARD_GAP);

            // Rahmen um Karte
            doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT).stroke();

            const textWidth = CARD_WIDTH - 2 * TEXT_PADDING_X;

            // --- Interpret oben ---
            const artistFontSize = 12;
            doc.fontSize(artistFontSize).text(track.artist, x + TEXT_PADDING_X, y + TEXT_PADDING_Y, {
                width: textWidth,
                align: 'center',
            });

            // --- Jahreszahl fix in der Mitte, fett ---
            const yearFontSize = 18;
            const yearY = y + CARD_HEIGHT / 2 - yearFontSize / 2;
            doc.font('Helvetica-Bold').fontSize(yearFontSize).text(track.year, x + TEXT_PADDING_X, yearY, {
                width: textWidth,
                align: 'center',
            });

            // --- Titel unten, dynamisch nach oben, wenn mehrzeilig ---
            const titleFontSize = 12;
            doc.font('Helvetica').fontSize(titleFontSize);
            const titleHeight = doc.heightOfString(track.title, { width: textWidth, align: 'center' });
            const titleY = Math.max(y + CARD_HEIGHT - TEXT_PADDING_Y - titleHeight, yearY + yearFontSize + 2);
            doc.text(track.title, x + TEXT_PADDING_X, titleY, {
                width: textWidth,
                align: 'center',
            });
        }
    }

    doc.end();
    console.log('PDF erstellt: hitster_cards.pdf (Jahreszahl fett, Padding größer, 24 Kärtchen pro A4-Seite).');
}

main().catch(console.error);
