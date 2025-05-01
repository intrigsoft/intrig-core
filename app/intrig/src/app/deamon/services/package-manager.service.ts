import {Injectable, Logger} from '@nestjs/common';
import {promisify} from "util";
import {exec} from "child_process";
import {PackageManager} from "nypm";

const execAsync = promisify(exec);

@Injectable()
export class PackageManagerService {
  private readonly logger = new Logger(PackageManagerService.name);
  private pm!: PackageManager;

  /** Detect (and cache) the project’s package manager via nypm */
  private async getPM(): Promise<PackageManager> {
    if (!this.pm) {
      const { detectPackageManager } = await import('nypm');
      const detectedPM = await detectPackageManager(process.cwd());
      if (!detectedPM) {
        throw new Error('Failed to detect package manager');
      }
      this.pm = detectedPM;
      this.logger.log(`Detected package manager: ${this.pm.name}@${this.pm.version}`);
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

  /** Shortcut for `install` */
  install(cwd?: string) {
    return this.runScript('install', cwd);
  }

  /** Shortcut for `build` (npm run build, yarn build, etc.) */
  build(cwd?: string) {
    return this.runScript('run build', cwd);
  }

  /** Run any npm‐style script by name (e.g. 'test', 'lint') */
  runTask(taskName: string, cwd?: string) {
    return this.runScript(`run ${taskName}`, cwd);
  }
}
