# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM deps AS build
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run prisma:generate || npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
# 필요 라이브러리 복사
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

ENV PORT=3000
EXPOSE 3000

# 마이그레이션 후 앱 실행
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
