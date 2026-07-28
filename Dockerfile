# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production stage (frontend served by Vite preview, backend by Express) ----
FROM node:22-alpine AS prod
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/migrate.mjs ./

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "api/index.js"]
