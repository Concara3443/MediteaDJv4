# Meditea DJ — notas internas

Notas de desarrollo/operación. El `README.md` es la ficha pública (de cara a vender el bot); esto es lo interno que no debe salir ahí.

## Roadmap / ideas para el futuro

- [ ] Estadísticas de reproducción por servidor
- [ ] Sistema de votación para skip
- [ ] Filtros de audio (bass boost, nightcore, etc.)
- [ ] Modo DJ con roles especiales
- [ ] Integración con Apple Music, Deezer, etc.

## Notas operativas (producción)

- **Dos carpetas de Lavalink, no confundir**: el `lavalink/` de este repo es solo referencia — el proceso real corre desde `/home/concara/guillermo/lavalink/` (fuera del repo, ver `systemctl cat lavalink`). Cualquier cambio en `application.yml` hay que aplicarlo ahí, no aquí.
- **`mediteadj.service` tiene `Requires=lavalink.service`**: reiniciar `lavalink` reinicia `mediteadj` en cascada. Si Lavalink tarda en arrancar, el bot puede levantarse antes de que esté listo, agotar su timeout de 50s y quedarse en modo "sin música" hasta un restart manual. Tras tocar Lavalink, comprobar logs de `mediteadj` y reiniciarlo a mano si hace falta.
- **YouTube plugin en snapshot temporal**: desde el 2026-08-23 el plugin `dev.lavalink.youtube` apunta a un commit snapshot (`f45bbb7ae...`, `snapshot: true`) en vez de a un release estable, porque YouTube empezó a rechazar el User-Agent del cliente `TV` y el fix aún no tiene release ([issue #226](https://github.com/lavalink-devs/youtube-source/issues/226)). Cuando salga una versión estable que lo incluya (probablemente >1.18.2), volver a un `dependency` fijo con `snapshot: false`.
- **Cliente `TV` es el único compatible con OAuth** en el plugin de YouTube — por eso está en la lista de `clients` junto a `MUSIC` (solo búsqueda). El `refreshToken` de esa cuenta OAuth vive en `application.yml`; si expira o hay que reautorizar, poner `oauth.enabled: true` sin `refreshToken`, reiniciar Lavalink y seguir la URL de `google.com/device` que imprime en el log (usar cuenta secundaria, no la principal).
- **Credencial rotada pendiente**: el `SPOTIFY_CLIENT_SECRET` estuvo expuesto en texto plano en el README público hasta 2026-08-23. Sigue siendo el mismo secret activo en `lavalink/application.yml` — rotarlo en el dashboard de Spotify cuando haya un hueco.
