# M6 可靠性与回归验收

日期：2026-10-30（wangqingkai/hfut）。所有依赖安装、测试、构建与应用执行均在 Linux 容器内完成。

## 结果

- 前端最终业务代码：M5 容器检查 17 项测试、lint、TypeScript 检查和生产构建通过；M6 未修改前端业务代码，未重复执行相同检查。
- 后端重新执行 `mvn -B verify`：5 项流水线单元测试 + 13 项真实 MySQL 集成测试，失败/错误/跳过均为 0，BUILD SUCCESS。
- `api-check` 真实 Next → Java → MySQL → 文件链条 PASS；观察到三个阶段，覆盖成功、三阶段指定失败、幂等、个人历史、结果内容和跨用户拒绝。
- 强制终止 Java 演练 PASS：在 GENERATE 阶段发送 SIGKILL；重启后任务为 FAILED / PROCESS_INTERRUPTED，ASSET_CHECK 已成功、GENERATE 失败、FINALIZE 没有执行；排队任务恢复并成功；已有成功任务版本和结果字节保持不变。
- 重建 frontend/backend/db 三个容器后再次验证 PASS：任务历史、终态及结果图片仍存在，证明持久化数据不依赖原容器可写层。

## 可复现命令

先启动应用，等待已有任务结束；演练期间不要同时创建其他任务。仅在独立演示环境执行：

```sh
docker compose --profile checks run --rm api-check
docker compose --profile checks run --rm --no-deps api-check node tools/verify-restart.mjs prepare > docs/restart.runtime.json
docker compose kill -s SIGKILL backend
docker compose up -d --wait backend
docker compose --profile checks run --rm --no-deps api-check node tools/verify-restart.mjs verify
docker compose up -d --force-recreate --wait
docker compose --profile checks run --rm --no-deps api-check node tools/verify-restart.mjs verify
```

`prepare` 在 Alice 下创建成功/长耗时/排队任务并只输出非敏感任务标识；会话令牌只留在进程内存。`verify` 重新登录 Alice。运行时 fixture 已忽略，不进入源码包。脚本不会删除原记录。

## 配置与 CI

- `compose.yaml`：前端默认仅绑定 127.0.0.1；Java/MySQL 无宿主机端口；会话 TTL、Next 构建期 Java 转发地址可通过 `.env` 配置；Java 堆上限 512 MiB、两逻辑 CPU 视图。
- `test-db` 独立 tmpfs 测试数据库；检查结束后停止，不操作演示数据库。
- GitHub Actions 在 push/PR 执行前端 lint/typecheck/test/build、Java test/build，并新增完整集成链条及 SIGKILL 演练 job。
- 本地等价容器命令已执行通过；没有远程仓库，因此 GitHub Actions 本身尚未远程触发，保留为未验证项。

## 边界

进程中断收敛不等于从阶段中间继续生成：RUNNING 会失败，QUEUED 才继续执行。仅支持一个 Java 工作器实例，不支持多副本并行调度。没有真实 AI、外部通知、对象存储或消息队列依赖。历史不分页，未提交上传不自动清理。

记录的 Agent 会话约 11:26～11:30，包含容器启动及等待；非用户人工工时。
