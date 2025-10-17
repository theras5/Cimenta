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

        // Subir a la API
        const uploadedMedia = await uploadMediaToAPI(buffer as Buffer, mediaType, user.id, caption);

        await sock.sendMessage(senderNumber, {
            text: `✅ ${mediaType === 'image' ? 'Imagen' : 'Video'} subido exitosamente!\n${caption ? `\nDescripción: ${caption}` : ''}`
        });

        console.log(`Media subido: ${uploadedMedia}`);
    } catch (error: any) {
        console.error('Error al procesar medio:', error.message);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al procesar el ${msg.message?.imageMessage ? 'imagen' : 'video'}: ${error.message}`
        });
    }
}

async function uploadMediaToAPI(
    buffer: Buffer,
    mediaType: 'image' | 'video',
    userId: string,
    caption?: string
): Promise<any> {
    // TODO: Implementar la lógica de subida a la API
    // Por ahora, este es un placeholder que simula la subida
    
    console.log(`Subiendo ${mediaType} de ${buffer.length} bytes para usuario ${userId}`);
    console.log(`Caption: ${caption || 'Sin descripción'}`);

    // Aquí deberías:
    // 1. Convertir el buffer a FormData o base64 según lo requiera tu API
    // 2. Hacer el fetch a tu endpoint de medios
    // 3. Retornar la respuesta de la API
    
    // Ejemplo de estructura:
    /*
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), `${mediaType}_${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`);
    formData.append('userId', userId);
    if (caption) formData.append('caption', caption);
    
    const response = await api.MediaService.uploadMedia(formData);
    return response;
    */

    // Por ahora retornamos un objeto simulado
    return {
        id: `media_${Date.now()}`,
        type: mediaType,
        userId,
        caption,
        size: buffer.length,
        uploadedAt: new Date().toISOString()
    };
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
    if (lower === 'res' || lower.startsWith('resumen')) {
        const query = lower === 'res' ? '' : messageText.trim().slice(7).trim();
        await sendDailySummary(senderNumber, sock, query);
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
    if (messageText.toLowerCase() === '!crear tarea') {
        await sock.sendMessage(senderNumber, {
            text: '¡Genial! Vamos a crear una tarea. Primero, dime el título.'
        });
        setChatState(senderNumber, 'AWAITING_TASK_TITLE');
    } else if (messageText.trim().toLowerCase() === 'res' || messageText.trim().toLowerCase().startsWith('resumen')) {
        const query = messageText.trim().toLowerCase() === 'res' ? '' : messageText.trim().slice(7).trim();
        await sendDailySummary(senderNumber, sock, query);
    } else {
        await sock.sendMessage(senderNumber, {
            text: `Hola ${user.name}. Envía '!crear tarea' para empezar.`
        });
    }
}

async function handleTaskTitle(
    messageText: string,
    senderNumber: string,
    sock: WASocket
) {
    await sock.sendMessage(senderNumber, {
        text: 'Título guardado. Ahora, por favor, envíame la descripción.'
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
        '1) Pintura 🎨',
        '2) Construcción 🏗️',
        '3) Electricidad ⚡',
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
            '1) Cambios 🔄',
            '2) Pendiente 🕒',
            '3) En Progreso 🚧',
            '4) Completada ✅',
            '5) Bloqueada ⛔',
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
        const finalContext: CreateTaskDTO = {
            ...context,
            status: mapped as any,
            user_id: user.id,
            site_id: "3555c1f9-7d11-409d-bf29-87b1cbcb6262"
        };
        await sock.sendMessage(senderNumber, {
            text: '¡Perfecto! Recibí toda la información. Creando tarea...'
        });
        await handleTaskCreation(finalContext, senderNumber, sock);
        setChatState(senderNumber, 'IDLE');
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

        const today = new Date();
        const { start, end } = dayBounds(today);

        // Cargar datos base
        const [sites, tasks, updates] = await Promise.all([
            fetchJSON<Site[]>(`/sites`),
            fetchJSON<RawTask[]>(`/tasks`),
            fetchJSON<Update[]>(`/updates`),
        ]);

        // Mapa de sites
        const siteById = new Map<string, Site>();
        sites.forEach(s => siteById.set(s.id, s));

        // Determinar scope de resumen
        let includedSiteIds: string[] | null = null;
        let headerLabel = 'global';
        const q = (siteQuery || '').trim();
        if (q) {
            if (isUUID(q)) {
                includedSiteIds = siteById.has(q) ? [q] : [];
                headerLabel = siteById.get(q)?.address || q;
            } else {
                const matches = sites.filter(s => s.address.toLowerCase().includes(q.toLowerCase()))
                                     .map(s => s.id);
                includedSiteIds = matches;
                headerLabel = q;
            }
        }

        // Filtrar por día y sitio
        const tasksToday = tasks.filter(t => inRange((t as any).created_at, start, end));
        const updatesToday = updates.filter(u => inRange(u.created_at, start, end));

        // Posibles movimientos
        const tasksCreated = tasksToday;
        const changeRequestsCreated = tasksToday.filter(t => (t.status as any) === 'changes');

        // Heurística de tareas con estado actualizado hoy (si hay updated_at)
        const tasksUpdatedToday = (tasks as RawTask[]).filter(t => inRange(t.updated_at, start, end));
        const completedToday = (tasks as RawTask[]).filter(t => t.status === 'completed' && (inRange(t.end_date, start, end) || inRange(t.updated_at, start, end)));

        // Agrupar por site
        function getSiteIdForTask(t: RawTask) {
            return t.site_id || t.site?.id || '';
        }

        function sitePass(id?: string) {
            if (!includedSiteIds) return true;
            if (!id) return false;
            return includedSiteIds.includes(id);
        }

        const sitesToReport = includedSiteIds ? includedSiteIds : Array.from(new Set([
            ...tasksCreated.map(getSiteIdForTask).filter(Boolean),
            ...tasksUpdatedToday.map(getSiteIdForTask).filter(Boolean),
            ...completedToday.map(getSiteIdForTask).filter(Boolean),
            ...changeRequestsCreated.map(getSiteIdForTask).filter(Boolean),
            ...updatesToday.map(u => u.site_id).filter(Boolean) as string[],
            ...sites.map(s => s.id)
        ]));

        // Armar mensaje
        let parts: string[] = [];
        parts.push(`📅 Resumen ${q ? `de "${headerLabel}"` : 'global'} — ${today.toLocaleDateString()}`);
        parts.push('');

        let anyData = false;
        for (const siteId of sitesToReport) {
            if (!sitePass(siteId)) continue;
            const siteName = siteById.get(siteId)?.address || 'Sin dirección';

            const tCreated = tasksCreated.filter(t => getSiteIdForTask(t as RawTask) === siteId);
            const tUpdated = tasksUpdatedToday.filter(t => getSiteIdForTask(t) === siteId);
            const tCompleted = completedToday.filter(t => getSiteIdForTask(t) === siteId);
            const tChanges = changeRequestsCreated.filter(t => getSiteIdForTask(t as RawTask) === siteId);
            const uCreated = updatesToday.filter(u => u.site_id === siteId);

            if (!tCreated.length && !tUpdated.length && !tCompleted.length && !tChanges.length && !uCreated.length) {
                if (!q) {
                    parts.push(`🏷️ ${siteName}`);
                    parts.push(`• 😴 Sin movimientos hoy`);
                    parts.push('');
                }
                continue;
            }

            anyData = true;
            parts.push(`🏷️ Obra: ${siteName}`);
            parts.push('');

            if (tCreated.length) {
                parts.push(`• 🆕 Tareas creadas (${tCreated.length})`);
                tCreated.slice(0, 5).forEach((t: any) => {
                    parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title} · ${statusBadge(String(t.status))}`);
                });
                if (tCreated.length > 5) parts.push(`   ◦ +${tCreated.length - 5} más...`);
                parts.push('');
            }

            if (tUpdated.length) {
                parts.push(`• ✏️ Tareas actualizadas (${tUpdated.length})`);
                tUpdated.slice(0, 5).forEach(t => {
                    parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title} · ${statusBadge(String(t.status))}`);
                });
                if (tUpdated.length > 5) parts.push(`   ◦ +${tUpdated.length - 5} más...`);
                parts.push('');
            }

            if (tCompleted.length) {
                parts.push(`• ✅ Tareas completadas (${tCompleted.length})`);
                tCompleted.slice(0, 5).forEach(t => parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title}`));
                if (tCompleted.length > 5) parts.push(`   ◦ +${tCompleted.length - 5} más...`);
                parts.push('');
            }

            if (tChanges.length) {
                parts.push(`• 🔄 Cambios solicitados (${tChanges.length})`);
                tChanges.slice(0, 5).forEach(t => {
                    parts.push(`   ◦ ${categoryIcon(t.category)} ${t.title}`);
                });
                if (tChanges.length > 5) parts.push(`   ◦ +${tChanges.length - 5} más...`);
                parts.push('');
            }

            if (uCreated.length) {
                parts.push(`• 📸 Avances (${uCreated.length})`);
                uCreated.slice(0, 5).forEach(u => {
                    const desc = u.description ? ` — ${clip(u.description, 80)}` : '';
                    parts.push(`   ◦ 🧾 ${u.title}${desc}`);
                });
                if (uCreated.length > 5) parts.push(`   ◦ +${uCreated.length - 5} más...`);
            }

            parts.push('');
        }

        if (!anyData && includedSiteIds && includedSiteIds.length === 0) {
            const suggestions = sites
                .filter(s => (siteQuery || '').trim() && s.address.toLowerCase().includes((siteQuery || '').trim().toLowerCase()))
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
    } catch (err: any) {
        console.error('Error generando resumen:', err);
        await sock.sendMessage(jid, { text: `❌ No pude generar el resumen: ${err?.message || 'Error desconocido'}` });
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
