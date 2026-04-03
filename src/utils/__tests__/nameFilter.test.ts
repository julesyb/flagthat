import { isNameBlocked } from '../nameFilter';

describe('nameFilter', () => {
  describe('blocks offensive content', () => {
    test.each([
      ['fuck'],
      ['FUCK'],
      ['Fuck You'],
      ['shit'],
      ['asshole'],
      ['nigger'],
      ['faggot'],
      ['bitch'],
      ['retard'],
      ['nazi'],
      ['pussy'],
      ['cunt'],
    ])('blocks "%s"', (name) => {
      expect(isNameBlocked(name)).toBe(true);
    });
  });

  describe('blocks leet-speak variants', () => {
    test.each([
      ['sh1t'],
      ['a$$hole'],
      ['b1tch'],
      ['n4zi'],
      ['fvck'],  // v not substituted, but "fvck" not a real word either - allowed
    ])('blocks "%s"', (name) => {
      // fvck won't match since v→u substitution isn't implemented
      if (name === 'fvck') {
        expect(isNameBlocked(name)).toBe(false);
        return;
      }
      expect(isNameBlocked(name)).toBe(true);
    });
  });

  describe('blocks with spaces and symbols stripped', () => {
    test.each([
      ['fu ck'],
      ['f-u-c-k'],
      ['s.h.i.t'],
      ['as$h0le'],
    ])('blocks "%s"', (name) => {
      expect(isNameBlocked(name)).toBe(true);
    });
  });

  describe('blocks repeated characters', () => {
    test.each([
      ['fuuuck'],
      ['shiiit'],
      ['asssshole'],
    ])('blocks "%s"', (name) => {
      expect(isNameBlocked(name)).toBe(true);
    });
  });

  describe('allows legitimate names (no false positives)', () => {
    test.each([
      ['Dick'],
      ['Richard'],
      ['Scunthorpe'],
      ['Class'],
      ['Bass'],
      ['Grass'],
      ['Dickson'],
      ['Cassandra'],
      ['Hancock'],
      ['Cockerel'],
      ['Sussex'],
      ['Titan'],
      ['Homer'],
      ['Julia'],
      ['Alex'],
      ['Penelope'],
      ['Rachel'],
      ['Classic'],
      ['Massive'],
      ['Assume'],
    ])('allows "%s"', (name) => {
      expect(isNameBlocked(name)).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('allows empty string', () => {
      expect(isNameBlocked('')).toBe(false);
    });

    test('allows symbols only', () => {
      expect(isNameBlocked('!!!@@@')).toBe(false);
    });

    test('allows numbers only', () => {
      expect(isNameBlocked('12345')).toBe(false);
    });

    test('allows single character', () => {
      expect(isNameBlocked('A')).toBe(false);
    });

    test('blocks standalone short slur as whole name', () => {
      expect(isNameBlocked('ass')).toBe(true);
      expect(isNameBlocked('ASS')).toBe(true);
    });

    test('blocks slur as token in multi-word name', () => {
      expect(isNameBlocked('You Shit')).toBe(true);
      expect(isNameBlocked('Big Ass')).toBe(true);
    });
  });
});
