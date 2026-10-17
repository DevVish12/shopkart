# Single-service image: backend serves the API + the built storefront (SERVE_FRONTEND=true).
# NOTE: Hugging Face Spaces (Docker) requires the app on port 7860.
# Other hosts: override with the PORT env var.
FROM node:20-alpine
WORKDIR /app

# Install deps first (better layer caching).
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY package.json ./
RUN npm --prefix backend install --no-audit --no-fund \
 && npm --prefix frontend install --no-audit --no-fund

# Copy source and build the storefront.
COPY backend ./backend
COPY frontend ./frontend
RUN npm --prefix frontend run build

ENV NODE_ENV=production \
    SERVE_FRONTEND=true \
    PORT=7860
EXPOSE 7860
CMD ["npm", "--prefix", "backend", "start"]
