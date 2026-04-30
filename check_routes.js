import fs from 'fs';
import path from 'fs';

const validRoutesRaw = fs.readFileSync('/tmp/valid_routes.txt', 'utf8').split('\n').filter(Boolean);

// Helper to check if a route matches a pattern
function isRouteValid(route) {
    if (!route.startsWith('/')) return true; // Relative or external
    
    const cleanRoute = route.split('?')[0].split('#')[0];
    
    for (const valid of validRoutesRaw) {
        if (valid === cleanRoute) return true;
        if (valid.includes(':')) {
            const pattern = new RegExp('^' + valid.replace(/:[a-zA-Z0-9]+/g, '[^/]+') + '$');
            if (pattern.test(cleanRoute)) return true;
        }
    }
    return false;
}

const exec = require('child_process').execSync;
const searchCommands = [
    'rg -o "navigate\\([\'\\"][^\\\'\\"]+[\'\\"]\\)" src',
    'rg -o "to=[\'\\"][^\\\'\\"]+[\'\\"]" src',
    'rg -o "href=[\'\\"][^\\\'\\"]+[\'\\"]" src'
];

const foundLinks = new Set();

for (const cmd of searchCommands) {
    try {
        const output = exec(cmd, { encoding: 'utf8' });
        const matches = output.split('\n').filter(Boolean);
        for (const m of matches) {
            const link = m.match(/[\'\\"]([^\\\'\\"]+)[\'\\"]/)[1];
            if (link.startsWith('/')) {
                foundLinks.add(link);
            }
        }
    } catch (e) {
        // rg might fail if no matches
    }
}

console.log('--- POTENTIALLY BROKEN ROUTES ---');
for (const link of Array.from(foundLinks).sort()) {
    if (!isRouteValid(link)) {
        // Ignore some obviously dynamic ones that weren't captured well
        if (link.includes('${') || link.includes('`')) continue; 
        console.log(link);
    }
}
