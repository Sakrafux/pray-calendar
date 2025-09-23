# Stage 1.1: Build Backend
FROM golang:1.25 AS builder-be

WORKDIR /app

COPY ../backend/go.mod ../backend/go.sum ./
RUN go mod download

COPY ../backend/. .

RUN go build -o webserver .

# Stage 1.2: Build Frontend
FROM node:22 AS builder-fe

WORKDIR /app

COPY ../frontend/package*.json ./

RUN npm install

COPY ../frontend/. .

RUN npm run build

# Stage 2: webserver runtime
FROM debian:bookworm-slim as webserver

WORKDIR /app

COPY --from=builder-be /app/webserver .

COPY --from=builder-fe /app/dist ./frontend

# Expose port
EXPOSE 8080

# Default command: run webserver
ENTRYPOINT ["./webserver", "--port", "8080"]