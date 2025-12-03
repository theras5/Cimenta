# 📱 Capacidades de Mensajes Proactivos con Baileys

## ✅ Respuesta Corta

**SÍ, con Baileys v6.7.20 que estás usando, el bot PUEDE enviar mensajes proactivos:**

1. ✅ **A números que no le hablaron** - Técnicamente posible
2. ✅ **Automáticamente cada cierto tiempo** - Técnicamente posible
3. ✅ **A otros números cuando un usuario envía un comando** - Técnicamente posible

## 🔧 Capacidades Técnicas de Baileys

### 1. Enviar Mensajes a Cualquier Número

Baileys permite enviar mensajes a cualquier número de WhatsApp usando el método `sock.sendMessage()` que ya estás usando. El formato del JID (identificador) es:

```
[código_país][número]@s.whatsapp.net
```

**Ejemplos:**
- Argentina: `5491122473956@s.whatsapp.net` (54 = código país, 91122473956 = número)
- USA: `19999999999@s.whatsapp.net`
- España: `34612345678@s.whatsapp.net`

### 2. Tu Código Actual

Ya tienes la función `safeSendMessage()` que usa `sock.sendMessage()`:

```typescript
async function safeSendMessage(
    sock: WASocket,
    jid: string,
    text: string,
    retries = 2
): Promise<boolean> {
    // ...
    await sock.sendMessage(jid, { text });
    // ...
}
```

**Esta función puede usarse para enviar mensajes a CUALQUIER número**, no solo a quien te escribió.

### 3. Ejemplos de Uso Proactivo

#### A) Enviar mensaje cuando un usuario envía un comando:

```typescript
// Ejemplo: Cuando alguien asigna un worker a una tarea
if (messageText.startsWith('asignar worker')) {
    const workerPhone = '+5491144207634'; // Número del worker
    const workerJid = '5491144207634@s.whatsapp.net';
    
    // Enviar notificación al worker
    await safeSendMessage(sock, workerJid, 
        `🔔 Nueva tarea asignada: ${taskTitle}\n\nObra: ${siteAddress}`
    );
}
```

#### B) Enviar mensajes automáticos cada cierto tiempo:

```typescript
// Ejemplo: Recordatorio diario a las 9 AM
setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 9 && now.getMinutes() === 0) {
        const workers = await getWorkersWithPendingTasks();
        for (const worker of workers) {
            const workerJid = formatPhoneToJid(worker.phone);
            await safeSendMessage(sock, workerJid, 
                `📋 Tienes ${worker.pendingTasks} tareas pendientes hoy`
            );
        }
    }
}, 60000); // Verificar cada minuto
```

#### C) Enviar mensaje a número que nunca te escribió:

```typescript
// Ejemplo: Notificar a un worker nuevo
async function notifyNewWorker(phoneNumber: string, message: string) {
    const jid = formatPhoneToJid(phoneNumber);
    await safeSendMessage(sock, jid, message);
}

// Llamar con cualquier número
await notifyNewWorker('+5491144207634', '¡Bienvenido al equipo!');
```

## ⚠️ Consideraciones Importantes

### 1. Restricciones de WhatsApp

**IMPORTANTE:** Aunque técnicamente es posible, WhatsApp tiene políticas sobre mensajes no solicitados:

- ✅ **Permitido**: Enviar mensajes a números que ya tienen tu contacto guardado
- ✅ **Permitido**: Responder a mensajes recibidos (dentro de 24 horas)
- ⚠️ **Riesgoso**: Enviar mensajes a números que nunca te escribieron (puede resultar en ban)
- ⚠️ **Riesgoso**: Enviar muchos mensajes automáticos (spam)

### 2. Mejores Prácticas

Para evitar problemas con WhatsApp:

1. **Solo notificar a workers registrados**: Que ya tienen relación contigo
2. **Pedir consentimiento**: Que los workers acepten recibir notificaciones
3. **Limitar frecuencia**: No enviar más de 1-2 mensajes por día por worker
4. **Mensajes relevantes**: Solo notificar sobre cosas importantes (tareas asignadas, cambios urgentes)

### 3. Formato de Números

Función helper para convertir números a JID:

```typescript
function formatPhoneToJid(phone: string): string {
    // Remover espacios, guiones, paréntesis, etc.
    let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    
    // Si empieza con 0, removerlo (para números argentinos)
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    
    // Si no tiene código de país, asumir Argentina (54)
    if (!cleaned.startsWith('54') && cleaned.length === 10) {
        cleaned = '54' + cleaned;
    }
    
    return `${cleaned}@s.whatsapp.net`;
}

// Ejemplos de uso:
formatPhoneToJid('+54 9 11 4420-7634') // → '5491144207634@s.whatsapp.net'
formatPhoneToJid('91144207634')        // → '5491144207634@s.whatsapp.net'
formatPhoneToJid('01144207634')        // → '5491144207634@s.whatsapp.net'
```

## 🎯 Casos de Uso Recomendados

### 1. Notificaciones a Workers (Alta Prioridad)

Cuando un usuario asigna un worker a una tarea:

```typescript
async function assignWorkerToTask(workerPhone: string, taskId: string) {
    // ... lógica de asignación ...
    
    // Notificar al worker
    const workerJid = formatPhoneToJid(workerPhone);
    const task = await getTask(taskId);
    
    await safeSendMessage(sock, workerJid, 
        `🔔 Nueva tarea asignada\n\n` +
        `📋 ${task.title}\n` +
        `🏗️ Obra: ${task.site.address}\n` +
        `📅 Fecha: ${formatDate(task.start_date)}\n\n` +
        `Responde "ver tarea" para más detalles.`
    );
}
```

### 2. Recordatorios Programados (Media Prioridad)

Recordatorios diarios a workers con tareas pendientes:

```typescript
// Ejecutar cada día a las 8 AM
function setupDailyReminders(sock: WASocket) {
    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 8 && now.getMinutes() === 0) {
            const workers = await getWorkersWithTasksToday();
            
            for (const worker of workers) {
                const jid = formatPhoneToJid(worker.phone);
                await safeSendMessage(sock, jid,
                    `🌅 Buenos días ${worker.name}!\n\n` +
                    `Tienes ${worker.tasksCount} tareas programadas para hoy.\n` +
                    `Escribe "mis tareas" para ver el detalle.`
                );
                
                // Esperar 2 segundos entre mensajes para evitar rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }, 60000); // Verificar cada minuto
}
```

### 3. Alertas Urgentes (Alta Prioridad)

Notificar cuando una tarea se bloquea o necesita atención:

```typescript
async function notifyUrgentTaskUpdate(workerPhone: string, task: Task) {
    const jid = formatPhoneToJid(workerPhone);
    
    await safeSendMessage(sock, jid,
        `🚨 Atención requerida\n\n` +
        `La tarea "${task.title}" ha sido bloqueada.\n` +
        `Razón: ${task.blockReason}\n\n` +
        `Por favor, revisa y responde.`
    );
}
```

## 📋 Resumen

| Capacidad | ¿Es Posible? | Recomendación |
|-----------|--------------|---------------|
| Enviar a número que no escribió | ✅ Sí (técnicamente) | ⚠️ Solo si tienen relación previa |
| Enviar automáticamente cada X tiempo | ✅ Sí | ✅ Usar con moderación (1-2/día) |
| Enviar cuando usuario envía comando | ✅ Sí | ✅ Recomendado (notificaciones) |
| Enviar a múltiples números | ✅ Sí | ⚠️ Con delays entre mensajes |

## 🔒 Seguridad y Límites

1. **Rate Limiting**: WhatsApp limita mensajes. Tu código ya maneja errores 429.
2. **Bans**: Enviar spam puede resultar en ban de cuenta.
3. **Validación**: Siempre validar que el número existe y es válido antes de enviar.
4. **Logs**: Registrar todos los mensajes enviados para debugging.

## 💡 Recomendación Final

**Para tu caso de uso (notificar workers):**

✅ **SÍ, es totalmente viable** porque:
- Los workers ya tienen relación contigo (están en tu base de datos)
- Son notificaciones relevantes (tareas asignadas)
- No es spam (mensajes ocasionales y útiles)

**Implementación sugerida:**
1. Agregar campo `whatsapp_phone` a la tabla `workers`
2. Crear función `notifyWorker(workerId, message)`
3. Llamar cuando se asigna tarea, cambia estado, etc.
4. Usar delays entre mensajes para evitar rate limiting

