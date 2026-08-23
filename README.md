# Meditea DJ v4.0 - Bot de Música para Discord

Bot de música exclusivo de Meditea Airlines para Discord con soporte para YouTube, Spotify, dashboard web elegante y sistema de playlists.

## Diseño Corporativo

Meditea DJ está diseñado con los colores corporativos de Meditea Airlines:
- 🔵 **Azul Meditea**: #00F3F0 (Color principal)
- 🟠 **Naranja Meditea**: #FFC200 (Color de acento)
- 🎨 **Dashboard elegante**: Diseño moderno con gradientes y animaciones
- ✈️ **Logo de Meditea Airlines**: Presente en todo el dashboard

## Características

### Comandos de Música
- `/play <query>` - Reproduce canciones de YouTube o Spotify
- `/pause` - Pausa la reproducción
- `/resume` - Reanuda la reproducción
- `/skip` - Salta a la siguiente canción
- `/stop` - Detiene y limpia la cola

### Comandos de Cola
- `/queue [page]` - Muestra la cola de reproducción
- `/nowplaying` - Muestra la canción actual con barra de progreso
- `/remove <posición>` - Elimina una canción de la cola

### Comandos Avanzados
- `/seek <tiempo>` - Ir a posición específica (MM:SS o segundos)
- `/loop <mode>` - Cambiar modo de repetición (none/track/queue)
- `/shuffle` - Mezclar la cola aleatoriamente
- `/volume <0-100>` - Ajustar volumen
- `/lyrics [canción]` - Ver la letra de la canción actual o buscar una específica

### Sistema de Playlists
- `/playlist save <nombre>` - Guardar cola actual como playlist
- `/playlist load <nombre>` - Cargar playlist guardada
- `/playlist delete <nombre>` - Eliminar playlist
- `/playlist list` - Ver tus playlists
- `/playlist info <nombre>` - Info detallada de una playlist

## Instalación

### Requisitos
- Node.js 18 o superior
- Java 17 o superior (para Lavalink)
- Git (opcional)

### Paso 1: Configurar OAuth2 en Discord Developer Portal

**IMPORTANTE para el Dashboard**: Debes configurar el Redirect URI en Discord.

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecciona tu aplicación (ID: `887046390524551178`)
3. En el menú lateral, ve a **"OAuth2"**
4. Busca la sección **"Redirects"**
5. Haz clic en **"Add Redirect"**
6. Escribe exactamente: **`http://localhost:3000/auth/callback`**
7. Haz clic en **"Save Changes"** (botón verde abajo)

✅ Ahora podrás iniciar sesión en el dashboard sin errores.

### Paso 2: Instalar dependencias

```bash
npm install
```

### Paso 3: Iniciar Lavalink

Abre una terminal **separada** y ejecuta:

```bash
cd lavalink
java -jar Lavalink.jar
```

Espera a ver el mensaje: **"Lavalink is ready to accept connections"**

### Paso 4: Iniciar el bot

En otra terminal:

```bash
npm start
```

O para desarrollo con auto-reload:

```bash
npm run dev
```

## Configuración

### Archivo `.env`

Las credenciales principales están configuradas en el archivo `.env`:

```env
# Discord Bot
DISCORD_TOKEN=ODg3MDQ2MzkwNTI0NTUxMTc4.GQyMyI.MaSpHpNYxpXbXYNkL-u2v1BqHq0PMqNMNCb32g
CLIENT_ID=887046390524551178
CLIENT_SECRET=pWYDxMMFBuXkzHqQwFfEDQ3cKjDVbKm3
OWNER_ID=309357304531124224
GUILD_ID=1171392715343286292

# Spotify (ya configurado)
SPOTIFY_CLIENT_ID=03cd7659e0f24522bb8f0d108ee523d6
SPOTIFY_CLIENT_SECRET=b9444eddc2ad4e97a32c0e0b1c8fbb5e

# Dashboard
DASHBOARD_PORT=3000
DASHBOARD_URL=http://localhost:3000
REDIRECT_URI=http://localhost:3000/auth/callback
```

### Configuración de Spotify

Las credenciales de Spotify ya están configuradas tanto en el `.env` como en `lavalink/application.yml`.
El bot puede reproducir:
- Enlaces de canciones de Spotify: `https://open.spotify.com/track/...`
- Enlaces de álbumes de Spotify: `https://open.spotify.com/album/...`
- Enlaces de playlists de Spotify: `https://open.spotify.com/playlist/...`

## Estructura del Proyecto

```
MeditaDJv4/
├── src/
│   ├── bot/                    # Código del bot de Discord
│   │   ├── commands/           # Comandos slash
│   │   │   ├── music/          # Comandos de música
│   │   │   └── playlists/      # Comandos de playlists
│   │   ├── events/             # Eventos de Discord
│   │   ├── structures/         # Clases principales
│   │   └── utils/              # Utilidades
│   ├── dashboard/              # Dashboard web (Fase 7-8)
│   ├── database/               # Base de datos SQLite
│   │   ├── models/             # Modelos de datos
│   │   └── migrations/         # Migraciones SQL
│   └── config/                 # Configuración
├── lavalink/                   # Servidor de audio Lavalink
├── data/                       # Base de datos (auto-generado)
└── logs/                       # Logs (auto-generado)
```

## Tecnologías Utilizadas

- **discord.js v14.25.1** - Librería oficial de Discord
- **Kazagumo v3.4.0** - Wrapper de Shoukaku con sistema de colas
- **Shoukaku v4.0.1** - Cliente Lavalink de bajo nivel
- **Lavalink v4** - Servidor de audio de alta calidad
  - YouTube Plugin v1.16.0
  - LavaSrc Plugin v4.8.1 (Spotify y más)
- **sqlite3** - Base de datos para playlists y configuración
- **Express v4** - Framework web para dashboard
- **Socket.IO v4** - Comunicación en tiempo real
- **Passport Discord OAuth2** - Autenticación segura con Discord
- **EJS** - Motor de plantillas para vistas

## Estado del Desarrollo

### ✅ Completado (Fases 1-8)

- [x] Infraestructura base y configuración
- [x] Bot core con Lavalink
- [x] Comandos básicos de música (play, pause, resume, skip, stop)
- [x] Comandos de cola (queue, nowplaying, remove)
- [x] Comandos avanzados (seek, loop, shuffle, volume)
- [x] Sistema completo de playlists persistentes
- [x] **Soporte completo para Spotify** (canciones, álbumes, playlists)
- [x] **Dashboard web con Express y Discord OAuth2**
- [x] **Dashboard frontend con control en tiempo real (Socket.IO)**
- [x] Auto-disconnect cuando el canal de voz está vacío (30 seg)
- [x] Cancelación inteligente de auto-disconnect
- [x] Cooldowns en comandos
- [x] Manejo de errores robusto
- [x] Base de datos SQLite con migraciones

### 🚧 Futuras Mejoras (Opcional)

- [ ] Modelos adicionales (Guild, Stats)
- [ ] Estadísticas de uso por servidor
- [ ] Sistema de votación para skip
- [ ] Filtros de audio (bass boost, nightcore, etc.)
- [ ] Testing exhaustivo

## Uso

1. **Iniciar Lavalink primero** en una terminal separada
2. **Iniciar el bot** con `npm start` o `npm run dev`
3. El bot se conectará automáticamente y registrará los slash commands en tu servidor
4. Úsalo en Discord con `/play <canción>` para empezar
5. **Dashboard web** disponible en `http://localhost:3000`

## Dashboard Web

### Acceder al Dashboard

1. Abre tu navegador y ve a `http://localhost:3000`
2. Haz clic en "Iniciar Sesión con Discord"
3. Autoriza la aplicación
4. Selecciona un servidor de la lista
5. Controla la música desde tu navegador

### Características del Dashboard

- ✅ **Autenticación con Discord OAuth2** - Inicio de sesión seguro
- 🎵 **Vista de canción actual** - Miniatura, título, artista
- 📊 **Barra de progreso en tiempo real** - Actualización cada segundo
- ⏯️ **Controles de reproducción** - Play/Pause, Skip, Stop
- 🔊 **Control de volumen** - Slider de 0-100%
- 🔁 **Modos de loop** - Ninguno, Canción, Cola
- 📝 **Cola completa** - Ve todas las canciones en espera
- 🔴 **Actualizaciones en vivo** - Socket.IO para cambios instantáneos

### Vista del Dashboard

El dashboard muestra:
- Información del servidor (nombre, icono, miembros)
- Estado del reproductor (conectado/desconectado)
- Canción actual con miniatura
- Controles de reproducción intuitivos
- Cola de reproducción con scroll
- Todo en tiempo real sin necesidad de recargar

## Comandos de Música

### Reproducir música

```
/play despacito
/play https://www.youtube.com/watch?v=kJQP7kiw5Fk
/play https://open.spotify.com/track/...
```

### Controlar la reproducción

```
/pause          # Pausar
/resume         # Reanudar
/skip           # Saltar canción
/stop           # Detener todo
/volume 80      # Volumen al 80%
```

### Gestionar la cola

```
/queue          # Ver cola
/queue 2        # Ver página 2
/nowplaying     # Ver canción actual
/remove 3       # Eliminar canción #3
/shuffle        # Mezclar cola
```

### Modos de repetición

```
/loop none      # Sin repetición
/loop track     # Repetir canción actual
/loop queue     # Repetir toda la cola
```

### Playlists

```
/playlist save mis-favoritas      # Guardar cola actual
/playlist load mis-favoritas      # Cargar playlist
/playlist list                    # Ver todas tus playlists
/playlist info mis-favoritas      # Info de una playlist
/playlist delete mis-favoritas    # Eliminar playlist
```

### Letras de Canciones

```
/lyrics                           # Ver letra de la canción actual
/lyrics despacito                 # Buscar letra de una canción específica
/lyrics Luis Fonsi - Despacito    # Buscar con artista y canción
```

## Soporte

Si encuentras algún problema:

1. Verifica que Lavalink esté corriendo
2. Revisa los logs en la consola
3. Verifica tu configuración en `.env`
4. Asegúrate de tener los permisos necesarios en Discord

## Características Destacadas

- **✈️ Diseño Corporativo Meditea**: Colores azul (#00F3F0) y naranja (#FFC200) de Meditea Airlines
- **🎨 Dashboard Elegante**: Interfaz moderna con gradientes, animaciones y efectos visuales
- **🎵 Soporte Multi-Fuente**: YouTube, Spotify (canciones/álbumes/playlists), SoundCloud, Bandcamp
- **💻 Dashboard Web Completo**: Control desde navegador con actualizaciones en tiempo real
- **🔐 OAuth2 Seguro**: Autenticación con Discord para acceso al dashboard
- **📝 Cola Inteligente**: Hasta 100 canciones con paginación
- **💾 Playlists Personales**: Guarda hasta 50 canciones por playlist
- **📃 Letras de Canciones**: Comando /lyrics para ver letras de cualquier canción
- **⏰ Auto-Disconnect Inteligente**: Se desconecta después de 30 segundos sin usuarios (cancelable si alguien regresa)
- **🔍 Búsqueda Avanzada**: Seek, loop modes (none/track/queue), shuffle
- **⚡ Performance**: Optimizado con Lavalink v4 para baja latencia
- **🔄 Actualizaciones en Vivo**: Socket.IO para sincronización instantánea
- **🛡️ Manejo de Errores**: Mensajes claros y útiles con validación completa

## Posibles Futuras Actualizaciones

- Estadísticas de reproducción por servidor
- Sistema de votación para skip
- Filtros de audio (bass boost, nightcore, etc.)
- Modo DJ con roles especiales
- Integración con Apple Music, Deezer, etc.
- Sistema de favoritos personales
- Comandos de ecualizador

## Licencia

ISC

## Autor

Guillermo Cortés

---

**Meditea DJ v4.0** - El bot de música exclusivo de Meditea Airlines 🎵✈️
