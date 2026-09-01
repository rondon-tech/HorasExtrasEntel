import { describe, it, expect } from 'vitest';
import { evaluateRecordRules, parseTimeToMinutes, shiftDurationHours } from './anomaly.js';

describe('parseTimeToMinutes', () => {
  it('parses HH:MM to minutes', () => {
    expect(parseTimeToMinutes('08:30')).toBe(510);
    expect(parseTimeToMinutes('22:00')).toBe(1320);
  });

  it('returns null for invalid values', () => {
    expect(parseTimeToMinutes('99:99')).toBeNull();
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes('12:60')).toBeNull();
    expect(parseTimeToMinutes('')).toBeNull();
    expect(parseTimeToMinutes(undefined)).toBeNull();
  });
});

describe('shiftDurationHours', () => {
  it('computes same-day duration', () => {
    expect(shiftDurationHours({ startTime: '09:00', endTime: '17:00' })).toBe(8);
  });

  it('treats end <= start as overnight shift', () => {
    expect(shiftDurationHours({ startTime: '22:00', endTime: '06:00' })).toBe(8);
  });
});

describe('evaluateRecordRules', () => {
  const base = { startTime: '18:00', endTime: '22:00', dayType: 'Normal', date: '2026-08-15' };

  it('passes a clean record', () => {
    const anomalies = evaluateRecordRules({ ...base, extraHours: 4 }, { monthTotalBefore: 10, monthlyCap: 60 });
    expect(anomalies).toHaveLength(0);
  });

  it('flags extra hours above the daily legal cap', () => {
    const anomalies = evaluateRecordRules({ ...base, extraHours: 14 });
    expect(anomalies.some((a) => a.type === 'daily_cap_exceeded')).toBe(true);
    expect(anomalies.find((a) => a.type === 'daily_cap_exceeded').score).toBe(100);
  });

  it('flags declared hours exceeding the shift window', () => {
    const anomalies = evaluateRecordRules({ ...base, extraHours: 5 });
    expect(anomalies.some((a) => a.type === 'extra_hours_exceed_shift')).toBe(true);
  });

  it('does not flag overnight shift whose declared hours fit the window', () => {
    const anomalies = evaluateRecordRules({ ...base, startTime: '22:00', endTime: '06:00', extraHours: 7 });
    expect(anomalies.some((a) => a.type === 'extra_hours_exceed_shift')).toBe(false);
  });

  it('flags inconsistent time window with declared hours', () => {
    const anomalies = evaluateRecordRules({ ...base, startTime: '09:00', endTime: '09:15', extraHours: 3 });
    expect(anomalies.some((a) => a.type === 'inconsistent_time_window')).toBe(true);
  });

  it('flags month total exceeding the monthly cap', () => {
    const anomalies = evaluateRecordRules({ ...base, extraHours: 4 }, { monthTotalBefore: 58, monthlyCap: 60 });
    expect(anomalies.some((a) => a.type === 'monthly_cap_exceeded')).toBe(true);
  });

  it('does not flag month total below the cap', () => {
    const anomalies = evaluateRecordRules({ ...base, extraHours: 4 }, { monthTotalBefore: 20, monthlyCap: 60 });
    expect(anomalies.some((a) => a.type === 'monthly_cap_exceeded')).toBe(false);
  });

  it('accepts raw DB row shape (extra_hours snake_case)', () => {
    const anomalies = evaluateRecordRules({ ...base, extra_hours: 14 });
    expect(anomalies.some((a) => a.type === 'daily_cap_exceeded')).toBe(true);
  });
});
