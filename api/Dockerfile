# DevPulse account API. Build from the repository root: docker build -f api/Dockerfile .
FROM oven/bun:1.3.13-slim
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY api ./api
ENV NODE_ENV=production
EXPOSE 3000
USER bun
CMD ["bun", "run", "api/src/main.ts"]
