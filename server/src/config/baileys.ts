import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    WAMessage,
    WASocket
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { createTaskService, getTaskByIdService, updateTaskByIdService } from '../services/taskService';
import { Task } from '../services/taskService';
import { AppError } from '../errors/AppError';

export function parseTaskMessage(text: string, userUID: string): Omit<Task, 'id' | 'created_at'> {
    const lines = text.split('\n').filter(line => line.trim() !== ''); // Filtramos líneas vacías

    // Usamos Partial<> porque vamos construyendo el objeto poco a poco.
    const taskData: Partial<Omit<Task, 'id' | 'created_at'>> = {};

    // --- 1. Extraer Título (Obligatorio) ---
    const titleLine = lines.shift();
    if (!titleLine || !titleLine.toLowerCase().startsWith('crear tarea:')) {
        throw new AppError("Formato incorrecto. La primera línea debe ser 'crear tarea: [nombre]'.", 400);
    }
    taskData.title = titleLine.substring('crear tarea:'.length).trim();
    if (!taskData.title) {
        throw new AppError("El nombre de la tarea no puede estar vacío.", 400);
    }

    // --- 2. Extraer otros campos del resto de las líneas ---
    lines.forEach(line => {
        if (line.startsWith('descripcion:')) {
            taskData.description = line.substring('descripcion:'.length).trim();
        } else if (line.startsWith('urgente:')) {
            const urgentValue = line.substring('urgente:'.length).trim().toLowerCase();
            taskData.is_urgent = (urgentValue === 'si' || urgentValue === 'sí');
        } else if (line.startsWith('estado:')) {
            const statusValue = line.substring('estado:'.length).trim().toLowerCase();
            // chequear que statusValue sea uno de los permitidos
            if (["changes", "pending", "in_progress", "completed", "blocked"].includes(statusValue)) {
                taskData.status = statusValue as Task['status'];
            }
        } else if (line.startsWith('categoria:')) {
            const categoriaValue = line.substring('categoria:'.length).trim().toLowerCase();
            if (['electricidad', 'construccion', 'pintura', 'plomeria'].includes(categoriaValue)) {
                taskData.category = categoriaValue as Task['category'];
            }
        }

    });

    if (!taskData.category || !taskData.title || taskData.is_urgent === undefined) {
        throw new AppError("Campos obligatorios faltantes. Asegúrate de incluir 'categoria', 'titulo' y 'urgente'.", 400);
    }

    // --- 4. Ensamblar el objeto final con valores por defecto ---
    const finalTaskData: Omit<Task, 'id' | 'created_at'> = {
        title: taskData.title,
        description: taskData.description || '', // Default a string vacía si no hay descripción
        // user_id: userUID,
        category: taskData.category,
        user_id: "64d7e369-7b00-4bcd-952a-8c4d0978e949",
        is_urgent: taskData.is_urgent || false, // Default a no urgente
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
        if (!msg || !msg.message ) return;

        const senderNumber = msg.key.remoteJid;
        if (!senderNumber) return; // Salir si no hay remitente

        const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!messageText) return;

        console.log(`Mensaje recibido de ${senderNumber}: "${messageText}"`);
        const formattedMessage = messageText.toLowerCase();
        if (formattedMessage.startsWith('crear tarea:')) {
            handleTaskCreation(formattedMessage, senderNumber, sock);
        } else if (formattedMessage.includes('ayud')) {
            await sock.sendMessage(senderNumber, { text: '- *Para crear una tarea, usa el siguiente formato:*\n\ncrear tarea: [ título ]\ndescripcion: [ descripción ]\ncategoria: [ electricidad, plomeria, construccion, pintura ]\nurgente: [ si, no ]\nestado: [ changes, pending, in_progress, completed, blocked ]\n\n*Ejemplo*:\ncrear tarea: Reparar fuga de agua\ndescripcion: Hay una fuga en la cocina\ncategoria: plomeria\nurgente: si\nestado: pending\n\n- *Para editar el estado de una tarea usa el siguiente formato:*\n\nestado tarea: [ID] : [nuevo_estado] ' });
        } else if (formattedMessage.startsWith('hola')) {
            await sock.sendMessage(senderNumber, { text: '¡Hola! ¿En qué puedo ayudarte hoy?' });
        } else if (formattedMessage.includes('cambiar estado:')) {
            const parts = formattedMessage.split(':');
            if (parts.length === 3) {
                const taskId = parseInt(parts[1].trim());
                const newState = parts[2].trim().toLowerCase();
                if (isNaN(taskId) || !["changes", "pending", "in_progress", "completed", "blocked"].includes(newState)) {
                    await sock.sendMessage(senderNumber, { text: 'Formato incorrecto. Usa: cambiar estado: [ID] : [nuevo_estado].' });
                } else {
                    handleTaskStateUpdate(taskId, newState, senderNumber, sock);
                }
            }
        }
    });

}

async function handleTaskCreation(messageText: string, senderNumber: string, sock: WASocket) {
    try {
        const parsedData = parseTaskMessage(messageText, senderNumber);

        // Llamada al service
        const createdTask = await createTaskService(parsedData);

        await sock.sendMessage(senderNumber, {
            text: `✅ Tarea creada con éxito:\nTítulo: ${createdTask.title}\n`
        });

    } catch (error: any) {
        console.error('Error al procesar el mensaje:', error.message);
        // Enviamos el mensaje de error al usuario para que sepa qué salió mal
        await sock.sendMessage(senderNumber, { text: `❌ Error: ${error.message}` });
    }
}

async function handleTaskStateUpdate(taskId: number, newState: string, senderNumber: string, sock: WASocket) {
    try {
        const originalTask = await getTaskByIdService(taskId);
        originalTask.status = newState as Task['status'];
        await updateTaskByIdService(taskId, originalTask);
        await sock.sendMessage(senderNumber, {
            text: `✅ El estado de la tarea ${taskId} ha sido actualizado a "${newState}".`
        });
    } catch (error: any) {
        console.error('Error al actualizar el estado de la tarea:', error.message);
        await sock.sendMessage(senderNumber, { text: `❌ Error al actualizar la tarea: ${error.message}` });
    }
}
