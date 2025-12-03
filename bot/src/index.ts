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

        // Procesar el texto transcrito con Gemini AI
        // NOTA: Esta es la ÚNICA llamada a Gemini AI en todo el sistema.
        // Solo se usa para procesar transcripciones de audio destinadas a crear tareas.
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

        const botJid = sock.user?.id;
        let senderNumber: string | null | undefined = msg.key.remoteJid;

        // Función auxiliar para normalizar números (sin @s.whatsapp.net)
        const normalizeJid = (jid: string | null | undefined) => {
            if (!jid) return undefined;
            return jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
        };

        // Permitir mensajes que te escribes a ti mismo (fromMe: true) solo si son del número permitido
        // Esto evita loops infinitos pero permite que te respondas a ti misma
        if (msg.key.fromMe) {
            if (ALLOWED_WHATSAPP_NUMBER) {
                const normalizedAllowed = normalizeJid(ALLOWED_WHATSAPP_NUMBER);
                const normalizedSender = normalizeJid(senderNumber);
                const normalizedBotJid = normalizeJid(botJid);
                
                // Permitir si el mensaje es del número permitido
                const isFromAllowedNumber = normalizedSender === normalizedAllowed || 
                                          (normalizedBotJid === normalizedAllowed && !senderNumber);
                
                if (isFromAllowedNumber) {
                    // Si senderNumber es undefined, usar el número permitido como senderNumber
                    if (!senderNumber && ALLOWED_WHATSAPP_NUMBER) {
                        senderNumber = ALLOWED_WHATSAPP_NUMBER;
                    }
                    // Continuar procesando el mensaje
                } else {
                    // Ignorar mensajes fromMe que no son del número permitido (evita loops)
                    return;
                }
            } else {
                // Si no hay número permitido configurado, ignorar todos los mensajes fromMe (evita loops)
                return;
            }
        }
        
        if (!senderNumber) {
            return;
        }

        // Restricción: solo responder al número permitido (si está configurado)
        if (ALLOWED_WHATSAPP_NUMBER) {
            const normalizedAllowed = normalizeJid(ALLOWED_WHATSAPP_NUMBER);
            const normalizedSender = normalizeJid(senderNumber);
            
            if (normalizedSender !== normalizedAllowed) {
                console.log(`Mensaje bloqueado de: ${senderNumber} (solo se permite: ${ALLOWED_WHATSAPP_NUMBER})`);
                return;
            }
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

    // Comando de comparar obras
    if (lower === 'comparar obras' || lower === 'comparar' || lower.startsWith('comparar obras')) {
        await sendSitesComparison(senderNumber, sock, user);
        return;
    }

    // Comandos para actualizar estado de tareas
    if (lower.startsWith('completar tarea') || lower.startsWith('completada tarea') || 
        lower.startsWith('bloquear tarea') || lower.startsWith('bloqueada tarea') ||
        lower.startsWith('en progreso tarea') || lower.startsWith('progreso tarea') ||
        lower.startsWith('pendiente tarea')) {
        await handleTaskStatusUpdateCommand(messageText, user, senderNumber, sock);
        return;
    }

    // Comandos de búsqueda y filtrado de tareas
    if (lower.startsWith('buscar tarea') || lower.startsWith('buscar tareas') ||
        lower.startsWith('tareas bloqueadas') || lower.startsWith('tareas pendientes') ||
        lower.startsWith('tareas completadas') || lower.startsWith('tareas en progreso') ||
        lower.startsWith('tareas esta semana') || lower.startsWith('tareas esta mes') ||
        lower.startsWith('tareas hoy') || lower.startsWith('tareas mañana')) {
        await handleTaskSearchCommand(messageText, user, senderNumber, sock);
        return;
    }

    // Comando de clima para obra
    if (lower.startsWith('clima obra') || lower.startsWith('clima')) {
        const obraName = messageText.replace(/^clima\s+(obra\s+)?/i, '').trim();
        await handleWeatherCommand(obraName, user, senderNumber, sock);
        return;
    }

    // Comandos de seguimiento de compras
    if (lower.startsWith('compras pendientes') || lower.startsWith('compras esta semana') ||
        lower.startsWith('estado compra') || lower.startsWith('compras compradas') ||
        lower.startsWith('compras entregadas')) {
        await handlePurchaseTrackingCommand(messageText, user, senderNumber, sock);
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

        case 'AWAITING_TASK_SELECTION_FOR_STATUS':
            await handleTaskSelectionForStatus(messageText, context, user, senderNumber, sock);
            break;

        case 'VIEWING_TASK_SEARCH_RESULTS':
            await handleTaskSearchResultsInteraction(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_WEATHER_SITE_SELECTION':
            await handleWeatherSiteSelection(messageText, context, user, senderNumber, sock);
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

📊 Escribí "*comparar obras*" para ver una comparativa de productividad entre tus obras.

✅ Escribí "*completar tarea [número/título]*" para marcar una tarea como completada.
⛔ Escribí "*bloquear tarea [número/título]*" para bloquear una tarea.
🚧 Escribí "*en progreso tarea [número/título]*" para poner una tarea en progreso.

🔍 Escribí "*buscar tarea [categoría/texto]*" para buscar tareas.
📋 Escribí "*tareas bloqueadas*" o "*tareas esta semana*" para filtrar tareas.

🌤️ Escribí "*clima obra [nombre]*" para ver el pronóstico del tiempo de una obra.

🛒 Escribí "*compra*" o "*c*" para crear una solicitud de compra.
📋 Escribí "*compras pendientes*" o "*compras esta semana*" para ver tus compras.
🔍 Escribí "*estado compra [ID]*" para ver el estado de una compra específica.

❌ Escribí "*cancelar*" para cancelar cualquier operación en curso.`
        });
    }
}

async function handleTaskTitle(
    messageText: string,
    senderNumber: string,
    sock: WASocket
) {
    const { context } = getChatState(senderNumber);
    // Si hay una descripción inicial, usarla automáticamente
    if (context?.initialDescription) {
        setChatState(senderNumber, 'AWAITING_TASK_CATEGORY', {
            ...context,
            title: messageText,
            description: context.initialDescription
        });
        const body = [
            '✅ Título guardado.',
            '',
            'Elegí la categoría de la tarea (respondé con número o nombre):',
            '1) *Pintura* 🎨',
            '2) *Construcción* 🏗️',
            '3) *Electricidad* ⚡',
            '4) *Plomería* 🚰',
        ].join('\n');
        await sock.sendMessage(senderNumber, { text: body });
    } else {
        await sock.sendMessage(senderNumber, {
            text: '✅ Título guardado.\n🖊️ Ahora escribí una breve *descripción*.'
        });
        setChatState(senderNumber, 'AWAITING_TASK_DESCRIPTION', { ...context, title: messageText });
    }
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

// Flujo manual para crear tareas desde texto: el usuario describe la tarea y luego se piden los campos necesarios
// NOTA: Este flujo NO usa Gemini AI. Solo los audios usan Gemini AI para procesar transcripciones.
async function handleTaskInput(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        // Guardar la descripción inicial y pedir el título
        await safeSendMessage(sock, senderNumber, '📝 Describiste: "' + messageText + '"\n\n✍️ Ahora escribí un *título breve* para la tarea (ej: "Arreglar caño del baño").');
        setChatState(senderNumber, 'AWAITING_TASK_TITLE', {
            ...context,
            initialDescription: messageText
        });
    } catch (e: any) {
        console.error('Error en handleTaskInput:', e);
        await safeSendMessage(sock, senderNumber, `❌ No pude procesar tu mensaje: ${e?.message || 'Error desconocido'}`);
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
        lines.push('• 📊 comparar obras · comparativa entre obras');
        await sock.sendMessage(jid, { text: lines.join('\n') });
    } catch (err: any) {
        console.error('Error listando obras:', err);
        await sock.sendMessage(jid, { text: `❌ No pude obtener tus obras: ${err?.message || 'Error desconocido'}` });
    }
}

// --------------------
// Comparativa entre obras
// --------------------
async function sendSitesComparison(jid: string, sock: WASocket, user: Profile) {
    try {
        await sock.sendMessage(jid, { text: '📊 Analizando obras... Esto puede tomar unos segundos.' });

        const sites = await api.SiteService.getSitesByUser(user.id);
        if (!sites || sites.length === 0) {
            await sock.sendMessage(jid, { text: '😕 No tenés obras asignadas para comparar.' });
            return;
        }

        if (sites.length === 1) {
            await sock.sendMessage(jid, { text: '⚠️ Necesitás al menos 2 obras para hacer una comparación.' });
            return;
        }

        // Obtener tareas de todas las obras
        const sitesWithTasks = await Promise.all(
            sites.map(async (site: any) => {
                try {
                    const tasks = await api.TaskService.getTasksBySite(site.id);
                    return { site, tasks: tasks || [] };
                } catch (error) {
                    console.error(`Error obteniendo tareas para obra ${site.id}:`, error);
                    return { site, tasks: [] };
                }
            })
        );

        // Calcular métricas para cada obra
        interface SiteMetrics {
            site: any;
            total: number;
            completed: number;
            pending: number;
            inProgress: number;
            blocked: number;
            changes: number;
            avgResolutionDays: number;
            completionRate: number;
        }

        const metrics: SiteMetrics[] = sitesWithTasks.map(({ site, tasks }) => {
            const total = tasks.length;
            const completed = tasks.filter((t: any) => t.status === 'completed').length;
            const pending = tasks.filter((t: any) => t.status === 'pending').length;
            const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
            const blocked = tasks.filter((t: any) => t.status === 'blocked').length;
            const changes = tasks.filter((t: any) => t.status === 'changes').length;

            // Calcular tiempo promedio de resolución (solo para tareas completadas)
            // NOTA: La tabla de tasks NO tiene updated_at según la estructura de Supabase.
            // Usamos end_date como aproximación para tareas completadas (fecha planificada de finalización).
            // Esto es una aproximación, no el tiempo real de resolución.
            const completedTasks = tasks.filter((t: any) => {
                if (t.status !== 'completed') return false;
                const hasCreated = t.created_at || t.createdAt;
                const hasEndDate = t.end_date || t.endDate;
                // Solo calcular si tiene ambas fechas
                return hasCreated && hasEndDate;
            });
            let avgResolutionDays = 0;
            
            if (completedTasks.length > 0) {
                const totalDays = completedTasks.reduce((sum: number, task: any) => {
                    const createdStr = task.created_at || task.createdAt;
                    const endDateStr = task.end_date || task.endDate;
                    if (!createdStr || !endDateStr) return sum;
                    
                    const created = new Date(createdStr);
                    const endDate = new Date(endDateStr);
                    if (isNaN(created.getTime()) || isNaN(endDate.getTime())) return sum;
                    
                    const days = (endDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
                    return sum + Math.max(0, days); // Evitar días negativos
                }, 0);
                avgResolutionDays = totalDays / completedTasks.length;
            }

            // Calcular tasa de completitud
            const completionRate = total > 0 ? (completed / total) * 100 : 0;

            return {
                site,
                total,
                completed,
                pending,
                inProgress,
                blocked,
                changes,
                avgResolutionDays,
                completionRate
            };
        });

        // Ordenar por tasa de completitud (mayor a menor)
        metrics.sort((a, b) => b.completionRate - a.completionRate);

        // Formatear mensaje
        const lines: string[] = [];
        lines.push('📊 *Comparativa de Obras*');
        lines.push('');
        lines.push(`📈 Análisis de ${metrics.length} obra${metrics.length > 1 ? 's' : ''}:`);
        lines.push('');

        metrics.forEach((m, index) => {
            const siteName = m.site.address || 'Sin nombre';
            const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
            
            lines.push(`${rank} *${siteName}*`);
            lines.push(`   📋 Total: ${m.total} tareas`);
            lines.push(`   ✅ Completadas: ${m.completed} (${m.completionRate.toFixed(1)}%)`);
            lines.push(`   🕒 Pendientes: ${m.pending}`);
            lines.push(`   🚧 En progreso: ${m.inProgress}`);
            lines.push(`   ⛔ Bloqueadas: ${m.blocked}`);
            if (m.changes > 0) {
                lines.push(`   🔄 Cambios: ${m.changes}`);
            }
            
            if (m.avgResolutionDays > 0) {
                const days = Math.round(m.avgResolutionDays * 10) / 10;
                lines.push(`   ⏱️ Tiempo planificado: ${days} días (aprox.)`);
            }
            
            lines.push('');
        });

        // Agregar insights
        const bestSite = metrics[0];
        const worstSite = metrics[metrics.length - 1];
        const mostBlocked = metrics.reduce((prev, curr) => 
            curr.blocked > prev.blocked ? curr : prev
        , metrics[0]);

        lines.push('💡 *Insights:*');
        if (bestSite.completionRate > worstSite.completionRate + 10) {
            lines.push(`• ${bestSite.site.address} tiene la mejor productividad (${bestSite.completionRate.toFixed(1)}%)`);
        }
        if (mostBlocked.blocked > 0) {
            lines.push(`• ${mostBlocked.site.address} tiene ${mostBlocked.blocked} tarea${mostBlocked.blocked > 1 ? 's' : ''} bloqueada${mostBlocked.blocked > 1 ? 's' : ''} - requiere atención`);
        }
        
        const fastestSite = metrics
            .filter(m => m.avgResolutionDays > 0)
            .sort((a, b) => a.avgResolutionDays - b.avgResolutionDays)[0];
        if (fastestSite) {
            lines.push(`• ${fastestSite.site.address} tiene el menor tiempo planificado (${Math.round(fastestSite.avgResolutionDays * 10) / 10} días aprox.)`);
        }

        await sock.sendMessage(jid, { text: lines.join('\n') });
    } catch (err: any) {
        console.error('Error en comparativa de obras:', err);
        await sock.sendMessage(jid, { text: `❌ No pude generar la comparativa: ${err?.message || 'Error desconocido'}` });
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
            // Configurar notificaciones diarias cuando la conexión esté abierta
            setupDailyNotifications(sock);
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
    return sock;
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

// --------------------
// Actualizar estado de tareas por comando
// --------------------
async function handleTaskStatusUpdateCommand(
    messageText: string,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        const lower = messageText.trim().toLowerCase();
        
        // Detectar el estado deseado
        let targetStatus: Task['status'] | null = null;
        if (lower.startsWith('completar tarea') || lower.startsWith('completada tarea')) {
            targetStatus = 'completed';
        } else if (lower.startsWith('bloquear tarea') || lower.startsWith('bloqueada tarea')) {
            targetStatus = 'blocked';
        } else if (lower.startsWith('en progreso tarea') || lower.startsWith('progreso tarea')) {
            targetStatus = 'in_progress';
        } else if (lower.startsWith('pendiente tarea')) {
            targetStatus = 'pending';
        }

        if (!targetStatus) {
            await sock.sendMessage(senderNumber, {
                text: '⚠️ Comando no reconocido. Usa:\n• "completar tarea [número/título]"\n• "bloquear tarea [número/título]"\n• "en progreso tarea [número/título]"\n• "pendiente tarea [número/título]"'
            });
            return;
        }

        // Extraer el identificador (número o texto después de "tarea")
        const taskIdentifier = messageText
            .replace(/^(completar|completada|bloquear|bloqueada|en progreso|progreso|pendiente)\s+tarea\s+/i, '')
            .trim();

        // Si no hay identificador, listar tareas para seleccionar
        if (!taskIdentifier) {
            await listTasksForStatusUpdate(user, senderNumber, sock, targetStatus);
            return;
        }

        // Buscar la tarea por ID o título
        const task = await findTaskByIdentifier(taskIdentifier, user.id);
        
        if (!task) {
            await sock.sendMessage(senderNumber, {
                text: `❌ No encontré una tarea con "${taskIdentifier}".\n\nUsa el número de la lista o el título completo.`
            });
            return;
        }

        // Verificar que el estado sea diferente
        if (task.status === targetStatus) {
            const statusText = statusBadge(targetStatus);
            await sock.sendMessage(senderNumber, {
                text: `ℹ️ La tarea "${task.title}" ya está en estado "${statusText}".`
            });
            return;
        }

        // Actualizar el estado
        await api.TaskService.updateTaskStatus(task.id, targetStatus);
        
        const statusText = statusBadge(targetStatus);
        const icon = categoryIcon(task.category);
        
        await sock.sendMessage(senderNumber, {
            text: `✅ Tarea actualizada:\n\n${icon} *${task.title}*\nEstado: ${statusText}`
        });

        // Si la tarea se bloqueó, verificar dependencias y notificar
        if (targetStatus === 'blocked') {
            await checkAndNotifyTaskDependencies(task.id, task.title, user, sock);
        }

    } catch (error: any) {
        console.error('Error en handleTaskStatusUpdateCommand:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al actualizar la tarea: ${error?.message || 'Error desconocido'}`
        });
    }
}

async function listTasksForStatusUpdate(
    user: Profile,
    senderNumber: string,
    sock: WASocket,
    targetStatus: Task['status']
) {
    try {
        // Obtener todas las obras del usuario
        const sites = await api.SiteService.getSitesByUser(user.id);
        if (!sites || sites.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '😕 No tenés obras asignadas.'
            });
            return;
        }

        // Obtener tareas de todas las obras que NO estén en el estado objetivo
        const allTasks: Array<{ task: any; site: any }> = [];
        
        for (const site of sites) {
            try {
                const tasks = await api.TaskService.getTasksBySite(site.id);
                // Filtrar tareas que no estén en el estado objetivo (para poder cambiarlas)
                const relevantTasks = tasks.filter((t: any) => t.status !== targetStatus);
                relevantTasks.forEach((task: any) => {
                    allTasks.push({ task, site });
                });
            } catch (error) {
                console.error(`Error obteniendo tareas para obra ${site.id}:`, error);
            }
        }

        if (allTasks.length === 0) {
            const statusText = statusBadge(targetStatus);
            await sock.sendMessage(senderNumber, {
                text: `ℹ️ No hay tareas que puedan cambiarse a "${statusText}".`
            });
            return;
        }

        // Limitar a las primeras 20 tareas
        const tasksToShow = allTasks.slice(0, 20);
        
        const lines: string[] = [];
        const statusText = statusBadge(targetStatus);
        lines.push(`📋 Seleccioná la tarea para cambiar a "${statusText}":`);
        lines.push('');

        tasksToShow.forEach(({ task, site }, index) => {
            const num = index + 1;
            const icon = categoryIcon(task.category);
            const currentStatus = statusBadge(String(task.status));
            const siteName = site.address || 'Sin obra';
            lines.push(`${num}. ${icon} ${task.title}`);
            lines.push(`   Estado actual: ${currentStatus} | Obra: ${siteName}`);
            lines.push('');
        });

        if (allTasks.length > 20) {
            lines.push(`... y ${allTasks.length - 20} tareas más`);
            lines.push('');
        }

        lines.push('💡 Escribí el número de la tarea o su título completo.');

        await sock.sendMessage(senderNumber, { text: lines.join('\n') });
        
        // Guardar el estado objetivo y las tareas en el contexto para cuando el usuario responda
        setChatState(senderNumber, 'AWAITING_TASK_SELECTION_FOR_STATUS', {
            targetStatus,
            tasks: tasksToShow.map(({ task, site }) => ({ task, site }))
        });

    } catch (error: any) {
        console.error('Error listando tareas para actualizar estado:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al listar tareas: ${error?.message || 'Error desconocido'}`
        });
    }
}

async function handleTaskSelectionForStatus(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        const { targetStatus, tasks } = context;
        if (!targetStatus || !tasks || tasks.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '❌ Error: No hay tareas disponibles. Intentá de nuevo.'
            });
            setChatState(senderNumber, 'IDLE');
            return;
        }

        const input = messageText.trim();
        let selectedTask: any = null;

        // Buscar por número
        const numMatch = input.match(/^\d+$/);
        if (numMatch) {
            const index = parseInt(numMatch[0], 10) - 1;
            if (index >= 0 && index < tasks.length) {
                selectedTask = tasks[index].task;
            }
        }

        // Si no se encontró por número, buscar por título
        if (!selectedTask) {
            const taskByTitle = tasks.find(({ task }: any) => 
                task.title.toLowerCase().includes(input.toLowerCase()) ||
                input.toLowerCase().includes(task.title.toLowerCase())
            );
            if (taskByTitle) {
                selectedTask = taskByTitle.task;
            }
        }

        if (!selectedTask) {
            await sock.sendMessage(senderNumber, {
                text: '❌ No encontré esa tarea. Escribí el número de la lista o el título completo.'
            });
            return;
        }

        // Verificar que el estado sea diferente
        if (selectedTask.status === targetStatus) {
            const statusText = statusBadge(targetStatus);
            await sock.sendMessage(senderNumber, {
                text: `ℹ️ La tarea "${selectedTask.title}" ya está en estado "${statusText}".`
            });
            setChatState(senderNumber, 'IDLE');
            return;
        }

        // Actualizar el estado
        await api.TaskService.updateTaskStatus(selectedTask.id, targetStatus);
        
        const statusText = statusBadge(targetStatus);
        const icon = categoryIcon(selectedTask.category);
        
        await sock.sendMessage(senderNumber, {
            text: `✅ Tarea actualizada:\n\n${icon} *${selectedTask.title}*\nEstado: ${statusText}`
        });

        // Si la tarea se bloqueó, verificar dependencias y notificar
        if (targetStatus === 'blocked') {
            await checkAndNotifyTaskDependencies(selectedTask.id, selectedTask.title, user, sock);
        }
        
        setChatState(senderNumber, 'IDLE');

    } catch (error: any) {
        console.error('Error en handleTaskSelectionForStatus:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al actualizar la tarea: ${error?.message || 'Error desconocido'}`
        });
        setChatState(senderNumber, 'IDLE');
    }
}

async function findTaskByIdentifier(identifier: string, userId: string): Promise<any | null> {
    try {
        // Obtener todas las obras del usuario
        const sites = await api.SiteService.getSitesByUser(userId);
        if (!sites || sites.length === 0) {
            return null;
        }

        // Buscar en todas las obras
        for (const site of sites) {
            try {
                const tasks = await api.TaskService.getTasksBySite(site.id);
                
                // Si el identificador es un número, buscar por ID completo o parcial
                const numMatch = identifier.match(/^\d+$/);
                if (numMatch) {
                    const taskById = tasks.find((t: any) => 
                        t.id === identifier || t.id.startsWith(identifier)
                    );
                    if (taskById) return taskById;
                }
                
                // Buscar por título (case insensitive, parcial)
                const taskByTitle = tasks.find((t: any) => 
                    t.title.toLowerCase().includes(identifier.toLowerCase()) ||
                    identifier.toLowerCase().includes(t.title.toLowerCase())
                );
                if (taskByTitle) return taskByTitle;
                
                // Buscar por ID completo o parcial
                const taskById = tasks.find((t: any) => 
                    t.id === identifier || t.id.startsWith(identifier)
                );
                if (taskById) return taskById;
            } catch (error) {
                console.error(`Error buscando tarea en obra ${site.id}:`, error);
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error en findTaskByIdentifier:', error);
        return null;
    }
}

// --------------------
// Búsqueda y filtrado de tareas
// --------------------
async function handleTaskSearchCommand(
    messageText: string,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        const lower = messageText.trim().toLowerCase();
        
        // Detectar tipo de búsqueda
        let filterType: 'category' | 'status' | 'date' | 'text' | null = null;
        let filterValue: string = '';
        
        if (lower.startsWith('buscar tarea') || lower.startsWith('buscar tareas')) {
            // Extraer el término de búsqueda
            filterValue = messageText.replace(/^buscar\s+tareas?\s+/i, '').trim();
            if (filterValue) {
                // Verificar si es una categoría
                const categories = ['pintura', 'construccion', 'electricidad', 'plomeria'];
                const categoryMatch = categories.find(cat => filterValue.toLowerCase().includes(cat));
                if (categoryMatch) {
                    filterType = 'category';
                    filterValue = categoryMatch;
                } else {
                    filterType = 'text';
                }
            } else {
                await sock.sendMessage(senderNumber, {
                    text: '⚠️ Especificá qué buscar. Ejemplos:\n• "buscar tarea pintura"\n• "buscar tarea instalación"'
                });
                return;
            }
        } else if (lower.startsWith('tareas bloqueadas')) {
            filterType = 'status';
            filterValue = 'blocked';
        } else if (lower.startsWith('tareas pendientes')) {
            filterType = 'status';
            filterValue = 'pending';
        } else if (lower.startsWith('tareas completadas')) {
            filterType = 'status';
            filterValue = 'completed';
        } else if (lower.startsWith('tareas en progreso')) {
            filterType = 'status';
            filterValue = 'in_progress';
        } else if (lower.startsWith('tareas esta semana')) {
            filterType = 'date';
            filterValue = 'week';
        } else if (lower.startsWith('tareas esta mes') || lower.startsWith('tareas este mes')) {
            filterType = 'date';
            filterValue = 'month';
        } else if (lower.startsWith('tareas hoy')) {
            filterType = 'date';
            filterValue = 'today';
        } else if (lower.startsWith('tareas mañana')) {
            filterType = 'date';
            filterValue = 'tomorrow';
        }

        if (!filterType) {
            await sock.sendMessage(senderNumber, {
                text: '⚠️ Comando no reconocido. Usa:\n• "buscar tarea [categoría/texto]"\n• "tareas bloqueadas"\n• "tareas esta semana"'
            });
            return;
        }

        // Obtener todas las tareas del usuario
        const sites = await api.SiteService.getSitesByUser(user.id);
        if (!sites || sites.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '😕 No tenés obras asignadas.'
            });
            return;
        }

        const allTasks: Array<{ task: any; site: any }> = [];
        for (const site of sites) {
            try {
                const tasks = await api.TaskService.getTasksBySite(site.id);
                tasks.forEach((task: any) => {
                    allTasks.push({ task, site });
                });
            } catch (error) {
                console.error(`Error obteniendo tareas para obra ${site.id}:`, error);
            }
        }

        // Aplicar filtros
        let filteredTasks = allTasks;

        if (filterType === 'category') {
            filteredTasks = allTasks.filter(({ task }) => 
                task.category?.toLowerCase() === filterValue.toLowerCase()
            );
        } else if (filterType === 'status') {
            filteredTasks = allTasks.filter(({ task }) => 
                task.status === filterValue
            );
        } else if (filterType === 'date') {
            const now = new Date();
            const { start, end } = getDateRange(filterValue, now);
            
            filteredTasks = allTasks.filter(({ task }) => {
                if (!task.start_date && !task.end_date) return false;
                
                const taskStart = task.start_date ? new Date(task.start_date) : null;
                const taskEnd = task.end_date ? new Date(task.end_date) : null;
                
                // Verificar si la tarea se solapa con el rango
                if (taskStart && taskEnd) {
                    return (taskStart <= end && taskEnd >= start);
                } else if (taskStart) {
                    return (taskStart >= start && taskStart <= end);
                } else if (taskEnd) {
                    return (taskEnd >= start && taskEnd <= end);
                }
                return false;
            });
        } else if (filterType === 'text') {
            const searchTerm = filterValue.toLowerCase();
            filteredTasks = allTasks.filter(({ task }) => 
                task.title?.toLowerCase().includes(searchTerm) ||
                task.description?.toLowerCase().includes(searchTerm)
            );
        }

        if (filteredTasks.length === 0) {
            const filterDesc = getFilterDescription(filterType, filterValue);
            await sock.sendMessage(senderNumber, {
                text: `😕 No encontré tareas ${filterDesc}.`
            });
            return;
        }

        // Mostrar resultados (paginados)
        await displayTaskSearchResults(filteredTasks, filterType, filterValue, senderNumber, sock);

    } catch (error: any) {
        console.error('Error en handleTaskSearchCommand:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al buscar tareas: ${error?.message || 'Error desconocido'}`
        });
    }
}

function getDateRange(range: string, now: Date): { start: Date; end: Date } {
    const start = new Date(now);
    const end = new Date(now);

    if (range === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (range === 'tomorrow') {
        start.setDate(start.getDate() + 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        end.setHours(23, 59, 59, 999);
    } else if (range === 'week') {
        // Esta semana (lunes a domingo)
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(diff + 6);
        end.setHours(23, 59, 59, 999);
    } else if (range === 'month') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
}

function getFilterDescription(filterType: string, filterValue: string): string {
    if (filterType === 'category') {
        return `de categoría "${filterValue}"`;
    } else if (filterType === 'status') {
        const statusMap: Record<string, string> = {
            'blocked': 'bloqueadas',
            'pending': 'pendientes',
            'completed': 'completadas',
            'in_progress': 'en progreso'
        };
        return statusMap[filterValue] || `con estado "${filterValue}"`;
    } else if (filterType === 'date') {
        const dateMap: Record<string, string> = {
            'today': 'para hoy',
            'tomorrow': 'para mañana',
            'week': 'de esta semana',
            'month': 'de este mes'
        };
        return dateMap[filterValue] || `en el rango "${filterValue}"`;
    } else if (filterType === 'text') {
        return `que coincidan con "${filterValue}"`;
    }
    return '';
}

async function displayTaskSearchResults(
    tasks: Array<{ task: any; site: any }>,
    filterType: string,
    filterValue: string,
    senderNumber: string,
    sock: WASocket,
    page: number = 0
) {
    const pageSize = 10;
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const pageTasks = tasks.slice(startIndex, endIndex);
    const totalPages = Math.ceil(tasks.length / pageSize);

    const lines: string[] = [];
    const filterDesc = getFilterDescription(filterType, filterValue);
    lines.push(`🔍 *Resultados de búsqueda* (${tasks.length} tarea${tasks.length > 1 ? 's' : ''} ${filterDesc})`);
    lines.push('');

    pageTasks.forEach(({ task, site }, index) => {
        const num = startIndex + index + 1;
        const icon = categoryIcon(task.category);
        const status = statusBadge(String(task.status));
        const siteName = site.address || 'Sin obra';
        
        lines.push(`${num}. ${icon} *${task.title}*`);
        lines.push(`   Estado: ${status}`);
        lines.push(`   Obra: ${siteName}`);
        if (task.start_date || task.end_date) {
            const start = task.start_date ? timeStrWithDate(task.start_date) : '';
            const end = task.end_date ? timeStrWithDate(task.end_date) : '';
            if (start || end) {
                lines.push(`   Fecha: ${start && end ? `${start} - ${end}` : (start || end)}`);
            }
        }
        lines.push('');
    });

    if (tasks.length > pageSize) {
        lines.push(`📄 Página ${page + 1} de ${totalPages}`);
        if (page < totalPages - 1) {
            lines.push('💡 Escribí "siguiente" para ver más resultados.');
        }
        if (page > 0) {
            lines.push('💡 Escribí "anterior" para volver.');
        }
    }

    lines.push('💡 Escribí el número de la tarea para ver más detalles.');

    await sock.sendMessage(senderNumber, { text: lines.join('\n') });

    // Guardar contexto para paginación y ver detalles
    setChatState(senderNumber, 'VIEWING_TASK_SEARCH_RESULTS', {
        tasks,
        filterType,
        filterValue,
        page,
        totalPages
    });
}

async function handleTaskSearchResultsInteraction(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        const { tasks, page, totalPages } = context;
        const input = messageText.trim().toLowerCase();

        // Manejar paginación
        if (input === 'siguiente' || input === 'siguiente página' || input === 'next') {
            if (page < totalPages - 1) {
                await displayTaskSearchResults(tasks, context.filterType, context.filterValue, senderNumber, sock, page + 1);
            } else {
                await sock.sendMessage(senderNumber, {
                    text: 'ℹ️ Ya estás en la última página.'
                });
            }
            return;
        }

        if (input === 'anterior' || input === 'anterior página' || input === 'prev' || input === 'previo') {
            if (page > 0) {
                await displayTaskSearchResults(tasks, context.filterType, context.filterValue, senderNumber, sock, page - 1);
            } else {
                await sock.sendMessage(senderNumber, {
                    text: 'ℹ️ Ya estás en la primera página.'
                });
            }
            return;
        }

        // Buscar tarea por número
        const numMatch = input.match(/^\d+$/);
        if (numMatch) {
            const taskIndex = parseInt(numMatch[0], 10) - 1;
            if (taskIndex >= 0 && taskIndex < tasks.length) {
                const { task, site } = tasks[taskIndex];
                await showTaskDetails(task, site, senderNumber, sock);
                setChatState(senderNumber, 'IDLE');
                return;
            }
        }

        // Si no es un comando reconocido, volver a IDLE
        await sock.sendMessage(senderNumber, {
            text: '💡 Escribí el número de la tarea para ver detalles, "siguiente" para más resultados, o "cancelar" para salir.'
        });

    } catch (error: any) {
        console.error('Error en handleTaskSearchResultsInteraction:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error: ${error?.message || 'Error desconocido'}`
        });
        setChatState(senderNumber, 'IDLE');
    }
}

async function showTaskDetails(task: any, site: any, senderNumber: string, sock: WASocket) {
    const lines: string[] = [];
    lines.push('📋 *Detalles de la Tarea*');
    lines.push('');
    lines.push(`${categoryIcon(task.category)} *${task.title}*`);
    lines.push('');
    
    if (task.description) {
        lines.push(`📝 *Descripción:*`);
        lines.push(task.description);
        lines.push('');
    }
    
    lines.push(`📊 *Estado:* ${statusBadge(String(task.status))}`);
    lines.push(`🏷️ *Categoría:* ${titleCase(task.category || 'otro')}`);
    lines.push(`🏗️ *Obra:* ${site.address || 'Sin obra'}`);
    
    if (task.start_date || task.end_date) {
        lines.push('');
        lines.push('📅 *Fechas:*');
        if (task.start_date) {
            const start = new Date(task.start_date);
            lines.push(`   Inicio: ${start.toLocaleDateString('es-AR')} ${start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`);
        }
        if (task.end_date) {
            const end = new Date(task.end_date);
            lines.push(`   Fin: ${end.toLocaleDateString('es-AR')} ${end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`);
        }
    }
    
    if (task.created_at) {
        const created = new Date(task.created_at);
        lines.push('');
        lines.push(`📅 Creada: ${created.toLocaleDateString('es-AR')} ${created.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`);
    }

    await sock.sendMessage(senderNumber, { text: lines.join('\n') });
}

function timeStrWithDate(iso?: string) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
           ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// --------------------
// Clima para obra
// --------------------
async function handleWeatherCommand(
    obraName: string,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        // Si no se especificó obra, listar las obras del usuario
        if (!obraName) {
            const sites = await api.SiteService.getSitesByUser(user.id);
            if (!sites || sites.length === 0) {
                await sock.sendMessage(senderNumber, {
                    text: '😕 No tenés obras asignadas.'
                });
                return;
            }

            const lines: string[] = [];
            lines.push('🌤️ *Clima por Obra*');
            lines.push('');
            lines.push('Escribí el nombre de la obra o el número:');
            lines.push('');
            sites.slice(0, 10).forEach((site: any, index: number) => {
                lines.push(`${index + 1}. ${site.address || 'Sin nombre'}`);
            });
            lines.push('');
            lines.push('Ejemplo: "clima obra 1" o "clima obra [nombre]"');

            await sock.sendMessage(senderNumber, { text: lines.join('\n') });
            setChatState(senderNumber, 'AWAITING_WEATHER_SITE_SELECTION', { sites });
            return;
        }

        // Buscar la obra
        const sites = await api.SiteService.getSitesByUser(user.id);
        if (!sites || sites.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '😕 No tenés obras asignadas.'
            });
            return;
        }

        let selectedSite: any = null;

        // Buscar por número
        const numMatch = obraName.match(/^\d+$/);
        if (numMatch) {
            const index = parseInt(numMatch[0], 10) - 1;
            if (index >= 0 && index < sites.length) {
                selectedSite = sites[index];
            }
        }

        // Si no se encontró por número, buscar por nombre
        if (!selectedSite) {
            const searchTerm = obraName.toLowerCase();
            selectedSite = sites.find((site: any) => 
                (site.address || '').toLowerCase().includes(searchTerm) ||
                searchTerm.includes((site.address || '').toLowerCase())
            );
        }

        if (!selectedSite) {
            await sock.sendMessage(senderNumber, {
                text: `❌ No encontré la obra "${obraName}".\n\nEscribí "clima obra" para ver la lista de obras.`
            });
            return;
        }

        // Obtener el clima para la dirección de la obra
        await sock.sendMessage(senderNumber, {
            text: `🌤️ Consultando el clima para "${selectedSite.address}"...`
        });

        const weatherInfo = await getWeatherForAddress(selectedSite.address);
        
        if (!weatherInfo) {
            await sock.sendMessage(senderNumber, {
                text: `❌ No pude obtener el clima para "${selectedSite.address}".\n\nVerificá que la dirección sea correcta.`
            });
            return;
        }

        const lines: string[] = [];
        lines.push(`🌤️ *Clima en ${selectedSite.address}*`);
        lines.push('');
        lines.push(`🌡️ Temperatura: ${weatherInfo.temperature}°C`);
        lines.push(`☁️ Condición: ${weatherInfo.condition}`);
        if (weatherInfo.humidity) {
            lines.push(`💧 Humedad: ${weatherInfo.humidity}%`);
        }
        if (weatherInfo.wind) {
            lines.push(`💨 Viento: ${weatherInfo.wind}`);
        }
        if (weatherInfo.forecast) {
            lines.push('');
            lines.push('📅 *Pronóstico:*');
            weatherInfo.forecast.forEach((day: string) => {
                lines.push(`   ${day}`);
            });
        }

        await sock.sendMessage(senderNumber, { text: lines.join('\n') });

    } catch (error: any) {
        console.error('Error en handleWeatherCommand:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al obtener el clima: ${error?.message || 'Error desconocido'}`
        });
    }
}

async function getWeatherForAddress(address: string): Promise<any | null> {
    try {
        // Usar wttr.in que es una API gratuita y simple que acepta direcciones
        // Formato: wttr.in/{location}?format=j1 (JSON) o sin formato para texto plano
        const encodedAddress = encodeURIComponent(address);
        
        // Intentar obtener datos en formato JSON
        const response = await fetch(`https://wttr.in/${encodedAddress}?format=j1&lang=es`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CimentaBot/1.0)'
            }
        });

        if (!response.ok) {
            // Si falla, intentar con formato de texto simple
            const textResponse = await fetch(`https://wttr.in/${encodedAddress}?format=3&lang=es`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; CimentaBot/1.0)'
                }
            });
            
            if (!textResponse.ok) {
                return null;
            }

            const text = await textResponse.text();
            // Parsear formato simple: "Buenos Aires: +25°C"
            const match = text.match(/(.+?):\s*([+-]?\d+)°C/);
            if (match) {
                return {
                    temperature: match[2],
                    condition: 'Consultar detalles',
                    location: match[1].trim()
                };
            }
            return null;
        }

        const data = await response.json();
        
        if (!data || !data.current_condition || !data.current_condition[0]) {
            return null;
        }

        const current = data.current_condition[0];
        const temp = current.temp_C || current.tempC || 'N/A';
        const condition = current.lang_es ? current.lang_es[0]?.value : (current.weatherDesc?.[0]?.value || 'Despejado');
        const humidity = current.humidity || null;
        const windSpeed = current.windspeedKmph || null;
        const windDir = current.winddir16Point || null;
        
        const wind = windSpeed && windDir ? `${windSpeed} km/h ${windDir}` : (windSpeed ? `${windSpeed} km/h` : null);

        // Obtener pronóstico para los próximos 3 días
        const forecast: string[] = [];
        if (data.weather && data.weather.length > 1) {
            for (let i = 1; i < Math.min(4, data.weather.length); i++) {
                const day = data.weather[i];
                const date = day.date || '';
                const maxTemp = day.maxtempC || day.maxtempC || 'N/A';
                const minTemp = day.mintempC || day.mintempC || 'N/A';
                const dayCondition = day.lang_es ? day.lang_es[0]?.value : (day.weatherDesc?.[0]?.value || 'Despejado');
                
                // Formatear fecha
                let dateStr = date;
                if (date) {
                    try {
                        const dateObj = new Date(date);
                        dateStr = dateObj.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
                    } catch (e) {
                        // Mantener fecha original si falla el parseo
                    }
                }
                
                forecast.push(`${dateStr}: ${minTemp}°C - ${maxTemp}°C, ${dayCondition}`);
            }
        }

        return {
            temperature: temp,
            condition: condition,
            humidity: humidity,
            wind: wind,
            forecast: forecast.length > 0 ? forecast : null
        };

    } catch (error) {
        console.error('Error obteniendo clima:', error);
        return null;
    }
}

async function handleWeatherSiteSelection(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        const { sites } = context;
        if (!sites || sites.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '❌ No hay obras disponibles.'
            });
            setChatState(senderNumber, 'IDLE');
            return;
        }

        const input = messageText.trim();
        let selectedSite: any = null;

        // Buscar por número
        const numMatch = input.match(/^\d+$/);
        if (numMatch) {
            const index = parseInt(numMatch[0], 10) - 1;
            if (index >= 0 && index < sites.length) {
                selectedSite = sites[index];
            }
        }

        // Si no se encontró por número, buscar por nombre
        if (!selectedSite) {
            const searchTerm = input.toLowerCase();
            selectedSite = sites.find((site: any) => 
                (site.address || '').toLowerCase().includes(searchTerm) ||
                searchTerm.includes((site.address || '').toLowerCase())
            );
        }

        if (!selectedSite) {
            await sock.sendMessage(senderNumber, {
                text: '❌ No encontré esa obra. Escribí el número de la lista o el nombre completo.'
            });
            return;
        }

        // Obtener el clima
        await sock.sendMessage(senderNumber, {
            text: `🌤️ Consultando el clima para "${selectedSite.address}"...`
        });

        const weatherInfo = await getWeatherForAddress(selectedSite.address);
        
        if (!weatherInfo) {
            await sock.sendMessage(senderNumber, {
                text: `❌ No pude obtener el clima para "${selectedSite.address}".\n\nVerificá que la dirección sea correcta.`
            });
            setChatState(senderNumber, 'IDLE');
            return;
        }

        const lines: string[] = [];
        lines.push(`🌤️ *Clima en ${selectedSite.address}*`);
        lines.push('');
        lines.push(`🌡️ Temperatura: ${weatherInfo.temperature}°C`);
        lines.push(`☁️ Condición: ${weatherInfo.condition}`);
        if (weatherInfo.humidity) {
            lines.push(`💧 Humedad: ${weatherInfo.humidity}%`);
        }
        if (weatherInfo.wind) {
            lines.push(`💨 Viento: ${weatherInfo.wind}`);
        }
        if (weatherInfo.forecast) {
            lines.push('');
            lines.push('📅 *Pronóstico:*');
            weatherInfo.forecast.forEach((day: string) => {
                lines.push(`   ${day}`);
            });
        }

        await sock.sendMessage(senderNumber, { text: lines.join('\n') });
        setChatState(senderNumber, 'IDLE');

    } catch (error: any) {
        console.error('Error en handleWeatherSiteSelection:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al obtener el clima: ${error?.message || 'Error desconocido'}`
        });
        setChatState(senderNumber, 'IDLE');
    }
}

// --------------------
// Seguimiento de estado de compras
// --------------------
async function handlePurchaseTrackingCommand(
    messageText: string,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        const lower = messageText.trim().toLowerCase();
        
        // Detectar tipo de comando
        if (lower.startsWith('estado compra')) {
            // Extraer ID de la compra
            const purchaseId = messageText.replace(/^estado\s+compra\s+/i, '').trim();
            if (!purchaseId) {
                await sock.sendMessage(senderNumber, {
                    text: '⚠️ Especificá el ID de la compra. Ejemplo: "estado compra abc123"'
                });
                return;
            }
            await showPurchaseStatus(purchaseId, user, senderNumber, sock);
            return;
        }

        // Obtener todas las compras del usuario
        const purchases = await api.PurchaseService.getPurchasesByUser(user.id);
        
        if (!purchases || purchases.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '😕 No tenés compras registradas.'
            });
            return;
        }

        let filteredPurchases = purchases;

        // Aplicar filtros
        if (lower.startsWith('compras pendientes')) {
            filteredPurchases = purchases.filter((p: any) => p.status === 'pending');
        } else if (lower.startsWith('compras compradas')) {
            filteredPurchases = purchases.filter((p: any) => p.status === 'purchased');
        } else if (lower.startsWith('compras entregadas')) {
            filteredPurchases = purchases.filter((p: any) => p.status === 'delivered');
        } else if (lower.startsWith('compras esta semana')) {
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
            const weekStart = new Date(now.setDate(diff));
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            filteredPurchases = purchases.filter((p: any) => {
                if (!p.created_at && !p.purchase_date) return false;
                const dateStr = p.purchase_date || p.created_at;
                if (!dateStr) return false;
                const purchaseDate = new Date(dateStr);
                return purchaseDate >= weekStart && purchaseDate <= weekEnd;
            });
        }

        if (filteredPurchases.length === 0) {
            const filterDesc = getPurchaseFilterDescription(lower);
            await sock.sendMessage(senderNumber, {
                text: `😕 No encontré compras ${filterDesc}.`
            });
            return;
        }

        // Mostrar resultados
        await displayPurchases(filteredPurchases, senderNumber, sock);

    } catch (error: any) {
        console.error('Error en handlePurchaseTrackingCommand:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al consultar compras: ${error?.message || 'Error desconocido'}`
        });
    }
}

async function showPurchaseStatus(
    purchaseId: string,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        // Intentar obtener la compra por ID
        let purchase: any = null;
        try {
            purchase = await api.PurchaseService.getPurchase(purchaseId);
        } catch (error) {
            // Si falla, buscar en las compras del usuario
            const userPurchases = await api.PurchaseService.getPurchasesByUser(user.id);
            purchase = userPurchases.find((p: any) => 
                p.id === purchaseId || p.id.startsWith(purchaseId)
            );
        }

        if (!purchase) {
            await sock.sendMessage(senderNumber, {
                text: `❌ No encontré una compra con ID "${purchaseId}".\n\nVerificá que el ID sea correcto.`
            });
            return;
        }

        // Verificar que la compra pertenezca al usuario
        if (purchase.user_id !== user.id) {
            await sock.sendMessage(senderNumber, {
                text: '❌ No tenés acceso a esa compra.'
            });
            return;
        }

        // Obtener información de la obra si existe
        let siteName = 'Sin obra';
        if (purchase.site_id) {
            try {
                const sites = await api.SiteService.getSitesByUser(user.id);
                const site = sites.find((s: any) => s.id === purchase.site_id);
                if (site) {
                    siteName = site.address || 'Sin nombre';
                }
            } catch (error) {
                console.error('Error obteniendo obra:', error);
            }
        }

        const lines: string[] = [];
        lines.push('🛒 *Estado de Compra*');
        lines.push('');
        lines.push(`📦 *${purchase.product}*`);
        lines.push('');
        lines.push(`📊 *Estado:* ${getPurchaseStatusText(purchase.status)}`);
        lines.push(`📂 *Categoría:* ${titleCase(purchase.category || 'otro')}`);
        lines.push(`🔢 *Cantidad:* ${purchase.quantity}`);
        if (purchase.price) {
            lines.push(`💰 *Precio unitario:* $${purchase.price}`);
            lines.push(`💰 *Total:* $${(purchase.price * purchase.quantity).toFixed(2)}`);
        }
        if (purchase.supplier) {
            lines.push(`🏪 *Proveedor:* ${purchase.supplier}`);
        }
        if (purchase.description) {
            lines.push(`📝 *Descripción:* ${purchase.description}`);
        }
        lines.push(`🏷️ *Obra:* ${siteName}`);
        
        if (purchase.purchase_date) {
            const purchaseDate = new Date(purchase.purchase_date);
            lines.push(`📅 *Fecha de compra:* ${purchaseDate.toLocaleDateString('es-AR')}`);
        }
        if (purchase.delivery_date) {
            const deliveryDate = new Date(purchase.delivery_date);
            lines.push(`📅 *Fecha de entrega:* ${deliveryDate.toLocaleDateString('es-AR')}`);
        }
        if (purchase.created_at) {
            const createdDate = new Date(purchase.created_at);
            lines.push(`📅 *Creada:* ${createdDate.toLocaleDateString('es-AR')}`);
        }
        lines.push('');
        lines.push(`🆔 *ID:* ${purchase.id}`);

        await sock.sendMessage(senderNumber, { text: lines.join('\n') });

    } catch (error: any) {
        console.error('Error en showPurchaseStatus:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al consultar el estado de la compra: ${error?.message || 'Error desconocido'}`
        });
    }
}

async function displayPurchases(
    purchases: any[],
    senderNumber: string,
    sock: WASocket
) {
    try {
        // Ordenar por fecha de creación (más recientes primero)
        purchases.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });

        // Limitar a las primeras 20
        const purchasesToShow = purchases.slice(0, 20);

        const lines: string[] = [];
        lines.push(`🛒 *Compras* (${purchases.length} encontrada${purchases.length > 1 ? 's' : ''})`);
        lines.push('');

        purchasesToShow.forEach((purchase, index) => {
            const num = index + 1;
            const status = getPurchaseStatusText(purchase.status);
            const date = purchase.created_at ? new Date(purchase.created_at).toLocaleDateString('es-AR') : 'Sin fecha';
            
            lines.push(`${num}. 📦 *${purchase.product}*`);
            lines.push(`   Estado: ${status}`);
            lines.push(`   Cantidad: ${purchase.quantity}`);
            if (purchase.price) {
                lines.push(`   Precio: $${purchase.price} (Total: $${(purchase.price * purchase.quantity).toFixed(2)})`);
            }
            lines.push(`   Fecha: ${date}`);
            lines.push('');
        });

        if (purchases.length > 20) {
            lines.push(`... y ${purchases.length - 20} compras más`);
            lines.push('');
        }

        lines.push('💡 Escribí "estado compra [ID]" para ver detalles de una compra específica.');

        await sock.sendMessage(senderNumber, { text: lines.join('\n') });

    } catch (error: any) {
        console.error('Error en displayPurchases:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al mostrar compras: ${error?.message || 'Error desconocido'}`
        });
    }
}

function getPurchaseStatusText(status: string): string {
    const statusMap: Record<string, string> = {
        'pending': '🕒 Pendiente',
        'purchased': '🛒 Comprada',
        'delivered': '📦 Entregada'
    };
    return statusMap[status] || status;
}

function getPurchaseFilterDescription(command: string): string {
    if (command.includes('pendientes')) {
        return 'pendientes';
    } else if (command.includes('compradas')) {
        return 'compradas';
    } else if (command.includes('entregadas')) {
        return 'entregadas';
    } else if (command.includes('esta semana')) {
        return 'de esta semana';
    }
    return '';
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

// --------------------
// Notificaciones Diarias Automáticas
// --------------------

function setupDailyNotifications(sock: WASocket) {
    console.log('📅 Configurando notificaciones diarias a las 9:00 AM...');
    
    // Verificar cada minuto si es la hora de enviar notificaciones
    setInterval(async () => {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Enviar a las 9:00 AM
        if (hour === 9 && minute === 0) {
            console.log('🌅 Es hora de enviar notificaciones diarias (9:00 AM)');
            await sendDailyNotifications(sock);
        }
    }, 60000); // Verificar cada minuto
}

async function sendDailyNotifications(sock: WASocket) {
    try {
        console.log('📨 Iniciando envío de notificaciones diarias...');
        
        // Obtener el número permitido si está configurado
        const allowedNumber = process.env.ALLOWED_WHATSAPP_NUMBER;
        if (!allowedNumber) {
            console.log('⚠️ No hay ALLOWED_WHATSAPP_NUMBER configurado. No se enviarán notificaciones automáticas.');
            return;
        }

        // Obtener usuario por número de WhatsApp
        const user = await getVerifiedUser(allowedNumber);
        if (!user) {
            console.log('⚠️ No se encontró usuario para el número permitido.');
            return;
        }

        // Enviar notificación diaria al usuario
        await sendDailyNotificationToUser(user, sock);
        
    } catch (error: any) {
        console.error('❌ Error enviando notificaciones diarias:', error);
    }
}

async function sendDailyNotificationToUser(user: Profile, sock: WASocket) {
    try {
        const userJid = user.whatsapp_jid || process.env.ALLOWED_WHATSAPP_NUMBER;
        if (!userJid) {
            console.log(`⚠️ Usuario ${user.id} no tiene WhatsApp configurado.`);
            return;
        }

        console.log(`📨 Enviando notificación diaria a ${user.name} (${userJid})...`);

        // Obtener todas las obras del usuario
        const sites = await api.SiteService.getSitesByUser(user.id);
        if (!sites || sites.length === 0) {
            await safeSendMessage(sock, userJid, 
                '🌅 Buenos días!\n\n😕 No tenés obras asignadas para hoy.'
            );
            return;
        }

        const today = new Date();
        const todayStr = today.toLocaleDateString('es-AR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        const lines: string[] = [];
        lines.push(`🌅 *Buenos días, ${user.name}!*`);
        lines.push('');
        lines.push(`📅 ${todayStr.charAt(0).toUpperCase() + todayStr.slice(1)}`);
        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━━━━');
        lines.push('');

        // Para cada obra: clima y tareas del día
        for (const site of sites) {
            lines.push(`🏗️ *${site.address || 'Sin nombre'}*`);
            lines.push('');

            // Obtener clima para la obra
            try {
                const weather = await getWeatherForAddress(site.address || '');
                if (weather) {
                    lines.push(`🌤️ *Clima:*`);
                    lines.push(`   ${weather.temperature}°C - ${weather.condition}`);
                    if (weather.humidity) lines.push(`   💧 Humedad: ${weather.humidity}%`);
                    if (weather.windSpeed) lines.push(`   💨 Viento: ${weather.windSpeed} km/h`);
                    lines.push('');
                }
            } catch (error) {
                console.error(`Error obteniendo clima para ${site.address}:`, error);
            }

            // Obtener tareas del día para esta obra
            try {
                const tasks = await api.TaskService.getTasksBySite(site.id);
                const todayUTCStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
                const todayUTCEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

                const todayTasks = tasks.filter((t: any) => {
                    if (!t.start_date) return false;
                    const start = new Date(t.start_date);
                    const end = t.end_date ? new Date(t.end_date) : null;
                    return end ? (start <= todayUTCEnd && end >= todayUTCStart) : sameDayUTC(start, todayUTCStart);
                });

                if (todayTasks.length > 0) {
                    lines.push(`📋 *Tareas de hoy (${todayTasks.length}):*`);
                    todayTasks.slice(0, 5).forEach((task: any) => {
                        const taskTime = task.start_date ? timeStr(task.start_date) : '';
                        const timePrefix = taskTime ? `${taskTime} - ` : '';
                        lines.push(`   ${timePrefix}${categoryIcon(task.category)} ${task.title} · ${statusBadge(String(task.status))}`);
                    });
                    if (todayTasks.length > 5) {
                        lines.push(`   ... y ${todayTasks.length - 5} más`);
                    }
                    lines.push('');
                } else {
                    lines.push('📋 Sin tareas programadas para hoy');
                    lines.push('');
                }
            } catch (error) {
                console.error(`Error obteniendo tareas para ${site.address}:`, error);
            }

            lines.push('━━━━━━━━━━━━━━━━━━━━');
            lines.push('');
        }

        // Obtener compras con prioridad alta y compras antiguas
        try {
            const allPurchases = await api.PurchaseService.getPurchasesByUser(user.id);
            
            // Compras con prioridad alta o urgente (según el campo priority de la tabla purchases)
            // La tabla tiene: priority (purchase_priority) con valores: 'alta', 'normal', 'urgente'
            const highPriorityPurchases = allPurchases.filter((p: any) => {
                // Verificar si tiene el campo priority y si es 'alta' o 'urgente'
                const priority = (p.priority || '').toLowerCase();
                return (priority === 'alta' || priority === 'urgente') && p.status === 'pending';
            });

            // Compras creadas hace más de una semana (independientemente de la prioridad)
            // Usar created_at (timestamptz) de la tabla purchases
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            oneWeekAgo.setHours(0, 0, 0, 0);
            
            const oldPurchases = allPurchases.filter((p: any) => {
                // Verificar que tenga created_at (campo de la tabla purchases)
                if (!p.created_at) return false;
                const createdDate = new Date(p.created_at);
                createdDate.setHours(0, 0, 0, 0);
                return createdDate < oneWeekAgo && p.status === 'pending';
            });

            // Combinar y eliminar duplicados
            const urgentPurchases = [...highPriorityPurchases];
            oldPurchases.forEach((old: any) => {
                if (!urgentPurchases.find((p: any) => p.id === old.id)) {
                    urgentPurchases.push(old);
                }
            });

            if (urgentPurchases.length > 0) {
                lines.push('🚨 *Compras que requieren atención:*');
                lines.push('');
                urgentPurchases.slice(0, 10).forEach((purchase: any) => {
                    const daysOld = purchase.created_at ? 
                        Math.floor((today.getTime() - new Date(purchase.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    const daysText = daysOld > 0 ? ` (${daysOld} días)` : '';
                    
                    // Mostrar prioridad si existe
                    const priority = purchase.priority || '';
                    const priorityText = priority === 'urgente' ? ' 🔴 URGENTE' : 
                                       priority === 'alta' ? ' 🟠 Alta' : '';
                    
                    const statusEmoji = purchase.status === 'pending' ? '⏳' : '📦';
                    lines.push(`   ${statusEmoji} ${purchase.product}${priorityText}${daysText}`);
                    if (purchase.description) {
                        lines.push(`      ${purchase.description.substring(0, 50)}${purchase.description.length > 50 ? '...' : ''}`);
                    }
                });
                if (urgentPurchases.length > 10) {
                    lines.push(`   ... y ${urgentPurchases.length - 10} más`);
                }
                lines.push('');
            }
        } catch (error) {
            console.error('Error obteniendo compras:', error);
        }

        lines.push('💡 Escribí "resumen" para más detalles del día.');
        lines.push('💡 Escribí "agenda" para ver todas las tareas de hoy.');

        // Enviar mensaje (puede ser largo, WhatsApp permite hasta 4096 caracteres)
        const message = lines.join('\n');
        await safeSendMessage(sock, userJid, message);
        
        console.log(`✅ Notificación diaria enviada a ${user.name}`);

    } catch (error: any) {
        console.error(`❌ Error enviando notificación diaria a usuario ${user.id}:`, error);
    }
}

// --------------------
// Verificación de Dependencias de Tareas
// --------------------

/**
 * Obtiene las tareas que dependen de una tarea bloqueada
 * La tabla task_dependencies tiene: blocker_id (tarea que bloquea) y blocked_id (tarea bloqueada)
 * Cuando una tarea se bloquea, buscamos todas las tareas donde blocker_id = tarea bloqueada
 * 
 * Nota: La relación es: blocker_id bloquea a blocked_id
 * Entonces si la tarea X se bloquea, buscamos donde blocker_id = X para encontrar las tareas que X bloquea
 */
async function getDependentTasks(blockedTaskId: string): Promise<Array<{ task: any; site: any }>> {
    try {
        // Intentar obtener dependencias desde un endpoint de la API
        // Si no existe el endpoint, intentar obtener todas las tareas y filtrar manualmente
        let dependencies: Array<{ blocker_id: string; blocked_id: string }> = [];
        
        try {
            // Obtener dependencias desde el endpoint de la API
            const depsResponse = await fetchJSON<Array<{ blocked_id: string }>>(
                `/tasks/dependencies?blocker_id=${blockedTaskId}`
            );
            // El endpoint devuelve solo blocked_id, necesitamos mapearlo al formato esperado
            dependencies = depsResponse.map((d: { blocked_id: string }) => ({
                blocker_id: blockedTaskId,
                blocked_id: d.blocked_id
            }));
        } catch (error) {
            console.log('No se pudo obtener dependencias desde la API:', error);
            return [];
        }

        if (!dependencies || dependencies.length === 0) {
            return [];
        }

        // Obtener las tareas bloqueadas (blocked_id son las que están siendo bloqueadas por blocker_id)
        const blockedTaskIds = dependencies.map(d => d.blocked_id);
        const dependentTasks: Array<{ task: any; site: any }> = [];

        // Obtener información de cada tarea dependiente
        for (const blockedId of blockedTaskIds) {
            try {
                const task = await api.TaskService.getTask(blockedId);
                if (task) {
                    // Obtener la obra de la tarea
                    let site = null;
                    if (task.site_id) {
                        try {
                            // Obtener todas las obras y buscar la que corresponde
                            const allSites = await api.SiteService.getSitesByUser(task.user_id || '');
                            site = allSites?.find((s: any) => s.id === task.site_id) || null;
                        } catch (e) {
                            console.error(`Error obteniendo obra para tarea ${blockedId}:`, e);
                        }
                    }
                    dependentTasks.push({ task, site: site || { address: 'Obra no especificada' } });
                }
            } catch (error) {
                console.error(`Error obteniendo tarea dependiente ${blockedId}:`, error);
            }
        }

        return dependentTasks;
    } catch (error: any) {
        console.error('Error obteniendo tareas dependientes:', error);
        return [];
    }
}

/**
 * Verifica las dependencias cuando una tarea se bloquea y notifica al usuario
 */
async function checkAndNotifyTaskDependencies(
    blockedTaskId: string,
    blockedTaskTitle: string,
    user: Profile,
    sock: WASocket
) {
    try {
        console.log(`🔍 Verificando dependencias para tarea bloqueada: ${blockedTaskTitle} (${blockedTaskId})`);
        
        const dependentTasks = await getDependentTasks(blockedTaskId);
        
        if (dependentTasks.length === 0) {
            console.log(`   No hay tareas que dependan de "${blockedTaskTitle}"`);
            return;
        }

        console.log(`   ⚠️ Encontradas ${dependentTasks.length} tarea(s) que dependen de esta tarea bloqueada`);

        const userJid = user.whatsapp_jid || process.env.ALLOWED_WHATSAPP_NUMBER;
        if (!userJid) {
            console.log(`   ⚠️ Usuario ${user.id} no tiene WhatsApp configurado`);
            return;
        }

        const lines: string[] = [];
        lines.push('⚠️ *Atención: Tarea Bloqueada*');
        lines.push('');
        lines.push(`La tarea "${blockedTaskTitle}" ha sido bloqueada.`);
        lines.push('');
        lines.push(`🔗 *Tareas afectadas (${dependentTasks.length}):*`);
        lines.push('');

        dependentTasks.forEach(({ task, site }, index) => {
            const num = index + 1;
            const icon = categoryIcon(task.category);
            const status = statusBadge(String(task.status));
            const siteName = site?.address || 'Obra no especificada';
            
            lines.push(`${num}. ${icon} *${task.title}*`);
            lines.push(`   Estado: ${status}`);
            lines.push(`   Obra: ${siteName}`);
            if (task.description) {
                const desc = task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description;
                lines.push(`   ${desc}`);
            }
            lines.push('');
        });

        lines.push('💡 Estas tareas pueden verse afectadas por la tarea bloqueada.');
        lines.push('💡 Revisá las dependencias y considerá desbloquear la tarea cuando sea posible.');

        await safeSendMessage(sock, userJid, lines.join('\n'));
        console.log(`   ✅ Notificación de dependencias enviada a ${user.name}`);

    } catch (error: any) {
        console.error(`❌ Error verificando dependencias para tarea ${blockedTaskId}:`, error);
        // No lanzar el error para no interrumpir el flujo principal
    }
}

// Conectar a WhatsApp
connectToWhatsApp();
