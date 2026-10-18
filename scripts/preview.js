const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { loadConfig } = require('../src/config');
const { parseJsonFile } = require('../src/utils');

async function main() {
  const root = path.resolve(__dirname, '..');
  const pkg = parseJsonFile(path.join(root, 'package.json'));
  const config = await loadConfig(root, pkg);
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'updd-preview-'));
  let child;
  let interruptedCode;
  const forwardSignal = (signal) => {
    interruptedCode = signal === 'SIGINT' ? 130 : 143;
    if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
    try {
      if (process.platform === 'win32') child.kill(signal);
      // Noninteractive shells can pass an ignored SIGINT to their children.
      else process.kill(-child.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  };
  const onInterrupt = () => forwardSignal('SIGINT');
  const onTerminate = () => forwardSignal('SIGTERM');
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);

  try {
    fs.writeFileSync(
      path.join(temporaryRoot, 'package.json'),
      JSON.stringify(pkg, null, 2),
    );
    // Use the root configuration, including imports resolved relative to the root.
    fs.writeFileSync(
      path.join(temporaryRoot, 'updd.config.cjs'),
      `module.exports = ${JSON.stringify(config, null, 2)};\n`,
    );
    // Preserve project-level registry and installation settings during the preview.
    const npmrc = path.join(root, '.npmrc');
    if (fs.existsSync(npmrc))
      fs.copyFileSync(npmrc, path.join(temporaryRoot, '.npmrc'));

    console.log('Previewing root package.json with root updd configuration.');
    const code = await new Promise((resolve, reject) => {
      child = spawn(
        process.execPath,
        [path.join(root, 'src/index.js'), ...process.argv.slice(2)],
        {
          cwd: temporaryRoot,
          stdio: 'inherit',
          detached: process.platform !== 'win32',
        },
      );
      child.on('error', reject);
      child.on('close', (exitCode, signal) =>
        resolve(interruptedCode ?? exitCode ?? (signal === 'SIGINT' ? 130 : 1)),
      );
    });
    process.exitCode = code;
  } finally {
    if (interruptedCode && child?.pid && process.platform !== 'win32') {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    process.removeListener('SIGINT', onInterrupt);
    process.removeListener('SIGTERM', onTerminate);
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    console.log(
      '\nPreview cleaned up. Root package.json, lockfiles and node_modules are unchanged.',
    );
  }
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}`);
  process.exitCode = 1;
});
