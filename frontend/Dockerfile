# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Nitro Server Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Security: non-root user
USER node

COPY --chown=node:node --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
