
import { supabase } from '@/integrations/supabase/client';
import { BaseEntity } from '../base/BaseEntity';
import { Database } from '@/integrations/supabase/types';

type PortfolioItemRow = Database['public']['Tables']['portfolio_items']['Row'];
type MarketAlertRow = Database['public']['Tables']['market_alerts']['Row'];
type OpportunitySignalRow = Database['public']['Tables']['opportunity_signals']['Row'];
type RiskSimulationRow = Database['public']['Tables']['risk_simulations']['Row'];

export class PortfolioItem {
  static tableName = 'portfolio_items' as const;

  static async list(orderBy = '-created_at'): Promise<PortfolioItemRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<PortfolioItemRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<PortfolioItemRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<PortfolioItemRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class MarketAlert {
  static tableName = 'market_alerts' as const;

  static async list(orderBy = '-created_at'): Promise<MarketAlertRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<MarketAlertRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<MarketAlertRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<MarketAlertRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class OpportunitySignal {
  static tableName = 'opportunity_signals' as const;

  static async list(orderBy = '-created_at'): Promise<OpportunitySignalRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<OpportunitySignalRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<OpportunitySignalRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<OpportunitySignalRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}

export class RiskSimulation {
  static tableName = 'risk_simulations' as const;

  static async list(orderBy = '-simulation_date'): Promise<RiskSimulationRow[]> {
    return BaseEntity.genericList(this.tableName, orderBy);
  }

  static async getById(id: string): Promise<RiskSimulationRow> {
    return BaseEntity.genericGetById(this.tableName, id);
  }

  static async create(entityData: any): Promise<RiskSimulationRow> {
    return BaseEntity.genericCreate(this.tableName, entityData);
  }

  static async update(id: string, entityData: any): Promise<RiskSimulationRow> {
    return BaseEntity.genericUpdate(this.tableName, id, entityData);
  }

  static async delete(id: string): Promise<void> {
    return BaseEntity.genericDelete(this.tableName, id);
  }
}
