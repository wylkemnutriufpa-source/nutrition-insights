# System Boundaries Definition

## Ownership and Responsibilities

### 1. MOTOR (Clinical Intelligence)
**Path:** `src/lib/`
**Responsibilities:**
- Clinical logic and nutritional calculations.
- Macro scaling and normalization.
- Auth and session management.
- Data persistence (Supabase interactions).
- **Authority:** Highest. Changes here must be clinical-first.

### 2. EDITOR V3 (Editing Interface)
**Path:** `src/features/editor-v3/`
**Responsibilities:**
- Rendering the meal plan editing UI.
- Local state management (drafts).
- Interaction logic (drag-and-drop, modals).
- Real-time UI feedback.
- **Authority:** Presentation. Must not contain unique clinical logic (must consume from Motor).

### 3. V1 (Core Platform & Dashboard)
**Path:** `src/pages/`, `src/routes/`, `src/providers/`, `src/modules/FitJourney2/`
**Responsibilities:**
- Global routing and navigation.
- Patient management.
- App-wide state (Workspace, Experience Mode).
- Layouts and common components.
- **Authority:** Structural. Must be protected from feature regressions.

---

## Dependency Rules

### Allowed Dependencies
- `EditorV3` → `Motor` (Consumption of clinical rules)
- `EditorV3` → `V1 Common Components` (UI consistency)
- `Dashboard V1` → `EditorV3` (Lazy-loaded entry point)

### Forbidden Dependencies
- `Motor` → `EditorV3` (The brain must not depend on the UI)
- `V1 Global Runtime` → `EditorV3 internal state` (No leakage)
- `EditorV3` → `V2 Dashboard` (Strict separation)

---

## Untouchable Zones (Hardened)
- `src/App.tsx`: Bootstrap and mode switcher.
- `src/main.tsx`: App initialization.
- `src/providers/CoreProviders.tsx`: Context tree.
- `src/routes/AppRoutes.tsx`: Main router.
- `src/lib/auth.tsx`: Session authority.
