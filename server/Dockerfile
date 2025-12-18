# Render Server Dockerfile
# For deployment on Railway, Render.com, Fly.io, etc.

FROM node:20-slim

# Install dependencies for Remotion (Chromium)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Chromium path for Remotion
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for tsx)
RUN npm ci

# Copy source files
COPY . .

# Create temp directories
RUN mkdir -p server/temp/media server/temp/output server/temp/uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start server
CMD ["npm", "run", "server"]
