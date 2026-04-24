import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';

// Simulating the logic used in MealSmartEditorModal for substitution handling
const useSubstitutionEditor = (initialSubs: string[]) => {
  const [substitutions, setSubstitutions] = useState<string[]>(initialSubs);

  const handleSubChange = (idx: number, value: any) => {
    const val = String(value).replace(/\s+/g, ' ');
    const next = [...substitutions];
    next[idx] = val;
    setSubstitutions(next);
  };

  const getCleanedSubs = () => {
    return Array.from(new Set(
      substitutions
        .map(s => String(s).trim().replace(/\s+/g, ' '))
        .filter(s => s.length > 0)
    )).sort();
  };

  return { substitutions, handleSubChange, getCleanedSubs, setSubstitutions };
};

describe('MealSmartEditorModal Substitution Logic', () => {
  it('should convert any input value to string in handleSubChange', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['initial']));

    act(() => {
      // @ts-ignore - testing non-string input
      result.current.handleSubChange(0, 123);
    });
    expect(typeof result.current.substitutions[0]).toBe('string');
    expect(result.current.substitutions[0]).toBe('123');

    act(() => {
      // @ts-ignore - testing object input
      result.current.handleSubChange(0, { key: 'val' });
    });
    expect(result.current.substitutions[0]).toBe('[object Object]');
  });

  it('should collapse multiple spaces during handleSubChange', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['initial']));

    act(() => {
      result.current.handleSubChange(0, 'Pão    com    ovo');
    });
    expect(result.current.substitutions[0]).toBe('Pão com ovo');
  });

  it('should remove duplicates and empty values on save (getCleanedSubs)', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['item 1', 'item 1', '', '  ', 'item 2']));

    let cleaned: string[] = [];
    act(() => {
      cleaned = result.current.getCleanedSubs();
    });

    expect(cleaned).toHaveLength(2);
    expect(cleaned).toContain('item 1');
    expect(cleaned).toContain('item 2');
    expect(cleaned).not.toContain('');
  });

  it('should maintain a consistent alphabetical order for substitutions', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['Banana', 'Abacaxi', 'Caqui']));

    let cleaned: string[] = [];
    act(() => {
      cleaned = result.current.getCleanedSubs();
    });

    expect(cleaned).toEqual(['Abacaxi', 'Banana', 'Caqui']);
  });
});
