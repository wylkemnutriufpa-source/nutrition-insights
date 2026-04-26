import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SchemaMonitor from "../SchemaMonitor";
import "@testing-library/jest-dom";

// Mock snapshot data to simulate missing columns
vi.mock("@/integrations/supabase/schema-snapshot.json", () => ({
  default: {
    generatedAt: "2026-04-27",
    tables: {
      nutritionist_patients: ["id", "patient_id"], // missing nutritionist_id and default_meal_plan_id
      meal_plans: ["id", "patient_id", "plan_status"],
      profiles: ["id", "user_id"]
    }
  }
}));

// Mock layout to avoid complexity
vi.mock("@/components/layout/DashboardLayout", () => ({
  default: ({ children }: any) => <div data-testid="layout">{children}</div>
}));

describe("SchemaMonitor", () => {
  it("renders critical alerts when columns are missing from snapshot", async () => {
    render(<SchemaMonitor />);

    // Check if the page title is rendered
    expect(screen.getByText("Monitor de Schema")).toBeInTheDocument();

    // The nutritionist_patients table in our mock is missing 'nutritionist_id' and 'default_meal_plan_id'
    // These should be highlighted as high severity (Crítico)
    expect(screen.getByText("nutritionist_id")).toBeInTheDocument();
    expect(screen.getByText("default_meal_plan_id")).toBeInTheDocument();
    
    // Count how many "Crítico" badges we have. Should be 2 for nutritionist_patients
    const criticalBadges = screen.getAllByText("Crítico");
    expect(criticalBadges.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the list of all monitored tables and columns", () => {
    render(<SchemaMonitor />);

    // Tables from our mock
    expect(screen.getByText("nutritionist_patients")).toBeInTheDocument();
    expect(screen.getByText("meal_plans")).toBeInTheDocument();
    expect(screen.getByText("profiles")).toBeInTheDocument();

    // Specific columns
    expect(screen.getByText("plan_status")).toBeInTheDocument();
  });
});
