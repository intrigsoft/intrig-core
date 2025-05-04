import {Command, CommandRunner} from "nest-commander";
import {ProcessManagerService} from "../process-manager.service";
import {ConfigService} from "@nestjs/config";
import {Inject, Logger} from "@nestjs/common";
import * as path from 'path'
import * as fs from 'fs'
import * as fsx from 'fs-extra'
import {GENERATORS} from "../tokens";
import {GeneratorCli, IntrigConfig} from "common";
import {PackageJson} from "nx/src/utils/package-json";

@Command({name: "init", description: "Initialize Intrig"})
export class InitCommand extends CommandRunner {
  private readonly logger = new Logger(InitCommand.name);

  constructor(private pm: ProcessManagerService,
              private config: ConfigService,
              @Inject(GENERATORS) private generators: GeneratorCli[]
  ) {
    super();
  }

  private rootDir = this.config.get('rootDir') ?? process.cwd();

  override async run(passedParams: string[], options?: Record<string, any>): Promise<void> {
    this.logger.log('Initializing Intrig...');

    if (await this.pm.isRunning()) {
      this.logger.error('Intrig is already running');
      throw new Error("Intrig is already running");
    }

    this.logger.debug('Reading package.json...');
    let packageJsonPath = path.resolve(this.rootDir, 'package.json');
    let packageJson: PackageJson = fsx.readJsonSync(packageJsonPath)

    const dependencies = {...packageJson.dependencies, ...packageJson.devDependencies}

    if (!('typescript' in dependencies)) {
      this.logger.warn('Intrig works best with TypeScript. Consider adding TypeScript to your project for the best experience.');
    }

    let generator = this.generators.find(generator => generator.match(packageJson));

    if (!generator) {
      this.logger.error('No generator found for this project');
      throw new Error("No generator found for this project");
    }

    const config: IntrigConfig = {
      sources: [],
      generator: generator.name()
    }

    const configPath = path.resolve(this.rootDir, 'intrig.config.json');
    this.logger.debug('Writing config file...');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    let gitIgnorePath = path.resolve(this.rootDir, '.gitignore');
    let gitIgnoreFileContent = (fs.existsSync(gitIgnorePath) ? fs.readFileSync(gitIgnorePath, 'utf-8') : '').split('\n')

    if (!gitIgnoreFileContent.includes(".intrig/generated")) {
      this.logger.debug('Updating .gitignore file...');
      gitIgnoreFileContent.push(".intrig/generated")
    }

    packageJson.scripts = packageJson.scripts || {};
    this.logger.debug('Updating package.json scripts...');
    packageJson.scripts['predev'] = [packageJson.scripts['predev'], 'intrig prebuild'].filter(Boolean).join(' && ')
    packageJson.scripts['prebuild'] = [packageJson.scripts['prebuild'], 'intrig prebuild'].filter(Boolean).join(' && ')
    packageJson.scripts['postbuild'] = [packageJson.scripts['postbuild'], 'intrig postbuild'].filter(Boolean).join(' && ')
    fsx.writeJSONSync(packageJsonPath, packageJson, {spaces: 2})
    fs.writeFileSync(gitIgnorePath, gitIgnoreFileContent.join('\n'), 'utf-8');

    this.logger.debug('Running generator post-initialization...');
    await generator.postInit();
    process.exit(0);
  }
}