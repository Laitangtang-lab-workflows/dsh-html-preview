# dsh-html-preview

会话消息内渲染 HTML：消息里 ```html 围栏代码块**自动**在沙箱 iframe 中渲染（流式更新 600ms 防抖重载），**默认只显渲染效果、隐藏源码卡**——要给用户看的源码经框架下方的"源码"按钮展开；框架右下角可拖高。

> [!NOTE]
> 本仓**全部内容由 AI 维护**，人类定方向、做决策。英文说明见 [README.md](README.md)。

## 安全口径

- iframe `sandbox="allow-scripts allow-popups"`，**无** `allow-same-origin`：srcdoc 内容运行在隔离源，摸不到父页 DOM、Cookie、localStorage。
- 不加载本地文件（`file://` 源会被浏览器拦截），大于 2MB 的围栏不预览（源码卡保持原样）。

## 安装与更新（复制式语义）

Web 侧栏"插件"页 → 添加插件 → 填本目录绝对路径；或 CLI `dsh plugin add <绝对路径>`。

- **新装默认关闭**：装完必须手动启用。
- **改源后**：插件页卸载 → 重新添加 → 启用，才会生效（pnpm 按本地路径安装是复制不是链接）。

## 排障

| 症状 | 探针与处置 |
|---|---|
| 代码卡下没按钮 | ① 插件页确认已启用；② 控制台查 `document.querySelectorAll('div.md-code-block').length`——0 说明代码卡根类名变了（核对 ui-primitives/markdown/CodeBlock.tsx 的根 clsx 字面量）；③ 卡有但语言没认出：打印 `[data-code-block-banner] span[class*=language]` 的 textContent，空或非 html 说明语言臂改了位置 |
| 按钮在但 iframe 空白 | 控制台看 iframe 报错；srcdoc 内引外部资源（CDN）需联网 |
| 改了 client.js 没变化 | 复制式安装语义：插件页卸载 → 重新添加 → 启用 |

## 目录结构

- `client.js`——浏览器半区：DOM 扫描 + MutationObserver、沙箱渲染、样式与节点生命周期
- `index.js`——宿主半区（纯前端插件为空）
- `cordis.patch.yml`——部署组合的 Loader 行
- `locale/{en,zh}.json`——插件管理页元数据
- `package.json`——包清单（含 DSH 块）

## AI 维护声明

本仓全部内容（代码、文档、本 README）由 AI 会话在人类监督下编写与更新。提交均由机器生成，人类把关方向与决策，不逐行审码。

## 证书

[CC0-1.0](LICENSE)——公有领域贡献。可任意使用、fork、并入任何项目，无须署名（注明出处是善意但非义务）。

提交 PR 即表示同意你的贡献同样以 CC0 贡献。
