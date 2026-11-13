/**
 * 浏览器半区：把会话消息里的 ```html 围栏代码块自动渲染成沙箱 iframe 预览。
 * 纯 DOM + MutationObserver，零依赖；注入物（样式/按钮/框架）挂在插件
 * fiber 生命周期上，停用/卸载自动摘除。
 *
 * DOM 定位（依据 DSH web 客户端 ui-primitives/markdown 的真实结构，2026-11-12 核源码）：
 *  - 围栏代码卡根节点带字面量类 `md-code-block`（CodeBlock.tsx L188，非哈希类）；
 *  - 横幅容器 `data-code-block-banner`；语言名在其内 `span[class*='language']`
 *    （CodeToolbar，可高亮时显示语言 id）或 `div[class*='infostring']`（无工具栏臂）；
 *  - 代码体在 `[data-code-block-content] pre`（shiki 高亮臂与纯文本臂都有 pre）。
 * 渲染策略：检测到 html 围栏即自动渲染，且**默认隐藏源码卡**只显渲染效果
 * （要给用户看的源码经框架下方的"源码"按钮展开）；流式消息文本变化经
 * 600ms 防抖后重载 srcdoc（避免流式期 iframe 抖动刷新）；超 2MB 回退为
 * 显示源码卡不渲染。
 * 安全口径：iframe = sandbox="allow-scripts allow-popups"（无 allow-same-origin），
 * srcdoc 内容运行在隔离源，摸不到父页 DOM、Cookie 与 localStorage；
 * 不做本地文件加载（file:// 源被浏览器拦截），大文件走 present 卡片。
 */
window.__ModuleLoader__.load({
  id: 'dsh-html-preview',
  factory() {
    const CSS = `
.dsh-html-preview-btn {
  display: inline-block;
  font: 12px/1.5 inherit;
  margin: 0 0 14px;
  padding: 2px 12px;
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  border-radius: 6px;
  background: var(--dsw-alias-markdown-inline-code, #f5f5f5);
  color: inherit;
  cursor: pointer;
}
.dsh-html-preview-btn:hover { border-color: var(--dsw-alias-link, #888); }
.dsh-html-preview-frame {
  display: none;
  width: 100%;
  max-width: min(100%, 920px);
  height: 520px;
  border: 1px solid var(--dsw-alias-border-l2, #ccc);
  border-radius: 6px;
  background: #fff;
  resize: both;
  overflow: auto;
  margin: 4px 0 2px;
}
`

    const injected = []   // 本插件注入的节点，停用时统一摘除
    const hiddenCards = []   // 被隐藏的源码卡，停用时恢复显示
    const live = new Map()   // 卡 -> 同步函数（流式期增量刷新用）
    const LIMIT = 2_000_000   // 超过 2MB 的围栏不预览（防呆，走文件卡片）
    const DEBOUNCE = 600   // 流式文本静默多久后重载 srcdoc（毫秒）

    // 卡的语言 id：工具栏臂（span[class*='language']）或无工具栏臂（infostring）
    function langOf(card) {
      const s = card.querySelector('[data-code-block-banner] span[class*="language"]')
        || card.querySelector('[data-code-block-banner] [class*="infostring"]')
      return (s?.textContent || '').trim().toLowerCase()
    }

    function attach(card, pre) {
      card.dataset.dshHtmlPreview = '1'

      const srcBtn = document.createElement('button')
      srcBtn.type = 'button'
      srcBtn.className = 'dsh-html-preview-btn'
      srcBtn.textContent = '源码'
      const frame = document.createElement('iframe')
      frame.className = 'dsh-html-preview-frame'
      frame.setAttribute('title', 'dsh-html-preview')
      frame.setAttribute('sandbox', 'allow-scripts allow-popups')

      let srcShown = false   // 源码卡默认隐藏，只显渲染效果
      let lastSrc = null
      let timer = null

      function load(src) {
        lastSrc = src
        frame.srcdoc = src
        frame.style.display = 'block'
      }

      function sync(immediate) {
        const src = pre.textContent || ''
        if (src.length > LIMIT) {
          // 超限回退：不渲染，恢复源码卡显示
          clearTimeout(timer)
          frame.style.display = 'none'
          card.style.display = ''
          return
        }
        if (src === lastSrc) return
        if (immediate !== false) {
          load(src)
        } else {
          // 流式更新：静默 DEBOUNCE 后再重载，避免逐字刷新抖动
          clearTimeout(timer)
          timer = window.setTimeout(() => load(pre.textContent || ''), DEBOUNCE)
        }
      }

      srcBtn.addEventListener('click', () => {
        srcShown = !srcShown
        card.style.display = srcShown ? '' : 'none'
        srcBtn.textContent = srcShown ? '隐藏源码' : '源码'
      })

      card.insertAdjacentElement('afterend', frame)
      frame.insertAdjacentElement('afterend', srcBtn)   // 源码按钮在框架下方
      injected.push(srcBtn, frame)
      hiddenCards.push(card)
      live.set(card, sync)

      card.style.display = 'none'   // 默认只显渲染效果
      sync(true)   // 检测到即自动渲染
    }

    function enhance(root) {
      // 已挂载的卡：流式同步；离场的卡（消息重渲染被替换）清出注册表
      for (const [card, sync] of live) {
        if (!card.isConnected) live.delete(card)
        else sync(false)
      }
      root.querySelectorAll('div.md-code-block').forEach((card) => {
        if (card.dataset.dshHtmlPreview) return
        if (langOf(card) !== 'html') return
        const pre = card.querySelector('[data-code-block-content] pre')
        if (!pre) return
        attach(card, pre)
      })
    }

    let observer = null
    return {
      apply(ctx) {
        ctx.effect(() => {
          const style = document.createElement('style')
          style.dataset.plugin = 'dsh-html-preview'
          style.dataset.pluginCss = 'dsh-html-preview/preview.css'
          style.textContent = CSS
          document.head.append(style)

          enhance(document.body)
          observer = new MutationObserver(() => enhance(document.body))
          observer.observe(document.body, { childList: true, subtree: true })

          return () => {
            style.remove()
            if (observer) observer.disconnect()
            injected.forEach((n) => n.remove())
            injected.length = 0
            hiddenCards.forEach((c) => { c.style.display = '' })
            hiddenCards.length = 0
            live.clear()
          }
        }, 'html-preview: 围栏渲染')
      },
    }
  },
})
