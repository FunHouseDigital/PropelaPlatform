# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files for dependency install
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Public Vite configuration is embedded into the static bundle at build time.
# These values are intentionally limited to browser-safe VITE_ variables.
ARG VITE_ENVIRONMENT=production
ARG VITE_LOG_LEVEL=error
ARG VITE_FEATURE_FLAGS=
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=
ENV VITE_ENVIRONMENT=${VITE_ENVIRONMENT}
ENV VITE_LOG_LEVEL=${VITE_LOG_LEVEL}
ENV VITE_FEATURE_FLAGS=${VITE_FEATURE_FLAGS}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Build through the required-config guard. When SUPABASE_BACKEND is enabled,
# missing public Supabase configuration fails the image build.
RUN npm run build:vercel

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
