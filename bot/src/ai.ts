import "dotenv/config";
import { FunctionCallingConfigMode, FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";
import { CreateTaskDTO } from "@cimenta/dtos";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error(
        "Missing API key. Set GEMINI_API_KEY (or GOOGLE_API_KEY) in your environment or .env file."
    );
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Obtenemos la fecha Y HORA actual en formato ISO 8601 (ej: "2025-10-18T14:30:00")
const now = new Date();
const nowISO = now.toISOString().split('.')[0]; // Elimina milisegundos

/**
 * Convierte una fecha/hora de Buenos Aires (UTC-3) a UTC
 * El AI puede generar fechas en formato ISO sin timezone, asumimos que son hora de Buenos Aires
 */
function convertBuenosAiresToUTC(dateString: string): string {
    try {
        // Si ya tiene timezone, parsearlo directamente
        if (dateString.includes('+') || dateString.includes('-') && dateString.match(/[+-]\d{2}:\d{2}$/)) {
            // Ya tiene timezone, convertir a UTC
            const date = new Date(dateString);
            return date.toISOString();
        }
        
        // Si no tiene timezone, asumir que es hora de Buenos Aires (UTC-3)
        // Formato esperado: YYYY-MM-DDTHH:mm:ss o YYYY-MM-DDTHH:mm
        let date: Date;
        if (dateString.includes('T')) {
            // Tiene hora
            const [datePart, timePart] = dateString.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute, second] = (timePart || '').split(':').map(Number);
            
            // Crear fecha en hora de Buenos Aires (UTC-3)
            // Para convertir BA a UTC, sumamos 3 horas
            const hourUTC = (hour || 0) + 3;
            const dateUTC = new Date(Date.UTC(year, month - 1, day, hourUTC, minute || 0, second || 0, 0));
            return dateUTC.toISOString();
        } else {
            // Solo fecha, usar medianoche Buenos Aires (03:00 UTC)
            const [year, month, day] = dateString.split('-').map(Number);
            const dateUTC = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
            return dateUTC.toISOString();
        }
    } catch (error) {
        console.error('Error convirtiendo fecha de Buenos Aires a UTC:', error, 'Fecha original:', dateString);
        // Si falla, intentar parsear como está
        try {
            return new Date(dateString).toISOString();
        } catch {
            return dateString; // Devolver como está si no se puede parsear
        }
    }
}

/**
 * Genera la lista de comandos disponibles según el rol del usuario
 */
export function getAvailableCommands(isAdmin: boolean): string {
    if (isAdmin) {
        return `
COMANDOS DISPONIBLES PARA ADMINISTRADORES:

📋 TAREAS:
- "crear tarea" o "tarea" o "t" → Inicia la creación de una tarea
- "tareas" → Ver todas las tareas
- "tareas [nombre obra]" → Ver tareas de una obra específica
- "tareas bloqueadas" → Ver tareas bloqueadas
- "tareas esta semana" → Ver tareas de esta semana
- "tareas pendientes" → Ver tareas pendientes
- "tareas completadas" → Ver tareas completadas
- "tareas en progreso" → Ver tareas en progreso
- "[número/título] pendiente" → Cambiar estado de tarea a pendiente
- "[número/título] bloqueada" → Cambiar estado de tarea a bloqueada
- "[número/título] completada" → Cambiar estado de tarea a completada
- "[número/título] en progreso" → Cambiar estado de tarea a en progreso

🔄 CAMBIOS:
- "cambio" o "cambios" o "solicitar cambio" → Crear solicitud de cambio

🧾 RESÚMENES:
- "resumen" o "res" → Ver resumen del día
- "resumen [nombre obra]" → Ver resumen de una obra específica
- "agenda" → Ver agenda de hoy
- "agenda [nombre obra]" → Ver agenda de una obra específica

📸 AVANCES:
- "avances" → Ver avances de las últimas 2 semanas
- "avances [nombre obra]" → Ver avances de una obra específica
- "av [texto]" → Crear avance de texto

🏷️ OBRAS:
- "obras" → Ver lista de obras
- "comparar obras" → Comparativa de productividad

🛒 COMPRAS:
- "compra" o "c" → Crear solicitud de compra
- "compras" → Ver compras pendientes
- "compras criticas" → Ver compras críticas pendientes (prioridad alta o urgente)
- "comprar [ID]" → Marcar compra como comprada
- "entregar [ID]" → Marcar compra como entregada
- "pendiente [ID]" → Volver compra a pendiente

🌤️ CLIMA:
- "clima [nombre]" o "clima obra [nombre]" → Ver pronóstico del tiempo de una obra

❌ OTROS:
- "cancelar" → Cancelar operación en curso

❓ AYUDA:
- "qué hace [comando]" → Explicación detallada de cualquier comando
- "qué hace" → Ver explicaciones de todos los comandos
`;
    } else {
        return `
COMANDOS DISPONIBLES PARA CLIENTES:

📋 TAREAS:
- "tareas" → Ver todas las tareas
- "tareas bloqueadas" → Ver tareas bloqueadas
- "tareas esta semana" → Ver tareas de esta semana

🔄 CAMBIOS:
- "cambio" o "cambios" o "solicitar cambio" → Crear solicitud de cambio

🛒 COMPRAS:
- "compras" → Ver compras pendientes
- "compras criticas" → Ver compras críticas pendientes (prioridad alta o urgente)
- "comprar [ID]" → Marcar compra como comprada
- "entregar [ID]" → Marcar compra como entregada
- "pendiente [ID]" → Volver compra a pendiente

📸 AVANCES:
- "avances" → Ver avances de las últimas 2 semanas
- "avances [nombre obra]" → Ver avances de una obra específica

🧾 RESÚMENES:
- "resumen" o "res" → Ver resumen del día
- "resumen [nombre obra]" → Ver resumen de una obra específica

🏷️ OBRAS:
- "comparar obras" → Comparativa de productividad

❌ OTROS:
- "cancelar" → Cancelar operación en curso

❓ AYUDA:
- "qué hace [comando]" → Explicación detallada de cualquier comando
- "qué hace" → Ver explicaciones de todos los comandos
`;
    }
}

// Tool para crear tareas
const createTaskTool: FunctionDeclaration = {
    name: "createTask",
    description: "Crear una nueva tarea de mantenimiento",
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: {
                type: Type.STRING,
                description: "Título breve y descriptivo de la tarea"
            },
            description: {
                type: Type.STRING,
                description: "Descripción detallada (opcional, si no hay usa el título)"
            },
            category: {
                type: Type.STRING,
                description: "Categoría: 'pintura', 'construccion', 'electricidad', 'plomeria', 'otro'",
                enum: ["pintura", "construccion", "electricidad", "plomeria", "otro"]
            },
            status: {
                type: Type.STRING,
                description: "Estado: 'pending' (por defecto), 'in_progress', 'completed', 'blocked', 'changes'",
                enum: ["changes", "pending", "in_progress", "completed", "blocked"],
                default: "pending"
            },
            start_date: {
                type: Type.STRING,
                description: "Fecha y hora de inicio en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss) en hora de Buenos Aires"
            },
            end_date: {
                type: Type.STRING,
                description: "Fecha y hora de finalización en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss) en hora de Buenos Aires"
            },
            site_address: {
                type: Type.STRING,
                description: "Nombre o dirección de la obra (opcional, para identificar la obra si el usuario tiene varias)"
            }
        },
        required: ["title", "category"]
    }
};

// Tool para ejecutar comandos simples (sin parámetros complejos)
const executeCommandTool: FunctionDeclaration = {
    name: "executeCommand",
    description: "Ejecutar un comando simple del bot",
    parameters: {
        type: Type.OBJECT,
        properties: {
            command: {
                type: Type.STRING,
                description: "Nombre del comando a ejecutar",
                enum: [
                    "tareas",
                    "tareas_bloqueadas",
                    "tareas_esta_semana",
                    "tareas_pendientes",
                    "tareas_completadas",
                    "tareas_en_progreso",
                    "resumen",
                    "agenda",
                    "avances",
                    "obras",
                    "comparar_obras",
                    "compras",
                    "compras_criticas",
                    "cancelar"
                ]
            },
            obra_name: {
                type: Type.STRING,
                description: "Nombre de la obra (opcional, solo si el comando requiere especificar una obra)"
            }
        },
        required: ["command"]
    }
};

// Tool para cambiar estado de tarea
const changeTaskStatusTool: FunctionDeclaration = {
    name: "changeTaskStatus",
    description: "Cambiar el estado de una tarea existente",
    parameters: {
        type: Type.OBJECT,
        properties: {
            task_identifier: {
                type: Type.STRING,
                description: "Identificador de la tarea (número, título o parte del título)"
            },
            status: {
                type: Type.STRING,
                description: "Nuevo estado",
                enum: ["pending", "in_progress", "completed", "blocked"]
            }
        },
        required: ["task_identifier", "status"]
    }
};

// Tool para cambiar estado de compra
const changePurchaseStatusTool: FunctionDeclaration = {
    name: "changePurchaseStatus",
    description: "Cambiar el estado de una compra",
    parameters: {
        type: Type.OBJECT,
        properties: {
            purchase_id: {
                type: Type.STRING,
                description: "ID de la compra (número)"
            },
            status: {
                type: Type.STRING,
                description: "Nuevo estado",
                enum: ["purchased", "delivered", "pending"]
            }
        },
        required: ["purchase_id", "status"]
    }
};

// Tool para crear cambio (solicitud de cambio)
const createChangeTool: FunctionDeclaration = {
    name: "createChange",
    description: "Crear una solicitud de cambio (tarea con status='changes')",
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: {
                type: Type.STRING,
                description: "Título de la solicitud de cambio"
            },
            description: {
                type: Type.STRING,
                description: "Descripción detallada (opcional)"
            },
            category: {
                type: Type.STRING,
                description: "Categoría",
                enum: ["pintura", "construccion", "electricidad", "plomeria", "otro"]
            },
            site_address: {
                type: Type.STRING,
                description: "Nombre o dirección de la obra (opcional)"
            }
        },
        required: ["title", "category"]
    }
};

// Tool para crear avance
const createUpdateTool: FunctionDeclaration = {
    name: "createUpdate",
    description: "Crear un avance de texto",
    parameters: {
        type: Type.OBJECT,
        properties: {
            text: {
                type: Type.STRING,
                description: "Texto del avance"
            },
            site_address: {
                type: Type.STRING,
                description: "Nombre o dirección de la obra (opcional)"
            }
        },
        required: ["text"]
    }
};

// Tool para ver clima
const getWeatherTool: FunctionDeclaration = {
    name: "getWeather",
    description: "Obtener pronóstico del tiempo de una obra",
    parameters: {
        type: Type.OBJECT,
        properties: {
            obra_name: {
                type: Type.STRING,
                description: "Nombre o dirección de la obra"
            }
        },
        required: ["obra_name"]
    }
};

// Tool para crear compra (solo admins)
const createPurchaseTool: FunctionDeclaration = {
    name: "createPurchase",
    description: "Crear una solicitud de compra (solo administradores)",
    parameters: {
        type: Type.OBJECT,
        properties: {
            product: {
                type: Type.STRING,
                description: "Nombre del producto a comprar"
            },
            quantity: {
                type: Type.NUMBER,
                description: "Cantidad"
            },
            category: {
                type: Type.STRING,
                description: "Categoría del producto"
            },
            priority: {
                type: Type.STRING,
                description: "Prioridad: 'baja', 'normal', 'alta', 'urgente'",
                enum: ["baja", "normal", "alta", "urgente"]
            },
            description: {
                type: Type.STRING,
                description: "Descripción adicional (opcional)"
            },
            site_address: {
                type: Type.STRING,
                description: "Nombre o dirección de la obra (opcional)"
            }
        },
        required: ["product", "quantity", "category"]
    }
};

export interface CommandResult {
    commandType: string;
    params: any;
}

function buildSystemInstruction(availableCommands: string, isAdmin: boolean): string {
    return `Eres un asistente IA especializado en procesar TRANSCRIPCIONES DE AUDIO de WhatsApp para ejecutar comandos en un bot de gestión de obras.

CONTEXTO IMPORTANTE:
- Estás procesando una transcripción de un mensaje de audio de WhatsApp.
- El usuario puede querer ejecutar CUALQUIER comando disponible en el bot.
- La fecha y hora de AHORA (en UTC) es: ${nowISO}.
- El usuario se encuentra en Buenos Aires (UTC-3).
- Rol del usuario: ${isAdmin ? 'ADMINISTRADOR' : 'CLIENTE'}

COMANDOS DISPONIBLES:
${availableCommands}

TU FUNCIÓN:
Analizar la transcripción del audio e identificar qué comando quiere ejecutar el usuario. Luego, usar la herramienta correspondiente para ejecutar ese comando con los parámetros necesarios.

REGLAS CRÍTICAS:
1. **Identificar la intención:** Analiza qué comando quiere ejecutar el usuario basándote en los comandos disponibles.
2. **Usar la herramienta correcta:** Cada comando tiene una herramienta específica. Úsala según corresponda.
3. **Extraer parámetros:** De la transcripción, extrae todos los parámetros necesarios para ejecutar el comando.
4. **Fechas:** Si el usuario menciona fechas/horas, usa formato ISO 8601 (YYYY-MM-DDTHH:mm:ss) en hora de Buenos Aires. El sistema convertirá a UTC automáticamente.
5. **Categorías de tareas:** 
   - 'electricidad': cables, luces, enchufes, aires acondicionados, ventiladores
   - 'construccion': albañilería, plateas, paredes, reparaciones estructurales
   - 'plomeria': tuberías, caños, inodoros, grifos, tanques
   - 'pintura': pintar paredes, techos
   - 'otro': mantenimiento general

EJEMPLOS DE USO:
- Usuario dice "quiero ver las tareas bloqueadas" → usar executeCommand con command="tareas_bloqueadas"
- Usuario dice "crear tarea para cambiar el foco del baño mañana a las 8" → usar createTask con title, category, start_date
- Usuario dice "mostrar resumen de la obra en gurruchaga" → usar executeCommand con command="resumen" y obra_name="gurruchaga"
- Usuario dice "marcar la compra 123 como entregada" → usar changePurchaseStatus con purchase_id="123" y status="delivered"
- Usuario dice "solicitar cambio para pintar la sala de otro color" → usar createChange con title, category

RECUERDA: Identifica la intención del usuario y ejecuta el comando correspondiente usando la herramienta adecuada.`;
}

export async function processAudioCommand(
    transcribedText: string, 
    userId: string,
    isAdmin: boolean
): Promise<CommandResult | null> {
    try {
        const availableCommands = getAvailableCommands(isAdmin);
        
        // Definir las herramientas disponibles según el rol
        const tools: FunctionDeclaration[] = [
            createTaskTool,
            executeCommandTool,
            changeTaskStatusTool,
            changePurchaseStatusTool,
            createChangeTool,
            createUpdateTool,
            getWeatherTool
        ];
        
        // Solo admins pueden crear compras
        if (isAdmin) {
            tools.push(createPurchaseTool);
        }
        
        const systemInstruction = buildSystemInstruction(availableCommands, isAdmin);
        
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: [{ text: transcribedText }],
            config: {
                toolConfig: {
                    functionCallingConfig: {
                        mode: FunctionCallingConfigMode.AUTO,
                    }
                },
                tools: [{ functionDeclarations: tools }],
                systemInstruction: systemInstruction
            }
        });

        const candidate = result?.candidates?.[0];
        const part: any = candidate?.content?.parts?.[0];
        if (!part || !part.functionCall) return null;

        const functionName = part.functionCall.name;
        const args = part.functionCall.args || {};

        // Procesar según la función llamada
        let processedParams: any = { ...args };

        // Si es createTask, convertir fechas y preparar DTO
        if (functionName === 'createTask') {
            if (args.start_date) {
                processedParams.start_date = convertBuenosAiresToUTC(args.start_date);
            }
            if (args.end_date) {
                processedParams.end_date = convertBuenosAiresToUTC(args.end_date);
            }
            processedParams.user_id = userId;
            processedParams.status = args.status || 'pending';
        }

        // Si es createChange, preparar parámetros
        if (functionName === 'createChange') {
            processedParams.user_id = userId;
            processedParams.status = 'changes';
        }

        // Si es createUpdate, preparar parámetros
        if (functionName === 'createUpdate') {
            processedParams.user_id = userId;
        }

        return {
            commandType: functionName,
            params: processedParams
        };
    } catch (err: any) {
        // Manejo específico del error 429 (cuota agotada)
        const isRateLimit = err?.status === 429 || 
                          err?.error?.code === 429 ||
                          err?.message?.includes('429') ||
                          err?.message?.includes('quota') ||
                          err?.message?.includes('RESOURCE_EXHAUSTED') ||
                          err?.error?.status === 'RESOURCE_EXHAUSTED';
        
        if (isRateLimit) {
            console.error("⚠️ Error 429: Cuota de Gemini AI agotada. Revisa tu plan y facturación.");
            const rateLimitError = new Error('GEMINI_QUOTA_EXCEEDED');
            (rateLimitError as any).isRateLimit = true;
            (rateLimitError as any).originalError = err;
            throw rateLimitError;
        }
        
        console.error("Error procesando comando de audio:", err);
        return null;
    }
}

// Mantener función antigua para compatibilidad (solo crear tareas)
export async function createTaskDTOFromAI(userInput: string, userId: string): Promise<CreateTaskDTO | null> {
    try {
        const result = await processAudioCommand(userInput, userId, true); // Asumir admin por compatibilidad
        
        if (!result || result.commandType !== 'createTask') {
            return null;
        }
        
        const args = result.params;
        if (!args.title || !args.category) return null;
        
        return {
            user_id: userId,
            title: args.title,
            description: args.description || args.title,
            category: args.category as any,
            status: (args.status || 'pending') as any,
            start_date: args.start_date,
            end_date: args.end_date,
        };
    } catch (err: any) {
        if ((err as any).isRateLimit) {
            throw err;
        }
        console.error("Error creando tarea desde IA:", err);
        return null;
    }
}
