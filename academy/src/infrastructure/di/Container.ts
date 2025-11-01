
import { ForumRepository } from '../repositories/ForumRepository';
import { TradingRepository } from '../repositories/TradingRepository';
import { PortfolioRepository } from '../repositories/PortfolioRepository';
import { ForumService } from '@/application/services/ForumService';
import { TradingService } from '@/application/services/TradingService';
import { PortfolioService } from '@/application/services/PortfolioService';

export class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.initializeServices();
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  private initializeServices(): void {
    // Repositories
    const forumRepository = new ForumRepository();
    const tradingRepository = new TradingRepository();
    const portfolioRepository = new PortfolioRepository();

    // Services
    const forumService = new ForumService(forumRepository);
    const tradingService = new TradingService(tradingRepository);
    const portfolioService = new PortfolioService(portfolioRepository);

    // Register services
    this.services.set('ForumService', forumService);
    this.services.set('TradingService', tradingService);
    this.services.set('PortfolioService', portfolioService);
  }

  public get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service;
  }
}
