import * as fsx  from 'fs-extra'
import * as path from 'path'
import npa       from 'npm-package-arg'
import { Logger } from '@nestjs/common'
import { PluginManager } from 'live-plugin-manager'
import { IntrigConfig, Plugin } from 'common'

const logger = new Logger('loadDynamicModules')
const manager = new PluginManager({
  pluginsPath: path.resolve(process.env.ROOT_DIR ?? process.cwd(), '.intrig', 'cache', 'plugins'),
  npmRegistryUrl: 'https://registry.npmjs.org/',
})

export async function loadDynamicModules(): Promise<Plugin[]> {
  const root = process.env.ROOT_DIR ?? process.cwd()
  const cfg: IntrigConfig  = fsx.readJsonSync(path.join(root, 'intrig.config.json'))
  const spec = npa(cfg.generatorLib)

  logger.log(`→ resolving plugin spec: ${cfg.generatorLib}`)

  switch (spec.type) {
    // any local path (file: or plain directory)
    case 'file':
    case 'directory': {
      // strip off the "file:" prefix if present
      let local = spec.fetchSpec!.replace(/^file:/, '')
      if (!path.isAbsolute(local)) local = path.resolve(root, local)

      logger.log(`Installing from local filesystem: ${local}`)
      await manager.installFromPath(local, { force: true })
      break
    }

    // GitHub shorthand ("owner/repo#ref") or registry version/tag/range
    case 'version':
    case 'tag':
    case 'range':
    case 'git': {
      const name    = spec.name!
      const fetch   = spec.fetchSpec === '*' ? undefined : spec.fetchSpec!
      logger.log(`Installing from npm/GitHub: ${name}@${fetch}`)
      // install() will handle:
      // • npm registry if fetch is a semver/tag/range
      // • GitHub repo if fetch is "owner/repo[#ref]"
      await manager.install(name, fetch)
      break
    }

    // pure URL (tarball or git+https)
    case 'remote': {
      const url = spec.fetchSpec!
      logger.log(`Installing from URL: ${url}`)
      // live-plugin-manager currently only supports GitHub via install(name,fetch),
      // so for arbitrary tarballs you can fall back to installFromCode:
      //   1) fetch the .tgz yourself (e.g. via “pacote”)
      //   2) pass its code string in installFromCode
      // But if it’s a GitHub tarball URL, you can still do:
      await manager.installFromNpm(spec.name!, url)
      break
    }

    default:
      throw new Error(`Unsupported spec type "${spec.type}" for "${cfg.generatorLib}"`)
  }

  // finally load by package name
  const mod = await import(spec.name!)
  return [mod.plugin as Plugin]
}
