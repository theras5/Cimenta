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

const systemInstruction = `Eres un asistente IA de WhatsApp para gestionar tareas de mantenimiento. Tu objetivo es ayudar a los usuarios a crear y gestionar tareas.
CONTEXTO DE FECHA Y HORA CRÍTICO:
- La fecha y hora de AHORA (en UTC) es: ${nowISO}.
- El usuario se encuentra en Buenos Aires (-03:00).

REGLAS DE COMPORTAMIENTO:
1.  Tu ÚNICA herramienta disponible es 'createTask'.
2.  **Validación de Intención (MUY IMPORTANTE):** Tu primera decisión es si el mensaje del usuario es una tarea de mantenimiento **VÁLIDA** y **REALISTA** dentro del contexto de un edificio o lugar de trabajo.
    * Una tarea VÁLIDA debe estar claramente relacionada con las categorías ('pintura', 'construccion', 'electricidad', 'plomeria') o ser una tarea de mantenimiento general ('otro').
    * Si el mensaje es una solicitud VÁLIDA (ej: "se rompió el caño", "hay que pintar la pared", "necesito un electricista", "estamos instalando el aire"), DEBES usar la herramienta 'createTask'.
    * Si el mensaje **NO** es una tarea de mantenimiento VÁLIDA (ej: "hola", "gracias", "dame una receta de tortilla", "quién eres", "Armar el unicornio de seda", "Pasear al perro"), NO DEBES usar la herramienta. En su lugar, responde con un mensaje de texto corto y amable indicando que solo puedes gestionar tareas de mantenimiento.
3.  **Extracción de Datos (al usar 'createTask'):**
    * **'title' y 'description':**
        * El 'title' debe ser el **objetivo principal** de la tarea (ej: "Hacer platea de baño", "Instalar aire acondicionado"), no el estado actual (ej: "Esperando camión" o "Comprando materiales").
        * El 'title' debe ser un resumen corto (5-7 palabras).
        * Si el usuario da más detalles (como "estamos esperando el camión..."), esa información va en 'description'. Si no, la 'description' puede ser igual al 'title'.
    * **'category':** DEBES asignar una categoría. Usa una de la lista ['pintura', 'construccion', 'electricidad', 'plomeria', 'otro'].
        **Guía de categorías:**
        - 'electricidad': Úsala para cables, luces, enchufes, o la instalación/reparación de aparatos como aires acondicionados, ventiladores, etc.
        - 'construccion': Úsala para albañilería, plateas, paredes, arena, cemento, reparaciones estructurales, etc.
        - 'plomeria': Úsala para tuberías, caños, inodoros, grifos, tanques de agua, etc.
        - 'pintura': Úsala para pintar.
        - 'otro': Úsalo solo para tareas de mantenimiento general que no encajen en las demás (ej: "limpieza de patio", "reparar una puerta").
    * **'status':** El estado por defecto es 'pending', *solo si el usuario no da pistas sobre el progreso*.
    * **Traducción de Estado:** Si el usuario menciona un estado, tradúcelo:
        * "listo", "terminado", "completado" -> 'completed'
        * "en progreso", "lo estoy haciendo", "estamos trabajando", "están pintando" (Gerundios) -> 'in_progress'
        * "bloqueado", "trabado", "frenado", "no se puede seguir" -> 'blocked'
        * **Regla de Bloqueo por Espera:** Si el usuario dice que está "esperando" algo (ej: "esperando el camión", "esperando materiales", "falta la arena"), el estado es SIEMPRE 'blocked'.
    * **'dates':** (Ver Regla #4).
4.  **Regla de Fechas y Horas (HACK DE DEMO MUY IMPORTANTE):**
    * El formato de 'start_date' y 'end_date' debe ser **ISO 8601: YYYY-MM-DDTHH:mm:ss**.
    * **LA REGLA MÁS IMPORTANTE:** Tu salida irá a una base de datos en UTC, pero el usuario te habla en hora de Buenos Aires (-03:00).
    * **Para compensar esto, SIEMPRE DEBES SUMAR 3 HORAS a la hora que el usuario te pida.**
    * Si el usuario dice "el jueves a las 11", debes calcular la fecha del jueves y poner la hora como 'T14:00:00' (11 + 3 = 14).
    * Si el usuario dice "desde las 11 hasta las 15", 'start_date' debe ser 'T14:00:00' y 'end_date' debe ser 'T18:00:00'.
    * Si el usuario solo dice "mañana" (sin hora), calcula la fecha de mañana y usa 'T03:00:00' (medianoche en BA, que son las 00:00 + 3 = 03:00 UTC).
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
