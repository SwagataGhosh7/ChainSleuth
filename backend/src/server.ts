/**
 * ChainSleuth Backend Express Server & API Router
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { blockchainService, SAMPLE_HEIST_WALLET } from './services/blockchainService.js';
import { dbService } from './services/dbService.js';
import { backboardService } from './services/backboardService.js';
import { aiService } from './services/aiService.js';
import { wsService, HighRiskAlert } from './services/wsService.js';

dotenv.config();

export function createApiRouter() {
  const router = express.Router();

  // GET /api/health
  router.get('/health', async (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: {
        renderApi: {
          status: 'online',
          environment: process.env.NODE_ENV || 'development',
          port: process.env.PORT || 3000,
        },
        digitalOceanPostgres: {
          status: dbService.isConnectedToPostgres ? 'connected' : 'fallback_memory_active',
          ssl: true,
          configured: Boolean(process.env.DATABASE_URL),
        },
        backboardMemory: {
          status: backboardService.isConfigured ? 'active' : 'local_cache_active',
          configured: backboardService.isConfigured,
        },
        polygonscanExplorer: {
          status: blockchainService.hasApiKey ? 'live_api_active' : 'fallback_dataset_active',
          configured: blockchainService.hasApiKey,
          provider: 'Etherscan / Polygonscan v2 API',
        },
        aiInference: {
          status: aiService.hasTinker ? 'tinker_active' : aiService.hasGemini ? 'gemini_active' : 'heuristic_engine_active',
          tinkerConfigured: aiService.hasTinker,
          geminiConfigured: aiService.hasGemini,
          activeModel: aiService.hasTinker ? 'tinker-forensics-v1' : aiService.hasGemini ? 'gemini-3.8-flash / gemini-3.1-flash-lite' : 'deterministic-heuristic-v1',
        },
      },
    });
  });

  // POST /api/scan
  router.post('/scan', async (req: Request, res: Response) => {
    try {
      const { walletAddress, network = 'polygon' } = req.body;
      const targetAddress = walletAddress || SAMPLE_HEIST_WALLET;

      const scanResult = await blockchainService.scanWallet(targetAddress, network);
      const caseId = `case-${targetAddress.slice(2, 10)}-${Date.now()}`;

      // Persist to database/memory
      await dbService.saveInvestigation({
        id: caseId,
        walletAddress: targetAddress,
        network,
        riskScore: scanResult.analysis.riskScore,
        heuristics: scanResult.analysis.detectedPatterns.map((p) => p.id),
        summary: scanResult.summary,
        totalVolumeMatic: scanResult.analysis.totalVolumeMatic,
        totalVolumeUsd: scanResult.analysis.totalVolumeUsd,
        nodeCount: scanResult.analysis.nodes.length,
        edgeCount: scanResult.analysis.edges.length,
        graphData: {
          nodes: scanResult.analysis.nodes,
          edges: scanResult.analysis.edges,
        },
        createdAt: new Date().toISOString(),
      });

      // Synchronize initial root tag in Backboard
      await backboardService.recordMemory(
        caseId,
        targetAddress,
        `Root target wallet scanned with risk score ${scanResult.analysis.riskScore}/100`,
        'summary'
      );

      res.json({
        caseId,
        walletAddress: targetAddress,
        network,
        summary: scanResult.summary,
        riskScore: scanResult.analysis.riskScore,
        riskLevel: scanResult.analysis.riskLevel,
        totalVolumeMatic: scanResult.analysis.totalVolumeMatic,
        totalVolumeUsd: scanResult.analysis.totalVolumeUsd,
        heuristics: scanResult.analysis.detectedPatterns,
        graph: {
          nodes: scanResult.analysis.nodes,
          links: scanResult.analysis.edges,
          edges: scanResult.analysis.edges,
        },
        transactions: scanResult.rawTransactions,
        dataSource: scanResult.source,
      });
    } catch (err: any) {
      console.error('Scan error:', err);
      res.status(500).json({ error: 'Failed to scan wallet address', details: err?.message });
    }
  });

  // POST /api/chat
  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const { caseId, walletAddress, message, selectedNodeId, graphContext } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const activeCaseId = caseId || 'default-case';

      // Save user message to database
      await dbService.saveChatMessage({
        id: `chat-${Date.now()}`,
        caseId: activeCaseId,
        walletAddress,
        role: 'user',
        message,
        createdAt: new Date().toISOString(),
      });

      // Generate AI Reply
      const result = await aiService.generateForensicReply({
        caseId: activeCaseId,
        walletAddress: walletAddress || SAMPLE_HEIST_WALLET,
        message,
        selectedNodeId,
        graphContext,
      });

      // Save AI reply to database
      await dbService.saveChatMessage({
        id: `chat-${Date.now() + 1}`,
        caseId: activeCaseId,
        walletAddress,
        role: 'assistant',
        message: result.reply,
        metadata: { provider: result.provider },
        createdAt: new Date().toISOString(),
      });

      res.json({
        reply: result.reply,
        provider: result.provider,
        memoryUpdated: result.memoryUpdated,
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      res.status(500).json({ error: 'Failed to process forensic chat query', details: err?.message });
    }
  });

  // POST /api/tags
  router.post('/tags', async (req: Request, res: Response) => {
    try {
      const { walletAddress, tag, category = 'CUSTOM', riskLevel = 'MEDIUM', notes, caseId, investigator = 'Forensic Analyst' } = req.body;

      if (!walletAddress || !tag) {
        return res.status(400).json({ error: 'walletAddress and tag are required' });
      }

      const tagRecord = {
        id: `tag-${Date.now()}`,
        walletAddress: walletAddress.toLowerCase(),
        caseId: caseId || 'default-case',
        tag,
        category,
        riskLevel,
        notes,
        investigator,
        createdAt: new Date().toISOString(),
      };

      await dbService.saveTag(tagRecord);

      // Mirror to Backboard memory for AI copilot recall
      await backboardService.recordMemory(
        caseId || 'default-case',
        walletAddress,
        `[${category}] ${tag}${notes ? ` - ${notes}` : ''}`,
        'tag'
      );

      res.json({ success: true, tag: tagRecord });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save wallet tag', details: err?.message });
    }
  });

  // GET /api/tags/:walletAddress
  router.get('/tags/:walletAddress', async (req: Request, res: Response) => {
    try {
      const tags = await dbService.getTags(req.params.walletAddress);
      res.json({ tags });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve tags', details: err?.message });
    }
  });

  // GET /api/tags (all tags)
  router.get('/tags', async (_req: Request, res: Response) => {
    try {
      const tags = await dbService.getTags();
      res.json({ tags });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve all tags', details: err?.message });
    }
  });

  // POST /api/notes
  router.post('/notes', async (req: Request, res: Response) => {
    try {
      const { caseId, walletAddress, content, author = 'Lead Analyst', pinned = false } = req.body;
      if (!caseId || !content) {
        return res.status(400).json({ error: 'caseId and content are required' });
      }

      const note = {
        id: `note-${Date.now()}`,
        caseId,
        walletAddress,
        author,
        content,
        pinned,
        createdAt: new Date().toISOString(),
      };

      await dbService.saveNote(note);

      // Mirror note to Backboard memory
      await backboardService.recordMemory(caseId, `Note by ${author}`, content, 'note');

      res.json({ success: true, note });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save case note', details: err?.message });
    }
  });

  // GET /api/notes/:caseId
  router.get('/notes/:caseId', async (req: Request, res: Response) => {
    try {
      const notes = await dbService.getNotes(req.params.caseId);
      res.json({ notes });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve notes', details: err?.message });
    }
  });

  // POST /api/export-sar
  router.post('/export-sar', async (req: Request, res: Response) => {
    try {
      const { caseId, walletAddress, graphContext } = req.body;
      const reportMarkdown = await aiService.generateSARReport(
        caseId || 'case-default',
        walletAddress || SAMPLE_HEIST_WALLET,
        graphContext
      );
      res.json({ markdown: reportMarkdown });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate SAR report', details: err?.message });
    }
  });

  // GET /api/investigations
  router.get('/investigations', async (_req: Request, res: Response) => {
    try {
      const list = await dbService.listInvestigations();
      res.json({ investigations: list });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve investigations', details: err?.message });
    }
  });

  // POST /api/alerts/broadcast
  router.post('/alerts/broadcast', (req: Request, res: Response) => {
    try {
      const { walletAddress, txHash, from, to, valueMatic, severity, heuristic, description } = req.body;
      const targetAddress = walletAddress || SAMPLE_HEIST_WALLET;
      const val = valueMatic || 185000;

      const alert: HighRiskAlert = {
        id: `alert-${Date.now()}`,
        type: 'HIGH_RISK_ALERT',
        walletAddress: targetAddress,
        txHash: txHash || `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}...${Date.now().toString(16).slice(-4)}`,
        from: from || '0x1a8f9024c0847932bc39478fef123498a44b9211',
        to: to || '0x498a0d7821feec09b384792a1042cb3a9089ef01',
        valueMatic: val,
        valueUsd: val * 0.75,
        severity: severity || 'CRITICAL',
        heuristic: heuristic || 'RAPID_PEEL_SPLIT',
        description: description || `Real-time detection: ${val.toLocaleString()} MATIC peeled to Tornado Cash proxy router in under 90 seconds.`,
        timestamp: Date.now(),
      };

      wsService.broadcastAlert(alert);
      res.json({ success: true, alert, clientCount: wsService.connectedClientsCount });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to broadcast alert', details: err?.message });
    }
  });

  return router;
}

// Standalone runner when executing backend directly (e.g. docker or render)
if (process.env.STANDALONE_BACKEND === 'true') {
  const app = express();
  const port = process.env.PORT || 5000;
  app.use(cors());
  app.use(express.json());
  app.use('/api', createApiRouter());
  app.listen(port, () => {
    console.log(`🚀 Standalone ChainSleuth Backend running on port ${port}`);
  });
}
