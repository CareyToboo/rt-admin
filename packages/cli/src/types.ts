import { Loader } from 'webpack'

type TemplateConfig = {
  path?: string // 模版地址
  head?: string // 嵌入 <head> 标签的内容
  preBody?: string // 嵌入 <body> 标签最上面
  postBody?: string // 嵌入 <head> 标签最下面
}

type DevServerConfig = {
  publicPath: string
  openPage: string
  proxy: any
  [key: string]: any
}

// TODO: v1 版本重新梳理 配置命名
export type SiteConfig = {
  favicon: string // 项目 icon，必须配置
  title: string // 项目 title，必须配置
  appKey?: string // 当前app的标示
  publicPath: string // 项目的静态资源前缀路径，可用于CDN部署
  devServer: Partial<DevServerConfig> // webpack devServer配置
  dll: {
    // dll 相关的配置
    hostDir?: string // dll 挂载路径文件夹地址
    publicPath?: string // 仅仅对 .ovine/static/dll 文件使用 CND 部署，主要用于多个项目同时使用Ovine的场景
    useJsdelivr?: boolean // 使用 jsdelivr cdn
  }
  // UI 相关配套
  ui: {
    defaultTheme?: string // 初始化主题
    withIconfont?: boolean // 使用预设 iconfont
    withoutPace?: boolean // 是否使用 默认的 顶部 loadingBar
    appTheme?: string // 当不需要 主题切换时需要
  }
  envModes?: string[] // 应用环境列表
  staticFileExts?: string[] // 需要处理的静态资源类型
  template?: TemplateConfig // 页面模版文件配置
  styledConfig?: any // styledComponent 编译配置
  cacheGroups?: {
    [key: string]: object // webpack cacheGroups 配置
  }
  splitRoutes?: Array<{
    // witch route page should be split
    test: RegExp // 路由正则匹配
    name: string // 被匹配的路由，将分割为一个文件
  }>
}

export type SiteContext = {
  siteConfig?: SiteConfig
}

export type CliOptions = {
  env: string
  mock: boolean
}

export type DevCliOptions = CliOptions & {
  port: string
  host: string
  hot: boolean
  localIp: boolean
  open: boolean
  dll: boolean
  scssUpdate: boolean
}

export type BuildCliOptions = CliOptions & {
  bundleAnalyzer: boolean
}

export type DllCliOptions = {
  embedAssets: boolean // convert all asset files to base64, reduce http request
  withHash: boolean
  bundleAnalyzer: boolean
}

export interface LoadContext {
  siteDir: string
  genDir: string
  siteConfig: SiteConfig
  outDir: string
  srcDir: string
  publicPath: string
}

export type Props = LoadContext

export interface ConfigureWebpackUtils {
  getStyleLoaders: (
    isServer: boolean,
    cssOptions: {
      [key: string]: any
    }
  ) => Loader[]
  getCacheLoader: (isServer: boolean, cacheOptions?: {}) => Loader | null
  getBabelLoader: (isServer: boolean, babelOptions?: {}) => Loader
}

export type PkgName = 'cli' | 'init' | 'editor' | 'core' | 'craft'
