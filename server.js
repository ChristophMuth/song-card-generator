import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import QRCode from 'qrcode'
import PDFDocument from 'pdfkit'
import SpotifyWebApi from 'spotify-web-api-node'
import cors from 'cors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('.'))

// Layout parameters (same as original)
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

const TEXT_PADDING_X = 16
const TEXT_PADDING_Y = 16

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

// Functions from original index.js
async function getAllPlaylistTracks(spotifyApi, playlistId) {
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

async function generatePdf(tracks) {
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

  // Create PDF in memory
  const chunks = []
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false })
  
  doc.on('data', chunk => chunks.push(chunk))
  
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

      // Background image
      const bgPath = path.join(__dirname, 'img', 'qr_bg.png')
      if (fs.existsSync(bgPath)) {
        doc.image(bgPath, x, y, {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        })
      } else {
        // Fallback background color
        doc.save()
        doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT)
        doc.fill('#f0f0f0')
        doc.restore()
      }

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

      // Random background color
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      doc.save()
      doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT)
      doc.fill(color)
      doc.restore()

      const innerX = x + TEXT_PADDING_X
      const innerWidth = CARD_WIDTH - 2 * TEXT_PADDING_X
      const t = pageTracks[idx]

      // Artist (top)
      const artistFontSize = 14
      const mediumFontPath = path.join(__dirname, 'fonts', 'Sunflower-Medium.ttf')
      if (fs.existsSync(mediumFontPath)) {
        doc.font(mediumFontPath).fontSize(artistFontSize)
      } else {
        doc.fontSize(artistFontSize)
      }
      doc.fillColor('#000000')
      doc.text(t.artist, innerX, y + TEXT_PADDING_Y + 4, {
        width: innerWidth,
        align: 'center',
      })

      // Year (center)
      const yearFontSize = 42
      const yearY = y + CARD_HEIGHT / 2 - yearFontSize / 2
      const boldFontPath = path.join(__dirname, 'fonts', 'Sunflower-Bold.ttf')
      if (fs.existsSync(boldFontPath)) {
        doc.font(boldFontPath).fontSize(yearFontSize)
      } else {
        doc.fontSize(yearFontSize)
      }
      doc.text(t.year, innerX, yearY, {
        width: innerWidth,
        align: 'center',
      })

      // Title (bottom)
      const titleFontSize = 14
      const lightFontPath = path.join(__dirname, 'fonts', 'Sunflower-Light.ttf')
      if (fs.existsSync(lightFontPath)) {
        doc.font(lightFontPath).fontSize(titleFontSize)
      } else {
        doc.fontSize(titleFontSize)
      }
      const titleHeight = doc.heightOfString(t.title, { width: innerWidth, align: 'center' })

      const bottomLimitY = y + CARD_HEIGHT - TEXT_PADDING_Y - titleHeight
      const minAboveYearY = yearY + yearFontSize + 2
      const titleStartY = Math.max(bottomLimitY, minAboveYearY)

      doc.text(t.title, innerX, titleStartY, { width: innerWidth, align: 'center' })
    }
  }

  doc.end()
  
  return new Promise((resolve) => {
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks)
      resolve(pdfBuffer)
    })
  })
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.post('/api/generate', async (req, res) => {
  try {
    const { clientId, clientSecret, playlistId } = req.body

    if (!clientId || !clientSecret || !playlistId) {
      return res.status(400).json({ error: 'Missing required credentials' })
    }

    // Initialize Spotify API
    const spotifyApi = new SpotifyWebApi({
      clientId: clientId,
      clientSecret: clientSecret,
    })

    // Get access token
    const auth = await spotifyApi.clientCredentialsGrant()
    spotifyApi.setAccessToken(auth.body['access_token'])

    // Get playlist tracks
    const tracks = await getAllPlaylistTracks(spotifyApi, playlistId)
    
    if (!tracks.length) {
      return res.status(400).json({ error: 'No tracks found in the playlist' })
    }

    // Generate PDF
    const pdfBuffer = await generatePdf(tracks)

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename=song_cards.pdf')
    res.setHeader('Content-Length', pdfBuffer.length)
    res.send(pdfBuffer)

  } catch (error) {
    console.error('Error generating cards:', error)
    res.status(500).json({ 
      error: error.message || 'Failed to generate song cards' 
    })
  }
})

app.listen(PORT, () => {
  console.log(`🎵 Song Card Generator server running at http://localhost:${PORT}`)
  console.log('Open your browser and navigate to the URL above to get started!')
})
