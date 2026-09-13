FROM node:22-slim
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && python3 -m pip install --break-system-packages yt-dlp
WORKDIR /app
COPY backend/package*.json backend/
RUN cd backend && npm ci
COPY . .
WORKDIR /app/backend
RUN npm run build
ENV YTDLP_PATH=/usr/local/bin/yt-dlp WORKER_TEMP_DIR=/tmp
CMD ["node", "dist/server.js"]
