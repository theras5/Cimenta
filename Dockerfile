FROM node:20-slim

# 1. Instalar dependencias del sistema (FFmpeg)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# 2. Establecemos el directorio raíz de trabajo
WORKDIR /app

# --- AQUÍ ESTÁ EL TRUCO PARA MONOREPOS ---

# 3. Copiamos los package.json del root (si usas workspaces) y de la librería
COPY package*.json ./
COPY packages/dtos/package*.json ./packages/dtos/

# 4. Copiamos el código fuente de la librería interna
# (Asegúrate que la ruta 'packages/dtos' sea la real en tu proyecto)
COPY packages/dtos ./packages/dtos

# 5. Copiamos el package.json del bot
COPY bot/package*.json ./bot/

# 6. Copiamos el código del bot
COPY bot ./bot

# 7. Instalamos dependencias DESDE LA RAÍZ (importante para workspaces)
# Si no usas workspaces, puedes hacer WORKDIR /app/bot y npm install ahí,
# pero necesitarás que la ruta relativa hacia ../packages/dtos sea válida.
RUN npm install --production

# 8. Nos movemos a la carpeta del bot para ejecutarlo
WORKDIR /app/bot

# 9. Comando de inicio
CMD ["node", "src/index.js"]