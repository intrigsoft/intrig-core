import { Injectable } from '@nestjs/common';
import {GeneratorCli, PackageManagerService} from "common";
import { PackageJson } from 'nx/src/utils/package-json';
import {ConfigService} from "@nestjs/config";
import path from "path";
import fs from "fs-extra";
import * as process from "node:process";

@Injectable()
export class NextCliService extends GeneratorCli {
  constructor(private readonly packageManagerService: PackageManagerService,
              private readonly config: ConfigService
              ) {
    super();
  }

  private rootDir = this.config.get('rootDir') ?? process.cwd()

  override name(): string {
    return "next"
  }

  override match(packageJson: PackageJson): boolean {
    return "next" in { ...packageJson.dependencies, ...packageJson.devDependencies };
  }
  override async postInit(): Promise<void> {

    await this.packageManagerService.installDependency("@intrig/next", false, false, this.rootDir)
    await this.packageManagerService.installDependency("intrig", true, false, this.rootDir)

    const gitIgnorePath = path.resolve(this.rootDir, '.gitignore');
    const gitIgnoreFileContent = (fs.existsSync(gitIgnorePath) ? fs.readFileSync(gitIgnorePath, 'utf-8') : '').split('\n')

    gitIgnoreFileContent.push("**/(generated)")
    fs.writeFileSync(gitIgnorePath, gitIgnoreFileContent.join('\n'), 'utf-8');
  }

  async preBuild(): Promise<void> {
    const rootDir = this.config.get('rootDir') ?? process.cwd();
    const sourceDir = path.resolve(rootDir, '.intrig/generated/dist/api/(generated)');
    const destDir = path.resolve(rootDir, 'src/app/api/(generated)');

    fs.removeSync(destDir);
    fs.copySync(sourceDir, destDir, {overwrite: true});
  }
}
