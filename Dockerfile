# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for dependency install
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy custom nginx configuration. nginx.conf `include`s security-headers.conf
# (the single source of truth for the security headers + CSP); it lives outside
# conf.d/ so nginx's default `include conf.d/*.conf;` does not load it as a
# standalone server block.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/security-headers.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
