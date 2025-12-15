FROM node:20-slim

# 1. Instalar FFmpeg y dependencias del sistema
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# 2. Configurar la raíz del proyecto (Simulando el Monorepo)
WORKDIR /app

# 3. Copiar los archivos de definición de paquetes (Root + Librería interna + Bot)
# El asterisco * en package-lock.json evita error si no existe
COPY package.json package-lock.json* ./
COPY packages/dtos/package.json ./packages/dtos/
COPY bot/package.json ./bot/

# 4. Instalar dependencias
# Quitamos "--production" para asegurar que se instalen herramientas de compilación (TypeScript) si las usas.
RUN npm install

# 5. Copiar el código fuente completo
COPY packages/dtos ./packages/dtos
COPY bot ./bot

# 6. Entrar a la carpeta del bot
WORKDIR /app/bot

# 7. Build (Truco de seguridad)
# Si tu proyecto es TypeScript y tiene un script "build", esto lo compilará.
# Si es JS puro y no tiene script build, esto simplemente no hará nada y seguirá sin error.
RUN npm run build --if-present

# 8. Comando de inicio
# IMPORTANTE: Asegúrate de que en bot/package.json tengas un script "start"
CMD ["npm", "start"]