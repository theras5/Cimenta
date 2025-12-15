FROM node:20-slim

# 1. Instalar FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- FASE DE DEPENDENCIAS ---

# 2. Copiamos archivos base
# AÑADIDO: tsconfig.json (Necesario para que tsc --build funcione)
COPY package.json package-lock.json* tsconfig.json ./

# 3. Copiamos los package.json de TODOS los paquetes internos
# AÑADIDO: packages/utils (porque el error dice que falta)
COPY packages/dtos/package.json ./packages/dtos/
COPY packages/utils/package.json ./packages/utils/
COPY bot/package.json ./bot/

# 4. Instalar dependencias
RUN npm install

# --- FASE DE CÓDIGO FUENTE ---

# 5. Copiamos el código fuente de los paquetes internos
COPY packages/dtos ./packages/dtos
COPY packages/utils ./packages/utils

# 6. Copiamos el código del bot
COPY bot ./bot

# --- BUILD Y ARRANQUE ---

WORKDIR /app/bot

# 7. Compilación
RUN npm run build --if-present

# 8. Ejecución
CMD ["npm", "start"]