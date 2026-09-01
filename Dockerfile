# 构建阶段
FROM oven/bun:1.2.5 AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/adapters/package.json packages/adapters/
COPY packages/db/package.json packages/db/
COPY packages/sync/package.json packages/sync/
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# 运行阶段：adapter-node 已打包依赖，不再拷贝跨 libc 的 node_modules
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV RV_DATA_DIR=/app/packages/data
ENV RV_COVER_DIR=/app/.cache/covers
RUN addgroup -S rv && adduser -S rv -G rv
COPY --from=build /app/apps/web/build ./build
COPY --from=build /app/apps/web/package.json ./package.json
# 曲库不进镜像：运行时挂 volume 到 RV_DATA_DIR，由 sync:songs 从上游写入
RUN mkdir -p /app/packages/data /app/.cache/covers && chown -R rv:rv /app/packages/data /app/.cache
USER rv
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build"]
