/**
 * Tests for challenge code encoding/decoding (V3 raw URL format).
 */

// Mock dependencies before importing
jest.mock('../../data', () => ({
  getAllFlags: () => [],
}));
jest.mock('../../data/countryAliases', () => ({
  twinPairs: [],
}));
jest.mock('../gameEngine', () => ({
  shuffleArray: <T>(arr: T[]) => arr,
}));

import { encodeChallenge, decodeChallenge, generateShortCode, ChallengeData, encodeResponse, decodeResponse, ChallengeResponseData } from '../challengeCode';

function makeChallengeData(overrides: Partial<ChallengeData> = {}): ChallengeData {
  return {
    hostName: 'Player1',
    mode: 'easy',
    timeLimit: 15,
    flagIds: ['US', 'FR', 'DE', 'JP', 'BR'],
    hostResults: [
      { correct: true, timeMs: 2000 },
      { correct: false, timeMs: 0 },
      { correct: true, timeMs: 1500 },
      { correct: true, timeMs: 3000 },
      { correct: false, timeMs: 0 },
    ],
    ...overrides,
  };
}

describe('encodeChallenge', () => {
  it('encodes a typical challenge', () => {
    const encoded = encodeChallenge(makeChallengeData());
    expect(encoded).not.toBeNull();
    expect(encoded).toContain('~');
    const parts = encoded!.split('~');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('Player1');
  });

  it('returns null for invalid flag IDs (wrong length)', () => {
    expect(encodeChallenge(makeChallengeData({ flagIds: ['USA', 'FR'] }))).toBeNull();
  });

  it('returns null for unsupported mode', () => {
    expect(encodeChallenge(makeChallengeData({ mode: 'nonexistent' as any }))).toBeNull();
  });

  it('returns null when flagIds.length > 30', () => {
    const flagIds = Array.from({ length: 31 }, () => 'US');
    const hostResults = flagIds.map(() => ({ correct: true, timeMs: 1000 }));
    expect(encodeChallenge(makeChallengeData({ flagIds, hostResults }))).toBeNull();
  });

  it('returns null when hostResults.length !== flagIds.length', () => {
    expect(encodeChallenge(makeChallengeData({
      flagIds: ['US', 'FR'],
      hostResults: [{ correct: true, timeMs: 1000 }],
    }))).toBeNull();
  });

  it('sanitizes hostName (spaces, special chars)', () => {
    const encoded = encodeChallenge(makeChallengeData({ hostName: 'John Doe!!!' }));
    expect(encoded).not.toBeNull();
    expect(encoded!.split('~')[0]).toBe('John_Doe');
  });
});

describe('decodeChallenge', () => {
  it('roundtrips a typical 5-flag challenge', () => {
    const original = makeChallengeData();
    const encoded = encodeChallenge(original)!;
    const result = decodeChallenge(encoded);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;

    expect(result.data.mode).toBe(original.mode);
    expect(result.data.timeLimit).toBe(original.timeLimit);
    expect(result.data.flagIds).toEqual(original.flagIds);
    expect(result.data.hostResults.map((r) => r.correct)).toEqual(
      original.hostResults.map((r) => r.correct),
    );
  });

  it('roundtrips a 1-flag challenge', () => {
    const data = makeChallengeData({
      flagIds: ['US'],
      hostResults: [{ correct: true, timeMs: 5000 }],
    });
    const encoded = encodeChallenge(data)!;
    const result = decodeChallenge(encoded);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.data.flagIds).toEqual(['US']);
    expect(result.data.hostResults[0].correct).toBe(true);
  });

  it('roundtrips a 30-flag challenge (max)', () => {
    const flagIds = Array.from({ length: 30 }, (_, i) => String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + ((i + 1) % 26)));
    const hostResults = flagIds.map((_, i) => ({ correct: i % 3 !== 0, timeMs: i % 3 !== 0 ? 1000 : 0 }));
    const data = makeChallengeData({ flagIds, hostResults });
    const encoded = encodeChallenge(data)!;
    expect(encoded).not.toBeNull();

    const result = decodeChallenge(encoded);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.data.hostResults.map((r) => r.correct)).toEqual(
      hostResults.map((r) => r.correct),
    );
  });

  it.each([
    [true, 'all-correct'],
    [false, 'all-wrong'],
  ] as const)('roundtrips %s results', (correct, _label) => {
    const flagIds = ['US', 'FR', 'DE', 'JP', 'BR'];
    const hostResults = flagIds.map(() => ({ correct, timeMs: correct ? 2000 : 0 }));
    const data = makeChallengeData({ flagIds, hostResults });
    const encoded = encodeChallenge(data)!;
    const result = decodeChallenge(encoded);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.data.hostResults.every((r) => r.correct === correct)).toBe(true);
  });

  it('returns invalid for corrupted hex', () => {
    const result = decodeChallenge('Player~1~15~USFR~ZZZZ~100');
    expect(result.status).toBe('invalid');
  });

  it('returns invalid for wrong number of parts', () => {
    const result = decodeChallenge('Player~1~15~USFR');
    expect(result.status).toBe('invalid');
  });

  it('returns invalid for odd-length flags', () => {
    const result = decodeChallenge('Player~1~15~USF~1~100');
    expect(result.status).toBe('invalid');
  });

  it('returns invalid for flags > 60 chars (30 flags)', () => {
    const flags = 'US'.repeat(31); // 62 chars
    const result = decodeChallenge(`Player~1~15~${flags}~1~100`);
    expect(result.status).toBe('invalid');
  });

  it.each([
    'https://flagthat.app/c/',
    'http://flagthat.app/c/',
    'flagthat://c/',
  ])('strips URL prefix %s', (prefix) => {
    const data = makeChallengeData({ flagIds: ['US', 'FR'], hostResults: [{ correct: true, timeMs: 1000 }, { correct: false, timeMs: 0 }] });
    const encoded = encodeChallenge(data)!;
    expect(decodeChallenge(`${prefix}${encoded}`).status).toBe('ok');
  });
});

describe('unsigned bit-packing (>>> 0)', () => {
  it('handles 30 flags all correct without sign corruption', () => {
    const flagIds = Array.from({ length: 30 }, () => 'US');
    const hostResults = flagIds.map(() => ({ correct: true, timeMs: 1000 }));
    const data = makeChallengeData({ flagIds, hostResults });
    const encoded = encodeChallenge(data)!;

    // The hex for 30 bits all-1 should be 3fffffff, not negative
    const hexPart = encoded.split('~')[4];
    expect(hexPart).toBe('3fffffff');
    expect(hexPart).not.toContain('-');

    const result = decodeChallenge(encoded);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.data.hostResults.every((r) => r.correct)).toBe(true);
  });
});

function makeResponseData(overrides: Partial<ChallengeResponseData> = {}): ChallengeResponseData {
  return {
    recipientName: 'Alice',
    shortCode: 'Ab3xQ1',
    recipientScore: 3,
    totalFlags: 5,
    resultDetails: [true, false, true, true, false],
    ...overrides,
  };
}

describe('encodeResponse / decodeResponse', () => {
  it('roundtrips a response with resultDetails', () => {
    const data = makeResponseData();
    const encoded = encodeResponse(data);
    expect(encoded).toContain('R~');

    const result = decodeResponse(encoded);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.data.recipientName).toBe('Alice');
    expect(result.data.shortCode).toBe('Ab3xQ1');
    expect(result.data.recipientScore).toBe(3);
    expect(result.data.totalFlags).toBe(5);
    expect(result.data.resultDetails).toEqual([true, false, true, true, false]);
  });

  it('roundtrips a response without resultDetails (legacy format)', () => {
    const data = makeResponseData({ resultDetails: undefined });
    const encoded = encodeResponse(data);
    // Should have exactly 4 parts after R~
    expect(encoded.slice(2).split('~')).toHaveLength(4);

    const result = decodeResponse(encoded);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.data.resultDetails).toBeUndefined();
  });

  it('skips resultDetails when length mismatches totalFlags', () => {
    const data = makeResponseData({ totalFlags: 5, resultDetails: [true, false, true] });
    const encoded = encodeResponse(data);
    // Should fall back to base format (no hex suffix)
    expect(encoded.slice(2).split('~')).toHaveLength(4);
  });

  it('handles all-correct results', () => {
    const data = makeResponseData({
      totalFlags: 5,
      recipientScore: 5,
      resultDetails: [true, true, true, true, true],
    });
    const encoded = encodeResponse(data);
    const result = decodeResponse(encoded);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.data.resultDetails).toEqual([true, true, true, true, true]);
  });

  it('handles all-wrong results', () => {
    const data = makeResponseData({
      totalFlags: 5,
      recipientScore: 0,
      resultDetails: [false, false, false, false, false],
    });
    const encoded = encodeResponse(data);
    const result = decodeResponse(encoded);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.data.resultDetails).toEqual([false, false, false, false, false]);
  });

  it('handles 30-flag response (max)', () => {
    const details = Array.from({ length: 30 }, (_, i) => i % 2 === 0);
    const data = makeResponseData({ totalFlags: 30, recipientScore: 15, resultDetails: details });
    const encoded = encodeResponse(data);
    const result = decodeResponse(encoded);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.data.resultDetails).toEqual(details);
  });

  it('strips URL prefix from response codes', () => {
    const data = makeResponseData();
    const encoded = encodeResponse(data);
    const result = decodeResponse(`https://flagthat.app/r/${encoded}`);
    expect(result.status).toBe('ok');
  });

  it('returns invalid for malformed codes', () => {
    expect(decodeResponse('garbage').status).toBe('invalid');
    expect(decodeResponse('R~').status).toBe('invalid');
    expect(decodeResponse('R~name~short~nan~5').status).toBe('invalid');
    expect(decodeResponse('R~name~bad~3~5').status).toBe('invalid'); // shortCode wrong length
  });
});

describe('generateShortCode', () => {
  it('returns a 6-character code', () => {
    const code = generateShortCode(makeChallengeData());
    expect(code).toHaveLength(6);
  });

  it('is deterministic for same input', () => {
    const data = makeChallengeData();
    expect(generateShortCode(data)).toBe(generateShortCode(data));
  });

  it('produces different codes for different inputs', () => {
    const code1 = generateShortCode(makeChallengeData({ hostName: 'Alice' }));
    const code2 = generateShortCode(makeChallengeData({ hostName: 'Bob' }));
    expect(code1).not.toBe(code2);
  });
});
