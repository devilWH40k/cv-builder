import { formatCompactRelativeTime } from './compact-relative-time';

describe('Compact relative time', () => {
  const now = Date.UTC(2026, 9, 12, 12);
  const cases: readonly [number, string][] = [
    [0, 'just now'], [15, 'just now'], [59, 'just now'],
    [60, '1min ago'], [5 * 60 + 45, '5min ago'], [3599, '59min ago'],
    [3600, '1h ago'], [2 * 3600 + 40 * 60, '2h ago'], [86399, '23h ago'],
    [86400, '1d 0h ago'], [2 * 86400 + 4 * 3600 + 30 * 60, '2d 4h ago'],
    [7 * 86400 - 1, '6d 23h ago'], [7 * 86400, '1w ago'],
    [24 * 86400 + 4 * 3600, '3w ago'], [30 * 86400 - 1, '4w ago'],
    [30 * 86400, '1m+ ago'], [400 * 86400, '1m+ ago']
  ];

  for (const [seconds, expected] of cases) {
    it(`formats ${seconds} elapsed seconds as ${expected}`, () => {
      expect(formatCompactRelativeTime(now - seconds * 1000, now)).toBe(expected);
    });
  }

  it('shows just now until a full minute has elapsed, including future timestamps', () => {
    expect(formatCompactRelativeTime(now - 59999, now)).toBe('just now');
    expect(formatCompactRelativeTime(now - 60000, now)).toBe('1min ago');
    expect(formatCompactRelativeTime(now + 1000, now)).toBe('just now');
  });
});
