import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import SpotifyWebApi from 'spotify-web-api-node'
import cors from 'cors'
import {
  getAllPlaylistTracks,
  generatePdf
} from './playlistUtils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static('.'))

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
    const pdfBuffer = await generatePdf(tracks, {
      useFsPaths: true,
      __dirname
    })

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
