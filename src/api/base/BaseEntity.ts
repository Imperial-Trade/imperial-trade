
import { supabase } from '@/integrations/supabase/client';

export class BaseEntity {
  static async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  static async getCurrentUserEmail(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      throw new Error('User email not found');
    }
    return user.email;
  }
}

// Create concrete entity classes that were missing from exports
export class MarketAlert {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('market_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(alertData: any, userId: string) {
    const { data, error } = await supabase
      .from('market_alerts')
      .insert([{ ...alertData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class OpportunitySignal {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(signalData: any, userId: string) {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .insert([{ ...signalData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class RiskSimulation {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('risk_simulations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(simulationData: any, userId: string) {
    const { data, error } = await supabase
      .from('risk_simulations')
      .insert([{ ...simulationData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradeJournalEntry {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(entryData: any, userId: string) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .insert([{ ...entryData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradingStrategy {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(strategyData: any, userId: string) {
    const { data, error } = await supabase
      .from('trading_strategies')
      .insert([{ ...strategyData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradingGroup {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('trading_groups')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(groupData: any, userId: string) {
    const { data, error } = await supabase
      .from('trading_groups')
      .insert([{ ...groupData, created_by: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class GroupJournalEntry {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(entryData: any, userId: string) {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .insert([{ ...entryData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class VerifiedTrader {
  static async list() {
    const { data, error } = await supabase
      .from('verified_traders')
      .select('*')
      .order('rank_position', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  static async create(traderData: any, userId: string) {
    const { data, error } = await supabase
      .from('verified_traders')
      .insert([{ ...traderData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradeHistory {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(historyData: any, userId: string) {
    const { data, error } = await supabase
      .from('trade_history')
      .insert([{ ...historyData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Learning entities - create the missing classes
export class Quiz {
  static async list() {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class QuizAttempt {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(attemptData: any, userId: string) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([{ ...attemptData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class UserProgress {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData: any, userId: string) {
    const { data, error } = await supabase
      .from('user_progress')
      .insert([{ ...progressData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class LearningPathway {
  static async list() {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class UserPathwayProgress {
  static async list(userId: string) {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData: any, userId: string) {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .insert([{ ...progressData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class Course {
  static async list() {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getById(id: string) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}
