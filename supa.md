1. Tabla: clients

id (uuid, PK)

client_name (text)

client_surname (text)

client_cellnumber (text)

admin_id (uuid, FK → auth.users.id)

2. Tabla: workers

employer_id (uuid, FK → auth.users.id)

worker_name (text)

worker_cellnumber (text)

profesion (text)

worker_id (uuid, PK)

worker_surname (text)

3. Tabla: suppliers

id (uuid, PK)

name (varchar)

address (text)

category (supplier_category enum)

phone (text)

description (text)

email (text)

image (text)

website (text)

4. Tabla: sites

id (uuid, PK)

address (text)

created_at (date)

5. Tabla: profiles

id (uuid, PK, FK → auth.users.id)

name (text)

avatar_url (text)

whatsapp_id (text)

email (text)

is_premium (bool)

6. Tabla: tasks

id (uuid, PK)

user_id (uuid, FK → auth.users.id)

created_at (timestamp)

title (text)

description (text)

status (task_status enum)

category (task_category enum)

start_date (timestamptz)

end_date (timestamptz)

site_id (uuid, FK → sites.id)

7. Tabla: assigned_to

(Asigna trabajadores a tareas)

worker_id (uuid, FK → workers.worker_id)

task_id (uuid, FK → tasks.id)
PK compuesta: (worker_id, task_id)

8. Tabla: task_dependencies

(Dependencias entre tareas: blocked / blocker)

blocker_id (uuid, FK → tasks.id)

blocked_id (uuid, FK → tasks.id)
PK compuesta: (blocker_id, blocked_id)

9. Tabla: working_at

(Relación trabajador ↔ sitio)

worker_id (uuid, FK → workers.worker_id)

site_id (uuid, FK → sites.id)
PK compuesta: (worker_id, site_id)

10. Tabla: belongs_to

(Relación usuario ↔ sitio con rol)

user_id (uuid, FK → auth.users.id)

site_id (uuid, FK → sites.id)

role (user_role enum)
PK compuesta: (user_id, site_id)

11. Tabla: invitations

id (uuid, PK)

email (varchar)

site_id (uuid, FK → sites.id)

role (user_role enum)

token (varchar)

expires_at (timestamptz)

accepted (bool)

created_at (timestamptz)

updated_at (timestamptz)

12. Tabla: purchases

id (uuid, PK)

created_at (timestamptz)

site_id (uuid, FK → sites.id)

user_id (uuid, FK → auth.users.id)

product (text)

description (text)

quantity (int2)

price (float4)

supplier (text)

status (purchase_status enum)

purchase_date (timestamptz)

delivery_date (timestamptz)

category (purchase_category enum)

priority (purchase_priority enum)

unity (purchase_unity enum)

13. Tabla: purchase_images

image_url (text)

purchase_id (uuid, FK → purchases.id)
PK compuesta: (image_url, purchase_id)

14. Tabla: updates

id (uuid, PK)

created_at (timestamptz)

user_id (uuid, FK → auth.users.id)

title (text)

description (text)

image_url (text)

site_id (uuid, FK → sites.id)

🔗 Resumen de Relaciones Clave
Usuarios (auth.users)

Se relacionan con:

profiles (1:1)

tasks (1:N)

purchases (1:N)

updates (1:N)

belongs_to (N:M con sites)

Workers

Trabajan en sitios (working_at, N:M)

Están asignados a tareas (assigned_to, N:M)

Tasks

Dependencias entre sí (task_dependencies, N:M)

Tienen trabajadores asignados (assigned_to, N:M)

Pertenecen a un sitio (N:1)

Pertenecen a un usuario creador (N:1)

Purchases

Pertenecen a un sitio (N:1)

Pertenecen a un usuario (N:1)

Tienen imágenes (purchase_images, 1:N)

Sites

Tienen usuarios con roles (belongs_to)

Tienen workers asociados (working_at)

Tienen tasks

Tienen purchases

Tienen updates

1. ENUM: task_status

Define el estado actual de una tarea.

completed

pending

blocked

in_progress

changes

rejected

Usado en: tasks.status

2. ENUM: user_role

Roles posibles de un usuario dentro de un sitio.

admin

client

Usado en: belongs_to.role, invitations.role

3. ENUM: task_category

Categorías de tarea dentro de los sitios.

electricidad

plomeria

construccion

pintura

Usado en: tasks.category

4. ENUM: purchase_status

Estado del proceso de compra.

pending

purchased

delivered

Usado en: purchases.status

5. ENUM: supplier_category

Clasificación del tipo de proveedor.

canalones y cemento

materiales eléctricos

pinturas y acabados

plomería y sanitarios

herramientas y equipos

maderas y carpintería

Usado en: suppliers.category

6. ENUM: purchase_category

Categorías de los insumos o compras.

materiales

herramientas

equipamiento

seguridad

oficina

otros

Usado en: purchases.category

7. ENUM: purchase_priority

Prioridad del pedido.

baja

normal

alta

urgente

Usado en: purchases.priority

8. ENUM: purchase_unity

Unidades de medida para las compras.

u

m

m2

m3

kg

l

Usado en: purchases.unity