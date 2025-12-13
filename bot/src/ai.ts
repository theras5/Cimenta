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
- "crear tarea" o "tarea" o "t" o "crear una tarea" o "quiero crear una tarea" → Inicia la creación de una tarea
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
- "compra" o "c" o "crear compra" o "crear una compra" o "crear solicitud de compra" o "solicitud de compra" → Crear solicitud de compra
- "compras" → Ver compras pendientes
- "compras criticas" → Ver compras críticas pendientes (prioridad alta o urgente)
- "comprar [ID]" → Marcar compra como comprada
- "entregar [ID]" → Marcar compra como entregada
- "pendiente [ID]" → Volver compra a pendiente

🌤️ CLIMA:
- "clima" o "clima [nombre]" o "clima obra [nombre]" o "quiero saber el clima" → Ver pronóstico del tiempo de una obra. Si no se especifica obra, se mostrará la lista de obras disponibles.

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
    description: "Crear una nueva tarea de mantenimiento. Extrae TODOS los parámetros mencionados en el audio: título, descripción, categoría, estado, obra, fechas, etc.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: {
                type: Type.STRING,
                description: "Título breve y descriptivo de la tarea. Si el usuario dice 'que se llame X', entonces X es el título."
            },
            description: {
                type: Type.STRING,
                description: "Descripción detallada (opcional). Si el usuario dice 'no tenga descripción' o 'sin descripción', NO incluyas este campo o déjalo vacío. Si el usuario describe la tarea, usa esa descripción. Si no hay descripción y el usuario no dice explícitamente que no la quiere, usa el título como descripción."
            },
            category: {
                type: Type.STRING,
                description: "Categoría: 'pintura' (pintar, pintura), 'construccion' (construcción, albañilería, paredes), 'electricidad' (focos, luces, cables, enchufes), 'plomeria' (caños, tuberías, grifos, inodoros), 'otro' (mantenimiento general)",
                enum: ["pintura", "construccion", "electricidad", "plomeria", "otro"]
            },
            status: {
                type: Type.STRING,
                description: "Estado: 'pending' (pendiente, por defecto), 'in_progress' (en progreso), 'completed' (completada), 'blocked' (bloqueada). NO uses 'changes' aquí, para eso existe el comando createChange.",
                enum: ["pending", "in_progress", "completed", "blocked"],
                default: "pending"
            },
            start_date: {
                type: Type.STRING,
                description: "Fecha y hora de inicio en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss) en hora de Buenos Aires. Solo si el usuario menciona una fecha/hora específica."
            },
            end_date: {
                type: Type.STRING,
                description: "Fecha y hora de finalización en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss) en hora de Buenos Aires. Solo si el usuario menciona una fecha/hora específica."
            },
            site_address: {
                type: Type.STRING,
                description: "Nombre o dirección de la obra mencionada en el audio. Si el usuario menciona una obra, intenta mapearla con las obras disponibles del usuario usando match parcial. Por ejemplo, si dice 'gurruchaga' y hay una obra 'Gurruchaga 500', usa 'Gurruchaga 500'."
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
    description: "Obtener pronóstico del tiempo de una obra. Si no se especifica obra, se mostrará la lista de obras disponibles.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            obra_name: {
                type: Type.STRING,
                description: "Nombre o dirección de la obra (opcional). Si no se especifica, se mostrará la lista de obras."
            }
        },
        required: []
    }
};

// Tool para crear compra (solo admins)
const createPurchaseTool: FunctionDeclaration = {
    name: "createPurchase",
    description: "Crear una solicitud de compra (solo administradores). Si el usuario dice 'crear una solicitud de compra para X' o 'crear compra para X', extrae el producto X y crea la solicitud.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            product: {
                type: Type.STRING,
                description: "Nombre del producto a comprar. Si el usuario dice 'crear una solicitud de compra para un escritorio', entonces product='escritorio'. Si dice 'crear compra para tornillos', entonces product='tornillos'."
            },
            quantity: {
                type: Type.NUMBER,
                description: "Cantidad (opcional, por defecto 1 si no se menciona). Si el usuario dice '5 tornillos', entonces quantity=5. Si no menciona cantidad, usa 1."
            },
            category: {
                type: Type.STRING,
                description: "Categoría del producto (opcional, por defecto 'otros' si no se menciona). Intenta inferir la categoría del producto: muebles, herramientas, materiales de construcción, pintura, electricidad, plomería, etc. Las categorías válidas son: 'materiales', 'herramientas', 'equipamiento', 'seguridad', 'oficina', 'otros'."
            },
            priority: {
                type: Type.STRING,
                description: "Prioridad: 'baja', 'normal' (por defecto), 'alta', 'urgente'. Solo si el usuario menciona la prioridad explícitamente.",
                enum: ["baja", "normal", "alta", "urgente"]
            },
            description: {
                type: Type.STRING,
                description: "Descripción adicional (opcional). Si el usuario da más detalles sobre el producto que no sean precio o proveedor, úsalos aquí. NO incluyas información de precio o proveedor en la descripción."
            },
            price: {
                type: Type.NUMBER,
                description: "Precio unitario del producto (opcional). Si el usuario dice '20 pesos cada uno' o 'a 20 pesos', entonces price=20. Si dice 'cuesta 50 pesos', entonces price=50. Extrae solo el número del precio unitario."
            },
            supplier: {
                type: Type.STRING,
                description: "Proveedor o lugar donde comprar (opcional). Si el usuario dice 'se tienen que comprar en Sodimac' o 'comprar en Sodimac', entonces supplier='Sodimac'. Si menciona un proveedor o tienda, extrae su nombre."
            },
            site_address: {
                type: Type.STRING,
                description: "Nombre o dirección de la obra (opcional). Si el usuario menciona una obra, intenta mapearla con las obras disponibles del usuario."
            }
        },
        required: ["product"]
    }
};

export interface CommandResult {
    commandType: string;
    params: any;
}

function buildSystemInstruction(availableCommands: string, isAdmin: boolean, userSites?: Array<{id: string, address: string}>): string {
    let sitesContext = '';
    if (userSites && userSites.length > 0) {
        sitesContext = `\n\nOBRAS DEL USUARIO (para ayudar a mapear nombres de obras mencionadas en el audio):
${userSites.map((site, idx) => `${idx + 1}. ${site.address || 'Sin nombre'} (ID: ${site.id})`).join('\n')}

IMPORTANTE: Si el usuario menciona una obra en el audio pero el nombre no coincide exactamente, intenta hacer un match parcial o por similitud con las obras listadas arriba. Por ejemplo, si el usuario dice "gurruchaga" y hay una obra "Gurruchaga 500", deberías usar "Gurruchaga 500" como obra_name.`;
    }
    
    return `Eres un asistente IA especializado en procesar TRANSCRIPCIONES DE AUDIO de WhatsApp para ejecutar comandos en un bot de gestión de obras.

CONTEXTO IMPORTANTE:
- Estás procesando una transcripción de un mensaje de audio de WhatsApp.
- El usuario puede querer ejecutar CUALQUIER comando disponible en el bot.
- La fecha y hora de AHORA (en UTC) es: ${nowISO}.
- El usuario se encuentra en Buenos Aires (UTC-3).
- Rol del usuario: ${isAdmin ? 'ADMINISTRADOR' : 'CLIENTE'}${sitesContext}

COMANDOS DISPONIBLES:
${availableCommands}

TU FUNCIÓN:
Analizar la transcripción del audio e identificar qué comando quiere ejecutar el usuario. Luego, usar la herramienta correspondiente para ejecutar ese comando con los parámetros necesarios.

IMPORTANTE: Si el usuario menciona "crear tarea", "crear una tarea", "quiero crear una tarea", o cualquier variación similar, SIEMPRE debes usar la herramienta createTask. No importa qué tan simple o complejo sea el comando, si menciona crear una tarea, usa createTask.

REGLAS CRÍTICAS:
1. **Identificar la intención:** Analiza qué comando quiere ejecutar el usuario basándote en los comandos disponibles. Reconoce variaciones como "crear tarea", "quiero crear una tarea", "necesito crear una tarea", "clima", "quiero saber el clima", etc.
2. **Usar la herramienta correcta:** Cada comando tiene una herramienta específica. Úsala según corresponda.
3. **Extraer TODOS los parámetros:** De la transcripción, extrae TODOS los parámetros mencionados. Si el usuario dice "Crea una tarea para mi obra 'Gurruchaga 500' que se llame 'Comprar tornillos', sea de la categoría pintura, esté pendiente", extrae: title="Comprar tornillos", category="pintura", status="pending", site_address="Gurruchaga 500".
4. **Mapear obras:** Si el usuario menciona una obra, intenta mapearla con las obras disponibles del usuario usando match parcial o por similitud. Por ejemplo, si dice "gurruchaga" y hay una obra "Gurruchaga 500", usa "Gurruchaga 500" como site_address.
5. **Fechas:** Si el usuario menciona fechas/horas, usa formato ISO 8601 (YYYY-MM-DDTHH:mm:ss) en hora de Buenos Aires. El sistema convertirá a UTC automáticamente.
6. **Categorías de tareas:** 
   - 'electricidad': cables, luces, enchufes, focos, aires acondicionados, ventiladores, electricidad, cambiar foco, cambiar luces
   - 'construccion': construcción, albañilería, plateas, paredes, reparaciones estructurales, tornillos, materiales de construcción, estantes, muebles, estructuras
   - 'plomeria': plomería, tuberías, caños, inodoros, grifos, tanques, agua, desagües
   - 'pintura': pintar, pintura, paredes, techos, colores, pintar pared, pintar techo
   - 'otro': mantenimiento general, otros, reparaciones generales
7. **Estados de tareas:** 
   - 'pending': pendiente (por defecto)
   - 'in_progress': en progreso, en proceso
   - 'completed': completada, terminada, finalizada
   - 'blocked': bloqueada
   - NO uses 'changes' para createTask, para eso existe createChange
8. **Precios en compras:** Si el usuario dice "a 20 pesos cada uno", "20 pesos cada uno", "cuesta 20 pesos", "precio 20", entonces price=20. Extrae SOLO el número del precio unitario. Si dice "20 pesos cada uno", el precio unitario es 20, no el total.
9. **Proveedores en compras:** Si el usuario dice "se tienen que comprar en Sodimac", "comprar en Sodimac", "en Sodimac", "proveedor Sodimac", entonces supplier="Sodimac". Extrae el nombre del proveedor o tienda mencionado.
10. **Descripción en compras:** La descripción debe contener información adicional sobre el producto, NO debe incluir precio ni proveedor. Si el usuario solo menciona precio y proveedor, deja description vacío o no lo incluyas.

EJEMPLOS DE USO:
- Usuario dice "quiero ver las tareas bloqueadas" → usar executeCommand con command="tareas_bloqueadas"
- Usuario dice "crear tarea" o "crear una tarea" o "quiero crear una tarea" → usar createTask (con parámetros mínimos: title y category)
- Usuario dice "Crear una tarea para cambiar los estantes" → usar createTask con title="Cambiar los estantes", category="construccion" (estantes = construcción)
- Usuario dice "crear tarea para cambiar el foco del baño mañana a las 8" → usar createTask con title="Cambiar foco del baño", category="electricidad", start_date
- Usuario dice "Crear una tarea para mi obra 'Gurru Chaga 500' que se llame 'Comprar tornillos' no tenga descripción, sea de la categoría 'Pintura' tenga estado pendiente, no se agende en el calendario y se asigne a 'Debora'" → usar createTask con title="Comprar tornillos", category="pintura", status="pending", site_address="Gurru Chaga 500" (mapear "Gurru Chaga 500" con las obras del usuario, probablemente "Gurruchaga 500"). NO incluir description si dice "no tenga descripción". Ignorar "se asigne a Debora" - eso se maneja después de crear la tarea.
- Usuario dice "Crea una tarea para mi obra 'Gurruchaga 500' que se llame 'Comprar tornillos', sea de la categoría pintura, esté pendiente" → usar createTask con title="Comprar tornillos", category="pintura", status="pending", site_address="Gurruchaga 500" (mapear con las obras del usuario)
- Usuario dice "mostrar resumen de la obra en gurruchaga" → usar executeCommand con command="resumen" y obra_name="gurruchaga"
- Usuario dice "Crear una solicitud de compra para un escritorio" → usar createPurchase con product="escritorio", quantity=1 (por defecto), category="otros" (por defecto)
- Usuario dice "crear compra para tornillos" → usar createPurchase con product="tornillos", quantity=1, category="construccion" (inferir de tornillos)
- Usuario dice "Crear una solicitud de compra de 50 tornillos a 20 pesos cada uno y se tienen que comprar en Sodimac" → usar createPurchase con product="tornillos", quantity=50, price=20, supplier="Sodimac", category="construccion" (inferir de tornillos)
- Usuario dice "marcar la compra 123 como entregada" → usar changePurchaseStatus con purchase_id="123" y status="delivered"
- Usuario dice "solicitar cambio para pintar la sala de otro color" → usar createChange con title, category
- Usuario dice "quiero saber el clima" o "clima" o "pronóstico del tiempo" → usar getWeather sin obra_name (se mostrará lista de obras)
- Usuario dice "clima de gurruchaga" o "quiero saber el clima de mi obra" → usar getWeather con obra_name="gurruchaga" (mapear con las obras del usuario)

VARIACIONES DE COMANDOS IMPORTANTES:
- "crear tarea", "crear una tarea", "quiero crear una tarea", "necesito crear una tarea", "Crear una tarea para...", "Crear tarea para..." → SIEMPRE usar createTask
- "crear compra", "crear una compra", "crear solicitud de compra", "solicitud de compra", "compra" → SIEMPRE usar createPurchase
- "clima", "quiero saber el clima", "pronóstico", "pronóstico del tiempo", "el tiempo" → getWeather
- "tareas bloqueadas", "quiero ver las tareas bloqueadas", "mostrar tareas bloqueadas" → executeCommand con command="tareas_bloqueadas"

NOTAS IMPORTANTES:
- Si el usuario dice "no tenga descripción" o "sin descripción", NO incluyas el campo description o déjalo vacío.
- Si el usuario menciona "asignar a [nombre trabajador]", ignóralo - eso se maneja después de crear la tarea, no es un parámetro de createTask.
- Si el usuario menciona "no se agende en el calendario", simplemente no incluyas start_date ni end_date.
- Si el nombre de la obra está mal transcrito (ej: "Gurru Chaga 500" en lugar de "Gurruchaga 500"), intenta mapearlo con las obras disponibles usando match parcial. Si hay una obra que contiene "gurruchaga" o similar, úsala.

RECUERDA: Identifica la intención del usuario y ejecuta el comando correspondiente usando la herramienta adecuada. Si el usuario menciona una obra, intenta mapearla con las obras disponibles del usuario usando match parcial o por similitud. SIEMPRE que veas "crear tarea" o variaciones, usa createTask.`;
}

export async function processAudioCommand(
    transcribedText: string, 
    userId: string,
    isAdmin: boolean,
    userSites?: Array<{id: string, address: string}>
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
        
        const systemInstruction = buildSystemInstruction(availableCommands, isAdmin, userSites);
        
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
        
        // Si no hay functionCall, loguear para debugging
        if (!part || !part.functionCall) {
            console.log('[processAudioCommand] No se detectó functionCall. Respuesta de AI:', JSON.stringify(part, null, 2));
            if (candidate?.content?.parts) {
                console.log('[processAudioCommand] Todas las partes:', JSON.stringify(candidate.content.parts, null, 2));
            }
            return null;
        }

        const functionName = part.functionCall.name;
        const args = part.functionCall.args || {};
        console.log(`[processAudioCommand] Función llamada: ${functionName}`, JSON.stringify(args, null, 2));

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
            
            // Si description está vacío o es undefined, usar el título como descripción
            if (!args.description || args.description.trim() === '' || args.description === 'null' || args.description === 'undefined') {
                processedParams.description = args.title;
            } else {
                processedParams.description = args.description;
            }
        }

        // Si es createChange, preparar parámetros
        if (functionName === 'createChange') {
            processedParams.user_id = userId;
            processedParams.status = 'changes';
        }

        // Si es createPurchase, preparar parámetros con valores por defecto
        if (functionName === 'createPurchase') {
            processedParams.user_id = userId;
            // Si no hay quantity, usar 1 por defecto
            if (!args.quantity || args.quantity === 0) {
                processedParams.quantity = 1;
            }
            // Si no hay category, usar 'otros' por defecto
            if (!args.category || args.category.trim() === '') {
                processedParams.category = 'otros';
            }
            // Si no hay priority, usar 'normal' por defecto
            if (!args.priority) {
                processedParams.priority = 'normal';
            }
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
export async function createTaskDTOFromAI(userInput: string, userId: string, userSites?: Array<{id: string, address: string}>): Promise<CreateTaskDTO | null> {
    try {
        const result = await processAudioCommand(userInput, userId, true, userSites); // Asumir admin por compatibilidad
        
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
