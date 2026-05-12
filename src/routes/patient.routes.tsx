import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";
import { ProtectedRoute } from "./ProtectedRoute";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";

const Patients = lazy(() => import("../pages/Patients"));
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
const PersonalStudents = lazy(() => import("../pages/PersonalStudents"));
const PersonalWorkouts = lazy(() => import("../pages/PersonalWorkouts"));
const BodyAnalysis = lazy(() => import("../pages/BodyAnalysis"));
const BodyProjectionExperience = lazy(() => import("../pages/BodyProjectionExperience"));
const ClientDashboard = lazy(() => import("../pages/ClientDashboard"));
const PhysicalAssessment = lazy(() => import("../pages/PhysicalAssessment"));
const Appointments = lazy(() => import("../pages/Appointments"));
const Anamnesis = lazy(() => import("../pages/Anamnesis"));
const PatientPlanPage = lazy(() => import("../features/patient/pages/PatientPlanPage").then(m => ({ default: m.PatientPlanPage })));
const CheckinPanel = lazy(() => import("../pages/CheckinPanel"));
const Checklist = lazy(() => import("../pages/Checklist"));
const Feedbacks = lazy(() => import("../pages/Feedbacks"));
const FitnessAnamnesis = lazy(() => import("../pages/FitnessAnamnesis"));
const WeeklyGoals = lazy(() => import("../pages/WeeklyGoals"));
const WeeklyReport = lazy(() => import("../pages/WeeklyReport"));
const WeightTrajectory = lazy(() => import("../pages/WeightTrajectory"));

export const patientRoutes = [
  <Route key="client-dashboard" path="/client/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ClientDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="client-meals-redirect" path="/client/meals" element={<Navigate to="/meals" replace />} />,
  <Route key="client-patient-meal-plan-redirect" path="/client/patient-meal-plan" element={<Navigate to="/patient-meal-plan" replace />} />,
  <Route key="client-journey-redirect" path="/client/journey" element={<Navigate to="/journey" replace />} />,
  <Route key="client-checklist-redirect" path="/client/checklist" element={<Navigate to="/checklist" replace />} />,
  <Route key="client-achievements-redirect" path="/client/achievements" element={<Navigate to="/achievements" replace />} />,
  <Route key="physical-assessment" path="/physical-assessment" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PhysicalAssessment /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patients" path="/patients" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Patients /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patient-detail" path="/patients/:patientId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientDetail /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="journey" path="/journey" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Journey /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="achievements" path="/achievements" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Achievements /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="challenges" path="/challenges" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Challenges /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="checkin" path="/checkin" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Checkin /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="meals" path="/meals" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Meals /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="shopping-list" path="/shopping-list" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><ShoppingList /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patient-meal-plan" path="/patient-meal-plan" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patient-overview" path="/patient-overview" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientOverview /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="my-diet-redirect" path="/my-diet" element={<Navigate to="/patient-meal-plan" replace />} />,
  <Route key="patient-plan" path="/patient-plan" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patient-plan-id" path="/patient-plan/:id" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patient-plan-path-id" path="/patient/plan/:id" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PatientMealPlan /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="patient-view-token" path="/patient/view/:token" element={<Suspense fallback={<PageLoader />}><PatientPlanPage /></Suspense>} />,
  <Route key="anamnesis" path="/anamnesis" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Anamnesis /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="appointments" path="/appointments" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Appointments /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="personal-dashboard" path="/personal/dashboard" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PersonalDashboard /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="personal-students" path="/personal/students" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PersonalStudents /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="personal-workouts" path="/personal/workouts" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><PersonalWorkouts /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="personal-dashboard-redirect" path="/personal-dashboard" element={<Navigate to="/personal/dashboard" replace />} />,
  <Route key="body-analysis" path="/body-analysis" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><BodyAnalysis /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="body-projection" path="/body-projection" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><BodyProjectionExperience /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="checkin-panel" path="/checkin-panel" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><CheckinPanel /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="checklist" path="/checklist" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Checklist /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="feedbacks" path="/feedbacks" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Feedbacks /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="fitness-anamnesis" path="/fitness-anamnesis" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><FitnessAnamnesis /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="weekly-goals" path="/weekly-goals" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WeeklyGoals /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="weekly-report" path="/weekly-report" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WeeklyReport /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="weight-trajectory" path="/weight-trajectory" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WeightTrajectory /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
];
