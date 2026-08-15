# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/Principles.md ./Principles.md
COPY --from=build /app/WhitePaper.md ./WhitePaper.md
COPY --from=build /app/content ./content
COPY --from=build /app/database/schema.sql ./database/schema.sql
COPY --from=build /app/public/whitepaper ./public/whitepaper
COPY --from=build /app/scripts ./scripts

VOLUME ["/app/database"]
EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
