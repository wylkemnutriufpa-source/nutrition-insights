import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";
import { lazyDebug } from "@/lib/lazyDebug";
import { StabilityZone } from "@/components/common/StabilityZone";
import { SectionalErrorBoundary } from "@/components/common/SectionalErrorBoundary";

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AuditLogs = lazy(() => import("../pages/admin/AuditLogs"));
const ClinicalRulesAdmin = lazy(() => import("../pages/admin/ClinicalRules"));
const AdminFeatureControl = lazy(() => import("../pages/AdminFeatureControl"));
const AdminPricing = lazy(() => import("../pages/AdminPricing"));
const AdminProfessionals = lazy(() => import("../pages/AdminProfessionals"));
const AdminSubscriptionMonitor = lazy(() => import("../pages/AdminSubscriptionMonitor"));
const AdminSiteEditor = lazy(() => import("../pages/AdminSiteEditor"));
const AdminResourceCenter = lazy(() => import("../pages/AdminResourceCenter"));
const AdminTestimonials = lazy(() => import("../pages/AdminTestimonials"));
const QAChecklist = lazy(() => import("../pages/admin/QAChecklistPage"));
const TemplateNutritionAudit = lazy(() => import("../pages/admin/TemplateNutritionAudit.tsx"));
const AIUsageDashboard = lazy(() => import("../pages/admin/AIUsageDashboard.tsx"));
const AdminExperienceModeAudit = lazy(() => import("../pages/admin/AdminExperienceModeAudit.tsx"));
const AdminPlanLoadingDiagnostics = lazy(() => import("../pages/admin/AdminPlanLoadingDiagnostics.tsx"));
const MealVisualLibraryAdmin = lazyDebug(() => import("../pages/admin/MealVisualLibraryAdmin.tsx"), "Biblioteca Visual Admin");
const AdminSettings = lazy(() => import("../pages/admin/AdminSettings.tsx"));

export const adminRoutes = [
  <Route key="admin-dashboard" path="/admin/dashboard" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />,
  <Route key="admin-audit" path="/admin/audit" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />,
  <Route key="admin-rules" path="/admin/clinical-rules" element={<Suspense fallback={<PageLoader />}><ClinicalRulesAdmin /></Suspense>} />,
  <Route key="admin-features" path="/admin/features" element={<Suspense fallback={<PageLoader />}><AdminFeatureControl /></Suspense>} />,
  <Route key="admin-pricing" path="/admin/pricing" element={<Suspense fallback={<PageLoader />}><AdminPricing /></Suspense>} />,
  <Route key="admin-professionals" path="/admin/professionals" element={<Suspense fallback={<PageLoader />}><AdminProfessionals /></Suspense>} />,
  <Route key="admin-subscriptions" path="/admin/subscriptions" element={<Suspense fallback={<PageLoader />}><AdminSubscriptionMonitor /></Suspense>} />,
  <Route key="admin-site" path="/admin/site" element={<Suspense fallback={<PageLoader />}><AdminSiteEditor /></Suspense>} />,
  <Route key="admin-resources" path="/admin/resources" element={<Suspense fallback={<PageLoader />}><AdminResourceCenter /></Suspense>} />,
  <Route key="admin-testimonials" path="/admin/testimonials" element={<Suspense fallback={<PageLoader />}><AdminTestimonials /></Suspense>} />,
  <Route key="admin-qa" path="/admin/qa" element={<Suspense fallback={<PageLoader />}><QAChecklist /></Suspense>} />,
  <Route key="admin-nutrition-audit" path="/admin/nutrition-audit" element={<Suspense fallback={<PageLoader />}><TemplateNutritionAudit /></Suspense>} />,
  <Route key="admin-ai-usage" path="/admin/ai-usage" element={<Suspense fallback={<PageLoader />}><AIUsageDashboard /></Suspense>} />,
  <Route key="admin-experience-audit" path="/admin/experience-mode" element={<Suspense fallback={<PageLoader />}><AdminExperienceModeAudit /></Suspense>} />,
  <Route key="admin-diagnostics" path="/admin/diagnostics" element={<Suspense fallback={<PageLoader />}><AdminPlanLoadingDiagnostics /></Suspense>} />,
  <Route key="admin-visual-library" path="/admin/visual-library" element={<StabilityZone><SectionalErrorBoundary name="VisualLibrary"><Suspense fallback={<PageLoader />}><MealVisualLibraryAdmin /></Suspense></SectionalErrorBoundary></StabilityZone>} />,
  <Route key="admin-settings" path="/admin/settings" element={<Suspense fallback={<PageLoader />}><AdminSettings /></Suspense>} />,
];
