export interface Marmita {
  id: string;
  nome: string;              // Nome descritivo completo
  tipo: 'marmita';
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
  ingredientes: string;       // NOVO: Lista de ingredientes
  modo_preparo: string;       // NOVO: Instruções de aquecimento/preparo
  restricao?: string;         // NOVO: "zero lactose", "zero glúten", etc.
  imagem_url?: string;        // NOVO: URL da imagem no banco
}

export const MARMITA_RECIPES: Marmita[] = [
  { 
    id: "m1", 
    nome: "Almôndegas com Purê de Macaxeira", 
    tipo: 'marmita',
    protein_g: 40, 
    carbs_g: 50, 
    fat_g: 18, 
    calories: 522,
    ingredientes: "Almôndegas de patinho moído (120g), purê de mandioca (180g), queijo ralado (20g), molho de tomate, orégano",
    modo_preparo: "Aquecer no micro-ondas por 3-4 min. Retirar a tampa e misturar o molho com o purê."
  },
  { 
    id: "m2", 
    nome: "Bobó de Frango", 
    tipo: 'marmita',
    protein_g: 45, 
    carbs_g: 55, 
    fat_g: 20, 
    calories: 580,
    ingredientes: "Bobó de frango com molho de macaxeira e dendê (200g), arroz à grega (100g), tomate cereja",
    modo_preparo: "Aquecer por 4 min. Adicionar o tomate cereja por cima do arroz."
  },
  { 
    id: "m3", 
    nome: "Bolinhas de Carne Artesanal", 
    tipo: 'marmita',
    protein_g: 42, 
    carbs_g: 48, 
    fat_g: 16, 
    calories: 504,
    ingredientes: "Bolinhas de patinho moído ao molho de tomate (120g), lentilhas (80g), creme de batata (100g), grãos",
    modo_preparo: "Aquecer por 3-4 min. Contém derivados do leite.",
    restricao: "Contém derivados do leite"
  },
  { 
    id: "m4", 
    nome: "Brasileirinho de Hambúrguer de Frango", 
    tipo: 'marmita',
    protein_g: 38, 
    carbs_g: 55, 
    fat_g: 14, 
    calories: 498,
    ingredientes: "Hambúrguer artesanal de frango, lombo suíno, aveia e ovo (100g), arroz integral (100g), feijão manteiguinha (100g)",
    modo_preparo: "Aquecer por 3-4 min. Hambúrguer artesanal sem aditivos."
  },
  { 
    id: "m5", 
    nome: "Brasileirinho de Patinho", 
    tipo: 'marmita',
    protein_g: 35, 
    carbs_g: 50, 
    fat_g: 15, 
    calories: 475,
    ingredientes: "Carne moída patinho (100g), arroz com cúrcuma (100g), feijão carioquinha (100g)",
    modo_preparo: "Aquecer por 3 min. Misturar o arroz com a cúrcuma antes de comer."
  },
  { 
    id: "m6", 
    nome: "Carne com Legumes", 
    tipo: 'marmita',
    protein_g: 32, 
    carbs_g: 52, 
    fat_g: 18, 
    calories: 498,
    ingredientes: "Patinho moído+soja (100g), legumes assados (batata, cenoura, abobrinha) ao molho de ervas finas (100g), arroz branco à grega (100g)",
    modo_preparo: "Aquecer por 3-4 min. Legumes já temperados com ervas finas."
  },
  { 
    id: "m7", 
    nome: "Escondidinho de Carne com Abóbora", 
    tipo: 'marmita',
    protein_g: 57, 
    carbs_g: 11, 
    fat_g: 12, 
    calories: 361,
    ingredientes: "Camadas de patinho moído (120g), creme de abóbora (180g), gergelim preto",
    modo_preparo: "Aquecer por 4 min. Gratinar os últimos 30 segundos para dourar."
  },
  { 
    id: "m8", 
    nome: "Escondidinho de Frango com Macaxeira", 
    tipo: 'marmita',
    protein_g: 48, 
    carbs_g: 40, 
    fat_g: 14, 
    calories: 478,
    ingredientes: "Filé de frango desfiado (150g), purê de macaxeira (150g), tomate cereja, grãos",
    modo_preparo: "Aquecer por 4 min. Contém derivados do leite no purê.",
    restricao: "Contém derivados do leite"
  },
  { 
    id: "m9", 
    nome: "Estrogonofe de Carne", 
    tipo: 'marmita',
    protein_g: 38, 
    carbs_g: 45, 
    fat_g: 16, 
    calories: 476,
    ingredientes: "Patinho em cubos ao molho bechamel zero lactose e extrato de tomate (120g), arroz integral (100g), cenouras cozidas (80g)",
    modo_preparo: "Aquecer por 3 min.",
    restricao: "Zero lactose"
  },
  { 
    id: "m10", 
    nome: "Filé de Sobrecoxa ao Molho de Mostarda", 
    tipo: 'marmita',
    protein_g: 42, 
    carbs_g: 48, 
    fat_g: 10, 
    calories: 450,
    ingredientes: "Filé de sobrecoxa de frango ao molho de creme de leite zero lactose, mel e mostarda (150g), arroz branco à grega (150g)",
    modo_preparo: "Aquecer por 3-4 min.",
    restricao: "Zero lactose"
  },
  { 
    id: "m11", 
    nome: "Frango com Abóbora", 
    tipo: 'marmita',
    protein_g: 48, 
    carbs_g: 6, 
    fat_g: 9, 
    calories: 304,
    ingredientes: "Filé de frango (150g), creme de abóbora zero lactose (150g)",
    modo_preparo: "Aquecer por 3-4 min.",
    restricao: "Zero lactose, sem leite animal"
  },
  { 
    id: "m12", 
    nome: "Frango Desfiado com Risoto de Abóbora", 
    tipo: 'marmita',
    protein_g: 35, 
    carbs_g: 48, 
    fat_g: 10, 
    calories: 422,
    ingredientes: "Frango desfiado (100g), risoto de abóbora con arroz integral (120g), legumes assados (abobrinha, cenoura, brócolis) (80g)",
    modo_preparo: "Aquecer por 3-4 min. Legumes assados separados."
  },
  { 
    id: "m13", 
    nome: "Galinhada FIT", 
    tipo: 'marmita',
    protein_g: 40, 
    carbs_g: 36, 
    fat_g: 7, 
    calories: 367,
    ingredientes: "Arroz 7 grãos cozido ao molho de galinha, filé de peito de frango desfiado, milho, cenoura, ervilha, queijo mussarela (300g)",
    modo_preparo: "Aquecer por 4 min. Finalizado com queijo mussarela."
  },
  { 
    id: "m14", 
    nome: "Massa com Frango à la Marguerita", 
    tipo: 'marmita',
    protein_g: 42, 
    carbs_g: 55, 
    fat_g: 14, 
    calories: 514,
    ingredientes: "Filé de frango desfiado (120g), macarrão integral zero glúten (100g), molho de tomate (80g), queijo muçarela, tomate cereja, manjericão in natura",
    modo_preparo: "Aquecer por 3 min. Finalizado com folha de manjericão fresco.",
    restricao: "Zero glúten"
  },
  { 
    id: "m15", 
    nome: "Massa Integral à Bolonhesa", 
    tipo: 'marmita',
    protein_g: 49, 
    carbs_g: 77, 
    fat_g: 8, 
    calories: 575,
    ingredientes: "Massa integral zero glúten (150g), patinho moído à bolonhesa (180g), muçarela (20g)",
    modo_preparo: "Aquecer por 3-4 min.",
    restricao: "Zero glúten"
  },
  { 
    id: "m16", 
    nome: "Panqueca de Frango", 
    tipo: 'marmita',
    protein_g: 38, 
    carbs_g: 35, 
    fat_g: 18, 
    calories: 454,
    ingredientes: "2 panquecas de massa de crepioca (goma de tapioca, ovo e ervas finas), frango desfiado cremoso ao molho bechamel, molho de tomate, queijo parmesão e muçarela",
    modo_preparo: "Aquecer por 4 min. Não contém glúten."
  },
  { 
    id: "m17", 
    nome: "Panquecas de Carne", 
    tipo: 'marmita',
    protein_g: 35, 
    carbs_g: 32, 
    fat_g: 15, 
    calories: 403,
    ingredientes: "2 panquecas de massa de crepioca (tapioca, ovo e ervas finas), patinho moído ao molho de tomate, queijo parmesão, mussarela e orégano (150g)",
    modo_preparo: "Aquecer por 4 min.",
    restricao: "Zero glúten, zero lactose"
  },
  { 
    id: "m18", 
    nome: "Pernil Suíno", 
    tipo: 'marmita',
    protein_g: 36, 
    carbs_g: 52, 
    fat_g: 16, 
    calories: 496,
    ingredientes: "Pernil suíno em cubos (100g), arroz à grega com ervilha, milho e cenoura (100g), feijão preto (100g)",
    modo_preparo: "Aquecer por 3-4 min. Carne suína temperada."
  },
  { 
    id: "m19", 
    nome: "Vaca Atolada", 
    tipo: 'marmita',
    protein_g: 38, 
    carbs_g: 56, 
    fat_g: 22, 
    calories: 574,
    ingredientes: "Carne assada de panela (100g), macaxeira cozida (50g), arroz carreteiro (150g)",
    modo_preparo: "Aquecer por 4 min. Prato tradicional brasileiro."
  },
];
