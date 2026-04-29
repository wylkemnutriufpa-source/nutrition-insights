import fs from 'fs';

const routesFile = 'src/routes/AppRoutes.tsx';

function extract() {
  const content = fs.readFileSync(routesFile, 'utf-8');
  const routeRegex = /<Route\s+path="([^"]+)"\s+element=\{[^}]*<([^/\s>]+)/g;
  const matches = [...content.matchAll(routeRegex)];
  
  const routes = matches.map(m => ({
    path: m[1],
    component: m[2]
  }));
  
  console.log(JSON.stringify(routes, null, 2));
}

extract();
