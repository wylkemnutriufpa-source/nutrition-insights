import { describe, it, expect } from 'vitest';
import { normalizeSubstitutions, formatFinalDescription } from '../mealEditorHelpers';

describe('mealEditorHelpers', () => {
  describe('normalizeSubstitutions', () => {
    it('should trim, collapse spaces and filter empty strings', () => {
      const input = ['  banana  ', 'pão   integral', '', '   '];
      const expected = ['banana', 'pão integral'];
      expect(normalizeSubstitutions(input)).toEqual(expected);
    });

    it('should remove duplicates and sort alphabetically', () => {
      const input = ['zebra', 'apple', 'zebra', 'banana'];
      const expected = ['apple', 'banana', 'zebra'];
      expect(normalizeSubstitutions(input)).toEqual(expected);
    });

    it('should limit to exactly 4 items', () => {
      const input = ['1', '2', '3', '4', '5'];
      const result = normalizeSubstitutions(input);
      expect(result).toHaveLength(4);
      expect(result).toEqual(['1', '2', '3', '4']);
    });
  });

  describe('formatFinalDescription', () => {
    it('should add section with exactly two new lines', () => {
      const desc = 'Base content';
      const subs = ['Sub 1'];
      const result = formatFinalDescription(desc, subs);
      expect(result).toBe('Base content\n\n🔄 Substituições:\nSub 1');
    });

    it('should not duplicate the section if it already exists', () => {
      const desc = 'Base content\n\n🔄 Substituições:\nOld Sub';
      const subs = ['New Sub'];
      const result = formatFinalDescription(desc, subs);
      expect(result).toBe('Base content\n\n🔄 Substituições:\nNew Sub');
      expect(result.match(/🔄 Substituições:/g)).toHaveLength(1);
    });

    it('should return original description if no subs provided', () => {
      const desc = 'Base content';
      const subs: string[] = [];
      expect(formatFinalDescription(desc, subs)).toBe('Base content');
    });
  });
});
