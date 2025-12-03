import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    WAMessage,
    WASocket,
    downloadMediaMessage,
    fetchLatestBaileysVersion,
    proto,
    generateWAMessageFromContent
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { CreateTaskDTO, isTaskCategory, isTaskStatus, Profile, Task, TaskCategory, CreatePurchaseDTO } from '@cimenta/dtos';
import { api, apiUrl, defaultHeaders, ALLOWED_WHATSAPP_NUMBER } from './config';
import { createTaskDTOFromAI } from './ai';
import { transcribeAudioMessage } from './whisper';
import path from 'path';
import http from 'http';

const verifiedUsersCache = new Map<string, Profile | null>();
const chatStates = new Map<string, { state: string; context?: any }>();

// Variable global para almacenar el socket de WhatsApp
let globalSock: WASocket | null = null;

function setChatState(userId: string, state: string, context: any = {}) {
    chatStates.set(userId, { state, context });
}

function getChatState(userId: string) {
    return chatStates.get(userId) || { state: 'IDLE', context: {} };
}

/**
 * Función helper para enviar mensajes de forma segura con manejo de errores 429
 * Implementa retry con backoff exponencial para rate limiting
 */
async function safeSendMessage(
    sock: WASocket,
    jid: string,
    text: string,
    retries = 2
): Promise<boolean> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            await sock.sendMessage(jid, { text });
            return true; // Éxito
        } catch (sendError: any) {
            const isRateLimit = sendError?.output?.statusCode === 429 || 
                              sendError?.statusCode === 429 ||
                              sendError?.message?.includes('429') ||
                              sendError?.message?.includes('rate limit') ||
                              sendError?.message?.includes('Too Many Requests');
            
            if (isRateLimit && attempt < retries) {
                // Esperar con backoff exponencial: 2s, 4s, 8s
                const waitTime = Math.pow(2, attempt + 1) * 1000;
                console.warn(`⚠️ Error 429 (Rate Limit) al enviar mensaje. Reintentando en ${waitTime/1000}s... (intento ${attempt + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue; // Reintentar
            }
            
            // Si no es rate limit o ya agotamos los reintentos, loguear y salir
            if (!isRateLimit) {
                console.error('Error enviando mensaje:', sendError.message);
            } else {
                console.error('Error 429: Demasiados reintentos. Mensaje no enviado.');
            }
            return false; // Falló
        }
    }
    return false;
}

async function handleAudioMessage(
    msg: WAMessage,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        await safeSendMessage(sock, senderNumber, '🎤 Recibiendo audio... Transcribiendo...');

        // Transcribir el audio usando Whisper
        let transcribedText: string | null = null;
        try {
            transcribedText = await transcribeAudioMessage(msg);
        } catch (transcribeError: any) {
            console.error('Error en transcripción:', transcribeError.message);
            // Enviar mensaje de error más amigable
            const errorMsg = transcribeError.message?.includes('ffmpeg') 
                ? '❌ Error: Necesitas instalar ffmpeg para transcribir audios.\n\nInstala ffmpeg:\n• Linux: sudo apt-get install ffmpeg\n• macOS: brew install ffmpeg\n• Windows: https://ffmpeg.org/download.html'
                : transcribeError.message?.includes('Cannot find module')
                ? '❌ Error: Falta instalar @xenova/transformers.\n\nEjecuta: npm install @xenova/transformers'
                : '❌ Error al transcribir el audio. Verifica que:\n• El audio tenga buena calidad\n• ffmpeg esté instalado\n• @xenova/transformers esté instalado';
            
            await safeSendMessage(sock, senderNumber, errorMsg);
            return;
        }

        if (!transcribedText || transcribedText.trim().length === 0) {
            await safeSendMessage(sock, senderNumber, '⚠️ No pude transcribir el audio. Asegurate de que el audio tenga contenido de voz claro.');
            return;
        }

        // Mostrar la transcripción al usuario
        await safeSendMessage(sock, senderNumber, `📝 Transcripción: "${transcribedText}"\n\n🧠 Procesando con IA...`);

        // Procesar el texto transcrito con Gemini AI (igual que con texto normal)
        let dto = null;
        try {
            dto = await createTaskDTOFromAI(transcribedText, user.id);
        } catch (aiError: any) {
            // Manejo específico del error 429 de Gemini AI
            if (aiError.isRateLimit || aiError.message === 'GEMINI_QUOTA_EXCEEDED') {
                console.error('⚠️ Error 429: Cuota de Gemini AI agotada');
                await safeSendMessage(
                    sock, 
                    senderNumber, 
                    '❌ Error: La cuota de Gemini AI está agotada.\n\n' +
                    'Por favor, revisa tu plan y facturación en:\n' +
                    'https://ai.dev/usage?tab=rate-limit\n\n' +
                    'El audio se transcribió correctamente, pero no pude procesarlo con IA.'
                );
                return;
            }
            console.error('Error procesando con Gemini AI:', aiError.message);
            await safeSendMessage(sock, senderNumber, '⚠️ Error al procesar el texto con IA. Intenta de nuevo.');
            return;
        }
        
        if (dto) {
            // Intentar obtener el site_id si el usuario tiene obras
            try {
                const sites = await api.SiteService.getSitesByUser(user.id);
                if (sites && sites.length > 0) {
                    // Si hay una sola obra, usarla automáticamente
                    if (sites.length === 1) {
                        (dto as any).site_id = (sites[0] as any).id;
                    } else {
                        // Si hay múltiples obras, intentar encontrar la mencionada en el audio
                        // o usar la primera
                        const siteMentioned = sites.find((s: any) => 
                            transcribedText!.toLowerCase().includes((s.address || '').toLowerCase())
                        );
                        if (siteMentioned) {
                            (dto as any).site_id = (siteMentioned as any).id;
                        } else {
                            // Si no se mencionó ninguna obra específica, usar la primera
                            (dto as any).site_id = (sites[0] as any).id;
                        }
                    }
                }
            } catch (e) {
                console.error('Error obteniendo obras del usuario:', e);
            }

            await safeSendMessage(sock, senderNumber, '✅ Entendido. Creando la tarea a partir de tu audio...');
            try {
                await handleTaskCreation(dto, senderNumber, sock);
                setChatState(senderNumber, 'IDLE');
            } catch (taskError: any) {
                console.error('Error creando tarea:', taskError.message);
                await safeSendMessage(sock, senderNumber, `❌ Error al crear la tarea: ${taskError.message || 'Error desconocido'}`);
            }
            return;
        }

        // Si no se pudo parsear como tarea, mostrar mensaje de ayuda
        await safeSendMessage(sock, senderNumber, `⚠️ No pude identificar una tarea en tu audio. Asegurate de mencionar:\n• Qué hay que hacer\n• En qué obra (si tenés varias)\n• Fecha y hora (opcional)\n\nEjemplo: "quiero crear una tarea para mi obra en gurruchaga que sea cambiar la tuberia el dia miercoles 10/12 desde la mañana hasta el mediodia"`);
    } catch (error: any) {
        console.error('Error inesperado al procesar audio:', error.message);
        // No intentar enviar mensaje si hay un error crítico, solo loguear
        // Esto evita que se cierre la sesión
    }
}

async function handleMediaMessage(
    msg: WAMessage,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        const mediaType = msg.message?.imageMessage ? 'image' : 'video';
        const caption = msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';

        await sock.sendMessage(senderNumber, {
            text: `📎 Recibiendo ${mediaType === 'image' ? 'imagen' : 'video'}... Por favor espera.`
        });

        // Descargar el medio
        const buffer = await downloadMediaMessage(msg, 'buffer', {});

        if (!buffer) {
            throw new Error('No se pudo descargar el medio');
        }

        if (mediaType === 'video') {
            await sock.sendMessage(senderNumber, { text: '⚠️ Por ahora solo puedo registrar avances con foto. Enviá una imagen con una breve descripción.' });
            return;
        }

        // Elegir obra para subir el avance
        try {
            const sites = await api.SiteService.getSitesByUser(user.id);
            if (!sites || sites.length === 0) {
                await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras asociadas a tu usuario. No puedo registrar el avance.' });
                return;
            }
            if (sites.length === 1) {
                const uploaded = await uploadMediaToAPI(buffer as Buffer, 'image', user.id, caption, (sites[0] as any).id);
                await sock.sendMessage(senderNumber, { text: `✅ Avance registrado con foto.\n${caption ? `📝 ${caption}` : ''}` });
                console.log('Media subido:', uploaded);
                return;
            }
            // Pedir selección de obra
            const list: string[] = [];
            list.push('🏷️ ¿En qué obra querés subir el avance? (número o nombre)');
            sites.slice(0, 20).forEach((s: any, idx: number) => list.push(`${idx + 1}) ${s.address}`));
            await sock.sendMessage(senderNumber, { text: list.join('\n') });
            setChatState(senderNumber, 'AWAITING_UPDATE_SITE_SELECTION', {
                updateKind: 'media',
                mediaBase64: (buffer as Buffer).toString('base64'),
                caption,
                sitesOptions: sites
            });
            return;
        } catch (e) {
            console.error('Error preparando selección de obra para avance:', e);
            await sock.sendMessage(senderNumber, { text: '❌ No pude preparar la selección de obra. Reintentá más tarde.' });
            return;
        }
    } catch (error: any) {
        console.error('Error al procesar medio:', error.message);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al procesar el ${msg.message?.imageMessage ? 'imagen' : 'video'}: ${error.message}`
        });
    }
}

async function uploadMediaToAPI(
    buffer: Buffer,
    mediaType: 'image',
    userId: string,
    caption?: string,
    siteId?: string
): Promise<any> {
    const base64 = buffer.toString('base64');
    const mime = 'image/jpeg';
    const dataUri = `data:${mime};base64,${base64}`;

    const payload = {
        title: caption?.slice(0, 80) || 'Avance con foto',
        description: caption || undefined,
        image_url: dataUri,
        user_id: userId,
        site_id: siteId,
    };
    const created = await api.UpdateService.createUpdate(payload as any);
    return created;
}

async function createTextUpdate(user: Profile, jid: string, sock: WASocket, text: string, siteHint?: string) {
    try {
        let site_id: string | undefined = undefined;
        if (siteHint && siteHint.trim()) {
            const userSites = await api.SiteService.getSitesByUser(user.id);
            const match = userSites.find(s => (s.address || '').toLowerCase().includes(siteHint.toLowerCase()));
            if (match) site_id = match.id as any;
        }
        if (!site_id) {
            try {
                const userSites = await api.SiteService.getSitesByUser(user.id);
                site_id = (userSites && (userSites[0] as any)?.id) || undefined;
            } catch {}
        }
        const payload = {
            title: text.slice(0, 80),
            description: text,
            user_id: user.id,
            site_id,
        };
        await api.UpdateService.createUpdate(payload as any);
        await sock.sendMessage(jid, { text: '✅ Avance de texto registrado.' });
    } catch (e: any) {
        console.error('Error creando avance de texto:', e);
        await sock.sendMessage(jid, { text: `❌ No pude registrar el avance: ${e?.message || 'Error desconocido'}` });
    }
}

async function handleIncomingMessage(m: any, sock: WASocket) {
    try {
        const msg: WAMessage | undefined = m.messages[0];
        if (!msg || !msg.message) return;

        // Ignorar mensajes enviados por el bot mismo (evita loops infinitos)
        if (msg.key.fromMe) {
            return;
        }

        const senderNumber = msg.key.remoteJid;
        if (!senderNumber) return;

        // Restricción: solo responder al número permitido (si está configurado)
        if (ALLOWED_WHATSAPP_NUMBER && senderNumber !== ALLOWED_WHATSAPP_NUMBER) {
            console.log(`Mensaje bloqueado de: ${senderNumber} (solo se permite: ${ALLOWED_WHATSAPP_NUMBER})`);
            return;
        }

        // Ignorar mensajes del propio bot (verificación adicional)
        const botJid = sock.user?.id;
        if (botJid && senderNumber === botJid) {
            console.log(`Mensaje ignorado: el bot no procesa sus propios mensajes`);
            return;
        }

        const user = await getVerifiedUser(senderNumber);
        if (!user) {
            await safeSendMessage(sock, senderNumber, "Hola, para usar el bot, primero agrega tu número de WhatsApp en tu perfil de la app Cimenta.");
            return;
        }

    // Manejo de audios (transcripción con Whisper)
    if (msg.message.audioMessage) {
        await handleAudioMessage(msg, user, senderNumber, sock);
        return;
    }

    // Manejo de medios (fotos y videos)
    if (msg.message.imageMessage || msg.message.videoMessage) {
        await handleMediaMessage(msg, user, senderNumber, sock);
        return;
    }

    // Manejo de respuesta de botones (antes de leer texto)
    const buttonsResp: any = (msg.message as any)?.buttonsResponseMessage;
    if (buttonsResp?.selectedButtonId) {
        const selectedId: string = buttonsResp.selectedButtonId;
        const { state, context } = getChatState(senderNumber);
        if (state === 'AWAITING_TASK_CATEGORY') {
            await handleTaskCategory(selectedId, context, senderNumber, sock);
            return;
        }
        if (state === 'AWAITING_TASK_STATUS') {
            await handleTaskStatus(selectedId, context, user, senderNumber, sock);
            return;
        }
    }

    // Botones (template o buttons) respuesta
    const btnResp: any = (msg.message as any).buttonsResponseMessage;
    const tplResp: any = (msg.message as any).templateButtonReplyMessage;
    if (btnResp?.selectedButtonId || tplResp?.selectedId) {
        const selectedId = String(btnResp?.selectedButtonId || tplResp?.selectedId).toLowerCase();
        const { state, context } = getChatState(senderNumber);
        if (state === 'AWAITING_TASK_CATEGORY') {
            await handleTaskCategory(selectedId, context, senderNumber, sock);
            return;
        }
        if (state === 'AWAITING_TASK_STATUS') {
            await handleTaskStatus(selectedId, context, user, senderNumber, sock);
            return;
        }
    }

    // Listas (listMessage) respuesta
    const listResp: any = (msg.message as any).listResponseMessage;
    if (listResp?.singleSelectReply?.selectedRowId) {
        const rowId = String(listResp.singleSelectReply.selectedRowId).toLowerCase();
        const { state, context } = getChatState(senderNumber);
        if (state === 'AWAITING_TASK_CATEGORY') {
            await handleTaskCategory(rowId, context, senderNumber, sock);
            return;
        }
        if (state === 'AWAITING_TASK_STATUS') {
            await handleTaskStatus(rowId, context, user, senderNumber, sock);
            return;
        }
    }

    const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!messageText) return;

    console.log(`Mensaje recibido de ${senderNumber}: "${messageText}"`);

    // Si el usuario quiere cancelar en cualquier momento
    if (messageText.toLowerCase() === 'cancelar') {
        setChatState(senderNumber, 'IDLE');
        await sock.sendMessage(senderNumber, {
            text: "Proceso cancelado. Vuelves al menú principal."
        });
        return;
    }

    // Comando de resumen (solo 'resumen')
    const lower = messageText.trim().toLowerCase();
    if (lower.startsWith('resumen')) {
        const query = messageText.trim().slice(7).trim();
        await sendDailySummary_v2(senderNumber, sock, query);
        return;
    }

    // Comando de agenda de HOY
    if (lower === 'agenda' || lower.startsWith('agenda ') || lower === 'hoy' || lower === 'tareas hoy') {
        const query = lower.startsWith('agenda ') ? messageText.trim().slice(6).trim() : '';
        await sendTodayAgenda(senderNumber, sock, query);
        return;
    }

    if (lower === 'avances' || lower.startsWith('avances ')) {
        const query = lower.startsWith('avances ') ? messageText.trim().slice(7).trim() : '';
        await sendAdvancesToday(senderNumber, sock, query);
        return;
    }

    // Comando de obras (lista las obras del usuario)
    if (lower === 'obras' || lower.startsWith('obras ')) {
        await sendMySites(senderNumber, sock, user);
        return;
    }

    // Comando de compra
    if (lower === 'compra' || lower === 'comprar' || lower === 'c') {
        await startPurchaseFlow(senderNumber, sock, user);
        return;
    }

    // Avances de texto: "av <texto>" o "avance <texto>" (opcional: "av <obra>: <texto>")
    if (lower === 'av' || lower === 'avance') {
        await sock.sendMessage(senderNumber, { text: '📝 Para subir un avance de texto, escribí: *av* <texto> o *av* <obra>: <texto>' });
        return;
    }
    if (lower.startsWith('av ') || lower.startsWith('avance ')) {
        let raw = messageText.trim();
        if (raw.toLowerCase().startsWith('avance ')) raw = raw.slice(7);
        if (raw.toLowerCase().startsWith('av ')) raw = raw.slice(3);
        let siteHint = '';
        let text = raw.trim();
        const idx = text.indexOf(':');
        if (idx > 0) {
            siteHint = text.slice(0, idx).trim();
            text = text.slice(idx + 1).trim();
        }
        if (!text) {
            await sock.sendMessage(senderNumber, { text: '⚠️ No encontré el texto del avance. Ejemplo: av casa: Hormigonado losa' });
            return;
        }
        if (siteHint) {
            await createTextUpdate(user, senderNumber, sock, text, siteHint);
            return;
        }
        // Si no se indicó obra, pedir selección si hay varias
        try {
            const sites = await api.SiteService.getSitesByUser(user.id);
            if (!sites || sites.length === 0) {
                await createTextUpdate(user, senderNumber, sock, text);
                return;
            }
            if (sites.length === 1) {
                await createTextUpdate(user, senderNumber, sock, text, (sites[0] as any).address);
                return;
            }
            const lines: string[] = [];
            lines.push('🏷️ ¿En qué obra querés subir el avance? (número o nombre)');
            sites.slice(0, 20).forEach((s: any, idx: number) => lines.push(`${idx + 1}) ${s.address}`));
            await sock.sendMessage(senderNumber, { text: lines.join('\n') });
            setChatState(senderNumber, 'AWAITING_UPDATE_SITE_SELECTION', { updateKind: 'text', textContent: text, sitesOptions: sites });
            return;
        } catch {
            await createTextUpdate(user, senderNumber, sock, text);
        }
        return;
    }

    const { state, context } = getChatState(senderNumber);
    await handleMessageByState(state, messageText, context, user, senderNumber, sock);
    } catch (error: any) {
        console.error('Error crítico en handleIncomingMessage:', error);
        // No relanzar el error para evitar cerrar la conexión
        // Intentar enviar mensaje de error solo si la conexión está activa
        try {
            const senderNumber = m.messages?.[0]?.key?.remoteJid;
            if (senderNumber) {
                await sock.sendMessage(senderNumber, {
                    text: '❌ Ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.'
                });
            }
        } catch (sendError) {
            // Si falla el envío, no hacer nada para evitar más errores
            console.error('No se pudo enviar mensaje de error:', sendError);
        }
    }
}

async function handleMessageByState(
    state: string,
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    switch (state) {
        case 'IDLE':
            await handleIdleState(messageText, user, senderNumber, sock);
            break;

        case 'AWAITING_TASK_INPUT':
            await handleTaskInput(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_TASK_TITLE':
            await handleTaskTitle(messageText, senderNumber, sock);
            break;

        case 'AWAITING_TASK_DESCRIPTION':
            await handleTaskDescription(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_SITE_SELECTION':
            await handleSiteSelection(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_TASK_CATEGORY':
            await handleTaskCategory(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_TASK_STATUS':
            await handleTaskStatus(messageText, context, user, senderNumber, sock);
            break;

        case 'ASK_CALENDAR':
            await handleAskCalendar(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_START_DATE':
            await handleStartDate(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_END_DATE':
            await handleEndDate(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_UPDATE_SITE_SELECTION':
            await handleUpdateSiteSelection(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_SITE':
            await handlePurchaseSiteSelection(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_PRODUCT':
            await handlePurchaseProduct(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_CATEGORY':
            await handlePurchaseCategory(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_QUANTITY':
            await handlePurchaseQuantity(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_PRICE':
            await handlePurchasePrice(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_SUPPLIER':
            await handlePurchaseSupplier(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_DESCRIPTION':
            await handlePurchaseDescription(messageText, context, user, senderNumber, sock);
            break;

        default:
            await sock.sendMessage(senderNumber, {
                text: "Estado desconocido. Envía 'cancelar' para volver al inicio."
            });
    }
}

async function handleIdleState(
    messageText: string,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    const lower = messageText.trim().toLowerCase();
    if (lower === '!crear tarea' || lower === 'tarea' || lower === 't' || lower === 'crear tarea') {
        // Elegir obra antes de crear tarea
        try {
            const sites = await api.SiteService.getSitesByUser((await getVerifiedUser(senderNumber))!.id);
            if (!sites || sites.length === 0) {
                await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras asociadas a tu usuario. Creá una obra desde la app para continuar.' });
                return;
            }
            if (sites.length === 1) {
                setChatState(senderNumber, 'AWAITING_TASK_INPUT', { site_id: (sites[0] as any).id, site_address: (sites[0] as any).address });
                await sock.sendMessage(senderNumber, { text: '🎯 ¡Genial! Vamos a crear una tarea.\n🏷️ Obra: ' + ((sites[0] as any).address || '') + '\n📝 Describí lo que tenés que hacer en un solo mensaje (ej: "Cambiar foco del baño mañana").' });
                return;
            }
            const lines: string[] = [];
            lines.push('🏷️ Tenés varias obras. Elegí una (número o nombre):');
            sites.slice(0, 20).forEach((s: any, idx: number) => lines.push(`${idx + 1}) ${s.address}`));
            await sock.sendMessage(senderNumber, { text: lines.join('\n') });
            setChatState(senderNumber, 'AWAITING_SITE_SELECTION', { sitesOptions: sites });
            return;
        } catch (e) {
            await sock.sendMessage(senderNumber, { text: '❌ No pude obtener tus obras. Intentá de nuevo más tarde.' });
            return;
        }
    } else if (lower.startsWith('resumen')) {
        const query = messageText.trim().slice(7).trim();
        await sendDailySummary_v2(senderNumber, sock, query);
    } else if (lower === 'compra' || lower === 'comprar' || lower === 'c') {
        await startPurchaseFlow(senderNumber, sock, user);
    } else {
        // Mostrar mensaje de ayuda sin llamar a Gemini AI
        await sock.sendMessage(senderNumber, {
            text: `👋 Hola ${user.name}!

✍️ Escribí "*tarea*" o "*t*" para crear una nueva tarea.

🧾 Escribí "*resumen*" para ver el resumen del día (o "*resumen <obra>*" para una obra específica).

📅 Escribí "*agenda*" para ver las tareas de hoy (o "*agenda <obra>*").

📸 Escribí "*avances*" para ver los avances del día (o "*avances <obra>*").

📝 Escribí "*av <texto>*" para crear un avance de texto (o enviá una foto con descripción para un avance con imagen).

🏷️ Escribí "*obras*" para ver la lista de tus obras.

🛒 Escribí "*compra*" o "*c*" para crear una solicitud de compra.

❌ Escribí "*cancelar*" para cancelar cualquier operación en curso.`
        });
    }
}

async function handleTaskTitle(
    messageText: string,
    senderNumber: string,
    sock: WASocket
) {
    await sock.sendMessage(senderNumber, {
        text: '✅ Título guardado.\n🖊️ Ahora escribí una breve *descripción*.'
    });
    const { context } = getChatState(senderNumber);
    setChatState(senderNumber, 'AWAITING_TASK_DESCRIPTION', { ...context, title: messageText });
}

async function handleTaskDescription(
    messageText: string,
    context: any,
    senderNumber: string,
    sock: WASocket
) {
    const body = [
        '📝 Descripción guardada.',
        '',
        'Elegí la categoría de la tarea (respondé con número o nombre):',
        '1) *Pintura* 🎨',
        '2) *Construcción* 🏗️',
        '3) *Electricidad* ⚡',
        '4) *Plomería* 🚰',
    ].join('\n');
    await sock.sendMessage(senderNumber, { text: body });

    setChatState(senderNumber, 'AWAITING_TASK_CATEGORY', {
        ...context,
        description: messageText
    });
}

async function handleTaskCategory(
    messageText: string,
    context: any,
    senderNumber: string,
    sock: WASocket
) {
    let normalized = messageText.toLowerCase().trim();
    const numMatchCat = normalized.match(/^\d+/);
    if (numMatchCat) normalized = numMatchCat[0];
    const categoryMap: Record<string, string> = {
        '1': 'pintura',
        '2': 'construccion',
        '3': 'electricidad',
        '4': 'plomeria',
        'pintura': 'pintura',
        'construcción': 'construccion',
        'construccion': 'construccion',
        'electricidad': 'electricidad',
        'plomería': 'plomeria',
        'plomeria': 'plomeria'
    };
    const mapped = categoryMap[normalized] || normalized;

    if (isTaskCategory(mapped)) {
        const body = [
            '✅ Categoría guardada.',
            '',
            'Elegí el estado inicial (respondé con número o nombre):',
            '1) *Cambios* 🔄',
            '2) *Pendiente* 🕒',
            '3) *En Progreso* 🚧',
            '4) *Completada* ✅',
            '5) *Bloqueada* ⛔',
        ].join('\n');
        await sock.sendMessage(senderNumber, { text: body });

        setChatState(senderNumber, 'AWAITING_TASK_STATUS', {
            ...context,
            category: mapped
        });
    } else {
        await sock.sendMessage(senderNumber, {
            text: 'Categoría no válida. Elegí entre: 1) Pintura, 2) Construcción, 3) Electricidad, 4) Plomería.'
        });
    }
}

async function handleTaskStatus(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    let normalized = messageText.toLowerCase().trim();
    const numMatchSt = normalized.match(/^\d+/);
    if (numMatchSt) normalized = numMatchSt[0];
    // Mapear castellano -> enumeración del backend
    const statusMap: Record<string, string> = {
        '1': 'changes',
        '2': 'pending',
        '3': 'in_progress',
        '4': 'completed',
        '5': 'blocked',
        'cambios': 'changes',
        'pendiente': 'pending',
        'en progreso': 'in_progress',
        'completada': 'completed',
        'bloqueada': 'blocked',
        // Aceptar también los valores crudos del backend
        'changes': 'changes',
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'completed',
        'blocked': 'blocked'
    };
    const mapped = statusMap[normalized];

    if (mapped && isTaskStatus(mapped)) {
        let siteId = context?.site_id as string | undefined;
        if (!siteId) {
            try {
                const sites = await api.SiteService.getSitesByUser(user.id);
                siteId = (sites && (sites[0] as any)?.id) || undefined;
            } catch {}
        }
        const nextContext = {
            ...context,
            status: mapped as any,
            user_id: user.id,
            site_id: siteId
        } as CreateTaskDTO & { user_id: string; site_id?: string };
        await sock.sendMessage(senderNumber, {
            text: '🗓️ ¿Querés agendarla en el calendario? Respondé "sí" o "no".'
        });
        setChatState(senderNumber, 'ASK_CALENDAR', nextContext);
    } else {
        const body = [
            'Estado no válido. Elegí una opción válida (número o nombre):',
            '1) Cambios 🔄',
            '2) Pendiente 🕒',
            '3) En Progreso 🚧',
            '4) Completada ✅',
            '5) Bloqueada ⛔',
        ].join('\n');
        await sock.sendMessage(senderNumber, { text: body });
    }
}

// Nuevo flujo simplificado: un solo estado para recibir el contenido y crear la tarea con IA
async function handleTaskInput(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        let dto = null;
        try {
            dto = await createTaskDTOFromAI(messageText, user.id);
        } catch (aiError: any) {
            // Manejo específico del error 429 de Gemini AI
            if (aiError.isRateLimit || aiError.message === 'GEMINI_QUOTA_EXCEEDED') {
                console.error('⚠️ Error 429: Cuota de Gemini AI agotada');
                await safeSendMessage(
                    sock, 
                    senderNumber, 
                    '❌ Error: La cuota de Gemini AI está agotada.\n\n' +
                    'Por favor, revisa tu plan y facturación en:\n' +
                    'https://ai.dev/usage?tab=rate-limit\n\n' +
                    'Intenta describir la tarea de forma más simple o espera unos minutos.'
                );
                return;
            }
            // Si es otro error, continuar
            console.error('Error procesando con Gemini AI:', aiError.message);
        }
        
        if (!dto) {
            await safeSendMessage(sock, senderNumber, '⚠️ No entendí. Contame en una sola línea qué hay que hacer (ej: "Cambiar foco del baño mañana").');
            return;
        }
        // Asegurar site_id desde el contexto de selección previa
        if (context?.site_id) {
            (dto as any).site_id = context.site_id;
        }
        await safeSendMessage(sock, senderNumber, '🧠 Perfecto. Creando la tarea...');
        await handleTaskCreation(dto, senderNumber, sock);
        setChatState(senderNumber, 'IDLE');
    } catch (e: any) {
        console.error('Error en handleTaskInput:', e);
        await safeSendMessage(sock, senderNumber, `❌ No pude crear la tarea: ${e?.message || 'Error desconocido'}`);
    }
}

// --------------------
// Resumen diario (bot)
// --------------------

type Site = { id: string; address: string };

type RawTask = Task & {
    created_at?: string;
    updated_at?: string;
    site_id?: string;
    end_date?: string;
    site?: { id: string; address: string };
};

type Update = {
    id: string;
    created_at: string;
    user_id: string;
    title: string;
    description?: string;
    image_url?: string;
    site_id?: string;
};

async function fetchJSON<T = any>(path: string): Promise<T> {
    const gfetch = (globalThis as any).fetch as any;
    if (!gfetch) throw new Error('fetch no disponible en este entorno');
    const res = await gfetch(`${apiUrl}${path}`, { headers: defaultHeaders });
    if (!res.ok) throw new Error(`API ${path} -> ${res.status} ${res.statusText}`);
    return res.json();
}

function dayBounds(d: Date) {
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return { start, end };
}

function inRange(iso?: string, start?: Date, end?: Date) {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return false;
    return (!start || t >= start.getTime()) && (!end || t <= end.getTime());
}

function isUUID(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function titleCase(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function categoryIcon(cat?: string) {
    switch ((cat || '').toLowerCase()) {
        case 'pintura': return '🎨';
        case 'construccion': return '🏗️';
        case 'electricidad': return '⚡';
        case 'plomeria': return '🚰';
        default: return '🧩';
    }
}

function statusBadge(st?: string) {
    switch ((st || '').toLowerCase()) {
        case 'changes': return '🔄 Cambios';
        case 'pending': return '🕒 Pendiente';
        case 'in_progress': return '🚧 En progreso';
        case 'completed': return '✅ Completada';
        case 'blocked': return '⛔ Bloqueada';
        default: return titleCase(st || '');
    }
}

function clip(text: string, max = 80) {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

function parseDateTimeToISO(input: string, defaultHour = 9, defaultMinutes = 0): string | null {
    const s = input.trim();
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2})(?::(\d{2}))?)?$/);
    if (!m) return null;
    let [_, dd, MM, yyyy, hh, mm] = m;
    const day = parseInt(dd, 10);
    const month = parseInt(MM, 10) - 1;
    let year = parseInt(yyyy.length === 2 ? `20${yyyy}` : yyyy, 10);
    const hour = hh ? parseInt(hh, 10) : defaultHour;
    const minutes = mm ? parseInt(mm, 10) : defaultMinutes;
    const dt = new Date(year, month, day, hour, minutes, 0, 0);
    if (isNaN(dt.getTime())) return null;
    return dt.toISOString();
}

async function handleAskCalendar(messageText: string, context: any, user: Profile, senderNumber: string, sock: WASocket) {
    const lower = messageText.trim().toLowerCase();
    if (['si', 'sí', 's', 'yes', 'y'].includes(lower)) {
        await sock.sendMessage(senderNumber, { text: '🗓️ Ingreso de fechas. Enviá la fecha de inicio con formato DD/MM/YYYY HH:mm (ej: 25/10/2025 08:30). También podés omitir la hora.' });
        setChatState(senderNumber, 'AWAITING_START_DATE', context);
        return;
    }
    if (['no', 'n'].includes(lower)) {
        await sock.sendMessage(senderNumber, { text: '🔧 Creando tarea sin fechas de calendario…' });
        await handleTaskCreation(context as CreateTaskDTO, senderNumber, sock);
        setChatState(senderNumber, 'IDLE');
        return;
    }
    await sock.sendMessage(senderNumber, { text: 'Por favor respondé "sí" para agendar o "no" para continuar sin fechas.' });
}

async function handleStartDate(messageText: string, context: any, user: Profile, senderNumber: string, sock: WASocket) {
    const iso = parseDateTimeToISO(messageText, 9, 0);
    if (!iso) {
        await sock.sendMessage(senderNumber, { text: 'Formato no válido. Ejemplo: 25/10/2025 08:30' });
        return;
    }
    await sock.sendMessage(senderNumber, { text: '✅ Inicio guardado. Ahora enviá la fecha de fin (DD/MM/YYYY HH:mm). Si enviás solo la fecha, usaré +2h desde inicio.' });
    setChatState(senderNumber, 'AWAITING_END_DATE', { ...context, start_date: iso });
}

async function handleEndDate(messageText: string, context: any, user: Profile, senderNumber: string, sock: WASocket) {
    let endISO = parseDateTimeToISO(messageText, 11, 0);
    if (!endISO && context.start_date) {
        // si viene solo una fecha sin hora y no matchea, intentemos como DD/MM/YYYY
        endISO = parseDateTimeToISO(messageText, new Date(context.start_date).getHours() + 2, new Date(context.start_date).getMinutes());
    }
    if (!endISO) {
        await sock.sendMessage(senderNumber, { text: 'Formato no válido. Ejemplo: 25/10/2025 10:30' });
        return;
    }
    // Validar orden
    const start = new Date(context.start_date);
    const end = new Date(endISO);
    if (end <= start) {
        // ajusto a +2h
        const adj = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        endISO = adj.toISOString();
    }
    await sock.sendMessage(senderNumber, { text: '🔧 Creando tarea con fechas de calendario…' });
    const toCreate: CreateTaskDTO = { ...context, end_date: endISO } as CreateTaskDTO;
    await handleTaskCreation(toCreate, senderNumber, sock);
    setChatState(senderNumber, 'IDLE');
}

// Helpers para botones y listas (nivel bajo)
async function sendButtons(
    sock: WASocket,
    jid: string,
    contentText: string,
    buttons: { id: string; text: string }[],
    footer = 'Cimenta'
) {
    try {
        const msg = generateWAMessageFromContent(
            jid,
            proto.Message.fromObject({
                templateMessage: {
                    hydratedFourRowTemplate: {
                        hydratedContentText: contentText,
                        hydratedFooterText: footer,
                        hydratedButtons: buttons.map((b, i) => ({
                            index: i + 1,
                            quickReplyButton: { displayText: b.text, id: b.id }
                        }))
                    }
                }
            }),
            { userJid: sock.user?.id ?? '' }
        );
        await sock.relayMessage(jid, msg.message!, { messageId: msg.key.id! });
    } catch (e) {
        console.error('Error enviando botones:', e);
        // Segundo intento con hydratedTemplate
        try {
            const msg2 = generateWAMessageFromContent(
                jid,
                proto.Message.fromObject({
                    templateMessage: {
                        hydratedTemplate: {
                            hydratedContentText: contentText,
                            hydratedFooterText: footer,
                            hydratedButtons: buttons.map((b, i) => ({
                                index: i + 1,
                                quickReplyButton: { displayText: b.text, id: b.id }
                            }))
                        }
                    }
                }),
                { userJid: sock.user?.id ?? '' }
            );
            await sock.relayMessage(jid, msg2.message!, { messageId: msg2.key.id! });
            return;
        } catch (e1) {
            console.error('Fallback hydratedTemplate falló:', e1);
        }
        try {
            await sock.sendMessage(jid, {
                text: contentText,
                footer: footer,
                templateButtons: buttons.map((b, i) => ({ index: i + 1, quickReplyButton: { id: b.id, displayText: b.text } }))
            } as any);
        } catch (e2) {
            console.error('Fallback templateButtons falló:', e2);
            // Fallback final a texto simple
            const body = `${contentText}\n` + buttons.map(b => `- ${b.text} (escribí: ${b.id})`).join('\n');
            await sock.sendMessage(jid, { text: body });
        }
    }
}

async function sendList(
    sock: WASocket,
    jid: string,
    title: string,
    description: string,
    buttonText: string,
    rows: { id: string; title: string; description?: string }[],
    footer = 'Cimenta'
) {
    try {
        const msg = generateWAMessageFromContent(
            jid,
            proto.Message.fromObject({
                listMessage: {
                    title,
                    description,
                    buttonText,
                    footerText: footer,
                    listType: 1,
                    sections: [
                        {
                            title,
                            rows: rows.map(r => ({ title: r.title, rowId: r.id, description: r.description || '' }))
                        }
                    ]
                }
            }),
            { userJid: sock.user?.id ?? '' }
        );
        await sock.relayMessage(jid, msg.message!, { messageId: msg.key.id! });
    } catch (e) {
        console.error('Error enviando lista:', e);
        // Fallback: botones divididos en 2/3
        const first = rows.slice(0, 3).map(r => ({ id: r.id, text: r.title }));
        const rest = rows.slice(3).map(r => ({ id: r.id, text: r.title }));
        await sendButtons(sock, jid, `${title}\n${description}`, first, footer);
        if (rest.length) {
            await sendButtons(sock, jid, 'Más opciones:', rest, footer);
        }
    }
}

async function sendDailySummary(jid: string, sock: WASocket, siteQuery?: string) {
    try {
        await sock.sendMessage(jid, { text: '⏳ Armando resumen del día...' });


        // 1. Obtener usuario autenticado
        const user = await getVerifiedUser(jid);
        if (!user) {
            await sock.sendMessage(jid, { text: "No se pudo identificar tu usuario. Asegúrate de tener tu número registrado." });
            return;
        }


        const today = new Date();
        const { start, end } = dayBounds(today);

        
        // 2. Traer solo las obras del usuario
        const sites = await api.SiteService.getSitesByUser(user.id);

        // 3. Traer tareas de cada obra
        const tasksBySite = await Promise.all(
            sites.map(async site => ({
                site,
                tasks: await api.TaskService.getTasksBySite(site.id)
            }))
        );

        // (Opcional) Traer updates si tienes endpoint filtrado por usuario o sitio
        // const updates = await api.UpdateService.getUpdatesByUser(user.id);

        // 4. Filtrar por siteQuery si corresponde
        let filteredSites: typeof sites = sites;
        let headerLabel = 'global';
        const q = (siteQuery || '').trim();
        if (q) {
            if (isUUID(q)) {
                filteredSites = sites.filter(s => s.id === q);
                headerLabel = filteredSites[0]?.address || q;
            } else {
                filteredSites = sites.filter(s => s.address.toLowerCase().includes(q.toLowerCase()));
                headerLabel = q;
            }
        }

         // 5. Armar mensaje
        let parts: string[] = [];
        parts.push(`📅 Resumen ${q ? `de "${headerLabel}"` : 'global'} — ${today.toLocaleDateString()}`);
        parts.push('');

        let anyData = false;
        for (const { site, tasks } of tasksBySite) {
            if (!filteredSites.find(s => s.id === site.id)) continue;

            // Filtrar tareas del día
            const tasksToday = tasks.filter(t => inRange((t as any).created_at, start, end));
            const tasksUpdatedToday = tasks.filter(t => inRange((t as any).updated_at, start, end));
            const completedToday = tasks.filter(t =>
                t.status === 'completed' && (inRange((t as any).end_date, start, end) || inRange((t as any).updated_at, start, end))
            );
            const changeRequestsCreated = tasksToday.filter(t => (t.status as any) === 'changes');

            if (!tasksToday.length && !tasksUpdatedToday.length && !completedToday.length && !changeRequestsCreated.length) {
                if (!q) {
                    parts.push(`🏷️ ${site.address}`);
                    parts.push(`• 😴 Sin movimientos hoy`);
                    parts.push('');
                }
                continue;
            }

            anyData = true;
            parts.push(`🏷️ ${site.address}`);
            parts.push('');
            if (tasksToday.length) {
                parts.push(`• 🆕 Tareas creadas (${tasksToday.length})`);
                tasksToday.slice(0, 5).forEach((t: any) => {
                    parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title} · ${statusBadge(String(t.status))}`);
                });
                if (tasksToday.length > 5) parts.push(`   ◦ +${tasksToday.length - 5} más...`);
                parts.push('');
            }

            if (tasksUpdatedToday.length) {
                parts.push(`• ✏️ Tareas actualizadas (${tasksUpdatedToday.length})`);
                tasksUpdatedToday.slice(0, 5).forEach(t => {
                    parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title} · ${statusBadge(String(t.status))}`);
                });
                if (tasksUpdatedToday.length > 5) parts.push(`   ◦ +${tasksUpdatedToday.length - 5} más...`);
                parts.push('');
            }

            if (completedToday.length) {
                parts.push(`• ✅ Tareas completadas (${completedToday.length})`);
                completedToday.slice(0, 5).forEach(t => parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title}`));
                if (completedToday.length > 5) parts.push(`   ◦ +${completedToday.length - 5} más...`);
                parts.push('');
            }

            if (changeRequestsCreated.length) {
                parts.push(`• 🔄 Cambios solicitados (${changeRequestsCreated.length})`);
                changeRequestsCreated.slice(0, 5).forEach(t => {
                    parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title}`);
                });
                if (changeRequestsCreated.length > 5) parts.push(`   ◦ +${changeRequestsCreated.length - 5} más...`);
                parts.push('');
            }

            if (!anyData && filteredSites.length === 0) {
                const suggestions = sites
                    .filter(s => (siteQuery || '').trim() && s.address && s.address.toLowerCase().includes((siteQuery || '').trim().toLowerCase()))
                    .slice(0, 5)
                    .map(s => `- ${s.address} (${s.id})`)
                    .join('\n');
                    
                    const notFoundMsg = suggestions
                    ? `❌ No encontré una obra que coincida. Sugerencias:\n${suggestions}`
                    : `❌ No encontré una obra llamada "${siteQuery}"`;
                await sock.sendMessage(jid, { text: notFoundMsg });
                return;
            }
            
            const text = parts.join('\n');
            await sock.sendMessage(jid, { text });
            // Si tienes updates, agrégalos aquí
            // ...
        }
        } catch (err: any) {
            console.error('Error generando resumen:', err);
            await sock.sendMessage(jid, { text: `❌ No pude generar el resumen: ${err?.message || 'Error desconocido'}` });
        }
        }


// v2: Envía un único mensaje consolidado para evitar duplicados
async function sendDailySummary_v2(jid: string, sock: WASocket, siteQuery?: string): Promise<boolean> {
    try {
        const user = await getVerifiedUser(jid);
        if (!user) {
            await sock.sendMessage(jid, { text: 'No se pudo identificar tu usuario. Asegúrate de tener tu número registrado.' });
            return false;
        }

        const today = new Date();
        const { start, end } = dayBounds(today);

        const sites = await api.SiteService.getSitesByUser(user.id);
        const tasksBySite = await Promise.all(
            sites.map(async (site) => ({ site, tasks: await api.TaskService.getTasksBySite(site.id) }))
        );
        // Prefetch updates (avances) por obra para el día
        const now = new Date();
        const todayUTCStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const todayUTCEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        const updatesBySiteArr = await Promise.all(
            sites.map(async (s) => ({ siteId: s.id, updates: await fetchJSON<Update[]>(`/updates?site_id=${s.id}`) }))
        );
        const updatesMap = new Map<string, Update[]>(updatesBySiteArr.map(u => [u.siteId, u.updates]));

        let filteredSites: typeof sites = sites;
        let headerLabel = 'global';
        const q = (siteQuery || '').trim();
        if (q) {
            if (isUUID(q)) {
                filteredSites = sites.filter((s) => s.id === q);
                headerLabel = filteredSites[0]?.address || q;
            } else {
                filteredSites = sites.filter((s) => (s.address || '').toLowerCase().includes(q.toLowerCase()));
                headerLabel = q;
            }
        }

        if (q && filteredSites.length === 0) {
            const suggestions = sites
                .filter((s) => (s.address || '').toLowerCase().includes(q.toLowerCase()))
                .slice(0, 5)
                .map((s) => `- ${s.address} (${s.id})`)
                .join('\n');
            const notFoundMsg = suggestions
                ? `❌ No encontré una obra que coincida. Sugerencias:\n${suggestions}`
                : `❌ No encontré una obra llamada "${siteQuery}"`;
            await sock.sendMessage(jid, { text: notFoundMsg });
            return false;
        }

        // Solo ahora avisamos que estamos armando el resumen
        await sock.sendMessage(jid, { text: '⏳ Armando resumen del día...' });

        for (const { site, tasks } of tasksBySite) {
            if (!filteredSites.find((s) => s.id === site.id)) continue;

            const tasksToday = tasks.filter((t) => inRange((t as any).created_at, start, end));
            const tasksUpdatedToday = tasks.filter((t) => inRange((t as any).updated_at, start, end));
            const completedToday = tasks.filter(
                (t) => t.status === 'completed' && (inRange((t as any).end_date, start, end) || inRange((t as any).updated_at, start, end))
            );
            const changeRequestsCreated = tasksToday.filter((t) => (t.status as any) === 'changes');

            // Agenda y avances por obra
            const agendaToday = tasks.filter((t: any) => {
                if (!t.start_date) return false;
                const s = new Date(t.start_date);
                const e = t.end_date ? new Date(t.end_date) : null;
                return e ? (s <= todayUTCEnd && e >= todayUTCStart) : sameDayUTC(s, todayUTCStart);
            });
            const siteUpdates = updatesMap.get(site.id) || [];
            const updatesToday = siteUpdates.filter(u => {
                const d = new Date(u.created_at);
                return d >= todayUTCStart && d <= todayUTCEnd;
            });

            const siteParts: string[] = [];
            siteParts.push(`📅 Resumen — ${today.toLocaleDateString()}`);
            siteParts.push('');
            siteParts.push(`🏷️ ${site.address}`);
            siteParts.push('');

            if (!tasksToday.length && !tasksUpdatedToday.length && !completedToday.length && !changeRequestsCreated.length && !agendaToday.length && !updatesToday.length) {
                siteParts.push('• 😴 Sin movimientos hoy');
            } else {
                if (tasksToday.length) {
                    siteParts.push(`• 🆕 Tareas creadas (${tasksToday.length})`);
                    tasksToday.slice(0, 5).forEach((t: any) => {
                        siteParts.push(`   ◦ ${categoryIcon(t.category)} ${t.title} · ${statusBadge(String(t.status))}`);
                    });
                    if (tasksToday.length > 5) siteParts.push(`   ◦ +${tasksToday.length - 5} más...`);
                    siteParts.push('');
                }
                if (tasksUpdatedToday.length) {
                    siteParts.push(`• ✏️ Tareas actualizadas (${tasksUpdatedToday.length})`);
                    tasksUpdatedToday.slice(0, 5).forEach((t) => {
                        siteParts.push(`   ◦ ${categoryIcon(t.category)} ${t.title} · ${statusBadge(String(t.status))}`);
                    });
                    if (tasksUpdatedToday.length > 5) siteParts.push(`   ◦ +${tasksUpdatedToday.length - 5} más...`);
                    siteParts.push('');
                }
                if (completedToday.length) {
                    siteParts.push(`• ✅ Tareas completadas (${completedToday.length})`);
                    completedToday.slice(0, 5).forEach((t) => siteParts.push(`   ◦ ${categoryIcon(t.category)} ${t.title}`));
                    if (completedToday.length > 5) siteParts.push(`   ◦ +${completedToday.length - 5} más...`);
                    siteParts.push('');
                }
                if (changeRequestsCreated.length) {
                    siteParts.push(`• 🔄 Cambios solicitados (${changeRequestsCreated.length})`);
                    changeRequestsCreated.slice(0, 5).forEach((t) => {
                        siteParts.push(`   ◦ ${categoryIcon(t.category)} ${t.title}`);
                    });
                    if (changeRequestsCreated.length > 5) siteParts.push(`   ◦ +${changeRequestsCreated.length - 5} más...`);
                    siteParts.push('');
                }
                if (agendaToday.length) {
                    siteParts.push(`• 🗓️ Tareas agendadas hoy (${agendaToday.length})`);
                    agendaToday.slice(0, 5).forEach((t: any) => {
                        const s = timeStr(t.start_date);
                        const e = timeStr(t.end_date);
                        const range = s && e ? `${s}–${e}` : (s || '');
                        siteParts.push(`   ◦ ${range ? `${range} · ` : ''}${categoryIcon(t.category)} ${t.title}`);
                    });
                    if (agendaToday.length > 5) siteParts.push(`   ◦ +${agendaToday.length - 5} más...`);
                    siteParts.push('');
                }
                if (updatesToday.length) {
                    siteParts.push(`• 📸 Avances subidos hoy (${updatesToday.length})`);
                    updatesToday.slice(0, 3).forEach((u) => {
                        const t = (u.title || '').trim();
                        const d = (u.description || '').trim();
                        let body = '';
                        if (t && d) body = t.toLowerCase() === d.toLowerCase() ? t : `${t} — ${clip(d, 50)}`;
                        else if (t) body = t; else if (d) body = clip(d, 50); else body = '(sin título)';
                        siteParts.push(`   ◦ ${body}`);
                    });
                    if (updatesToday.length > 3) siteParts.push(`   ◦ +${updatesToday.length - 3} más...`);
                    siteParts.push('');
                }
            }

            await sock.sendMessage(jid, { text: siteParts.join('\n') });
        }
        return true;
    } catch (err: any) {
        console.error('Error generando resumen:', err);
        await sock.sendMessage(jid, { text: `❌ No pude generar el resumen: ${err?.message || 'Error desconocido'}` });
        return false;
    }
}

function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function sameDayUTC(a: Date, b: Date) {
    return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function timeStr(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

async function sendTodayAgenda(jid: string, sock: WASocket, siteQuery?: string) {
    try {
        await sock.sendMessage(jid, { text: '🔎 Buscando tareas agendadas para hoy…' });

        // Determinar intervalo de hoy en UTC
        const now = new Date();
        const todayUTCStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const todayUTCEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

        // Obtener usuario y sus obras
        const user = await getVerifiedUser(jid);
        if (!user) {
            await sock.sendMessage(jid, { text: 'No pude identificar tu usuario. Registrá tu número en la app.' });
            return;
        }
        const allSites = await api.SiteService.getSitesByUser(user.id);
        if (!allSites || allSites.length === 0) {
            await sock.sendMessage(jid, { text: '😕 No tenés obras asignadas.' });
            return;
        }

        // Aplicar filtro por obra, si se indicó
        const q = (siteQuery || '').trim().toLowerCase();
        let includedSites = allSites as any[];
        if (q) {
            includedSites = includedSites.filter(s => ((s.address || '') as string).toLowerCase().includes(q) || ((s.id || '') as string).toLowerCase() === q);
        }
        if (!includedSites.length) {
            await sock.sendMessage(jid, { text: `😕 No encontré obras que coincidan con "${siteQuery}"` });
            return;
        }

        // Obtener tareas por cada obra incluida
        const tasksBySite = await Promise.all(includedSites.map(async s => ({
            site: s,
            tasks: await api.TaskService.getTasksBySite(s.id)
        })));

        // Filtrar por solapamiento con hoy (UTC) y aplanar
        const agendaItems: { task: any; site: any }[] = [];
        for (const { site, tasks } of tasksBySite) {
            for (const t of tasks) {
                if (!t.start_date) continue;
                const start = new Date(t.start_date as any);
                const end = t.end_date ? new Date(t.end_date as any) : null;
                const overlaps = end ? (start <= todayUTCEnd && end >= todayUTCStart) : sameDayUTC(start, todayUTCStart);
                if (overlaps) agendaItems.push({ task: t, site });
            }
        }

        if (!agendaItems.length) {
            const msg = q ? `😕 No hay tareas agendadas para hoy en "${siteQuery}"` : '😕 No hay tareas agendadas para hoy en tus obras';
            await sock.sendMessage(jid, { text: msg });
            return;
        }

        // Ordenar por hora de inicio
        agendaItems.sort((a, b) => {
            const ta = a.task.start_date ? new Date(a.task.start_date).getTime() : 0;
            const tb = b.task.start_date ? new Date(b.task.start_date).getTime() : 0;
            return ta - tb;
        });

        const header = `🗓️ Agenda de hoy (${now.toLocaleDateString('es-AR')})${q ? ` — ${siteQuery}` : ''}`;
        const lines: string[] = [header, ''];
        for (const { task: t, site } of agendaItems) {
            const start = t.start_date ? new Date(t.start_date) : null;
            const end = t.end_date ? new Date(t.end_date) : null;
            let range = '';
            if (start && end && !sameDayUTC(start, end)) {
                range = 'Todo el día';
            } else {
                const s = timeStr(t.start_date);
                const e = timeStr(t.end_date);
                range = s && e ? `${s}–${e}` : (s || '');
            }
            const siteName = site.address || '';
            lines.push(`• ${range} · ${categoryIcon(t.category)} ${t.title}${siteName ? ` · 🏷️ ${siteName}` : ''}`);
        }
        await sock.sendMessage(jid, { text: lines.join('\n') });
    } catch (err: any) {
        console.error('Error en agenda de hoy:', err);
        await sock.sendMessage(jid, { text: `❌ No pude obtener la agenda: ${err?.message || 'Error desconocido'}` });
    }
}

// Manejo de selección de obra cuando el usuario tiene varias
async function handleSiteSelection(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    const options: any[] = context?.sitesOptions || [];
    if (!options.length) {
        await sock.sendMessage(senderNumber, { text: '❌ No encontré opciones de obra. Escribí "tarea" para empezar de nuevo.' });
        setChatState(senderNumber, 'IDLE');
        return;
    }
    let input = messageText.trim().toLowerCase();
    let chosen: any | null = null;
    const num = input.match(/^\d+/);
    if (num) {
        const idx = parseInt(num[0], 10) - 1;
        if (idx >= 0 && idx < options.length) chosen = options[idx];
    }
    if (!chosen) {
        // Buscar por substring de address o por UUID exacto
        chosen = options.find((s: any) => (s.address || '').toLowerCase().includes(input) || (s.id || '').toLowerCase() === input) || null;
    }
    if (!chosen) {
        await sock.sendMessage(senderNumber, { text: '⚠️ No reconocí la obra. Respondé con el número de la lista o parte del nombre.' });
        return;
    }
    setChatState(senderNumber, 'AWAITING_TASK_INPUT', { site_id: chosen.id, site_address: chosen.address });
    await sock.sendMessage(senderNumber, { text: `🏷️ Obra seleccionada: ${chosen.address}\n📝 Describí lo que tenés que hacer en un solo mensaje (ej: "Cambiar foco del baño mañana").` });
}

// Manejo de selección de obra para avances (texto o media)
async function handleUpdateSiteSelection(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    const options: any[] = context?.sitesOptions || [];
    if (!options.length) {
        await sock.sendMessage(senderNumber, { text: '❌ No encontré opciones de obra. Escribí "av <texto>" para intentar de nuevo.' });
        setChatState(senderNumber, 'IDLE');
        return;
    }
    let input = messageText.trim().toLowerCase();
    let chosen: any | null = null;
    const num = input.match(/^\d+/);
    if (num) {
        const idx = parseInt(num[0], 10) - 1;
        if (idx >= 0 && idx < options.length) chosen = options[idx];
    }
    if (!chosen) {
        chosen = options.find((s: any) => (s.address || '').toLowerCase().includes(input) || (s.id || '').toLowerCase() === input) || null;
    }
    if (!chosen) {
        await sock.sendMessage(senderNumber, { text: '⚠️ No reconocí la obra. Respondé con el número de la lista o parte del nombre.' });
        return;
    }
    // Resolver según el tipo de avance
    if (context?.updateKind === 'text') {
        const text = context?.textContent as string;
        await createTextUpdate(user, senderNumber, sock, text, (chosen as any).address);
        setChatState(senderNumber, 'IDLE');
        return;
    }
    if (context?.updateKind === 'media') {
        const base64 = context?.mediaBase64 as string;
        const caption = context?.caption as string | undefined;
        if (!base64) {
            await sock.sendMessage(senderNumber, { text: '❌ No encontré la imagen a subir. Enviá nuevamente la foto, por favor.' });
            setChatState(senderNumber, 'IDLE');
            return;
        }
        try {
            const buffer = Buffer.from(base64, 'base64');
            await uploadMediaToAPI(buffer, 'image', user.id, caption, (chosen as any).id);
            await sock.sendMessage(senderNumber, { text: `✅ Avance registrado con foto en ${chosen.address}.` });
        } catch (e: any) {
            console.error('Error subiendo avance con foto:', e);
            await sock.sendMessage(senderNumber, { text: `❌ No pude registrar el avance: ${e?.message || 'Error'}` });
        }
        setChatState(senderNumber, 'IDLE');
        return;
    }
    await sock.sendMessage(senderNumber, { text: '⚠️ Estado inesperado. Probá nuevamente.' });
    setChatState(senderNumber, 'IDLE');
}

// ====================
// Flujo de compras
// ====================

async function startPurchaseFlow(senderNumber: string, sock: WASocket, user: Profile) {
    try {
        const sites = await api.SiteService.getSitesByUser(user.id);
        if (!sites || sites.length === 0) {
            await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras asociadas a tu usuario. Creá una obra desde la app para continuar.' });
            return;
        }
        if (sites.length === 1) {
            setChatState(senderNumber, 'AWAITING_PURCHASE_PRODUCT', { site_id: (sites[0] as any).id, site_address: (sites[0] as any).address });
            await sock.sendMessage(senderNumber, { text: `🛒 ¡Perfecto! Vamos a crear una solicitud de compra.\n\n🏷️ Obra: ${(sites[0] as any).address || ''}\n\n📦 ¿Qué producto necesitás comprar?` });
            return;
        }
        const lines: string[] = [];
        lines.push('🛒 ¡Vamos a crear una solicitud de compra!\n');
        lines.push('🏷️ ¿En qué obra es para? (respondé con el número):');
        sites.slice(0, 20).forEach((s: any, idx: number) => lines.push(`${idx + 1}) ${s.address}`));
        await sock.sendMessage(senderNumber, { text: lines.join('\n') });
        setChatState(senderNumber, 'AWAITING_PURCHASE_SITE', { sitesOptions: sites });
    } catch (e) {
        await sock.sendMessage(senderNumber, { text: '❌ No pude obtener tus obras. Intentá de nuevo más tarde.' });
    }
}

async function handlePurchaseSiteSelection(messageText: string, context: any, user: Profile, senderNumber: string, sock: WASocket) {
    const options: any[] = context?.sitesOptions || [];
    if (!options.length) {
        await sock.sendMessage(senderNumber, { text: '❌ No encontré opciones de obra. Escribí "compra" para empezar de nuevo.' });
        setChatState(senderNumber, 'IDLE');
        return;
    }
    let input = messageText.trim().toLowerCase();
    let chosen: any | null = null;
    const num = input.match(/^\d+/);
    if (num) {
        const idx = parseInt(num[0], 10) - 1;
        if (idx >= 0 && idx < options.length) chosen = options[idx];
    }
    if (!chosen) {
        chosen = options.find((s: any) => (s.address || '').toLowerCase().includes(input) || (s.id || '').toLowerCase() === input) || null;
    }
    if (!chosen) {
        await sock.sendMessage(senderNumber, { text: '⚠️ No reconocí la obra. Respondé con el número de la lista o parte del nombre.' });
        return;
    }
    setChatState(senderNumber, 'AWAITING_PURCHASE_PRODUCT', { site_id: chosen.id, site_address: chosen.address });
    await sock.sendMessage(senderNumber, { text: `✅ Obra seleccionada: ${chosen.address}\n\n📦 ¿Qué producto necesitás comprar?` });
}

async function handlePurchaseProduct(messageText: string, context: any, senderNumber: string, sock: WASocket) {
    const product = messageText.trim();
    if (!product) {
        await sock.sendMessage(senderNumber, { text: '⚠️ Por favor, escribí el nombre del producto.' });
        return;
    }
    setChatState(senderNumber, 'AWAITING_PURCHASE_CATEGORY', { ...context, product });
    // Categorías permitidas en la base de datos (enum task_category)
    const categories = [
        { display: 'Electricidad', value: 'electricidad' },
        { display: 'Construcción', value: 'construccion' },
        { display: 'Pintura', value: 'pintura' },
        { display: 'Plomería', value: 'plomeria' }
    ];
    const lines: string[] = [];
    lines.push(`✅ Producto: ${product}\n`);
    lines.push('📂 ¿A qué categoría pertenece? (respondé con el número):');
    categories.forEach((cat, idx) => lines.push(`${idx + 1}) ${cat.display}`));
    await sock.sendMessage(senderNumber, { text: lines.join('\n') });
}

async function handlePurchaseCategory(messageText: string, context: any, senderNumber: string, sock: WASocket) {
    // Categorías permitidas en la base de datos (enum task_category)
    const categories = [
        { display: 'Electricidad', value: 'electricidad' },
        { display: 'Construcción', value: 'construccion' },
        { display: 'Pintura', value: 'pintura' },
        { display: 'Plomería', value: 'plomeria' }
    ];
    let input = messageText.trim();
    let category: string | null = null;
    const num = input.match(/^\d+/);
    if (num) {
        const idx = parseInt(num[0], 10) - 1;
        if (idx >= 0 && idx < categories.length) {
            category = categories[idx].value;
        }
    }
    if (!category) {
        // Buscar por nombre (case insensitive, sin acentos)
        const normalizedInput = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const matched = categories.find(cat => {
            const normalizedDisplay = cat.display.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normalizedDisplay.includes(normalizedInput) || cat.value === normalizedInput;
        });
        if (matched) category = matched.value;
    }
    if (!category) {
        await sock.sendMessage(senderNumber, { text: '⚠️ Categoría no válida. Respondé con el número de la lista (1-4).' });
        return;
    }
    const categoryDisplay = categories.find(c => c.value === category)?.display || category;
    setChatState(senderNumber, 'AWAITING_PURCHASE_QUANTITY', { ...context, category });
    await sock.sendMessage(senderNumber, { text: `✅ Categoría: ${categoryDisplay}\n\n🔢 ¿Cuántas unidades necesitás? (escribí solo el número)` });
}

async function handlePurchaseQuantity(messageText: string, context: any, senderNumber: string, sock: WASocket) {
    const quantityStr = messageText.trim();
    const quantity = parseFloat(quantityStr);
    if (isNaN(quantity) || quantity <= 0) {
        await sock.sendMessage(senderNumber, { text: '⚠️ Por favor, escribí un número válido mayor a cero.' });
        return;
    }
    setChatState(senderNumber, 'AWAITING_PURCHASE_PRICE', { ...context, quantity });
    await sock.sendMessage(senderNumber, { text: `✅ Cantidad: ${quantity}\n\n💰 ¿Cuál es el precio unitario? (escribí el número, o "0" si no lo sabés)` });
}

async function handlePurchasePrice(messageText: string, context: any, senderNumber: string, sock: WASocket) {
    const priceStr = messageText.trim();
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
        await sock.sendMessage(senderNumber, { text: '⚠️ Por favor, escribí un número válido (0 si no lo sabés).' });
        return;
    }
    const finalPrice = price === 0 ? undefined : price;
    setChatState(senderNumber, 'AWAITING_PURCHASE_SUPPLIER', { ...context, price: finalPrice });
    await sock.sendMessage(senderNumber, { text: `✅ Precio: ${finalPrice ? `$${finalPrice}` : 'No especificado'}\n\n🏪 ¿Cuál es el proveedor? (escribí el nombre o "ninguno" para omitir)` });
}

async function handlePurchaseSupplier(messageText: string, context: any, senderNumber: string, sock: WASocket) {
    const supplier = messageText.trim();
    const finalSupplier = supplier.toLowerCase() === 'ninguno' || supplier.toLowerCase() === 'no' ? undefined : supplier;
    setChatState(senderNumber, 'AWAITING_PURCHASE_DESCRIPTION', { ...context, supplier: finalSupplier });
    await sock.sendMessage(senderNumber, { text: `✅ Proveedor: ${finalSupplier || 'No especificado'}\n\n📝 ¿Querés agregar una descripción? (escribí la descripción o "no" para omitir)` });
}

async function handlePurchaseDescription(messageText: string, context: any, user: Profile, senderNumber: string, sock: WASocket) {
    const description = messageText.trim();
    const finalDescription = description.toLowerCase() === 'no' || description.toLowerCase() === 'ninguna' ? undefined : description;
    
    try {
        await sock.sendMessage(senderNumber, { text: '⏳ Creando la solicitud de compra...' });
        
        // Asegurar que quantity sea un número
        const quantityNum = typeof context.quantity === 'number' ? context.quantity : parseFloat(String(context.quantity));
        if (isNaN(quantityNum) || quantityNum <= 0) {
            await sock.sendMessage(senderNumber, { text: '❌ Error: La cantidad debe ser un número válido mayor a cero.' });
            setChatState(senderNumber, 'IDLE');
            return;
        }

        // Asegurar que price sea un número o undefined
        let priceNum: number | undefined = undefined;
        if (context.price !== undefined && context.price !== null) {
            const parsedPrice = typeof context.price === 'number' ? context.price : parseFloat(String(context.price));
            if (!isNaN(parsedPrice) && parsedPrice >= 0) {
                priceNum = parsedPrice;
            }
        }

        const purchaseData: CreatePurchaseDTO = {
            product: context.product,
            category: context.category,
            quantity: quantityNum,
            price: priceNum,
            supplier: context.supplier,
            description: finalDescription,
            status: 'pending'
        };

        // El servicio espera CreatePurchaseDTO pero el backend necesita site_id y user_id
        const purchasePayload: any = {
            ...purchaseData,
            site_id: context.site_id,
            user_id: user.id
        };

        console.log('Creando compra con payload:', JSON.stringify(purchasePayload, null, 2));
        const createdPurchase = await api.PurchaseService.createPurchase(purchasePayload);

        const summary = [
            '✅ ¡Solicitud de compra creada con éxito!\n',
            `📦 Producto: ${createdPurchase.product}`,
            `📂 Categoría: ${createdPurchase.category}`,
            `🔢 Cantidad: ${createdPurchase.quantity}`,
            createdPurchase.price ? `💰 Precio unitario: $${createdPurchase.price}` : '',
            createdPurchase.supplier ? `🏪 Proveedor: ${createdPurchase.supplier}` : '',
            createdPurchase.description ? `📝 Descripción: ${createdPurchase.description}` : '',
            `\n🏷️ Obra: ${context.site_address || ''}`
        ].filter(Boolean).join('\n');

        await sock.sendMessage(senderNumber, { text: summary });
        setChatState(senderNumber, 'IDLE');
    } catch (error: any) {
        console.error('Error creando solicitud de compra:', error);
        console.error('Contexto:', JSON.stringify(context, null, 2));
        console.error('Usuario:', JSON.stringify({ id: user.id, name: user.name }, null, 2));
        
        // Mensaje de error más detallado
        const errorMessage = error?.message || 'Error desconocido';
        const errorDetails = errorMessage.includes('500') 
            ? 'Error del servidor. Verificá que todos los datos sean correctos.'
            : errorMessage;
        
        await sock.sendMessage(senderNumber, { text: `❌ No pude crear la solicitud de compra: ${errorDetails}` });
        setChatState(senderNumber, 'IDLE');
    }
}

// Resumen de contadores del día (avances + agenda)
async function sendTodayCounts(jid: string, sock: WASocket, siteQuery?: string) {
    try {
        const user = await getVerifiedUser(jid);
        if (!user) return;
        const sites = await api.SiteService.getSitesByUser(user.id);
        let included = sites;
        const q = (siteQuery || '').trim();
        if (q) {
            if (isUUID(q)) included = sites.filter(s => s.id === q);
            else included = sites.filter(s => (s.address || '').toLowerCase().includes(q.toLowerCase()));
        }
        const now = new Date();
        const startUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const endUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

        // Agenda count
        const tasksBySite = await Promise.all(included.map(async site => ({ site, tasks: await api.TaskService.getTasksBySite(site.id) })));
        const agendaCount = tasksBySite.reduce((acc, { tasks }) => acc + tasks.filter((t: any) => {
            const s = t.start_date ? new Date(t.start_date) : null;
            const e = t.end_date ? new Date(t.end_date) : null;
            if (!s) return false;
            if (e) return s <= endUTC && e >= startUTC;
            return s.getUTCFullYear() === startUTC.getUTCFullYear() && s.getUTCMonth() === startUTC.getUTCMonth() && s.getUTCDate() === startUTC.getUTCDate();
        }).length, 0);

        // Advances count
        const updatesArrays = await Promise.all(included.map(s => fetchJSON<Update[]>(`/updates?site_id=${s.id}`)));
        const advancesCount = updatesArrays.reduce((acc, arr) => acc + arr.filter(u => {
            const d = new Date(u.created_at);
            return d >= startUTC && d <= endUTC;
        }).length, 0);

        const text = `📸 Avances subidos hoy: ${advancesCount}\n📅 Tareas agendadas hoy: ${agendaCount}`;
        await sock.sendMessage(jid, { text });
    } catch (err) {
        console.error('Error sendTodayCounts:', err);
    }
}

// --------------------
// Listar obras del usuario
// --------------------
async function sendMySites(jid: string, sock: WASocket, user: Profile) {
    try {
        const sites = await api.SiteService.getSitesByUser(user.id);
        let list = sites || [];
        if (!list.length) {
            await sock.sendMessage(jid, { text: '😕 No tenés obras asignadas' });
            return;
        }
        const lines: string[] = [];
        lines.push(`🏷️ Tus obras (${list.length})`);
        lines.push('');
        list.slice(0, 20).forEach((s: any, i: number) => {
            lines.push(`${i + 1}. ${s.address}`);
        });
        lines.push('');
        lines.push('Consejos:');
        lines.push('• 🧾 res <obra>  · resumen por obra');
        lines.push('• 📅 agenda <obra> · agenda de hoy');
        lines.push('• 📸 avances <obra> · avances de hoy');
        await sock.sendMessage(jid, { text: lines.join('\n') });
    } catch (err: any) {
        console.error('Error listando obras:', err);
        await sock.sendMessage(jid, { text: `❌ No pude obtener tus obras: ${err?.message || 'Error desconocido'}` });
    }
}

// --------------------
// Avances (updates) de hoy
// --------------------
async function sendAdvancesToday(jid: string, sock: WASocket, siteQuery?: string) {
    try {
        await sock.sendMessage(jid, { text: '📸 Buscando avances de hoy…' });

        const user = await getVerifiedUser(jid);
        if (!user) {
            await sock.sendMessage(jid, { text: 'No pude identificar tu usuario. Registrá tu número en la app.' });
            return;
        }

        const now = new Date();
        const todayUTCStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const todayUTCEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

        const sites = await api.SiteService.getSitesByUser(user.id);
        let included = sites;
        const q = (siteQuery || '').trim();
        if (q) {
            if (isUUID(q)) included = sites.filter(s => s.id === q);
            else included = sites.filter(s => (s.address || '').toLowerCase().includes(q.toLowerCase()));
        }
        if (!included.length) {
            await sock.sendMessage(jid, { text: 'No encontré obras para tu usuario o filtro.' });
            return;
        }

        const updatesBySite = await Promise.all(included.map(async s => {
            const upd = await fetchJSON<Update[]>(`/updates?site_id=${s.id}`);
            const today = upd.filter(u => {
                const d = new Date(u.created_at);
                return d >= todayUTCStart && d <= todayUTCEnd;
            });
            return { site: s, updates: today };
        }));

        const all = updatesBySite.flatMap(u => u.updates.map(x => ({ ...x, site: u.site })));
        if (!all.length) {
            await sock.sendMessage(jid, { text: '😕 No hay avances para hoy' });
            return;
        }

        const header = `📸 Avances de hoy (${now.toLocaleDateString('es-AR')})` + (q ? ` — ${q}` : '');
        const lines: string[] = [header, ''];
        for (const u of all.slice(0, 5)) {
            const siteName = (u as any).site?.address || '';
            const t = (u.title || '').trim();
            const d = (u.description || '').trim();
            let body = '';
            if (t && d) {
                if (t.toLowerCase() === d.toLowerCase()) body = t;
                else body = `${t} — ${clip(d, 50)}`;
            } else if (t) body = t; else if (d) body = clip(d, 50); else body = '(sin título)';
            lines.push(`• ${body}${siteName ? ` · 🏷️ ${siteName}` : ''}`);
        }
        if (all.length > 5) lines.push(`… y ${all.length - 5} más`);
        await sock.sendMessage(jid, { text: lines.join('\n') });

        for (const u of all) {
            if (!u.image_url) continue;
            try {
                const t = (u.title || '').trim();
                const d = (u.description || '').trim();
                let caption = '';
                if (t && d) {
                    if (t.toLowerCase() === d.toLowerCase()) caption = t;
                    else caption = `${t} — ${clip(d, 100)}`;
                } else if (t) caption = t; else if (d) caption = clip(d, 100);
                if (u.image_url.startsWith('data:')) {
                    const base64 = u.image_url.split(',')[1];
                    const buf = Buffer.from(base64, 'base64');
                    await sock.sendMessage(jid, { image: buf, caption });
                } else {
                    await sock.sendMessage(jid, { image: { url: u.image_url }, caption });
                }
            } catch (e) {
                console.error('Error enviando imagen de avance:', e);
            }
        }
    } catch (err: any) {
        console.error('Error en avances de hoy:', err);
        await sock.sendMessage(jid, { text: `❌ No pude obtener avances: ${err?.message || 'Error desconocido'}` });
    }
}

export default async function connectToWhatsApp() {
    // Usar ruta absoluta para la carpeta de sesión (evita confusiones de CWD)
    const AUTH_DIR = path.resolve(process.cwd(), 'auth_info_baileys');
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Alinear con la versión soportada por WhatsApp Web para evitar cierres tempranos
    const { version } = await fetchLatestBaileysVersion();

    const sock: WASocket = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        version,
        browser: ['Cimenta', 'Chrome', '120'],
    });

    // Guardar el socket globalmente para usarlo en las notificaciones
    globalSock = sock;

    // Manejo de la conexión y el código QR
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Log del estado de conexión
        if (connection) {
            console.log(`[CONEXIÓN] Estado actual: ${connection}`);
        }
        
        if (qr) {
            console.log('Escanea este código QR con tu WhatsApp:');
            qrcode.generate(qr, { small: true });
            console.log(qr);
        }
        
        if (connection === 'close') {
            console.log('\n========== DESCONEXIÓN DETECTADA ==========');
            console.log(`[TIMESTAMP] ${new Date().toISOString()}`);
            
            // Log completo del objeto lastDisconnect
            if (lastDisconnect) {
                console.log('[LAST_DISCONNECT] Objeto completo:', JSON.stringify(lastDisconnect, null, 2));
            } else {
                console.log('[LAST_DISCONNECT] No hay información de desconexión disponible');
            }
            
            // Extraer información del error
            const error = lastDisconnect?.error as any;
            const statusCode = error?.output?.statusCode || error?.statusCode;
            const errorMessage = error?.message || '';
            const errorOutput = error?.output;
            const errorData = error?.data;
            
            console.log(`[STATUS_CODE] ${statusCode || 'NO DISPONIBLE'}`);
            console.log(`[ERROR_MESSAGE] ${errorMessage || 'NO DISPONIBLE'}`);
            
            if (errorOutput) {
                console.log('[ERROR_OUTPUT]', JSON.stringify(errorOutput, null, 2));
            }
            
            if (errorData) {
                console.log('[ERROR_DATA]', JSON.stringify(errorData, null, 2));
            }
            
            // Log de todos los DisconnectReason para referencia
            console.log('\n[REFERENCIA] DisconnectReason posibles:');
            console.log(`  - loggedOut: ${DisconnectReason.loggedOut}`);
            console.log(`  - badSession: ${DisconnectReason.badSession}`);
            console.log(`  - restartRequired: ${DisconnectReason.restartRequired}`);
            console.log(`  - timedOut: ${DisconnectReason.timedOut}`);
            console.log(`  - connectionClosed: ${DisconnectReason.connectionClosed}`);
            console.log(`  - connectionLost: ${DisconnectReason.connectionLost}`);
            console.log(`  - connectionReplaced: ${DisconnectReason.connectionReplaced}`);
            console.log(`  - multideviceMismatch: ${DisconnectReason.multideviceMismatch}`);
            
            // Determinar la razón específica
            let disconnectReason = 'DESCONOCIDA';
            if (statusCode === DisconnectReason.loggedOut) disconnectReason = 'LOGGED_OUT (Sesión cerrada desde otro dispositivo)';
            else if (statusCode === DisconnectReason.badSession) disconnectReason = 'BAD_SESSION (Sesión inválida o corrupta)';
            else if (statusCode === DisconnectReason.restartRequired) disconnectReason = 'RESTART_REQUIRED (Reinicio requerido)';
            else if (statusCode === DisconnectReason.timedOut) disconnectReason = 'TIMED_OUT (Timeout de conexión)';
            else if (statusCode === DisconnectReason.connectionClosed) disconnectReason = 'CONNECTION_CLOSED (Conexión cerrada)';
            else if (statusCode === DisconnectReason.connectionLost) disconnectReason = 'CONNECTION_LOST (Conexión perdida)';
            else if (statusCode === DisconnectReason.connectionReplaced) disconnectReason = 'CONNECTION_REPLACED (Conexión reemplazada)';
            else if (statusCode === DisconnectReason.multideviceMismatch) disconnectReason = 'MULTIDEVICE_MISMATCH (Incompatibilidad multi-dispositivo)';
            
            console.log(`[RAZÓN] ${disconnectReason}`);
            
            // Manejo específico del error 429 (Too Many Requests)
            if (statusCode === 429 || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
                console.log('⚠️ Error 429: Demasiadas solicitudes. Esperando antes de reconectar...');
                // Esperar más tiempo antes de reconectar (30 segundos)
                setTimeout(() => connectToWhatsApp(), 30000);
                console.log('========== FIN LOG DESCONEXIÓN ==========\n');
                return;
            }
            
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.badSession;
            console.log(`[SHOULD_RECONNECT] ${shouldReconnect}`);
            console.log('========== FIN LOG DESCONEXIÓN ==========\n');
            
            if (shouldReconnect) {
                console.log('🔄 Intentando reconectar en 2 segundos...');
                // Pequeño delay para evitar bucles de reconexión que impiden el QR
                setTimeout(() => connectToWhatsApp(), 2000);
            } else {
                console.log('❌ Sesión inválida o cerrada. Si querés reautenticar, borrá la carpeta:', AUTH_DIR);
                console.log(`   Razón: ${disconnectReason}`);
            }
        } else if (connection === 'open') {
            console.log('✅ ¡Conexión con WhatsApp abierta!');
            console.log(`[TIMESTAMP] ${new Date().toISOString()}`);
        } else if (connection === 'connecting') {
            console.log('🔄 Conectando a WhatsApp...');
        } else if (connection) {
            console.log(`[CONEXIÓN] Estado: ${connection}`);
        }
    });

    // Guardar credenciales de sesión
    sock.ev.on('creds.update', () => {
        console.log('[CREDENCIALES] Actualizando credenciales de sesión...');
        saveCreds();
        console.log('[CREDENCIALES] Credenciales guardadas correctamente');
    });

    // Manejo de mensajes entrantes
    sock.ev.on('messages.upsert', async (m) => {
        try {
            await handleIncomingMessage(m, sock);
        } catch (error: any) {
            console.error('Error crítico en handleIncomingMessage:', error);
            // No relanzar el error para evitar cerrar la conexión
        }
    })

    // No se requiere manejar messages.update para botones
}

async function getVerifiedUser(senderNumber: string) {
    if (verifiedUsersCache.has(senderNumber)) {
        return verifiedUsersCache.get(senderNumber);
    }

    try {
        const user = await api.AuthService.getProfileByWhatsapp(senderNumber);
        verifiedUsersCache.set(senderNumber, user);
        return user;
    } catch (error) {
        verifiedUsersCache.set(senderNumber, null);
        return null;
    }
}

async function handleTaskCreation(task: CreateTaskDTO, senderNumber: string, sock: WASocket) {
    try {

        console.log(task);
        // Llamada al service
        const createdTask = await api.TaskService.createTask(task);

        await sock.sendMessage(senderNumber, {
            text: `✅ Tarea creada con éxito:\nTítulo: ${createdTask.title}`
        });

    } catch (error: any) {
        console.error('Error al procesar el mensaje:', error.message);
        // Enviamos el mensaje de error al usuario para que sepa qué salió mal
        await sock.sendMessage(senderNumber, { text: `❌ Error: ${error.message}` });
    }
}

// Eliminado: normalización local ya no es necesaria porque la IA devuelve valores DTO-ready

async function handleTaskStateUpdate(taskId: string, newState: string, senderNumber: string, sock: WASocket) {
    try {
        const status = newState as Task['status'];
        await api.TaskService.updateTaskStatus(taskId, status);
        await sock.sendMessage(senderNumber, {
            text: `✅ El estado de la tarea ${taskId} ha sido actualizado a "${newState}".`
        });
    } catch (error: any) {
        console.error('Error al actualizar el estado de la tarea:', error.message);
        await sock.sendMessage(senderNumber, { text: `❌ Error al actualizar la tarea: ${error.message}` });
    }
}

// Función para enviar notificación cuando una tarea pasa a blocked
async function notifyBlockedTask(whatsappJid: string, taskId: string, taskTitle: string, taskDescription?: string, siteAddress?: string) {
    if (!globalSock) {
        console.error('Socket de WhatsApp no está disponible para enviar notificación');
        return;
    }

    try {
        const message = [
            '⛔ *Tarea Bloqueada*',
            '',
            `📋 *${taskTitle}*`,
            taskDescription ? `📝 ${taskDescription}` : '',
            siteAddress ? `🏷️ Obra: ${siteAddress}` : '',
            '',
            'Tu tarea ha sido marcada como bloqueada. Revisá los detalles en la app.'
        ].filter(Boolean).join('\n');

        await safeSendMessage(globalSock, whatsappJid, message);
        console.log(`Notificación de tarea bloqueada enviada a ${whatsappJid}`);
    } catch (error: any) {
        console.error('Error enviando notificación de tarea bloqueada:', error);
        throw error;
    }
}

// Función para enviar notificación cuando una compra cambia a purchased o delivered
async function notifyPurchaseStatusChange(whatsappJid: string, purchaseId: string, product: string, status: 'purchased' | 'delivered', siteAddress?: string) {
    if (!globalSock) {
        console.error('Socket de WhatsApp no está disponible para enviar notificación');
        return;
    }

    try {
        const statusEmoji = status === 'purchased' ? '🛒' : '📦';
        const statusText = status === 'purchased' ? 'Comprada' : 'Recibida';
        
        const message = [
            `${statusEmoji} *Compra ${statusText}*`,
            '',
            `📦 *${product}*`,
            siteAddress ? `🏷️ Obra: ${siteAddress}` : '',
            '',
            status === 'purchased' 
                ? 'Tu solicitud de compra ha sido marcada como comprada. Revisá los detalles en la app.'
                : 'Tu compra ha sido marcada como recibida. Revisá los detalles en la app.'
        ].filter(Boolean).join('\n');

        await safeSendMessage(globalSock, whatsappJid, message);
        console.log(`Notificación de compra ${status} enviada a ${whatsappJid}`);
    } catch (error: any) {
        console.error('Error enviando notificación de cambio de estado de compra:', error);
        throw error;
    }
}

// Crear servidor HTTP para recibir notificaciones del backend
function createNotificationServer() {
    const port = process.env.WHATSAPP_BOT_PORT || 3001;
    
    const server = http.createServer(async (req, res) => {
        // Configurar CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        if (req.method === 'POST' && req.url === '/notify/blocked-task') {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { whatsappJid, taskId, taskTitle, taskDescription, siteAddress } = data;
                    
                    if (!whatsappJid || !taskId || !taskTitle) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Faltan campos requeridos: whatsappJid, taskId, taskTitle' }));
                        return;
                    }
                    
                    await notifyBlockedTask(whatsappJid, taskId, taskTitle, taskDescription, siteAddress);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Notificación enviada' }));
                } catch (error: any) {
                    console.error('Error procesando notificación:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message || 'Error interno del servidor' }));
                }
            });
        } else if (req.method === 'POST' && req.url === '/notify/purchase-status') {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { whatsappJid, purchaseId, product, status, siteAddress } = data;
                    
                    if (!whatsappJid || !purchaseId || !product || !status) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Faltan campos requeridos: whatsappJid, purchaseId, product, status' }));
                        return;
                    }
                    
                    if (status !== 'purchased' && status !== 'delivered') {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Status debe ser "purchased" o "delivered"' }));
                        return;
                    }
                    
                    await notifyPurchaseStatusChange(whatsappJid, purchaseId, product, status, siteAddress);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Notificación enviada' }));
                } catch (error: any) {
                    console.error('Error procesando notificación de compra:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message || 'Error interno del servidor' }));
                }
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
        }
    });
    
    server.listen(port, () => {
        console.log(`🚀 Servidor de notificaciones del bot escuchando en puerto ${port}`);
    });
    
    return server;
}

// Iniciar el servidor de notificaciones
createNotificationServer();

// Conectar a WhatsApp
connectToWhatsApp();
