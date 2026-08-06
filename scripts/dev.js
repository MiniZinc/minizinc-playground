import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [
    spawn(npm, ['run', 'dev:app'], { stdio: 'inherit' }),
    spawn(npm, ['run', 'dev:embed'], { stdio: 'inherit' }),
];

let shuttingDown = false;

function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of children) child.kill('SIGTERM');
    process.exitCode = code;
}

for (const child of children) {
    child.on('exit', (code, signal) => {
        if (!shuttingDown) shutdown(code ?? (signal ? 1 : 0));
    });
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
