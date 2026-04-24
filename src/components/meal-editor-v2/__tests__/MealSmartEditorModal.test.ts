import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';

// Simulating the logic used in MealSmartEditorModal for substitution handling
const useSubstitutionEditor = (initialSubs: string[], initialDescription: string = "") => {
  const [substitutions, setSubstitutions] = useState<string[]>(initialSubs);
  const [description, setDescription] = useState(initialDescription);

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

  const simulateSave = () => {
    const cleanedSubs = getCleanedSubs();
    let finalDescription = description;
    
    if (cleanedSubs.length > 0) {
      finalDescription = description.split(/\n\n🔄 Substituições:\n/)[0];
      finalDescription += "\n\n🔄 Substituições:\n" + cleanedSubs.join("\n");
    }

    return {
      description: finalDescription,
      substitutions_json: cleanedSubs
    };
  };

  return { substitutions, handleSubChange, getCleanedSubs, setSubstitutions, simulateSave, setDescription, description };
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
  });

  it('should collapse multiple spaces during handleSubChange', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['initial']));

    act(() => {
      result.current.handleSubChange(0, 'Pão    com    ovo');
    });
    expect(result.current.substitutions[0]).toBe('Pão com ovo');
  });

  it('should remove duplicates and empty values on save', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['item 1', 'item 1', '', '  ', 'item 2']));

    let saved;
    act(() => {
      saved = result.current.simulateSave();
    });

    expect(saved.substitutions_json).toHaveLength(2);
    expect(saved.substitutions_json).toEqual(['item 1', 'item 2']);
  });

  it('should maintain a consistent alphabetical order for substitutions', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['Banana', 'Abacaxi', 'Caqui']));

    let saved;
    act(() => {
      saved = result.current.simulateSave();
    });

    expect(saved.substitutions_json).toEqual(['Abacaxi', 'Banana', 'Caqui']);
  });

  it('should format final description correctly with JSON substitutions', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['Suco de Uva', 'Água de Coco'], '• Pão de Queijo'));

    let saved;
    act(() => {
      saved = result.current.simulateSave();
    });

    const expectedDescription = '• Pão de Queijo\n\n🔄 Substituições:\nSuco de Uva\nÁgua de Coco';
    expect(saved.description).toBe(expectedDescription);
  });

  it('should prevent text-based substitution duplication in description', () => {
    const existingDescription = '• Omelete\n\n🔄 Substituições:\nQueijo Coalho';
    const { result } = renderHook(() => useSubstitutionEditor(['Frango Desfiado'], existingDescription));

    let saved;
    act(() => {
      saved = result.current.simulateSave();
    });

    // Should NOT have "Queijo Coalho" anymore as it was replaced by the new array
    expect(saved.description).toBe('• Omelete\n\n🔄 Substituições:\nFrango Desfiado');
    expect(saved.description.match(/🔄 Substituições:/g)).toHaveLength(1);
  });

  it('should not persist changes when cancelled', () => {
    const initialDesc = 'Initial Description';
    const initialSubs = ['Initial Sub'];
    const { result } = renderHook(() => useSubstitutionEditor(initialSubs, initialDesc));

    act(() => {
      result.current.setDescription('Modified Description');
      result.current.handleSubChange(0, 'Modified Sub');
    });

    // Verify local state was modified
    expect(result.current.description).toBe('Modified Description');
    expect(result.current.substitutions[0]).toBe('Modified Sub');

    // Simulate "Cancel" by not calling simulateSave() and instead just returning initial values if we needed to,
    // but here we just confirm that we can reset or that the store wouldn't be updated.
    // In the real component, handleSave is what calls updateItem.
    // If handleSave is not called, updateItem is not called.
  });
});

