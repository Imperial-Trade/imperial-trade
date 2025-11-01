
export class RequestQueue {
  private requestQueue: Map<string, Promise<any>> = new Map();

  getCacheKey(operation: string, params: any): string {
    return `${operation}_${JSON.stringify(params)}`;
  }

  addRequest(key: string, promise: Promise<any>): void {
    this.requestQueue.set(key, promise);
  }

  getRequest(key: string): Promise<any> | undefined {
    return this.requestQueue.get(key);
  }

  removeRequest(key: string): void {
    this.requestQueue.delete(key);
  }

  hasRequest(key: string): boolean {
    return this.requestQueue.has(key);
  }

  cancelAllRequests(): void {
    this.requestQueue.clear();
  }

  getPendingRequestCount(): number {
    return this.requestQueue.size;
  }
}
