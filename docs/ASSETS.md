# 素材来源

`backend/src/main/resources/demo/*.svg` 为本项目编写的原创矢量演示插画，通过 SVG 几何图形、颜色及纹理表达六个模板主题，可随本项目源码分发；未使用参考截图中的照片或账户信息，也不依赖远程图片服务。

模板元数据通过 Flyway V2 种子写入 MySQL，Java 从 MySQL 查询，封面由 Java 读取仓库内 SVG 文件并提供 HTTP 响应。SVG 封面不是用户上传格式；上传约束仍为 JPEG/PNG。

`demo-inputs/sample-1.png`、`sample-2.png`、`sample-1.jpg` 为 `tools/GenerateDemoImages.java` 使用 Java Graphics2D 生成的原创几何风景测试图，供上传演示，可随源码分发。生成工具已在 Java 21 容器执行，验收运行不需要重新生成，也不依赖图形桌面或外部素材。
