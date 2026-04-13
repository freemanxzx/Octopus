# Octopus MD - Cloudflare Pages 部署说明

本文档记录了将 Octopus MD 部署到 Cloudflare Pages (免服务器静态托管方案) 的完整流程和注意事项。

## 1. 为什么选择 Cloudflare Pages？
由于 Octopus MD 是一个纯本地化运行、依靠浏览器执行所有编译和第三方同步（API 跨域请求）的 Vue SPA (单页应用)，因此无需部署任何 Node.js 后端。将其产物部署到免费且分布节点广泛的 Cloudflare Pages 是当前最优的选择。

## 2. 部署前准备 (Pre-requisites)

1. **打包产物准备**
   * 执行 `pnpm run build`。
   * 此命令会将前台 Vue 组件和路由编译并提取到 `dist/` 文件夹下。
2. **路由兜底 (`_redirects` 机制)**
   * 对于历史单页应用（没有真实物理页面，全是依靠 Vue Router 的页面逻辑），刷新网页时必须让服务器响应 `index.html`。
   * 本项目已在部署前通过在输出目录自带一份 `public/_redirects` 解决：
     ```text
     /* /index.html 200
     ```

## 3. 具体部署方式

有两种形式可以将代码发布至 Cloudflare。

### 方式 A：GitHub 持续集成 (推荐线上自动方案)
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) 并进入“Workers & Pages”。
2. 新建 Application (Pages)，选择 **Connect to Git**。
3. 选择您托管 Octopus-MD 的 GitHub 仓库。
4. **Build settings (构建设置)** 如下：
   - **Framework preset**: `Vue`
   - **Build command**: `pnpm run build`
   - **Build output directory**: `dist`
5. 保存后，以后每次你在 main 分支提交代码，Cloudflare 会自动完成构建流程并更新线上版！

### 方式 B：使用 Wrangler CLI 命令行本地直推 (推荐测试打包方案)
使用本地构建好的 `dist` 产物，直接越过仓库通过命令行上传：
1. 确保本地刚执行了 `pnpm run build`。
2. 在终端目录执行：`npx wrangler pages deploy dist`
3. 系统将弹出浏览器要求认证你的 Cloudflare 账户。
4. CLI 自动上传文件并在 5-10 秒后提供预览链接直接体验！

## 4. 后续配置（可选项）
如果使用自定义域名，请进入刚创建成功的 Cloudflare Pages 项目下的 **Custom domains** 页面进行绑定，并在您的 DNS 解析中加入其提供的 CNAME 记录。
