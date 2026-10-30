# M7 交付验收记录

日期：2026-10-30（Asia/Shanghai）。

## 干净源码复现

以 M6 commit `b14df95` 的 `git archive` 展开到忽略目录 `delivery/preflight/`，无 `.git`、`.env`、node_modules、target、.next 或原有上传文件。最后交付版本相对此基线仅修改说明文档，不改变该次验收的业务源码、依赖、镜像配置或脚本。

使用独立项目名 `yingzuo-acceptance-20261030`、端口 3001、全新的 MySQL 和文件卷，在归档目录中按顺序执行：

```sh
docker compose -p yingzuo-acceptance-20261030 build backend
docker compose -p yingzuo-acceptance-20261030 build frontend
docker compose -p yingzuo-acceptance-20261030 up -d --wait
docker compose -p yingzuo-acceptance-20261030 --profile checks run --rm api-check
```

本次用进程环境变量 `WEB_PORT=3001` 避免与主环境冲突；未复制宿主机凭据。构建使用 Docker 依赖缓存，不代表无网络、全冷缓存的离线安装验收。

结果：两个镜像构建成功，三服务 healthy；日志确认空库成功执行 4 个 Flyway 迁移；API 链条 PASS，实际观察到 ASSET_CHECK / GENERATE / FINALIZE，并验证成功结果、指定三阶段失败中断、幂等、历史与跨用户拒绝。

验收完成后只清理该独立测试项目及其新建的测试卷，主环境 `yingzuo` 数据卷保留。主环境重新启动，继续使用 3000 端口。

## 交付文件

- `README.md`：改为实际运行入口，保留技术取舍、接口、身份、异步状态、演示、模块计划、测试、限制、投入和来源。
- `docs/DEPLOYMENT.md`：首次部署、配套数据备份、镜像升级/回滚与数据库兼容边界。没有声称生产备份恢复或不兼容迁移回滚已演练。
- `delivery/yingzuo-source-20261030.zip`：由最终 Git commit 归档，附 ACCEPTANCE.txt，记录完整 commit、验收标记及验证范围。
- `delivery/ACCEPTANCE.txt`、`delivery/SHA256SUMS.txt`：源码版本和归档校验信息；交付目录被 Git 忽略。
- 验收标记为 `acceptance-20261030-v1`，完整 commit 可从交付说明读取，或在本地仓库执行 `git rev-parse acceptance-20261030-v1`。

源码包包含前后端完整源码、锁文件、数据库结构和种子、示例素材、Compose/Dockerfile、非敏感配置及 CI。排除依赖、缓存、构建结果、日志、会话令牌、实际 `.env`、上传数据和数据库卷。

## 仍需用户完成 / 未验证项

- README 的 AI 工作流按约定由用户填写，最终对外提交前补齐。
- 没有配置远程仓库，没有远程运行 GitHub Actions；本地等价检查通过不替代远程运行记录。
- 没有公网部署，不要求公网地址。实际应用边界和工具链提示见 README。

可确认的本次工具/文件记录覆盖约 11:14～11:40，更早的引擎启动未单独统计，打包另有少量收尾时间；Agent 会话包括生成、构建和等待，不是用户人工工时。

## 远程交付补记

用户提供仓库并明确授权后，项目推送至 `https://github.com/xiaoxiaokai12138/xiaoyingkeji_task` 的 `master` 分支，同时同步 v1 验收标记。当前 v2 仅更新 README 的仓库地址、CI 状态说明和本补记，未修改业务源码、配置或测试；源码包及验收标记同步更新，v1 历史保留。

GitHub 未认证 API 核查遇到限流，尚未确认远程 CI 结果，不据此推断成功或失败；请查看仓库 Actions 页面。此前“没有远程仓库”等文字是初次本地交付时点记录，以本补记为准。
