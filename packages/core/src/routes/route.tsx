/**
 * APP 路由相关组件
 */

import { Spinner } from 'amis'
import { eachTree } from 'amis/lib/utils/helper'
import isFunction from 'lodash/isFunction'
import map from 'lodash/map'
import React, { createContext, lazy, useContext, useMemo, Suspense } from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'

import { app } from '@/app'
import NotFound from '@/components/404'
import { Amis } from '@/components/amis/schema'
import ErrorBoundary from '@/components/error_boundary'
import { LayoutLazyFallback } from '@/components/layout/loading'
import { isSubStr } from '@/utils/tool'

import {
  getNodePath,
  getPageFileAsync,
  getPageMockSource,
  getPagePreset,
  getRoutePath,
  currPath,
} from './exports'
import { getAuthRoutes } from './limit'
import { checkLimitByKeys } from './limit/exports'
import { CheckLimitFunc, PresetComponentProps, PresetCtxState, PresetRouteProps } from './types'

const PageSpinner = <Spinner overlay show size="lg" key="pageLoading" />

// 根据 path，pathToComponent  参数 懒加载 `pages/xxx` 组件
export const getPageAsync = (option: PresetRouteProps) => {
  return lazy(() =>
    getPageFileAsync(option).then((file: any) => {
      const { default: content = {}, schema } = file
      const compProps: PresetComponentProps = {}

      if (isFunction(content)) {
        compProps.LazyFileComponent = content
      } else {
        if (schema) {
          content.schema = schema
        }
        compProps.lazyFileAmisProps = content
      }

      return {
        default: () => <PrestComponent {...option} {...compProps} />,
      }
    })
  )
}

// 登录路由拦截
export const PrivateRoute = ({ children, ...rest }: any) => {
  return (
    <Route
      {...rest}
      render={({ location }) => {
        return app.user.isLogin() ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: getRoutePath(app.constants.login.route),
              state: { from: location },
            }}
          />
        )
      }}
    />
  )
}

// usePresetContext 可获取 preset 值，与 checkLimit 校验权限 方法
const PresetContext = createContext<PresetCtxState>({})
export const usePresetContext = () => {
  const preset = useContext(PresetContext)
  const checkLimit: CheckLimitFunc = (keys, option) =>
    checkLimitByKeys(keys, {
      nodePath: preset.nodePath,
      ...option,
    })

  return {
    ...preset,
    checkLimit,
  }
}

// 将 preset 注入组件，可全局通过 usePresetContext 获取 preset 值
const PrestComponent = (props: PresetComponentProps) => {
  const { LazyFileComponent, lazyFileAmisProps, RouteComponent, ...rest } = props
  const { path, pathToComponent, nodePath: propNodePath } = rest

  const preset = useMemo(() => {
    const fileOption = { path, pathToComponent, nodePath: propNodePath }
    const mockSource = getPageMockSource(fileOption)
    const pagePreset = getPagePreset(fileOption) || {}
    const nodePath = getNodePath(fileOption)

    pagePreset.nodePath = nodePath

    map(pagePreset.apis, (api) => {
      const { mock, mockSource: apiMockSource, url = '' } = api
      // 自动注入规则
      if (mock === true && !apiMockSource && mockSource) {
        api.mockSource = mockSource[url] || mockSource
      }
    })

    return pagePreset
  }, [path, pathToComponent, propNodePath])

  let Component: any = <div>Not Found 请检查路由设置</div>

  if (LazyFileComponent) {
    Component = <LazyFileComponent {...rest} />
  }
  if (RouteComponent) {
    Component = <RouteComponent {...rest} />
  }
  if (lazyFileAmisProps) {
    lazyFileAmisProps.schema.preset = {
      ...lazyFileAmisProps.schema.preset,
      ...preset,
    }
    Component = <Amis {...rest} {...lazyFileAmisProps} />
  }

  return <PresetContext.Provider value={preset}>{Component}</PresetContext.Provider>
}

// 处理每个路由，包裹 PrestComponent 组件
export const PrestRoute = (props: PresetRouteProps) => {
  const {
    withSuspense = true,
    fallback = PageSpinner,
    path = '',
    component,
    exact = true,
    ...rest
  } = props

  const routePath = getRoutePath(path)
  if (exact && !isSubStr(routePath, ':') && routePath !== window.location.pathname) {
    return <Redirect to={getRoutePath(app.constants.notFound.route)} />
  }

  const RouteComponent = (
    <Route
      {...rest}
      path={routePath}
      exact={exact}
      component={
        !component
          ? getPageAsync(props)
          : () => <PrestComponent {...props} RouteComponent={component} />
      }
    />
  )

  if (withSuspense) {
    return (
      <ErrorBoundary type="page">
        <Suspense fallback={fallback}>{RouteComponent}</Suspense>
      </ErrorBoundary>
    )
  }

  return RouteComponent
}

const NotFoundRoute = () => {
  let Component = NotFound
  try {
    Component = require(`~/${currPath(app.constants.notFound.pagePath, '404')}`)
  } catch (e) {
    //
  }

  return <Route path="*" component={Component} />
}

// 将 routeConfig 转换为 route
export const AppMenuRoutes = () => {
  const routes: any = []

  getAuthRoutes().forEach(({ children }) => {
    if (!children) {
      return
    }

    eachTree(children, (item) => {
      if (item.path && !item.limitOnly) {
        routes.push(<PrestRoute key={routes.length + 1} withSuspense={false} {...item} />)
      }
    })
  })

  return (
    <ErrorBoundary type="page">
      <Suspense fallback={<LayoutLazyFallback />}>
        <Switch>
          {routes}
          <NotFoundRoute />
        </Switch>
      </Suspense>
    </ErrorBoundary>
  )
}