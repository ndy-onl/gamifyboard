FROM node:18-alpine as builder

WORKDIR /app

COPY package.json yarn.lock ./

COPY excalidraw-app excalidraw-app

RUN yarn install --frozen-lockfile &&     cd excalidraw-app &&     yarn install --frozen-lockfile &&     yarn run build

FROM nginx:alpine

COPY --from=builder /app/excalidraw-app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]