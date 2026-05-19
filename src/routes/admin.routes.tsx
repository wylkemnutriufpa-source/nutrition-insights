import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";
import { ProtectedRoute } from "./ProtectedRoute";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";
import { StabilityZone } from "@/components/common/StabilityZone";
import { SectionalErrorBoundary } from "@/components/common/SectionalErrorBoundary";
import { lazyDebug } from "@/lib/lazyDebug";

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminAffiliates = lazy(() => import("../pages/AdminAffiliates"));
const AdminPricing = lazy(() => import("../pages/AdminPricing"));
const AdminProfessionals = lazy(() => import("../pages/AdminProfessionals"));
const AdminFeatureControl = lazy(() => import("../pages/AdminFeatureControl"));
const AdminNutritionProtocols = lazy(() => import("../pages/AdminNutritionProtocols"));
const AdminGuideEngine = lazy(() => import("../pages/AdminGuideEngine"));
const AdminMarketingContent = lazy(() => import("../pages/AdminMarketingContent"));
const AdminMenuConfig = lazy(() => import("../pages/AdminMenuConfig"));
const AdminPatientFeatures = lazy(() => import("../pages/AdminPatientFeatures"));
const QAChecklist = lazy(() => import("../pages/admin/QAChecklistPage"));
const AdminSettings = lazy(() => import("../pages/admin/AdminSettings.tsx"));
const AIUsageDashboard = lazy(() => import("../pages/admin/AIUsageDashboard.tsx"));
const SecurityDashboard = lazy(() => import("../pages/SecurityDashboard"));
const SystemHealthLive = lazy(() => import("../pages/SystemHealthLive"));
const GrowthDashboard = lazy(() => import("../pages/GrowthDashboard"));
const AdminTestimonials = lazy(() => import("../pages/AdminTestimonials"));
const AdminResourceCenter = lazy(() => import("../pages/AdminResourceCenter"));
const AdminSiteEditor = lazy(() => import("../pages/AdminSiteEditor"));
const AdminBookingSettings = lazy(() => import("../pages/AdminBookingSettings"));
const AdminSubscriptionMonitor = lazy(() => import("../pages/AdminSubscriptionMonitor"));
const AuditLogs = lazy(() => import("../pages/admin/AuditLogs"));
const ClinicalRulesAdmin = lazy(() => import("../pages/admin/ClinicalRules"));
const TemplateNutritionAudit = lazy(() => import("../pages/admin/TemplateNutritionAudit"));
const AdminExperienceModeAudit = lazy(() => import("../pages/admin/AdminExperienceModeAudit.tsx"));
const AdminPlanLoadingDiagnostics = lazy(() => import("../pages/admin/AdminPlanLoadingDiagnostics.tsx"));
const MealVisualLibraryAdmin = lazyDebug(() => import("../pages/admin/MealVisualLibraryAdmin.tsx"), "Biblioteca Visual Admin");
const InvitationAudit = lazy(() => import("../pages/InvitationAudit"));
const ProfessionalClinicalAnalytics = lazy(() => import("../pages/ProfessionalClinicalAnalytics"));
const ClinicalRiskDashboard = lazy(() => import("../pages/ClinicalRiskDashboard"));
const TherapeuticIntelligence = lazy(() => import("../pages/TherapeuticIntelligence"));
const ClinicalOrchestration = lazy(() => import("../pages/ClinicalOrchestration"));
const ClinicalPredictions = lazy(() => import("../pages/ClinicalPredictions"));
const SystemAudit = lazy(() => import("../pages/SystemAudit"));
const SystemDiagnostics = lazy(() => import("../pages/SystemDiagnostics"));
const SchemaMonitor = lazy(() => import("../pages/SchemaMonitor"));
const OperationalAudit = lazy(() => import("../pages/admin/OperationalAudit"));

export const adminRoutes = [
  <Route key="admin-dashboard" path="/admin/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-invitations" path="/admin/invitations" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><InvitationAudit /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-affiliates" path="/admin/affiliates" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminAffiliates /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-pricing" path="/admin/pricing" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminPricing /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-professionals" path="/admin/professionals" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminProfessionals /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-feature-control" path="/admin/feature-control" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminFeatureControl /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-protocols" path="/admin/protocols" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminNutritionProtocols /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-guide-engine" path="/admin/guide-engine" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminGuideEngine /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-marketing" path="/admin/marketing" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminMarketingContent /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-menu-config" path="/admin/menu-config" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminMenuConfig /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-patient-features" path="/admin/patient-features" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminPatientFeatures /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-qa" path="/admin/qa" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><QAChecklist /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-settings" path="/admin/settings" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminSettings /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-ai-settings" path="/admin/ai-settings" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AIUsageDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-security" path="/admin/security" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SecurityDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-health" path="/admin/health" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SystemHealthLive /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-growth" path="/admin/growth" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><GrowthDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-testimonials" path="/admin/testimonials" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminTestimonials /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-resources" path="/admin/resources" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminResourceCenter /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-landing-pages" path="/admin/landing-pages" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminSiteEditor /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-booking-settings" path="/admin/booking-settings" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminBookingSettings /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-subscription-monitor" path="/admin/subscription-monitor" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminSubscriptionMonitor /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-audit" path="/admin/audit" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AuditLogs /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-rules" path="/admin/clinical-rules" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalRulesAdmin /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-nutrition-audit" path="/admin/template-nutrition-audit" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><TemplateNutritionAudit /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-nutrition-audit-legacy" path="/admin/nutrition-audit" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><TemplateNutritionAudit /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-experience-audit" path="/admin/experience-mode" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminExperienceModeAudit /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-diagnostics" path="/admin/diagnostics" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminPlanLoadingDiagnostics /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="admin-visual-library" path="/admin/visual-library" element={<StabilityZone name="VisualLibraryAdmin"><SectionalErrorBoundary name="VisualLibrary"><Suspense fallback={<PageLoader />}><MealVisualLibraryAdmin /></Suspense></SectionalErrorBoundary></StabilityZone>} />,
  <Route key="admin-operational-audit" path="/admin/operational-audit" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><OperationalAudit /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="clinical-risk" path="/clinical-risk" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalRiskDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="therapeutic-intelligence" path="/therapeutic-intelligence" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><TherapeuticIntelligence /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="clinical-orchestration" path="/clinical-orchestration" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalOrchestration /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="clinical-predictions" path="/clinical-predictions" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClinicalPredictions /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="system-audit" path="/system-audit" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SystemAudit /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="diagnostics" path="/diagnostics" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SystemDiagnostics /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="schema-monitor" path="/schema-monitor" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><SchemaMonitor /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="clinical-intelligence" path="/clinical-intelligence" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ProfessionalClinicalAnalytics /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
];