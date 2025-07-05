import { Injectable } from '@nestjs/common';
import {GeneratorCli, PackageManagerService} from "@intrig/common";
import { PackageJson } from 'nx/src/utils/package-json';
import {ConfigService} from "@nestjs/config";
import process from "node:process";

@Injectable()
export class ReactCliService extends GeneratorCli {
  constructor(private readonly packageManagerService: PackageManagerService,
              private readonly config: ConfigService
  ) {
    super();
  }

  private rootDir = this.config.get('rootDir') ?? process.cwd()

  override name(): string {
    return "react"
  }
  override match(packageJson: PackageJson): boolean {
    return "react" in { ...packageJson.dependencies, ...packageJson.devDependencies };
  }
  override async postInit(): Promise<void> {
    await this.packageManagerService.installDependency("@intrig/react", false, false, this.rootDir)
  }
  override async preBuild(): Promise<void> {
    // intentionally kept empty
  }
}
