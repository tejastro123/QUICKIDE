# Stage 1: Build static assets
FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy production build assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx configuration if needed, otherwise use default
# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
