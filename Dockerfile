FROM oven/bun:1 AS base

# Build frontend
FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bun run build

# Install backend deps
FROM base AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile --production

# Final image
FROM base
WORKDIR /app
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["bun", "run", "backend/src/server.ts"]
