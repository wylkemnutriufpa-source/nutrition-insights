import fs from 'fs';
import { execSync } from 'child_process';

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

const searchCommands = [
    'rg -o "navigate\\([\'\\"][^\\\'\\"]+[\'\\"]\\)" src',
    'rg -o "to=[\'\\"][^\\\'\\"]+[\'\\"]" src',
    'rg -o "href=[\'\\"][^\\\'\\"]+[\'\\"]" src'
];

const foundLinks = new Set();

for (const cmd of searchCommands) {
    try {
        const output = execSync(cmd, { encoding: 'utf8' });
        const matches = output.split('\n').filter(Boolean);
        for (const m of matches) {
            const linkMatch = m.match(/[\'\\"]([^\\\'\\"]+)[\'\\"]/);
            if (linkMatch) {
                const link = linkMatch[1];
                if (link.startsWith('/')) {
                    foundLinks.add(link);
                }
            }
        }
    } catch (e) {
        // rg might fail if no matches
    }
}

console.log('--- POTENTIALLY BROKEN ROUTES ---');
const broken = [];
for (const link of Array.from(foundLinks).sort()) {
    if (!isRouteValid(link)) {
        broken.push(link);
    }
}

if (broken.length === 0) {
    console.log('No broken routes found (from static analysis).');
} else {
    broken.forEach(b => console.log(b));
}
