# Production Dockerfile for KPIMS on Google Cloud Run
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build frontend assets and server bundle
RUN npm run build

# Set environment variables for Cloud Run
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Cloud Run defaults to listening on port 3000 or the dynamically injected $PORT
EXPOSE 3000

# Run the production server binding to 0.0.0.0:3000
CMD ["node", "server.js", "--host", "0.0.0.0", "--port", "3000"]
