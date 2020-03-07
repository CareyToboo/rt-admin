import path from 'path'
import { Configuration } from 'webpack'

import { loadContext } from '../config'
import { dllDirPath } from '../constants'
import { BuildCliOptions, Props } from '../types'
import { compileWebpack } from '../utils'
import { createBaseConfig } from '../webpack/base'

import chalk = require('chalk')

/**
 * think how to build theme
 */
export async function theme(
  siteDir: string,
  cliOptions: Partial<BuildCliOptions> = {}
): Promise<void> {
  process.env.BABEL_ENV = 'production'
  process.env.NODE_ENV = 'production'
  console.log(chalk.blue('Creating an optimized production build...'))

  const props: Props = loadContext(siteDir)

  const config: Configuration = createBaseConfig({ ...props, ...cliOptions })

  await compileWebpack(config)

  const relativeDir = path.relative(process.cwd(), dllDirPath)
  console.log(`\n${chalk.green('Success!')} Generated dll files in ${chalk.cyan(relativeDir)}.\n`)
}