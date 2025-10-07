// save as hitster_cards_generate.js
import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import PDFDocument from 'pdfkit'
import SpotifyWebApi from 'spotify-web-api-node'
import dotenv from 'dotenv'

dotenv.config()

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const PLAYLIST_ID = process.env.PLAYLIST_ID

// === Layout-Parameter ===
const CARD_WIDTH_MM = 67
const CARD_HEIGHT_MM = 67
const GAP_MM = 0
const MARGIN_MM = 4

const MM_TO_PT = 2.83465
const CARD_WIDTH = CARD_WIDTH_MM * MM_TO_PT
const CARD_HEIGHT = CARD_HEIGHT_MM * MM_TO_PT
const GAP = GAP_MM * MM_TO_PT
const MARGIN = MARGIN_MM * MM_TO_PT

const CARDS_PER_ROW = 3
const CARDS_PER_COL = 4
const CARDS_PER_PAGE = CARDS_PER_ROW * CARDS_PER_COL

// Inner padding inside each card (points)
const TEXT_PADDING_X = 16
const TEXT_PADDING_Y = 16

// Farben mit hohem Kontrast zu Schwarz
const COLORS = [
  '#ffd966', // kräftiges Gelb
  '#ff9999', // warmes Rotrosa
  '#99ccff', // kräftiges Hellblau
  '#99e699', // frisches Grün
  '#ffcc99', // kräftiges Apricot
  '#c299ff', // kräftiges Violett
  '#ffb3d9', // kräftiges Pink
  '#b3f0ff', // Türkisblau
]

// === Spotify client ===
const spotifyApi = new SpotifyWebApi({
  clientId: SPOTIFY_CLIENT_ID,
  clientSecret: SPOTIFY_CLIENT_SECRET,
})

async function getAllPlaylistTracks(playlistId) {
  const limit = 100
  let offset = 0
  let all = []

  while (true) {
    const resp = await spotifyApi.getPlaylistTracks(playlistId, { offset, limit })
    const items = resp.body.items || []
    if (items.length === 0) break
    all = all.concat(items)
    if (items.length < limit) break
    offset += limit
  }

  return all
    .filter((item) => item.track && item.track.album)
    .map((item) => ({
      title: item.track.name?.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ') || '',
      artist: (item.track.artists || []).map((a) => a.name).join(', '),
      year: item.track.album?.release_date?.slice(0, 4) ?? '',
      url: item.track.external_urls?.spotify ?? '',
    }))
}

async function generatePdf(tracks, outPath) {
  const qrDataUrls = await Promise.all(
    tracks.map((t) =>
      QRCode.toDataURL(t.url, {
        color: {
          dark: '#000000',
          light: '#0000',
        },
      })
    )
  )

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false })
  const outStream = fs.createWriteStream(outPath)
  doc.pipe(outStream)

  for (let pageStart = 0; pageStart < tracks.length; pageStart += CARDS_PER_PAGE) {
    const pageTracks = tracks.slice(pageStart, pageStart + CARDS_PER_PAGE)
    const pageQr = qrDataUrls.slice(pageStart, pageStart + CARDS_PER_PAGE)

    // --- FRONT PAGE: QR-Cards ---
    doc.addPage({ size: 'A4', margin: 0 })
    for (let idx = 0; idx < pageTracks.length; idx++) {
      const col = idx % CARDS_PER_ROW
      const row = Math.floor(idx / CARDS_PER_ROW)
      const x = MARGIN + col * (CARD_WIDTH + GAP)
      const y = MARGIN + row * (CARD_HEIGHT + GAP)

      // Hintergrund-Bild
      doc.image('img/qr_bg.png', x, y, {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
      })

      const qrPadding = 42
      const fitW = CARD_WIDTH - qrPadding * 2
      const fitH = CARD_HEIGHT - qrPadding * 2
      if (pageQr[idx]) {
        doc.image(pageQr[idx], x + qrPadding, y + qrPadding, {
          fit: [fitW, fitH],
          align: 'center',
          valign: 'center',
        })
      }
    }

    // --- BACK PAGE: Text-Cards ---
    doc.addPage({ size: 'A4', margin: 0 })
    for (let idx = 0; idx < pageTracks.length; idx++) {
      const origCol = idx % CARDS_PER_ROW
      const origRow = Math.floor(idx / CARDS_PER_ROW)
      const backCol = CARDS_PER_ROW - 1 - origCol
      const backRow = origRow

      const x = MARGIN + backCol * (CARD_WIDTH + GAP)
      const y = MARGIN + backRow * (CARD_HEIGHT + GAP)

      // Zufällige Hintergrundfarbe
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      doc.save()
      doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT)
      doc.fill(color)
      doc.restore()

      const innerX = x + TEXT_PADDING_X
      const innerWidth = CARD_WIDTH - 2 * TEXT_PADDING_X
      const t = pageTracks[idx]

      // Interpret (oben)
      const artistFontSize = 14
      doc.font('fonts/Sunflower-Medium.ttf').fontSize(artistFontSize)
      doc.text(t.artist, innerX, y + TEXT_PADDING_Y + 4, {
        width: innerWidth,
        align: 'center',
      })

      // Jahr (zentriert)
      const yearFontSize = 42
      const yearY = y + CARD_HEIGHT / 2 - yearFontSize / 2
      doc.font('fonts/Sunflower-Bold.ttf').fontSize(yearFontSize).text(t.year, innerX, yearY, {
        width: innerWidth,
        align: 'center',
      })

      // Titel (unten, flexibel nach oben schieben bei Mehrzeiligkeit)
      const titleFontSize = 14
      doc.font('fonts/Sunflower-Light.ttf').fontSize(titleFontSize)
      const titleHeight = doc.heightOfString(t.title, { width: innerWidth, align: 'center' })

      const bottomLimitY = y + CARD_HEIGHT - TEXT_PADDING_Y - titleHeight
      const minAboveYearY = yearY + yearFontSize + 2
      const titleStartY = Math.max(bottomLimitY, minAboveYearY)

      doc.text(t.title, innerX, titleStartY, { width: innerWidth, align: 'center' })
    }
  }

  doc.end()
  await new Promise((res, rej) => {
    outStream.on('finish', res)
    outStream.on('error', rej)
  })
}

// === Main-run ===
;(async () => {
  try {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Bitte setze SPOTIFY_CLIENT_ID und SPOTIFY_CLIENT_SECRET in deiner .env')
    }

    const auth = await spotifyApi.clientCredentialsGrant()
    spotifyApi.setAccessToken(auth.body['access_token'])

    const tracks = await getAllPlaylistTracks(PLAYLIST_ID)
    if (!tracks.length) {
      console.log('Keine Tracks gefunden.')
      return
    }

    const outFile = path.resolve(process.cwd(), 'song_cards.pdf')
    await generatePdf(tracks, outFile)
    console.log('✅ PDF erstellt:', outFile)
    console.log("Druckhinweis: Duplex 'Flip on short edge' / 'Spiegeln an der kurzen Seite' verwenden.")
  } catch (err) {
    console.error('Fehler:', err.message || err)
  }
})()
