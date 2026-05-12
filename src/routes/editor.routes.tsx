import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";
import { lazyDebug } from "@/lib/lazyDebug";
import { ProtectedRoute } from "./ProtectedRoute";
import WorkspaceRouteGuard from "@/components/common/WorkspaceRouteGuard";

const EditorV3Page = lazyDebug(() => import("../features/editor-v3").then(m => ({ default: m.EditorV3Page })), "Editor V3");
const MealPlans = lazy(() => import("../pages/MealPlans"));
const DietTemplates = lazy(() => import("../pages/DietTemplates"));
const FoodDatabase = lazy(() => import("../pages/FoodDatabase"));
const Recipes = lazy(() => import("../pages/Recipes"));
const Supplements = lazy(() => import("../pages/Supplements"));
const WorkspaceEditor = lazy(() => import("../pages/WorkspaceEditor"));

export const editorRoutes = [
  <Route key="meal-plans" path="/meal-plans" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><MealPlans /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="meal-plans-plan" path="/meal-plans/:planId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="diet-templates" path="/diet-templates" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><DietTemplates /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="editor-redirect" path="/editor" element={<Navigate to="/editor-v3" replace />} />,
  <Route key="meal-plans-editor" path="/meal-plans/editor" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="meal-plans-editor-patient" path="/meal-plans/editor/:patientId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="editor-v3" path="/editor-v3" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="editor-v3-patient" path="/editor-v3/:patientId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="editor-v3-patient-plan" path="/editor-v3/:patientId/:planId" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="v3-redirect" path="/v3" element={<Navigate to="/editor-v3" replace />} />,
  <Route key="recipes" path="/recipes" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Recipes /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="supplements" path="/supplements" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><Supplements /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="food-database" path="/food-database" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><FoodDatabase /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
  <Route key="workspace-editor" path="/workspace-editor" element={<ProtectedRoute><WorkspaceRouteGuard><Suspense fallback={<PageLoader />}><WorkspaceEditor /></Suspense></WorkspaceRouteGuard></ProtectedRoute>} />,
];
