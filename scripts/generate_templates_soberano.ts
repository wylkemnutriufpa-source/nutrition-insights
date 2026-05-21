import crypto from "crypto";
import fs from 'fs';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ARQUITETURA SOBERANA - FITJOURNEY 2.0
// Sistema NÃO gera dieta. Sistema apenas: CLASSIFICA → ESCOLHE → COPIA → RENDERIZA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const IMG = "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library";
const uid = () => crypto.randomUUID();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BIBLIOTECA VISUAL HOMOLOGADA (meal_visual_library)
// REGRA: Apenas alimentos desta biblioteca podem ser usados
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type FoodItem = {
  name: string;
  mass_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  image: string;
};

const FOODS: Record<string, FoodItem> = {
  // PROTEÍNAS
  frango_grelhado: { name: 'Frango Grelhado', mass_g: 150, kcal: 240, protein_g: 45, carbs_g: 0, fat_g: 6, image: `${IMG}/frango-grelhado.jpg` },
  peito_frango: { name: 'Peito de Frango', mass_g: 150, kcal: 220, protein_g: 48, carbs_g: 0, fat_g: 2, image: `${IMG}/peito-frango.jpg` },
  tilapia: { name: 'Filé de Tilápia', mass_g: 150, kcal: 200, protein_g: 40, carbs_g: 0, fat_g: 4, image: `${IMG}/tilapia-grelhada.jpg` },
  salmao: { name: 'Salmão Grelhado', mass_g: 150, kcal: 280, protein_g: 35, carbs_g: 0, fat_g: 18, image: `${IMG}/salmao-grelhado.jpg` },
  linguado: { name: 'Filé de Linguado', mass_g: 150, kcal: 180, protein_g: 38, carbs_g: 0, fat_g: 2, image: `${IMG}/linguado.jpg` },
  carne_vermelha: { name: 'Carne Vermelha', mass_g: 150, kcal: 320, protein_g: 38, carbs_g: 0, fat_g: 18, image: `${IMG}/carne-vermelha.jpg` },
  patinho: { name: 'Patinho Moído', mass_g: 150, kcal: 300, protein_g: 40, carbs_g: 0, fat_g: 12, image: `${IMG}/patinho-moido.jpg` },
  maminha: { name: 'Maminha Grelhada', mass_g: 120, kcal: 270, protein_g: 39, carbs_g: 0, fat_g: 12, image: `${IMG}/maminha-grelhada.jpg` },
  atum: { name: 'Atum em Lata', mass_g: 100, kcal: 130, protein_g: 28, carbs_g: 0, fat_g: 1, image: `${IMG}/atum.jpg` },
  sardinha: { name: 'Sardinha', mass_g: 100, kcal: 180, protein_g: 24, carbs_g: 0, fat_g: 10, image: `${IMG}/sardinha.jpg` },
  ovos_mexidos: { name: 'Ovos Mexidos', mass_g: 150, kcal: 220, protein_g: 18, carbs_g: 1, fat_g: 15, image: `${IMG}/ovo-mexido.jpg` },
  ovos_fritos: { name: 'Ovos Fritos', mass_g: 100, kcal: 180, protein_g: 12, carbs_g: 1, fat_g: 14, image: `${IMG}/ovo-frito.jpg` },
  
  // CARBOIDRATOS
  arroz_branco: { name: 'Arroz Branco', mass_g: 100, kcal: 130, protein_g: 2, carbs_g: 28, fat_g: 0, image: `${IMG}/arroz-com-frango.png` },
  arroz_integral: { name: 'Arroz Integral', mass_g: 100, kcal: 120, protein_g: 3, carbs_g: 25, fat_g: 1, image: `${IMG}/arroz-com-frango.png` },
  batata_doce: { name: 'Batata Doce', mass_g: 120, kcal: 90, protein_g: 1, carbs_g: 20, fat_g: 0, image: `${IMG}/batata-doce.jpg` },
  batata_branca: { name: 'Batata Branca', mass_g: 120, kcal: 100, protein_g: 2, carbs_g: 23, fat_g: 0, image: `${IMG}/batata-branca.jpg` },
  macarrao: { name: 'Macarrão', mass_g: 100, kcal: 150, protein_g: 5, carbs_g: 30, fat_g: 1, image: `${IMG}/arroz-com-franco.png` },
  pao_integral: { name: 'Pão Integral', mass_g: 50, kcal: 120, protein_g: 4, carbs_g: 24, fat_g: 1, image: `${IMG}/pao-integral.jpg` },
  tapioca: { name: 'Tapioca', mass_g: 50, kcal: 150, protein_g: 0, carbs_g: 37, fat_g: 0, image: `${IMG}/crepioca.jpg` },
  polenta: { name: 'Polenta', mass_g: 100, kcal: 140, protein_g: 3, carbs_g: 28, fat_g: 1, image: `${IMG}/polenta.jpg` },
  milho: { name: 'Milho', mass_g: 100, kcal: 110, protein_g: 3, carbs_g: 24, fat_g: 1, image: `${IMG}/milho.jpg` },
  mandioca: { name: 'Mandioca Cozida', mass_g: 100, kcal: 125, protein_g: 1, carbs_g: 30, fat_g: 0, image: `${IMG}/mandioca.jpg` },
  macaxeira: { name: 'Macaxeira', mass_g: 100, kcal: 125, protein_g: 1, carbs_g: 30, fat_g: 0, image: `${IMG}/macaxeira.jpg` },
  inhame: { name: 'Inhame', mass_g: 100, kcal: 115, protein_g: 2, carbs_g: 27, fat_g: 0, image: `${IMG}/inhame.jpg` },
  cuscuz: { name: 'Cuscuz', mass_g: 100, kcal: 112, protein_g: 4, carbs_g: 23, fat_g: 0, image: `${IMG}/cuscuz.jpg` },
  aveia: { name: 'Aveia em Flocos', mass_g: 30, kcal: 110, protein_g: 4, carbs_g: 17, fat_g: 2, image: `${IMG}/banana-com-aveia.jpg` },
  granola: { name: 'Granola', mass_g: 30, kcal: 140, protein_g: 4, carbs_g: 18, fat_g: 5, image: `${IMG}/granola.jpg` },
  
  // LEGUMINOSAS
  feijao_carioca: { name: 'Feijão Carioca', mass_g: 80, kcal: 70, protein_g: 5, carbs_g: 13, fat_g: 0, image: `${IMG}/feijao-carioca.jpg` },
  
  // VEGETAIS LIVRES
  salada_verde: { name: 'Salada Verde', mass_g: 100, kcal: 15, protein_g: 1, carbs_g: 3, fat_g: 0, image: `${IMG}/salada-verde.jpg` },
  legumes_vapor: { name: 'Legumes no Vapor', mass_g: 100, kcal: 40, protein_g: 2, carbs_g: 8, fat_g: 0, image: `${IMG}/legumes-vapor.jpg` },
  brocolis: { name: 'Brócolis', mass_g: 100, kcal: 35, protein_g: 3, carbs_g: 7, fat_g: 0, image: `${IMG}/brocolis.jpg` },
  couve: { name: 'Couve', mass_g: 100, kcal: 30, protein_g: 3, carbs_g: 5, fat_g: 0, image: `${IMG}/couve.jpg` },
  tomate: { name: 'Tomate', mass_g: 100, kcal: 18, protein_g: 1, carbs_g: 4, fat_g: 0, image: `${IMG}/tomate.jpg` },
  
  // FRUTAS
  banana: { name: 'Banana Prata', mass_g: 100, kcal: 70, protein_g: 1, carbs_g: 18, fat_g: 0, image: `${IMG}/banana-com-aveia.jpg` },
  maca: { name: 'Maçã', mass_g: 100, kcal: 50, protein_g: 0, carbs_g: 13, fat_g: 0, image: `${IMG}/maca.jpg` },
  mamao: { name: 'Mamão', mass_g: 100, kcal: 45, protein_g: 0, carbs_g: 11, fat_g: 0, image: `${IMG}/mamao-com-aveia.jpg` },
  laranja: { name: 'Laranja', mass_g: 100, kcal: 60, protein_g: 1, carbs_g: 15, fat_g: 0, image: `${IMG}/laranja.jpg` },
  morango: { name: 'Morango', mass_g: 100, kcal: 30, protein_g: 0, carbs_g: 7, fat_g: 0, image: `${IMG}/morango.jpg` },
  melancia: { name: 'Melancia', mass_g: 150, kcal: 40, protein_g: 0, carbs_g: 10, fat_g: 0, image: `${IMG}/melancia.jpg` },
  abacaxi: { name: 'Abacaxi', mass_g: 100, kcal: 50, protein_g: 0, carbs_g: 13, fat_g: 0, image: `${IMG}/abacaxi.jpg` },
  uva: { name: 'Uva', mass_g: 100, kcal: 70, protein_g: 0, carbs_g: 18, fat_g: 0, image: `${IMG}/uva.jpg` },
  manga: { name: 'Manga', mass_g: 100, kcal: 60, protein_g: 0, carbs_g: 15, fat_g: 0, image: `${IMG}/manga.jpg` },
  
  // LATICÍNIOS
  iogurte_natural: { name: 'Iogurte Natural', mass_g: 170, kcal: 100, protein_g: 7, carbs_g: 10, fat_g: 3, image: `${IMG}/kefir.jpg` },
  queijo_branco: { name: 'Queijo Branco', mass_g: 30, kcal: 70, protein_g: 5, carbs_g: 1, fat_g: 5, image: `${IMG}/pao-frances.jpg` },
  leite_integral: { name: 'Leite Integral', mass_g: 200, kcal: 140, protein_g: 7, carbs_g: 10, fat_g: 8, image: `${IMG}/leite.jpg` },
  requeijao: { name: 'Requeijão', mass_g: 30, kcal: 100, protein_g: 6, carbs_g: 1, fat_g: 8, image: `${IMG}/requeijao.jpg` },
  cottage: { name: 'Queijo Cottage', mass_g: 100, kcal: 98, protein_g: 11, carbs_g: 3, fat_g: 4, image: `${IMG}/cottage.jpg` },
  
  // OLEAGINOSAS
  castanhas: { name: 'Mix de Castanhas', mass_g: 30, kcal: 180, protein_g: 4, carbs_g: 6, fat_g: 16, image: `${IMG}/mix-castanhas.jpg` },
  amendoim: { name: 'Amendoim', mass_g: 30, kcal: 170, protein_g: 7, carbs_g: 5, fat_g: 14, image: `${IMG}/amendoim.jpg` },
  
  // SUPLEMENTOS
  whey_protein: { name: 'Whey Protein', mass_g: 30, kcal: 120, protein_g: 24, carbs_g: 3, fat_g: 1, image: `${IMG}/whey-protein.jpg` },
  
  // REGIONAIS
  churrasco: { name: 'Churrasco', mass_g: 150, kcal: 350, protein_g: 40, carbs_g: 0, fat_g: 20, image: `${IMG}/churrasco.jpg` },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIPOS DE COMPONENTES (Arquitetura Modular)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type ComponentType = 'proteina' | 'carboidrato' | 'leguminosa' | 'vegetais_livres' | 'fruta' | 'laticinios' | 'oleaginosas' | 'suplemento';

type Component = {
  id: string;
  type: ComponentType;
  primary: FoodItem;
  substitutions: FoodItem[];
};

type MealModule = {
  id: string;
  name: string;
  time: string;
  primary_image: string;  // APENAS 1 IMAGEM PRINCIPAL
  components: Component[];
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPER: Criar componente modular
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const component = (type: ComponentType, primaryKey: string, subsKeys: string[]): Component => {
  const primary = FOODS[primaryKey];
  if (!primary) throw new Error(`❌ Alimento "${primaryKey}" não existe na biblioteca visual`);
  
  const substitutions = subsKeys.map(key => {
    const food = FOODS[key];
    if (!food) throw new Error(`❌ Alimento "${key}" não existe na biblioteca visual`);
    return food;
  });
  
  return {
    id: uid(),
    type,
    primary,
    substitutions
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BIBLIOTECA DE MÓDULOS REUTILIZÁVEIS
// REGRA: Módulos são reutilizados entre dias (sincronização automática)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MODULES: Record<string, MealModule> = {
  // ═══════════════════════════════════════════════════════════════════════
  // CAFÉS DA MANHÃ - VARIAÇÕES COM PROTEÍNAS INTERCAMBIÁVEIS
  // ═══════════════════════════════════════════════════════════════════════
  
  // PÃO - 3 variações (ovo, queijo, frango)
  cafe_pao_ovo: {
    id: 'cafe_pao_ovo',
    name: 'Pão com Ovo',
    time: '08:00',
    primary_image: `${IMG}/ovo-mexido.jpg`,
    components: [
      component('carboidrato', 'pao_integral', ['tapioca', 'cuscuz', 'aveia']),
      component('proteina', 'ovos_mexidos', ['ovos_fritos', 'queijo_branco', 'frango_grelhado']),
      component('fruta', 'banana', ['maca', 'mamao', 'laranja'])
    ]
  },
  
  cafe_pao_queijo: {
    id: 'cafe_pao_queijo',
    name: 'Pão com Queijo',
    time: '08:00',
    primary_image: `${IMG}/pao-frances.jpg`,
    components: [
      component('carboidrato', 'pao_integral', ['tapioca', 'cuscuz', 'aveia']),
      component('proteina', 'queijo_branco', ['cottage', 'requeijao', 'ovos_mexidos', 'frango_grelhado']),
      component('fruta', 'banana', ['maca', 'mamao', 'laranja'])
    ]
  },
  
  cafe_pao_frango: {
    id: 'cafe_pao_frango',
    name: 'Pão com Frango Desfiado',
    time: '08:00',
    primary_image: `${IMG}/frango-grelhado.jpg`,
    components: [
      component('carboidrato', 'pao_integral', ['tapioca', 'cuscuz', 'aveia']),
      component('proteina', 'frango_grelhado', ['ovos_mexidos', 'queijo_branco', 'atum']),
      component('fruta', 'banana', ['maca', 'mamao', 'laranja'])
    ]
  },
  
  // TAPIOCA - 3 variações (ovo, queijo, frango)
  cafe_tapioca_ovo: {
    id: 'cafe_tapioca_ovo',
    name: 'Tapioca com Ovo',
    time: '07:30',
    primary_image: `${IMG}/ovo-mexido.jpg`,
    components: [
      component('carboidrato', 'tapioca', ['pao_integral', 'cuscuz', 'aveia']),
      component('proteina', 'ovos_mexidos', ['ovos_fritos', 'queijo_branco', 'frango_grelhado']),
      component('fruta', 'maca', ['banana', 'mamao', 'manga'])
    ]
  },
  
  cafe_tapioca_queijo: {
    id: 'cafe_tapioca_queijo',
    name: 'Tapioca com Queijo',
    time: '07:30',
    primary_image: `${IMG}/crepioca.jpg`,
    components: [
      component('carboidrato', 'tapioca', ['pao_integral', 'cuscuz', 'aveia']),
      component('proteina', 'queijo_branco', ['cottage', 'requeijao', 'ovos_mexidos', 'frango_grelhado']),
      component('fruta', 'maca', ['banana', 'mamao', 'manga'])
    ]
  },
  
  cafe_tapioca_frango: {
    id: 'cafe_tapioca_frango',
    name: 'Tapioca com Frango Desfiado',
    time: '07:30',
    primary_image: `${IMG}/frango-grelhado.jpg`,
    components: [
      component('carboidrato', 'tapioca', ['pao_integral', 'cuscuz', 'aveia']),
      component('proteina', 'frango_grelhado', ['ovos_mexidos', 'queijo_branco', 'atum']),
      component('fruta', 'maca', ['banana', 'mamao', 'manga'])
    ]
  },
  
  // CUSCUZ - 3 variações (ovo, queijo, frango)
  cafe_cuscuz_ovo: {
    id: 'cafe_cuscuz_ovo',
    name: 'Cuscuz com Ovo',
    time: '07:00',
    primary_image: `${IMG}/ovo-mexido.jpg`,
    components: [
      component('carboidrato', 'cuscuz', ['tapioca', 'pao_integral', 'aveia']),
      component('proteina', 'ovos_mexidos', ['ovos_fritos', 'queijo_branco', 'frango_grelhado']),
      component('fruta', 'banana', ['manga', 'mamao', 'maca'])
    ]
  },
  
  cafe_cuscuz_queijo: {
    id: 'cafe_cuscuz_queijo',
    name: 'Cuscuz com Queijo',
    time: '07:00',
    primary_image: `${IMG}/cuscuz.jpg`,
    components: [
      component('carboidrato', 'cuscuz', ['tapioca', 'pao_integral', 'aveia']),
      component('proteina', 'queijo_branco', ['cottage', 'requeijao', 'ovos_mexidos', 'frango_grelhado']),
      component('fruta', 'banana', ['manga', 'mamao', 'maca'])
    ]
  },
  
  cafe_cuscuz_frango: {
    id: 'cafe_cuscuz_frango',
    name: 'Cuscuz com Frango Desfiado',
    time: '07:00',
    primary_image: `${IMG}/frango-grelhado.jpg`,
    components: [
      component('carboidrato', 'cuscuz', ['tapioca', 'pao_integral', 'aveia']),
      component('proteina', 'frango_grelhado', ['ovos_mexidos', 'queijo_branco', 'atum']),
      component('fruta', 'banana', ['manga', 'mamao', 'maca'])
    ]
  },
  
  // AVEIA - opção sem proteína animal
  cafe_aveia_frutas: {
    id: 'cafe_aveia_frutas',
    name: 'Aveia com Frutas',
    time: '08:00',
    primary_image: `${IMG}/banana-com-aveia.jpg`,
    components: [
      component('carboidrato', 'aveia', ['granola', 'pao_integral', 'tapioca']),
      component('laticinios', 'iogurte_natural', ['leite_integral']),
      component('fruta', 'morango', ['banana', 'mamao', 'maca'])
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // ALMOÇOS
  // ═══════════════════════════════════════════════════════════════════════
  
  almoco_frango_arroz: {
    id: 'almoco_frango_arroz',
    name: 'Almoço Frango e Arroz',
    time: '12:30',
    primary_image: `${IMG}/frango-grelhado.jpg`,
    components: [
      component('proteina', 'frango_grelhado', ['peito_frango', 'tilapia', 'ovos_mexidos']),
      component('carboidrato', 'arroz_branco', ['arroz_integral', 'batata_doce', 'macarrao']),
      component('leguminosa', 'feijao_carioca', []),
      component('vegetais_livres', 'salada_verde', ['legumes_vapor', 'brocolis'])
    ]
  },
  
  almoco_peixe_batata: {
    id: 'almoco_peixe_batata',
    name: 'Almoço Peixe e Batata',
    time: '13:00',
    primary_image: `${IMG}/tilapia-grelhada.jpg`,
    components: [
      component('proteina', 'tilapia', ['salmao', 'linguado', 'frango_grelhado']),
      component('carboidrato', 'batata_doce', ['batata_branca', 'arroz_integral', 'mandioca']),
      component('vegetais_livres', 'salada_verde', ['brocolis', 'legumes_vapor'])
    ]
  },
  
  almoco_carne_polenta: {
    id: 'almoco_carne_polenta',
    name: 'Almoço Carne e Polenta',
    time: '12:30',
    primary_image: `${IMG}/carne-vermelha.jpg`,
    components: [
      component('proteina', 'carne_vermelha', ['patinho', 'maminha', 'frango_grelhado']),
      component('carboidrato', 'polenta', ['arroz_branco', 'batata_doce', 'milho']),
      component('leguminosa', 'feijao_carioca', []),
      component('vegetais_livres', 'salada_verde', ['legumes_vapor'])
    ]
  },
  
  almoco_macaxeira_nordeste: {
    id: 'almoco_macaxeira_nordeste',
    name: 'Almoço Nordestino com Macaxeira',
    time: '12:00',
    primary_image: `${IMG}/frango-grelhado.jpg`,
    components: [
      component('proteina', 'frango_grelhado', ['tilapia', 'sardinha', 'atum']),
      component('carboidrato', 'macaxeira', ['mandioca', 'inhame', 'arroz_branco']),
      component('leguminosa', 'feijao_carioca', []),
      component('vegetais_livres', 'salada_verde', ['tomate', 'couve'])
    ]
  },
  
  almoco_churrasco_sul: {
    id: 'almoco_churrasco_sul',
    name: 'Almoço Sulista com Churrasco',
    time: '12:30',
    primary_image: `${IMG}/churrasco.jpg`,
    components: [
      component('proteina', 'churrasco', ['maminha', 'carne_vermelha', 'frango_grelhado']),
      component('carboidrato', 'polenta', ['arroz_branco', 'batata_doce', 'milho']),
      component('vegetais_livres', 'salada_verde', ['legumes_vapor'])
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // JANTARES
  // ═══════════════════════════════════════════════════════════════════════
  
  jantar_peixe_legumes: {
    id: 'jantar_peixe_legumes',
    name: 'Jantar Peixe e Legumes',
    time: '19:30',
    primary_image: `${IMG}/tilapia-grelhada.jpg`,
    components: [
      component('proteina', 'tilapia', ['linguado', 'salmao', 'frango_grelhado']),
      component('vegetais_livres', 'legumes_vapor', ['brocolis', 'couve', 'salada_verde'])
    ]
  },
  
  jantar_frango_salada: {
    id: 'jantar_frango_salada',
    name: 'Jantar Frango e Salada',
    time: '20:00',
    primary_image: `${IMG}/frango-grelhado.jpg`,
    components: [
      component('proteina', 'frango_grelhado', ['peito_frango', 'tilapia', 'ovos_mexidos']),
      component('carboidrato', 'batata_doce', ['arroz_integral', 'mandioca']),
      component('vegetais_livres', 'salada_verde', ['legumes_vapor', 'couve'])
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // LANCHES
  // ═══════════════════════════════════════════════════════════════════════
  
  lanche_iogurte_frutas: {
    id: 'lanche_iogurte_frutas',
    name: 'Lanche Iogurte e Frutas',
    time: '16:00',
    primary_image: `${IMG}/kefir.jpg`,
    components: [
      component('laticinios', 'iogurte_natural', ['leite_integral']),
      component('fruta', 'banana', ['maca', 'mamao', 'morango']),
      component('oleaginosas', 'castanhas', ['amendoim'])
    ]
  },
  
  lanche_castanhas: {
    id: 'lanche_castanhas',
    name: 'Lanche com Castanhas',
    time: '16:00',
    primary_image: `${IMG}/mix-castanhas.jpg`,
    components: [
      component('oleaginosas', 'castanhas', ['amendoim']),
      component('fruta', 'maca', ['banana', 'laranja'])
    ]
  },
  
  lanche_whey: {
    id: 'lanche_whey',
    name: 'Lanche Pós-Treino',
    time: '16:30',
    primary_image: `${IMG}/whey-protein.jpg`,
    components: [
      component('suplemento', 'whey_protein', ['iogurte_natural']),
      component('fruta', 'banana', ['maca', 'abacaxi'])
    ]
  },
};

console.log(`✅ ${Object.keys(MODULES).length} módulos criados`);
console.log('📦 Módulos disponíveis:', Object.keys(MODULES).join(', '));


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEMPLATES SOBERANOS
// REGRA: Templates REFERENCIAM módulos (não duplicam)
// REGRA: Alterar módulo reflete automaticamente em todos os dias que o usam
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type DaySchedule = {
  cafe?: string;      // ID do módulo
  lanche_manha?: string;
  almoco: string;     // Obrigatório
  lanche_tarde?: string;
  jantar: string;     // Obrigatório
};

type Template = {
  slug: string;
  title: string;
  description: string;
  objective: 'saude' | 'emagrecimento' | 'hipertrofia' | 'clinico' | 'low_carb';
  kcal_target: number;
  week: Record<DayOfWeek, DaySchedule>;
};

const TEMPLATES: Template[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // SAÚDE GERAL
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'saude-equilibrado',
    title: 'Saúde Equilibrado',
    description: 'Plano balanceado para manutenção da saúde',
    objective: 'saude',
    kcal_target: 1800,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_cuscuz_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // EMAGRECIMENTO
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'emagrecimento-pratico',
    title: 'Emagrecimento Prático',
    description: 'Plano para perda de peso saudável',
    objective: 'emagrecimento',
    kcal_target: 1400,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_cuscuz_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // HIPERTROFIA
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'hipertrofia-pratica',
    title: 'Hipertrofia Prática',
    description: 'Plano para ganho de massa muscular',
    objective: 'hipertrofia',
    kcal_target: 2500,
    week: {
      monday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // REGIONAL NORDESTE
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'nordeste-tradicional',
    title: 'Nordeste Tradicional',
    description: 'Plano com alimentos típicos do Nordeste',
    objective: 'saude',
    kcal_target: 1800,
    week: {
      monday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_cuscuz_queijo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // REGIONAL SUL
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'sul-tradicional',
    title: 'Sul Tradicional',
    description: 'Plano com alimentos típicos do Sul',
    objective: 'saude',
    kcal_target: 2000,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_frango', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // MAIS VARIAÇÕES - EXPANDINDO PARA 50 TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════
  
  // EMAGRECIMENTO - Variações
  {
    slug: 'emagrecimento-low-carb',
    title: 'Emagrecimento Low Carb',
    description: 'Plano low carb para perda de peso',
    objective: 'low_carb',
    kcal_target: 1500,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'emagrecimento-proteina',
    title: 'Emagrecimento com Proteína',
    description: 'Foco em proteína para perda de peso',
    objective: 'emagrecimento',
    kcal_target: 1600,
    week: {
      monday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  // HIPERTROFIA - Variações
  {
    slug: 'hipertrofia-avancada',
    title: 'Hipertrofia Avançada',
    description: 'Plano intensivo para ganho de massa',
    objective: 'hipertrofia',
    kcal_target: 2800,
    week: {
      monday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  // SAÚDE - Mais variações
  {
    slug: 'saude-variado',
    title: 'Saúde Variado',
    description: 'Plano com máxima variedade',
    objective: 'saude',
    kcal_target: 1900,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_pao_frango', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'saude-pratico',
    title: 'Saúde Prático',
    description: 'Plano simples e fácil de seguir',
    objective: 'saude',
    kcal_target: 1800,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  // CLÍNICOS
  {
    slug: 'clinico-diabetes',
    title: 'Clínico - Diabetes',
    description: 'Controle glicêmico',
    objective: 'clinico',
    kcal_target: 1800,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'clinico-hipertensao',
    title: 'Clínico - Hipertensão',
    description: 'Controle de pressão arterial',
    objective: 'clinico',
    kcal_target: 1700,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // MAIS EMAGRECIMENTO
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'emagrecimento-intensivo',
    title: 'Emagrecimento Intensivo',
    description: 'Déficit calórico maior para perda acelerada',
    objective: 'emagrecimento',
    kcal_target: 1300,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'emagrecimento-moderado',
    title: 'Emagrecimento Moderado',
    description: 'Perda de peso gradual e sustentável',
    objective: 'emagrecimento',
    kcal_target: 1500,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'emagrecimento-peixe',
    title: 'Emagrecimento com Peixe',
    description: 'Foco em peixes para perda de peso',
    objective: 'emagrecimento',
    kcal_target: 1450,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  
  {
    slug: 'emagrecimento-frango',
    title: 'Emagrecimento com Frango',
    description: 'Proteína magra para perda de peso',
    objective: 'emagrecimento',
    kcal_target: 1400,
    week: {
      monday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // MAIS HIPERTROFIA
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'hipertrofia-iniciante',
    title: 'Hipertrofia Iniciante',
    description: 'Ganho de massa para iniciantes',
    objective: 'hipertrofia',
    kcal_target: 2200,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'hipertrofia-intermediario',
    title: 'Hipertrofia Intermediário',
    description: 'Ganho de massa para intermediários',
    objective: 'hipertrofia',
    kcal_target: 2600,
    week: {
      monday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'hipertrofia-carne',
    title: 'Hipertrofia com Carne Vermelha',
    description: 'Foco em carne vermelha para ganho de massa',
    objective: 'hipertrofia',
    kcal_target: 2700,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'hipertrofia-frango',
    title: 'Hipertrofia com Frango',
    description: 'Proteína magra para ganho de massa limpo',
    objective: 'hipertrofia',
    kcal_target: 2400,
    week: {
      monday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // MAIS SAÚDE
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'saude-peixe',
    title: 'Saúde com Peixe',
    description: 'Foco em peixes para saúde cardiovascular',
    objective: 'saude',
    kcal_target: 1850,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'saude-frango',
    title: 'Saúde com Frango',
    description: 'Proteína magra para saúde geral',
    objective: 'saude',
    kcal_target: 1800,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'saude-economico',
    title: 'Saúde Econômico',
    description: 'Plano saudável e econômico',
    objective: 'saude',
    kcal_target: 1750,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'saude-premium',
    title: 'Saúde Premium',
    description: 'Plano premium com máxima qualidade',
    objective: 'saude',
    kcal_target: 2000,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_pao_frango', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_cuscuz_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // MAIS CLÍNICOS
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'clinico-renal',
    title: 'Clínico - Renal',
    description: 'Controle de proteína e sódio',
    objective: 'clinico',
    kcal_target: 1700,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'clinico-gastrite',
    title: 'Clínico - Gastrite',
    description: 'Alimentos leves e não irritantes',
    objective: 'clinico',
    kcal_target: 1750,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'clinico-colesterol',
    title: 'Clínico - Colesterol Alto',
    description: 'Controle de gorduras saturadas',
    objective: 'clinico',
    kcal_target: 1800,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'clinico-anemia',
    title: 'Clínico - Anemia',
    description: 'Rico em ferro e vitamina C',
    objective: 'clinico',
    kcal_target: 1850,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'clinico-tireoide',
    title: 'Clínico - Tireoide',
    description: 'Suporte para função tireoidiana',
    objective: 'clinico',
    kcal_target: 1800,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // MAIS REGIONAIS
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'nordeste-cuscuz',
    title: 'Nordeste - Cuscuz',
    description: 'Foco em cuscuz nordestino',
    objective: 'saude',
    kcal_target: 1800,
    week: {
      monday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_cuscuz_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_cuscuz_queijo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'nordeste-tapioca',
    title: 'Nordeste - Tapioca',
    description: 'Foco em tapioca nordestina',
    objective: 'saude',
    kcal_target: 1800,
    week: {
      monday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'sul-churrasco',
    title: 'Sul - Churrasco',
    description: 'Foco em churrasco sulista',
    objective: 'saude',
    kcal_target: 2100,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_frango', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_pao_frango', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'sul-polenta',
    title: 'Sul - Polenta',
    description: 'Foco em polenta sulista',
    objective: 'saude',
    kcal_target: 1900,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // LOW CARB VARIAÇÕES
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'low-carb-intensivo',
    title: 'Low Carb Intensivo',
    description: 'Redução máxima de carboidratos',
    objective: 'low_carb',
    kcal_target: 1400,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'low-carb-moderado',
    title: 'Low Carb Moderado',
    description: 'Redução moderada de carboidratos',
    objective: 'low_carb',
    kcal_target: 1600,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'low-carb-proteina',
    title: 'Low Carb Alta Proteína',
    description: 'Low carb com foco em proteína',
    objective: 'low_carb',
    kcal_target: 1550,
    week: {
      monday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'low-carb-peixe',
    title: 'Low Carb com Peixe',
    description: 'Low carb com foco em peixes',
    objective: 'low_carb',
    kcal_target: 1500,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // FINALIZANDO OS 50 TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════
  
  {
    slug: 'emagrecimento-express',
    title: 'Emagrecimento Express',
    description: 'Perda rápida com segurança',
    objective: 'emagrecimento',
    kcal_target: 1350,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'hipertrofia-bulking',
    title: 'Hipertrofia Bulking',
    description: 'Ganho de massa máximo',
    objective: 'hipertrofia',
    kcal_target: 3000,
    week: {
      monday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_frango', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'saude-vegetais',
    title: 'Saúde com Vegetais',
    description: 'Foco em vegetais e fibras',
    objective: 'saude',
    kcal_target: 1750,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'clinico-oncologico',
    title: 'Clínico - Oncológico',
    description: 'Suporte nutricional oncológico',
    objective: 'clinico',
    kcal_target: 1900,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'nordeste-macaxeira',
    title: 'Nordeste - Macaxeira',
    description: 'Foco em macaxeira nordestina',
    objective: 'saude',
    kcal_target: 1850,
    week: {
      monday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_cuscuz_queijo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_macaxeira_nordeste', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'emagrecimento-balanceado',
    title: 'Emagrecimento Balanceado',
    description: 'Perda de peso com equilíbrio',
    objective: 'emagrecimento',
    kcal_target: 1450,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'hipertrofia-limpo',
    title: 'Hipertrofia Limpo',
    description: 'Ganho de massa sem gordura',
    objective: 'hipertrofia',
    kcal_target: 2300,
    week: {
      monday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_cuscuz_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_whey', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_tapioca_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'saude-familia',
    title: 'Saúde para Família',
    description: 'Plano familiar saudável',
    objective: 'saude',
    kcal_target: 1900,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_pao_frango', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_churrasco_sul', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'clinico-pos-cirurgico',
    title: 'Clínico - Pós-Cirúrgico',
    description: 'Recuperação pós-cirúrgica',
    objective: 'clinico',
    kcal_target: 1950,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'low-carb-cetogenico',
    title: 'Low Carb Cetogênico',
    description: 'Cetose nutricional',
    objective: 'low_carb',
    kcal_target: 1450,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'emagrecimento-vegetais',
    title: 'Emagrecimento com Vegetais',
    description: 'Perda de peso com foco em vegetais',
    objective: 'emagrecimento',
    kcal_target: 1380,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_castanhas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
  
  {
    slug: 'hipertrofia-economico',
    title: 'Hipertrofia Econômico',
    description: 'Ganho de massa com custo reduzido',
    objective: 'hipertrofia',
    kcal_target: 2400,
    week: {
      monday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      tuesday: { cafe: 'cafe_tapioca_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      thursday: { cafe: 'cafe_cuscuz_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' },
      saturday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_carne_polenta', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_whey', jantar: 'jantar_frango_salada' }
    }
  },
  
  {
    slug: 'saude-idoso',
    title: 'Saúde para Idosos',
    description: 'Plano adaptado para terceira idade',
    objective: 'saude',
    kcal_target: 1700,
    week: {
      monday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      tuesday: { cafe: 'cafe_pao_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      wednesday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      thursday: { cafe: 'cafe_tapioca_queijo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      friday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' },
      saturday: { cafe: 'cafe_pao_ovo', almoco: 'almoco_peixe_batata', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_frango_salada' },
      sunday: { cafe: 'cafe_aveia_frutas', almoco: 'almoco_frango_arroz', lanche_tarde: 'lanche_iogurte_frutas', jantar: 'jantar_peixe_legumes' }
    }
  },
];

console.log(`✅ ${TEMPLATES.length} templates criados`);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GERADOR DE SQL SOBERANO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const generateSQL = () => {
  const sqlStatements: string[] = [];
  
  TEMPLATES.forEach(template => {
    // Construir snapshot soberano
    const snapshot: any = {};
    
    // Para cada dia da semana
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNumbers = [0, 1, 2, 3, 4, 5, 6];
    
    snapshot[template.kcal_target.toString()] = {
      days: dayNumbers.map((dayNum, index) => {
        const dayName = days[index] as DayOfWeek;
        const schedule = template.week[dayName];
        
        const meals: any[] = [];
        
        // Café da manhã
        if (schedule.cafe) {
          const module = MODULES[schedule.cafe];
          meals.push({
            id: uid(),
            name: module.name,
            time: module.time,
            items: module.components.map(comp => ({
              id: uid(),
              instanceId: uid(),
              name: comp.primary.name,
              title: comp.primary.name,
              kcal: comp.primary.kcal,
              protein: comp.primary.protein_g,
              carbs: comp.primary.carbs_g,
              fat: comp.primary.fat_g,
              quantity: 1,
              quantity_display: `${comp.primary.mass_g}g`,
              clinical_mass_g: comp.primary.mass_g,
              imageUrl: comp.primary.image,
              is_primary: true,
              component_type: comp.type,
              substitutions: comp.substitutions.map(sub => ({
                id: uid(),
                instanceId: uid(),
                name: sub.name,
                title: sub.name,
                kcal: sub.kcal,
                protein: sub.protein_g,
                carbs: sub.carbs_g,
                fat: sub.fat_g,
                clinical_mass_g: sub.mass_g,
                imageUrl: sub.image
              }))
            }))
          });
        }
        
        // Almoço
        const almocoModule = MODULES[schedule.almoco];
        meals.push({
          id: uid(),
          name: almocoModule.name,
          time: almocoModule.time,
          items: almocoModule.components.map(comp => ({
            id: uid(),
            instanceId: uid(),
            name: comp.primary.name,
            title: comp.primary.name,
            kcal: comp.primary.kcal,
            protein: comp.primary.protein_g,
            carbs: comp.primary.carbs_g,
            fat: comp.primary.fat_g,
            quantity: 1,
            quantity_display: `${comp.primary.mass_g}g`,
            clinical_mass_g: comp.primary.mass_g,
            imageUrl: comp.primary.image,
            is_primary: true,
            component_type: comp.type,
            substitutions: comp.substitutions.map(sub => ({
              id: uid(),
              instanceId: uid(),
              name: sub.name,
              title: sub.name,
              kcal: sub.kcal,
              protein: sub.protein_g,
              carbs: sub.carbs_g,
              fat: sub.fat_g,
              clinical_mass_g: sub.mass_g,
              imageUrl: sub.image
            }))
          }))
        });
        
        // Lanche tarde
        if (schedule.lanche_tarde) {
          const module = MODULES[schedule.lanche_tarde];
          meals.push({
            id: uid(),
            name: module.name,
            time: module.time,
            items: module.components.map(comp => ({
              id: uid(),
              instanceId: uid(),
              name: comp.primary.name,
              title: comp.primary.name,
              kcal: comp.primary.kcal,
              protein: comp.primary.protein_g,
              carbs: comp.primary.carbs_g,
              fat: comp.primary.fat_g,
              quantity: 1,
              quantity_display: `${comp.primary.mass_g}g`,
              clinical_mass_g: comp.primary.mass_g,
              imageUrl: comp.primary.image,
              is_primary: true,
              component_type: comp.type,
              substitutions: comp.substitutions.map(sub => ({
                id: uid(),
                instanceId: uid(),
                name: sub.name,
                title: sub.name,
                kcal: sub.kcal,
                protein: sub.protein_g,
                carbs: sub.carbs_g,
                fat: sub.fat_g,
                clinical_mass_g: sub.mass_g,
                imageUrl: sub.image
              }))
            }))
          });
        }
        
        // Jantar
        const jantarModule = MODULES[schedule.jantar];
        meals.push({
          id: uid(),
          name: jantarModule.name,
          time: jantarModule.time,
          items: jantarModule.components.map(comp => ({
            id: uid(),
            instanceId: uid(),
            name: comp.primary.name,
            title: comp.primary.name,
            kcal: comp.primary.kcal,
            protein: comp.primary.protein_g,
            carbs: comp.primary.carbs_g,
            fat: comp.primary.fat_g,
            quantity: 1,
            quantity_display: `${comp.primary.mass_g}g`,
            clinical_mass_g: comp.primary.mass_g,
            imageUrl: comp.primary.image,
            is_primary: true,
            component_type: comp.type,
            substitutions: comp.substitutions.map(sub => ({
              id: uid(),
              instanceId: uid(),
              name: sub.name,
              title: sub.name,
              kcal: sub.kcal,
              protein: sub.protein_g,
              carbs: sub.carbs_g,
              fat: sub.fat_g,
              clinical_mass_g: sub.mass_g,
              imageUrl: sub.image
            }))
          }))
        });
        
        return {
          day_of_week: dayNum,
          meals
        };
      })
    };
    
    const mealDistribution = Object.values(template.week)[0];
    const dist: any[] = [];
    if (mealDistribution.cafe) dist.push({ slot: MODULES[mealDistribution.cafe].name, time: MODULES[mealDistribution.cafe].time });
    dist.push({ slot: MODULES[mealDistribution.almoco].name, time: MODULES[mealDistribution.almoco].time });
    if (mealDistribution.lanche_tarde) dist.push({ slot: MODULES[mealDistribution.lanche_tarde].name, time: MODULES[mealDistribution.lanche_tarde].time });
    dist.push({ slot: MODULES[mealDistribution.jantar].name, time: MODULES[mealDistribution.jantar].time });
    
    const sql = `INSERT INTO public.v3_diet_templates (slug, title, description, template_type, objective, visual_style, kcal_profiles, meal_distribution, plan_snapshot, cluster_map, active, sovereign_validated) VALUES ('${template.slug}', '${template.title}', '${template.description}', 'visual_v3', '${template.objective}', 'premium', '[${template.kcal_target}]'::jsonb, '${JSON.stringify(dist)}'::jsonb, '${JSON.stringify(snapshot)}'::jsonb, '{}'::jsonb, true, true);`;
    
    sqlStatements.push(sql);
  });
  
  fs.writeFileSync('migration_soberana.sql', sqlStatements.join('\n\n'));
  console.log(`✅ SQL gerado: migration_soberana.sql (${sqlStatements.length} templates)`);
};

generateSQL();

console.log('\n🎉 ARQUITETURA SOBERANA IMPLEMENTADA!');
console.log('📦 Módulos reutilizáveis: ' + Object.keys(MODULES).length);
console.log('📋 Templates: ' + TEMPLATES.length);
console.log('💾 SQL: migration_soberana.sql');
