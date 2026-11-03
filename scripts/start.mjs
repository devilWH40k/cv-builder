import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));
const children = new Set();
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}

function run(args, captureOutput = false) {
  const child = spawn(process.execPath, [cli, ...args], {
    cwd: workspace,
    stdio: captureOutput ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });
  children.add(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', () => children.delete(child));
  return child;
}

process.on('SIGINT', () => stop(130));
process.on('SIGTERM', () => stop(143));

const watcher = run(['build', 'angular-shared-ui', '--watch', '--configuration', 'development'], true);
let output = '';
let serverStarted = false;
watcher.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  output = (output + chunk.toString()).slice(-2048);
  // ng-packagr emits this only after every entry point has built successfully.
  if (stopping || serverStarted || !output.includes('Built Angular Package')) return;
  serverStarted = true;
  run(['serve', 'cv-builder', ...process.argv.slice(2)])
    .on('exit', (code) => stop(code ?? 1));
});
watcher.stderr.pipe(process.stderr);
watcher.on('exit', (code) => stop(code ?? 1));
