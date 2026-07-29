import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import campaignRoutes from './routes/campaigns.js';
import contactRoutes from './routes/contacts.js';
import callRoutes from './routes/calls.js';
import analyticsRoutes from './routes/analytics.js';
import crmRoutes from './routes/crm.js';
import geminiRoutes from './routes/gemini.js';
import paymentRoutes from './routes/payments.js';
import agentRoutes from './routes/agents.js';
import notificationRoutes from './routes/notifications.js';
import systemRoutes from './routes/system.js';
import searchRoutes from './routes/search.js';
import promptRoutes from './routes/prompts.js';
import voiceRoutes from './routes/voices.js';
import knowledgeRoutes from './routes/knowledge.js';
import transcriptRoutes from './routes/transcripts.js';
import fdeRoutes from './routes/fde.js';
import recordingRoutes from './routes/recordings.js';
import insightRoutes from './routes/insights.js';
import reportRoutes from './routes/reports.js';
import logRoutes from './routes/logs.js';
import settingsRoutes from './routes/settings.js';
import demoRoutes from './routes/demo.js';
import outboundRoutes from './routes/outbound.js';
import sarvamRoutes from './routes/sarvam.js';
import sarvamWebhookRoutes from './routes/sarvamWebhook.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://3qxefbbq.insforge.site',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)), credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/fde', fdeRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/outbound', outboundRoutes);
app.use('/api/sarvam', sarvamWebhookRoutes); // unauthenticated: verified by shared secret
app.use('/api/sarvam', sarvamRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });
  socket.on('join:campaign', (campaignId: string) => {
    socket.join(`campaign:${campaignId}`);
  });
  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

export { io };
