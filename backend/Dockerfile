# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
# Compile or verify TypeScript
RUN npx tsc --noEmit

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: non-root user
USER node

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node --from=builder /app/src ./src
COPY --chown=node:node tsconfig.json ./

EXPOSE 3000

CMD ["node", "--loader", "ts-node/esm", "src/index.ts"]
