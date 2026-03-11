UPDATE site_settings 
SET setting_value = '[
  {"name": "Basic", "price": "R$ 29,90", "period": "/mês", "popular": false, "features": ["Até 10 pacientes", "Planos alimentares", "Checklist de hábitos", "Chat básico", "Banco de alimentos TACO"], "cta": "Testar Grátis por 7 dias"},
  {"name": "Profissional", "price": "R$ 49,90", "period": "/mês", "popular": true, "features": ["Pacientes ilimitados", "IA completa (análise, receitas, planos)", "Avaliação física + corporal", "Gamificação avançada", "Relatórios semanais", "Suplementação", "Suporte prioritário"], "cta": "Testar Grátis por 7 dias"},
  {"name": "Premium", "price": "R$ 97", "period": "/mês", "popular": false, "features": ["Tudo do Profissional", "Branding personalizado", "Programas em grupo", "Central de automação", "Financeiro integrado", "Inteligência clínica avançada", "Suporte dedicado"], "cta": "Testar Grátis por 7 dias"}
]'::jsonb
WHERE setting_key = 'pricing_plans';