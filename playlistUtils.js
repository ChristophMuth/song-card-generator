import fs from 'fs'
import path from 'path'
import QRCode from 'qrcode'
import PDFDocument from 'pdfkit'

// Layout-Parameter und Konstanten
export const CARD_WIDTH_MM = 67
export const CARD_HEIGHT_MM = 67
export const GAP_MM = 0
export const MARGIN_MM = 4

export const MM_TO_PT = 2.83465
export const CARD_WIDTH = CARD_WIDTH_MM * MM_TO_PT
export const CARD_HEIGHT = CARD_HEIGHT_MM * MM_TO_PT
export const GAP = GAP_MM * MM_TO_PT
export const MARGIN = MARGIN_MM * MM_TO_PT

export const CARDS_PER_ROW = 3
export const CARDS_PER_COL = 4
export const CARDS_PER_PAGE = CARDS_PER_ROW * CARDS_PER_COL

export const TEXT_PADDING_X = 16
export const TEXT_PADDING_Y = 16

export const COLORS = [
  '#ffd966',
  '#ff9999',
  '#99ccff',
  '#99e699',
  '#ffcc99',
  '#c299ff',
  '#ffb3d9',
  '#b3f0ff',
]

// getAllPlaylistTracks benötigt eine SpotifyWebApi-Instanz und playlistId
export async function getAllPlaylistTracks(spotifyApi, playlistId) {
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

// generatePdf: tracks, optionale Parameter für Pfad, Fonts, bgPath
export async function generatePdf(tracks, options = {}) {
  const {
    outPath = null,
    fontDir = 'fonts',
    bgPath = 'img/qr_bg.png',
    useFsPaths = false,
    __dirname = null,
  } = options

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

  let doc
  let chunks = []
  if (outPath) {
    doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false })
    const outStream = fs.createWriteStream(outPath)
    doc.pipe(outStream)
  } else {
    doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false })
    doc.on('data', (chunk) => chunks.push(chunk))
  }

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
      let resolvedBgPath = bgPath
      if (__dirname && useFsPaths) {
        resolvedBgPath = path.join(__dirname, bgPath)
      }
      if (fs.existsSync(resolvedBgPath)) {
        doc.image(resolvedBgPath, x, y, {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        })
      } else {
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
      let mediumFontPath = path.join(fontDir, 'Sunflower-Medium.ttf')
      if (__dirname && useFsPaths) {
        mediumFontPath = path.join(__dirname, fontDir, 'Sunflower-Medium.ttf')
      }
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

      // Jahr (zentriert)
      const yearFontSize = 42
      const yearY = y + CARD_HEIGHT / 2 - yearFontSize / 2
      let boldFontPath = path.join(fontDir, 'Sunflower-Bold.ttf')
      if (__dirname && useFsPaths) {
        boldFontPath = path.join(__dirname, fontDir, 'Sunflower-Bold.ttf')
      }
      if (fs.existsSync(boldFontPath)) {
        doc.font(boldFontPath).fontSize(yearFontSize)
      } else {
        doc.fontSize(yearFontSize)
      }
      doc.text(t.year, innerX, yearY, {
        width: innerWidth,
        align: 'center',
      })

      // Titel (unten)
      const titleFontSize = 14
      let lightFontPath = path.join(fontDir, 'Sunflower-Light.ttf')
      if (__dirname && useFsPaths) {
        lightFontPath = path.join(__dirname, fontDir, 'Sunflower-Light.ttf')
      }
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

  if (outPath) {
    return new Promise((resolve) => {
      doc.on('finish', () => {
        resolve(outPath)
      })
    })
  } else {
    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        resolve(pdfBuffer)
      })
    })
  }
}

