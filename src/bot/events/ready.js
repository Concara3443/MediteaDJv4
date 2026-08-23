const { ActivityType } = require('discord.js');
const activitiesConfig = require('../../config/activities');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`[Bot] ✅ ${client.user.tag} está online!`);
        console.log(`[Bot] Conectado a ${client.guilds.cache.size} servidor(es)`);
        console.log(`[Bot] Sirviendo a ${client.users.cache.size} usuario(s)`);

        // Establecer presencia/actividad temporal
        client.user.setPresence({
            activities: [{
                name: '⏳ Conectando a Lavalink...',
                type: ActivityType.Playing
            }],
            status: 'idle'
        });

        // Registrar comandos slash
        await client.registerCommands();

        // Esperar a que Lavalink esté conectado con polling simple
        console.log('[Bot] Esperando conexión con Lavalink...');

        const waitForLavalink = () => {
            return new Promise((resolve) => {
                let attempts = 0;
                const maxAttempts = 100; // 100 intentos * 500ms = 50 segundos

                const checkConnection = () => {
                    attempts++;

                    if (!client.kazagumo || !client.kazagumo.shoukaku) {
                        console.log('[Bot] ⚠️ Kazagumo no está inicializado');
                        resolve(false);
                        return;
                    }

                    const nodes = Array.from(client.kazagumo.shoukaku.nodes.values());

                    // Estados de Shoukaku: 0=CONNECTING, 1=NEARLY, 2=CONNECTED, 3=RECONNECTING, 4=DISCONNECTED
                    // Aceptar NEARLY (1) con stats O CONNECTED (2)
                    const connectedNode = nodes.find(node =>
                        node.state === 2 || (node.state === 1 && node.stats)
                    );

                    if (connectedNode) {
                        const stateText = connectedNode.state === 2 ? 'CONNECTED' : 'NEARLY (con stats)';
                        console.log(`[Bot] ✅ Lavalink conectado (${connectedNode.name}) - Estado: ${stateText}`);
                        resolve(true);
                        return;
                    }

                    if (attempts >= maxAttempts) {
                        console.log('[Bot] ⚠️ Timeout esperando Lavalink (50s). El bot funcionará pero sin música.');
                        if (nodes.length > 0) {
                            console.log(`[Bot] Nodos encontrados pero no conectados: ${nodes.map(n => `${n.name}(estado:${n.state})`).join(', ')}`);
                        }
                        resolve(false);
                        return;
                    }

                    // Verificar de nuevo en 500ms
                    setTimeout(checkConnection, 500);
                };

                // Comenzar el polling
                checkConnection();
            });
        };

        const lavalinkConnected = await waitForLavalink();

        // Actualizar presencia según el estado de Lavalink
        if (lavalinkConnected) {
            // Iniciar sistema de actividades rotativas
            let currentActivityIndex = 0;

            const updateActivity = () => {
                const activity = activitiesConfig.activities[currentActivityIndex];
                let activityName = activity.name;

                // Reemplazar variables dinámicas
                activityName = activityName.replace('{servers}', client.guilds.cache.size);
                activityName = activityName.replace('{users}', client.users.cache.size);

                client.user.setPresence({
                    activities: [{
                        name: activityName,
                        type: activity.type
                    }],
                    status: activitiesConfig.status
                });

                // Siguiente actividad
                currentActivityIndex = (currentActivityIndex + 1) % activitiesConfig.activities.length;
            };

            // Establecer primera actividad
            updateActivity();

            // Rotar actividades cada 60 segundos
            setInterval(updateActivity, activitiesConfig.rotationInterval);

            console.log('[Bot] ✅ Bot completamente listo para usar!');
        } else {
            client.user.setPresence({
                activities: [{
                    name: '⚠️ Lavalink no disponible',
                    type: ActivityType.Playing
                }],
                status: 'idle'
            });
            console.log('[Bot] ⚠️ Bot iniciado pero Lavalink no está disponible');
            console.log('[Bot] Los comandos de música no funcionarán hasta que Lavalink se conecte');
        }
    }
};
