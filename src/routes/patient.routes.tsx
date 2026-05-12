import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";
import { ProtectedRoute } from "./ProtectedRoute";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";

const PatientRegister = lazy(() => import("../pages/PatientRegister"));
const PatientDetail = lazy(() => import("../pages/PatientDetail"));
const PatientOverview = lazy(() => import("../pages/PatientOverview"));
const PatientWorkouts = lazy(() => import("../pages/PatientWorkouts"));
const PatientMealPlan = lazy(() => import("../pages/PatientMealPlan"));
const Journey = lazy(() => import("../pages/Journey"));
const Achievements = lazy(() => import("../pages/Achievements"));
const Challenges = lazy(() => import("../pages/Challenges"));
const Checkin = lazy(() => import("../pages/Checkin"));
const Meals = lazy(() => import("../pages/Meals"));
const ShoppingList = lazy(() => import("../pages/ShoppingList"));
const PersonalDashboard = lazy(() => import("../pages/PersonalDashboard"));
const BodyAnalysis = lazy(() => import("../pages/BodyAnalysis"));
const ClientDashboard = lazy(() => import("../pages/ClientDashboard"));
const PhysicalAssessment = lazy(() => import("../pages/PhysicalAssessment"));

export const patientRoutes = [
  <Route key="patient-register" path="/cadastro" element={<Suspense fallback={<PageLoader />}><PatientRegister /></Suspense>} />,
  <Route key="client-dashboard" path="/client/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClientDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="client-meals" path="/client/meals" element={<Navigate to="/meals" replace />} />,
  <Route key="client-patient-meal-plan" path="/client/patient-meal-plan" element={<Navigate to="/patient-meal-plan" replace />} />,
  <Route key="client-journey" path="/client/journey" element={<Navigate to="/journey" replace />} />,
  <Route key="client-checklist" path="/client/checklist" element={<Navigate to="/checklist" replace />} />,
  <Route key="client-achievements" path="/client/achievements" element={<Navigate to="/achievements" replace />} />,
  <Route key="physical-assessment" path="/physical-assessment" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PhysicalAssessment /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patients" path="/patients" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><lazy(() => import("../pages/Patients")) /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patient-detail" path="/patients/:patientId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientDetail /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="journey" path="/journey" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Journey /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="achievements" path="/achievements" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Achievements /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="challenges" path="/challenges" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Challenges /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="checkin" path="/checkin" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Checkin /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="meals" path="/meals" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Meals /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="shopping-list" path="/shopping-list" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ShoppingList /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patient-meal-plan" path="/patient-meal-plan" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patient-overview" path="/patient-overview" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientOverview /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="personal-dashboard" path="/personal/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PersonalDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="body-analysis" path="/body-analysis" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><BodyAnalysis /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
];
