# Rain Shen · Portfolio

Chenyu (Rain) Shen 的双栏目作品集 —— 美术 (Art) + 传媒 (Media)。
技术栈：Cloudflare Pages + Functions + KV + R2，schema-driven 可视化后台。

- 前台：极简编辑风，EB Garamond + Noto Serif SC，sidebar 导航
- 后台：`/admin`，schema 驱动的可视化编辑器
- 图片：美术走 **postimg.cc 外链**（后台粘贴 Direct link）；传媒附件（视频/音频/PDF）走 **R2 上传**（`ggjj-assets` 桶，前缀 `rain/`）
- 图片加速：外部 URL 自动走 `/cdn-cgi/image` 变换 + srcset 多档响应式

---

## 1 · 本地开发

```bash
cd ~/Desktop/web/rain-portfolio
npm install
# .dev.vars 已创建好，密码 = dev
npm run dev
```

打开：
- 前台 → http://localhost:8788
- 后台 → http://localhost:8788/admin （密码 `dev`）

本地 KV / R2 由 miniflare 模拟（数据在 `.wrangler/state/`），不会动线上。

首次启动时，`/api/data` 为空会自动从 `public/data.initial.json` 回落，渲染出 42 张美术作品 + 4 篇传媒文章。在后台改一次、保存后，数据会写入本地 KV，之后不再读 initial.json。

---

## 2 · 数据结构

`public/schema.json` 定义 5 个板块：

| id | label | 关键字段 |
|---|---|---|
| `header` | 站点设置 | 站点名 / 副标题 / 底部小字 |
| `intro` | 首页 · 自我介绍 | `heroImages`（galleryUrl）/ `aboutParagraphs`（段落文字）|
| `art` | 美术 | `categories` list（每个系列：name / status / columns / items 图片外链）|
| `media` | 传媒 | `articles` / `videos` / `audios` 三个 list |
| `about` | 关于我 / 联系方式 | 照片外链 / 邮箱 / 电话 / 地点 |

**新的字段类型**（相对 tanyang 模板新增）：

- `imageUrl` — 图片外链（postimg），保存 `{ url, alt }`
- `galleryUrl` — 多图外链，保存 `[{ url, caption }]`，支持拖拽排序 + 批量粘贴
- `markdown` — 长文本（文章正文，支持 `#` 标题 / `**粗体**` / `*斜体*` / `> 引用` / `[链接](url)`）
- `file` — 任意文件上传到 R2（视频 mp4/mov、音频 mp3、PDF/docx 附件）

---

## 3 · 部署到 Cloudflare Pages（用户手动执行）

### 3.1 推 GitHub

```bash
cd ~/Desktop/web/rain-portfolio
git init && git add . && git commit -m "init rain-portfolio"
gh repo create imgigi/rain-portfolio --public --source=. --remote=origin --push
```

### 3.2 建 KV namespace

```bash
npx wrangler kv namespace create DATA
# 输出类似：{ binding = "DATA", id = "xxxxxxxxxxxxxxxxxxxx" }
# 记下 id，下一步 Dashboard 绑定要用
```

R2 bucket 复用已存在的 `ggjj-assets`（tanyang / vidverian 共用），不需要新建。

### 3.3 建 Pages project 并首次部署

```bash
npx wrangler pages project create rain-portfolio --production-branch main
npx wrangler pages deploy public --project-name rain-portfolio
```

### 3.4 在 Cloudflare Dashboard 绑定 bindings（必需）

Workers & Pages → rain-portfolio → Settings → Functions：

**KV namespace bindings**
- Variable: `DATA` → Namespace: 上一步新建的

**R2 bucket bindings**
- Variable: `IMAGES` → Bucket: `ggjj-assets`

**Environment variables（Production，都要勾 Encrypt）**
- `ADMIN_PASSWORD` = 你的后台密码（换成强密码，不要用 `dev`）
- `SESSION_SECRET` = `openssl rand -hex 32` 生成的随机串

绑完点 Deployments → 最近一次 → **Retry deployment**，让 bindings + 密钥生效。

### 3.5 绑 custom domain

Settings → Custom domains → Set up → 输入 `rain.ggjj.app`。
因为 `ggjj.app` 已托管在 Cloudflare，DNS 会自动配置。

**切换前提**：先在 Vercel Dashboard 把当前 `rain.ggjj.app` 的 domain 移除，或者它会跟 CF 冲突。

### 3.6 灌入初始数据（可选）

KV 首次为空时前台会读 `public/data.initial.json` fallback；但如果你希望直接写入生产 KV（方便后台登录后直接编辑现有结构），跑：

```bash
KV_NAMESPACE_ID=<3.2 步输出的 id> npm run seed
```

带 `--schema` 参数还会把 `public/schema.json` 也写进 KV（schema 也可通过 admin 动态更新）。

---

## 4 · 日常维护

- 改内容 → `/admin` 登录 → 编辑 → 保存（写 KV）
- 改 schema / 代码 → 本地改完 `git push`，CF Pages 自动构建部署
- 加系列、加文章、传视频 / 音频、贴 postimg 链接 —— 全部在 `/admin` 完成

### postimg.cc 图片上传流程（给 Rain 参考）

1. 打开 <https://postimg.cc/>，拖拽图片 → Upload
2. 上传后页面出现多种链接，选 **Direct link**（`https://i.postimg.cc/XXX/yyy.jpg`）
3. 回 `/admin` 的对应字段，粘贴进去

美术系列的 `galleryUrl` 字段支持**批量粘贴多行链接** → 一次性导入整组作品。

---

## 5 · 架构要点 & 排错

- `functions/_shared.js`：cookie 签名 / KV 读写 / 鉴权
- `functions/api/upload.js`：R2 上传，key 以 `rain/` 开头做多站隔离
- `functions/api/image/[[path]].js`：老数据兼容 + 删除接口（只允许删 `rain/` 前缀）
- 图片变换：前端对 `http(s):` 开头的 URL 自动包 `/cdn-cgi/image/width=...`，postimg 图也能享受变换（注意：CF 对非本 zone 源开启 Image Resizing 需要验证 fetch 权限；若 postimg 图首屏未变换只是体积稍大，不影响功能）

### 常见故障

| 症状 | 原因 | 修 |
|---|---|---|
| 登录密码错 | Dashboard 没设 `ADMIN_PASSWORD` 或没 retry deploy | 设完一定要 Retry deployment |
| 前台空白 | `/api/data` 404 / KV binding 未绑 | Settings → Functions → KV bindings |
| 上传 500 | R2 binding 未绑或 bucket 不存在 | 绑 `IMAGES` → `ggjj-assets` |
| 本地图不显示（postimg） | 网络 / postimg 外链挂了 | 刷新；实在不行换图床（后台直接改 URL）|
| 部署后 KV 仍空 | 还没 seed，也没在 admin 保存过 | `/admin` 登录保存一次；或 `npm run seed` |

---

## 6 · 相关项目

- tanyang-portfolio：共用 `ggjj-assets` 桶的摄影作品集（本项目模板来源）
- vidverian：同模板派生，影像作品集
- 部署指南详本：`~/.claude/projects/.../cloudflare_pages_deploy_guide.md`
