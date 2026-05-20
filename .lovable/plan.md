I will refactor the FitJourney 2.0 template engine to ensure that all Premium templates are delivered as fully structured, professional nutritional plans, avoiding the "closed block" issue reported.

### 1. Database Reconstruction
I will replace the existing placeholder templates in `v3_diet_templates` with real, clinical-grade data.
- **Granular Items**: Instead of "Rice + Beans + Chicken", each meal will contain individual items with specific grammages (e.g., 150g Rice, 100g Beans, 120g Chicken).
- **Real Metrics**: Each item will have its own calories, protein, carbs, and fat calculated based on its weight.
- **Smart Substitutions**: Every item in the template will come with a pre-configured list of compatible equivalents (e.g., Rice can be substituted for Potato or Pasta with equivalent macros).
- **High-Quality Visuals**: I will link each item to the actual images from the `meal_visual_library`.

### 2. Template Catalog
I will build three core "Sovereign" protocols:
- **Emagrecimento Feminino (1500 kcal)**: Focused on satiety and volume.
- **Hipertrofia Masculina (2800 kcal)**: Focused on high protein and energy density.
- **Low Carb Performance (1800 kcal)**: Focused on metabolic flexibility.

### 3. Engine Validation
I will verify that the "plotter" in `EditorV3Page.tsx` correctly handles these multi-item snapshots, ensuring that when a nutritionist clicks "Plotar Template", the patient receives a perfectly structured plan with all weights and household measures visible.

### Technical Details
- Table affected: `v3_diet_templates`.
- Data format: `plan_snapshot` JSONB will be populated with a full `Meal[]` structure.
- Logic: Ensuring `clinical_mass_g` is present in all template items to avoid the "1g fallback" bug.
