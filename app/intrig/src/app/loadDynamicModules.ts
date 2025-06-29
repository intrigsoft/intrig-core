import * as fsx from 'fs-extra'
import * as path from 'path'
import {Plugin} from "common";
import * as fs from "node:fs";
import {pathToFileURL} from "node:url";

export async function loadDynamicModules(): Promise<Plugin[]>{
  const _path = process.env.ROOT_DIR ?? process.cwd()
  const packageJsonPath = path.join(_path, 'package.json')
  const packageJson = fsx.readJsonSync(packageJsonPath)
  const pluginNames = [
    ...Object.keys(packageJson.devDependencies),
    ...Object.keys(packageJson.dependencies)
  ].filter(key => /@intrig\/.*(-binding)/g.test(key) || /.*(-intrig-binding)/g.test(key))

  const imports = await Promise.all(pluginNames.map(async pluginName => {
    const pluginPath = path.join(_path, 'node_modules', pluginName)
    const realDir = await fsx.promises.realpath(pluginPath);
    const childPkg = JSON.parse(await fs.promises.readFile(path.join(realDir, 'package.json'), 'utf-8'))
    const entry = childPkg.module || childPkg.main || 'index.js'
    const full = path.join(realDir, entry)
    // 4) Import via file:// URL
    console.log(full)
    const mod = await import(pathToFileURL(full).href)
    return (mod.default ?? mod) as Plugin
  }))

  console.log(imports)

  return []
}