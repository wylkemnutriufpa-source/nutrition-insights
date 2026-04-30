import fs from 'fs';
import { execSync } from 'child_process';

const validRoutesRaw = fs.readFileSync('/tmp/valid_routes.txt', 'utf8').split('\n').filter(Boolean);

function isRouteValid(route) {
    if (!route.startsWith('/')) return true;
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
    'rg -Hn "navigate\\([\'\\"][^\\\'\\"]+[\'\\"]\\)" src',
    'rg -Hn "to=[\'\\"][^\\\'\\"]+[\'\\"]" src',
    'rg -Hn "href=[\'\\"][^\\\'\\"]+[\'\\"]" src'
];

console.log('--- POTENTIALLY BROKEN ROUTES ---');
for (const cmd of searchCommands) {
    try {
        const output = execSync(cmd, { encoding: 'utf8' });
        const lines = output.split('\n').filter(Boolean);
        for (const line of lines) {
            const parts = line.split(':');
            const file = parts[0];
            const lineNum = parts[1];
            const content = parts.slice(2).join(':');
            const linkMatch = content.match(/[\'\\"]([^\\\'\\"]+)[\'\\"]/);
            if (linkMatch) {
                const link = linkMatch[1];
                if (link.startsWith('/') && !isRouteValid(link)) {
                    if (link.includes('${') || link.includes('`')) continue;
                    console.log(`${file}:${lineNum} -> ${link}`);
                }
            }
        }
    } catch (e) {}
}
