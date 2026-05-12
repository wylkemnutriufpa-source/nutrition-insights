import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";
import { lazyDebug } from "@/lib/lazyDebug";

const EditorV3Page = lazyDebug(() => import("../features/editor-v3").then(m => ({ default: m.EditorV3Page })), "Editor V3");
const MealPlans = lazy(() => import("../pages/MealPlans"));
const DietTemplates = lazy(() => import("../pages/DietTemplates"));
const FoodDatabase = lazy(() => import("../pages/FoodDatabase"));
const Recipes = lazy(() => import("../pages/Recipes"));
const Supplements = lazy(() => import("../pages/Supplements"));
const WorkspaceEditor = lazy(() => import("../pages/WorkspaceEditor"));

export const editorRoutes = [
  <Route key="editor-v3" path="/editor-v3" element={<Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense>} />,
  <Route key="editor-v3-patient" path="/editor-v3/:patientId" element={<Suspense fallback={<PageLoader />}><EditorV3Page /></Suspense>} />,
  <Route key="meal-plans" path="/meal-plans" element={<Suspense fallback={<PageLoader />}><MealPlans /></Suspense>} />,
  <Route key="diet-templates" path="/diet-templates" element={<Suspense fallback={<PageLoader />}><DietTemplates /></Suspense>} />,
  <Route key="food-database" path="/food-database" element={<Suspense fallback={<PageLoader />}><FoodDatabase /></Suspense>} />,
  <Route key="recipes" path="/recipes" element={<Suspense fallback={<PageLoader />}><Recipes /></Suspense>} />,
  <Route key="supplements" path="/supplements" element={<Suspense fallback={<PageLoader />}><Supplements /></Suspense>} />,
  <Route key="workspace-editor" path="/workspace-editor" element={<Suspense fallback={<PageLoader />}><WorkspaceEditor /></Suspense>} />,
];
