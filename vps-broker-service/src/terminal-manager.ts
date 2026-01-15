/**
 * MT5 Terminal Manager
 * 
 * Manages multiple MT5 terminal instances in Portable Mode
 * to handle concurrent connections from thousands of users.
 * 
 * Architecture:
 * - Each terminal instance runs in its own folder (Portable Mode)
 * - Terminals are assigned to requests in round-robin fashion
 * - Terminals are pooled and reused to avoid initialization overhead
 * - Maximum concurrent connections per terminal: 1 (MT5 limitation)
 */

import path from 'path';
import fs from 'fs';

export interface TerminalInstance {
  id: number;
  path: string;
  dataPath: string;
  isAvailable: boolean;
  lastUsed: Date;
  currentUser?: string;
}

export class TerminalManager {
  private terminals: TerminalInstance[] = [];
  private readonly baseTerminalPath: string;
  private readonly baseDataPath: string;
  private readonly maxTerminals: number;
  private currentIndex: number = 0;
  private readonly terminalLock: Map<number, boolean> = new Map();

  constructor(
    baseTerminalPath: string = 'C:\\Program Files\\MetaTrader 5\\terminal64.exe',
    baseDataPath: string = 'C:\\MT5_Terminals',
    maxTerminals: number = 50 // Support 50 concurrent connections
  ) {
    this.baseTerminalPath = baseTerminalPath;
    this.baseDataPath = baseDataPath;
    this.maxTerminals = maxTerminals;
    
    // Ensure base data path exists
    if (!fs.existsSync(this.baseDataPath)) {
      fs.mkdirSync(this.baseDataPath, { recursive: true });
    }
    
    // Initialize terminal instances
    this.initializeTerminals();
  }

  /**
   * Initialize all terminal instances
   */
  private initializeTerminals(): void {
    console.log(`[Terminal Manager] Initializing ${this.maxTerminals} MT5 terminal instances...`);
    
    for (let i = 0; i < this.maxTerminals; i++) {
      const terminalId = i + 1;
      const terminalDataPath = path.join(this.baseDataPath, `Terminal_${terminalId}`);
      
      // Create terminal data directory if it doesn't exist
      if (!fs.existsSync(terminalDataPath)) {
        fs.mkdirSync(terminalDataPath, { recursive: true });
      }
      
      this.terminals.push({
        id: terminalId,
        path: this.baseTerminalPath,
        dataPath: terminalDataPath,
        isAvailable: true,
        lastUsed: new Date()
      });
      
      this.terminalLock.set(terminalId, false);
    }
    
    console.log(`[Terminal Manager] ✅ Initialized ${this.terminals.length} terminal instances`);
  }

  /**
   * Get the next available terminal instance
   * Uses round-robin to distribute load evenly
   */
  public async acquireTerminal(userId: string): Promise<TerminalInstance | null> {
    const startIndex = this.currentIndex;
    let attempts = 0;
    
    while (attempts < this.maxTerminals) {
      const terminal = this.terminals[this.currentIndex];
      
      // Check if terminal is available and not locked
      if (terminal.isAvailable && !this.terminalLock.get(terminal.id)) {
        // Lock the terminal
        this.terminalLock.set(terminal.id, true);
        terminal.isAvailable = false;
        terminal.currentUser = userId;
        terminal.lastUsed = new Date();
        
        // Move to next terminal for round-robin
        this.currentIndex = (this.currentIndex + 1) % this.maxTerminals;
        
        console.log(`[Terminal Manager] ✅ Acquired terminal ${terminal.id} for user ${userId.substring(0, 8)}...`);
        return terminal;
      }
      
      // Move to next terminal
      this.currentIndex = (this.currentIndex + 1) % this.maxTerminals;
      attempts++;
    }
    
    console.error(`[Terminal Manager] ❌ No available terminals. All ${this.maxTerminals} terminals are busy.`);
    return null;
  }

  /**
   * Release a terminal instance back to the pool
   */
  public releaseTerminal(terminalId: number): void {
    const terminal = this.terminals.find(t => t.id === terminalId);
    if (terminal) {
      terminal.isAvailable = true;
      terminal.currentUser = undefined;
      terminal.lastUsed = new Date();
      this.terminalLock.set(terminalId, false);
      console.log(`[Terminal Manager] ✅ Released terminal ${terminalId}`);
    }
  }

  /**
   * Get terminal instance by ID
   */
  public getTerminal(terminalId: number): TerminalInstance | undefined {
    return this.terminals.find(t => t.id === terminalId);
  }

  /**
   * Get statistics about terminal usage
   */
  public getStats(): {
    total: number;
    available: number;
    busy: number;
    terminals: Array<{
      id: number;
      available: boolean;
      currentUser?: string;
      lastUsed: Date;
    }>;
  } {
    const available = this.terminals.filter(t => t.isAvailable).length;
    const busy = this.terminals.length - available;
    
    return {
      total: this.terminals.length,
      available,
      busy,
      terminals: this.terminals.map(t => ({
        id: t.id,
        available: t.isAvailable,
        currentUser: t.currentUser,
        lastUsed: t.lastUsed
      }))
    };
  }

  /**
   * Ensure terminal is running in portable mode
   * This should be called before using a terminal
   */
  public async ensureTerminalRunning(terminalId: number): Promise<boolean> {
    const terminal = this.getTerminal(terminalId);
    if (!terminal) {
      return false;
    }

    // Check if terminal process is running
    // In production, you might want to check if terminal64.exe is running
    // For now, we assume the terminal will be started by Python script when needed
    
    return true;
  }

  /**
   * Get the portable mode path for a terminal
   * This is the path that should be passed to mt5.initialize(path, portable=True)
   * On Linux (Wine), converts Linux path to Wine Windows path
   */
  public getTerminalPortablePath(terminalId: number): string {
    const terminal = this.getTerminal(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }
    
    // On Linux (Wine), convert Linux path to Wine Windows path
    if (process.platform === 'linux') {
      // Convert /root/imperial-factory/mt5-master/terminal64.exe
      // to Z:\root\imperial-factory\mt5-master\terminal64.exe
      return terminal.path.replace(/^\/root/, 'Z:\\root').replace(/\//g, '\\');
    }
    
    // Return the terminal executable path as-is for Windows
    // Python script will use this with portable=True
    return terminal.path;
  }

  /**
   * Get the data path for a terminal (for portable mode)
   * On Linux (Wine), converts Linux path to Wine Windows path
   */
  public getTerminalDataPath(terminalId: number): string {
    const terminal = this.getTerminal(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }
    
    // On Linux (Wine), convert Linux path to Wine Windows path
    if (process.platform === 'linux') {
      // Convert /root/imperial-factory/mt5-master/Terminal_1
      // to Z:\root\imperial-factory\mt5-master\Terminal_1
      return terminal.dataPath.replace(/^\/root/, 'Z:\\root').replace(/\//g, '\\');
    }
    
    return terminal.dataPath;
  }
}

// Singleton instance
let terminalManagerInstance: TerminalManager | null = null;

export function getTerminalManager(): TerminalManager {
  if (!terminalManagerInstance) {
    // On Ubuntu VPS, use the correct MT5 path: /root/imperial-factory/mt5-master/terminal64.exe
    // Python scripts will use this path directly, but TerminalManager needs a path for Windows compatibility
    const baseTerminalPath = process.env.MT5_TERMINAL_PATH || '/root/imperial-factory/mt5-master/terminal64.exe';
    const baseDataPath = process.env.MT5_TERMINALS_DATA_PATH || '/root/imperial-factory/mt5-master';
    const maxTerminals = parseInt(process.env.MT5_MAX_TERMINALS || '50', 10);

    terminalManagerInstance = new TerminalManager(baseTerminalPath, baseDataPath, maxTerminals);
  }
  
  return terminalManagerInstance;
}
