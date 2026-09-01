import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/db.js', () => {
  const mockQuery = vi.fn();
  return {
    pool: { query: mockQuery, on: vi.fn() },
    __mockQuery: mockQuery,
  };
});

vi.mock('../config/env.js', () => ({
  getConfig: () => ({ AGENT_DAILY_TOKEN_BUDGET: 1000 }),
}));

const { __mockQuery: query } = await import('../config/db.js');
const { assertBudget, getTokensUsedToday } = await import('./budget.js');

describe('agent budget', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('sums today tokens for the user', async () => {
    query.mockResolvedValueOnce({ rows: [{ used: 250 }] });
    const used = await getTokensUsedToday('user-1');
    expect(used).toBe(250);
    expect(query.mock.calls[0][1]).toEqual(['user-1', 'America/Santiago']);
  });

  it('allows chat when usage is below budget', async () => {
    query.mockResolvedValueOnce({ rows: [{ used: 999 }] });
    await expect(assertBudget('user-1')).resolves.toEqual({ used: 999, budget: 1000 });
  });

  it('throws 429 when the daily budget is exhausted', async () => {
    query.mockResolvedValueOnce({ rows: [{ used: 1000 }] });
    await expect(assertBudget('user-1')).rejects.toMatchObject({ status: 429 });
  });

  it('throws 429 when usage exceeds budget', async () => {
    query.mockResolvedValueOnce({ rows: [{ used: 5000 }] });
    await expect(assertBudget('user-1')).rejects.toMatchObject({ status: 429 });
  });
});
