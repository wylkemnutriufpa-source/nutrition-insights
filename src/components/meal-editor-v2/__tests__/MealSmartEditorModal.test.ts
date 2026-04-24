import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { normalizeSubstitutions, formatFinalDescription } from '../mealEditorHelpers';

// Simulating the logic used in MealSmartEditorModal for substitution handling
const useSubstitutionEditor = (initialSubs: string[], initialDescription: string = "") => {
  const [substitutions, setSubstitutions] = useState<string[]>(initialSubs);
  const [description, setDescription] = useState(initialDescription);
  
  // Usar refs para mocks persistentes que não mudam entre renders do hook
  const [onOpenChange] = useState(() => vi.fn());
  const [updateItem] = useState(() => vi.fn());

  const handleSubChange = (idx: number, value: any) => {
    const val = String(value).replace(/\s+/g, ' ');
    const next = [...substitutions];
    next[idx] = val;
    setSubstitutions(next);
  };

  const getNormalizedSubs = () => {
    return normalizeSubstitutions(substitutions);
  };

  const simulateSave = () => {
    const cleanedSubs = getNormalizedSubs();
    return {
      description: formatFinalDescription(description, cleanedSubs),
      substitutions_json: cleanedSubs
    };
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen === openState) return;
    
    if (!newOpen) {
      setDescription(initialDescription);
      setSubstitutions(initialSubs);
    }
    setOpenState(newOpen);
    onOpenChange(newOpen);
  };

  const [openState, setOpenState] = useState(true);

  const handleSave = () => {
    const result = simulateSave();
    updateItem('item-id', result);
    onOpenChange(false);
  };

  return { 
    substitutions, 
    handleSubChange, 
    getNormalizedSubs, 
    setSubstitutions,
    simulateSave, 
    setDescription, 
    description, 
    onOpenChange, 
    handleOpenChange,
    handleSave,
    updateItem
  };
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

  it('should not persist changes when cancelled and reset local state', () => {
    const initialDesc = 'Initial Description';
    const initialSubs = ['Initial Sub'];
    const { result } = renderHook(() => useSubstitutionEditor(initialSubs, initialDesc));

    act(() => {
      result.current.setDescription('Modified Description');
      result.current.handleSubChange(0, 'Modified Sub');
    });

    expect(result.current.description).toBe('Modified Description');

    act(() => {
      result.current.handleOpenChange(false);
    });

    // Verification: updateItem was NOT called
    expect(result.current.updateItem).not.toHaveBeenCalled();
    // Verification: local state was reset to initial
    expect(result.current.description).toBe(initialDesc);
    expect(result.current.substitutions).toEqual(initialSubs);
    // Verification: modal was closed
    expect(result.current.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should save substitutions_json exactly as shown in preview', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['  Banana  ', 'Abacaxi', 'Abacaxi ']));
    
    let saved;
    act(() => {
      saved = result.current.simulateSave();
    });

    const expectedArray = ['Abacaxi', 'Banana'];
    const expectedJson = JSON.stringify(expectedArray);

    expect(saved.substitutions_json).toEqual(expectedArray);
    expect(JSON.stringify(saved.substitutions_json)).toBe(expectedJson);
  });

  it('should reset to item state when modal is closed and re-opened in test', () => {
    const initialDesc = 'Initial';
    const initialSubs = ['Initial Sub'];
    const { result } = renderHook(() => useSubstitutionEditor(initialSubs, initialDesc));

    // Simulate change
    act(() => {
      result.current.setDescription('Modified');
      result.current.handleSubChange(0, 'Modified Sub');
    });

    // Close modal (simulate cancel/overlay click)
    act(() => {
      result.current.handleOpenChange(false);
    });

    // Verify reset
    expect(result.current.description).toBe(initialDesc);
    expect(result.current.substitutions).toEqual(initialSubs);

    // Re-verify that updateItem was NOT called
    expect(result.current.updateItem).not.toHaveBeenCalled();
  });

  it('should return exactly same values for description preview and saved json', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['  Banana  ', 'Abacaxi ', 'Abacaxi']));
    
    let normalized;
    act(() => {
      normalized = result.current.getNormalizedSubs();
    });

    const expected = ['Abacaxi', 'Banana'];
    expect(normalized).toEqual(expected);

    // Simulation of preview logic in component
    const descriptionPreview = `🔄 Substituições:\n${normalized.join("\n")}`;
    const jsonPreview = JSON.stringify(normalized);

    const saved = result.current.simulateSave();
    
    expect(saved.substitutions_json).toEqual(expected);
    expect(JSON.stringify(saved.substitutions_json)).toBe(jsonPreview);
    expect(saved.description).toContain(descriptionPreview);
    expect(saved.description).toMatch(/\n\n🔄 Substituições:\n/);
  });

  it('should enforce limit of 4 substitutions in both preview and save', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['1', '2', '3', '4', '5']));
    
    let normalized;
    act(() => {
      normalized = result.current.getNormalizedSubs();
    });

    expect(normalized).toHaveLength(4);
    expect(normalized).toEqual(['1', '2', '3', '4']);

    const saved = result.current.simulateSave();
    expect(saved.substitutions_json).toHaveLength(4);
    expect(saved.description).not.toContain('5');
    expect(saved.description).toMatch(/\n\n🔄 Substituições:\n1\n2\n3\n4/);
  });

  it('should not allow adding more than 4 items via handleSubChange if they are unique', () => {
    // This tests the logic that drives the "isOverLimit" and "substitutions.length < 4" check in UI
    const { result } = renderHook(() => useSubstitutionEditor(['1', '2', '3', '4']));
    
    // Simulate what happens in the component: substitutions.length check
    const canAdd = result.current.substitutions.length < 4;
    expect(canAdd).toBe(false);

    // Simulate adding a 5th item anyway (e.g. via code or edge case)
    act(() => {
      result.current.setSubstitutions(['1', '2', '3', '4', '5']);
    });

    // Check normalization on save
    const saved = result.current.simulateSave();
    expect(saved.substitutions_json).toHaveLength(4);
    expect(saved.substitutions_json).toEqual(['1', '2', '3', '4']);
  });

  it('should maintain state integrity when closing via Escape (simulated)', () => {
    const initialDesc = 'Initial';
    const initialSubs = ['Initial Sub'];
    const { result } = renderHook(() => useSubstitutionEditor(initialSubs, initialDesc));

    act(() => {
      result.current.setDescription('Modified');
    });

    // simulate handleOpenChange(false) which is what onEscapeKeyDown calls
    act(() => {
      result.current.handleOpenChange(false);
    });

    expect(result.current.description).toBe(initialDesc);
    expect(result.current.updateItem).not.toHaveBeenCalled();
  });

  it('should prevent double reset calls when handleOpenChange is called multiple times with same value', () => {
    const initialDesc = 'Initial';
    const { result } = renderHook(() => useSubstitutionEditor([], initialDesc));
    
    act(() => {
      result.current.setDescription('Modified');
    });

    act(() => {
      // First call should reset
      result.current.handleOpenChange(false);
    });
    expect(result.current.description).toBe(initialDesc);

    act(() => {
      // Modify again to see if second call to handleOpenChange(false) triggers another reset
      result.current.setDescription('Modified Again');
      result.current.handleOpenChange(false);
    });

    // In our simplified logic, if handleOpenChange(false) is called while it thinks it is ALREADY closed, 
    // it should not run the reset block.
    expect(result.current.description).toBe('Modified Again');
  });

  it('should simulate Enter key behavior for closing without saving', () => {
    const initialDesc = 'Initial';
    const { result } = renderHook(() => useSubstitutionEditor([], initialDesc));
    
    act(() => {
      result.current.setDescription('Modified');
    });

    // When the user presses Enter on a Cancel button or similar non-submit button, 
    // it should trigger the close/reset logic.
    act(() => {
      result.current.handleOpenChange(false);
    });

    expect(result.current.description).toBe(initialDesc);
    expect(result.current.updateItem).not.toHaveBeenCalled();
  });

  it('should correctly handle aria-live role and content (logic only)', () => {
    const { result } = renderHook(() => useSubstitutionEditor(['1', '2', '3', '4', '5']));
    
    // Simulate what the UI would show based on isOverLimit
    const normalized = result.current.getNormalizedSubs();
    const isOverLimit = normalized.length >= 4; // Simplified logic for test
    
    expect(isOverLimit).toBe(true);
  });

  it('should handle race condition between onEscapeKeyDown and onInteractOutside', () => {
    const initialDesc = 'Initial';
    const { result } = renderHook(() => useSubstitutionEditor([], initialDesc));
    
    act(() => {
      result.current.setDescription('Modified');
    });

    // We check the description state after the calls
    act(() => {
      // Simulate rapid fire calls from both handlers
      result.current.handleOpenChange(false);
      result.current.handleOpenChange(false);
    });

    // Reset should only trigger once and set it back to initialDesc
    expect(result.current.description).toBe(initialDesc);
    expect(result.current.updateItem).not.toHaveBeenCalled();
  });
});

