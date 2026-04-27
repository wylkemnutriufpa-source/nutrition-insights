export const getInvitationUrl = (code: string, nutriId?: string) => {
  const origin = "https://www.fitjourney.com.br";
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (nutriId) params.set("nutri", nutriId);
  const query = params.toString();
  return `${origin}/cadastro${query ? `?${query}` : ""}`;
};

export const getWhatsAppInvitationMessage = (params: any) => {
  const { 
    patientName, 
    professionalName, 
    clinicName, 
    invitationCode, 
    professionalId, 
    templateType = 'patient_onboarding',
    customTemplate 
  } = params;

  const safePatientName = patientName?.trim() ? patientName.split(" ")[0] : "Paciente";
  const safeProfName = professionalName?.trim() || "Seu Nutricionista";
  const safeClinicPart = clinicName?.trim() ? ` da clínica *${clinicName}*` : "";
  const url = getInvitationUrl(invitationCode, professionalId);

  if (customTemplate) {
    return customTemplate
      .replace(/{{patientName}}/g, safePatientName)
      .replace(/{{professionalName}}/g, safeProfName)
      .replace(/{{clinicName}}/g, clinicName?.trim() || "")
      .replace(/{{url}}/g, url);
  }

  if (templateType === 'patient_invite') {
    return `*Olá ${safePatientName}!* Tudo bem?\n\nSou o(a) nutricionista *${safeProfName}*${safeClinicPart}. Convido você a começar seu acompanhamento nutricional na plataforma *FitJourney*! 🚀\n\nClique no link abaixo para se cadastrar:\n\n👉 ${url}\n\nVamos juntos buscar sua melhor versão! 💪`;
  }

  if (templateType === 'quick_link') {
    return `*Olá!* Sou o(a) nutricionista *${safeProfName}*${safeClinicPart} e convido você a começar seu acompanhamento através deste link rápido: ${url}\n\nVamos juntos! 💪🍎`;
  }

  return `*Olá ${safePatientName}!* Tudo bem?\n\nSou o(a) nutricionista *${safeProfName}*${safeClinicPart} e estou muito feliz em te acompanhar na sua jornada! 🚀\n\nSeu acesso exclusivo à plataforma *FitJourney* já está pronto. Lá você terá seu plano alimentar, orientações e toda a sua evolução na palma da mão. ✨\n\n*Clique no link abaixo para começar:* \n👉 ${url}\n\nVamos juntos buscar sua melhor versão! 💪🍎`;
};
