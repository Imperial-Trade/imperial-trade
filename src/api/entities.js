import { supabase } from '@/integrations/supabase/client';

export class ForumPost {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(postData) {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert([{
        ...postData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, postData) {
    const { data, error } = await supabase
      .from('forum_posts')
      .update(postData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class Reply {
  static async list(postId) {
    const { data, error } = await supabase
      .from('replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  static async create(replyData) {
    const { data, error } = await supabase
      .from('replies')
      .insert([{
        ...replyData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, replyData) {
    const { data, error } = await supabase
      .from('replies')
      .update(replyData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('replies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class PortfolioItem {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(itemData) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .insert([{
        ...itemData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, itemData) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('portfolio_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradeJournalEntry {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(entryData) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .insert([{
        ...entryData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, entryData) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .update(entryData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('trade_journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class MarketAlert {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('market_alerts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(alertData) {
    const { data, error } = await supabase
      .from('market_alerts')
      .insert([{
        ...alertData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, alertData) {
    const { data, error } = await supabase
      .from('market_alerts')
      .update(alertData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('market_alerts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class EconomicEvent {
  static async list(orderBy = '-event_date') {
    const { data, error } = await supabase
      .from('economic_events')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('economic_events')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class PsychologyLog {
  static async list(orderBy = '-log_date') {
    const { data, error } = await supabase
      .from('psychology_logs')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(logData) {
    const { data, error } = await supabase
      .from('psychology_logs')
      .insert([{
        ...logData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, logData) {
    const { data, error } = await supabase
      .from('psychology_logs')
      .update(logData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('psychology_logs')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class Quiz {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByVideoId(videoId) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class QuizAttempt {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(attemptData) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([{
        ...attemptData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByQuizId(quizId) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class UserProgress {
  static async list(orderBy = '-updated_at') {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData) {
    const { data, error } = await supabase
      .from('user_progress')
      .insert([{
        ...progressData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, progressData) {
    const { data, error } = await supabase
      .from('user_progress')
      .update(progressData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByVideoId(videoId) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('video_id', videoId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradeHistory {
  static async list(orderBy = '-upload_date') {
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(historyData) {
    const { data, error } = await supabase
      .from('trade_history')
      .insert([{
        ...historyData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, historyData) {
    const { data, error } = await supabase
      .from('trade_history')
      .update(historyData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('trade_history')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class OpportunitySignal {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(signalData) {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .insert([{
        ...signalData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, signalData) {
    const { data, error } = await supabase
      .from('opportunity_signals')
      .update(signalData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('opportunity_signals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class RiskSimulation {
  static async list(orderBy = '-simulation_date') {
    const { data, error } = await supabase
      .from('risk_simulations')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(simulationData) {
    const { data, error } = await supabase
      .from('risk_simulations')
      .insert([{
        ...simulationData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, simulationData) {
    const { data, error } = await supabase
      .from('risk_simulations')
      .update(simulationData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('risk_simulations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class VerifiedTrader {
  static async list(orderBy = '-total_pnl') {
    const { data, error } = await supabase
      .from('verified_traders')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(traderData) {
    const { data, error } = await supabase
      .from('verified_traders')
      .insert([{
        ...traderData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, traderData) {
    const { data, error } = await supabase
      .from('verified_traders')
      .update(traderData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByUserId(userId) {
    const { data, error } = await supabase
      .from('verified_traders')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradingGroup {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('trading_groups')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(groupData) {
    const { data, error } = await supabase
      .from('trading_groups')
      .insert([{
        ...groupData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, groupData) {
    const { data, error } = await supabase
      .from('trading_groups')
      .update(groupData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('trading_groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('trading_groups')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class GroupJournalEntry {
  static async list(groupId) {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .select('*')
      .eq('group_id', groupId)
      .order('shared_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async create(entryData) {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .insert([{
        ...entryData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, entryData) {
    const { data, error } = await supabase
      .from('group_journal_entries')
      .update(entryData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('group_journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export class LiveSession {
  static async list(orderBy = '-session_date') {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getUpcoming() {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .gte('session_date', new Date().toISOString())
      .eq('status', 'scheduled')
      .order('session_date', { ascending: true });
    
    if (error) throw error;
    return data;
  }
}

export class LearningPathway {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByDifficulty(level) {
    const { data, error } = await supabase
      .from('learning_pathways')
      .select('*')
      .eq('difficulty_level', level)
      .order('completion_count', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class UserPathwayProgress {
  static async list(orderBy = '-started_date') {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(progressData) {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .insert([{
        ...progressData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, progressData) {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .update(progressData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('user_pathway_progress')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getByPathwayId(pathwayId) {
    const { data, error } = await supabase
      .from('user_pathway_progress')
      .select('*')
      .eq('pathway_id', pathwayId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export class TradingStrategy {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(strategyData) {
    const { data, error } = await supabase
      .from('trading_strategies')
      .insert([{
        ...strategyData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, strategyData) {
    const { data, error } = await supabase
      .from('trading_strategies')
      .update(strategyData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('trading_strategies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getPublic() {
    const { data, error } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('is_public', true)
      .order('likes', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class AthenaInteraction {
  static async list(orderBy = '-interaction_time') {
    const { data, error } = await supabase
      .from('athena_interactions')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(interactionData) {
    const { data, error } = await supabase
      .from('athena_interactions')
      .insert([{
        ...interactionData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, interactionData) {
    const { data, error } = await supabase
      .from('athena_interactions')
      .update(interactionData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('athena_interactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getByUserEmail(userEmail) {
    const { data, error } = await supabase
      .from('athena_interactions')
      .select('*')
      .eq('user_email', userEmail)
      .order('interaction_time', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class TradeAlert {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(alertData) {
    const { data, error } = await supabase
      .from('trade_alerts')
      .insert([{
        ...alertData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, alertData) {
    const { data, error } = await supabase
      .from('trade_alerts')
      .update(alertData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('trade_alerts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByStatus(status) {
    const { data, error } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class AccountRequest {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('account_requests')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(requestData) {
    const { data, error } = await supabase
      .from('account_requests')
      .insert([requestData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, requestData) {
    const { data, error } = await supabase
      .from('account_requests')
      .update(requestData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('account_requests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('account_requests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByStatus(status) {
    const { data, error } = await supabase
      .from('account_requests')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class AuditLog {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(logData) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([logData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByAdminEmail(adminEmail) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('admin_email', adminEmail)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getByTargetEntity(targetEntity) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('target_entity', targetEntity)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}

export class Course {
  static async list(orderBy = '-created_at') {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order(orderBy.replace('-', ''), { ascending: !orderBy.startsWith('-') });
    
    if (error) throw error;
    return data;
  }

  static async create(courseData) {
    const { data, error } = await supabase
      .from('courses')
      .insert([courseData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id, courseData) {
    const { data, error } = await supabase
      .from('courses')
      .update(courseData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async getById(id) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getByCategory(category) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getByDifficulty(difficulty) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
}
