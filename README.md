# Prayer Calendar Web Application

This project is a **web application for organizing a prayer calendar**, designed with a minimal but powerful
stack. It combines a **Go backend** with an **embedded database** and a **React frontend**.

---

## Backend

The backend is implemented in **vanilla Go**, without any third-party web frameworks. Its main responsibilities include:

- Exposing APIs for managing time slots.
- Persisting data in an embedded SQLite database.
- Serving the frontend bundle

This design ensures a **lightweight, self-contained server** with no external database dependencies.

---

## Frontend

The frontend is built with **TypeScript + React**, powered by **Vite.js** for fast development and builds.

Key aspects:
- **React** is used in its plain form (no SSR, no Next.js), since the app is a **static-generated SPA**.
- The UI focuses on clarity and interactivity while remaining lightweight.

---

## Deployment

Deployment is designed to be simple and containerized using docker and docker-compose:

``` bash
cd docker
docker-compose up --build
```

The Go webserver will:

- Serve the **compiled frontend bundle** as static assets.
- Handle API requests and database access.

This makes the entire application self-contained, requiring only Docker to run.

---

## Tech Stack Overview

-   **Backend**: Go (vanilla) + SQLite
-   **Frontend**: TypeScript + React + Vite
-   **Deployment**: Docker & Docker Compose

---

## TODOs

- [ ] Finish FAQ
- [ ] Fill Impressum
- [ ] GitHub Link (Impressum)