import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../config/nodemailer.js', () => {
  return { default: { sendMail: vi.fn((opts, cb) => cb(null, { response: 'ok' })) } };
});

import transporter from '../config/nodemailer.js';
import { sendReminderEmail } from '../utils/send-email.js';

afterEach(() => vi.clearAllMocks());

const subscription = {
  name: 'Pro Plan',
  currency: 'USD',
  price: 10,
  frequency: 'monthly',
  paymentMethod: 'VISA **** 4242',
  renewalDate: new Date('2030-01-10T00:00:00.000Z'),
  user: { name: 'Ada', email: 'ada@example.com' },
};

describe('utils/send-email', () => {
  it('sends email for valid template', async () => {
    await sendReminderEmail({ to: 'ada@example.com', type: '7 days before reminder', subscription });
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    const arg = transporter.sendMail.mock.calls[0][0];
    expect(arg.from).toBe(process.env.EMAIL_USER);
    expect(arg.to).toBe('ada@example.com');
    expect(arg.subject).toMatch(/Renews in 7 Days/i);
    expect(arg.html).toContain('Your <strong>Pro Plan</strong> subscription');
  });

  it('throws on missing params', async () => {
    await expect(sendReminderEmail({})).rejects.toThrow(/Missing required parameters/);
  });

  it('throws on invalid template type', async () => {
    await expect(sendReminderEmail({ to: 'x', type: 'NOPE', subscription })).rejects.toThrow(/Invalid email type/);
  });
});