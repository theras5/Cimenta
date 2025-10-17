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
import { CreateTaskDTO, isTaskCategory, isTaskStatus, Profile, Task, TaskCategory } from '@cimenta/dtos';
import { api, apiUrl, defaultHeaders } from './config';
import path from 'path';

const verifiedUsersCache = new Map<string, Profile | null>();
const chatStates = new Map<string, { state: string; context?: any }>();

function setChatState(userId: string, state: string, context: any = {}) {
    chatStates.set(userId, { state, context });
}

function getChatState(userId: string) {
    return chatStates.get(userId) || { state: 'IDLE', context: {} };
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

        // Subir a la API como update con data URI
        const uploadedMedia = await uploadMediaToAPI(buffer as Buffer, 'image', user.id, caption);

        await sock.sendMessage(senderNumber, {
            text: `✅ Avance registrado con foto.\n${caption ? `📝 ${caption}` : ''}`
        });

        console.log(`Media subido:`, uploadedMedia);
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
    caption?: string
): Promise<any> {
    const base64 = buffer.toString('base64');
    const mime = 'image/jpeg';
    const dataUri = `data:${mime};base64,${base64}`;

    const payload = {
        title: caption?.slice(0, 80) || 'Avance con foto',
        description: caption || undefined,
        image_url: dataUri,
        user_id: userId,
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
    const msg: WAMessage | undefined = m.messages[0];
    if (!msg || !msg.message || msg.key.fromMe) return;

    const senderNumber = msg.key.remoteJid;
    if (!senderNumber) return;

    const user = await getVerifiedUser(senderNumber);
    if (!user) {
        await sock.sendMessage(senderNumber, {
            text: "Hola, para usar el bot, primero agrega tu número de WhatsApp en tu perfil de la app Cimenta."
        });
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

    // Comando de resumen (global u obra específica)
    const lower = messageText.trim().toLowerCase();
    if (lower === 'res' || lower.startsWith('res ') || lower.startsWith('resumen')) {
        let query = '';
        if (lower.startsWith('resumen')) {
            query = messageText.trim().slice(7).trim();
        } else if (lower.startsWith('res ')) {
            query = messageText.trim().slice(3).trim();
        }
        await sendDailySummary(senderNumber, sock, query);
        return;
    }

    // Comando de agenda de HOY
    if (lower === 'agenda' || lower.startsWith('agenda ') || lower === 'hoy' || lower === 'tareas hoy') {
        const query = lower.startsWith('agenda ') ? messageText.trim().slice(6).trim() : '';
        await sendTodayAgenda(senderNumber, sock, query);
        return;
    }

    // Avances de texto: "av <texto>" o "avance <texto>" (opcional: "av <obra>: <texto>")
    if (lower === 'av' || lower === 'avance') {
        await sock.sendMessage(senderNumber, { text: '📝 Para subir un avance de texto, escribí: av <texto> o av <obra>: <texto>' });
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
        await createTextUpdate(user, senderNumber, sock, text, siteHint);
        return;
    }

    const { state, context } = getChatState(senderNumber);
    await handleMessageByState(state, messageText, context, user, senderNumber, sock);
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

        case 'AWAITING_TASK_TITLE':
            await handleTaskTitle(messageText, senderNumber, sock);
            break;

        case 'AWAITING_TASK_DESCRIPTION':
            await handleTaskDescription(messageText, context, senderNumber, sock);
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
        await sock.sendMessage(senderNumber, {
            text: '🎯 ¡Genial! Vamos a crear una tarea.\n📝 Primero, decime el *título*.'
        });
        setChatState(senderNumber, 'AWAITING_TASK_TITLE');
    } else if (lower === 'res' || lower.startsWith('res ') || lower.startsWith('resumen')) {
        const query = lower.startsWith('resumen')
            ? messageText.trim().slice(7).trim()
            : (lower.startsWith('res ') ? messageText.trim().slice(3).trim() : '');
        await sendDailySummary(senderNumber, sock, query);
    } else {
        await sock.sendMessage(senderNumber, {
            text: `👋 Hola ${user.name}!
✍️ Escribí "*tarea*" o "*t*" para crear una nueva tarea.
🧾 Escribí "*res*" o "*resumen*" para ver el resumen del día (o "*res <obra>*" para una obra específica).
📅 Escribí "*agenda*" para ver las tareas de hoy (o "*agenda <obra>*").`
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
    setChatState(senderNumber, 'AWAITING_TASK_DESCRIPTION', { title: messageText });
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
        'pintura': 'pintura',
        'construcción': 'construccion',
        'construccion': 'construccion',
        'electricidad': 'electricidad'
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
            text: 'Categoría no válida. Elegí entre: 1) Pintura, 2) Construcción, 3) Electricidad.'
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
        const nextContext = {
            ...context,
            status: mapped as any,
            user_id: user.id,
            site_id: "3555c1f9-7d11-409d-bf29-87b1cbcb6262"
        } as CreateTaskDTO & { user_id: string; site_id: string };
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
            { userJid: sock.user?.id }
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
                { userJid: sock.user?.id }
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
            { userJid: sock.user?.id }
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
            parts.push(`🏷️ Obra: ${site.address}`);
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
                    : `❌ No encontré una obra con "${siteQuery}"`;
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

        
        
        // // Mapa de sites
        // const siteById = new Map<string, Site>();
        // sites.forEach(s => siteById.set(s.id, s));

        // // Determinar scope de resumen
        // let includedSiteIds: string[] | null = null;
        // let headerLabel = 'global';
        // const q = (siteQuery || '').trim();
        // if (q) {
        //     if (isUUID(q)) {
        //         includedSiteIds = siteById.has(q) ? [q] : [];
        //         headerLabel = siteById.get(q)?.address || q;
        //     } else {
        //         const matches = sites.filter(s => s.address.toLowerCase().includes(q.toLowerCase()))
        //                              .map(s => s.id);
        //         includedSiteIds = matches;
        //         headerLabel = q;
        //     }
        // }

    //     // Filtrar por día y sitio
    //     const tasksToday = tasks.filter(t => inRange((t as any).created_at, start, end));
    //     const updatesToday = updates.filter(u => inRange(u.created_at, start, end));

    //     // Posibles movimientos
    //     const tasksCreated = tasksToday;
    //     const changeRequestsCreated = tasksToday.filter(t => (t.status as any) === 'changes');

    //     // Heurística de tareas con estado actualizado hoy (si hay updated_at)
    //     const tasksUpdatedToday = (tasks as RawTask[]).filter(t => inRange(t.updated_at, start, end));
    //     const completedToday = (tasks as RawTask[]).filter(t => t.status === 'completed' && (inRange(t.end_date, start, end) || inRange(t.updated_at, start, end)));

    //     // Agrupar por site
    //     function getSiteIdForTask(t: RawTask) {
    //         return t.site_id || t.site?.id || '';
    //     }

    //     function sitePass(id?: string) {
    //         if (!includedSiteIds) return true;
    //         if (!id) return false;
    //         return includedSiteIds.includes(id);
    //     }

    //     const sitesToReport = includedSiteIds ? includedSiteIds : Array.from(new Set([
    //         ...tasksCreated.map(getSiteIdForTask).filter(Boolean),
    //         ...tasksUpdatedToday.map(getSiteIdForTask).filter(Boolean),
    //         ...completedToday.map(getSiteIdForTask).filter(Boolean),
    //         ...changeRequestsCreated.map(getSiteIdForTask).filter(Boolean),
    //         ...updatesToday.map(u => u.site_id).filter(Boolean) as string[],
    //         ...sites.map(s => s.id)
    //     ]));

    //     // Armar mensaje
    //     let parts: string[] = [];
    //     parts.push(`📅 Resumen ${q ? `de "${headerLabel}"` : 'global'} — ${today.toLocaleDateString()}`);
    //     parts.push('');

    //     let anyData = false;
    //     for (const siteId of sitesToReport) {
    //         if (!sitePass(siteId)) continue;
    //         const siteName = siteById.get(siteId)?.address || 'Sin dirección';

    //         const tCreated = tasksCreated.filter(t => getSiteIdForTask(t as RawTask) === siteId);
    //         const tUpdated = tasksUpdatedToday.filter(t => getSiteIdForTask(t) === siteId);
    //         const tCompleted = completedToday.filter(t => getSiteIdForTask(t) === siteId);
    //         const tChanges = changeRequestsCreated.filter(t => getSiteIdForTask(t as RawTask) === siteId);
    //         const uCreated = updatesToday.filter(u => u.site_id === siteId);

    //         if (!tCreated.length && !tUpdated.length && !tCompleted.length && !tChanges.length && !uCreated.length) {
    //             if (!q) {
    //                 parts.push(`🏷️ ${siteName}`);
    //                 parts.push(`• 😴 Sin movimientos hoy`);
    //                 parts.push('');
    //             }
    //             continue;
    //         }

    //         anyData = true;
    //         parts.push(`🏷️ Obra: ${siteName}`);
    //         parts.push('');

    //         if (tCreated.length) {
    //             parts.push(`• 🆕 Tareas creadas (${tCreated.length})`);
    //             tCreated.slice(0, 5).forEach((t: any) => {
    //                 parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title} · ${statusBadge(String(t.status))}`);
    //             });
    //             if (tCreated.length > 5) parts.push(`   ◦ +${tCreated.length - 5} más...`);
    //             parts.push('');
    //         }

    //         if (tUpdated.length) {
    //             parts.push(`• ✏️ Tareas actualizadas (${tUpdated.length})`);
    //             tUpdated.slice(0, 5).forEach(t => {
    //                 parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title} · ${statusBadge(String(t.status))}`);
    //             });
    //             if (tUpdated.length > 5) parts.push(`   ◦ +${tUpdated.length - 5} más...`);
    //             parts.push('');
    //         }

    //         if (tCompleted.length) {
    //             parts.push(`• ✅ Tareas completadas (${tCompleted.length})`);
    //             tCompleted.slice(0, 5).forEach(t => parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title}`));
    //             if (tCompleted.length > 5) parts.push(`   ◦ +${tCompleted.length - 5} más...`);
    //             parts.push('');
    //         }

    //         if (tChanges.length) {
    //             parts.push(`• 🔄 Cambios solicitados (${tChanges.length})`);
    //             tChanges.slice(0, 5).forEach(t => {
    //                 parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title}`);
    //             });
    //             if (tChanges.length > 5) parts.push(`   ◦ +${tChanges.length - 5} más...`);
    //             parts.push('');
    //         }

    //         if (uCreated.length) {
    //             parts.push(`• 📸 Avances (${uCreated.length})`);
    //             uCreated.slice(0, 5).forEach(u => {
    //                 const desc = u.description ? ` — ${clip(u.description, 80)}` : '';
    //                 parts.push(`   ◦ 🧾 ${u.title}${desc}`);
    //             });
    //             if (uCreated.length > 5) parts.push(`   ◦ +${uCreated.length - 5} más...`);
    //         }

    //         parts.push('');
    //     }

    //     if (!anyData && includedSiteIds && includedSiteIds.length === 0) {
    //         const suggestions = sites
    //             .filter(s => (siteQuery || '').trim() && s.address.toLowerCase().includes((siteQuery || '').trim().toLowerCase()))
    //             .slice(0, 5)
    //             .map(s => `- ${s.address} (${s.id})`)
    //             .join('\n');

    //         const notFoundMsg = suggestions
    //             ? `❌ No encontré una obra que coincida. Sugerencias:\n${suggestions}`
    //             : `❌ No encontré una obra con "${siteQuery}"`;
    //         await sock.sendMessage(jid, { text: notFoundMsg });
    //         return;
    //     }

    //     const text = parts.join('\n');
    //     await sock.sendMessage(jid, { text });
//}

// --------------------
// Agenda de hoy
// --------------------

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
        const now = new Date();
        const todayUTCStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const todayUTCEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

        const tasks = await fetchJSON<RawTask[]>(`/tasks`);

        // Filtrar por solapamiento con el día de hoy (en UTC)
        let filtered = tasks.filter(t => {
            if (!t.start_date) return false;
            const start = new Date(t.start_date);
            const end = t.end_date ? new Date(t.end_date) : null;
            if (end) {
                // incluir si el rango [start, end] solapa el día [todayUTCStart, todayUTCEnd]
                return start <= todayUTCEnd && end >= todayUTCStart;
            }
            // si no hay end_date, incluir solo si el start coincide con el día de hoy en UTC
            return sameDayUTC(start, todayUTCStart);
        });

        // Filtro opcional por obra (texto o UUID)
        if (siteQuery && siteQuery.trim()) {
            const q = siteQuery.trim().toLowerCase();
            filtered = filtered.filter(t => {
                const siteName = (t.site?.address || '').toLowerCase();
                const siteId = (t.site?.id || t.site_id || '').toLowerCase();
                return siteName.includes(q) || siteId === q;
            });
        }

        if (!filtered.length) {
            const msg = siteQuery && siteQuery.trim()
                ? `😕 No hay tareas agendadas para hoy en "${siteQuery}"`
                : '😕 No hay tareas agendadas para hoy';
            await sock.sendMessage(jid, { text: msg });
            return;
        }

        // Ordenar por hora de inicio
        filtered.sort((a, b) => {
            const ta = a.start_date ? new Date(a.start_date).getTime() : 0;
            const tb = b.start_date ? new Date(b.start_date).getTime() : 0;
            return ta - tb;
        });

        const header = `🗓️ Agenda de hoy (${now.toLocaleDateString('es-AR')})${siteQuery && siteQuery.trim() ? ` — ${siteQuery}` : ''}`;
        const lines: string[] = [header, ''];
        for (const t of filtered) {
            const start = t.start_date ? new Date(t.start_date) : null;
            const end = t.end_date ? new Date(t.end_date) : null;
            let range = '';
            if (start && end && !sameDayUTC(start, end)) {
                // Evento de varios días: mostrar "Todo el día" para el día en curso
                range = 'Todo el día';
            } else {
                const s = timeStr(t.start_date);
                const e = timeStr(t.end_date);
                range = s && e ? `${s}–${e}` : (s || '');
            }
            const siteName = t.site?.address || '';
            lines.push(`• ${range} · ${categoryIcon(t.category)} ${t.title}${siteName ? ` · 🏷️ ${siteName}` : ''}`);
        }
        await sock.sendMessage(jid, { text: lines.join('\n') });
    } catch (err: any) {
        console.error('Error en agenda de hoy:', err);
        await sock.sendMessage(jid, { text: `❌ No pude obtener la agenda: ${err?.message || 'Error desconocido'}` });
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

    // Manejo de la conexión y el código QR
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('Escanea este código QR con tu WhatsApp:');
            qrcode.generate(qr, { small: true });
            console.log(qr);
        }
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.badSession;
            console.log('Conexión cerrada, reconectando...', shouldReconnect);
            if (shouldReconnect) {
                // Pequeño delay para evitar bucles de reconexión que impiden el QR
                setTimeout(() => connectToWhatsApp(), 2000);
            } else {
                console.log('Sesión inválida o cerrada. Si querés reautenticar, borrá la carpeta:', AUTH_DIR);
            }
        } else if (connection === 'open') {
            console.log('¡Conexión con WhatsApp abierta!');
        }
    });

    // Guardar credenciales de sesión
    sock.ev.on('creds.update', saveCreds);

    // Manejo de mensajes entrantes
    sock.ev.on('messages.upsert', async (m) => {
        await handleIncomingMessage(m, sock);
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

connectToWhatsApp();
