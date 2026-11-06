import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url));
const children = new Set();
const restarting = new WeakSet();
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

function watchLibrary(project, ready, changing = () => {}) {
  const watcher = run(['build', project, '--watch', '--configuration', 'development'], true);
  let output = '';
  watcher.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    output += chunk.toString();
    let newline;
    while ((newline = output.indexOf('\n')) !== -1) {
      const line = output.slice(0, newline).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').trim();
      output = output.slice(newline + 1);
      if (stopping || restarting.has(watcher)) continue;
      if (line.startsWith('File change detected.')) changing();
      // ng-packagr emits this only after every entry point has built successfully.
      if (line === 'Built Angular Package') ready();
    }
  });
  watcher.stderr.pipe(process.stderr);
  watcher.on('exit', (code) => {
    if (!restarting.has(watcher)) stop(code ?? 1);
  });
  return watcher;
}

let constructorWatcher;
let serverStarted = false;

function pauseConstructor() {
  if (!constructorWatcher) return;
  restarting.add(constructorWatcher);
  constructorWatcher.kill();
  constructorWatcher = undefined;
}

watchLibrary('angular-shared-ui', () => {
  pauseConstructor();
  constructorWatcher = watchLibrary('constructor', () => {
    if (serverStarted) return;
    serverStarted = true;
    run(['serve', 'cv-builder', ...process.argv.slice(2)])
      .on('exit', (code) => stop(code ?? 1));
  });
}, pauseConstructor);
