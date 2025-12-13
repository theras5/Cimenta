import "dotenv/config";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { WAMessage } from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";

// Silenciar warnings de ONNX Runtime (son normales y no afectan la funcionalidad)
if (typeof process !== 'undefined' && process.env) {
    process.env.ORT_LOGGING_LEVEL = 'error'; // Solo mostrar errores, no warnings
}
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Descarga un mensaje de audio con reintentos para manejar errores de cifrado (Bad MAC)
 * @param msg - Mensaje de WhatsApp que contiene el audio
 * @param maxRetries - Número máximo de reintentos (default: 3)
 * @param initialDelay - Delay inicial en ms antes del primer intento (default: 500)
 * @returns Buffer con el audio descargado
 */
async function downloadAudioWithRetry(
    msg: WAMessage,
    maxRetries: number = 5,
    initialDelay: number = 1000
): Promise<Buffer> {
    let lastError: any = null;
    
    // Esperar un poco antes del primer intento para dar tiempo a que el mensaje se descifre completamente
    await new Promise(resolve => setTimeout(resolve, initialDelay));
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const audioBuffer = await downloadMediaMessage(msg, 'buffer', {}) as Buffer;
            
            if (!audioBuffer || audioBuffer.length === 0) {
                throw new Error('Buffer de audio vacío');
            }
            
            return audioBuffer;
        } catch (error: any) {
            lastError = error;
            const errorMessage = error?.message || '';
            const errorStack = error?.stack || '';
            
            // Verificar si es un error de cifrado (Bad MAC)
            const isBadMAC = errorMessage.includes('Bad MAC') || 
                           errorMessage.includes('bad mac') ||
                           errorStack.includes('Bad MAC') ||
                           errorStack.includes('verifyMAC');
            
            // Si no es un error de cifrado o es el último intento, lanzar el error
            if (!isBadMAC || attempt === maxRetries - 1) {
                throw error;
            }
            
            // Calcular delay exponencial: 500ms, 1000ms, 2000ms...
            const delay = initialDelay * Math.pow(2, attempt);
            console.log(`⚠️ Error de cifrado al descargar audio (intento ${attempt + 1}/${maxRetries}). Reintentando en ${delay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError || new Error('No se pudo descargar el audio después de múltiples intentos');
}

const openaiApiKey = process.env.OPENAI_API_KEY;
// Por defecto, usar Whisper local si no hay API key configurada
const useLocalWhisper = process.env.USE_LOCAL_WHISPER !== 'false' && !openaiApiKey 
    ? true 
    : process.env.USE_LOCAL_WHISPER === 'true';

// Cargar OpenAI solo si no estamos usando Whisper local
let OpenAI: any = null;
let openai: any = null;

if (!useLocalWhisper) {
    try {
        OpenAI = require('openai').default;
        if (openaiApiKey) {
            openai = new OpenAI({ apiKey: openaiApiKey });
        }
    } catch (error) {
        console.warn(
            "⚠️ El módulo 'openai' no está instalado. Usando Whisper local por defecto (gratis)."
        );
        console.warn(
            "💡 Para usar Whisper API: npm install openai y configura OPENAI_API_KEY"
        );
    }
}

if (useLocalWhisper) {
    console.log("🎤 Configurado para usar Whisper local (gratis) - @xenova/transformers");
}

/**
 * Transcribe un mensaje de audio de WhatsApp usando Whisper
 * Soporta dos modos:
 * 1. Whisper API de OpenAI (pago, rápido) - requiere OPENAI_API_KEY
 * 2. Whisper local (gratis, más lento) - requiere USE_LOCAL_WHISPER=true y @xenova/whisper
 * @param msg - Mensaje de WhatsApp que contiene el audio
 * @returns Texto transcrito o null si hay error
 */
export async function transcribeAudioMessage(msg: WAMessage): Promise<string | null> {
    if (useLocalWhisper) {
        return await transcribeWithLocalWhisper(msg);
    }

    if (!openai) {
        if (useLocalWhisper) {
            // Si está configurado para usar local pero falló, el error se manejará en transcribeWithLocalWhisper
            return await transcribeWithLocalWhisper(msg);
        }
        throw new Error(
            "OpenAI API no está configurada. Opciones:\n" +
            "1. npm install openai y configura OPENAI_API_KEY en tu .env\n" +
            "2. npm install @xenova/whisper y configura USE_LOCAL_WHISPER=true en tu .env"
        );
    }

    let tempFilePath: string | null = null;

    try {
        // Descargar el audio como buffer con reintentos para manejar errores de cifrado
        const audioBuffer = await downloadAudioWithRetry(msg, 3, 500);
        
        if (!audioBuffer) {
            throw new Error('No se pudo descargar el audio');
        }

        // Crear un archivo temporal para el audio
        // OpenAI SDK necesita un File object, que en Node.js se crea usando un archivo temporal
        tempFilePath = path.join(process.cwd(), `temp_audio_${Date.now()}.ogg`);
        fs.writeFileSync(tempFilePath, audioBuffer);

        // Crear un File object usando el archivo temporal
        // En Node.js 18+, File está disponible globalmente
        // En Node.js 15+, Blob está disponible, pero File solo desde Node 18+
        let audioFile: any;
        if (typeof File !== 'undefined') {
            // Node.js 18+ - usar File directamente
            audioFile = new File(
                [new Uint8Array(audioBuffer)],
                'audio.ogg',
                { type: 'audio/ogg' }
            );
        } else if (typeof Blob !== 'undefined') {
            // Node.js 15-17 - usar Blob y agregar metadata
            const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });
            audioFile = blob as any;
            audioFile.name = 'audio.ogg';
        } else {
            // Fallback: usar el archivo temporal directamente
            // El SDK de OpenAI puede aceptar un path de archivo en algunos casos
            audioFile = fs.createReadStream(tempFilePath) as any;
            audioFile.name = 'audio.ogg';
            audioFile.type = 'audio/ogg';
        }

        // Llamar a la API de Whisper para transcribir
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'es', // Español
            response_format: 'text'
        });

        // La respuesta con response_format: 'text' devuelve directamente un string
        const transcribedText = typeof transcription === 'string' 
            ? transcription 
            : String(transcription);

        return transcribedText.trim() || null;
    } catch (error: any) {
        console.error('Error transcribiendo audio:', error.message);
        throw error;
    } finally {
        // Limpiar archivo temporal
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (e) {
                console.warn('No se pudo eliminar archivo temporal:', tempFilePath);
            }
        }
    }
}

/**
 * Transcribe usando Whisper local (gratis, requiere @xenova/transformers)
 * En Node.js, necesitamos pasar los datos de audio directamente, no un path
 */
async function transcribeWithLocalWhisper(msg: WAMessage): Promise<string | null> {
    let tempOggPath: string | null = null;
    let tempWavPath: string | null = null;
    
    try {
        // Cargar @xenova/transformers dinámicamente (incluye Whisper)
        // @ts-ignore - Importación dinámica, puede no estar instalado
        const { pipeline, AutoProcessor } = await import('@xenova/transformers');
        
        // Descargar el audio con reintentos para manejar errores de cifrado
        const audioBuffer = await downloadAudioWithRetry(msg, 3, 500);
        if (!audioBuffer) {
            throw new Error('No se pudo descargar el audio');
        }

        // Guardar OGG temporal
        tempOggPath = path.join(process.cwd(), `temp_audio_${Date.now()}.ogg`);
        fs.writeFileSync(tempOggPath, audioBuffer);

        // Verificar que ffmpeg esté disponible
        let hasFfmpeg = false;
        try {
            await execAsync('ffmpeg -version');
            hasFfmpeg = true;
        } catch {
            console.warn('⚠️ ffmpeg no está instalado. Intentando procesar directamente...');
        }

        // Convertir OGG a WAV PCM raw usando ffmpeg (necesario para Node.js)
        // Whisper necesita audio a 16kHz, mono, PCM 16-bit
        if (hasFfmpeg) {
            tempWavPath = path.join(process.cwd(), `temp_audio_${Date.now()}.wav`);
            console.log('🎤 Convirtiendo audio a WAV PCM...');
            try {
                await execAsync(
                    `ffmpeg -i "${tempOggPath}" -ar 16000 -ac 1 -acodec pcm_s16le -f wav "${tempWavPath}" -y`
                );
            } catch (error: any) {
                console.warn('⚠️ Error convirtiendo con ffmpeg:', error.message);
                throw new Error('No se pudo convertir el audio. Asegúrate de que ffmpeg esté instalado correctamente.');
            }
        } else {
            throw new Error(
                'ffmpeg es requerido para procesar audio en Node.js.\n' +
                'Instala ffmpeg:\n' +
                '  - Linux: sudo apt-get install ffmpeg\n' +
                '  - macOS: brew install ffmpeg\n' +
                '  - Windows: https://ffmpeg.org/download.html'
            );
        }

        console.log('🎤 Inicializando Whisper local (puede tardar la primera vez)...');
        // Inicializar el pipeline de Whisper
        // Los warnings de ONNX Runtime sobre "Removing initializer" son normales y pueden ignorarse
        const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
        
        console.log('🎤 Transcribiendo audio...');
        
        // Verificar que el archivo WAV existe
        if (!tempWavPath || !fs.existsSync(tempWavPath)) {
            throw new Error('No se pudo crear el archivo WAV para transcripción');
        }

        // Leer el archivo WAV y extraer los datos PCM
        // WAV tiene un header de 44 bytes, luego vienen los datos PCM
        const wavData = fs.readFileSync(tempWavPath);
        const dataOffset = 44; // Header WAV estándar
        const pcmData = wavData.slice(dataOffset);
        
        // Convertir PCM 16-bit signed a Float32Array normalizado (-1.0 a 1.0)
        const samples = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
        const audioFloat32 = new Float32Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
            audioFloat32[i] = samples[i] / 32768.0; // Normalizar a -1.0 a 1.0
        }

        // Transcribir pasando los datos directamente como Float32Array
        const result = await transcriber(audioFloat32, {
            language: 'es',
            task: 'transcribe',
        });

        // El resultado puede ser un objeto o un array
        const transcribedText = Array.isArray(result) 
            ? result[0]?.text?.trim() || null
            : result?.text?.trim() || null;
        if (transcribedText) {
            console.log('✅ Transcripción completada');
        }
        return transcribedText;
    } catch (error: any) {
        if (error.message?.includes('Cannot find module') || error.code === 'MODULE_NOT_FOUND') {
            throw new Error(
                '❌ Para usar Whisper local (gratis), instala:\n' +
                '   npm install @xenova/transformers\n\n' +
                '💡 También necesitas ffmpeg: sudo apt-get install ffmpeg (Linux) o brew install ffmpeg (macOS)\n' +
                '💡 O usa Whisper API configurando OPENAI_API_KEY en tu .env'
            );
        }
        if (error.message?.includes('AudioContext')) {
            throw new Error(
                '❌ Error: @xenova/transformers necesita ffmpeg en Node.js.\n' +
                '   Instala ffmpeg:\n' +
                '   - Linux: sudo apt-get install ffmpeg\n' +
                '   - macOS: brew install ffmpeg\n' +
                '   - Windows: https://ffmpeg.org/download.html\n\n' +
                '   Luego reinicia el bot.'
            );
        }
        console.error('Error transcribiendo con Whisper local:', error.message);
        throw error;
    } finally {
        // Limpiar archivos temporales
        [tempOggPath, tempWavPath].forEach(filePath => {
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch (e) {
                    console.warn('No se pudo eliminar archivo temporal:', filePath);
                }
            }
        });
    }
}

