import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";
import { ProtectedRoute } from "./ProtectedRoute";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";

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

export const adminRoutes = [
  <Route key="admin-dashboard" path="/admin/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
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
];
