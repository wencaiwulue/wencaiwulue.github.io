## 背景

因为业务需要，temporal 需要支持多数据源，例如 oceanbase-ce

## 过程

### 克隆项目

```shell
temporal
```

### 本地启动 oceanbase-ce

```shell
docker run -p 2881:2881 --name oceanbase-ce -e OB_TENANT_NAME=temporal -e OB_TENANT_PASSWORD=temporal -e OB_SYS_PASSWORD=temporal -d oceanbase/oceanbase-ce:4.3.5-lts
```

### 使用 Jetbrains Datagrip 链接

用户名和一般的 MySQL 不同，是`角色@用户名`

- 用户名：`root@temporal`
- 密码：`temporal`
- 端口号：`2881`

### 本地初始化 temporal 数据库

```shell
SQL_USER=root@temporal SQL_PASSWORD=temporal SQL_PORT=2881 make install-schema-mysql
```

#### 1. 数据库报错 build multivalue index afterward not supported

```text
2025-05-15T11:33:03.232+0800    DEBUG   CREATE INDEX by_temporal_change_version ON executions_visibility (namespace_id, (CAST(TemporalChangeVersion AS CHAR(255) ARRAY)), (COALESCE(close_time, CAST('9999-12-31 23:59:59' AS DATETIME))) DESC, start_time DESC, run_id);        {"logging-call-at": "/Users/bytedance/GolandProjects/temporal/tools/common/schema/updatetask.go:135"}
2025-05-15T11:33:03.236+0800    ERROR   Unable to update SQL schema.    {"error": "error executing statement: Error 1235 (0A000): build multivalue index afterward not supported\n[192.168.215.4:2882] [2025-05-15 03:33:03.234388] [YB42C0A8D704-0006352398C92C2B-0-0]", "logging-call-at": "/Users/bytedance/GolandProjects/temporal/tools/sql/handler.go:53"}
make: *** [install-schema-mysql8] Error 1
```

```sql
CREATE INDEX by_temporal_change_version ON executions_visibility (
                                                                  namespace_id,
    ( CAST (TemporalChangeVersion AS CHAR (255) ARRAY)),
    ( COALESCE (close_time, CAST ('9999-12-31 23:59:59' AS DATETIME))) DESC,
                                                                  start_time DESC,
                                                                  run_id
    );
```

解决：移动到建表语句中。

[仅支持建表时创建多值索引](https://www.oceanbase.com/knowledge-base/oceanbase-database-1000000002342355#:~:text=%E7%9B%AE%E5%89%8D%E4%BB%85%E6%94%AF%E6%8C%81%E5%9C%A8%E5%BB%BA%E8%A1%A8%E7%9A%84%E5%90%8C%E6%97%B6%E5%88%9B%E5%BB%BAJSON%E5%A4%9A%E5%80%BC%E7%B4%A2%E5%BC%95%EF%BC%8C%E4%B8%8D%E6%94%AF%E6%8C%81%E5%90%8E%E5%BB%BA%E5%A4%9A%E5%80%BC%E7%B4%A2%E5%BC%95%E3%80%82)

- 简单介绍一下多值索引

多值索引是在存储值数组的列上定义的二级索引。“普通”索引对每个数据记录有一个索引记录（1:1）。对于单个数据记录（N:1），
多值索引可以有多个索引记录。多值索引旨在为JSON数组建立索引。

例如，在以下JSON文档中的邮政编码数组上定义的多值索引会为每个邮政编码创建一个索引记录，每个索引记录都引用同一数据记录。

多值索引可以在CREATE TABLE、ALTER TABLE或CREATE INDEX语句中创建多值索引。这要求使用CAST(… AS … ARRAY)
索引定义，该定义将JSON数组中相同类型的标量值转换为SQL数据类型数组。然后，使用SQL数据类型数组中的值透明地生成一个虚拟列。最后，在虚拟列上创建一个功能索引（也称为虚拟索引）。是在SQL数据类型数组的值的虚拟列上定义的功能索引，该索引构成了多值索引。

```sql
INSERT INTO customers
VALUES (NULL, NOW(), '{"user":"Jack","user_id":37,"zipcode":[94582,94536]}'),
       (NULL, NOW(), '{"user":"Jill","user_id":22,"zipcode":[94568,94507,94582]}'),
       (NULL, NOW(), '{"user":"Bob","user_id":31,"zipcode":[94477,94507]}'),
       (NULL, NOW(), '{"user":"Mary","user_id":72,"zipcode":[94536]}'),
       (NULL, NOW(), '{"user":"Ted","user_id":56,"zipcode":[94507,94582]}');
```

#### 2. 数据库报错 Generated column in column expression' is not supported for generated columns

https://www.oceanbase.com/knowledge-base/oceanbase-database-1000000002342355

```text
2025-05-15T16:01:28.273+0800    DEBUG   CREATE TABLE executions_visibility ( namespace_id CHAR(64) NOT NULL, run_id CHAR(64) NOT NULL, _version BIGINT NOT NULL DEFAULT 0, start_time DATETIME(6) NOT NULL, execution_time DATETIME(6) NOT NULL, workflow_id VARCHAR(255) NOT NULL, workflow_type_name VARCHAR(255) NOT NULL, status INT NOT NULL, close_time DATETIME(6) NULL, history_length BIGINT NULL, history_size_bytes BIGINT NULL, execution_duration BIGINT NULL, state_transition_count BIGINT NULL, memo BLOB NULL, encoding VARCHAR(64) NOT NULL, task_queue VARCHAR(255) NOT NULL DEFAULT '', search_attributes JSON NULL, parent_workflow_id VARCHAR(255) NULL, parent_run_id VARCHAR(255) NULL, root_workflow_id VARCHAR(255) NOT NULL DEFAULT '', root_run_id VARCHAR(255) NOT NULL DEFAULT '', TemporalChangeVersion JSON GENERATED ALWAYS AS (search_attributes->"$.TemporalChangeVersion") STORED, BinaryChecksums JSON GENERATED ALWAYS AS (search_attributes->"$.BinaryChecksums") STORED, BatcherUser VARCHAR(255) GENERATED ALWAYS AS (search_attributes->>"$.BatcherUser") STORED, TemporalScheduledStartTime DATETIME(6) GENERATED ALWAYS AS ( CONVERT_TZ( REGEXP_REPLACE(search_attributes->>"$.TemporalScheduledStartTime", 'Z|[+-][0-9]{2}:[0-9]{2}$', ''), SUBSTR(REPLACE(search_attributes->>"$.TemporalScheduledStartTime", 'Z', '+00:00'), -6, 6), '+00:00' ) ) STORED, TemporalScheduledById VARCHAR(255) GENERATED ALWAYS AS (search_attributes->>"$.TemporalScheduledById") STORED, TemporalSchedulePaused BOOLEAN GENERATED ALWAYS AS (search_attributes->"$.TemporalSchedulePaused") STORED, TemporalNamespaceDivision VARCHAR(255) GENERATED ALWAYS AS (search_attributes->>"$.TemporalNamespaceDivision") STORED, BuildIds JSON GENERATED ALWAYS AS (search_attributes->"$.BuildIds") STORED, TemporalPauseInfo JSON GENERATED ALWAYS AS (search_attributes->"$.TemporalPauseInfo") STORED, TemporalWorkerDeploymentVersion VARCHAR(255) GENERATED ALWAYS AS (search_attributes->>"$.TemporalWorkerDeploymentVersion") STORED, TemporalWorkflowVersioningBehavior VARCHAR(255) GENERATED ALWAYS AS (search_attributes->>"$.TemporalWorkflowVersioningBehavior") STORED, TemporalWorkerDeployment VARCHAR(255) GENERATED ALWAYS AS (search_attributes->>"$.TemporalWorkerDeployment") STORED, PRIMARY KEY (namespace_id, run_id), INDEX by_temporal_change_version (namespace_id, (CAST(TemporalChangeVersion AS CHAR(255) ARRAY)), (COALESCE(close_time, CAST('9999-12-31 23:59:59' AS DATETIME))) DESC, start_time DESC, run_id), INDEX by_binary_checksums (namespace_id, (CAST(BinaryChecksums AS CHAR(255) ARRAY)), (COALESCE(close_time, CAST('9999-12-31 23:59:59' AS DATETIME))) DESC, start_time DESC, run_id), INDEX by_build_ids (namespace_id, (CAST(BuildIds AS CHAR(255) ARRAY)), (COALESCE(close_time, CAST('9999-12-31 23:59:59' AS DATETIME))) DESC, start_time DESC, run_id), INDEX by_temporal_pause_info (namespace_id, (CAST(TemporalPauseInfo AS CHAR(255) ARRAY)), (COALESCE(close_time, CAST('9999-12-31 23:59:59' AS DATETIME))) DESC, start_time DESC, run_id) ); {"logging-call-at": "/Users/bytedance/GolandProjects/temporal/tools/common/schema/setuptask.go:80"}
2025-05-15T16:01:28.277+0800    ERROR   Unable to setup SQL schema.     {"error": "Error 3106 (HY000): 'Generated column in column expression' is not supported for generated columns.\n[192.168.215.4:2882] [2025-05-15 08:01:28.277777] [YB42C0A8D704-00063527DD8ADB79-0-0]", "logging-call-at": "/Users/bytedance/GolandProjects/temporal/tools/sql/handler.go:32"}
```

#### 3. 数据库报错  hash map/ set entry exist

```text
[HY000][4200] hash map/ set entry exist [192.168.215.4:2882] [2025-05-15 08:21:44.973747] [YB42C0A8D704-00063527E03AFEA2-0-0]
```

最终解决方法：将不支持的操作的index全部删除。

终于可以通过了

### 本地启动 temporal server

```shell
go run cmd/server/main.go --env development-mysql8 --allow-no-auth start
```

### 启动 temporal ui

```shell
docker run -p 8080:8080 --name temporalio-ui -e TEMPORAL_ADDRESS=127.0.0.1:7233 --net host -d temporalio/ui
```

### 打开网页

[http://localhost:8080/namespaces/temporal-system/workflows](http://localhost:8080/namespaces/temporal-system/workflows)