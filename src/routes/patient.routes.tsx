import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";

const Patients = lazy(() => import("../pages/Patients"));
const PatientDetail = lazy(() => import("../pages/PatientDetail"));
const PatientRegister = lazy(() => import("../pages/PatientRegister"));
const PatientOverview = lazy(() => import("../pages/PatientOverview"));
const PatientWorkouts = lazy(() => import("../pages/PatientWorkouts"));
const PatientMealPlan = lazy(() => import("../pages/PatientMealPlan"));
const PatientPlanPage = lazy(() => import("../features/patient/pages/PatientPlanPage").then(m => ({ default: m.PatientPlanPage })));
const PersonalDashboard = lazy(() => import("../pages/PersonalDashboard"));
const BodyAnalysis = lazy(() => import("../pages/BodyAnalysis"));
const ClientDashboard = lazy(() => import("../pages/ClientDashboard"));

export const patientRoutes = [
  <Route key="patients" path="/patients" element={<Suspense fallback={<PageLoader />}><Patients /></Suspense>} />,
  <Route key="patient-detail" path="/patient/:id" element={<Suspense fallback={<PageLoader />}><PatientDetail /></Suspense>} />,
  <Route key="patient-overview" path="/patient/overview" element={<Suspense fallback={<PageLoader />}><PatientOverview /></Suspense>} />,
  <Route key="patient-workouts" path="/patient/workouts" element={<Suspense fallback={<PageLoader />}><PatientWorkouts /></Suspense>} />,
  <Route key="patient-meal-plan" path="/patient/meal-plan" element={<Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense>} />,
  <Route key="patient-plan" path="/patient/plan" element={<Suspense fallback={<PageLoader />}><PatientPlanPage /></Suspense>} />,
  <Route key="personal-dashboard" path="/personal-dashboard" element={<Suspense fallback={<PageLoader />}><PersonalDashboard /></Suspense>} />,
  <Route key="body-analysis" path="/body-analysis" element={<Suspense fallback={<PageLoader />}><BodyAnalysis /></Suspense>} />,
  <Route key="client-dashboard" path="/client/dashboard" element={<Suspense fallback={<PageLoader />}><ClientDashboard /></Suspense>} />,
];
