/**
 * SSE Manager - Server-Sent Events for Real-Time Updates
 * Manages SSE connections for BMAD progress streaming
 */

import { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  batchId: string;
  connectedAt: Date;
}

export class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up stale connections every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000);
  }

  /**
   * Register a new SSE client for a batch
   */
  addClient(batchId: string, clientId: string, res: Response): void {
    const client: SSEClient = {
      id: clientId,
      res,
      batchId,
      connectedAt: new Date()
    };

    // Configure SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Get or create client list for this batch
    const batchClients = this.clients.get(batchId) || [];
    batchClients.push(client);
    this.clients.set(batchId, batchClients);

    console.log(`[SSE] Client ${clientId} connected for batch ${batchId} (total: ${batchClients.length})`);

    // Send initial connection event
    this.sendEvent(res, 'connected', {
      batchId,
      clientId,
      message: 'SSE connection established'
    });

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(batchId, clientId);
    });
  }

  /**
   * Remove a client from the batch
   */
  removeClient(batchId: string, clientId: string): void {
    const batchClients = this.clients.get(batchId);
    if (!batchClients) return;

    const filtered = batchClients.filter(c => c.id !== clientId);

    if (filtered.length === 0) {
      this.clients.delete(batchId);
      console.log(`[SSE] No more clients for batch ${batchId}, removed`);
    } else {
      this.clients.set(batchId, filtered);
      console.log(`[SSE] Client ${clientId} disconnected from batch ${batchId} (remaining: ${filtered.length})`);
    }
  }

  /**
   * Broadcast progress update to all clients watching a batch
   */
  broadcastProgress(batchId: string, progressData: any): void {
    const batchClients = this.clients.get(batchId);
    if (!batchClients || batchClients.length === 0) {
      return;
    }

    console.log(`[SSE] Broadcasting progress to ${batchClients.length} clients for batch ${batchId}`);

    // Send to all connected clients
    batchClients.forEach(client => {
      this.sendEvent(client.res, 'progress', progressData);
    });
  }

  /**
   * Send completion event to all clients
   */
  broadcastCompletion(batchId: string, result: any): void {
    const batchClients = this.clients.get(batchId);
    if (!batchClients || batchClients.length === 0) {
      return;
    }

    console.log(`[SSE] Broadcasting completion to ${batchClients.length} clients for batch ${batchId}`);

    batchClients.forEach(client => {
      this.sendEvent(client.res, 'complete', result);
      // Close the connection after sending completion
      client.res.end();
    });

    // Remove all clients for this batch
    this.clients.delete(batchId);
  }

  /**
   * Send error event to all clients
   */
  broadcastError(batchId: string, error: any): void {
    const batchClients = this.clients.get(batchId);
    if (!batchClients || batchClients.length === 0) {
      return;
    }

    console.log(`[SSE] Broadcasting error to ${batchClients.length} clients for batch ${batchId}`);

    batchClients.forEach(client => {
      this.sendEvent(client.res, 'error', error);
      // Close the connection after sending error
      client.res.end();
    });

    // Remove all clients for this batch
    this.clients.delete(batchId);
  }

  /**
   * Send a single SSE event
   */
  private sendEvent(res: Response, event: string, data: any): void {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('[SSE] Failed to send event:', error);
    }
  }

  /**
   * Clean up stale connections (older than 5 minutes with no activity)
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    this.clients.forEach((batchClients, batchId) => {
      const validClients = batchClients.filter(client => {
        const age = now - client.connectedAt.getTime();
        if (age > staleThreshold) {
          console.log(`[SSE] Closing stale connection for client ${client.id} in batch ${batchId}`);
          client.res.end();
          return false;
        }
        return true;
      });

      if (validClients.length === 0) {
        this.clients.delete(batchId);
      } else if (validClients.length !== batchClients.length) {
        this.clients.set(batchId, validClients);
      }
    });
  }

  /**
   * Get statistics about active connections
   */
  getStats(): {
    totalBatches: number;
    totalClients: number;
    batches: Array<{ batchId: string; clientCount: number }>;
  } {
    const batches = Array.from(this.clients.entries()).map(([batchId, clients]) => ({
      batchId,
      clientCount: clients.length
    }));

    return {
      totalBatches: this.clients.size,
      totalClients: batches.reduce((sum, b) => sum + b.clientCount, 0),
      batches
    };
  }

  /**
   * Shutdown the SSE manager
   */
  shutdown(): void {
    clearInterval(this.cleanupInterval);

    // Close all connections
    this.clients.forEach((batchClients, batchId) => {
      batchClients.forEach(client => {
        this.sendEvent(client.res, 'shutdown', { message: 'Server shutting down' });
        client.res.end();
      });
    });

    this.clients.clear();
    console.log('[SSE] SSE Manager shut down');
  }
}

// Export singleton instance
export const sseManager = new SSEManager();
