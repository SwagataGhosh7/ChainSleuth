/**
 * Vercel Serverless Function Handler for ChainSleuth
 * Automatically routes all /api/* requests to the Express API router.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createApiRouter } from '../backend/src/server.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mount router under both /api and root / to seamlessly handle
// both rewritten Vercel requests (/api/chat) and stripped sub-paths (/chat)
app.use('/api', createApiRouter());
app.use('/', createApiRouter());

export default app;
