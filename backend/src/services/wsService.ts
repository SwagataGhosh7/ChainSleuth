/**
 * WebSocket Real-Time Broadcast Service
 * Broadcasts real-time high-risk transaction alerts across active investigative scopes.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

export interface HighRiskAlert {
  id: string;
  type: 'HIGH_RISK_ALERT' | 'WHALE_ALERT';
  walletAddress: string;
  txHash: string;
  from: string;
  to: string;
  valueMatic: number;
  valueUsd: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  heuristic: string;
  description: string;
  timestamp: number;
  category?: 'ACCUMULATION' | 'MM_OTC' | 'DUMP' | 'EXPLOIT';
}

interface ClientMeta {
  ws: WebSocket;
  subscribedAddress?: string;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients = new Set<ClientMeta>();

  initialize(httpServer: HttpServer) {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const meta: ClientMeta = { ws };
      this.clients.add(meta);

      // Send initial connection handshake
      ws.send(
        JSON.stringify({
          type: 'CONNECTED',
          message: 'ChainSleuth Real-Time Forensics WebSocket Connected',
          timestamp: Date.now(),
        })
      );

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'SUBSCRIBE_SCOPE' && data.walletAddress) {
            meta.subscribedAddress = data.walletAddress.toLowerCase();
            ws.send(
              JSON.stringify({
                type: 'SUBSCRIBED',
                walletAddress: meta.subscribedAddress,
                message: `Now monitoring active scope for ${meta.subscribedAddress}`,
              })
            );
          } else if (data.type === 'TRIGGER_TEST_ALERT') {
            this.broadcastAlert({
              id: `alert-${Date.now()}`,
              type: 'HIGH_RISK_ALERT',
              walletAddress: data.walletAddress || '0x71c84192b3a9843074ac292947365cdd4379201c',
              txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}...${Date.now().toString(16)}`,
              from: data.from || '0x1a8f9024c0847932bc39478fef123498a44b9211',
              to: data.to || '0x498a0d7821feec09b384792a1042cb3a9089ef01',
              valueMatic: data.valueMatic || 185000,
              valueUsd: (data.valueMatic || 185000) * 0.75,
              severity: 'CRITICAL',
              heuristic: 'RAPID_PEEL_SPLIT',
              description: 'Real-time detection: 185,000 MATIC peeled to Tornado Cash proxy router in under 90 seconds.',
              timestamp: Date.now(),
            });
          }
        } catch (e) {
          console.warn('WS message parsing error:', e);
        }
      });

      ws.on('close', () => {
        this.clients.delete(meta);
      });

      ws.on('error', () => {
        this.clients.delete(meta);
      });
    });

    console.log('📡 Real-time Forensics WebSocket server mounted at /ws');
  }

  /**
   * Broadcasts a high-risk alert to all clients or clients subscribed to the specific wallet scope
   */
  broadcastAlert(alert: HighRiskAlert) {
    const payload = JSON.stringify(alert);
    const target = alert.walletAddress.toLowerCase();

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Send if client has no specific subscription or is subscribed to target address
        if (!client.subscribedAddress || client.subscribedAddress === target) {
          client.ws.send(payload);
        }
      }
    }
  }

  get connectedClientsCount(): number {
    return this.clients.size;
  }
}

export const wsService = new WebSocketService();
