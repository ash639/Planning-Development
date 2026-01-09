# Field Visit System - Project Report

## 1. Executive Summary
The **Field Visit System** is a comprehensive digital solution designed to streamline the management, tracking, and reporting of field operations. It replaces manual, paper-based processes with a robust mobile and web application that ensures data integrity, real-time visibility, and operational efficiency for field agents and administrators.

The system addresses critical challenges such as unverifiable field visits, lack of real-time monitoring, and inefficient tour planning. By leveraging modern technologies like GPS geofencing, live WebSocket tracking, and automated PDF reporting, the platform provides a transparent and accountable environment for field operations.

---

## 2. Key Objectives
*   **Integrity & Accountability**: Enforce mandatory GPS checks for all visit activities (check-in/check-out) to prevent fraudulent reporting.
*   **Real-Time Monitoring**: Provide administrators with a live map view of all active agents and their current status.
*   **Operational Efficiency**: Simplify tour planning for agents with smart filtering and scheduling tools.
*   **Automated Reporting**: Generate professional, verifiable PDF reports instantly upon visit completion.
*   **Data Accuracy**: Maintain a centralized, rigorous database of stations with precise location data.

---

## 3. System Architecture
The interconnected system consists of three main components:

### A. Mobile Application (Field Agents)
*   **Cross-Platform**: Built with React Native & Expo for Android and iOS.
*   **Tour Planning**: Agents can filter stations by District/Block and create daily visit schedules.
*   **Visit Execution**: Geo-fenced "Check-In" and "Check-Out" workflows that require the agent to be physically present at the station coordinates.
*   **Evidence Capture**: Integrated camera features for photo documentation.
*   **Offline Resilience**: Essential features work with local caching when network connectivity is poor.

### B. Admin Dashboard (Web)
*   **Super Admin & Org Admin Roles**: Hierarchical access control.
*   **Live Map**: Real-time fleet tracking using Google Maps and WebSockets.
*   **Data Management**: Tools to manage Users (Agents/Admins) and Organizations.
*   **Analytics**: Visual dashboards for visit statistics, agent performance, and system health.
*   **Report Repository**: Centralized access to all generated visit reports.

### C. Backend API & Database
*   **RESTful API**: Secure endpoints for all client-server communication.
*   **Real-time Engine**: Socket.io server for live location streaming.
*   **PDF Engine**: Server-side generation of tamper-proof visit reports.
*   **Database**: Relational database (SQLite/PostgreSQL) managed via Prisma ORM for data integrity.

---

## 4. Technology Stack

### Frontend (Mobile & Web)
*   **Framework**: React Native (v0.73) with Expo SDK 50
*   **Routing**: Expo Router v3
*   **Language**: TypeScript
*   **State Management**: Zustand
*   **Maps**: Google Maps API & `react-native-maps`
*   **Networking**: Axios & Socket.io-client

### Backend (Server)
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Language**: TypeScript
*   **ORM**: Prisma Client
*   **Authentication**: JWT (JSON Web Tokens) & BCrypt
*   **Real-time**: Socket.io
*   **Reporting**: PDFKit

### Database & Infrastructure
*   **Database**: SQLite (Dev) / PostgreSQL (Prod ready)
*   **Versioning**: Git
*   **Environment**: Node.js LTS

---

## 5. Key Features Implemented

### 1. Geo-Fenced Visit Verification
*   Agents cannot check in unless they are within a specific proximity (e.g., 500m) of the station's registered GPS coordinates.
*   The system calculates and records the precise distance between the agent and the station for audit purposes.

### 2. Live Agent Tracking
*   Super Admins can view a live dashboard showing the real-time location of all active agents.
*   The map features clustered markers, traffic layers, and interactive agent info cards.

### 3. Smart Tour Planning
*   Agents can browse the master station list (imported via CSV) and create "Tour Plans".
*   The system prevents duplicate planning and prioritizes "In Progress" visits on the dashboard.

### 4. Professional "Integrity Reports"
*   Upon visit completion, a PDF is automatically generated.
*   **Report Content**:
    *   **Station Details**: Name, Station #, Type, District, Block.
    *   **Integrity Metrics**: Check-in/out timestamps, GPS coordinates, and calculated proximity.
    *   **Observations**: Technical status (Battery, Solar Panel, etc.) and photos.
    *   **Verification Stamp**: Digital signature verifying the system-generated nature of the report.

### 5. Data Management (CSV Import)
*   Bulk import functionality to onboard thousands of stations from BMSK/Master CSV files.
*   Mappings for Station Number, Zone, District, Block, and GPS coordinates.

---

## 6. Future Enhancements (Roadmap)
*   **Offline-First Sync**: Enhanced synchronization queue for completely disconnected remote areas.
*   **Route Optimization**: AI-suggested routes for agents based on their selected stations.
*   **Biometric Auth**: Fingerprint/FaceID login for agents.
*   **Push Notifications**: Alerts for assigned visits or urgent station maintenance.

---

## 7. Conclusion
The Field Visit System is a scalable and secure platform that modernizes field operations. By enforcing digital verification and providing real-time insights, organizations can significantly improve the productivity of their field workforce and the reliability of their data.

---

## 8. Deployment Strategy

The system is designed for containerized deployment using **Docker**, ensuring consistency across development and production environments.

### Docker Architecture
The project is containerized into two distinct services managed by `docker-compose`:

1.  **Backend Container (`field_visit_backend`)**:
    *   Built on `node:20-alpine`.
    *   Auto-generates Prisma client and builds TypeScript source.
    *   Exposes the API on port 3000.
    *   Persistent storage for the SQLite database (or connection to external Postgres).

2.  **Frontend Container (`field_visit_frontend`)**:
    *   Multi-stage build process.
    *   **Stage 1**: Builds the React Native/Expo web bundle using `npx expo export -p web`.
    *   **Stage 2**: Serves the static assets using a high-performance **Nginx** server.
    *   Includes custom Nginx configuration to handle Single Page Application (SPA) routing.

### Production Verification
To deploy to a live server, the system uses build-time arguments to inject the API URL.

**Configuration (`docker-compose.yml`)**:
To move from local testing to a production server, only the `EXPO_PUBLIC_API_URL` arg needs to be updated:

```yaml
frontend:
  build:
    context: ./field-visit-app
    args:
      # Update this to the Public IP or Domain of the server
      - EXPO_PUBLIC_API_URL=http://YOUR_SERVER_IP:3000
```

**Deployment Command**:
```bash
docker-compose up --build -d
```
The `--build` flag is critical to ensure the frontend static assets are regenerated with the correct production API endpoints.
