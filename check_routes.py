import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Find all lazy imports and eager imports
imports = re.findall(r'(?:const|import)\s+(\w+)\s+=\s+(?:lazy\(|import)', content)
imports += re.findall(r'import\s+(\w+)\s+from\s+["\']', content)

# Filter out common components that are not pages
ignored = {'Toaster', 'Sonner', 'TooltipProvider', 'QueryClient', 'QueryClientProvider', 'BrowserRouter', 'Routes', 'Route', 'Navigate', 'useLocation', 'AuthProvider', 'useAuth', 'TenantProvider', 'ExperienceModeContext', 'useExperienceModeState', 'useExperienceMode', 'lazy', 'Suspense', 'useEffect', 'AppStateProvider', 'useAppState', 'DegradedModeBanner', 'HardFailLinkage', 'Helmet', 'HelmetProvider', 'GlobalErrorBoundary', 'CriticalErrorBoundary', 'CelebrationProvider', 'CommandPaletteProvider', 'ExperienceRouteGuard', 'WorkspaceRouteGuard', 'useConsentGuard', 'MobileAutoFixer', 'AnimatePresence', 'SafePage', 'PageLoader', 'SystemStateGuard', 'UpdateBanner', 'BuildVersionTag', 'AppContent', 'ExperienceModeProvider', 'ExperienceThemeSync', 'App', 'ProtectedRoute', 'NutritionistRoute', 'PaymentGuardedPatientRoute', 'LP'}

pages = [i for i in imports if i not in ignored]

# Find all used routes
routes_used = re.findall(r'element={<.*?(\w+)\s*/?>}', content)

missing = [p for p in pages if p not in routes_used]
print("Missing routes for components:")
for m in missing:
    print(m)
