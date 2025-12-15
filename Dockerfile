FROM node:20-slim

# Instalar FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Crear directorio de la app
WORKDIR /app

# 1. Copiamos los package.json desde la carpeta 'bot'
COPY bot/package*.json ./

# 2. Instalamos dependencias
RUN npm install --production

# 3. Copiamos el código fuente desde la carpeta 'bot'
COPY bot/ .

# Comentario: No exponemos puerto porque es un Worker
# EXPOSE 3000 <-- Eliminado

# Comando de inicio
# Asegúrate de que la ruta sea correcta RELATIVA a /app.
# Si dentro de 'bot' tienes 'src/index.js', entonces esto es correcto:
CMD ["node", "src/index.js"]