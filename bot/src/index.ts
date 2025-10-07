import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    WAMessage,
    WASocket,
    downloadMediaMessage,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { CreateTaskDTO, isTaskCategory, isTaskStatus, Profile, Task, TaskCategory } from '@cimenta/dtos';
import { api } from './config';
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
    await sock.sendMessage(senderNumber, {
        text: 'Descripción guardada. ¿Cuál es la categoría? (Ej: Electricidad, Pintura, Contrucción)'
    });
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
    if (isTaskCategory(messageText.toLowerCase())) {
        await sock.sendMessage(senderNumber, {
            text: 'Categoría guardada. Finalmente, ¿cuál es el estado inicial? (Ej: Pending, In_Progress, Done)'
        });
        setChatState(senderNumber, 'AWAITING_TASK_STATUS', {
            ...context,
            category: messageText.toLowerCase()
        });
    } else {
        await sock.sendMessage(senderNumber, {
            text: 'Categoría no válida. Por favor, elige entre: pintura, contrucción, electricidad, inspeccion, otro.'
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
    if (isTaskStatus(messageText.toLowerCase())) {
        const finalContext: CreateTaskDTO = {
            ...context,
            status: messageText.toLowerCase(),
            user_id: user.id,
            site_id: "3555c1f9-7d11-409d-bf29-87b1cbcb6262"
        };
        await sock.sendMessage(senderNumber, {
            text: '¡Perfecto! Recibí toda la información. Creando tarea...'
        });
        await handleTaskCreation(finalContext, senderNumber, sock);
        setChatState(senderNumber, 'IDLE');
    } else {
        await sock.sendMessage(senderNumber, {
            text: 'Estado no válido. Por favor, elige entre: changes, pending, in_progress, completed, blocked.'
        });
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
