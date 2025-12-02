# Bot de WhatsApp - Cimenta

Bot de WhatsApp para gestionar tareas y obtener resúmenes de obras.

## Comandos Disponibles

### 1. Crear Tarea
```
crear tarea: [título]
descripcion: [descripción]
categoria: [electricidad, plomeria, construccion, pintura]
urgente: [si, no]
estado: [changes, pending, in_progress, completed, blocked]
```

**Ejemplo:**
```
crear tarea: Reparar fuga de agua
descripcion: Hay una fuga en la cocina
categoria: plomeria
urgente: si
estado: pending
```

### 2. Cambiar Estado de Tarea
```
cambiar estado: [ID] : [nuevo_estado]
```

**Ejemplo:**
```
cambiar estado: abc123 : completed
```

### 3. Obtener Resumen de Obra (PDF)
```
resumen: [ID de la obra]
```

**Ejemplo:**
```
resumen: 550e8400-e29b-41d4-a716-446655440000
```

El bot generará un PDF con:
- Progreso de tareas (total, completadas, pendientes)
- Breakdown por categorías
- Estado de materiales comprados
- Gráficos visuales

El PDF se enviará automáticamente por WhatsApp.

### 4. Ayuda
```
ayuda
```

Muestra todos los comandos disponibles.

## Configuración

Asegúrate de tener las siguientes variables de entorno configuradas:

```env
API_URL=http://localhost:3000
BYPASS_TOKEN=tu_token_aqui
```

## Ejecución

```bash
npm run dev    # Modo desarrollo
npm run build  # Compilar
npm start      # Producción
```

## Notas

- Los PDFs se generan en el servidor y se envían automáticamente
- Los archivos temporales se eliminan después del envío
- Todos los comandos son case-insensitive
