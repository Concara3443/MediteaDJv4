<div align="center">
  <img src="logo.png" width="120" alt="Meditea DJ" />

  # Meditea DJ

  **Música en tu servidor de Discord, sin trabas.** YouTube, Spotify, SoundCloud y Bandcamp, con cola, playlists, favoritos, letras y un dashboard web para controlarlo todo en tiempo real.

  ![Discord Verified](https://img.shields.io/badge/Discord-Verificado-5865F2?style=flat-square&logo=discord&logoColor=white)
  ![discord.js](https://img.shields.io/badge/discord.js-14.25.1-5865F2?style=flat-square)
  ![Lavalink](https://img.shields.io/badge/Lavalink-v4-FF6B6B?style=flat-square)
  ![Status](https://img.shields.io/badge/estado-activo-00C2BF?style=flat-square)
</div>

<br>

## Índice

- [Características](#características)
- [Comandos](#comandos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Tecnologías](#tecnologías)
- [Dashboard web](#dashboard-web)
- [Soporte](#soporte)

---

## Características

| | |
|---|---|
| 🎶 **Multi-fuente** | YouTube, Spotify (canciones/álbumes/playlists), SoundCloud, Bandcamp |
| 📃 **Cola inteligente** | Hasta 100 canciones, con paginación, `shuffle` y loop de canción o de cola |
| 💾 **Playlists persistentes** | Guarda hasta 50 canciones por playlist y cárgalas cuando quieras |
| ⭐ **Favoritos** | Guarda canciones sueltas por usuario y reprodúcelas con un comando |
| 🔁 **Autoplay** | Cuando la cola se vacía, sigue sonando música relacionada automáticamente |
| 📝 **Letras** | `/lyrics` busca la letra de la canción actual (o cualquier otra) vía Genius |
| 💻 **Dashboard web** | Login con Discord OAuth2, control en tiempo real vía Socket.IO |
| ⏰ **Auto-disconnect** | Se va del canal a los 30s sin usuarios; cancela la salida si alguien vuelve |
| 🛡️ **Errores claros** | Mensajes de error siempre en ephemeral, con la causa y cómo resolverla |
| ⚡ **Baja latencia** | Audio servido por Lavalink v4 |

## Comandos

### Música

| Comando | Descripción |
|---|---|
| `/play <query>` | Reproduce una canción o playlist (YouTube, Spotify, SoundCloud, Bandcamp) |
| `/playnext <query>` | Añade una canción para sonar justo después de la actual |
| `/pause` / `/resume` | Pausa o reanuda la reproducción |
| `/skip` | Salta a la siguiente canción |
| `/stop` | Detiene la reproducción y limpia la cola |
| `/volume <0-100>` | Ajusta el volumen |
| `/seek <tiempo>` | Salta a una posición (`MM:SS` o segundos) |

### Cola

| Comando | Descripción |
|---|---|
| `/queue [page]` | Muestra la cola de reproducción, paginada |
| `/nowplaying` | Canción actual con barra de progreso |
| `/remove <posición>` | Elimina una canción de la cola |
| `/shuffle` | Mezcla la cola aleatoriamente |
| `/loop <none\|track\|queue>` | Cambia el modo de repetición |

### Playlists y favoritos

| Comando | Descripción |
|---|---|
| `/playlist save <nombre>` | Guarda la cola actual como playlist |
| `/playlist load <nombre>` | Carga una playlist guardada |
| `/playlist list` / `/playlist info <nombre>` | Lista tus playlists o el detalle de una |
| `/playlist delete <nombre>` | Elimina una playlist |
| `/favorites add` | Añade la canción actual a favoritos |
| `/favorites list [page]` | Lista tus favoritos |
| `/favorites play <search>` | Reproduce un favorito por título o artista |
| `/favorites remove <number>` | Elimina un favorito |

### Otros

| Comando | Descripción |
|---|---|
| `/autoplay on\|off\|status` | Activa/desactiva que el bot siga sonando música relacionada al vaciarse la cola |
| `/lyrics [canción]` | Letra de la canción actual, o busca una específica |

<details>
<summary>Ejemplos de uso</summary>

```
/play despacito
/play https://www.youtube.com/watch?v=kJQP7kiw5Fk
/play https://open.spotify.com/track/...

/queue 2
/loop queue
/playlist save mis-favoritas
/playlist load mis-favoritas

/lyrics
/lyrics Luis Fonsi - Despacito
```

</details>

## Instalación

### Requisitos

- Node.js 18 o superior
- Java 17 o superior (para Lavalink)
- Git (opcional)

### 1. Configurar OAuth2 en el Discord Developer Portal

Necesario para que el dashboard pueda iniciar sesión con Discord.

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecciona tu aplicación
3. **OAuth2 → Redirects → Add Redirect**
4. Añade exactamente: `http://localhost:3000/auth/callback`
5. Guarda los cambios

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar Lavalink

En una terminal separada:

```bash
cd lavalink
java -jar Lavalink.jar
```

Espera al mensaje **"Lavalink is ready to accept connections"**.

### 4. Iniciar el bot

```bash
npm start        # producción
npm run dev       # desarrollo, con auto-reload
```

## Configuración

Las credenciales viven en `.env` (usa `.env.example` como plantilla — **nunca subas tu `.env` real**):

```env
# Discord Bot
DISCORD_TOKEN=tu_token_de_discord
CLIENT_ID=tu_client_id
CLIENT_SECRET=tu_client_secret
OWNER_ID=tu_discord_id
GUILD_ID=id_del_servidor_de_pruebas

# Spotify
SPOTIFY_CLIENT_ID=tu_spotify_client_id
SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret

# Dashboard
DASHBOARD_PORT=3000
DASHBOARD_URL=http://localhost:3000
REDIRECT_URI=http://localhost:3000/auth/callback
```

Las mismas credenciales de Spotify van también en `lavalink/application.yml` (bloque `plugins.lavasrc.spotify`). El bot reproduce enlaces directos de canción, álbum y playlist de Spotify — Lavalink los resuelve vía búsqueda en YouTube (LavaSrc).

## Estructura del proyecto

```
mediteadj/
├── src/
│   ├── bot/                    # Código del bot de Discord
│   │   ├── commands/           # Comandos slash (music/, playlists/)
│   │   ├── events/             # Eventos de Discord y de Kazagumo
│   │   ├── structures/         # Clases principales (MusicClient)
│   │   └── utils/              # Embeds, permisos, metadata, etc.
│   ├── dashboard/               # Dashboard web (Express + EJS + Socket.IO)
│   ├── database/                # Base de datos SQLite
│   │   ├── models/              # Modelos de datos
│   │   └── migrations/          # Migraciones SQL
│   └── config/                  # Configuración y constantes
├── lavalink/                    # Servidor de audio Lavalink
├── data/                        # Base de datos (auto-generado)
└── logs/                        # Logs (auto-generado)
```

## Tecnologías

| | |
|---|---|
| [discord.js](https://discord.js.org/) v14.25.1 | Librería oficial de Discord |
| [Kazagumo](https://github.com/Takiyo0/Kazagumo) v3.4.0 | Wrapper de Shoukaku con sistema de colas |
| [Shoukaku](https://github.com/shipgirlproject/Shoukaku) v4.3.0 | Cliente Lavalink de bajo nivel |
| [Lavalink](https://github.com/lavalink-devs/Lavalink) v4 | Servidor de audio — plugins YouTube y LavaSrc (Spotify) |
| sqlite3 | Base de datos de playlists, favoritos y configuración |
| Express v4 + EJS | Servidor y plantillas del dashboard |
| Socket.IO v4 | Sincronización en tiempo real entre Discord y el dashboard |
| Passport (Discord OAuth2) | Login del dashboard |

## Dashboard web

1. Abre `http://localhost:3000` (o tu `DASHBOARD_URL` en producción)
2. Inicia sesión con Discord y autoriza la aplicación
3. Elige un servidor de la lista
4. Controla la música desde el navegador — play/pausa, skip, volumen, loop y cola completa, todo sincronizado al instante con lo que pasa en Discord

## Soporte

Si algo falla:

1. Verifica que Lavalink esté corriendo y conectado
2. Revisa los logs (`journalctl -u lavalink` / `journalctl -u mediteadj` en producción)
3. Verifica tu configuración en `.env` y `lavalink/application.yml`
4. Asegúrate de que el bot tiene permisos de **Ver Canal**, **Conectar** y **Hablar** en el canal de voz

---

<div align="center">

**Meditea DJ** — un proyecto de Meditea Airlines 🎵✈️

Licencia ISC · [Guillermo Cortés](https://github.com/Concara3443)

</div>
