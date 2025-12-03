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

const createTaskTool: FunctionDeclaration = {
    name: "createTask",
    description: "Se usa para crear una NUEVA tarea de mantenimiento desde cero, a partir de una descripción del usuario.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: {
                type: Type.STRING,
                description: "Un título breve y descriptivo para la tarea. Ej: 'Arreglar caño del baño'"
            },
            description: {
                type: Type.STRING,
                description: "Una descripción más detallada de lo que se necesita hacer. Si el usuario no da detalles, puede ser igual al título."
            },
            category: {
                type: Type.STRING,
                description: "La categoría del trabajo. 'electricidad' incluye electrodomésticos. 'plomeria' es caños. 'construccion' es albañilería.",
                enum: ["pintura", "construccion", "electricidad", "plomeria", "otro"]
            },
            status: {
                type: Type.STRING,
                description: "El estado de la tarea. Por defecto debe ser 'pending' a menos que el usuario indique lo contrario (ej: 'ya está listo').",
                enum: ["changes", "pending", "in_progress", "completed", "blocked"],
                default: "pending"
            },
            start_date: {
                type: Type.STRING,
                description: `Fecha y hora de inicio (opcional). Formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). 
                          IMPORTANTE: La base de datos está en UTC. Debes tomar la hora de Buenos Aires (-03:00) que te pide el usuario y SUMARLE 3 HORAS.
                          Ej: si el usuario pide "a las 11", debes generar 'T14:00:00'.`
            },
            end_date: {
                type: Type.STRING,
                description: `Fecha y hora de finalización (opcional). Formato ISO 8601 (YYYY-MM-DDTHH:mm:ss).
                          IMPORTANTE: Al igual que con start_date, SUMA 3 HORAS a la hora de Buenos Aires (-03:00).
                          Ej: si el usuario pide "hasta las 15", debes generar 'T18:00:00'.`
            }
        },
        required: ["title", "category", "status"]
    }
};

// Obtenemos la fecha Y HORA actual en formato ISO 8601 (ej: "2025-10-18T14:30:00")
const now = new Date();
const nowISO = now.toISOString().split('.')[0]; // Elimina milisegundos

const systemInstruction = `Eres un asistente IA especializado en procesar TRANSCRIPCIONES DE AUDIO de WhatsApp para crear tareas de mantenimiento.

CONTEXTO IMPORTANTE:
- Estás procesando una transcripción de un mensaje de audio de WhatsApp.
- El usuario envió un audio con la intención de CREAR UNA TAREA de mantenimiento.
- La fecha y hora de AHORA (en UTC) es: ${nowISO}.
- El usuario se encuentra en Buenos Aires (-03:00).

TU ÚNICA FUNCIÓN:
Procesar la transcripción del audio y extraer la información necesaria para crear una tarea de mantenimiento usando la herramienta 'createTask'.

REGLAS CRÍTICAS:
1. **SIEMPRE debes usar la herramienta 'createTask'** - El usuario envió un audio específicamente para crear una tarea, así que SIEMPRE debes procesarlo como tal.
2. **Extracción de Datos:**
    * **'title':** Extrae el objetivo principal de la tarea (ej: "Hacer platea de baño", "Instalar aire acondicionado"). Debe ser un resumen corto (5-7 palabras). NO uses el estado actual como título (ej: "Esperando camión").
    * **'description':** Si hay detalles adicionales en el audio, úsalos aquí. Si no hay detalles, usa el mismo texto del 'title'.
    * **'category':** DEBES asignar SIEMPRE una categoría. Usa una de: ['pintura', 'construccion', 'electricidad', 'plomeria', 'otro'].
        - 'electricidad': Cables, luces, enchufes, instalación/reparación de aires acondicionados, ventiladores, etc.
        - 'construccion': Albañilería, plateas, paredes, arena, cemento, reparaciones estructurales, etc.
        - 'plomeria': Tuberías, caños, inodoros, grifos, tanques de agua, etc.
        - 'pintura': Pintar paredes, techos, etc.
        - 'otro': Tareas de mantenimiento general que no encajen en las demás.
    * **'status':** El estado por defecto es 'pending', EXCEPTO si el usuario menciona:
        * "listo", "terminado", "completado" -> 'completed'
        * "en progreso", "lo estoy haciendo", "estamos trabajando", "están [verbo]" -> 'in_progress'
        * "bloqueado", "trabado", "frenado", "esperando [algo]", "falta [algo]" -> 'blocked'
    * **'start_date' y 'end_date':** 
        * Formato ISO 8601: YYYY-MM-DDTHH:mm:ss
        * IMPORTANTE: La base de datos está en UTC, pero el usuario habla en hora de Buenos Aires (-03:00).
        * SIEMPRE SUMA 3 HORAS a la hora que el usuario mencione.
        * Ejemplos:
          - Usuario dice "el jueves a las 11" -> calcula jueves y usa 'T14:00:00' (11 + 3 = 14)
          - Usuario dice "desde las 11 hasta las 15" -> 'start_date': 'T14:00:00', 'end_date': 'T18:00:00'
          - Usuario dice "mañana" (sin hora) -> calcula mañana y usa 'T03:00:00' (medianoche BA = 00:00 + 3 = 03:00 UTC)
        * Si no se mencionan fechas, deja estos campos vacíos.

3. **Manejo de Errores de Transcripción:**
    * Si la transcripción es muy corta o no tiene sentido, intenta extraer al menos el título y la categoría.
    * Si la transcripción contiene solo ruido o no es comprensible, aún así intenta crear una tarea con la información disponible.

RECUERDA: El usuario envió un audio para CREAR UNA TAREA. Tu trabajo es extraer la información y usar SIEMPRE la herramienta 'createTask'.
`;

export async function createTaskDTOFromAI(userInput: string, userId: string): Promise<CreateTaskDTO | null> {
    try {
        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: [{ text: userInput }],
            config: {
                toolConfig: {
                    functionCallingConfig: {
                        mode: FunctionCallingConfigMode.AUTO,
                    }
                },
                tools: [{ functionDeclarations: [createTaskTool] }],
                systemInstruction: systemInstruction
            }
        });

        const candidate = result?.candidates?.[0];
        const part: any = candidate?.content?.parts?.[0];
        if (!part) return null;

        // Si el modelo eligió usar la herramienta, devolvemos sus args
        if (part.functionCall?.name === 'createTask') {
            const args = part.functionCall.args || {};
            if (!args.title || !args.category) return null;
            const dto: CreateTaskDTO = {
                user_id: userId,
                title: args.title,
                description: args.description || args.title,
                category: args.category as any,
                status: (args.status || 'pending') as any,
                start_date: args.start_date,
                end_date: args.end_date,
            };
            return dto;
        }

        // Si no usó la herramienta, no hay tarea
        return null;
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
            // Lanzar un error específico que será manejado en el código que llama
            const rateLimitError = new Error('GEMINI_QUOTA_EXCEEDED');
            (rateLimitError as any).isRateLimit = true;
            (rateLimitError as any).originalError = err;
            throw rateLimitError;
        }
        
        console.error("Error llamando al modelo:", err);
        return null;
    }
}
