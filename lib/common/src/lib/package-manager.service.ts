import {Injectable, Logger} from '@nestjs/common';
import {promisify} from "util";
import {exec} from "child_process";
import {existsSync} from "fs";
import {join} from "path";

const execAsync = promisify(exec);

interface PackageManager {
  name: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno';
  version?: string;
}

/**
 * Detects the package manager by checking for lockfiles (bundleable replacement for 'nypm')
 */
function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, 'bun.lockb'))) {
    return { name: 'bun' };
  }
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    return { name: 'pnpm' };
  }
  if (existsSync(join(cwd, 'yarn.lock'))) {
    return { name: 'yarn' };
  }
  if (existsSync(join(cwd, 'deno.lock'))) {
    return { name: 'deno' };
  }
  // Default to npm (package-lock.json or no lockfile)
  return { name: 'npm' };
}

@Injectable()
export class PackageManagerService {
  private readonly logger = new Logger(PackageManagerService.name);
  private pm!: PackageManager;

  /** Detect (and cache) the project's package manager */
  private async getPM(): Promise<PackageManager> {
    if (!this.pm) {
      const detectedPM = detectPackageManager(process.cwd());
      if (!detectedPM) {
        throw new Error('Failed to detect package manager');
      }
      this.pm = detectedPM;
      this.logger.log(`Detected package manager: ${this.pm.name}`);
    }
    if (!this.pm) {
      throw new Error('Failed to detect package manager');
    }
    return this.pm;
  }

  /**
   * Run an arbitrary package‐manager command.
   * @param script e.g. 'install', 'run build', 'test'
   * @param cwd   working directory to run in (defaults to project root)
   */
  async runScript(script: string, cwd = process.cwd()): Promise<string> {
    const pm = await this.getPM();
    // build the right CLI invocation
    const cmd = `${pm.name} ${script}`;

    this.logger.log(`Running: ${cmd} (in ${cwd})`);
    const { stdout, stderr } = await execAsync(cmd, { cwd });
    if (stderr) this.logger.warn(stderr.trim());
    return stdout.trim();
  }

  async exec(cmd: string, cwd = process.cwd()): Promise<string> {
    const {stdout, stderr} = await execAsync(cmd, { cwd });
    if (stderr) this.logger.warn(stderr.trim());
    return stdout.trim();
  }

  /** Shortcut for `install` */
  install(cwd?: string) {
    return this.runScript('install', cwd);
  }

  async installDependency(dep: string, dev = false, legacy = true, cwd?: string) {
    try {
      switch ((await this.getPM()).name) {
        case "npm":
          await this.runScript(`install ${dev ? '-D' : ''} ${dep} ${legacy ? '--legacy-peer-deps' : ''}`, cwd);
          break;
        case "yarn":
          await this.runScript(`add ${dev ? '-D' : ''} ${dep} ${legacy ? '--legacy-peer-deps' : ''}`, cwd);
          break;
        case "pnpm":
          await this.runScript(`add ${dev ? '-D' : ''} ${dep} ${legacy ? '--legacy-peer-deps' : ''}`, cwd);
          break;
        case "bun":
          await this.runScript(`install ${dev ? '-d' : ''} ${dep} ${legacy ? '--legacy-peer-deps' : ''}`, cwd);
          break;
        case "deno":
          await this.runScript(`install ${dep} ${legacy ? '--legacy-peer-deps' : ''}`, cwd);
          break;
      }
    } catch (e: any) {
      if (e.stderr.includes('--legacy-peer-deps')) {
        await this.installDependency(dep, dev, true, cwd);
      }
    }
  }

  /** Shortcut for `build` (npm run build, yarn build, etc.) */
  build(cwd?: string) {
    return this.runScript('run build', cwd);
  }

  ls(cwd?: string) {
    return this.runScript('ls', cwd);
  }

  prefix(cwd?: string) {
    return this.runScript('prefix', cwd);
  }

  /** Run any npm‐style script by name (e.g. 'test', 'lint') */
  runTask(taskName: string, cwd?: string) {
    return this.runScript(`run ${taskName}`, cwd);
  }
}
