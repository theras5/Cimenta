# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY bot/package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the bot source code
COPY bot/ ./

# Expose port (if your bot listens to a port, e.g. for webhooks)
# EXPOSE 3000

# Command to run your bot (adjust if needed)
CMD ["node", "src/index.js"]
