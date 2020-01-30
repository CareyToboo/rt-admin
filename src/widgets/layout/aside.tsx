import AsideNav from 'amis/lib/components/AsideNav'
import React from 'react'
import { useLocation, Link } from 'react-router-dom'

import { menusConfig } from '~/routes/config'
import { getRoutePath } from '~/routes/route'

import { LayoutCommProps } from './common'

type Props = LayoutCommProps

const renderNav = ({ link, toggleExpand, classnames: cx }: any) => {
  const { children: routeChildren, icon, label, badge, badgeClassName, path } = link
  const children = []

  if (routeChildren) {
    children.push(
      <span
        key="expand-toggle"
        className={cx('AsideNav-itemArrow')}
        onClick={(e) => toggleExpand(link, e)}
      />
    )
  }

  if (badge) {
    children.push(
      <b key="badge" className={cx(`AsideNav-itemBadge`, badgeClassName || 'bg-info')}>
        {badge}
      </b>
    )
  }

  if (icon) {
    children.push(<i key="icon" className={cx(`AsideNav-itemIcon`, icon)} />)
  }

  if (label) {
    children.push(
      <span className={cx(`AsideNav-itemLabel`)} key="label">
        {label}
      </span>
    )
  }

  if (!path) {
    return <a onClick={routeChildren ? () => toggleExpand(link) : undefined}>{children}</a>
  }

  return <Link to={getRoutePath(path)}>{children}</Link>
}

export default (props: Props) => {
  const { theme } = props
  const location = useLocation()

  return (
    <AsideNav
      theme={theme}
      navigations={menusConfig as any}
      renderLink={renderNav}
      isActive={(link: any) => !!(getRoutePath(link.path) === location.pathname)}
    />
  )
}
