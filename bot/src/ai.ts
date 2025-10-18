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
                description: "La categoría del trabajo. 'electricidad' incluye instalación de electrodomésticos.",
                enum: ["pintura", "construccion", "electricidad"]
            },
            status: {
                type: Type.STRING,
                description: "El estado de la tarea. Por defecto debe ser 'pending' a menos que el usuario indique lo contrario (ej: 'ya está listo').",
                // Debe coincidir EXACTAMENTE con los estados de tu DTO
                enum: ["changes", "pending", "in_progress", "completed", "blocked"],
                default: "pending"
            },
            start_date: {
                type: Type.STRING,
                description: "Fecha de inicio (opcional). Formato ISO 8601 (YYYY-MM-DD). Inferir si el usuario dice 'mañana', 'el lunes', etc."
            },
            end_date: {
                type: Type.STRING,
                description: "Fecha de finalización o límite (opcional). Formato ISO 8601 (YYYY-MM-DD). Inferir si el usuario la menciona."
            }
        },
        required: ["title", "category", "status"]
    }
};

const today = new Date();
// Formatea la fecha como YYYY-MM-DD
const todayISO = today.toISOString().split('T')[0];

const systemInstruction = `Eres un asistente IA de WhatsApp para gestionar tareas de mantenimiento. Tu objetivo es ayudar a los usuarios a crear y gestionar tareas.
CONTEXTO DE FECHA CRÍTICO:
- La fecha de HOY (el día que el usuario está escribiendo) es: ${todayISO}.

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
    * **'dates':** Intenta inferir 'start_date' o 'end_date' si el usuario menciona fechas como "mañana", "para el viernes", etc., y conviértelas a formato YYYY-MM-DD.
4.  **Regla de Fechas (MUY IMPORTANTE):**
    * DEBES usar '${todayISO}' como referencia para cualquier fecha relativa.
    * Si el usuario dice "mañana", debes calcular la fecha de mañana (ej: ${todayISO} + 1 día).
    * Si el usuario dice "el lunes" o "el próximo viernes", calcula la fecha YYYY-MM-DD correcta basándote en que HOY es ${todayISO}.
    * El formato de 'start_date' y 'end_date' debe ser SIEMPRE 'YYYY-MM-DD'.
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
    } catch (err) {
        console.error("Error llamando al modelo:", err);
        return null;
    }
}
