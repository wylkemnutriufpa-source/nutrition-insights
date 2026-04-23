import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom";
import NotFound from "@/pages/NotFound";

// Mock lazy-loaded components to speed up routing tests
// and avoid complex provider dependencies in each page
vi.mock("@/pages/Landing", () => ({ default: () => <div data-testid="landing-page">Landing</div> }));
vi.mock("@/pages/PatientLanding", () => ({ default: () => <div data-testid="patient-landing-page">Patient Landing</div> }));
vi.mock("@/pages/Auth", () => ({ default: () => <div data-testid="auth-page">Auth</div> }));
vi.mock("@/pages/Index", () => ({ default: () => <div data-testid="home-page">Home</div> }));

describe("Routing Integrity Suite", () => {
  beforeEach(() => {
    cleanup();
  });

  const renderWithRouter = (path: string, routes: React.ReactNode) => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {routes}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MemoryRouter>
    );
  };

  const APP_ROUTES = (
    <>
      <Route path="/" element={<div data-testid="home-page">Home</div>} />
      <Route path="/landing" element={<div data-testid="landing-page">Landing</div>} />
      <Route path="/landing-paciente" element={<div data-testid="patient-landing-page">Patient Landing</div>} />
      <Route path="/auth" element={<div data-testid="auth-page">Auth</div>} />
      <Route path="/politica-de-privacidade" element={<div>Privacidade</div>} />
    </>
  );

  it("should render Home page for '/'", () => {
    renderWithRouter("/", APP_ROUTES);
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
    expect(screen.queryByText("Página não encontrada")).not.toBeInTheDocument();
  });

  it("should render Landing page for '/landing'", () => {
    renderWithRouter("/landing", APP_ROUTES);
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(screen.queryByText("Página não encontrada")).not.toBeInTheDocument();
  });

  it("should render 404 page for unknown routes", () => {
    renderWithRouter("/unknown-route-xyz", APP_ROUTES);
    expect(screen.getByText("Página não encontrada")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should show the attempted path on the 404 page", () => {
    const path = "/missing-page";
    renderWithRouter(path, APP_ROUTES);
    expect(screen.getByText(path)).toBeInTheDocument();
  });
});
