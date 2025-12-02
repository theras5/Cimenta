# Configuración del Bucket de Avatares en Supabase

## 1. Crear el bucket

Ve a Storage en Supabase Dashboard y crea un nuevo bucket llamado **`avatars`**

Configuración:
- Public bucket: **SÍ** (para permitir URLs públicas)
- File size limit: 2 MB (recomendado)
- Allowed MIME types: image/jpeg, image/png, image/webp

## 2. Políticas de Storage (RLS Policies)

### Policy 1: Permitir a usuarios subir sus propios avatares
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2: Permitir a usuarios actualizar sus propios avatares
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3: Permitir a usuarios eliminar sus propios avatares
```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 4: Permitir lectura pública de avatares
```sql
CREATE POLICY "Public avatar access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

## 3. Actualizar tabla profiles

Asegúrate de que la tabla `profiles` tenga el campo `avatar_url`:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

## 4. Variables de entorno

Agrega estas variables al archivo `.env` de la app móvil:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 5. Instalación de dependencias

Si no está instalado, ejecuta:

```bash
cd apps/expo-app
npm install @supabase/supabase-js
```

## Uso

Los usuarios ahora pueden:
1. Tocar su avatar en el perfil
2. Elegir "Tomar foto" o "Elegir de galería"
3. Si ya tienen foto, pueden elegir "Eliminar foto"
4. La foto se sube automáticamente al bucket `avatars`
5. Se actualiza la URL en la tabla `profiles`
