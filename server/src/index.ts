import app from "./app";
import connectToWhatsApp from "./config/baileys";

const PORT = process.env.PORT || 3000;

// app.post('/api/tareas', async (req, res) => {
//     const { nombre, proyecto, descripcion, creado_por } = req.body;

//     console.log('Recibida solicitud para crear tarea:', req.body);

//     if (!nombre || !proyecto) {
//         return res.status(400).json({ message: 'Faltan datos. Se requiere al menos "nombre" y "proyecto".' });
//     }

//     try {
//         // 1. Buscar el ID del proyecto en Supabase
//         const { data: projectData, error: projectError } = await supabase
//             .from('proyectos') // Asume que tienes una tabla "proyectos"
//             .select('id')
//             .eq('nombre', proyecto) // Busca por el nombre del proyecto
//             .single();

//         if (projectError || !projectData) {
//             console.error('Error buscando el proyecto:', projectError);
//             return res.status(404).json({ message: `El proyecto "${proyecto}" no fue encontrado.` });
//         }
        
//         const projectId = projectData.id;

//         // 2. Insertar la nueva tarea en la tabla "tareas"
//         const { data: taskData, error: taskError } = await supabase
//             .from('tareas') // Asume que tienes una tabla "tareas"
//             .insert({
//                 nombre: nombre,
//                 descripcion: descripcion || '', // Usa un string vacío si no hay descripción
//                 id_proyecto: projectId,
//                 creado_por_whatsapp: creado_por,
//                 estado: 'pendiente' // Estado por defecto
//             })
//             .select();

//         if (taskError) {
//             console.error('Error al insertar la tarea:', taskError);
//             return res.status(500).json({ message: `Hubo un error al crear la tarea en la base de datos.` });
//         }

//         console.log('Tarea creada con éxito:', taskData);
//         // 3. Devolver una respuesta de éxito
//         res.status(201).json({ message: `✅ ¡Tarea creada con éxito!\n\n*Tarea*: ${nombre}\n*Proyecto*: ${proyecto}` });

//     } catch (error) {
//         console.error('Error inesperado en el servidor:', error);
//         res.status(500).json({ message: 'Ocurrió un error interno en el servidor.' });
//     }
// });


app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en el puerto ${PORT}`);
    connectToWhatsApp();
});

