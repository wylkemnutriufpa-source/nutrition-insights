# Requirements Document

## Introduction

The Plan Generation Cockpit restores the nutritionist's ability to create meal plans from the patient profile page. During the sovereignty architecture refactoring, the "Library" button and plan creation entry points were accidentally removed. This feature provides a modal-based flow accessible from `PatientDetail.tsx` that offers three distinct plan creation paths: automatic sovereign generation, manual template selection, and manual from scratch. All paths converge on Editor V3 as the single editing surface.

## Glossary

- **Cockpit_Modal**: The modal dialog accessible from the patient profile page that presents the three plan creation options to the nutritionist
- **Nutritionist**: The authenticated professional user who creates and manages meal plans for patients
- **Patient**: The individual receiving a meal plan; passive in this feature's context
- **Editor_V3**: The single meal plan editor component (`EditorV3Page.tsx`) used for all plan editing
- **Sovereign_Template**: A pre-compiled, deterministic diet template stored in `v3_diet_templates` with clinical_tags and dietary_restrictions
- **Clinical_Engine**: The backend RPC (`classify_and_assign_sovereign_template`) that performs Mifflin-St Jeor calculation and deterministic template matching
- **Anamnesis**: The patient's clinical intake data (weight, height, age, sex, activity level, goal, restrictions, conditions) stored in `patient_anamnesis`
- **Clinical_Targets**: The calculated macronutrient targets (kcal, protein, carbs, fat) derived from anamnesis via backend RPC
- **Template_Library**: The browsable collection of 65 sovereign templates with images, descriptions, and kcal profiles
- **Plan_Snapshot**: The JSON structure representing a complete meal plan, serving as the single source of truth

## Requirements

### Requirement 1: Cockpit Entry Point

**User Story:** As a Nutritionist, I want a visible button on the patient profile page to create a new meal plan, so that I can access plan generation without navigating away from the patient context.

#### Acceptance Criteria

1. THE Cockpit_Modal SHALL be accessible via a primary action button rendered on the PatientDetail page
2. WHEN the Nutritionist clicks the plan creation button, THE Cockpit_Modal SHALL open displaying three plan creation options
3. THE plan creation button SHALL be visible regardless of whether the Patient has an active meal plan
4. WHEN the Patient has an active meal plan, THE Cockpit_Modal SHALL display a warning indicating that creating a new plan will replace the existing active plan

### Requirement 2: Automatic Sovereign Plan Generation

**User Story:** As a Nutritionist, I want to generate a meal plan automatically based on the patient's clinical data, so that I can quickly produce a clinically appropriate plan without manual template selection.

#### Acceptance Criteria

1. WHEN the Nutritionist selects the automatic sovereign option, THE Cockpit_Modal SHALL invoke the `classify_and_assign_sovereign_template` RPC with the Patient's anamnesis data
2. WHEN the Clinical_Engine returns a matched template and calculated targets, THE System SHALL navigate to Editor_V3 with the plan pre-loaded from the matched Sovereign_Template snapshot
3. WHEN the Clinical_Engine returns a matched template, THE Editor_V3 SHALL display the Clinical_Targets (kcal, protein, carbs, fat) in the targets sidebar
4. IF the Patient has no completed Anamnesis, THEN THE Cockpit_Modal SHALL disable the automatic sovereign option and display a message indicating that anamnesis completion is required
5. IF the `classify_and_assign_sovereign_template` RPC returns an error, THEN THE Cockpit_Modal SHALL display the error message and allow the Nutritionist to retry or choose another option

### Requirement 3: Manual Plan Generation with Template Selection

**User Story:** As a Nutritionist, I want to browse and select a sovereign template manually, so that I can choose a specific dietary approach that matches my clinical judgment for the patient.

#### Acceptance Criteria

1. WHEN the Nutritionist selects the manual template option, THE Cockpit_Modal SHALL display the Template_Library showing all available Sovereign_Templates
2. THE Template_Library SHALL display each Sovereign_Template with its title, description, objective, kcal profiles, and clinical_tags
3. WHEN the Nutritionist selects a Sovereign_Template, THE System SHALL invoke the `calculate_clinical_kcal_target` RPC to determine the Patient's Clinical_Targets from anamnesis data
4. WHEN Clinical_Targets are calculated and a template is selected, THE System SHALL navigate to Editor_V3 with the selected template's Plan_Snapshot loaded and adapted to the calculated kcal profile
5. IF the Patient has no completed Anamnesis, THEN THE Template_Library SHALL allow template selection but use the template's default kcal profile without patient-specific adaptation
6. THE Template_Library SHALL support filtering templates by clinical_tags and dietary_restrictions

### Requirement 4: Manual Plan Generation from Scratch

**User Story:** As a Nutritionist, I want to create a meal plan from scratch with pre-calculated clinical targets, so that I can build a fully custom plan while still having the patient's nutritional targets as guidance.

#### Acceptance Criteria

1. WHEN the Nutritionist selects the manual from scratch option, THE System SHALL navigate to Editor_V3 with an empty plan structure
2. WHEN the Patient has completed Anamnesis, THE System SHALL invoke the `calculate_clinical_kcal_target` RPC and pre-fill the Editor_V3 targets sidebar with the calculated kcal target, protein target, carbs target, and fat target
3. WHEN the Patient has completed Anamnesis, THE Editor_V3 targets sidebar SHALL display the Patient's dietary restrictions and clinical conditions
4. IF the Patient has no completed Anamnesis, THEN THE System SHALL navigate to Editor_V3 with an empty plan and empty targets sidebar

### Requirement 5: Responsive Modal Behavior

**User Story:** As a Nutritionist, I want the plan creation cockpit to work on mobile devices, so that I can initiate plan creation from any device.

#### Acceptance Criteria

1. THE Cockpit_Modal SHALL render responsively on viewport widths from 320px to 1920px
2. WHILE the viewport width is below 768px, THE Cockpit_Modal SHALL display the three options in a single-column vertical layout
3. WHILE the viewport width is 768px or above, THE Cockpit_Modal SHALL display the three options in a multi-column layout
4. THE Cockpit_Modal SHALL be dismissible via a close button and by clicking outside the modal area

### Requirement 6: Data Integrity During Plan Creation

**User Story:** As a Nutritionist, I want plan creation to preserve existing published plans and use only backend-calculated values, so that clinical accuracy is maintained and no data is lost.

#### Acceptance Criteria

1. THE Cockpit_Modal SHALL NOT modify or delete any existing published meal plans in the `meal_plans` table
2. THE System SHALL NOT perform any clinical calculations (kcal, macros) on the frontend; all calculations SHALL be delegated to backend RPCs
3. WHEN navigating to Editor_V3 from the Cockpit_Modal, THE System SHALL create a new draft meal plan linked to the Patient
4. THE Plan_Snapshot loaded into Editor_V3 SHALL be the single source of truth for the plan's content

### Requirement 7: Option Availability Based on Patient State

**User Story:** As a Nutritionist, I want the cockpit to clearly indicate which options are available based on the patient's data completeness, so that I can make informed decisions about which creation path to use.

#### Acceptance Criteria

1. WHILE the Patient has completed Anamnesis, THE Cockpit_Modal SHALL enable all three plan creation options
2. WHILE the Patient has no completed Anamnesis, THE Cockpit_Modal SHALL disable the automatic sovereign option with a descriptive tooltip explaining the requirement
3. WHILE the Patient has no completed Anamnesis, THE Cockpit_Modal SHALL enable the manual template option with a notice that default kcal profiles will be used
4. WHILE the Patient has no completed Anamnesis, THE Cockpit_Modal SHALL enable the manual from scratch option with a notice that targets will be empty
