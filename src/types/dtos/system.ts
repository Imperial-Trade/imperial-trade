
import { BaseEntityDto, UserOwnedEntityDto } from './common';

// Economic Event DTOs
export interface EconomicEventDto extends BaseEntityDto {
  event_name: string;
  event_date: string;
  country: string;
  impact: 'low' | 'medium' | 'high';
}

// Psychology Log DTOs
export interface PsychologyLogDto extends UserOwnedEntityDto {
  log_date: string;
  mood: 'positive' | 'negative' | 'neutral';
  confidence_level: number;
  notes?: string;
}

// Live Session DTOs
export interface LiveSessionDto extends BaseEntityDto {
  session_title: string;
  description?: string;
  session_date: string;
  host_name: string;
  zoom_meeting_url: string;
  zoom_meeting_id?: string;
  zoom_passcode?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  auto_start_enabled: boolean;
}

// Athena Interaction DTOs
export interface AthenaInteractionDto extends UserOwnedEntityDto {
  user_email: string;
  prompt: string;
  response: string;
  context?: string;
  interaction_time: string;
  feedback_score?: number;
}
