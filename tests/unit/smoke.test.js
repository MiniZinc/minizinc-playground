import { expect, test } from 'vitest';

test('runs pure unit tests in the Node environment', () => {
    expect(typeof window).toBe('undefined');
});
