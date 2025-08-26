/* eslint-disable @typescript-eslint/consistent-type-imports */
import { faker } from '@faker-js/faker';

// Update incorrect import to use the canonical TradeAlertData
import type { TradeAlertData } from '@/types/TradeAlertData';

export const createMockTradeAlert = (overrides?: Partial<TradeAlertData>): TradeAlertData => {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    asset_name: faker.finance.currencyName(),
    tradermade_symbol: faker.finance.currencyCode(),
    trade_type: faker.helpers.arrayElement(['buy', 'sell', 'buy_limit', 'sell_limit']),
    entry_price: faker.number.float(),
    stop_loss: faker.number.float(),
    status: faker.helpers.arrayElement(['pending', 'active', 'closed', 'partially_profited']),
    tp1: faker.number.float(),
    tp2: faker.number.float(),
    tp_hits: [],
    notes: faker.lorem.sentence(),
    created_date: faker.date.past().toISOString(),
    updated_date: faker.date.recent().toISOString(),
    creator: {
      id: faker.string.uuid(),
      display_name: faker.person.fullName(),
      role: faker.person.jobType(),
      avatar_url: faker.image.avatar(),
    },
    ...overrides,
  };
};
