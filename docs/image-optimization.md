# 图片加载

图片由 Astro 的 Sharp 服务在构建时生成 WebP（quality 82），浏览器根据 `srcset`、`sizes` 和设备像素比选择尺寸。原始上传文件保留，后台仍使用原路径；保存上传后需重新构建、部署才能更新线上图片。

- `ImageWrapper.astro` 导入 public 中的 PNG/JPEG/WebP/AVIF 图片元数据，按调用位置生成不同宽度，不放大超过原始宽度。
- 头图使用全屏尺寸、立即加载和高优先级；列表封面使用懒加载；文章详情封面立即加载。
- 头像生成 192–768px 候选；项目/文章列表封面生成 320–1200px 候选；文章详情封面最多 1920px。
- 音乐封面生成 160px WebP。
- 宽高属性保留比例；文章大图查看器按需读取原图。
- 外链、SVG、GIF 等未纳入此转换的资源沿用原地址。当前文章正文没有内嵌图片；以后正文中的 public 图片需另行接入，不能假定 Markdown 原生 img 会经过 ImageWrapper。

维护时调整组件的 `sizes` 以匹配实际布局；不要只增加 srcset 宽度而忽略 sizes。WebP 为有损压缩，截图小字或细节不足时可提高 quality。生成资源使用 Astro 的带哈希文件名，内容变化后地址变化。

验证：`node node_modules/astro/astro.js check` 和 `node node_modules/astro/astro.js build`。Windows 的 Vercel 函数打包可能因 symlink 权限报 EPERM；这与静态图片生成是否成功应分别判断。
