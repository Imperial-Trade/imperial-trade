import { describe, it, expect } from 'vitest';
import { mapStatusToVariant, getTpHitVariant } from '../trading-ui';

describe('mapStatusToVariant', () => {
  it('should handle pending status correctly', () => {
    const variant = mapStatusToVariant('pending');
    
    expect(variant.label).toBe('PENDING');
    expect(variant.tone).toBe('pending');
    expect(variant.iconKey).toBe('hourglass');
    expect(variant.className).toContain('gold-light');
  });

  it('should handle active status correctly', () => {
    const variant = mapStatusToVariant('active');
    
    expect(variant.label).toBe('ACTIVE');
    expect(variant.tone).toBe('active');
    expect(variant.iconKey).toBe('trending-up');
    expect(variant.className).toContain('emerald-500');
  });

  it('should handle partially_profited status correctly', () => {
    const variant = mapStatusToVariant('partially_profited', null, [1, 2]);
    
    expect(variant.label).toBe('PARTIALLY PROFITED');
    expect(variant.tone).toBe('partial');
    expect(variant.iconKey).toBe('target');
    expect(variant.className).toContain('amber-500');
  });

  it('should handle closed with stop_loss correctly', () => {
    const variant = mapStatusToVariant('closed', 'stop_loss');
    
    expect(variant.label).toBe('STOP LOSS HIT');
    expect(variant.tone).toBe('error');
    expect(variant.iconKey).toBe('x');
    expect(variant.className).toContain('red-500');
  });

  it('should handle closed with all_tps_hit correctly', () => {
    const variant = mapStatusToVariant('closed', 'all_tps_hit');
    
    expect(variant.label).toBe('ALL TPS HIT');
    expect(variant.tone).toBe('success');
    expect(variant.iconKey).toBe('check');
    expect(variant.className).toContain('emerald-500');
  });

  it('should handle closed with manual/expired correctly', () => {
    const manualVariant = mapStatusToVariant('closed', 'manual');
    const expiredVariant = mapStatusToVariant('closed', 'expired');
    
    expect(manualVariant.label).toBe('MANUALLY CLOSED');
    expect(manualVariant.tone).toBe('neutral');
    expect(manualVariant.iconKey).toBe('x');
    
    expect(expiredVariant.label).toBe('EXPIRED');
    expect(expiredVariant.tone).toBe('neutral');
    expect(expiredVariant.iconKey).toBe('clock');
  });

  it('should provide neutral fallback for unknown status', () => {
    const variant = mapStatusToVariant('unknown_status' as any);
    
    expect(variant.label).toBe('UNKNOWN STATUS');
    expect(variant.tone).toBe('neutral');
    expect(variant.iconKey).toBe('clock');
    expect(variant.className).toContain('muted');
  });
});

describe('getTpHitVariant', () => {
  it('should create TP hit variant for active tone', () => {
    const variant = getTpHitVariant(3, 'active');
    
    expect(variant.label).toBe('TP3 HIT');
    expect(variant.tone).toBe('active');
    expect(variant.iconKey).toBe('target');
    expect(variant.className).toContain('emerald-500');
  });

  it('should create TP hit variant for partial tone', () => {
    const variant = getTpHitVariant(2, 'partial');
    
    expect(variant.label).toBe('TP2 HIT');
    expect(variant.tone).toBe('partial');
    expect(variant.iconKey).toBe('target');
    expect(variant.className).toContain('amber-500');
  });
});