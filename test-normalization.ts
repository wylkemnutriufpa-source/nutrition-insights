
import { normalizeFood } from './src/features/editor-v3/utils/normalization.ts';

const testArroz = {
  name: 'Arroz Branco Cozido',
  quantity: 125,
  measurementType: 'gram',
  portionValue: 100
};

const normalized = normalizeFood(testArroz);
console.log('Arroz Test:');
console.log('Original: 125g');
console.log(`Normalized: ${normalized.quantity} ${normalized.portionLabel} (${normalized.quantity * normalized.portionValue}g)`);

const testPao = {
  name: 'Pão Francês',
  quantity: 50,
  measurementType: 'gram',
  portionValue: 100
};

const normalizedPao = normalizeFood(testPao);
console.log('\nPão Test:');
console.log('Original: 50g');
console.log(`Normalized: ${normalizedPao.quantity} ${normalizedPao.portionLabel} (${normalizedPao.quantity * normalizedPao.portionValue}g)`);
