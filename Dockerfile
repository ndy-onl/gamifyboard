FROM node:18-alpine as builder

WORKDIR /app

# Define build argument for source commit
ARG SOURCE_COMMIT
ARG VITE_APP_API_URL
ENV VITE_APP_API_URL=$VITE_APP_API_URL

# Install git
RUN apk add --no-cache git openssh-client

# Copy package.json and yarn.lock from root
COPY package.json yarn.lock ./

# Copy the excalidraw-app directory
COPY excalidraw-app excalidraw-app

# Copy .eslintrc.json and packages
COPY .eslintrc.json .
COPY tsconfig.json .
COPY .env.development .
COPY .env.production .

COPY packages packages
COPY scripts scripts
COPY public public

# Install dependencies in the root and then in excalidraw-app, and run build
RUN yarn install --frozen-lockfile && \
    yarn build:packages && \
    cd excalidraw-app && \
    yarn install --frozen-lockfile && \
    VITE_APP_GIT_SHA=$SOURCE_COMMIT VITE_APP_ENABLE_TRACKING=false VITE_APP_ENABLE_ESLINT=false VITE_APP_API_URL=$VITE_APP_API_URL yarn build:app && \
    yarn build:version

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built files from the builder stage
COPY --from=builder /app/excalidraw-app/dist /usr/share/nginx/html
RUN ls -l /usr/share/nginx/html

# Copy the custom Nginx configuration
RUN cat > /etc/nginx/conf.d/default.conf <<EOF
server {
  listen 80;
  server_name localhost;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files \$uri /index.html;
  }
}
EOF

# Expose port 80 for the web server
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
