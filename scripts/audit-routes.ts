import fs from 'fs';
import path from 'path';

const routesFile = 'src/routes/AppRoutes.tsx';
const pagesDir = 'src/pages';

function audit() {
  const content = fs.readFileSync(routesFile, 'utf-8');
  
  // Extract lazy imports
  const lazyImports = [...content.matchAll(/lazy\(() => import\("([^"]+)"\)\)/g)];
  const debugLazyImports = [...content.matchAll(/lazyDebug\(() => import\("([^"]+)"\)/g)];
  
  const imports = [...lazyImports, ...debugLazyImports].map(m => m[2]);
  
  console.log(`--- Route Audit Report ---`);
  console.log(`Total Lazy Imports Found: ${imports.length}`);
  
  const results = imports.map(imp => {
    // Convert "@/pages/..." or "../pages/..." to actual path
    let relativePath = imp.replace('@/', 'src/').replace('../', 'src/');
    if (!relativePath.endsWith('.tsx') && !relativePath.endsWith('.ts')) {
      if (fs.existsSync(path.join(process.cwd(), relativePath + '.tsx'))) {
        relativePath += '.tsx';
      } else if (fs.existsSync(path.join(process.cwd(), relativePath + '/index.tsx'))) {
         relativePath += '/index.tsx';
      }
    }
    
    const exists = fs.existsSync(path.join(process.cwd(), relativePath));
    return {
      importPath: imp,
      resolvedPath: relativePath,
      exists
    };
  });
  
  const missing = results.filter(r => !r.exists);
  
  if (missing.length > 0) {
    console.log(`\n[ERROR] Missing Components:`);
    missing.forEach(m => console.log(` - ${m.importPath} (Resolved: ${m.resolvedPath})`));
  } else {
    console.log(`\n[OK] All lazy components resolved.`);
  }

  // Check for critical routes
  const criticalRoutes = [
    '/client/dashboard',
    '/admin/dashboard',
    '/editor',
    '/library',
    '/welcome',
    '/consent',
    '/onboarding/paciente',
    '/q/:id'
  ];

  console.log(`\n--- Critical Route Presence ---`);
  criticalRoutes.forEach(route => {
    const hasRoute = content.includes(`path="${route}"`);
    console.log(`${hasRoute ? '[OK]' : '[MISSING]'} ${route}`);
  });
}

audit();
