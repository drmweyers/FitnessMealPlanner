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
  private keepaliveInterval: NodeJS.Timeout;
  private readonly KEEPALIVE_INTERVAL_MS = 30000; // Send keepalive every 30 seconds
  private readonly STALE_CONNECTION_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes (increased from 5)

  constructor() {
    // Clean up stale connections every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000);

    // Send keepalive messages to all active connections every 30 seconds
    this.keepaliveInterval = setInterval(() => {
      this.sendKeepalive();
    }, this.KEEPALIVE_INTERVAL_MS);
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

    // Send to all connected clients, remove any that fail
    const validClients: SSEClient[] = [];
    batchClients.forEach(client => {
      try {
        this.sendEvent(client.res, 'progress', progressData);
        validClients.push(client);
      } catch (error) {
        console.warn(`[SSE] Failed to send progress to client ${client.id}, removing`);
      }
    });

    // Update client list if any were removed
    if (validClients.length !== batchClients.length) {
      if (validClients.length === 0) {
        this.clients.delete(batchId);
      } else {
        this.clients.set(batchId, validClients);
      }
    }
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
      if (res.writableEnded || res.destroyed) {
        console.warn('[SSE] Attempted to send event to closed connection');
        return;
      }
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('[SSE] Failed to send event:', error);
      // Don't throw - connection might be closed, caller should handle cleanup
    }
  }

  /**
   * Send keepalive messages to prevent connection timeouts
   */
  private sendKeepalive(): void {
    this.clients.forEach((batchClients, batchId) => {
      batchClients.forEach(client => {
        try {
          // Send a comment line (keepalive) - SSE spec allows comment lines starting with :
          client.res.write(`: keepalive ${Date.now()}\n\n`);
        } catch (error) {
          // Connection might be closed, remove it
          console.warn(`[SSE] Failed to send keepalive to client ${client.id}, removing`);
          this.removeClient(batchId, client.id);
        }
      });
    });
  }

  /**
   * Clean up stale connections (older than threshold with no activity)
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();

    this.clients.forEach((batchClients, batchId) => {
      const validClients = batchClients.filter(client => {
        const age = now - client.connectedAt.getTime();
        if (age > this.STALE_CONNECTION_THRESHOLD_MS) {
          console.log(`[SSE] Closing stale connection for client ${client.id} in batch ${batchId} (age: ${Math.round(age / 1000)}s)`);
          try {
            client.res.end();
          } catch (error) {
            // Connection already closed
          }
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
    clearInterval(this.keepaliveInterval);

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
