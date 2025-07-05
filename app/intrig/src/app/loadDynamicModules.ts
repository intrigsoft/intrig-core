import * as fsx from 'fs-extra'
import * as path from 'path'
import {IntrigConfig, Plugin} from "common";
import { PluginManager } from "live-plugin-manager";

const manager = new PluginManager({
  pluginsPath: path.resolve(process.env.ROOT_DIR ?? process.cwd(), '.intrig', 'cache', 'plugins'),
})

export async function loadDynamicModules(): Promise<Plugin[]>{
  const _path = process.env.ROOT_DIR ?? process.cwd()
  const configJsonPath = path.join(_path, 'intrig.config.json')
  const configJson: IntrigConfig = fsx.readJsonSync(configJsonPath)

  await manager.install(configJson.generatorLib)
  const mod = await manager.require(configJson.generatorLib);
  return [mod.plugin as Plugin]
}