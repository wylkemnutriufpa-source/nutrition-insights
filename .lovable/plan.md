I will fix the Admin Panel to ensure it works correctly with the V3 system and provides the correct tools for template auditing.

### Problem Analysis
The user reports that the Admin Panel is not working as expected. My investigation found:
1. The **Template Nutrition Audit** page is fetching data from the old `diet_templates` table instead of the new `v3_diet_templates` table used in the V3 system. This causes the audit to show critical errors for non-existent or legacy data.
2. The route for the Template Audit in the code is `/admin/nutrition-audit`, but the user expects `/admin/template-nutrition-audit` based on their instructions.
3. The Admin Dashboard links to the shorter route, which might be causing confusion or inconsistency.

### Proposed Changes

#### 1. Update Routing
- Modify `src/routes/admin.routes.tsx` to add the `/admin/template-nutrition-audit` route (keeping the old one for compatibility if needed, or redirecting).
- Update `src/pages/admin/AdminDashboard.tsx` to use the correct route name and labels.

#### 2. Fix Template Audit Page
- Update `src/pages/admin/TemplateNutritionAudit.tsx` to:
    - Fetch from `v3_diet_templates` when the source is "official".
    - Correctly handle the V3 schema (using `title` instead of `name` and parsing the `plan_snapshot` JSONB).
    - Adapt the `auditTemplate` logic to validate the 7-day structure and images in the V3 snapshot.

#### 3. Professional & Patient Counts
- Verify if the metric cards in the Admin Dashboard are correctly counting V3-enabled professionals and patients.

### Technical Details
- **Tables:** `v3_diet_templates` (V3) vs `diet_templates` (Legacy).
- **Schema Mapping:** V3 templates store meals inside a `plan_snapshot` keyed by calorie profile, which requires recursive auditing to check for missing items or images across all days.
- **Route Sync:** Ensure consistency between `admin.routes.tsx`, `DashboardLayout`, and `AdminDashboard`.

```text
/admin/nutrition-audit -> /admin/template-nutrition-audit
diet_templates -> v3_diet_templates
```
