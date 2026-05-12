import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";

const Auth = lazy(() => import("../pages/Auth"));
const AuthConfirm = lazy(() => import("../pages/AuthConfirm"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const Invitation = lazy(() => import("../pages/Invitation"));
const PatientRegister = lazy(() => import("../pages/PatientRegister"));

export const authRoutes = [
  <Route key="auth" path="/auth" element={<Auth />} />,
  <Route key="auth-confirm" path="/auth/confirm" element={<AuthConfirm />} />,
  <Route key="reset-password" path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />,
  <Route key="invite" path="/invite/:code" element={<Suspense fallback={<PageLoader />}><Invitation /></Suspense>} />,
  <Route key="convite" path="/convite/:code" element={<Suspense fallback={<PageLoader />}><Invitation /></Suspense>} />,
  <Route key="cadastro" path="/cadastro" element={<PatientRegister />} />,
];
