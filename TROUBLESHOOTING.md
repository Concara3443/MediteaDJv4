# Guía de Solución de Problemas - MeditaDJ v4

## Error: "Lavalink node is not connected"

Este error significa que el bot no puede conectarse al servidor de Lavalink. Sigue estos pasos:

### Paso 1: Verificar que Lavalink está corriendo

1. Abre una terminal SEPARADA
2. Navega a la carpeta lavalink:
   ```bash
   cd C:\Users\corte\Desktop\MeditaDJv4\lavalink
   ```
3. Inicia Lavalink:
   ```bash
   java -jar Lavalink.jar
   ```
4. **IMPORTANTE**: Espera hasta ver este mensaje:
   ```
   Lavalink is ready to accept connections.
   ```
5. NO cierres esta terminal. Lavalink debe estar corriendo todo el tiempo.

### Paso 2: Verificar la configuración

Verifica que estos archivos tengan la configuración correcta:

#### En `.env`:
```env
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
```

#### En `lavalink/application.yml`:
```yaml
server:
  port: 2333
  address: 127.0.0.1

lavalink:
  server:
    password: "youshallnotpass"
```

**La contraseña debe coincidir en ambos archivos.**

### Paso 3: Iniciar el bot DESPUÉS de Lavalink

1. Abre una SEGUNDA terminal
2. Navega al proyecto:
   ```bash
   cd C:\Users\corte\Desktop\MeditaDJv4
   ```
3. Inicia el bot:
   ```bash
   npm start
   ```

### Paso 4: Verificar la conexión

Cuando el bot inicie, deberías ver:
```
[Lavalink] Configuración: { url: '127.0.0.1:2333', password: '***' }
[Lavalink] ✅ Nodo Lavalink está listo y conectado
```

Si ves `❌` o `⚠️`, hay un problema de conexión.

### Paso 5: Probar un comando

Espera 5-10 segundos después de que el bot diga "Bot listo para usar!" y luego intenta:
```
/play despacito
```

## Error: "Unknown interaction"

Este error ocurre cuando:
1. Lavalink no está conectado (ver arriba)
2. El bot tarda más de 3 segundos en responder

**Solución**: Asegúrate de que Lavalink esté completamente iniciado ANTES de usar comandos.

## Error: "Interaction has already been acknowledged"

Este es un error secundario que ocurre después de otro error. Ignóralo y enfócate en el error principal.

## Verificación Rápida

Ejecuta estos comandos para verificar:

### ¿Está Lavalink corriendo?
En Windows, abre el Administrador de Tareas y busca "java.exe" corriendo.

### ¿Está usando el puerto correcto?
```bash
netstat -an | findstr "2333"
```
Deberías ver algo como:
```
TCP    127.0.0.1:2333    0.0.0.0:0    LISTENING
```

## Orden Correcto de Inicio

**SIEMPRE sigue este orden:**

1. ✅ Terminal 1: Iniciar Lavalink
   ```bash
   cd lavalink
   java -jar Lavalink.jar
   ```
   Espera: "Lavalink is ready to accept connections"

2. ✅ Terminal 2: Iniciar Bot
   ```bash
   npm start
   ```
   Espera: "Lavalink ✅ Nodo Lavalink está listo y conectado"

3. ✅ Discord: Usa comandos
   ```
   /play <canción>
   ```

## Errores Comunes

### Java no reconocido
**Error**: 'java' no se reconoce como comando
**Solución**: Instala Java 17 o superior desde https://adoptium.net/

### Puerto ya en uso
**Error**: Address already in use: 2333
**Solución**:
1. Mata el proceso anterior:
   ```bash
   netstat -ano | findstr "2333"
   taskkill /PID <PID_NUMBER> /F
   ```
2. Reinicia Lavalink

### Bot se inicia pero Lavalink no conecta
**Síntomas**: Bot dice "listo" pero comandos fallan
**Solución**:
1. Reinicia Lavalink PRIMERO
2. Espera a que esté completamente listo
3. LUEGO reinicia el bot

## Logs Útiles

Cuando pidas ayuda, incluye estos logs:

1. **Logs de Lavalink** (terminal donde corre java)
2. **Logs del Bot** (busca líneas con [Lavalink])
3. **Configuración** (salida de [Lavalink] Configuración:)

## Contacto de Soporte

Si sigues teniendo problemas después de seguir esta guía:
1. Verifica que seguiste TODOS los pasos en orden
2. Revisa los logs de ambas terminales
3. Asegúrate de que no hay firewall bloqueando el puerto 2333
