/**
 * Backboard Memory Service
 * Provides persistent long-term case memory, entity tag synchronization,
 * and contextual retrieval for the on-chain AI Forensics Copilot.
 */

import axios from 'axios';

export interface BackboardMemoryItem {
  id: string;
  caseId: string;
  key: string;
  value: string;
  category: 'tag' | 'note' | 'heuristic' | 'summary';
  timestamp: string;
}

export class BackboardService {
  private apiKey: string;
  private apiUrl: string;
  private localMemoryStore = new Map<string, BackboardMemoryItem[]>();

  constructor() {
    this.apiKey = process.env.BACKBOARD_API_KEY || '';
    this.apiUrl = process.env.BACKBOARD_API_URL || 'https://api.backboard.ai/v1';
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Saves an investigator memory item (tag, note, or case event) into Backboard
   */
  async recordMemory(
    caseId: string,
    key: string,
    value: string,
    category: BackboardMemoryItem['category'] = 'note'
  ): Promise<BackboardMemoryItem> {
    const memoryItem: BackboardMemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caseId,
      key,
      value,
      category,
      timestamp: new Date().toISOString(),
    };

    // Always maintain local memory cache for resilience
    const current = this.localMemoryStore.get(caseId) || [];
    this.localMemoryStore.set(caseId, [memoryItem, ...current]);

    if (this.isConfigured) {
      try {
        await axios.post(
          `${this.apiUrl}/memories`,
          {
            session_id: caseId,
            key,
            content: value,
            metadata: { category, timestamp: memoryItem.timestamp },
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );
      } catch (err) {
        console.warn('Backboard API memory recording fallback to local cache:', (err as any)?.message);
      }
    }

    return memoryItem;
  }

  /**
   * Retrieves all contextual case memories and tags to inject into the LLM prompt
   */
  async getCaseContext(caseId: string): Promise<{
    caseId: string;
    memories: BackboardMemoryItem[];
    formattedSummary: string;
  }> {
    let memories: BackboardMemoryItem[] = this.localMemoryStore.get(caseId) || [];

    if (this.isConfigured) {
      try {
        const response = await axios.get(`${this.apiUrl}/memories`, {
          params: { session_id: caseId },
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 5000,
        });

        if (response.data && Array.isArray(response.data.memories)) {
          memories = response.data.memories.map((m: any) => ({
            id: m.id || m.key,
            caseId,
            key: m.key,
            value: m.content || m.value,
            category: m.metadata?.category || 'note',
            timestamp: m.metadata?.timestamp || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('Backboard API fetch fallback to local cache:', (err as any)?.message);
      }
    }

    // Produce compact formatted summary string for LLM injection
    const tags = memories.filter((m) => m.category === 'tag').map((m) => `• [TAG] ${m.key}: ${m.value}`);
    const notes = memories.filter((m) => m.category === 'note').map((m) => `• [NOTE] ${m.key}: ${m.value}`);

    const formattedSummary = [
      tags.length > 0 ? `INVESTIGATOR TAGGED ENTITIES:\n${tags.join('\n')}` : '',
      notes.length > 0 ? `PERSISTENT CASE NOTES:\n${notes.join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      caseId,
      memories,
      formattedSummary,
    };
  }
}

export const backboardService = new BackboardService();
