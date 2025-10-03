import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    WAMessage,
    WASocket
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { CreateTaskDTO, Profile, Task } from '@cimenta/dtos';
import { api } from './config';

const verifiedUsersCache = new Map<string, Profile | null>();
const chatStates = new Map<string, { state: string; context?: any }>();

function setChatState(userId: string, state: string, context: any = {}) {
    chatStates.set(userId, { state, context });
}

function getChatState(userId: string) {
    return chatStates.get(userId) || { state: 'IDLE', context: {} };
}

export function parseTaskMessage(text: string, userUID: string): Omit<Task, 'id' | 'created_at'> {
    const lines = text.split('\n').filter(line => line.trim() !== ''); // Filtramos líneas vacías

    // Usamos Partial<> porque vamos construyendo el objeto poco a poco.
    const taskData: Partial<Omit<Task, 'id' | 'created_at'>> = {};

    // --- 1. Extraer Título (Obligatorio) ---
    const titleLine = lines.shift();
    if (!titleLine || !titleLine.toLowerCase().startsWith('crear tarea:')) {
        throw new Error("Formato incorrecto. La primera línea debe ser 'crear tarea: [nombre]'.");
    }
    taskData.title = titleLine.substring('crear tarea:'.length).trim();
    if (!taskData.title) {
        throw new Error("El nombre de la tarea no puede estar vacío.");
    }

    // --- 2. Extraer otros campos del resto de las líneas ---
    lines.forEach(line => {
        const formattedLine = line.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (formattedLine.startsWith('descripcion:')) {
            taskData.description = line.substring('descripcion:'.length).trim();
        } else if (formattedLine.startsWith('estado:')) {
            const statusValue = formattedLine.substring('estado:'.length).trim().toLowerCase();
            // chequear que statusValue sea uno de los permitidos
            if (["changes", "pending", "in_progress", "completed", "blocked"].includes(statusValue)) {
                taskData.status = statusValue as Task['status'];
            }
        } else if (formattedLine.startsWith('categoria:')) {
            const categoriaValue = formattedLine.substring('categoria:'.length).trim().toLowerCase();
            if (['electricidad', 'construccion', 'pintura', 'plomeria'].includes(categoriaValue)) {
                taskData.category = categoriaValue as Task['category'];
            }
        }

    });

    if (!taskData.category || !taskData.title) {
        throw new Error("Campos obligatorios faltantes. Asegúrate de incluir 'categoria', 'titulo' y 'urgente'.");
    }

    // --- 4. Ensamblar el objeto final con valores por defecto ---
    const finalTaskData: Omit<Task, 'id' | 'created_at'> = {
        title: taskData.title,
        description: taskData.description || '', // Default a string vacía si no hay descripción
        // user_id: userUID,
        category: taskData.category,
        user_id: "64d7e369-7b00-4bcd-952a-8c4d0978e949",
        status: taskData.status || 'pending'
    };

    return finalTaskData;
}

export default async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock: WASocket = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
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
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión cerrada, reconectando...', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('¡Conexión con WhatsApp abierta!');
        }
    });

    // Guardar credenciales de sesión
    sock.ev.on('creds.update', saveCreds);

    // Manejo de mensajes entrantes
    sock.ev.on('messages.upsert', async (m) => {
        const msg: WAMessage | undefined = m.messages[0];
        if (!msg || !msg.message || msg.key.fromMe) return;

        const senderNumber = msg.key.remoteJid;
        if (!senderNumber) return; // Salir si no hay remitente

        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!messageText) return;

        console.log(`Mensaje recibido de ${senderNumber}: "${messageText}"`);

        console.log(senderNumber);
        const user = await getVerifiedUser(senderNumber);
        if (!user) {
            await sock.sendMessage(senderNumber, { text: "Hola, para usar el bot, primero agrega tu número de WhatsApp en tu perfil de la app Cimenta." });
            return;
        }

        const { state, context } = getChatState(senderNumber);

        // Si el usuario quiere cancelar en cualquier momento
        if (messageText.toLowerCase() === 'cancelar') {
            setChatState(senderNumber, 'IDLE');
            await sock.sendMessage(senderNumber, { text: "Proceso cancelado. Vuelves al menú principal." });
            return;
        }

        switch (state) {
            case 'IDLE':
                if (messageText.toLowerCase() === '!crear tarea') {
                    await sock.sendMessage(senderNumber, { text: '¡Genial! Vamos a crear una tarea. Primero, dime el título.' });
                    setChatState(senderNumber, 'AWAITING_TASK_TITLE');
                } else {
                    // Aquí puedes manejar otros comandos como !ver tareas, !ayuda, etc.
                    await sock.sendMessage(senderNumber, { text: `Hola ${user.name}. Envía '!crear tarea' para empezar.` });
                }
                break;

            case 'AWAITING_TASK_TITLE':
                await sock.sendMessage(senderNumber, { text: 'Título guardado. Ahora, por favor, envíame la descripción.' });
                setChatState(senderNumber, 'AWAITING_TASK_DESCRIPTION', { title: messageText });
                break;

            case 'AWAITING_TASK_DESCRIPTION':
                await sock.sendMessage(senderNumber, { text: 'Descripción guardada. ¿Cuál es la categoría? (Ej: Obra, Oficina, Cliente)' });
                setChatState(senderNumber, 'AWAITING_TASK_CATEGORY', { ...context, description: messageText });
                break;

            case 'AWAITING_TASK_CATEGORY':
                await sock.sendMessage(senderNumber, { text: 'Categoría guardada. Finalmente, ¿cuál es el estado inicial? (Ej: Pendiente, En Proceso, Finalizada)' });
                setChatState(senderNumber, 'AWAITING_TASK_STATUS', { ...context, category: messageText });
                break;

            case 'AWAITING_TASK_STATUS':
                const finalContext = { ...context, status: messageText };

                await sock.sendMessage(senderNumber, { text: '¡Perfecto! Recibí toda la información. Creando tarea...' });

                await handleTaskCreation(finalContext as CreateTaskDTO, senderNumber, sock);

                // La conversación terminó, volvemos al estado inicial
                setChatState(senderNumber, 'IDLE');
                break;

        }
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
            // Llamada al service
            const createdTask = await api.TaskService.createTask(task);

            await sock.sendMessage(senderNumber, {
                text: `✅ Tarea creada con éxito:\nTítulo: ${createdTask.title}\n`
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
