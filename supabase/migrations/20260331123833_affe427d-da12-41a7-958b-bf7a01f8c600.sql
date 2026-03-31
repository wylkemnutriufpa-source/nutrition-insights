
-- Add auto-tenant trigger for profiles table
DROP TRIGGER IF EXISTS trg_auto_tenant_profiles ON profiles;
CREATE TRIGGER trg_auto_tenant_profiles
  BEFORE INSERT OR UPDATE OF tenant_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_tenant_generic();
