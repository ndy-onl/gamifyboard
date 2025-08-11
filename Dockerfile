FROM node:18-alpine as builder

WORKDIR /app

# Define build argument for source commit
ARG SOURCE_COMMIT

# Install git
RUN apk add --no-cache git

# Copy package.json and yarn.lock from root
COPY package.json yarn.lock ./

# Copy the excalidraw-app directory
COPY excalidraw-app excalidraw-app

# Copy .eslintrc.json and packages
COPY .eslintrc.json .
COPY packages packages
COPY scripts scripts
COPY public public

# Install dependencies in the root and then in excalidraw-app, and run build
RUN yarn install --frozen-lockfile && \
    cd excalidraw-app && \
    yarn install --frozen-lockfile && \
    VITE_APP_GIT_SHA=$SOURCE_COMMIT VITE_APP_ENABLE_TRACKING=false VITE_APP_ENABLE_ESLINT=false yarn build:app && \
    yarn build:version

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built files from the builder stage
COPY --from=builder /app/excalidraw-app/build /usr/share/nginx/html

# Expose port 80 for the web server
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
