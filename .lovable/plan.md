I identified that the linkage failure occurred because the `RootRouter` was only handling invitations with a code, ignoring direct professional links (e.g., `/cadastro?nutri=UUID`) when a user chooses to sign up or log in via Google/Social Login.

### 1. Manual Fix for Maria Idayane
I will manually link the patient **Maria Idayane Fonseca da Silva** (ID: `4d56ca07-30ad-4249-9c42-c0ac339254b3`) to the professional **Wylkem Kleyton Raiol de Oliveira** (ID: `67f47696-a778-4ada-9ff9-9615fb7a7c48`) to restore her access immediately.

### 2. Structural Fix in the Codebase
- **Update `src/components/auth/RootRouter.tsx`**: Add logic to handle `fitjourney_nutri_id` from `localStorage`. If a patient logs in and has a pending nutritionist ID (and no current linkage), the system will automatically call `create_patient_canonical` to bind them.
- **Update `src/pages/PatientRegister.tsx`**: Ensure that when a user is redirected to the login/auth page (common in social login flows), the `nutri` context is preserved in `localStorage` and correctly handled upon return.
- **Audit `src/pages/Auth.tsx`**: Verify that social login doesn't clear the linkage context before the `RootRouter` can process it.

### 3. Verification
- Test the new linkage logic by simulating a social login flow with a `nutri` parameter.
- Ensure Maria Idayane's profile is no longer marked as `is_orphan`.

Technical Details:
- The `create_patient_canonical` RPC will be used to ensure all related records (tenant, roles, nutritionist-patient link) are created correctly and atomically.
- Added logs to `RootRouter` to track these automatic linkages in production.
