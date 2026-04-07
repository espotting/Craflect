FROM node:20-slim
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    bash \
    pkg-config \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*
RUN pip3 install --break-system-packages yt-dlp faster-whisper
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ARG CACHE_BUST=1
RUN echo "Cache bust: $CACHE_BUST"
EXPOSE 3000
CMD ["npm", "start"]
