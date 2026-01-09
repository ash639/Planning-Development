import express from 'express';
import cors from 'cors';
import { Env } from './config/env.config';
import { AuthController } from './modules/auth/auth.controller';

const app = express();

// global middlewares
app.use(express.json());
app.use(cors());

import { VisitsController } from './modules/visits/visits.controller';
import { LocationsController } from './modules/locations/locations.controller';
import { UsersController } from './modules/users/users.controller';

import { OrganizationsController } from './modules/organizations/organizations.controller';
import { AuditLogsController } from './modules/audit-logs/audit-logs.controller';
import { ReportsController } from './modules/reports/reports.controller';

// Routes
app.use('/auth', AuthController);
app.use('/visits', VisitsController);
app.use('/locations', LocationsController);
app.use('/users', UsersController);
app.use('/organizations', OrganizationsController);
app.use('/audit-logs', AuditLogsController);
app.use('/reports', ReportsController);

// health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all for dev
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  // room = organization ID or agent ID
  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  // Receive location update from agent
  socket.on('send_location', (data) => {
    // data: { room, agentId, lat, lng, timestamp }
    // Broadcast to everyone in the room (e.g. admin dashboard)
    io.to(data.room).emit('update_location', data);
  });

  // Simulation trigger (for demo)
  socket.on('start_simulation', (data) => {
    const { room } = data;
    console.log(`Starting simulation for room ${room}`);
    let lat = 28.6139; // New Delhi
    let lng = 77.2090;

    const interval = setInterval(() => {
      lat += (Math.random() - 0.5) * 0.001;
      lng += (Math.random() - 0.5) * 0.001;
      io.to(room).emit('update_location', {
        agentId: 'simulated-agent',
        lat,
        lng,
        timestamp: new Date().toISOString()
      });
    }, 2000);

    // Stop after 60s to save resources
    setTimeout(() => clearInterval(interval), 60000);
  });
});

// start server
httpServer.listen(Env.PORT, () => {
  console.log(`Backend running on http://localhost:${Env.PORT}`);
});
