# Prayer Calendar Web Application

This project is a **web application for organizing a prayer calendar**, designed with a minimal but powerful
stack. It combines a **Go backend** with an **embedded database** and a **React frontend**. The business logic design
focus lies on anonymity, allowing for organization without requiring the management of user accounts and similar.

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

## Notes

- Because I was not careful regarding dates, everything is technically handled as UTC, which is largely no issue, 
since this project only deals with a single timezone, but it needs to be kept in mind that it may cause issues

---

## TODOs

- [x] Finish FAQ
- [x] Fill Impressum
- [x] GitHub Link (Impressum)
- [x] Home Page
- [x] More admin events (analog to blocker)
- [x] Querying email addresses for admin purposes (recent emails, all emails)
- [x] Additional volunteer email list for short term cancellation (ideally automated emails)
  - https://resend.com/home
  - [x] Volunteer registration on home page
  - [x] Admin function to remove volunteer
  - [x] Send confirmation email to volunteer on registration
  - [x] Send email on cancellation
- [ ] Fill missing information (TODOs)
- [x] Different colors for events
  - Blocker - grey
  - Messe - red
  - Lobpreis - purple
  - Event - green
- [x] Offer end date input for series as alternative to repetitions
- [ ] Re-examine the layout for different resolutions
  - centering of the text
  - size of the image
  - size of the text
- [ ] Offer an English version of the website
  - [ ] Also offer English notifications on signup
- [x] Send emails on entering an entry
  - slight adaption, only send to volunteers, because otherwise emails could be misused
  - [x] Send the time information in the email so it can be directly entered into Google Calendar etc.
- [ ] For E-Mail confirmation (`GetVolunteerConfirmation`) add better html or maybe reroute to special page in frontend

## Bugs

- [x] For admin events, don't require/read-only the name/email fields
- [x] Entering entries as admin doesn't show you all the information, only after reload (client state issue)