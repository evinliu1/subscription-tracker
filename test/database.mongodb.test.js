import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('mongoose', () => {
  const connect = vi.fn();
  return { default: { connect }, connect };
});

import mongoose from 'mongoose';

afterEach(() => vi.restoreAllMocks());

describe('database/mongodb', () => {
  it('connectToDatabase calls mongoose.connect', async () => {
    const mod = await import('../database/mongodb.js');
    await mod.default();
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.DB_URI);
  });
});