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
import { api, apiUrl, defaultHeaders, ALLOWED_WHATSAPP_NUMBERS } from './config';
import { createTaskDTOFromAI, processAudioCommand, CommandResult } from './ai';
import { transcribeAudioMessage } from './whisper';
import path from 'path';
import http from 'http';

const verifiedUsersCache = new Map<string, Profile | null>();
const chatStates = new Map<string, { state: string; context?: any }>();
// Rastrear mensajes ya procesados para evitar loops
const processedMessages = new Set<string>();

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
        await safeSendMessage(sock, senderNumber, '🎤 Escuchando tu audio...');

        // Transcribir el audio usando Whisper
        let transcribedText: string | null = null;
        try {
            transcribedText = await transcribeAudioMessage(msg);
        } catch (transcribeError: any) {
            console.error('Error en transcripción:', transcribeError.message);
            
            // Detectar errores específicos
            const errorMsg = transcribeError.message?.includes('Bad MAC') || 
                           transcribeError.message?.includes('bad mac') ||
                           transcribeError.message?.includes('Failed to decrypt')
                ? '⚠️ Error al descargar el audio. El mensaje puede no estar completamente descifrado.\n\nIntenta enviar el audio nuevamente en unos segundos.'
                : transcribeError.message?.includes('ffmpeg') 
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

        // Procesar el texto transcrito con Gemini AI para ejecutar cualquier comando
        const isAdmin = await isUserAdmin(user.id);
        
        // Obtener las obras del usuario para ayudar a la AI a mapear nombres de obras
        let userSites: Array<{id: string, address: string}> = [];
        try {
            const sites = await api.SiteService.getSitesByUser(user.id);
            if (sites && sites.length > 0) {
                userSites = sites.map((s: any) => ({ id: s.id, address: s.address || '' }));
            }
        } catch (e) {
            console.error('Error obteniendo obras del usuario para contexto de AI:', e);
        }
        
        let commandResult = null;
        try {
            console.log(`[processAudioCommand] Procesando transcripción: "${transcribedText}"`);
            console.log(`[processAudioCommand] Usuario: ${user.id}, Admin: ${isAdmin}, Obras: ${userSites.length}`);
            commandResult = await processAudioCommand(transcribedText, user.id, isAdmin, userSites);
            if (commandResult) {
                console.log(`[processAudioCommand] Comando reconocido: ${commandResult.commandType}`, commandResult.params);
            } else {
                console.log(`[processAudioCommand] No se pudo reconocer ningún comando`);
            }
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
        
        if (commandResult) {
            // Ejecutar el comando identificado por la IA
            await executeAudioCommand(commandResult, user, senderNumber, sock, transcribedText);
            return;
        }

        // Si no se pudo identificar un comando, mostrar mensaje de ayuda
        await safeSendMessage(sock, senderNumber, `⚠️ No pude identificar un comando en tu audio. Intentá ser más específico.\n\nEjemplos:\n• "quiero ver las tareas bloqueadas"\n• "crear tarea para cambiar el foco del baño"\n• "mostrar resumen"\n• "ver compras críticas"`);
    } catch (error: any) {
        console.error('Error inesperado al procesar audio:', error.message);
        // No intentar enviar mensaje si hay un error crítico, solo loguear
        // Esto evita que se cierre la sesión
    }
}

/**
 * Ejecuta el comando devuelto por la IA basado en el resultado del procesamiento de audio
 */
async function executeAudioCommand(
    commandResult: CommandResult,
    user: Profile,
    senderNumber: string,
    sock: WASocket,
    transcribedText: string
) {
    const { commandType, params } = commandResult;
    const isAdmin = await isUserAdmin(user.id);

    try {
        switch (commandType) {
            case 'createTask': {
                await safeSendMessage(sock, senderNumber, '✅ Entendido. Creando la tarea...');
                
                // Obtener site_id basado en site_address si se mencionó
                let siteId: string | undefined = params.site_id;
                if (!siteId && params.site_address) {
                    const sites = await api.SiteService.getAdminSitesByUser(user.id);
                    // Buscar por match exacto o parcial (bidireccional)
                    const searchTerm = params.site_address.toLowerCase().trim();
                    const matchedSite = sites.find((s: any) => {
                        const siteAddress = (s.address || '').toLowerCase();
                        return siteAddress.includes(searchTerm) || searchTerm.includes(siteAddress);
                    });
                    if (matchedSite) {
                        siteId = matchedSite.id;
                        console.log(`[createTask] Obra mapeada: "${params.site_address}" → "${matchedSite.address}" (${matchedSite.id})`);
                    }
                }
                
                // Si no hay site_id, intentar obtenerlo
                if (!siteId) {
                    const sites = await api.SiteService.getAdminSitesByUser(user.id);
                    if (!sites || sites.length === 0) {
                        await safeSendMessage(sock, senderNumber, '⚠️ No encontré obras donde seas administrador. Solo podés crear tareas en obras donde tenés rol de administrador.');
                        return;
                    }
                    
                    if (sites.length === 1) {
                        // Si hay una sola obra, usarla automáticamente
                        siteId = sites[0].id;
                    } else {
                        // Si hay múltiples obras, buscar obra mencionada en el audio
                        const lowerTranscription = transcribedText.toLowerCase();
                        const siteMentioned = sites.find((s: any) => {
                            const siteAddress = (s.address || '').toLowerCase();
                            return lowerTranscription.includes(siteAddress) || siteAddress.includes(lowerTranscription);
                        });
                        
                        if (siteMentioned) {
                            siteId = siteMentioned.id;
                            console.log(`[createTask] Obra encontrada en transcripción: "${siteMentioned.address}" (${siteMentioned.id})`);
                        } else {
                            // No se encontró obra en el audio, preguntar al usuario
                            const dto: CreateTaskDTO = {
                                ...params,
                                user_id: user.id
                                // No incluir site_id para que handleTaskCreation pregunte
                            };
                            
                            // Guardar el DTO y pedir selección de obra
                            setChatState(senderNumber, 'AWAITING_TASK_SITE_SELECTION', { taskData: dto });
                            const lines: string[] = [];
                            lines.push('🏷️ ¿Para qué obra es esta tarea? (respondé con el número):');
                            sites.slice(0, 20).forEach((s: any, idx: number) => lines.push(`${idx + 1}) ${s.address}`));
                            await safeSendMessage(sock, senderNumber, lines.join('\n'));
                            return;
                        }
                    }
                }
                
                if (!siteId) {
                    await safeSendMessage(sock, senderNumber, '⚠️ No encontré obras donde seas administrador. Solo podés crear tareas en obras donde tenés rol de administrador.');
                    return;
                }
                
                const dto: CreateTaskDTO = {
                    ...params,
                    site_id: siteId,
                    user_id: user.id
                };
                
                await handleTaskCreation(dto, senderNumber, sock, user);
                break;
            }
            
            case 'executeCommand': {
                const command = params.command;
                const obraName = params.obra_name || '';
                
                // Mapear comandos a funciones
                switch (command) {
                    case 'tareas':
                        await handleListTasksCommand(obraName, user, senderNumber, sock);
                        break;
                    case 'tareas_bloqueadas':
                        await handleTaskSearchCommand('tareas bloqueadas', user, senderNumber, sock);
                        break;
                    case 'tareas_esta_semana':
                        await handleTaskSearchCommand('tareas esta semana', user, senderNumber, sock);
                        break;
                    case 'tareas_pendientes':
                        await handleTaskSearchCommand('tareas pendientes', user, senderNumber, sock);
                        break;
                    case 'tareas_completadas':
                        await handleTaskSearchCommand('tareas completadas', user, senderNumber, sock);
                        break;
                    case 'tareas_en_progreso':
                        await handleTaskSearchCommand('tareas en progreso', user, senderNumber, sock);
                        break;
                    case 'resumen':
                        await sendDailySummary_v2(senderNumber, sock, obraName);
                        break;
                    case 'agenda':
                        await sendTodayAgenda(senderNumber, sock, obraName);
                        break;
                    case 'avances':
                        await sendAdvancesToday(senderNumber, sock, obraName);
                        break;
                    case 'obras':
                        await sendMySites(senderNumber, sock, user);
                        break;
                    case 'comparar_obras':
                        await sendSitesComparison(senderNumber, sock, user);
                        break;
                    case 'compras':
                        await handlePurchaseTrackingCommand('compras', user, senderNumber, sock);
                        break;
                    case 'compras_criticas':
                        await handlePurchaseTrackingCommand('compras criticas', user, senderNumber, sock);
                        break;
                    default:
                        await safeSendMessage(sock, senderNumber, `⚠️ Comando "${command}" no reconocido.`);
                }
                break;
            }
            
            case 'changeTaskStatus': {
                const taskIdentifier = params.task_identifier;
                const status = params.status;
                // Convertir status a formato esperado por el handler
                const statusMap: Record<string, string> = {
                    'pending': 'pendiente',
                    'in_progress': 'en progreso',
                    'completed': 'completada',
                    'blocked': 'bloqueada'
                };
                const statusText = statusMap[status] || status;
                await handleTaskStatusUpdateCommand(`${taskIdentifier} ${statusText}`, user, senderNumber, sock);
                break;
            }
            
            case 'changePurchaseStatus': {
                const purchaseId = params.purchase_id;
                const status = params.status;
                // Convertir status a formato esperado por el handler
                const statusMap: Record<string, string> = {
                    'purchased': 'comprar',
                    'delivered': 'entregar',
                    'pending': 'pendiente'
                };
                const commandText = statusMap[status] || status;
                await handlePurchaseStatusChange(`${commandText} ${purchaseId}`, user, senderNumber, sock);
                break;
            }
            
            case 'createChange': {
                await safeSendMessage(sock, senderNumber, '✅ Entendido. Creando solicitud de cambio...');
                
                // Obtener site_id basado en site_address si se mencionó
                let siteId: string | undefined = params.site_id;
                if (!siteId && params.site_address) {
                    const sites = await api.SiteService.getSitesByUser(user.id);
                    const matchedSite = sites.find((s: any) => 
                        (s.address || '').toLowerCase().includes(params.site_address.toLowerCase())
                    );
                    if (matchedSite) siteId = matchedSite.id;
                }
                
                if (!siteId) {
                    const sites = await api.SiteService.getSitesByUser(user.id);
                    if (sites && sites.length > 0) {
                        if (sites.length === 1) {
                            siteId = sites[0].id;
                        } else {
                            const siteMentioned = sites.find((s: any) => 
                                transcribedText.toLowerCase().includes((s.address || '').toLowerCase())
                            );
                            siteId = siteMentioned?.id || sites[0].id;
                        }
                    }
                }
                
                if (!siteId) {
                    await safeSendMessage(sock, senderNumber, '⚠️ No encontré obras asignadas. Contactá al administrador para que te asigne a una obra.');
                    return;
                }
                
                const changeDTO: CreateTaskDTO = {
                    title: params.title,
                    description: params.description || params.title || '',
                    category: params.category,
                    status: 'changes',
                    user_id: user.id,
                    site_id: siteId
                };
                
                const siteAddress = params.site_address || '';
                await handleChangeCreation(changeDTO, siteAddress, senderNumber, sock, user, undefined);
                break;
            }
            
            case 'createUpdate': {
                if (!isAdmin) {
                    await safeSendMessage(sock, senderNumber, '⚠️ Solo los administradores pueden crear avances.');
                    return;
                }
                
                let siteHint = params.site_address || '';
                await createTextUpdate(user, senderNumber, sock, params.text, siteHint);
                break;
            }
            
            case 'getWeather': {
                // Si obra_name es undefined, null, o string vacío, pasar string vacío para mostrar lista
                const obraName = (params.obra_name && params.obra_name.trim() !== '') ? params.obra_name.trim() : '';
                await handleWeatherCommand(obraName, user, senderNumber, sock);
                break;
            }
            
            case 'createPurchase': {
                if (!isAdmin) {
                    await safeSendMessage(sock, senderNumber, '⚠️ Solo los administradores pueden crear solicitudes de compra.');
                    return;
                }
                
                await safeSendMessage(sock, senderNumber, '✅ Entendido. Creando la solicitud de compra...');
                
                // Obtener site_id basado en site_address si se mencionó
                let siteId: string | undefined = params.site_id;
                if (!siteId && params.site_address) {
                    const sites = await api.SiteService.getAdminSitesByUser(user.id);
                    const searchTerm = params.site_address.toLowerCase().trim();
                    const matchedSite = sites.find((s: any) => {
                        const siteAddress = (s.address || '').toLowerCase();
                        return siteAddress.includes(searchTerm) || searchTerm.includes(siteAddress);
                    });
                    if (matchedSite) {
                        siteId = matchedSite.id;
                        console.log(`[createPurchase] Obra mapeada: "${params.site_address}" → "${matchedSite.address}" (${matchedSite.id})`);
                    }
                }
                
                // Si no hay site_id, intentar obtenerlo
                if (!siteId) {
                    const sites = await api.SiteService.getAdminSitesByUser(user.id);
                    if (!sites || sites.length === 0) {
                        await safeSendMessage(sock, senderNumber, '⚠️ No encontré obras donde seas administrador. Solo podés crear compras en obras donde tenés rol de administrador.');
                        return;
                    }
                    
                    if (sites.length === 1) {
                        siteId = sites[0].id;
                    } else {
                        // Buscar obra mencionada en el audio
                        const lowerTranscription = transcribedText.toLowerCase();
                        const siteMentioned = sites.find((s: any) => {
                            const siteAddress = (s.address || '').toLowerCase();
                            return lowerTranscription.includes(siteAddress) || siteAddress.includes(lowerTranscription);
                        });
                        
                        if (siteMentioned) {
                            siteId = siteMentioned.id;
                            console.log(`[createPurchase] Obra encontrada en transcripción: "${siteMentioned.address}" (${siteMentioned.id})`);
                        } else {
                            // No se encontró obra, preguntar al usuario
                            const purchasePayload: any = {
                                ...params,
                                user_id: user.id
                            };
                            
                            setChatState(senderNumber, 'AWAITING_PURCHASE_SITE_SELECTION', { 
                                purchaseData: purchasePayload,
                                sitesOptions: sites 
                            });
                            const lines: string[] = [];
                            lines.push('🏷️ ¿Para qué obra es esta compra? (respondé con el número):');
                            sites.slice(0, 20).forEach((s: any, idx: number) => lines.push(`${idx + 1}) ${s.address}`));
                            await safeSendMessage(sock, senderNumber, lines.join('\n'));
                            return;
                        }
                    }
                }
                
                if (!siteId) {
                    await safeSendMessage(sock, senderNumber, '⚠️ No encontré obras donde seas administrador. Solo podés crear compras en obras donde tenés rol de administrador.');
                    return;
                }
                
                // Crear la compra
                const purchasePayload: any = {
                    product: params.product,
                    quantity: params.quantity || 1,
                    category: params.category || 'otros',
                    priority: params.priority || 'normal',
                    status: 'pending',
                    user_id: user.id,
                    site_id: siteId
                };
                
                if (params.description) {
                    purchasePayload.description = params.description;
                }
                if (params.price !== undefined && params.price !== null) {
                    purchasePayload.price = params.price;
                }
                if (params.supplier) {
                    purchasePayload.supplier = params.supplier;
                }
                
                try {
                    const createdPurchase = await api.PurchaseService.createPurchase(purchasePayload);
                    // Obtener el nombre de la obra
                    let siteAddress = 'Sin obra';
                    try {
                        const sites = await api.SiteService.getAdminSitesByUser(user.id);
                        const site = sites.find((s: any) => s.id === siteId);
                        if (site) {
                            siteAddress = site.address || 'Sin obra';
                        }
                    } catch (e) {
                        console.error('Error obteniendo nombre de obra:', e);
                    }
                    
                    await safeSendMessage(sock, senderNumber, 
                        `✅ Solicitud de compra creada:\n📦 Producto: ${createdPurchase.product}\n📊 Cantidad: ${createdPurchase.quantity}\n🏷️ Categoría: ${createdPurchase.category}\n🏷️ Obra: ${siteAddress}`
                    );
                } catch (error: any) {
                    console.error('Error creando compra:', error);
                    await safeSendMessage(sock, senderNumber, `❌ Error al crear la compra: ${error?.message || 'Error desconocido'}`);
                }
                break;
            }
            
            default:
                await safeSendMessage(sock, senderNumber, `⚠️ Tipo de comando "${commandType}" no reconocido.`);
        }
    } catch (error: any) {
        console.error(`Error ejecutando comando ${commandType}:`, error);
        await safeSendMessage(sock, senderNumber, `❌ Error al ejecutar el comando: ${error?.message || 'Error desconocido'}`);
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

        // Elegir obra para subir el avance (solo obras donde el usuario es admin)
        try {
            const sites = await api.SiteService.getAdminSitesByUser(user.id);
            if (!sites || sites.length === 0) {
                await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras donde seas administrador. Solo podés crear avances en obras donde tenés rol de administrador.' });
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
            const userSites = await api.SiteService.getAdminSitesByUser(user.id);
            const match = userSites.find(s => (s.address || '').toLowerCase().includes(siteHint.toLowerCase()));
            if (match) site_id = match.id as any;
            if (!match) {
                await sock.sendMessage(jid, { text: `⚠️ No encontré una obra llamada "${siteHint}" donde seas administrador. Solo podés crear avances en obras donde tenés rol de administrador.` });
                return;
            }
        }
        if (!site_id) {
            try {
                const userSites = await api.SiteService.getAdminSitesByUser(user.id);
                site_id = (userSites && (userSites[0] as any)?.id) || undefined;
                if (!site_id) {
                    await sock.sendMessage(jid, { text: '⚠️ No encontré obras donde seas administrador. Solo podés crear avances en obras donde tenés rol de administrador.' });
                    return;
                }
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

        // Prevenir loops: verificar si este mensaje ya fue procesado
        const messageId = msg.key.id;
        if (messageId && processedMessages.has(messageId)) {
            console.log(`⚠️ Mensaje ${messageId} ya fue procesado, ignorando para evitar loop`);
            return;
        }
        // Marcar como procesado (limpiar después de 5 minutos para evitar acumulación de memoria)
        if (messageId) {
            processedMessages.add(messageId);
            setTimeout(() => processedMessages.delete(messageId), 5 * 60 * 1000);
        }

        const botJid = sock.user?.id;
        let senderNumber: string | null | undefined = msg.key.remoteJid;

        // Función auxiliar para normalizar números (sin @s.whatsapp.net, @lid, etc.)
        const normalizeJid = (jid: string | null | undefined) => {
            if (!jid) return undefined;
            return jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
        };

        // Función auxiliar para verificar si un número está permitido
        const isAllowedNumber = (jid: string | null | undefined): boolean => {
            if (!ALLOWED_WHATSAPP_NUMBERS || ALLOWED_WHATSAPP_NUMBERS.length === 0) {
                return true; // Si no hay restricción, permitir todos
            }
            if (!jid) return false;
            
            // Primero verificar si el JID completo está en la lista (útil para grupos @g.us)
            if (ALLOWED_WHATSAPP_NUMBERS.includes(jid)) {
                return true;
            }
            
            // Luego verificar con normalización (para números individuales)
            const normalizedJid = normalizeJid(jid);
            return ALLOWED_WHATSAPP_NUMBERS.some(allowed => {
                const normalizedAllowed = normalizeJid(allowed);
                return normalizedJid === normalizedAllowed;
            });
        };

        // CRÍTICO: Ignorar TODOS los mensajes con fromMe: true
        // Estos son mensajes que el bot envió. Si el bot se envía un mensaje a sí mismo (remoteJid === botJid),
        // eso es un caso especial de testing, pero normalmente no debería procesarse.
        // Si fromMe es true y remoteJid es diferente al botJid, es un mensaje que el bot envió a otro número,
        // y NO debe ser procesado para evitar loops infinitos.
        if (msg.key.fromMe) {
            const normalizedSender = normalizeJid(senderNumber);
            const normalizedBotJid = normalizeJid(botJid);
            
            // Solo permitir si el bot se está enviando un mensaje a sí mismo (caso raro de testing)
            // En todos los demás casos, ignorar para evitar loops
            if (normalizedSender === normalizedBotJid && normalizedBotJid) {
                console.log(`⚠️ Bot se envió un mensaje a sí mismo (${senderNumber}), ignorando para evitar loop`);
            } else {
                console.log(`⚠️ Mensaje fromMe ignorado: bot envió mensaje a ${senderNumber}, no procesando para evitar loop`);
            }
            return; // SIEMPRE ignorar mensajes fromMe
        }
        
        if (!senderNumber) {
            return;
        }

        // Restricción: solo responder a números permitidos (si están configurados)
        if (ALLOWED_WHATSAPP_NUMBERS && ALLOWED_WHATSAPP_NUMBERS.length > 0) {
            if (!isAllowedNumber(senderNumber)) {
                console.log(`Mensaje bloqueado de: ${senderNumber} (números permitidos: ${ALLOWED_WHATSAPP_NUMBERS.join(', ')})`);
                return;
            }
        }

        // Verificar que el remitente no sea el bot mismo (protección adicional)
        const normalizedSender = normalizeJid(senderNumber);
        const normalizedBot = normalizeJid(botJid);
        if (normalizedSender === normalizedBot) {
            console.log(`⚠️ Mensaje del bot mismo (${senderNumber}), ignorando para evitar loop`);
            return;
        }

        const user = await getVerifiedUser(senderNumber);
        if (!user) {
            await safeSendMessage(sock, senderNumber, "Hola, para usar el bot, primero agrega tu número de WhatsApp en tu perfil de la app Cimenta.");
            return;
        }

    // Manejo de audios (transcripción con Whisper)
    if (msg.message.audioMessage) {
        // Delay más largo para dar tiempo a que el mensaje se descifre completamente
        // Esto ayuda a evitar errores de "Bad MAC" al descargar el audio
        await new Promise(resolve => setTimeout(resolve, 1000));
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

    // Comando de resumen ('resumen' o 'res')
    const lower = messageText.trim().toLowerCase();
    if (lower === 'resumen' || lower.startsWith('resumen ') || lower === 'res' || lower.startsWith('res ')) {
        // Extraer el parámetro de obra (lo que viene después de "resumen" o "res")
        let query = '';
        if (lower.startsWith('resumen ')) {
            query = messageText.trim().slice(8).trim(); // "resumen " tiene 8 caracteres
        } else if (lower.startsWith('res ')) {
            query = messageText.trim().slice(4).trim(); // "res " tiene 4 caracteres
        }
        // Si es solo "resumen" o "res" sin parámetro, query será vacío y mostrará resumen global
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

    // Comando unificado para actualizar estado: [número/título] [pendiente/bloqueada/completada/en progreso]
    // Detectar si el mensaje termina con un estado válido
    const statusPattern = /\s+(pendiente|bloqueada|completada|en\s+progreso|progreso)$/i;
    if (statusPattern.test(messageText)) {
        await handleTaskStatusUpdateCommand(messageText, user, senderNumber, sock);
        return;
    }

    // Comandos de filtrado de tareas (DEBEN ir ANTES del comando genérico "tareas")
    if (lower.startsWith('tareas bloqueadas') || lower.startsWith('tareas pendientes') ||
        lower.startsWith('tareas completadas') || lower.startsWith('tareas en progreso') ||
        lower.startsWith('tareas esta semana') || lower.startsWith('tareas esta mes') ||
        lower.startsWith('tareas este mes') || lower.startsWith('tareas hoy') || lower.startsWith('tareas mañana')) {
        await handleTaskSearchCommand(messageText, user, senderNumber, sock);
        return;
    }

    // Comando "tareas" o "tareas <obra>" para listar todas las tareas (genérico)
    if (lower === 'tareas' || lower.startsWith('tareas ')) {
        const obraName = lower === 'tareas' ? '' : messageText.replace(/^tareas\s+/i, '').trim();
        await handleListTasksCommand(obraName, user, senderNumber, sock);
        return;
    }

    // Comando de clima para obra
    if (lower.startsWith('clima')) {
        // Extraer el nombre de la obra, removiendo "clima" y opcionalmente "obra"
        const obraName = messageText.replace(/^clima\s+(obra\s+)?/i, '').trim();
        await handleWeatherCommand(obraName, user, senderNumber, sock);
        return;
    }

    // Comandos de seguimiento de compras (disponible para clientes y admins)
    if (lower === 'compras' || lower.startsWith('compras pendientes') || lower.startsWith('compras criticas') ||
        lower.startsWith('compras compradas') ||
        lower.startsWith('compras entregadas')) {
        await handlePurchaseTrackingCommand(messageText, user, senderNumber, sock);
        return;
    }

    // Comandos para editar estado de compras (disponible para clientes y admins)
    if (lower.startsWith('comprar ') || lower.startsWith('entregar ') || lower.startsWith('pendiente ')) {
        await handlePurchaseStatusChange(messageText, user, senderNumber, sock);
        return;
    }

    // Comando de compra (solo para admins - ya manejado en handleIdleState, pero por seguridad también aquí)
    if (lower === 'compra' || lower === 'comprar' || lower === 'c') {
        const isAdmin = await isUserAdmin(user.id);
        if (!isAdmin) {
            await sock.sendMessage(senderNumber, {
                text: '⚠️ Solo los administradores pueden crear solicitudes de compra. Escribí "*compras*" para ver las compras.'
            });
            return;
        }
        await startPurchaseFlow(senderNumber, sock, user);
        return;
    }

    // Comando para explicar qué hace un comando específico
    if (lower === 'qué hace' || lower === 'que hace' || lower.startsWith('qué hace ') || lower.startsWith('que hace ')) {
        const isAdmin = await isUserAdmin(user.id);
        const command = lower.startsWith('qué hace ') 
            ? messageText.slice(9).trim() 
            : lower.startsWith('que hace ')
            ? messageText.slice(9).trim()
            : null;
        
        const explanation = getCommandExplanation(command, isAdmin);
        await sock.sendMessage(senderNumber, { text: explanation });
        return;
    }

    // Avances de texto: "av <texto>" o "avance <texto>" (opcional: "av <obra>: <texto>") - Solo para admins
    if (lower === 'av' || lower === 'avance') {
        const isAdmin = await isUserAdmin(user.id);
        if (!isAdmin) {
            await sock.sendMessage(senderNumber, { 
                text: '⚠️ Solo los administradores pueden crear avances. Escribí "*avances*" para ver los avances.' 
            });
            return;
        }
        await sock.sendMessage(senderNumber, { text: '📝 Para subir un avance de texto, escribí: *av* <texto> o *av* <obra>: <texto>' });
        return;
    }
    if (lower.startsWith('av ') || lower.startsWith('avance ')) {
        const isAdmin = await isUserAdmin(user.id);
        if (!isAdmin) {
            await sock.sendMessage(senderNumber, { 
                text: '⚠️ Solo los administradores pueden crear avances. Escribí "*avances*" para ver los avances.' 
            });
            return;
        }
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
        // Si no se indicó obra, pedir selección si hay varias (solo obras donde el usuario es admin)
        try {
            const sites = await api.SiteService.getAdminSitesByUser(user.id);
            if (!sites || sites.length === 0) {
                await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras donde seas administrador. Solo podés crear avances en obras donde tenés rol de administrador.' });
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
            await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras donde seas administrador. Solo podés crear avances en obras donde tenés rol de administrador.' });
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

        case 'AWAITING_PURCHASE_SITE_SELECTION':
            await handlePurchaseSiteSelectionFromAudio(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_PRODUCT':
            await handlePurchaseProduct(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_CATEGORY':
            await handlePurchaseCategory(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_PURCHASE_PRIORITY':
            await handlePurchasePriority(messageText, context, senderNumber, sock);
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

        case 'AWAITING_TASK_SITE_SELECTION':
            await handleTaskSiteSelection(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_WORKER_ASSIGNMENT_CONFIRMATION':
            await handleWorkerAssignmentConfirmation(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_WORKER_SELECTION':
            await handleWorkerSelection(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_CHANGE_SITE_SELECTION':
            await handleChangeSiteSelection(messageText, context, user, senderNumber, sock);
            break;

        case 'AWAITING_CHANGE_TITLE':
            await handleChangeTitle(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_CHANGE_DESCRIPTION':
            await handleChangeDescription(messageText, context, senderNumber, sock);
            break;

        case 'AWAITING_CHANGE_CATEGORY':
            await handleChangeCategory(messageText, context, user, senderNumber, sock);
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
    const isAdmin = await isUserAdmin(user.id);
    
    if (lower === '!crear tarea' || lower === 'tarea' || lower === 't' || lower === 'crear tarea') {
        // Solo admins pueden crear tareas
        if (!isAdmin) {
            await sock.sendMessage(senderNumber, { 
                text: '⚠️ Solo los administradores pueden crear tareas. Escribí "*tareas*" para ver las tareas o "*cambio*" para solicitar un cambio.' 
            });
            return;
        }
        // Elegir obra antes de crear tarea (solo obras donde el usuario es admin)
        try {
            const sites = await api.SiteService.getAdminSitesByUser(user.id);
            if (!sites || sites.length === 0) {
                await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras donde seas administrador. Solo podés crear tareas en obras donde tenés rol de administrador.' });
                return;
            }
            if (sites.length === 1) {
                setChatState(senderNumber, 'AWAITING_TASK_TITLE', { site_id: (sites[0] as any).id, site_address: (sites[0] as any).address });
                await sock.sendMessage(senderNumber, { text: '🎯 ¡Genial! Vamos a crear una tarea.\n🏷️ Obra: ' + ((sites[0] as any).address || '') + '\n✍️ Escribí el *título* de la tarea (ej: "Arreglar caño del baño").' });
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
    } else if (lower === 'cambio' || lower === 'cambios' || lower === 'solicitar cambio' || lower === 'solicitar cambios') {
        // Comando para crear cambios (disponible para clientes y admins)
        try {
            // Usar todas las obras del usuario (no solo donde es admin)
            const sites = await api.SiteService.getSitesByUser(user.id);
            if (!sites || sites.length === 0) {
                await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras asignadas. Contactá al administrador para que te asigne a una obra.' });
                return;
            }
            if (sites.length === 1) {
                setChatState(senderNumber, 'AWAITING_CHANGE_TITLE', { site_id: (sites[0] as any).id, site_address: (sites[0] as any).address });
                await sock.sendMessage(senderNumber, { text: '🔄 ¡Vamos a solicitar un cambio!\n🏷️ Obra: ' + ((sites[0] as any).address || '') + '\n📝 Escribí el título de la solicitud de cambio (ej: "Cambiar color de pintura de la sala").' });
                return;
            }
            const lines: string[] = [];
            lines.push('🔄 Solicitud de Cambio');
            lines.push('🏷️ ¿Para qué obra es esta solicitud? Elegí una (número o nombre):');
            sites.slice(0, 20).forEach((s: any, idx: number) => lines.push(`${idx + 1}) ${s.address}`));
            await sock.sendMessage(senderNumber, { text: lines.join('\n') });
            setChatState(senderNumber, 'AWAITING_CHANGE_SITE_SELECTION', { sitesOptions: sites });
            return;
        } catch (e) {
            await sock.sendMessage(senderNumber, { text: '❌ No pude obtener tus obras. Intentá de nuevo más tarde.' });
            return;
        }
    } else if (lower === 'resumen' || lower.startsWith('resumen ') || lower === 'res' || lower.startsWith('res ')) {
        // Disponible para todos
        let query = '';
        if (lower.startsWith('resumen ')) {
            query = messageText.trim().slice(8).trim();
        } else if (lower.startsWith('res ')) {
            query = messageText.trim().slice(4).trim();
        }
        await sendDailySummary_v2(senderNumber, sock, query);
    } else if (lower === 'compra' || lower === 'comprar' || lower === 'c') {
        // Solo admins pueden crear compras
        if (!isAdmin) {
            await sock.sendMessage(senderNumber, { 
                text: '⚠️ Solo los administradores pueden crear solicitudes de compra. Escribí "*compras*" para ver las compras.' 
            });
            return;
        }
        await startPurchaseFlow(senderNumber, sock, user);
    } else if (lower === 'qué hace' || lower === 'que hace' || lower.startsWith('qué hace ') || lower.startsWith('que hace ')) {
        // Comando para explicar qué hace un comando específico
        const command = lower.startsWith('qué hace ') 
            ? messageText.slice(9).trim() 
            : lower.startsWith('que hace ')
            ? messageText.slice(9).trim()
            : null;
        
        const explanation = getCommandExplanation(command, isAdmin);
        await sock.sendMessage(senderNumber, { text: explanation });
        return;
    } else {
        // Mostrar mensaje de ayuda según el rol
        if (isAdmin) {
            await sock.sendMessage(senderNumber, {
                text: `👋 Hola ${user.name}!

Podés crear:
✍️ "*tarea*"
🛒 "*compra*"
📝 "*av <texto>*"  (o enviá una foto)

Podés ver:
🧾 "*resumen*" o "*res <obra>*"
📅 "*agenda*" o "*agenda <obra>*"

📸 "*avances*" o "*avances <obra>*"

🏷️ "*obras*"
📊 "*comparar obras*"
🌤️ "*clima [nombre]*"

✅ "*[número/título] [pendiente/bloqueada/completada/en progreso]*"

📋 "*tareas*" o "*tareas <obra>*"
📋 "*tareas bloqueadas*" o "*tareas esta semana*"

🛒 "*compras*" o "*compras criticas*"
🛒 "*comprar [ID]*", "*entregar [ID]*" o "*pendiente [ID]*"

❌ "*cancelar*"

❓ "*qué hace [comando]*" → Explicación detallada de cualquier comando`
            });
        } else {
            // Mensaje para clientes
            await sock.sendMessage(senderNumber, {
                text: `👋 Hola ${user.name}!
Podés crear:
🔄 "*cambio*"

Podes ver:
📋 "*compras*" o "*compras criticas*"
🛒 "*comprar [ID]*", "*entregar [ID]*" o "*pendiente [ID]*"

✍️ "*tareas*" o "*tareas bloqueadas*" o "*tareas esta semana*"

📸 "*avances*"

🧾 "*resumen*" o "*res <obra>*"
📊 "*comparar obras*"

❌ "*cancelar*"

❓ "*qué hace [comando]*" → Explicación detallada de cualquier comando`
            });
        }
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
            '1) *Pendiente* 🕒',
            '2) *En Progreso* 🚧',
            '3) *Completada* ✅',
            '4) *Bloqueada* ⛔',
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
    // Mapear castellano -> enumeración del backend (sin "cambios" ya que existe el comando "cambio")
    const statusMap: Record<string, string> = {
        '1': 'pending',
        '2': 'in_progress',
        '3': 'completed',
        '4': 'blocked',
        'pendiente': 'pending',
        'en progreso': 'in_progress',
        'progreso': 'in_progress',
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
            '1) Pendiente 🕒',
            '2) En Progreso 🚧',
            '3) Completada ✅',
            '4) Bloqueada ⛔',
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
        const user = await getVerifiedUser(senderNumber);
        if (user) {
            await handleTaskCreation(context as CreateTaskDTO, senderNumber, sock, user);
        } else {
            await sock.sendMessage(senderNumber, { text: '❌ No se pudo identificar tu usuario.' });
            setChatState(senderNumber, 'IDLE');
        }
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
    await handleTaskCreation(toCreate, senderNumber, sock, user);
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
    setChatState(senderNumber, 'AWAITING_TASK_TITLE', { site_id: chosen.id, site_address: chosen.address });
    await sock.sendMessage(senderNumber, { text: `🏷️ Obra seleccionada: ${chosen.address}\n✍️ Escribí el *título* de la tarea (ej: "Arreglar caño del baño").` });
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

// Manejo de selección de obra para tarea (después de crear DTO desde audio)
async function handleTaskSiteSelection(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    const taskData: CreateTaskDTO = context?.taskData;
    if (!taskData) {
        await sock.sendMessage(senderNumber, { text: '❌ Error: No se encontró la información de la tarea. Intentá de nuevo.' });
        setChatState(senderNumber, 'IDLE');
        return;
    }

    const sites = await api.SiteService.getSitesByUser(user.id);
    if (!sites || sites.length === 0) {
        await sock.sendMessage(senderNumber, { text: '❌ No tenés obras asignadas.' });
        setChatState(senderNumber, 'IDLE');
        return;
    }

    let input = messageText.trim().toLowerCase();
    let chosen: any | null = null;
    const num = input.match(/^\d+/);
    if (num) {
        const idx = parseInt(num[0], 10) - 1;
        if (idx >= 0 && idx < sites.length) chosen = sites[idx];
    }
    if (!chosen) {
        chosen = sites.find((s: any) => (s.address || '').toLowerCase().includes(input) || (s.id || '').toLowerCase() === input) || null;
    }
    if (!chosen) {
        await sock.sendMessage(senderNumber, { text: '⚠️ No reconocí la obra. Respondé con el número de la lista o parte del nombre.' });
        return;
    }

    // Asignar la obra a la tarea y crearla
    const taskWithSite = taskData as CreateTaskDTO & { site_id?: string; site_address?: string };
    taskWithSite.site_id = chosen.id;
    taskWithSite.site_address = chosen.address;
    await handleTaskCreation(taskWithSite, senderNumber, sock, user);
}

// ====================
// Funciones para creación de CAMBIOS (para clientes)
// ====================

async function handleChangeSiteSelection(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    const options: any[] = context?.sitesOptions || [];
    if (!options.length) {
        await sock.sendMessage(senderNumber, { text: '❌ No encontré opciones de obra. Escribí "cambio" para empezar de nuevo.' });
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
    setChatState(senderNumber, 'AWAITING_CHANGE_TITLE', { site_id: chosen.id, site_address: chosen.address });
    await sock.sendMessage(senderNumber, { text: `✅ Obra seleccionada: ${chosen.address}\n📝 Escribí el título de la solicitud de cambio (ej: "Cambiar color de pintura de la sala").` });
}

async function handleChangeTitle(
    messageText: string,
    context: any,
    senderNumber: string,
    sock: WASocket
) {
    await sock.sendMessage(senderNumber, {
        text: '✅ Título guardado.\n🖊️ Ahora escribí una breve *descripción* (opcional, escribí "sin descripción" para omitir).'
    });
    setChatState(senderNumber, 'AWAITING_CHANGE_DESCRIPTION', { ...context, title: messageText });
}

async function handleChangeDescription(
    messageText: string,
    context: any,
    senderNumber: string,
    sock: WASocket
) {
    const description = messageText.trim().toLowerCase() === 'sin descripción' || messageText.trim().toLowerCase() === 'sin descripcion' 
        ? '' 
        : messageText.trim();
    
    const body = [
        '📝 Descripción guardada.',
        '',
        'Elegí la categoría de la solicitud de cambio (respondé con número o nombre):',
        '1) *Pintura* 🎨',
        '2) *Construcción* 🏗️',
        '3) *Electricidad* ⚡',
        '4) *Plomería* 🚰',
        '5) *Otro* 🧩',
    ].join('\n');
    await sock.sendMessage(senderNumber, { text: body });

    setChatState(senderNumber, 'AWAITING_CHANGE_CATEGORY', {
        ...context,
        description: description
    });
}

async function handleChangeCategory(
    messageText: string,
    context: any,
    user: Profile,
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
        '5': 'otro',
        'pintura': 'pintura',
        'construcción': 'construccion',
        'construccion': 'construccion',
        'electricidad': 'electricidad',
        'plomería': 'plomeria',
        'plomeria': 'plomeria',
        'otro': 'otro'
    };
    const mapped = categoryMap[normalized] || normalized;

    // Validar categoría (incluyendo "otro" aunque no esté en taskCategories)
    const validCategories = ['pintura', 'construccion', 'electricidad', 'plomeria', 'otro'];
    if (validCategories.includes(mapped)) {
        // Para "otro", usar 'pintura' como categoría por defecto en el DTO (la BD acepta cualquier string)
        const categoryForDTO = mapped === 'otro' ? 'pintura' : mapped;
        
        // Crear el cambio directamente con status="changes"
        const changeDTO: CreateTaskDTO = {
            title: context.title,
            description: context.description || context.title || '',
            category: categoryForDTO as TaskCategory,
            status: 'changes',
            user_id: user.id,
            site_id: context.site_id
        };
        
        await handleChangeCreation(changeDTO, context.site_address, senderNumber, sock, user, mapped === 'otro' ? 'otro' : undefined);
    } else {
        await sock.sendMessage(senderNumber, {
            text: '⚠️ Categoría no válida. Elegí entre: 1) Pintura, 2) Construcción, 3) Electricidad, 4) Plomería, 5) Otro.'
        });
    }
}

async function handleChangeCreation(
    changeDTO: CreateTaskDTO,
    siteAddress: string | undefined,
    senderNumber: string,
    sock: WASocket,
    user: Profile,
    actualCategory?: string
) {
    try {
        // Asegurar que el status sea "changes"
        changeDTO.status = 'changes';
        
        // Validar que tenga los campos requeridos
        if (!changeDTO.title || !changeDTO.category) {
            await sock.sendMessage(senderNumber, { 
                text: '❌ Error: Faltan campos requeridos (título o categoría)' 
            });
            setChatState(senderNumber, 'IDLE');
            return;
        }
        
        if (!changeDTO.user_id) {
            changeDTO.user_id = user.id;
        }
        
        if (!changeDTO.site_id) {
            await sock.sendMessage(senderNumber, { 
                text: '❌ Error: No se seleccionó una obra. Intentá de nuevo.' 
            });
            setChatState(senderNumber, 'IDLE');
            return;
        }
        
        // Preparar el payload completo incluyendo site_id
        // Necesitamos enviar todos los campos que la tabla tasks requiere
        const taskPayload: any = {
            title: changeDTO.title,
            description: changeDTO.description || changeDTO.title || '',
            // Usar la categoría real si es "otro", sino usar la del DTO
            category: actualCategory === 'otro' ? 'otro' : changeDTO.category,
            status: 'changes',
            user_id: changeDTO.user_id || user.id,
            site_id: changeDTO.site_id
        };
        
        // Validar que todos los campos requeridos estén presentes
        if (!taskPayload.title || !taskPayload.category || !taskPayload.user_id || !taskPayload.site_id) {
            await sock.sendMessage(senderNumber, { 
                text: `❌ Error: Faltan campos requeridos.\nTítulo: ${taskPayload.title ? '✓' : '✗'}\nCategoría: ${taskPayload.category ? '✓' : '✗'}\nUsuario: ${taskPayload.user_id ? '✓' : '✗'}\nObra: ${taskPayload.site_id ? '✓' : '✗'}` 
            });
            setChatState(senderNumber, 'IDLE');
            return;
        }
        
        console.log('Creando cambio con payload completo:', JSON.stringify(taskPayload, null, 2));
        console.log('Verificación de campos:', {
            title: !!taskPayload.title,
            description: !!taskPayload.description,
            category: taskPayload.category,
            status: taskPayload.status,
            user_id: taskPayload.user_id,
            site_id: taskPayload.site_id
        });
        
        // Llamada al service con el payload completo
        let createdChange;
        try {
            createdChange = await api.TaskService.createTask(taskPayload);
            console.log('✅ Cambio creado exitosamente:', createdChange?.id);
        } catch (createError: any) {
            console.error('❌ Error al crear cambio en el servicio:', createError);
            console.error('Error completo:', JSON.stringify(createError, null, 2));
            throw createError;
        }

        await sock.sendMessage(senderNumber, {
            text: `✅ Solicitud de cambio creada con éxito:\n📋 Título: ${createdChange.title}\n🏷️ Obra: ${siteAddress || 'Sin obra'}\n🔄 Estado: Cambios`
        });

        // Notificar a los admins de la obra (similar a como se hace con tareas bloqueadas)
        if (changeDTO.site_id) {
            console.log(`[handleChangeCreation] Notificando a administradores de la obra ${changeDTO.site_id} sobre el cambio creado por ${user.name}`);
            await notifyAdminsOfChange(changeDTO.site_id, createdChange, user, siteAddress);
        } else {
            console.log(`[handleChangeCreation] No hay site_id en el cambio, no se puede notificar`);
        }

        setChatState(senderNumber, 'IDLE');
    } catch (error: any) {
        console.error('Error al crear el cambio:', error);
        console.error('Stack trace:', error?.stack);
        const errorMessage = error?.message || error?.toString() || 'Error desconocido';
        await sock.sendMessage(senderNumber, { 
            text: `❌ Error al crear la solicitud de cambio:\n${errorMessage}\n\nVerificá que todos los campos estén correctos.` 
        });
        setChatState(senderNumber, 'IDLE');
    }
}

// Manejo de confirmación de asignación a workers
async function handleWorkerAssignmentConfirmation(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    const lower = messageText.trim().toLowerCase();
    const { taskId, taskTitle, siteId, siteAddress } = context;

    if (['si', 'sí', 's', 'yes', 'y'].includes(lower)) {
        // Obtener workers de la obra
        try {
            const workers = await api.WorkerService.getWorkersBySite(siteId);
            
            if (!workers || workers.length === 0) {
                await sock.sendMessage(senderNumber, {
                    text: `⚠️ No hay trabajadores asignados a la obra "${siteAddress || 'Sin nombre'}".\n\n✅ Tarea creada sin asignar.`
                });
                setChatState(senderNumber, 'IDLE');
                return;
            }

            // Mostrar lista de workers
            const lines: string[] = [];
            lines.push(`👷 *Trabajadores de "${siteAddress || 'Sin nombre'}":*`);
            lines.push('');
            lines.push('Seleccioná uno o más trabajadores (respondé con los números separados por comas, ej: "1,3" o "1 3"):');
            lines.push('');
            workers.forEach((worker: any, index: number) => {
                const num = index + 1;
                const name = `${worker.worker_name || ''} ${worker.worker_surname || ''}`.trim() || 'Sin nombre';
                const profession = worker.profession || 'Sin profesión';
                lines.push(`${num}) ${name} - ${profession}`);
            });

            setChatState(senderNumber, 'AWAITING_WORKER_SELECTION', {
                taskId,
                taskTitle,
                siteId,
                siteAddress,
                workers
            });

            await sock.sendMessage(senderNumber, { text: lines.join('\n') });
        } catch (error: any) {
            console.error('Error obteniendo workers:', error);
            await sock.sendMessage(senderNumber, {
                text: `❌ Error al obtener trabajadores: ${error?.message || 'Error desconocido'}\n\n✅ Tarea creada sin asignar.`
            });
            setChatState(senderNumber, 'IDLE');
        }
    } else if (['no', 'n'].includes(lower)) {
        await sock.sendMessage(senderNumber, {
            text: `✅ Tarea "${taskTitle}" creada sin asignar a trabajadores.`
        });
        setChatState(senderNumber, 'IDLE');
    } else {
        await sock.sendMessage(senderNumber, {
            text: '⚠️ Por favor respondé "sí" o "no".'
        });
    }
}

// Manejo de selección de workers
async function handleWorkerSelection(
    messageText: string,
    context: any,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    const { taskId, taskTitle, siteId, siteAddress, workers } = context;

    if (!workers || workers.length === 0) {
        await sock.sendMessage(senderNumber, { text: '❌ Error: No hay trabajadores disponibles.' });
        setChatState(senderNumber, 'IDLE');
        return;
    }

    // Parsear números (pueden venir como "1,3" o "1 3" o "1, 3")
    const input = messageText.trim();
    const numbers = input.split(/[,\s]+/).map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n > 0);

    if (numbers.length === 0) {
        await sock.sendMessage(senderNumber, {
            text: '⚠️ No reconocí los números. Respondé con los números separados por comas, ej: "1,3" o "1 3".'
        });
        return;
    }

    // Validar que los números estén en rango
    const validNumbers = numbers.filter(n => n >= 1 && n <= workers.length);
    if (validNumbers.length === 0) {
        await sock.sendMessage(senderNumber, {
            text: `⚠️ Los números deben estar entre 1 y ${workers.length}.`
        });
        return;
    }

    // Obtener los workers seleccionados (sin duplicados)
    const selectedWorkers = Array.from(new Set(validNumbers.map(n => workers[n - 1])));

    try {
        // Asignar la tarea a los workers
        const workerIds = selectedWorkers.map((w: any) => w.worker_id);
        await api.WorkerService.assignTaskToWorkers(taskId, workerIds);

        // Enviar mensajes por WhatsApp a cada worker
        const workerNames: string[] = [];
        for (const worker of selectedWorkers) {
            const workerName = `${worker.worker_name || ''} ${worker.worker_surname || ''}`.trim() || 'Trabajador';
            workerNames.push(workerName);

            // Normalizar número de teléfono para WhatsApp
            let phoneNumber = worker.worker_cellnumber || '';
            // Remover espacios, guiones y paréntesis
            phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
            // Remover el + si existe (los JIDs de WhatsApp no deben tener +)
            phoneNumber = phoneNumber.replace(/^\+/, '');
            // Si no empieza con 54, agregar código de país argentino
            if (!phoneNumber.startsWith('54')) {
                // Asumir que es un número argentino sin código de país
                phoneNumber = '54' + phoneNumber;
            }
            // Agregar @s.whatsapp.net (sin el +)
            const whatsappJid = phoneNumber + '@s.whatsapp.net';

            // Enviar mensaje al worker
            const message = `👷 *Nueva Tarea Asignada*\n\n📋 *${taskTitle}*\n🏷️ Obra: ${siteAddress || 'Sin obra'}\n\nSe te ha asignado una nueva tarea. Revisá los detalles en la app.`;
            
            try {
                if (globalSock) {
                    await safeSendMessage(globalSock, whatsappJid, message);
                    console.log(`✅ Notificación enviada a worker ${workerName} (${whatsappJid})`);
                } else {
                    console.error('❌ Socket de WhatsApp no disponible para enviar notificación');
                }
            } catch (error: any) {
                console.error(`❌ Error enviando notificación a worker ${workerName} (${whatsappJid}):`, error);
                // Continuar con los demás workers aunque falle uno
            }
        }

        const workersText = selectedWorkers.length === 1 
            ? `el trabajador ${workerNames[0]}`
            : `los trabajadores: ${workerNames.join(', ')}`;

        await sock.sendMessage(senderNumber, {
            text: `✅ Tarea "${taskTitle}" asignada a ${workersText}.\n\n📱 Se les envió una notificación por WhatsApp.`
        });

        setChatState(senderNumber, 'IDLE');
    } catch (error: any) {
        console.error('Error asignando tarea a workers:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al asignar la tarea: ${error?.message || 'Error desconocido'}`
        });
        setChatState(senderNumber, 'IDLE');
    }
}

// ====================
// Flujo de compras
// ====================

async function startPurchaseFlow(senderNumber: string, sock: WASocket, user: Profile) {
    try {
        const sites = await api.SiteService.getAdminSitesByUser(user.id);
        if (!sites || sites.length === 0) {
            await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras donde seas administrador. Solo podés crear compras en obras donde tenés rol de administrador.' });
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

// Manejo de selección de obra para compra desde audio (cuando ya tenemos los datos de la compra)
async function handlePurchaseSiteSelectionFromAudio(messageText: string, context: any, user: Profile, senderNumber: string, sock: WASocket) {
    const purchaseData = context?.purchaseData;
    const options: any[] = context?.sitesOptions || [];
    
    if (!options.length) {
        await sock.sendMessage(senderNumber, { text: '❌ No encontré opciones de obra. Escribí "compra" para empezar de nuevo.' });
        setChatState(senderNumber, 'IDLE');
        return;
    }
    
    if (!purchaseData) {
        await sock.sendMessage(senderNumber, { text: '❌ Error: No se encontró la información de la compra. Intentá de nuevo.' });
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
    
    // Crear la compra con los datos que ya tenemos
    const purchasePayload: any = {
        product: purchaseData.product,
        quantity: purchaseData.quantity || 1,
        category: purchaseData.category || 'otros',
        priority: purchaseData.priority || 'normal',
        status: 'pending',
        user_id: user.id,
        site_id: chosen.id
    };
    
    if (purchaseData.description) {
        purchasePayload.description = purchaseData.description;
    }
    if (purchaseData.price !== undefined && purchaseData.price !== null) {
        purchasePayload.price = purchaseData.price;
    }
    if (purchaseData.supplier) {
        purchasePayload.supplier = purchaseData.supplier;
    }
    
    try {
        const createdPurchase = await api.PurchaseService.createPurchase(purchasePayload);
        // Obtener el nombre de la obra
        let siteAddress = chosen.address || 'Sin obra';
        
        await safeSendMessage(sock, senderNumber, 
            `✅ Solicitud de compra creada:\n📦 Producto: ${createdPurchase.product}\n📊 Cantidad: ${createdPurchase.quantity}\n🏷️ Categoría: ${createdPurchase.category}\n🏷️ Obra: ${siteAddress}`
        );
        setChatState(senderNumber, 'IDLE');
    } catch (error: any) {
        console.error('Error creando compra:', error);
        await safeSendMessage(sock, senderNumber, `❌ Error al crear la compra: ${error?.message || 'Error desconocido'}`);
        setChatState(senderNumber, 'IDLE');
    }
}

async function handlePurchaseProduct(messageText: string, context: any, senderNumber: string, sock: WASocket) {
    const product = messageText.trim();
    if (!product) {
        await sock.sendMessage(senderNumber, { text: '⚠️ Por favor, escribí el nombre del producto.' });
        return;
    }
    setChatState(senderNumber, 'AWAITING_PURCHASE_CATEGORY', { ...context, product });
    // Categorías permitidas en la base de datos (enum purchase_category)
    const categories = [
        { display: 'Materiales', value: 'materiales' },
        { display: 'Herramientas', value: 'herramientas' },
        { display: 'Equipamiento', value: 'equipamiento' },
        { display: 'Seguridad', value: 'seguridad' },
        { display: 'Oficina', value: 'oficina' },
        { display: 'Otros', value: 'otros' }
    ];
    const lines: string[] = [];
    lines.push(`✅ Producto: ${product}\n`);
    lines.push('📂 ¿A qué categoría pertenece? (respondé con el número):');
    categories.forEach((cat, idx) => lines.push(`${idx + 1}) ${cat.display}`));
    await sock.sendMessage(senderNumber, { text: lines.join('\n') });
}

async function handlePurchaseCategory(messageText: string, context: any, senderNumber: string, sock: WASocket) {
    // Categorías permitidas en la base de datos (enum purchase_category)
    const categories = [
        { display: 'Materiales', value: 'materiales' },
        { display: 'Herramientas', value: 'herramientas' },
        { display: 'Equipamiento', value: 'equipamiento' },
        { display: 'Seguridad', value: 'seguridad' },
        { display: 'Oficina', value: 'oficina' },
        { display: 'Otros', value: 'otros' }
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
        await sock.sendMessage(senderNumber, { text: '⚠️ Categoría no válida. Respondé con el número de la lista (1-6).' });
        return;
    }
    const categoryDisplay = categories.find(c => c.value === category)?.display || category;
    setChatState(senderNumber, 'AWAITING_PURCHASE_PRIORITY', { ...context, category });
    
    const priorities = [
        { display: 'Baja', value: 'baja' },
        { display: 'Normal', value: 'normal' },
        { display: 'Alta', value: 'alta' },
        { display: 'Urgente', value: 'urgente' }
    ];
    const lines: string[] = [];
    lines.push(`✅ Categoría: ${categoryDisplay}\n`);
    lines.push('⚡ ¿Cuál es la prioridad? (respondé con el número):');
    priorities.forEach((pri, idx) => lines.push(`${idx + 1}) ${pri.display}`));
    await sock.sendMessage(senderNumber, { text: lines.join('\n') });
}

async function handlePurchasePriority(messageText: string, context: any, senderNumber: string, sock: WASocket) {
    const priorities = [
        { display: 'Baja', value: 'baja' },
        { display: 'Normal', value: 'normal' },
        { display: 'Alta', value: 'alta' },
        { display: 'Urgente', value: 'urgente' }
    ];
    let input = messageText.trim();
    let priority: string | null = null;
    const num = input.match(/^\d+/);
    if (num) {
        const idx = parseInt(num[0], 10) - 1;
        if (idx >= 0 && idx < priorities.length) {
            priority = priorities[idx].value;
        }
    }
    if (!priority) {
        // Buscar por nombre (case insensitive, sin acentos)
        const normalizedInput = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const matched = priorities.find(pri => {
            const normalizedDisplay = pri.display.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return normalizedDisplay.includes(normalizedInput) || pri.value === normalizedInput;
        });
        if (matched) priority = matched.value;
    }
    if (!priority) {
        await sock.sendMessage(senderNumber, { text: '⚠️ Prioridad no válida. Respondé con el número de la lista (1-4).' });
        return;
    }
    const priorityDisplay = priorities.find(p => p.value === priority)?.display || priority;
    setChatState(senderNumber, 'AWAITING_PURCHASE_QUANTITY', { ...context, priority });
    await sock.sendMessage(senderNumber, { text: `✅ Prioridad: ${priorityDisplay}\n\n🔢 ¿Cuántas unidades necesitás? (escribí solo el número)` });
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
        // Asegurar que la prioridad esté presente (si no está, usar 'normal' como valor por defecto)
        const priorityValue = context.priority && ['baja', 'normal', 'alta', 'urgente'].includes(context.priority) 
            ? context.priority 
            : 'normal';
        
        console.log(`[handlePurchaseCreation] Prioridad del contexto: ${context.priority}, prioridad final: ${priorityValue}`);
        
        const purchasePayload: any = {
            ...purchaseData,
            site_id: context.site_id,
            user_id: user.id,
            priority: priorityValue
        };

        console.log('Creando compra con payload:', JSON.stringify(purchasePayload, null, 2));
        const createdPurchase = await api.PurchaseService.createPurchase(purchasePayload);

        const priorityText = context.priority ? `⚡ Prioridad: ${context.priority.charAt(0).toUpperCase() + context.priority.slice(1)}` : '';
        const summary = [
            '✅ ¡Solicitud de compra creada con éxito!\n',
            `📦 Producto: ${createdPurchase.product}`,
            `📂 Categoría: ${createdPurchase.category}`,
            priorityText,
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
        lines.push(`🏷️ Tus obras`);
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
// Avances (updates) de las últimas dos semanas
// --------------------
async function sendAdvancesToday(jid: string, sock: WASocket, siteQuery?: string) {
    try {
        await sock.sendMessage(jid, { text: '📸 Buscando avances de las últimas 2 semanas…' });

        const user = await getVerifiedUser(jid);
        if (!user) {
            await sock.sendMessage(jid, { text: 'No pude identificar tu usuario. Registrá tu número en la app.' });
            return;
        }

        const now = new Date();
        // Calcular fecha de hace 2 semanas (14 días)
        const twoWeeksAgo = new Date(now);
        twoWeeksAgo.setDate(now.getDate() - 14);
        twoWeeksAgo.setHours(0, 0, 0, 0);
        
        const twoWeeksAgoUTC = new Date(Date.UTC(
            twoWeeksAgo.getUTCFullYear(),
            twoWeeksAgo.getUTCMonth(),
            twoWeeksAgo.getUTCDate(),
            0, 0, 0, 0
        ));
        
        const nowUTC = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            23, 59, 59, 999
        ));

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
            // Filtrar avances de las últimas 2 semanas
            const recent = upd.filter(u => {
                const d = new Date(u.created_at);
                return d >= twoWeeksAgoUTC && d <= nowUTC;
            });
            return { site: s, updates: recent };
        }));

        const all = updatesBySite.flatMap(u => u.updates.map(x => ({ ...x, site: u.site })));
        if (!all.length) {
            await sock.sendMessage(jid, { text: '😕 No hay avances en las últimas 2 semanas' });
            return;
        }

        // Ordenar por fecha (más recientes primero)
        all.sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
        });

        const header = `📸 Avances de las últimas 2 semanas` + (q ? ` — ${q}` : '');
        const lines: string[] = [header, ''];
        
        // Mostrar más avances (hasta 20 en el resumen, luego las imágenes)
        for (const u of all.slice(0, 20)) {
            const siteName = (u as any).site?.address || '';
            const t = (u.title || '').trim();
            const d = (u.description || '').trim();
            let body = '';
            if (t && d) {
                if (t.toLowerCase() === d.toLowerCase()) body = t;
                else body = `${t} — ${clip(d, 50)}`;
            } else if (t) body = t; else if (d) body = clip(d, 50); else body = '(sin título)';
            
            // Agregar fecha del avance
            const updateDate = new Date(u.created_at);
            const dateStr = updateDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            lines.push(`• ${body}${siteName ? ` · 🏷️ ${siteName}` : ''} · 📅 ${dateStr}`);
        }
        if (all.length > 20) lines.push(`… y ${all.length - 20} más`);
        await sock.sendMessage(jid, { text: lines.join('\n') });

        // Enviar las imágenes (máximo 10 para no saturar)
        for (const u of all.slice(0, 10)) {
            if (!u.image_url) continue;
            try {
                const t = (u.title || '').trim();
                const d = (u.description || '').trim();
                let caption = '';
                if (t && d) {
                    if (t.toLowerCase() === d.toLowerCase()) caption = t;
                    else caption = `${t} — ${clip(d, 100)}`;
                } else if (t) caption = t; else if (d) caption = clip(d, 100);
                
                // Agregar fecha al caption
                const updateDate = new Date(u.created_at);
                const dateStr = updateDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                caption = caption ? `${caption} · 📅 ${dateStr}` : `📅 ${dateStr}`;
                
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
        console.error('Error en avances:', err);
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

/**
 * Obtiene la explicación detallada de un comando específico o todas las explicaciones
 */
function getCommandExplanation(command: string | null, isAdmin: boolean): string {
    const commandLower = command?.toLowerCase().trim() || '';
    
    // Mapa de explicaciones para administradores
    const adminExplanations: Record<string, string> = {
        'tarea': '📋 *CREAR TAREA*\n\nEste comando inicia el proceso para crear una nueva tarea de mantenimiento. Te guiará paso a paso para ingresar:\n• Título de la tarea\n• Descripción\n• Categoría (Pintura, Construcción, Electricidad, Plomería)\n• Obra donde se realizará\n• Estado inicial\n\nEjemplo: Escribí "tarea" o "crear tarea" para comenzar.',
        'tareas': '📋 *VER TAREAS*\n\nMuestra todas las tareas de las obras donde tenés acceso. Podés filtrar por:\n• Obra específica: "tareas [nombre obra]"\n• Estado: "tareas bloqueadas", "tareas pendientes", "tareas completadas", "tareas en progreso"\n• Período: "tareas esta semana", "tareas esta mes"\n\nEjemplo: "tareas" o "tareas casa nueva"',
        'cambio': '🔄 *CREAR SOLICITUD DE CAMBIO*\n\nPermite crear una solicitud de cambio en una obra. Te pedirá:\n• Título del cambio\n• Descripción\n• Categoría\n• Obra donde se solicita\n\nEjemplo: "cambio" o "solicitar cambio"',
        'resumen': '🧾 *RESUMEN DEL DÍA*\n\nMuestra un resumen completo de todas las actividades del día actual:\n• Tareas creadas\n• Tareas completadas\n• Avances registrados\n• Cambios solicitados\n• Compras realizadas\n\nPodés filtrar por obra: "resumen [nombre obra]"\n\nEjemplo: "resumen" o "res casa nueva"',
        'agenda': '📅 *AGENDA DE HOY*\n\nMuestra todas las tareas programadas para el día de hoy, organizadas por obra. Incluye:\n• Tareas pendientes\n• Tareas en progreso\n• Tareas con fecha de vencimiento hoy\n\nPodés filtrar por obra: "agenda [nombre obra]"\n\nEjemplo: "agenda" o "agenda casa nueva"',
        'avances': '📸 *VER AVANCES*\n\nMuestra los avances (fotos y textos) registrados en las últimas 2 semanas. Podés filtrar por obra específica.\n\nEjemplo: "avances" o "avances casa nueva"',
        'av': '📝 *CREAR AVANCE DE TEXTO*\n\nPermite registrar un avance de texto en una obra. Podés especificar la obra o se usará la primera disponible.\n\nFormato: "av [texto]" o "av [obra]: [texto]"\n\nEjemplo: "av Hormigonado losa" o "av casa nueva: Terminado revoque"',
        'obras': '🏷️ *LISTA DE OBRAS*\n\nMuestra todas las obras donde tenés acceso, con información básica de cada una.',
        'comparar obras': '📊 *COMPARAR OBRAS*\n\nMuestra una comparativa de productividad entre todas tus obras, incluyendo:\n• Cantidad de tareas por estado\n• Avances registrados\n• Compras pendientes\n• Métricas de productividad',
        'compra': '🛒 *CREAR SOLICITUD DE COMPRA*\n\nInicia el proceso para crear una solicitud de compra. Te guiará para ingresar:\n• Descripción del producto/material\n• Cantidad\n• Prioridad (baja, media, alta, urgente)\n• Obra donde se necesita\n\nEjemplo: "compra" o "c"',
        'compras': '🛒 *VER COMPRAS*\n\nMuestra todas las compras pendientes. Podés filtrar:\n• "compras criticas" - Solo compras con prioridad alta o urgente\n• "compras pendientes" - Solo compras pendientes\n• "compras compradas" - Compras ya compradas\n• "compras entregadas" - Compras ya entregadas\n\nEjemplo: "compras" o "compras criticas"',
        'comprar': '✅ *MARCAR COMPRA COMO COMPRADA*\n\nMarca una compra como comprada usando su ID.\n\nFormato: "comprar [ID]"\n\nEjemplo: "comprar 123"',
        'entregar': '📦 *MARCAR COMPRA COMO ENTREGADA*\n\nMarca una compra como entregada usando su ID.\n\nFormato: "entregar [ID]"\n\nEjemplo: "entregar 123"',
        'pendiente': '⏳ *VOLVER COMPRA A PENDIENTE*\n\nVuelve una compra a estado pendiente usando su ID.\n\nFormato: "pendiente [ID]"\n\nEjemplo: "pendiente 123"',
        'clima': '🌤️ *PRONÓSTICO DEL TIEMPO*\n\nMuestra el pronóstico del tiempo para una obra específica. Incluye temperatura, condiciones y pronóstico extendido.\n\nFormato: "clima obra [nombre]" o "clima [nombre]"\n\nEjemplo: "clima obra casa nueva"',
        'cancelar': '❌ *CANCELAR OPERACIÓN*\n\nCancela cualquier operación en curso y vuelve al menú principal.\n\nEjemplo: "cancelar"'
    };

    // Mapa de explicaciones para clientes
    const clientExplanations: Record<string, string> = {
        'tareas': '📋 *VER TAREAS*\n\nMuestra todas las tareas de las obras donde tenés acceso. Podés filtrar por:\n• Estado: "tareas bloqueadas", "tareas esta semana"\n\nEjemplo: "tareas" o "tareas bloqueadas"',
        'cambio': '🔄 *CREAR SOLICITUD DE CAMBIO*\n\nPermite crear una solicitud de cambio en una obra. Te pedirá:\n• Título del cambio\n• Descripción\n• Categoría\n• Obra donde se solicita\n\nEjemplo: "cambio" o "solicitar cambio"',
        'compras': '🛒 *VER COMPRAS*\n\nMuestra todas las compras pendientes. Podés filtrar:\n• "compras criticas" - Solo compras con prioridad alta o urgente\n• "compras pendientes" - Solo compras pendientes\n• "compras compradas" - Compras ya compradas\n• "compras entregadas" - Compras ya entregadas\n\nEjemplo: "compras" o "compras criticas"',
        'comprar': '✅ *MARCAR COMPRA COMO COMPRADA*\n\nMarca una compra como comprada usando su ID.\n\nFormato: "comprar [ID]"\n\nEjemplo: "comprar 123"',
        'entregar': '📦 *MARCAR COMPRA COMO ENTREGADA*\n\nMarca una compra como entregada usando su ID.\n\nFormato: "entregar [ID]"\n\nEjemplo: "entregar 123"',
        'pendiente': '⏳ *VOLVER COMPRA A PENDIENTE*\n\nVuelve una compra a estado pendiente usando su ID.\n\nFormato: "pendiente [ID]"\n\nEjemplo: "pendiente 123"',
        'avances': '📸 *VER AVANCES*\n\nMuestra los avances (fotos y textos) registrados en las últimas 2 semanas. Podés filtrar por obra específica.\n\nEjemplo: "avances" o "avances casa nueva"',
        'resumen': '🧾 *RESUMEN DEL DÍA*\n\nMuestra un resumen completo de todas las actividades del día actual:\n• Tareas creadas\n• Tareas completadas\n• Avances registrados\n• Cambios solicitados\n• Compras realizadas\n\nPodés filtrar por obra: "resumen [nombre obra]"\n\nEjemplo: "resumen" o "res casa nueva"',
        'comparar obras': '📊 *COMPARAR OBRAS*\n\nMuestra una comparativa de productividad entre todas tus obras, incluyendo:\n• Cantidad de tareas por estado\n• Avances registrados\n• Compras pendientes\n• Métricas de productividad',
        'cancelar': '❌ *CANCELAR OPERACIÓN*\n\nCancela cualquier operación en curso y vuelve al menú principal.\n\nEjemplo: "cancelar"'
    };

    const explanations = isAdmin ? adminExplanations : clientExplanations;

    // Si no se especifica comando, devolver todas las explicaciones
    if (!command || commandLower === '') {
        const allExplanations: string[] = [];
        allExplanations.push(`📚 *EXPLICACIÓN DE TODOS LOS COMANDOS*\n\n`);
        
        // Agrupar por categorías
        if (isAdmin) {
            allExplanations.push('📋 *TAREAS:*\n');
            allExplanations.push(adminExplanations['tarea']);
            allExplanations.push('\n' + adminExplanations['tareas']);
            allExplanations.push('\n\n🔄 *CAMBIOS:*\n');
            allExplanations.push(adminExplanations['cambio']);
            allExplanations.push('\n\n🧾 *RESÚMENES:*\n');
            allExplanations.push(adminExplanations['resumen']);
            allExplanations.push('\n' + adminExplanations['agenda']);
            allExplanations.push('\n\n📸 *AVANCES:*\n');
            allExplanations.push(adminExplanations['avances']);
            allExplanations.push('\n' + adminExplanations['av']);
            allExplanations.push('\n\n🏷️ *OBRAS:*\n');
            allExplanations.push(adminExplanations['obras']);
            allExplanations.push('\n' + adminExplanations['comparar obras']);
            allExplanations.push('\n\n🛒 *COMPRAS:*\n');
            allExplanations.push(adminExplanations['compra']);
            allExplanations.push('\n' + adminExplanations['compras']);
            allExplanations.push('\n' + adminExplanations['comprar']);
            allExplanations.push('\n' + adminExplanations['entregar']);
            allExplanations.push('\n' + adminExplanations['pendiente']);
            allExplanations.push('\n\n🌤️ *CLIMA:*\n');
            allExplanations.push(adminExplanations['clima']);
            allExplanations.push('\n\n❌ *OTROS:*\n');
            allExplanations.push(adminExplanations['cancelar']);
        } else {
            allExplanations.push('📋 *TAREAS:*\n');
            allExplanations.push(clientExplanations['tareas']);
            allExplanations.push('\n\n🔄 *CAMBIOS:*\n');
            allExplanations.push(clientExplanations['cambio']);
            allExplanations.push('\n\n🛒 *COMPRAS:*\n');
            allExplanations.push(clientExplanations['compras']);
            allExplanations.push('\n' + clientExplanations['comprar']);
            allExplanations.push('\n' + clientExplanations['entregar']);
            allExplanations.push('\n' + clientExplanations['pendiente']);
            allExplanations.push('\n\n📸 *AVANCES:*\n');
            allExplanations.push(clientExplanations['avances']);
            allExplanations.push('\n\n🧾 *RESÚMENES:*\n');
            allExplanations.push(clientExplanations['resumen']);
            allExplanations.push('\n\n🏷️ *OBRAS:*\n');
            allExplanations.push(clientExplanations['comparar obras']);
            allExplanations.push('\n\n❌ *OTROS:*\n');
            allExplanations.push(clientExplanations['cancelar']);
        }
        
        return allExplanations.join('\n');
    }

    // Buscar el comando específico
    // Normalizar variaciones comunes
    const normalizedCommand = commandLower
        .replace(/^que\s+hace\s+/, '') // Remover "que hace" si está presente
        .replace(/^qué\s+hace\s+/, '')
        .trim();

    // Mapeo de variaciones a comandos base
    const commandMap: Record<string, string> = {
        'tarea': 'tarea',
        'crear tarea': 'tarea',
        't': 'tarea',
        'tareas': 'tareas',
        'cambio': 'cambio',
        'cambios': 'cambio',
        'solicitar cambio': 'cambio',
        'resumen': 'resumen',
        'res': 'resumen',
        'agenda': 'agenda',
        'hoy': 'agenda',
        'avances': 'avances',
        'avance': 'avances',
        'av': 'av',
        'obras': 'obras',
        'obra': 'obras',
        'comparar': 'comparar obras',
        'comparar obras': 'comparar obras',
        'compra': 'compra',
        'comprar': 'comprar',
        'c': 'compra',
        'compras': 'compras',
        'entregar': 'entregar',
        'pendiente': 'pendiente',
        'clima': 'clima',
        'clima obra': 'clima',
        'cancelar': 'cancelar'
    };

    const baseCommand = commandMap[normalizedCommand] || normalizedCommand;
    const explanation = explanations[baseCommand];

    if (explanation) {
        return explanation;
    }

    // Si no se encuentra, devolver mensaje de ayuda
    return `❓ No encontré una explicación para el comando "${command}".\n\nEscribí "qué hace" para ver todos los comandos disponibles.`;
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

/**
 * Verifica si el usuario tiene al menos una obra como administrador
 * Retorna true si es admin, false si es solo cliente
 */
async function isUserAdmin(userId: string): Promise<boolean> {
    try {
        console.log(`[isUserAdmin] Verificando si usuario ${userId} es admin...`);
        const adminSites = await api.SiteService.getAdminSitesByUser(userId);
        const isAdmin = adminSites && adminSites.length > 0;
        console.log(`[isUserAdmin] Usuario ${userId} es admin: ${isAdmin} (${adminSites?.length || 0} sitios como admin)`);
        if (adminSites && adminSites.length > 0) {
            console.log(`[isUserAdmin] Sitios donde es admin:`, adminSites.map((s: any) => `${s.address} (${s.id})`).join(', '));
        }
        return isAdmin;
    } catch (error) {
        console.error('[isUserAdmin] Error verificando si usuario es admin:', error);
        return false;
    }
}

async function handleTaskCreation(task: CreateTaskDTO, senderNumber: string, sock: WASocket, user?: Profile | null) {
    try {
        const taskWithSite = task as CreateTaskDTO & { site_id?: string; site_address?: string };
        
        // Si no tiene site_id, preguntar primero por la obra
        if (!taskWithSite.site_id) {
            if (!user) {
                const fetchedUser = await getVerifiedUser(senderNumber);
                if (!fetchedUser) {
                    await sock.sendMessage(senderNumber, { text: '❌ No se pudo identificar tu usuario.' });
                    return;
                }
                user = fetchedUser;
            }
            
            const sites = await api.SiteService.getAdminSitesByUser(user.id);
            if (!sites || sites.length === 0) {
                await sock.sendMessage(senderNumber, { text: '⚠️ No encontré obras donde seas administrador. Solo podés crear tareas en obras donde tenés rol de administrador.' });
                return;
            }
            
            if (sites.length === 1) {
                // Si hay una sola obra, usarla automáticamente
                taskWithSite.site_id = (sites[0] as any).id;
                taskWithSite.site_address = (sites[0] as any).address;
            } else {
                // Si hay múltiples obras, pedir que seleccione
                setChatState(senderNumber, 'AWAITING_TASK_SITE_SELECTION', { taskData: task });
                const lines: string[] = [];
                lines.push('🏷️ ¿Para qué obra es esta tarea? (respondé con el número):');
                sites.slice(0, 20).forEach((s: any, idx: number) => lines.push(`${idx + 1}) ${s.address}`));
                await sock.sendMessage(senderNumber, { text: lines.join('\n') });
                return;
            }
        }

        console.log(task);
        // Llamada al service
        const createdTask = await api.TaskService.createTask(taskWithSite);

        await sock.sendMessage(senderNumber, {
            text: `✅ Tarea creada con éxito:\n📋 Título: ${createdTask.title}\n🏷️ Obra: ${taskWithSite.site_address || 'Sin obra'}`
        });

        // Preguntar si quiere asignarla a workers
        if (!user) {
            const fetchedUser = await getVerifiedUser(senderNumber);
            if (fetchedUser) {
                user = fetchedUser;
            }
        }
        if (user) {
            setChatState(senderNumber, 'AWAITING_WORKER_ASSIGNMENT_CONFIRMATION', { 
                taskId: createdTask.id, 
                taskTitle: createdTask.title,
                siteId: taskWithSite.site_id,
                siteAddress: taskWithSite.site_address
            });
            await sock.sendMessage(senderNumber, {
                text: '👷 ¿Querés asignarla a algún trabajador? (respondé "sí" o "no")'
            });
        } else {
            setChatState(senderNumber, 'IDLE');
        }

    } catch (error: any) {
        console.error('Error al procesar el mensaje:', error.message);
        // Enviamos el mensaje de error al usuario para que sepa qué salió mal
        await sock.sendMessage(senderNumber, { text: `❌ Error: ${error.message}` });
        setChatState(senderNumber, 'IDLE');
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
// Función auxiliar para normalizar texto (sin tildes, case-insensitive)
// --------------------
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar tildes
        .trim();
}

// --------------------
// Actualizar estado de tareas por comando unificado: [número/título] [pendiente/bloqueada/completada/en progreso]
// --------------------
async function handleTaskStatusUpdateCommand(
    messageText: string,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        const lower = messageText.trim().toLowerCase();
        
        // Detectar el estado deseado al final del mensaje
        let targetStatus: Task['status'] | null = null;
        let statusKeyword = '';
        
        // Mapeo de estados en español a estados en inglés
        if (lower.endsWith(' bloqueada') || lower.endsWith(' bloqueado')) {
            targetStatus = 'blocked';
            statusKeyword = lower.endsWith(' bloqueada') ? ' bloqueada' : ' bloqueado';
        } else if (lower.endsWith(' completada') || lower.endsWith(' completado')) {
            targetStatus = 'completed';
            statusKeyword = lower.endsWith(' completada') ? ' completada' : ' completado';
        } else if (lower.endsWith(' en progreso') || lower.endsWith(' progreso')) {
            targetStatus = 'in_progress';
            statusKeyword = lower.endsWith(' en progreso') ? ' en progreso' : ' progreso';
        } else if (lower.endsWith(' pendiente')) {
            targetStatus = 'pending';
            statusKeyword = ' pendiente';
        }

        if (!targetStatus) {
            await sock.sendMessage(senderNumber, {
                text: '⚠️ Comando no reconocido. Usa:\n• "[número/título] pendiente"\n• "[número/título] bloqueada"\n• "[número/título] completada"\n• "[número/título] en progreso"'
            });
            return;
        }

        // Extraer el identificador (número o texto antes del estado)
        const taskIdentifier = messageText
            .replace(new RegExp(`${statusKeyword}$`, 'i'), '')
            .trim();

        // Si no hay identificador, listar tareas para seleccionar
        if (!taskIdentifier) {
            await listTasksForStatusUpdate(user, senderNumber, sock, targetStatus);
            return;
        }

        // Buscar la tarea por ID o título (con manejo de múltiples coincidencias)
        const result = await findTaskByIdentifier(taskIdentifier, user.id);
        
        if (!result) {
            await sock.sendMessage(senderNumber, {
                text: `❌ No encontré una tarea con "${taskIdentifier}".\n\nUsa el número de la lista o el título completo.`
            });
            return;
        }

        // Si hay múltiples coincidencias, mostrar lista y esperar selección
        if (Array.isArray(result)) {
            const state = getChatState(senderNumber);
            setChatState(senderNumber, 'AWAITING_TASK_SELECTION_FOR_STATUS', {
                tasks: result,
                targetStatus: targetStatus
            });
            
            const lines: string[] = [];
            lines.push(`🔍 Encontré ${result.length} tareas que coinciden con "${taskIdentifier}":`);
            lines.push('');
            result.forEach((item, index) => {
                const icon = categoryIcon(item.task.category);
                const status = statusBadge(String(item.task.status));
                lines.push(`${index + 1}) ${icon} *${item.task.title}*`);
                lines.push(`   Estado: ${status} | Obra: ${item.site?.address || 'Sin obra'}`);
            });
            lines.push('');
            lines.push('📝 Respondé con el número de la lista o el título completo.');
            
            await sock.sendMessage(senderNumber, { text: lines.join('\n') });
            return;
        }

        // Una sola coincidencia encontrada
        const task = result;

        // Validar que el usuario sea admin de la obra a la que pertenece la tarea
        if (task.site_id) {
            const isAdmin = await api.SiteService.validateUserIsAdmin(user.id, task.site_id);
            if (!isAdmin) {
                await sock.sendMessage(senderNumber, {
                    text: `⚠️ No podés cambiar el estado de esta tarea. Solo los administradores pueden modificar tareas.`
                });
                return;
            }
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

        // Si la tarea se bloqueó, verificar dependencias
        // La notificación a admins se manejará desde el servidor para evitar duplicación
        if (targetStatus === 'blocked') {
            await checkAndNotifyTaskDependencies(task.id, task.title, user, sock);
            // No notificar aquí - el servidor detectará el cambio y notificará
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
        // Obtener solo las obras donde el usuario es admin
        const sites = await api.SiteService.getAdminSitesByUser(user.id);
        if (!sites || sites.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '⚠️ No encontré obras donde seas administrador. Solo podés cambiar el estado de tareas en obras donde tenés rol de administrador.'
            });
            return;
        }

        // Obtener tareas de todas las obras (solo admin) que NO estén en el estado objetivo
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

        // Si no se encontró por número, buscar por título (normalizado, case-insensitive, sin tildes)
        if (!selectedTask) {
            const normalizedInput = normalizeText(input);
            const taskByTitle = tasks.find(({ task }: any) => {
                const normalizedTitle = normalizeText(task.title || '');
                return normalizedTitle.includes(normalizedInput) || 
                       normalizedInput.includes(normalizedTitle);
            });
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

        // Validar que el usuario sea admin de la obra a la que pertenece la tarea
        const taskItem = tasks.find(({ task }: any) => task.id === selectedTask.id);
        if (taskItem && taskItem.site?.id) {
            const isAdmin = await api.SiteService.validateUserIsAdmin(user.id, taskItem.site.id);
            if (!isAdmin) {
                await sock.sendMessage(senderNumber, {
                    text: `⚠️ No podés cambiar el estado de esta tarea. Solo los administradores pueden modificar tareas.`
                });
                setChatState(senderNumber, 'IDLE');
                return;
            }
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

        // Si la tarea se bloqueó, verificar dependencias
        // La notificación a admins se manejará desde el servidor para evitar duplicación
        if (targetStatus === 'blocked') {
            await checkAndNotifyTaskDependencies(selectedTask.id, selectedTask.title, user, sock);
            // No notificar aquí - el servidor detectará el cambio y notificará
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

// --------------------
// Comando "tareas <obra>" para listar todas las tareas
// --------------------
async function handleListTasksCommand(
    obraName: string,
    user: Profile,
    senderNumber: string,
    sock: WASocket
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

        let targetSites = sites;
        
        // Si se especificó una obra, filtrar
        if (obraName) {
            const normalizedObraName = normalizeText(obraName);
            targetSites = sites.filter((site: any) => 
                normalizeText(site.address || '').includes(normalizedObraName) ||
                normalizedObraName.includes(normalizeText(site.address || ''))
            );
            
            if (targetSites.length === 0) {
                await sock.sendMessage(senderNumber, {
                    text: `❌ No encontré una obra que coincida con "${obraName}".\n\nObras disponibles:\n${sites.slice(0, 10).map((s: any, idx: number) => `${idx + 1}) ${s.address}`).join('\n')}`
                });
                return;
            }
        }

        // Obtener todas las tareas de las obras seleccionadas
        const allTasks: Array<{ task: any; site: any }> = [];
        
        for (const site of targetSites) {
            try {
                const tasks = await api.TaskService.getTasksBySite(site.id);
                tasks.forEach((task: any) => {
                    allTasks.push({ task, site });
                });
            } catch (error) {
                console.error(`Error obteniendo tareas para obra ${site.id}:`, error);
            }
        }

        if (allTasks.length === 0) {
            const obraText = obraName ? ` de "${obraName}"` : '';
            await sock.sendMessage(senderNumber, {
                text: `📋 No hay tareas${obraText}.`
            });
            return;
        }

        // Ordenar por fecha de creación (más recientes primero)
        allTasks.sort((a, b) => {
            const dateA = new Date(a.task.created_at || 0).getTime();
            const dateB = new Date(b.task.created_at || 0).getTime();
            return dateB - dateA;
        });

        // Limitar a las primeras 50 tareas
        const tasksToShow = allTasks.slice(0, 50);
        
        const lines: string[] = [];
        if (obraName) {
            lines.push(`📋 *Tareas de "${targetSites[0]?.address || obraName}":*`);
        } else {
            lines.push(`📋 *Todas las tareas (${allTasks.length}):*`);
        }
        lines.push('');

        // Agrupar por obra si no se especificó una
        if (!obraName && targetSites.length > 1) {
            const tasksBySite = new Map<string, Array<{ task: any; site: any }>>();
            tasksToShow.forEach(({ task, site }) => {
                const siteId = site.id;
                if (!tasksBySite.has(siteId)) {
                    tasksBySite.set(siteId, []);
                }
                tasksBySite.get(siteId)!.push({ task, site });
            });

            for (const [siteId, siteTasks] of tasksBySite) {
                const site = siteTasks[0].site;
                lines.push(`🏷️ *${site.address || 'Sin nombre'}* (${siteTasks.length} tareas):`);
                lines.push('');
                
                siteTasks.forEach(({ task }) => {
                    const icon = categoryIcon(task.category);
                    const status = statusBadge(String(task.status));
                    lines.push(`   ${icon} *${task.title}*`);
                    lines.push(`   Estado: ${status}`);
                    lines.push('');
                });
            }
        } else {
            // Mostrar todas las tareas en una lista simple
            tasksToShow.forEach(({ task, site }, index) => {
                const num = index + 1;
                const icon = categoryIcon(task.category);
                const status = statusBadge(String(task.status));
                
                lines.push(`${num}. ${icon} *${task.title}*`);
                lines.push(`   Estado: ${status}`);
                if (task.description) {
                    const desc = task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description;
                    lines.push(`   ${desc}`);
                }
                lines.push('');
            });
        }

        if (allTasks.length > 50) {
            lines.push(`... y ${allTasks.length - 50} tareas más`);
            lines.push('');
        }

        await sock.sendMessage(senderNumber, { text: lines.join('\n') });

    } catch (error: any) {
        console.error('Error en handleListTasksCommand:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al listar tareas: ${error?.message || 'Error desconocido'}`
        });
    }
}

/**
 * Busca tareas por identificador (número o título)
 * Retorna:
 * - Una tarea si hay una única coincidencia
 * - Un array de tareas si hay múltiples coincidencias
 * - null si no hay coincidencias
 */
async function findTaskByIdentifier(
    identifier: string, 
    userId: string
): Promise<any | Array<{ task: any; site: any }> | null> {
    try {
        // Obtener solo las obras donde el usuario es admin
        const sites = await api.SiteService.getAdminSitesByUser(userId);
        if (!sites || sites.length === 0) {
            return null;
        }

        const normalizedIdentifier = normalizeText(identifier);
        const allMatches: Array<{ task: any; site: any }> = [];

        // Buscar en todas las obras
        for (const site of sites) {
            try {
                const tasks = await api.TaskService.getTasksBySite(site.id);
                
                for (const task of tasks) {
                    // Si el identificador es un número, buscar por ID completo o parcial
                    const numMatch = identifier.match(/^\d+$/);
                    if (numMatch) {
                        if (task.id === identifier || task.id.startsWith(identifier)) {
                            allMatches.push({ task, site });
                            continue;
                        }
                    }
                    
                    // Buscar por título (normalizado, case-insensitive, sin tildes, coincidencia parcial)
                    const normalizedTitle = normalizeText(task.title || '');
                    if (normalizedTitle.includes(normalizedIdentifier) || 
                        normalizedIdentifier.includes(normalizedTitle)) {
                        allMatches.push({ task, site });
                    }
                }
            } catch (error) {
                console.error(`Error buscando tarea en obra ${site.id}:`, error);
            }
        }
        
        // Si no hay coincidencias
        if (allMatches.length === 0) {
            return null;
        }
        
        // Si hay una única coincidencia, retornarla directamente
        if (allMatches.length === 1) {
            return allMatches[0].task;
        }
        
        // Si hay múltiples coincidencias, retornar el array para que el usuario seleccione
        return allMatches;
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
        let filterType: 'status' | 'date' | null = null;
        let filterValue: string = '';
        
        if (lower.startsWith('tareas bloqueadas')) {
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
                text: '⚠️ Comando no reconocido. Usa:\n• "tareas bloqueadas"\n• "tareas esta semana"'
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

        if (filterType === 'status') {
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
    if (filterType === 'status') {
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
            lines.push('Ejemplo: "clima 1" o "clima [nombre]"');

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
            // Si no se encontró la obra, mostrar la lista de obras disponibles
            const lines: string[] = [];
            lines.push(`🌤️ *Clima por Obra*`);
            lines.push('');
            lines.push(`⚠️ No encontré la obra "${obraName}".`);
            lines.push('');
            lines.push('Escribí el nombre de la obra o el número:');
            lines.push('');
            sites.slice(0, 10).forEach((site: any, index: number) => {
                lines.push(`${index + 1}. ${site.address || 'Sin nombre'}`);
            });
            lines.push('');
            lines.push('Ejemplo: "clima 1" o "clima [nombre]"');

            await sock.sendMessage(senderNumber, { text: lines.join('\n') });
            setChatState(senderNumber, 'AWAITING_WEATHER_SITE_SELECTION', { sites });
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
        
        console.log(`[handlePurchaseTrackingCommand] Usuario ${user.name} (${user.id}) consultando compras con comando: "${messageText}"`);
        
        // Obtener todas las obras del usuario (tanto como admin como cliente)
        const userSites = await api.SiteService.getSitesByUser(user.id);
        console.log(`[handlePurchaseTrackingCommand] Obras encontradas para usuario ${user.id}: ${userSites?.length || 0}`);
        if (userSites && userSites.length > 0) {
            console.log(`[handlePurchaseTrackingCommand] Obras:`, userSites.map((s: any) => `${s.address} (${s.id})`).join(', '));
        }
        
        if (!userSites || userSites.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '😕 No tenés obras asignadas.'
            });
            return;
        }

        // Obtener compras de todas las obras del usuario
        const allPurchases: any[] = [];
        for (const site of userSites) {
            try {
                console.log(`[handlePurchaseTrackingCommand] Obteniendo compras de obra ${site.address} (${site.id})`);
                const sitePurchases = await api.PurchaseService.getPurchasesBySite(site.id);
                console.log(`[handlePurchaseTrackingCommand] Compras encontradas en obra ${site.address}: ${sitePurchases?.length || 0}`);
                if (sitePurchases && sitePurchases.length > 0) {
                    allPurchases.push(...sitePurchases);
                }
            } catch (error: any) {
                console.error(`[handlePurchaseTrackingCommand] Error obteniendo compras de obra ${site.id}:`, error?.message || error);
            }
        }
        
        console.log(`[handlePurchaseTrackingCommand] Total de compras obtenidas: ${allPurchases.length}`);
        
        // Eliminar duplicados si hay
        const uniquePurchases = Array.from(
            new Map(allPurchases.map(p => [p.id, p])).values()
        );
        
        if (!uniquePurchases || uniquePurchases.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '😕 No encontré compras en tus obras.'
            });
            return;
        }

        let filteredPurchases = uniquePurchases;

        // Aplicar filtros
        if (lower.startsWith('compras pendientes')) {
            filteredPurchases = uniquePurchases.filter((p: any) => p.status === 'pending');
        } else if (lower.startsWith('compras compradas')) {
            filteredPurchases = uniquePurchases.filter((p: any) => p.status === 'purchased');
        } else if (lower.startsWith('compras entregadas')) {
            filteredPurchases = uniquePurchases.filter((p: any) => p.status === 'delivered');
        } else if (lower.startsWith('compras criticas')) {
            // Filtrar compras con prioridad alta o urgente que estén pendientes
            filteredPurchases = uniquePurchases.filter((p: any) => {
                return (p.priority === 'alta' || p.priority === 'urgente') && p.status === 'pending';
            });
        } else if (lower === 'compras') {
            // Si solo dice "compras", mostrar solo pendientes
            filteredPurchases = uniquePurchases.filter((p: any) => p.status === 'pending');
        }

        console.log(`[handlePurchaseTrackingCommand] Compras después del filtro: ${filteredPurchases.length}`);

        if (filteredPurchases.length === 0) {
            const filterDesc = getPurchaseFilterDescription(lower);
            await sock.sendMessage(senderNumber, {
                text: `😕 No encontré compras ${filterDesc}.`
            });
            return;
        }

        // Mostrar resultados (permitir edición para todos)
        await displayPurchases(filteredPurchases, senderNumber, sock, user, true);

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

        // Verificar que la compra pertenezca a una obra del usuario
        const userSites = await api.SiteService.getSitesByUser(user.id);
        const hasAccess = purchase.user_id === user.id || 
            (userSites && userSites.some((s: any) => s.id === purchase.site_id));
        
        if (!hasAccess) {
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
    sock: WASocket,
    user?: Profile,
    allowEdit?: boolean
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
            const siteName = purchase.site?.address || 'Sin obra';
            
            lines.push(`${num}. 📦 *${purchase.product}*`);
            lines.push(`   Estado: ${status}`);
            lines.push(`   Cantidad: ${purchase.quantity}`);
            if (purchase.price) {
                lines.push(`   Precio: $${purchase.price} (Total: $${(purchase.price * purchase.quantity).toFixed(2)})`);
            }
            lines.push(`   Obra: ${siteName}`);
            lines.push(`   Fecha: ${date}`);
            lines.push('');
        });

        if (purchases.length > 20) {
            lines.push(`... y ${purchases.length - 20} compras más`);
            lines.push('');
        }

        if (allowEdit) {
            lines.push('💡 Para cambiar el estado de una compra, escribí:');
            lines.push('   *comprar [ID]* - Marcar como comprada');
            lines.push('   *entregar [ID]* - Marcar como entregada');
        }

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
    } else if (command.includes('criticas')) {
        return 'críticas';
    }
    return '';
}

async function handlePurchaseStatusChange(
    messageText: string,
    user: Profile,
    senderNumber: string,
    sock: WASocket
) {
    try {
        const lower = messageText.trim().toLowerCase();
        
        // Determinar el nuevo estado y extraer el ID
        let newStatus: 'pending' | 'purchased' | 'delivered' | null = null;
        let purchaseId = '';
        
        if (lower.startsWith('comprar ')) {
            newStatus = 'purchased';
            purchaseId = messageText.trim().slice(8).trim();
        } else if (lower.startsWith('entregar ')) {
            newStatus = 'delivered';
            purchaseId = messageText.trim().slice(9).trim();
        } else if (lower.startsWith('pendiente ')) {
            newStatus = 'pending';
            purchaseId = messageText.trim().slice(10).trim();
        }
        
        if (!newStatus || !purchaseId) {
            await sock.sendMessage(senderNumber, {
                text: '⚠️ Formato incorrecto. Usá: *comprar [ID]*, *entregar [ID]* o *pendiente [ID]*'
            });
            return;
        }
        
        // Obtener todas las obras del usuario para verificar permisos
        const userSites = await api.SiteService.getSitesByUser(user.id);
        if (!userSites || userSites.length === 0) {
            await sock.sendMessage(senderNumber, {
                text: '😕 No tenés obras asignadas.'
            });
            return;
        }
        
        // Buscar la compra en todas las obras del usuario
        let purchase: any = null;
        for (const site of userSites) {
            try {
                const sitePurchases = await api.PurchaseService.getPurchasesBySite(site.id);
                purchase = sitePurchases.find((p: any) => 
                    p.id === purchaseId || p.id.startsWith(purchaseId) || p.id.includes(purchaseId)
                );
                if (purchase) break;
            } catch (error) {
                console.error(`Error obteniendo compras de obra ${site.id}:`, error);
            }
        }
        
        if (!purchase) {
            await sock.sendMessage(senderNumber, {
                text: `❌ No encontré una compra con ID "${purchaseId}" en tus obras.`
            });
            return;
        }
        
        // Actualizar el estado
        await api.PurchaseService.updatePurchaseStatus(purchase.id, newStatus);
        
        const statusText = getPurchaseStatusText(newStatus);
        await sock.sendMessage(senderNumber, {
            text: `✅ Estado actualizado: ${purchase.product} ahora está ${statusText}`
        });
        
        // Notificar a los admins de la obra cuando el estado cambia a "purchased" o "delivered"
        // (similar a como se hace con tareas bloqueadas y cambios)
        if (purchase.site_id && (newStatus === 'purchased' || newStatus === 'delivered')) {
            console.log(`[handlePurchaseStatusChange] Notificando a administradores de la obra ${purchase.site_id} sobre el cambio de estado de compra por ${user.name}`);
            await notifyAdminsOfPurchaseStatusChange(purchase.site_id, purchase, newStatus, user, purchase.site?.address);
        }
        
    } catch (error: any) {
        console.error('Error en handlePurchaseStatusChange:', error);
        await sock.sendMessage(senderNumber, {
            text: `❌ Error al cambiar el estado: ${error?.message || 'Error desconocido'}`
        });
    }
}

/**
 * Notifica a los administradores de una obra cuando un cliente crea una solicitud de cambio
 */
async function notifyAdminsOfChange(
    siteId: string,
    change: Task,
    client: Profile,
    siteAddress?: string
) {
    if (!globalSock) {
        console.error('[notifyAdminsOfChange] Socket de WhatsApp no está disponible para enviar notificación');
        return;
    }

    try {
        console.log(`[notifyAdminsOfChange] Iniciando notificación para obra ${siteId}, cambio: ${change.title}`);
        // Obtener los administradores de la obra
        const admins = await api.SiteService.getSiteAdmins(siteId);
        
        console.log(`[notifyAdminsOfChange] Administradores encontrados: ${admins?.length || 0}`);
        if (!admins || admins.length === 0) {
            console.log(`[notifyAdminsOfChange] No se encontraron administradores para la obra ${siteId}`);
            return;
        }
        
        // Log de cada admin encontrado
        admins.forEach((admin: any, index: number) => {
            console.log(`[notifyAdminsOfChange] Admin ${index + 1}: ${admin.name} (${admin.id}) - WhatsApp: ${admin.whatsapp_jid || 'NO CONFIGURADO'}`);
        });

        const siteName = siteAddress || 'Obra no especificada';
        const categoryIcon = change.category === 'pintura' ? '🎨' : 
                           change.category === 'construccion' ? '🏗️' :
                           change.category === 'electricidad' ? '⚡' :
                           change.category === 'plomeria' ? '🚰' : '🧩';

        const message = `🔄 *Nueva Solicitud de Cambio*\n\n` +
                       `👤 *Cliente:* ${client.name}\n` +
                       `🏷️ *Obra:* ${siteName}\n\n` +
                       `${categoryIcon} *${change.title}*\n` +
                       (change.description ? `📝 ${change.description}\n` : '') +
                       `\n💡 Revisá la solicitud en la app.`;

        // Enviar notificación a cada administrador
        for (const admin of admins) {
            // No notificar al mismo usuario si es administrador y creó el cambio
            if (admin.id === client.id) {
                continue;
            }
            
            if (admin.whatsapp_jid) {
                try {
                    // Normalizar el JID: convertir @lid a @s.whatsapp.net si es necesario
                    let normalizedJid = admin.whatsapp_jid;
                    if (normalizedJid.endsWith('@lid')) {
                        normalizedJid = normalizedJid.replace('@lid', '@s.whatsapp.net');
                    } else if (!normalizedJid.includes('@')) {
                        normalizedJid = normalizedJid + '@s.whatsapp.net';
                    }
                    
                    console.log(`[notifyAdminsOfChange] Intentando enviar notificación a ${admin.name} (JID original: ${admin.whatsapp_jid}, normalizado: ${normalizedJid})`);
                    const sent = await safeSendMessage(globalSock, normalizedJid, message);
                    if (sent) {
                        console.log(`✅ Notificación de cambio enviada a admin ${admin.name} (${normalizedJid})`);
                    } else {
                        console.error(`❌ No se pudo enviar notificación a admin ${admin.name} (${normalizedJid})`);
                    }
                } catch (error: any) {
                    console.error(`❌ Error enviando notificación a admin ${admin.name} (${admin.whatsapp_jid}):`, error);
                    // Continuar con los demás admins aunque falle uno
                }
            } else {
                console.log(`[notifyAdminsOfChange] Admin ${admin.name} no tiene WhatsApp configurado, saltando notificación`);
            }
        }
    } catch (error: any) {
        console.error('Error notificando a administradores del cambio:', error);
        // No lanzar el error para no interrumpir el flujo principal
    }
}

/**
 * Notifica a los administradores de una obra cuando un cliente cambia el estado de una compra
 */
async function notifyAdminsOfPurchaseStatusChange(
    siteId: string,
    purchase: any,
    newStatus: 'pending' | 'purchased' | 'delivered',
    client: Profile,
    siteAddress?: string
) {
    if (!globalSock) {
        console.error('Socket de WhatsApp no está disponible para enviar notificación');
        return;
    }

    try {
        // Obtener los administradores de la obra
        const admins = await api.SiteService.getSiteAdmins(siteId);
        
        if (!admins || admins.length === 0) {
            console.log(`No se encontraron administradores para la obra ${siteId}`);
            return;
        }

        const siteName = siteAddress || purchase.site?.address || 'Obra no especificada';
        const statusText = getPurchaseStatusText(newStatus);

        const message = `🛒 *Estado de Compra Actualizado*\n\n` +
                       `👤 *Cliente:* ${client.name}\n` +
                       `🏷️ *Obra:* ${siteName}\n\n` +
                       `📦 *${purchase.product}*\n` +
                       `📊 *Nuevo Estado:* ${statusText}\n` +
                       `🔢 *Cantidad:* ${purchase.quantity}\n` +
                       `\n💡 El cliente actualizó el estado de esta compra.`;

        // Enviar notificación a cada administrador
        for (const admin of admins) {
            // No notificar al mismo usuario si es administrador y cambió el estado
            if (admin.id === client.id) {
                continue;
            }
            
            if (admin.whatsapp_jid) {
                try {
                    // Normalizar el JID: convertir @lid a @s.whatsapp.net si es necesario
                    let normalizedJid = admin.whatsapp_jid;
                    if (normalizedJid.endsWith('@lid')) {
                        normalizedJid = normalizedJid.replace('@lid', '@s.whatsapp.net');
                    } else if (!normalizedJid.includes('@')) {
                        normalizedJid = normalizedJid + '@s.whatsapp.net';
                    }
                    
                    const sent = await safeSendMessage(globalSock, normalizedJid, message);
                    if (sent) {
                        console.log(`✅ Notificación de cambio de compra enviada a admin ${admin.name} (${normalizedJid})`);
                    } else {
                        console.error(`❌ No se pudo enviar notificación de compra a admin ${admin.name} (${normalizedJid})`);
                    }
                } catch (error: any) {
                    console.error(`❌ Error enviando notificación a admin ${admin.name}:`, error);
                    // Continuar con los demás admins aunque falle uno
                }
            }
        }
    } catch (error: any) {
        console.error('Error notificando a administradores del cambio de compra:', error);
        // No lanzar el error para no interrumpir el flujo principal
    }
}

/**
 * Notifica a los administradores de una obra cuando una tarea se bloquea
 */
async function notifyAdminsOfBlockedTask(
    siteId: string,
    task: Task,
    blocker: Profile,
    siteAddress?: string
) {
    if (!globalSock) {
        console.error('Socket de WhatsApp no está disponible para enviar notificación');
        return;
    }

    try {
        // Obtener los administradores de la obra
        const admins = await api.SiteService.getSiteAdmins(siteId);
        
        if (!admins || admins.length === 0) {
            console.log(`No se encontraron administradores para la obra ${siteId}`);
            return;
        }

        const siteName = siteAddress || 'Obra no especificada';
        const categoryIcon = task.category === 'pintura' ? '🎨' : 
                           task.category === 'construccion' ? '🏗️' :
                           task.category === 'electricidad' ? '⚡' :
                           task.category === 'plomeria' ? '🚰' : '🧩';

        const message = `⛔ *Tarea Bloqueada*\n\n` +
                       `👤 *Bloqueada por:* ${blocker.name}\n` +
                       `🏷️ *Obra:* ${siteName}\n\n` +
                       `${categoryIcon} *${task.title}*\n` +
                       (task.description ? `📝 ${task.description}\n` : '') +
                       `\n💡 Revisá la tarea bloqueada en la app.`;

        // Enviar notificación a cada administrador
        for (const admin of admins) {
            // No notificar al mismo usuario si es administrador y bloqueó la tarea
            if (admin.id === blocker.id) {
                continue;
            }
            
            if (admin.whatsapp_jid) {
                try {
                    // Normalizar el JID: convertir @lid a @s.whatsapp.net si es necesario
                    let normalizedJid = admin.whatsapp_jid;
                    if (normalizedJid.endsWith('@lid')) {
                        normalizedJid = normalizedJid.replace('@lid', '@s.whatsapp.net');
                    } else if (!normalizedJid.includes('@')) {
                        normalizedJid = normalizedJid + '@s.whatsapp.net';
                    }
                    
                    const sent = await safeSendMessage(globalSock, normalizedJid, message);
                    if (sent) {
                        console.log(`✅ Notificación de tarea bloqueada enviada a admin ${admin.name} (${normalizedJid})`);
                    } else {
                        console.error(`❌ No se pudo enviar notificación de tarea bloqueada a admin ${admin.name} (${normalizedJid})`);
                    }
                } catch (error: any) {
                    console.error(`❌ Error enviando notificación a admin ${admin.name}:`, error);
                    // Continuar con los demás admins aunque falle uno
                }
            }
        }
    } catch (error: any) {
        console.error('Error notificando a administradores de tarea bloqueada:', error);
        // No lanzar el error para no interrumpir el flujo principal
    }
}

// Función para enviar notificación cuando una tarea pasa a blocked
// NOTA: Esta función ha sido deshabilitada porque ya se usa notifyAdminsOfBlockedTask
// que envía el mensaje correcto. Esta función causaba duplicación de mensajes.
// async function notifyBlockedTask(whatsappJid: string, taskId: string, taskTitle: string, taskDescription?: string, siteAddress?: string, blockerName?: string, isAdmin?: boolean) {
//     if (!globalSock) {
//         console.error('Socket de WhatsApp no está disponible para enviar notificación');
//         return;
//     }
//
//     try {
//         let message: string[];
//         
//         if (isAdmin) {
//             // Mensaje para administrador: informar quién bloqueó la tarea
//             message = [
//                 '⛔ *Tarea Bloqueada - Notificación para Administrador*',
//                 '',
//                 `📋 *${taskTitle}*`,
//                 taskDescription ? `📝 ${taskDescription}` : '',
//                 siteAddress ? `🏷️ Obra: ${siteAddress}` : '',
//                 '',
//                 blockerName ? `👤 Bloqueada por: *${blockerName}*` : '👤 Una tarea ha sido bloqueada',
//                 '',
//                 '💡 Como administrador de esta obra, te informamos que una tarea ha sido bloqueada. Revisá los detalles en la app.'
//             ].filter(Boolean);
//         } else {
//             // Mensaje para el dueño de la tarea (quien la bloqueó)
//             message = [
//                 '⛔ *Tarea Bloqueada*',
//                 '',
//                 `📋 *${taskTitle}*`,
//                 taskDescription ? `📝 ${taskDescription}` : '',
//                 siteAddress ? `🏷️ Obra: ${siteAddress}` : '',
//                 '',
//                 'Tu tarea ha sido marcada como bloqueada. Revisá los detalles en la app.'
//             ].filter(Boolean);
//         }
//
//         await safeSendMessage(globalSock, whatsappJid, message.join('\n'));
//         console.log(`Notificación de tarea bloqueada enviada a ${whatsappJid} (${isAdmin ? 'admin' : 'dueño'})`);
//     } catch (error: any) {
//         console.error('Error enviando notificación de tarea bloqueada:', error);
//         throw error;
//     }
// }

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

        // Endpoint para notificaciones de tareas bloqueadas desde el servidor (web/app)
        if (req.method === 'POST' && req.url === '/notify/blocked-task') {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { taskId, taskTitle, taskDescription, siteAddress, blockerName, blockerUserId, notifyOwnerOnly, ownerWhatsappJid, notifyAdminsOnly, siteId } = data;
                    
                    if (!taskId || !taskTitle) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Faltan campos requeridos: taskId, taskTitle' }));
                        return;
                    }
                    
                    // Obtener la tarea completa para tener todos los datos
                    let task: Task;
                    try {
                        task = await api.TaskService.getTask(taskId);
                    } catch (error) {
                        // Si no se puede obtener la tarea, crear un objeto parcial con los datos recibidos
                        task = {
                            id: taskId,
                            title: taskTitle,
                            description: taskDescription || '',
                            category: 'otro' as any,
                            status: 'blocked' as any,
                            site_id: undefined,
                            user_id: blockerUserId
                        } as Task;
                    }
                    
                    // Obtener el perfil del usuario que bloqueó
                    const blocker: Profile = {
                        id: blockerUserId || '',
                        name: blockerName || 'Usuario desconocido',
                        whatsapp_jid: '' // Campo requerido pero no necesario para la notificación
                    } as Profile;
                    
                    // Si solo se debe notificar al dueño
                    if (notifyOwnerOnly && ownerWhatsappJid) {
                        if (!globalSock) {
                            throw new Error('Socket de WhatsApp no está disponible');
                        }
                        const siteName = siteAddress || 'Obra no especificada';
                        const categoryIcon = task.category === 'pintura' ? '🎨' : 
                                           task.category === 'construccion' ? '🏗️' :
                                           task.category === 'electricidad' ? '⚡' :
                                           task.category === 'plomeria' ? '🚰' : '🧩';
                        const message = `⛔ *Tarea Bloqueada*\n\n` +
                                       `🏷️ *Obra:* ${siteName}\n\n` +
                                       `${categoryIcon} *${task.title}*\n` +
                                       (task.description ? `📝 ${task.description}\n` : '') +
                                       `\n💡 Tu tarea ha sido marcada como bloqueada. Revisá los detalles en la app.`;
                        
                        let normalizedJid = ownerWhatsappJid;
                        if (normalizedJid.endsWith('@lid')) {
                            normalizedJid = normalizedJid.replace('@lid', '@s.whatsapp.net');
                        } else if (!normalizedJid.includes('@')) {
                            normalizedJid = normalizedJid + '@s.whatsapp.net';
                        }
                        
                        await safeSendMessage(globalSock, normalizedJid, message);
                    }
                    
                    // Si se debe notificar a los administradores (por defecto o explícitamente)
                    if (notifyAdminsOnly || (!notifyOwnerOnly && !notifyAdminsOnly)) {
                        const finalSiteId = task.site_id || data.siteId;
                        if (finalSiteId) {
                            await notifyAdminsOfBlockedTask(finalSiteId, task, blocker, siteAddress);
                        } else {
                            console.error('[notify/blocked-task] No se pudo obtener site_id para la tarea', taskId);
                        }
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Notificación enviada' }));
                } catch (error: any) {
                    console.error('Error procesando notificación de tarea bloqueada:', error);
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
        // Usar el primer número permitido para las notificaciones diarias
        const allowedNumber = ALLOWED_WHATSAPP_NUMBERS && ALLOWED_WHATSAPP_NUMBERS.length > 0 
            ? ALLOWED_WHATSAPP_NUMBERS[0] 
            : process.env.ALLOWED_WHATSAPP_NUMBER;
        if (!allowedNumber) {
            console.log('⚠️ No hay números permitidos configurados. No se enviarán notificaciones automáticas.');
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
        const userJid = user.whatsapp_jid || (ALLOWED_WHATSAPP_NUMBERS && ALLOWED_WHATSAPP_NUMBERS.length > 0 ? ALLOWED_WHATSAPP_NUMBERS[0] : undefined);
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

        const userJid = user.whatsapp_jid || (ALLOWED_WHATSAPP_NUMBERS && ALLOWED_WHATSAPP_NUMBERS.length > 0 ? ALLOWED_WHATSAPP_NUMBERS[0] : undefined);
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

