import { execSync } from 'child_process'
import fse from 'fs-extra'
import http from 'http'
import https from 'https'
import importFresh from 'import-fresh'
import _ from 'lodash'
import path from 'path'
import webpack, { Configuration } from 'webpack'
import merge from 'webpack-merge'

import {
  libRootPath,
  libName,
  dllVer,
  libVer,
  dllVendorDirPath,
  dllAssetsFile,
  dllVendorFileName,
  dllManifestFile,
  dllJsdelivrHostDir,
} from './constants'
import { PkgName, SiteConfig } from './types'

export function normalizeUrl(rawUrls: string[]): string {
  const urls = rawUrls
  const resultArray: any[] = []

  // If the first part is a plain protocol, we combine it with the next part.
  if (urls[0].match(/^[^/:]+:\/*$/) && urls.length > 1) {
    const first = urls.shift()
    urls[0] = first + urls[0]
  }

  // There must be two or three slashes in the file protocol,
  // two slashes in anything else.
  const replacement = urls[0].match(/^file:\/\/\//) ? '$1:///' : '$1://'
  urls[0] = urls[0].replace(/^([^/:]+):\/*/, replacement)

  // eslint-disable-next-line
  for (let i = 0; i < urls.length; i++) {
    let component = urls[i]

    if (typeof component !== 'string') {
      throw new TypeError(`Url must be a string. Received ${typeof component}`)
    }

    if (component === '') {
      // eslint-disable-next-line
      continue
    }

    if (i > 0) {
      // Removing the starting slashes for each component but the first.
      component = component.replace(/^[/]+/, '')
    }

    // Removing the ending slashes for each component but the last.
    // For the last component we will combine multiple slashes to a single one.
    component = component.replace(/[/]+$/, i < urls.length - 1 ? '' : '/')

    resultArray.push(component)
  }

  let str = resultArray.join('/')
  // Each input component is now separated by a single slash
  // except the possible first plain protocol part.

  // Remove trailing slash before parameters or hash.
  str = str.replace(/\/(\?|&|#[^!])/g, '$1')

  // Replace ? in parameters with &.
  const parts = str.split('?')
  str = parts.shift() + (parts.length > 0 ? '?' : '') + parts.join('&')

  // Dedupe forward slashes.
  str = str.replace(/^\/+/, '/')

  return str
}

export function compileWebpack(config: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config)
    compiler.run((err, stats) => {
      if (err) {
        reject(err)
      }
      if (stats?.hasErrors()) {
        stats.toJson('errors-only').errors.forEach((e) => {
          console.error(e)
        })
        reject(new Error('Failed to compile with errors.'))
      }
      if (stats?.hasWarnings()) {
        stats.toJson('errors-warnings').warnings.forEach((warning) => {
          console.warn(warning)
        })
      }
      resolve(true)
    })
  })
}

export function mergeWebpackConfig(baseConfig: any, config: string | object): Configuration {
  let webpackConfig = baseConfig

  if (typeof config === 'object') {
    webpackConfig = merge(baseConfig, config)
  } else if (typeof config === 'string' && fse.existsSync(config)) {
    webpackConfig = merge(baseConfig, importFresh(config) as any)
  }

  return webpackConfig as Configuration
}

const store: any = {}
export function globalStore<T = any>(type: 'get' | 'set', key: string, value?: T): T | undefined {
  if (type === 'set') {
    _.set(store, key, value)
    return undefined
  }
  return _.get(store, key, value)
}

export function isCliDev() {
  return __dirname.indexOf(`@${libName}`) === -1 && __dirname.indexOf(`${libRootPath}/`) > -1
}

export function getCliDevRootDir() {
  return __dirname.substring(0, __dirname.indexOf(libRootPath)) + libRootPath
}

export function getModulePath(siteDir: string, lib: string, required: boolean = false) {
  const isDev = isCliDev()
  const devRootDir = getCliDevRootDir()

  const isLib = lib.indexOf('lib/') === 0
  const libPath = !isLib ? lib : lib.replace(/^lib\//, '')
  const prodPath = `node_modules/${!isLib ? '' : `@${libName}/`}${libPath}`

  const libPaths = [
    `${siteDir}/${prodPath}`,
    path.resolve(siteDir, `../../${prodPath}`),
    path.resolve(siteDir, `../../../../${prodPath}`),
  ]

  if (isDev) {
    libPaths.push(`${devRootDir}/${prodPath}`)
  }

  if (isDev && isLib) {
    libPaths.push(`${devRootDir}/packages/${libPath}`)
  }

  const modulePath = libPaths.find((corePath) => fse.pathExistsSync(corePath))

  if (!modulePath && required) {
    throw new Error(`Can not find path: ${lib}.\nSearched paths:\n${libPaths.join('\n')}`)
  }

  return modulePath
}

export function getDllHostDir(options: Partial<SiteConfig>) {
  const { publicPath, dll = {} } = options
  const confHostDir = dll.hostDir || `${dll.publicPath || publicPath}${dllVendorDirPath}/`

  const hostDir = (dll.useJsdelivr ? dllJsdelivrHostDir : confHostDir)
    .replace('[libVer]', libVer)
    .replace('[dllVer]', dllVer)

  const backHostDir = `${publicPath}${dllVendorDirPath}/`

  return [hostDir, backHostDir]
}

export function getDllManifestFile(siteDir: string) {
  const assetsFile = `${siteDir}/${dllAssetsFile.replace('[name]', dllVendorFileName)}`
  const manifestFile = `${siteDir}/${dllManifestFile.replace('[name]', dllVendorFileName)}`

  return {
    assetsFile,
    manifestFile,
  }
}

export function getPkgName(pkg?: PkgName) {
  return `@${libName}/${pkg || ''}`
}

export function getPkgLatestVer(): string {
  let latestVer = libVer

  try {
    latestVer = execSync(`npm view ${getPkgName('cli')} version`)
      .toString()
      .replace('\n', '')
  } catch (err) {
    //
  }

  return latestVer
}

export async function fetchFile(url: string): Promise<any> {
  const proto = url.startsWith('https') ? https : http

  return new Promise((resolve, reject) => {
    const onError = (tip: string = '') => {
      reject(new Error(`Failed to get '${url}'. ${tip}`))
    }

    const request = proto.get(url, (response) => {
      if (response.statusCode !== 200) {
        onError(`StatusCode: ${response.statusCode}`)
        return
      }

      let body = ''
      response.on('data', (chunk) => {
        body += chunk
      })

      response.on('error', () => {
        onError('Response an error occurred.')
      })

      response.on('end', () => {
        resolve({
          ...response,
          body,
        })
      })
    })

    request.on('error', () => {
      onError('Request an error occurred.')
    })
  })
}
