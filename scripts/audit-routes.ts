import fs from 'fs';
import path from 'path';

const routesFile = 'src/routes/AppRoutes.tsx';

function audit() {
  const content = fs.readFileSync(routesFile, 'utf-8');
  
  // Robust regex for lazy and lazyDebug
  const importRegex = /(?:lazy|lazyDebug)\(\s*\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/g;
  
  const matches = [...content.matchAll(importRegex)];
  const imports = matches.map(m => m[1]);
  
  console.log(`--- Route Audit Report ---`);
  console.log(`Total Lazy Imports Found: ${imports.length}`);
  
  const results = imports.map(imp => {
    // Handle aliases and relative paths
    let relativePath = imp.startsWith('@/') 
      ? imp.replace('@/', 'src/') 
      : path.join('src/routes', imp); // Adjust based on where AppRoutes.tsx is
      
    // Normalize path (AppRoutes is in src/routes, so ../pages/X becomes src/pages/X)
    relativePath = path.normalize(relativePath);

    const possibleExtensions = ['.tsx', '.ts', '/index.tsx', '/index.ts'];
    let finalPath = relativePath;
    let found = fs.existsSync(path.join(process.cwd(), relativePath));
    
    if (!found) {
      for (const ext of possibleExtensions) {
        if (fs.existsSync(path.join(process.cwd(), relativePath + ext))) {
          finalPath = relativePath + ext;
          found = true;
          break;
        }
      }
    }
    
    return {
      importPath: imp,
      resolvedPath: finalPath,
      exists: found
    };
  });
  
  const missing = results.filter(r => !r.exists);
  
  if (missing.length > 0) {
    console.log(`\n[ERROR] Missing Components:`);
    missing.forEach(m => console.log(` - ${m.importPath} (Resolved: ${m.resolvedPath})`));
  } else {
    console.log(`\n[OK] All ${results.length} lazy components resolved.`);
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
