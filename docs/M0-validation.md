# M0 验证记录

日期：2026-10-29（Asia/Shanghai）。模块状态：本地容器验收通过，约 20:30 完成。

## 修改范围

- 根目录：README.md、EADME.md、.gitignore、.gitattributes、.env.example、compose.yaml。
- 前端：package.json/锁文件、TypeScript/ESLint/Vitest 配置、基础页面、HTTP 请求封装与测试、多阶段 Dockerfile。
- 后端：pom.xml、应用入口、system 接口、数据源/Flyway/健康配置、基础迁移、MySQL 集成测试、多阶段 Dockerfile、Maven Wrapper。
- CI：.github/workflows/ci.yml，push/pull_request 触发，使用容器检查前后端。

## 已知方案调整

- 正式文档提前迁移至 README.md，EADME.md 保留跳转。
- React 使用 19.3.1，与 Next.js 16.4.3 peer 范围匹配；TypeScript 保持原定 5.9.3，避免顺带升级至 7.x。
- Java 使用 Spring Boot 3.5.16 + MyBatis Starter 3.0.5，不跟随各自 latest 跨大版本升级。
- 演示 Compose 提供明确的本地占位密码，使 `docker compose up --build` 无配置也能启动；真实环境通过未提交的 .env 覆盖。
- Node/MySQL/Maven/JRE 基础镜像固定 digest，避免标签漂移。

## 环境

宿主机：Windows / Docker Desktop 4.45.0 / Engine 28.3.3 / Compose 2.39.2。
宿主机 Java 11 不用于项目构建；项目安装、测试和构建在 Linux 容器运行。
Docker Desktop 最初未启动，现已启动就绪；未更改其他项目容器、数据库或全局 Docker 配置。

## 待完成的验证

- [x] docker compose config --quiet。
- [x] 容器生成 npm 锁文件（严格 peer 检查通过）和 Maven Wrapper；容器内 `sh ./mvnw -version` 确认为 Maven 3.9.11 / Temurin 21.0.9+10。
- [x] 前端 lint、类型检查、4 个 HTTP 边界测试、生产构建：`docker compose --profile checks run --rm frontend-check`，配置修正后再次通过，退出码 0。
- [x] Java/MySQL 集成测试、verify 与打包：1 测试，0 失败、0 错误、0 跳过；退出码 0。
- [x] Compose 正式服务启动、健康检查、/api/system 同源转发：首页 200，system 返回 ready，db/backend/frontend 均 healthy。

未通过的检查不能按已完成报告。GitHub Actions 配置可在本地验证等价命令，但尚未上传仓库，不声称线上 CI 已运行。
## 依赖兼容性修正

初次解析发现 eslint-plugin-react、eslint-plugin-import、jsx-a11y 的 peer 范围尚不接受 ESLint 10。将 ESLint 从 10.13.0 调整为 9.39.5，并在 .npmrc 启用 strict-peer-deps=true；后续安装不允许静默覆盖 peer 冲突。

Maven Wrapper 生成时曾遇到 PowerShell 对未加引号的 -D 参数拆分，已修正分发 URL 并通过容器内版本检查；此项不是应用测试结果。ESLint 9.39.5 已停止上游支持，但当前 Next 配套插件 peer 兼容上限仍为 9；本题暂优先确保工具链兼容，后续随插件支持升级。

2026-10-29 20:20（北京时间）：前端检查及生产镜像构建通过。Vitest 配置改为 .mts，消除 CommonJS/ESM 配置提示；tsconfig 显式包含 Next 开发类型目录。

后端首次 go-offline 因上游 POM 多仓库回退而耗时较长，已取消并加入 .mvn/settings.xml 统一 Central、.mvn/maven.config 及 Docker BuildKit 依赖缓存，重新构建验证中。

最终结果：M0 验收通过。Java 测试数据库 material_test 与演示数据库 material_studio 隔离。保留 Flyway 11.7.2 对 MySQL 8.4 的已测试范围提示及 Mockito 在 Java 21 的动态 agent 提示；测试未失败，未抑制这些提示。上游问题及限制已写入 README。
