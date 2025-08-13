
// Optimized event batching with smart queuing and deduplication
class OptimizedEventBatchingService {
  private eventQueue: Array<{ event: string; properties: Record<string, any>; timestamp: number }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly maxBatchSize = 8;
  private readonly maxBatchWait = 2000; // 2 seconds
  private readonly maxEventsPerMinute = 10;
  private eventHistory = new Map<string, number[]>();
  
  private trackFunction?: (event: string, properties?: Record<string, any>) => void;

  setTrackFunction(trackFn: (event: string, properties?: Record<string, any>) => void) {
    this.trackFunction = trackFn;
  }

  private canTrackEvent(eventName: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Get recent events for this event type
    const recentEvents = this.eventHistory.get(eventName) || [];
    const filteredEvents = recentEvents.filter(time => time > oneMinuteAgo);
    
    // Update history
    this.eventHistory.set(eventName, filteredEvents);
    
    // Check if under limit
    return filteredEvents.length < this.maxEventsPerMinute;
  }

  private generateEventKey(event: string, properties: Record<string, any>): string {
    // Create a key for deduplication based on event name and core properties
    const coreProps = {
      event,
      path: properties.path,
      user_id: properties.user_id,
      page: properties.page,
    };
    return JSON.stringify(coreProps);
  }

  private isDuplicateEvent(eventKey: string): boolean {
    const recentEvents = Array.from(this.eventQueue).slice(-10); // Check last 10 events
    return recentEvents.some(queuedEvent => 
      this.generateEventKey(queuedEvent.event, queuedEvent.properties) === eventKey
    );
  }

  queueEvent(event: string, properties: Record<string, any> = {}): void {
    // Rate limiting check
    if (!this.canTrackEvent(event)) {
      console.log(`🚫 Event rate limited: ${event}`);
      return;
    }

    // Deduplication check
    const eventKey = this.generateEventKey(event, properties);
    if (this.isDuplicateEvent(eventKey)) {
      console.log(`🔄 Duplicate event skipped: ${event}`);
      return;
    }

    // Add to queue
    this.eventQueue.push({
      event,
      properties: {
        ...properties,
        batched: true,
        queue_size: this.eventQueue.length,
      },
      timestamp: Date.now(),
    });

    // Record in history
    const history = this.eventHistory.get(event) || [];
    history.push(Date.now());
    this.eventHistory.set(event, history);

    console.log(`📦 Event queued: ${event} (${this.eventQueue.length}/${this.maxBatchSize})`);

    // Process batch if full or start timer
    if (this.eventQueue.length >= this.maxBatchSize) {
      this.processBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.processBatch(), this.maxBatchWait);
    }
  }

  private processBatch(): void {
    if (this.eventQueue.length === 0) return;

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    console.log(`🚀 Processing batch of ${batch.length} events`);

    // Send events individually but in quick succession
    batch.forEach((item, index) => {
      setTimeout(() => {
        if (this.trackFunction) {
          this.trackFunction(item.event, {
            ...item.properties,
            batch_index: index,
            batch_size: batch.length,
          });
        }
      }, index * 50); // 50ms delay between events in batch
    });
  }

  // Cleanup method
  cleanup(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.processBatch(); // Send any remaining events
    this.eventQueue = [];
    this.eventHistory.clear();
  }
}

export const optimizedEventBatcher = new OptimizedEventBatchingService();
