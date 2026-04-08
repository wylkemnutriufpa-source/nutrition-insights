import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";

export interface FoodItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
}

export const FOOD_DATABASE: FoodItem[] = [
  // ── Proteínas ──
  { name: "Frango grelhado", portion: "120g", calories: 198, protein: 37, carbs: 0, fat: 4.3, category: "proteina" },
  { name: "Peito de frango cozido", portion: "120g", calories: 192, protein: 36, carbs: 0, fat: 4, category: "proteina" },
  { name: "Coxa de frango assada", portion: "100g", calories: 215, protein: 27, carbs: 0, fat: 11, category: "proteina" },
  { name: "Patinho grelhado", portion: "120g", calories: 219, protein: 36, carbs: 0, fat: 7.5, category: "proteina" },
  { name: "Carne moída magra", portion: "120g", calories: 230, protein: 30, carbs: 0, fat: 12, category: "proteina" },
  { name: "Filé mignon grelhado", portion: "120g", calories: 252, protein: 35, carbs: 0, fat: 12, category: "proteina" },
  { name: "Alcatra grelhada", portion: "120g", calories: 235, protein: 34, carbs: 0, fat: 10, category: "proteina" },
  { name: "Costela bovina", portion: "120g", calories: 320, protein: 28, carbs: 0, fat: 23, category: "proteina" },
  { name: "Tilápia grelhada", portion: "120g", calories: 148, protein: 30, carbs: 0, fat: 3, category: "proteina" },
  { name: "Salmão grelhado", portion: "120g", calories: 248, protein: 30, carbs: 0, fat: 14, category: "proteina" },
  { name: "Atum em conserva", portion: "80g", calories: 96, protein: 22, carbs: 0, fat: 0.8, category: "proteina" },
  { name: "Sardinha assada", portion: "100g", calories: 208, protein: 25, carbs: 0, fat: 11, category: "proteina" },
  { name: "Camarão cozido", portion: "100g", calories: 99, protein: 21, carbs: 0.2, fat: 1.1, category: "proteina" },
  { name: "Ovo cozido", portion: "1 un (50g)", calories: 72, protein: 6.3, carbs: 0.4, fat: 5, category: "proteina" },
  { name: "Ovo mexido", portion: "2 un", calories: 182, protein: 12, carbs: 1, fat: 14, category: "proteina" },
  { name: "Omelete de claras", portion: "3 claras", calories: 51, protein: 11, carbs: 0.7, fat: 0.2, category: "proteina" },
  { name: "Whey Protein", portion: "30g (1 scoop)", calories: 120, protein: 24, carbs: 3, fat: 1.5, category: "proteina" },
  { name: "Peito de peru", portion: "4 fatias (60g)", calories: 60, protein: 12, carbs: 1, fat: 0.6, category: "proteina" },
  { name: "Carne seca desfiada", portion: "100g", calories: 250, protein: 33, carbs: 0, fat: 13, category: "proteina" },
  { name: "Lombo suíno assado", portion: "120g", calories: 228, protein: 33, carbs: 0, fat: 10, category: "proteina" },

  // ── Carboidratos ──
  { name: "Arroz branco", portion: "150g (4 col)", calories: 195, protein: 4, carbs: 43, fat: 0.4, category: "carboidrato" },
  { name: "Arroz integral", portion: "150g (4 col)", calories: 165, protein: 4.5, carbs: 35, fat: 1.5, category: "carboidrato" },
  { name: "Feijão carioca", portion: "1 concha (86g)", calories: 76, protein: 4.8, carbs: 14, fat: 0.5, category: "carboidrato" },
  { name: "Feijão preto", portion: "1 concha (86g)", calories: 77, protein: 4.5, carbs: 14, fat: 0.5, category: "carboidrato" },
  { name: "Lentilha cozida", portion: "100g", calories: 93, protein: 6.3, carbs: 16, fat: 0.5, category: "carboidrato" },
  { name: "Grão de bico cozido", portion: "100g", calories: 130, protein: 7, carbs: 20, fat: 2.5, category: "carboidrato" },
  { name: "Batata doce cozida", portion: "150g", calories: 135, protein: 1.5, carbs: 32, fat: 0.1, category: "carboidrato" },
  { name: "Batata inglesa cozida", portion: "150g", calories: 117, protein: 2.7, carbs: 26, fat: 0.1, category: "carboidrato" },
  { name: "Mandioca cozida", portion: "100g", calories: 125, protein: 0.6, carbs: 30, fat: 0.3, category: "carboidrato" },
  { name: "Inhame cozido", portion: "100g", calories: 97, protein: 2, carbs: 23, fat: 0.1, category: "carboidrato" },
  { name: "Macarrão integral", portion: "100g cozido", calories: 124, protein: 5.3, carbs: 24, fat: 1.1, category: "carboidrato" },
  { name: "Macarrão branco", portion: "100g cozido", calories: 131, protein: 5, carbs: 25, fat: 1.1, category: "carboidrato" },
  { name: "Pão integral", portion: "2 fatias (50g)", calories: 124, protein: 5, carbs: 23, fat: 1.4, category: "carboidrato" },
  { name: "Pão francês", portion: "1 un (50g)", calories: 150, protein: 4.6, carbs: 29, fat: 1.6, category: "carboidrato" },
  { name: "Tapioca", portion: "2 col sopa (30g)", calories: 108, protein: 0, carbs: 26, fat: 0, category: "carboidrato" },
  { name: "Cuscuz de milho", portion: "100g", calories: 113, protein: 2.5, carbs: 25, fat: 0.3, category: "carboidrato" },
  { name: "Aveia em flocos", portion: "30g (3 col)", calories: 117, protein: 4.4, carbs: 20, fat: 2.6, category: "carboidrato" },
  { name: "Granola sem açúcar", portion: "30g", calories: 132, protein: 3, carbs: 19, fat: 5, category: "carboidrato" },
  { name: "Quinoa cozida", portion: "100g", calories: 120, protein: 4.4, carbs: 21, fat: 1.9, category: "carboidrato" },
  { name: "Milho cozido", portion: "1 espiga", calories: 130, protein: 4.2, carbs: 28, fat: 1.5, category: "carboidrato" },

  // ── Verduras e Legumes ──
  { name: "Brócolis cozido", portion: "100g", calories: 35, protein: 2.4, carbs: 7, fat: 0.4, category: "verdura" },
  { name: "Couve refogada", portion: "100g", calories: 45, protein: 2.9, carbs: 6.3, fat: 1.3, category: "verdura" },
  { name: "Espinafre cozido", portion: "100g", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.3, category: "verdura" },
  { name: "Abobrinha refogada", portion: "100g", calories: 24, protein: 1.1, carbs: 4.3, fat: 0.3, category: "verdura" },
  { name: "Cenoura crua", portion: "1 un média", calories: 34, protein: 0.7, carbs: 8, fat: 0.2, category: "verdura" },
  { name: "Beterraba cozida", portion: "100g", calories: 49, protein: 1.8, carbs: 11, fat: 0.1, category: "verdura" },
  { name: "Tomate", portion: "1 un média", calories: 20, protein: 0.9, carbs: 4, fat: 0.2, category: "verdura" },
  { name: "Pepino", portion: "100g", calories: 10, protein: 0.7, carbs: 2, fat: 0.1, category: "verdura" },
  { name: "Alface americana", portion: "50g", calories: 7, protein: 0.5, carbs: 1.2, fat: 0.1, category: "verdura" },
  { name: "Rúcula", portion: "30g", calories: 8, protein: 0.8, carbs: 1.1, fat: 0.2, category: "verdura" },
  { name: "Berinjela grelhada", portion: "100g", calories: 19, protein: 1, carbs: 4, fat: 0.1, category: "verdura" },
  { name: "Chuchu cozido", portion: "100g", calories: 17, protein: 0.4, carbs: 3.5, fat: 0.1, category: "verdura" },
  { name: "Vagem cozida", portion: "100g", calories: 25, protein: 1.5, carbs: 5.5, fat: 0.1, category: "verdura" },
  { name: "Quiabo cozido", portion: "100g", calories: 29, protein: 1.6, carbs: 6, fat: 0.2, category: "verdura" },
  { name: "Abóbora cozida", portion: "100g", calories: 28, protein: 0.8, carbs: 7, fat: 0.1, category: "verdura" },

  // ── Frutas ──
  { name: "Banana prata", portion: "1 un média", calories: 89, protein: 1.3, carbs: 23, fat: 0.1, category: "fruta" },
  { name: "Maçã", portion: "1 un média", calories: 56, protein: 0.3, carbs: 15, fat: 0.1, category: "fruta" },
  { name: "Laranja", portion: "1 un média", calories: 47, protein: 1, carbs: 12, fat: 0.1, category: "fruta" },
  { name: "Mamão papaia", portion: "1/2 un", calories: 46, protein: 0.5, carbs: 12, fat: 0.1, category: "fruta" },
  { name: "Manga", portion: "1 fatia (100g)", calories: 64, protein: 0.4, carbs: 17, fat: 0.3, category: "fruta" },
  { name: "Abacate", portion: "100g", calories: 96, protein: 1.2, carbs: 6, fat: 8.4, category: "fruta" },
  { name: "Morango", portion: "10 un (120g)", calories: 38, protein: 0.8, carbs: 9, fat: 0.4, category: "fruta" },
  { name: "Melancia", portion: "200g", calories: 60, protein: 1.2, carbs: 15, fat: 0.3, category: "fruta" },
  { name: "Uva", portion: "15 un (100g)", calories: 50, protein: 0.6, carbs: 14, fat: 0.3, category: "fruta" },
  { name: "Abacaxi", portion: "2 fatias (100g)", calories: 48, protein: 0.5, carbs: 12, fat: 0.1, category: "fruta" },
  { name: "Pera", portion: "1 un média", calories: 53, protein: 0.4, carbs: 14, fat: 0.1, category: "fruta" },
  { name: "Kiwi", portion: "1 un", calories: 42, protein: 0.8, carbs: 10, fat: 0.4, category: "fruta" },
  { name: "Açaí puro", portion: "100g", calories: 58, protein: 0.8, carbs: 6, fat: 3.9, category: "fruta" },

  // ── Gorduras boas ──
  { name: "Azeite de oliva", portion: "1 col sopa (13ml)", calories: 108, protein: 0, carbs: 0, fat: 12, category: "gordura" },
  { name: "Castanha do Pará", portion: "3 un (12g)", calories: 79, protein: 1.7, carbs: 1, fat: 7.7, category: "gordura" },
  { name: "Castanha de caju", portion: "10 un (15g)", calories: 86, protein: 2.7, carbs: 4.5, fat: 6.7, category: "gordura" },
  { name: "Amêndoas", portion: "10 un (14g)", calories: 82, protein: 3, carbs: 2.8, fat: 7.1, category: "gordura" },
  { name: "Nozes", portion: "4 un (12g)", calories: 78, protein: 1.8, carbs: 1.6, fat: 7.5, category: "gordura" },
  { name: "Pasta de amendoim", portion: "1 col sopa (16g)", calories: 94, protein: 4, carbs: 3, fat: 8, category: "gordura" },
  { name: "Semente de chia", portion: "1 col sopa (12g)", calories: 58, protein: 2, carbs: 5, fat: 3.7, category: "gordura" },
  { name: "Semente de linhaça", portion: "1 col sopa (10g)", calories: 53, protein: 1.8, carbs: 2.9, fat: 4.2, category: "gordura" },
  { name: "Abacate", portion: "2 col sopa (60g)", calories: 58, protein: 0.7, carbs: 3.6, fat: 5, category: "gordura" },
  { name: "Coco seco ralado", portion: "1 col sopa (10g)", calories: 65, protein: 0.6, carbs: 0.6, fat: 6.5, category: "gordura" },

  // ── Laticínios ──
  { name: "Queijo cottage", portion: "50g", calories: 49, protein: 5.5, carbs: 1.7, fat: 2.2, category: "laticinio" },
  { name: "Queijo minas frescal", portion: "30g", calories: 73, protein: 5, carbs: 0.3, fat: 5.8, category: "laticinio" },
  { name: "Queijo muçarela", portion: "30g", calories: 90, protein: 6, carbs: 0.5, fat: 7, category: "laticinio" },
  { name: "Ricota", portion: "50g", calories: 70, protein: 5.6, carbs: 1.5, fat: 4.8, category: "laticinio" },
  { name: "Iogurte natural", portion: "170g", calories: 100, protein: 5, carbs: 8, fat: 5, category: "laticinio" },
  { name: "Iogurte grego", portion: "120g", calories: 130, protein: 12, carbs: 6, fat: 6.5, category: "laticinio" },
  { name: "Leite desnatado", portion: "200ml", calories: 66, protein: 6, carbs: 10, fat: 0.2, category: "laticinio" },
  { name: "Leite integral", portion: "200ml", calories: 118, protein: 6, carbs: 9, fat: 6.4, category: "laticinio" },
  { name: "Cream cheese light", portion: "1 col sopa (30g)", calories: 42, protein: 2, carbs: 1, fat: 3.5, category: "laticinio" },
  { name: "Requeijão light", portion: "1 col sopa (30g)", calories: 45, protein: 2.5, carbs: 1, fat: 3.6, category: "laticinio" },

  // ── Proteínas extras ──
  { name: "Músculo cozido", portion: "120g", calories: 226, protein: 39.4, carbs: 0, fat: 7.2, category: "proteina" },
  { name: "Maminha grelhada", portion: "120g", calories: 270, protein: 39.6, carbs: 0, fat: 12, category: "proteina" },
  { name: "Fraldinha grelhada", portion: "120g", calories: 286, protein: 36, carbs: 0, fat: 15.6, category: "proteina" },
  { name: "Coxão duro grelhado", portion: "120g", calories: 263, protein: 42, carbs: 0, fat: 9.6, category: "proteina" },
  { name: "Acém desfiado", portion: "120g", calories: 254, protein: 39.6, carbs: 0, fat: 9.6, category: "proteina" },
  { name: "Frango desfiado", portion: "120g", calories: 191, protein: 32, carbs: 0, fat: 6.6, category: "proteina" },
  { name: "Sobrecoxa de frango assada", portion: "120g", calories: 270, protein: 30.8, carbs: 0, fat: 15.6, category: "proteina" },
  { name: "Bisteca suína grelhada", portion: "120g", calories: 276, protein: 31.2, carbs: 0, fat: 16.8, category: "proteina" },
  { name: "Carne de sol desfiada", portion: "100g", calories: 215, protein: 35, carbs: 0, fat: 8, category: "proteina" },
  { name: "Cordeiro assado", portion: "120g", calories: 324, protein: 30, carbs: 0, fat: 21.6, category: "proteina" },
  { name: "Dourado grelhado", portion: "120g", calories: 149, protein: 30, carbs: 0, fat: 3, category: "proteina" },
  { name: "Pintado grelhado", portion: "120g", calories: 138, protein: 27.6, carbs: 0, fat: 2.4, category: "proteina" },
  { name: "Tambaqui assado", portion: "120g", calories: 156, protein: 28.8, carbs: 0, fat: 4.2, category: "proteina" },
  { name: "Robalo grelhado", portion: "120g", calories: 142, protein: 29.4, carbs: 0, fat: 2.4, category: "proteina" },
  { name: "Lula cozida", portion: "100g", calories: 92, protein: 15.6, carbs: 3.1, fat: 1.4, category: "proteina" },
  { name: "Polvo cozido", portion: "100g", calories: 82, protein: 15, carbs: 2.2, fat: 1, category: "proteina" },
  { name: "Clara de ovo cozida", portion: "3 claras", calories: 52, protein: 11, carbs: 0.7, fat: 0.2, category: "proteina" },

  // ── Carboidratos extras ──
  { name: "Farinha de aveia", portion: "30g", calories: 118, protein: 3.9, carbs: 20.1, fat: 2.3, category: "carboidrato" },
  { name: "Farinha de banana verde", portion: "20g", calories: 66, protein: 0.8, carbs: 15.2, fat: 0.1, category: "carboidrato" },
  { name: "Polenta cozida", portion: "150g", calories: 102, protein: 2.4, carbs: 22.5, fat: 0.5, category: "carboidrato" },
  { name: "Pão sírio integral", portion: "1 un (60g)", calories: 165, protein: 6, carbs: 32, fat: 1.5, category: "carboidrato" },
  { name: "Torrada integral", portion: "4 un (30g)", calories: 120, protein: 3.5, carbs: 22, fat: 2, category: "carboidrato" },
  { name: "Mandioquinha cozida", portion: "100g", calories: 96, protein: 1, carbs: 22, fat: 0.3, category: "carboidrato" },
  { name: "Amaranto cozido", portion: "100g", calories: 102, protein: 3.8, carbs: 19, fat: 1.6, category: "carboidrato" },
  { name: "Canjica de milho", portion: "150g", calories: 195, protein: 3, carbs: 42, fat: 0.8, category: "carboidrato" },

  // ── Verduras extras ──
  { name: "Pimentão vermelho", portion: "100g", calories: 31, protein: 1, carbs: 6, fat: 0.3, category: "verdura" },
  { name: "Pimentão verde", portion: "100g", calories: 20, protein: 0.9, carbs: 4.6, fat: 0.2, category: "verdura" },
  { name: "Couve-manteiga crua", portion: "100g", calories: 35, protein: 2.5, carbs: 6, fat: 0.7, category: "verdura" },
  { name: "Chicória", portion: "100g", calories: 17, protein: 1.7, carbs: 3.4, fat: 0.3, category: "verdura" },
  { name: "Acelga", portion: "100g", calories: 19, protein: 1.8, carbs: 3.7, fat: 0.2, category: "verdura" },
  { name: "Ora-pro-nóbis", portion: "100g", calories: 26, protein: 2, carbs: 4, fat: 0.4, category: "verdura" },
  { name: "Agrião cozido", portion: "100g", calories: 22, protein: 2.3, carbs: 3.3, fat: 0.3, category: "verdura" },

  // ── Frutas extras ──
  { name: "Amora", portion: "100g", calories: 43, protein: 1.4, carbs: 10, fat: 0.5, category: "fruta" },
  { name: "Mirtilo", portion: "100g", calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, category: "fruta" },
  { name: "Framboesa", portion: "100g", calories: 52, protein: 1.2, carbs: 12, fat: 0.7, category: "fruta" },
  { name: "Pitaya", portion: "100g", calories: 50, protein: 1.1, carbs: 11, fat: 0.4, category: "fruta" },
  { name: "Acerola", portion: "100g", calories: 32, protein: 0.4, carbs: 8, fat: 0.3, category: "fruta" },
  { name: "Jabuticaba", portion: "100g", calories: 58, protein: 0.6, carbs: 16, fat: 0.1, category: "fruta" },
  { name: "Banana nanica", portion: "1 un (100g)", calories: 92, protein: 1.4, carbs: 24, fat: 0.1, category: "fruta" },
  { name: "Mexerica", portion: "1 un (130g)", calories: 49, protein: 1, carbs: 12.5, fat: 0.1, category: "fruta" },
  { name: "Caju", portion: "100g", calories: 43, protein: 0.8, carbs: 10, fat: 0.3, category: "fruta" },
  { name: "Figo", portion: "100g", calories: 74, protein: 0.8, carbs: 19, fat: 0.3, category: "fruta" },
  { name: "Romã", portion: "100g", calories: 83, protein: 1.7, carbs: 19, fat: 1.2, category: "fruta" },
  { name: "Tâmara", portion: "3 un (30g)", calories: 85, protein: 0.8, carbs: 22.5, fat: 0.1, category: "fruta" },
  { name: "Damasco seco", portion: "30g", calories: 72, protein: 1, carbs: 18.9, fat: 0.2, category: "fruta" },

  // ── Gorduras extras ──
  { name: "Macadâmia", portion: "15g (5 un)", calories: 108, protein: 1.2, carbs: 2.1, fat: 11.4, category: "gordura" },
  { name: "Semente de abóbora", portion: "15g", calories: 84, protein: 4.5, carbs: 1.7, fat: 7.4, category: "gordura" },
  { name: "Semente de gergelim", portion: "10g", calories: 57, protein: 1.8, carbs: 2.3, fat: 5, category: "gordura" },
  { name: "Tahine", portion: "1 col sopa (15g)", calories: 89, protein: 2.6, carbs: 3.2, fat: 8.1, category: "gordura" },
  { name: "Óleo de abacate", portion: "1 col sopa (13ml)", calories: 120, protein: 0, carbs: 0, fat: 14, category: "gordura" },

  // ── Laticínios extras ──
  { name: "Queijo coalho grelhado", portion: "50g", calories: 175, protein: 11, carbs: 0.8, fat: 14, category: "laticinio" },
  { name: "Queijo provolone", portion: "30g", calories: 105, protein: 7.5, carbs: 0.6, fat: 8.1, category: "laticinio" },
  { name: "Iogurte proteico", portion: "170g", calories: 111, protein: 17, carbs: 8.5, fat: 0.9, category: "laticinio" },
  { name: "Kefir", portion: "200ml", calories: 126, protein: 6.6, carbs: 9.4, fat: 7, category: "laticinio" },
  { name: "Leite de aveia", portion: "200ml", calories: 96, protein: 2, carbs: 14, fat: 3, category: "laticinio" },
  { name: "Leite sem lactose", portion: "200ml", calories: 96, protein: 6.4, carbs: 10, fat: 3, category: "laticinio" },

  // ── Preparações comuns ──
  { name: "Arroz com feijão", portion: "4 col arroz + 1 concha", calories: 271, protein: 8.8, carbs: 57, fat: 0.9, category: "preparacao" },
  { name: "Salada verde mista", portion: "1 prato (100g)", calories: 20, protein: 1.5, carbs: 3, fat: 0.3, category: "preparacao" },
  { name: "Sopa de legumes", portion: "1 prato (300ml)", calories: 80, protein: 2.5, carbs: 15, fat: 1, category: "preparacao" },
  { name: "Vitamina de banana c/ aveia", portion: "300ml", calories: 220, protein: 8, carbs: 40, fat: 4, category: "preparacao" },
  { name: "Panqueca de banana", portion: "2 un", calories: 190, protein: 8, carbs: 30, fat: 5, category: "preparacao" },
  { name: "Wrap integral c/ frango", portion: "1 un", calories: 280, protein: 22, carbs: 30, fat: 8, category: "preparacao" },
  { name: "Bowl de açaí", portion: "300ml", calories: 340, protein: 3, carbs: 58, fat: 12, category: "preparacao" },
  { name: "Smoothie verde", portion: "300ml", calories: 150, protein: 3, carbs: 30, fat: 2, category: "preparacao" },
  { name: "Crepioca", portion: "1 un", calories: 150, protein: 8, carbs: 18, fat: 5, category: "preparacao" },
  { name: "Tapioca c/ queijo e tomate", portion: "1 un", calories: 200, protein: 8, carbs: 26, fat: 7, category: "preparacao" },
  { name: "Pão de queijo", portion: "2 un pequenas", calories: 160, protein: 4, carbs: 22, fat: 6, category: "preparacao" },
  { name: "Barrinha de cereal", portion: "1 un (25g)", calories: 100, protein: 1.5, carbs: 18, fat: 3, category: "preparacao" },
  { name: "Mix de oleaginosas", portion: "30g", calories: 180, protein: 5, carbs: 6, fat: 16, category: "preparacao" },
  { name: "Homus", portion: "50g", calories: 83, protein: 4, carbs: 7.2, fat: 4.8, category: "preparacao" },
  { name: "Guacamole", portion: "50g", calories: 80, protein: 1, carbs: 4.5, fat: 7.5, category: "preparacao" },

  // ── Bebidas ──
  { name: "Chá verde", portion: "200ml", calories: 2, protein: 0, carbs: 0, fat: 0, category: "bebida" },
  { name: "Chá de hibisco", portion: "200ml", calories: 3, protein: 0, carbs: 0.5, fat: 0, category: "bebida" },
  { name: "Chá de camomila", portion: "200ml", calories: 1, protein: 0, carbs: 0, fat: 0, category: "bebida" },
  { name: "Café sem açúcar", portion: "50ml", calories: 2, protein: 0.1, carbs: 0, fat: 0, category: "bebida" },
  { name: "Água de coco natural", portion: "200ml", calories: 38, protein: 1.4, carbs: 7.4, fat: 0.4, category: "bebida" },
  { name: "Suco de maracujá natural", portion: "200ml", calories: 76, protein: 0.8, carbs: 18, fat: 0.2, category: "bebida" },
  { name: "Kombucha", portion: "200ml", calories: 30, protein: 0, carbs: 7, fat: 0, category: "bebida" },
];

const CATEGORY_LABELS: Record<string, string> = {
  proteina: "🥩 Proteínas",
  carboidrato: "🌾 Carboidratos",
  verdura: "🥦 Verduras/Legumes",
  fruta: "🍎 Frutas",
  gordura: "🥑 Gorduras",
  laticinio: "🥛 Laticínios",
  preparacao: "🍽️ Preparações",
  bebida: "🍵 Bebidas",
};

interface FoodAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (food: FoodItem) => void;
  placeholder?: string;
}

export default function FoodAutocomplete({ value, onChange, onSelect, placeholder }: FoodAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<FoodItem[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const query = value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtered = FOOD_DATABASE.filter((f) => {
      const name = f.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return name.includes(query);
    }).slice(0, 15);

    setSuggestions(filtered);
    setOpen(filtered.length > 0);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Group by category
  const grouped = suggestions.reduce<Record<string, FoodItem[]>>((acc, food) => {
    (acc[food.category] = acc[food.category] || []).push(food);
    return acc;
  }, {});

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        placeholder={placeholder || "Digite o alimento... (ex: frango, arroz, banana)"}
        autoFocus
      />

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
          <ScrollArea className="max-h-64">
            <div className="p-1">
              {Object.entries(grouped).map(([category, foods]) => (
                <div key={category}>
                  <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {CATEGORY_LABELS[category] || category}
                  </p>
                  {foods.map((food, idx) => (
                    <button
                      key={`${food.name}-${idx}`}
                      type="button"
                      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors flex items-center justify-between gap-2 group"
                      onClick={() => {
                        onSelect(food);
                        setOpen(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{food.name}</p>
                        <p className="text-[10px] text-muted-foreground">{food.portion}</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                        <span className="flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-orange-400" />{food.calories}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Beef className="w-2.5 h-2.5 text-red-400" />{food.protein}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Wheat className="w-2.5 h-2.5 text-amber-500" />{food.carbs}g
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Droplets className="w-2.5 h-2.5 text-blue-400" />{food.fat}g
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
