import { createGlobalStyle, css } from 'styled-components'

// app 全局样式
export const GlobalAppStyle = createGlobalStyle`
  /** 需要用到主题的全局样式 */
  ${({ theme: { ns, colors } }) => css`
    body > div {
      color: ${colors.text};
    }

    .${ns}Chart {
      min-width: 100px !important;
      min-height: 100px !important;
    }

    .${ns}DateRangePicker {
      align-items: center;
    }
  `}

  /** 不需要用到主题的全局样式 */
  #app-root {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .app-tool-tip {
    max-width: unset !important;
  }
  
`