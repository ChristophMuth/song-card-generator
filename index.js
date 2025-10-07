// save as hitster_cards_generate.js
import fs from 'fs'
import path from 'path'
import SpotifyWebApi from 'spotify-web-api-node'
import dotenv from 'dotenv'
import {
  getAllPlaylistTracks,
  generatePdf
} from './playlistUtils.js'

dotenv.config()

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
const PLAYLIST_ID = process.env.PLAYLIST_ID

// === Spotify client ===
const spotifyApi = new SpotifyWebApi({
  clientId: SPOTIFY_CLIENT_ID,
  clientSecret: SPOTIFY_CLIENT_SECRET,
})

// === Main-run ===
;(async () => {
  try {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      throw new Error('Bitte setze SPOTIFY_CLIENT_ID und SPOTIFY_CLIENT_SECRET in deiner .env')
    }

    const auth = await spotifyApi.clientCredentialsGrant()
    spotifyApi.setAccessToken(auth.body['access_token'])

    const tracks = await getAllPlaylistTracks(spotifyApi, PLAYLIST_ID)
    if (!tracks.length) {
      console.log('Keine Tracks gefunden.')
      return
    }

    const outFile = path.resolve(process.cwd(), 'song_cards.pdf')
    await generatePdf(tracks, { outPath: outFile })
    console.log('✅ PDF erstellt:', outFile)
    console.log("Druckhinweis: Duplex 'Flip on short edge' / 'Spiegeln an der kurzen Seite' verwenden.")
  } catch (err) {
    console.error('Fehler:', err.message || err)
  }
})()
