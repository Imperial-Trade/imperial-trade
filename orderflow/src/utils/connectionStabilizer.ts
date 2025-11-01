// 🔥 GLOBAL CONNECTION STABILIZER
// Prevents cascade failures across multiple realtime contexts

class ConnectionStabilizer {
  private static instance: ConnectionStabilizer;
  private connectionAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private readonly GLOBAL_COOLDOWN = 15000; // 15 seconds global cooldown between attempts
  private readonly MAX_CONCURRENT_CONNECTIONS = 1; // Only allow 1 connection attempt at a time
  private activeConnections = 0;

  static getInstance(): ConnectionStabilizer {
    if (!ConnectionStabilizer.instance) {
      ConnectionStabilizer.instance = new ConnectionStabilizer();
    }
    return ConnectionStabilizer.instance;
  }

  canAttemptConnection(contextName: string): boolean {
    const now = Date.now();
    const attempts = this.connectionAttempts.get(contextName);
    
    // Check global cooldown
    if (attempts && (now - attempts.lastAttempt) < this.GLOBAL_COOLDOWN) {
      console.log(`🛑 ConnectionStabilizer: ${contextName} blocked by global cooldown`);
      return false;
    }
    
    // Check concurrent connection limit
    if (this.activeConnections >= this.MAX_CONCURRENT_CONNECTIONS) {
      console.log(`🛑 ConnectionStabilizer: ${contextName} blocked - max concurrent connections reached`);
      return false;
    }
    
    return true;
  }

  startConnection(contextName: string): void {
    const now = Date.now();
    const attempts = this.connectionAttempts.get(contextName) || { count: 0, lastAttempt: 0 };
    
    this.connectionAttempts.set(contextName, {
      count: attempts.count + 1,
      lastAttempt: now
    });
    
    this.activeConnections++;
    console.log(`🔗 ConnectionStabilizer: ${contextName} connection started (${this.activeConnections} active)`);
  }

  endConnection(contextName: string, success: boolean): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    
    if (success) {
      // Reset attempts on successful connection
      this.connectionAttempts.delete(contextName);
      console.log(`✅ ConnectionStabilizer: ${contextName} connected successfully`);
    } else {
      console.log(`❌ ConnectionStabilizer: ${contextName} connection failed (${this.activeConnections} active)`);
    }
  }

  getStatus(): { activeConnections: number; totalAttempts: number } {
    return {
      activeConnections: this.activeConnections,
      totalAttempts: Array.from(this.connectionAttempts.values()).reduce((sum, attempts) => sum + attempts.count, 0)
    };
  }
}

export const connectionStabilizer = ConnectionStabilizer.getInstance();