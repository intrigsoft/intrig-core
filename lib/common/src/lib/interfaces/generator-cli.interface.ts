import {PackageJson} from "nx/src/utils/package-json";

export abstract class GeneratorCli {
  abstract name(): string
  abstract match(packageJson: PackageJson): boolean
  abstract postInit(): Promise<void>
  abstract preBuild(): Promise<void>
}