// Centralized query keys for React Query cache management
export const queryKeys = {
  // Dashboard
  dashboard: {
    patient: (userId: string) => ["dashboard", "patient", userId] as const,
    nutritionist: (userId: string) => ["dashboard", "nutritionist", userId] as const,
    stats: (userId: string) => ["dashboard", "stats", userId] as const,
  },

  // Patients
  patients: {
    all: (nutritionistId: string) => ["patients", nutritionistId] as const,
    detail: (patientId: string) => ["patients", "detail", patientId] as const,
    programs: (nutritionistId: string) => ["patients", "programs", nutritionistId] as const,
    prestige: (patientIds: string[]) => ["patients", "prestige", ...patientIds] as const,
  },

  // Checklist
  checklist: {
    tasks: (userId: string, date: string, tenantId?: string | null) => ["checklist", userId, date, tenantId ?? "default"] as const,
  },

  // Chat
  chat: {
    contacts: (userId: string) => ["chat", "contacts", userId] as const,
    messages: (userId: string, contactId: string) => ["chat", "messages", userId, contactId] as const,
  },

  // Protocols & Programs
  protocols: {
    all: (userId: string) => ["protocols", userId] as const,
  },
  programs: {
    all: (userId: string) => ["programs", userId] as const,
    detail: (programId: string) => ["programs", "detail", programId] as const,
  },

  // Meal Plans
  mealPlans: {
    all: (userId: string) => ["meal-plans", userId] as const,
    detail: (planId: string) => ["meal-plans", "detail", planId] as const,
    completions: (patientId: string, date: string) => ["meal-completions", patientId, date] as const,
  },

  // Meals
  meals: {
    all: (userId: string) => ["meals", userId] as const,
    recent: (userId: string, limit: number) => ["meals", "recent", userId, limit] as const,
  },

  // Lifecycle
  lifecycle: (userId: string) => ["lifecycle", userId] as const,

  // Profile
  profile: (userId: string) => ["profile", userId] as const,

  // Notifications
  notifications: {
    unread: (userId: string) => ["notifications", "unread", userId] as const,
  },

  // Engagement & Missions
  engagement: {
    adherence: (patientId: string) => ["engagement", "adherence", patientId] as const,
    missions: (patientId: string) => ["engagement", "missions", patientId] as const,
    signals: (patientId: string) => ["engagement", "signals", patientId] as const,
  },
} as const;
