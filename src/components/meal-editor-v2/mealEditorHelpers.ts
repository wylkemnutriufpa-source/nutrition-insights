export const normalizeSubstitutions = (subs: string[], limit: number = 4): string[] => {
  return Array.from(new Set(
    subs
      .map(s => String(s).trim().replace(/\s+/g, ' '))
      .filter(s => s.length > 0)
  )).slice(0, limit);
};

export const formatFinalDescription = (description: string, cleanedSubs: string[]): string => {
  let finalDescription = description.split(/\n\n🔄 Substituições:\n/)[0].trim();
  
  if (cleanedSubs.length > 0) {
    finalDescription += "\n\n🔄 Substituições:\n" + cleanedSubs.join("\n");
  }
  
  return finalDescription;
};
