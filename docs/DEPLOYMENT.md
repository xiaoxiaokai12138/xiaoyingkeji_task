# 容器部署、备份与回滚

本项目交付的是本地单实例演示环境，不要求公网部署。以下标准命令在源码根目录执行，Compose 项目名为 `yingzuo`。不在宿主机安装或运行项目的 npm/Maven 脚本。

## 首次部署

1. 启动 Docker Desktop 的 Linux 容器引擎，确认 `docker compose version` 可用。
2. 复制 `.env.example` 为 `.env`，按需设置本地密码和未占用的端口。默认可以直接使用明显的本地演示占位值；`.env` 不提交。
3. 执行 `docker compose config --quiet` 检查配置。配置解析通过后执行 `docker compose up --build -d --wait`。低内存机器可先依次 `docker compose build backend`、`docker compose build frontend`，再 `docker compose up -d --wait`。
4. `docker compose ps` 应显示三服务 healthy，访问配置端口的首页；选择演示账户、上传示例、提交并预览成功结果。
5. 执行 `docker compose --profile checks run --rm api-check` 验证真实链条。该命令会给 Alice 增加演示记录。

数据库无需宿主机端口；Flyway 首次自动迁移和初始化 3 分类/6 模板/2 用户，后续重启不会重复造数。示例素材随仓库提供。部署 HTTPS 代理时使用 `SESSION_COOKIE_SECURE=true`；`DEMO_MODE=false` 只关闭演示入口，不会增加生产认证功能。

诊断：`docker compose logs --tail=100 backend frontend db`。端口占用修改 `WEB_PORT`；拉取依赖失败检查网络；已有卷密码与新配置不符时恢复匹配配置，不要通过删除数据卷解决。改变 `JAVA_API_ORIGIN` 必须重建前端镜像。

## 升级前备份

先等待所有任务结束，再停止前端，防止新的上传/提交。备份放入已被 Git 忽略的 `delivery/` 目录；目录需自行创建（PowerShell：`New-Item -ItemType Directory -Force delivery`）。

```sh
docker compose stop frontend
docker compose exec -T backend tar -C /app/data -cf /tmp/yingzuo-assets.tar .
docker compose cp backend:/tmp/yingzuo-assets.tar delivery/assets.tar
docker compose stop backend
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE" > /tmp/yingzuo.sql'
docker compose cp db:/tmp/yingzuo.sql delivery/database.sql
docker image tag yingzuo-backend:latest yingzuo-backend:previous
docker image tag yingzuo-frontend:latest yingzuo-frontend:previous
```

密码仅在数据库容器内由环境读取，不写进命令参数字面值或输出。数据库 SQL 和文件归档必须作为一组保留；备份期间禁止应用写入。上面是手动基本方案，没有自动备份调度。备份包含演示用户数据，勿作为源码材料提交。

## 更新应用

保留旧源码版本标识、`.env`、镜像和配套数据备份后，取得新源码，并按顺序：

```sh
docker compose build backend
docker compose build frontend
docker compose up -d --no-build --wait
docker compose --profile checks run --rm api-check
```

读取迁移日志及健康状态，手动确认身份、上传、制作和历史。已经执行的 Flyway 脚本不能改写；新增结构用新迁移。不要在升级命令中加入 `down --volumes`。

## 回滚应用

若新版本没有不兼容的数据库/配置变化，可将旧镜像恢复为标准服务使用的标签，再重建容器：

```sh
docker compose stop frontend backend
docker image tag yingzuo-backend:previous yingzuo-backend:latest
docker image tag yingzuo-frontend:previous yingzuo-frontend:latest
docker compose up -d --no-build --force-recreate --wait
```

同时恢复与旧镜像匹配的 `.env`，重新验证健康和既有记录。此处标签对应默认 Compose 项目名；自定义 `-p` 时应替换为实际镜像名。

如果迁移不向后兼容，仅恢复镜像不足以完成回滚：保持应用停止，在独立恢复环境中导入同一时点 SQL、恢复文件归档，确认数据完整后切换。不要直接逆向修改已执行迁移，也不要将删除卷视为回滚。当前项目没有自动数据库降级脚本。

## 已演练范围

- 原环境构建/启动、三服务健康、重建容器保留数据库和文件已验证。
- SIGKILL 后 RUNNING 失败、QUEUED 恢复及终态/结果稳定已验证。
- 从干净源码归档构建、空数据库迁移与完整业务链条的结果记录在 M7 验证文件。
- 没有生产发布、真实生产备份恢复或不兼容结构迁移的回滚演练；上面的备份/回滚是可审查的基本操作说明，不将其写成生产演练完成。
