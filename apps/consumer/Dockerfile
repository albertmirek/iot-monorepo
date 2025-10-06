FROM node:24.2.0-alpine AS runtime

FROM runtime AS dev
RUN apk --no-cache add make=~4.4 bash=~5.2 git=~2.49
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/producer/package.json ./apps/producer/package.json
COPY apps/consumer/package.json ./apps/consumer/package.json
COPY packages/ ./packages/
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY apps/producer/ ./apps/producer/
COPY apps/consumer/ ./apps/consumer/
WORKDIR /app/apps/consumer
CMD [ "pnpm", "start:debug" ]

FROM runtime as prod
#TODO
