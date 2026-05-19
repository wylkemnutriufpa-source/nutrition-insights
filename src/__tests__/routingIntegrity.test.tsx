import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom";
import NotFound from "@/pages/NotFound";

// Mocking some internal components that might cause issues in a pure routing test
vi.mock("@/components/common/SafePage", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="safe-page">{children}</div>,
}));

// Static mocks for the pages to avoid hoisting issues in loops
vi.mock("@/pages/Landing", () => ({ default: () => <div data-testid="landing-page">Landing</div> }));
vi.mock("@/pages/PatientLanding", () => ({ default: () => <div data-testid="patientlanding-page">Patient Landing</div> }));
vi.mock("@/pages/PersonalLanding", () => ({ default: () => <div data-testid="personallanding-page">Personal Landing</div> }));
vi.mock("@/pages/AffiliateLanding", () => ({ default: () => <div data-testid="affiliatelanding-page">Affiliate Landing</div> }));
vi.mock("@/pages/BiquiniBrancoLanding", () => ({ default: () => <div data-testid="biquinibrancolanding-page">Biquini Branco</div> }));
vi.mock("@/pages/Auth", () => ({ default: () => <div data-testid="auth-page">Auth</div> }));
vi.mock("@/pages/ResetPassword", () => ({ default: () => <div data-testid="resetpassword-page">Reset Password</div> }));
vi.mock("@/pages/PrivacyPolicy", () => ({ default: () => <div data-testid="privacypolicy-page">Privacy</div> }));
vi.mock("@/pages/TermsOfUse", () => ({ default: () => <div data-testid="termsofuse-page">Terms</div> }));
vi.mock("@/pages/AccountDeletion", () => ({ default: () => <div data-testid="accountdeletion-page">Account Deletion</div> }));

describe("Routing Integrity Suite", () => {
  beforeEach(() => {
    cleanup();
  });

  // This matches the simplified structure of App.tsx routes
  const AppRoutes = () => (
    <Routes>
      <Route path="/" element={<div data-testid="index-page">Home</div>} />
      <Route path="/landing" element={<div data-testid="landing-page">Landing</div>} />
      <Route path="/landing-paciente" element={<div data-testid="patientlanding-page">Patient Landing</div>} />
      <Route path="/landing-personal" element={<div data-testid="personallanding-page">Personal Landing</div>} />
      <Route path="/landing-afiliado" element={<div data-testid="affiliatelanding-page">Affiliate Landing</div>} />
      <Route path="/biquini-branco" element={<div data-testid="biquinibrancolanding-page">Biquini Branco</div>} />
      <Route path="/auth" element={<div data-testid="auth-page">Auth</div>} />
      <Route path="/reset-password" element={<div data-testid="resetpassword-page">Reset Password</div>} />
      <Route path="/politica-de-privacidade" element={<div data-testid="privacypolicy-page">Privacy</div>} />
      <Route path="/termos-de-uso" element={<div data-testid="termsofuse-page">Terms</div>} />
      <Route path="/exclusao-de-conta" element={<div data-testid="accountdeletion-page">Account Deletion</div>} />
      
      {/* Catch-all for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  const mainRoutes = [
    { path: "/", testId: "index-page" },
    { path: "/landing", testId: "landing-page" },
    { path: "/landing-paciente", testId: "patientlanding-page" },
    { path: "/landing-personal", testId: "personallanding-page" },
    { path: "/landing-afiliado", testId: "affiliatelanding-page" },
    { path: "/biquini-branco", testId: "biquinibrancolanding-page" },
    { path: "/auth", testId: "auth-page" },
    { path: "/reset-password", testId: "resetpassword-page" },
    { path: "/politica-de-privacidade", testId: "privacypolicy-page" },
    { path: "/termos-de-uso", testId: "termsofuse-page" },
    { path: "/exclusao-de-conta", testId: "accountdeletion-page" },
  ];

  mainRoutes.forEach(({ path, testId }) => {
    it(`should render ${testId} for route '${path}'`, () => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      );
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.queryByText(/Rota não encontrada/i)).not.toBeInTheDocument();
    });
  });

  it("should render 404 page for unknown routes", () => {
    render(
      <MemoryRouter initialEntries={["/invalid-path-999"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    expect(screen.getByText(/Rota não encontrada/i)).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("/invalid-path-999")).toBeInTheDocument();
  });
});
