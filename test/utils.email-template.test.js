import { describe, it, expect } from 'vitest';
import { generateEmailTemplate, emailTemplates } from '../utils/email-template.js';

describe('utils/email-template', () => {
  const base = {
    userName: 'Ada',
    subscriptionName: 'Pro Plan',
    renewalDate: 'Jan 1, 2026',
    planName: 'Pro',
    price: 'USD 10 (monthly)',
    paymentMethod: 'VISA **** 4242'
  };

  it('generateEmailTemplate injects fields', () => {
    const html = generateEmailTemplate({ ...base, daysLeft: 7 });
    expect(html).toContain('Hello <strong style="color: #4a90e2;">Ada</strong>');
    expect(html).toContain('Your <strong>Pro Plan</strong> subscription');
    expect(html).toContain('Jan 1, 2026');
    expect(html).toContain('<strong>Plan:</strong> Pro');
    expect(html).toContain('<strong>Price:</strong> USD 10 (monthly)');
    expect(html).toContain('<strong>Payment Method:</strong> VISA **** 4242');
  });

  it('emailTemplates generate correct subjects/bodies', () => {
    const labels = emailTemplates.map(t => t.label);
    expect(labels).toEqual([
      '7 days before reminder',
      '5 days before reminder',
      '2 days before reminder',
      '1 days before reminder'
    ]);

    const t7 = emailTemplates[0];
    expect(t7.generateSubject(base)).toContain('Renews in 7 Days');
    const body = t7.generateBody(base);
    expect(body).toContain('(7 days from today)');
  });
});