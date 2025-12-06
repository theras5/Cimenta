-- Migración para agregar campos de suscripción a la tabla profiles
-- Ejecutar en Supabase SQL Editor

-- Agregar campo para estado premium
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Agregar campo para guardar el ID de suscripción de Mercado Pago
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT;

-- Agregar campo updated_at si no existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Índice para búsquedas por subscription_id (opcional, mejora performance)
CREATE INDEX IF NOT EXISTS idx_profiles_mp_subscription_id 
ON profiles(mp_subscription_id);

-- Comentarios descriptivos
COMMENT ON COLUMN profiles.is_premium IS 'Indica si el usuario tiene suscripción premium activa';
COMMENT ON COLUMN profiles.mp_subscription_id IS 'ID de la suscripción en Mercado Pago';
