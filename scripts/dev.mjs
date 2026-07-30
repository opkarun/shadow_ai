import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(__dirname);

const processes = [];
let exiting = false;

function cleanup() {
  if (exiting) return;
  exiting = true;
  console.log('\n\n🛑 Shutting down dev servers...');

  // Kill processes in reverse order (frontend first, then backend)
  for (let i = processes.length - 1; i >= 0; i--) {
    const proc = processes[i];
    if (proc && !proc.killed) {
      proc.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    // Force kill any remaining processes
    for (let i = 0; i < processes.length; i++) {
      const proc = processes[i];
      if (proc && !proc.killed) {
        proc.kill('SIGKILL');
      }
    }
    process.exit(0);
  }, 2000);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

function startProcess(name, cmd, args, options = {}) {
  console.log(`Starting ${name}...`);

  const proc = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  processes.push(proc);

  proc.on('exit', (code) => {
    if (!exiting) {
      if (code !== 0) {
        console.error(`\n❌ ${name} exited with code ${code}`);
        cleanup();
      }
    }
  });

  return proc;
}

console.log('🚀 Starting development servers...\n');
console.log('📦 Backend: tsx watch on backend/server.ts');
console.log('🎨 Frontend: Vite dev server on port 5173\n');

// Start backend server first
startProcess('Backend', 'npm', ['run', 'dev:backend']);

// Start frontend server with a delay (give backend time to start)
setTimeout(() => {
  startProcess('Frontend', 'npm', ['run', 'dev:frontend']);
}, 2000);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  cleanup();
});
