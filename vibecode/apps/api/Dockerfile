# API Dockerfile
# Works standalone or with Railway NIXPACKS from apps/api directory

FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies using npm (Railway-compatible)
COPY package.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy migration files for runtime
COPY src/db/migrations ./src/db/migrations

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000
CMD ["node", "dist/server.js"]
