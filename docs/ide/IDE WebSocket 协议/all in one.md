# 获取目录

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值                  | 描述              |
|------|--------|------|----------------------|-----------------|
| Head | String | 是    | stat                 | 类型，获取目录为 "stat" |
| Data | String | 是    | /home/fengcaiwen/lab | 要查询的路径，绝对路径     |

### 返回数据

| 名称   | 类型     | 示例值  | 描述                      |
|------|--------|------|-------------------------|
| Head | String | stat | 类型，获取目录为 "stat"         |
| Data | Struct | -    | 具体请参见下表结构体 **StatResp** |

### 结构体 StatResp

| 名称       | 类型              | 示例值              | 描述                      |
|----------|-----------------|------------------|-------------------------|
| Id       | String          | 456AFAA7         | 文件 id                   |
| Name     | String          | fengcaiwen       | 文件名称                    |
| IsDir    | Boolean         | true             | 是否是目录                   |
| Path     | String          | /home/fengcaiwen | 绝对路径                    |
| Children | Array of Struct | -                | 具体请参见下表结构体 **Children** |

### Children

| 名称    | 类型      | 示例值       | 描述    |
|-------|---------|-----------|-------|
| Id    | String  | 583D370F  | 文件ID  |
| Name  | String  | test.yaml | 文件名称  |
| IsDir | Boolean | false     | 是否是目录 |

### 请求示例

```json
{
  "Head": "stat",
  "Data": "/home/fengcaiwen/lab"
}
```

### 返回示例

保留

```json
{
  "Head": "reports",
  "Data": null
}
```

```json
{
  "Head": "stat",
  "Data": {
    "Id": "456AFAA7",
    "Name": "fengcaiwen",
    "IsDir": true,
    "Path": "/home/fengcaiwen",
    "Children": [
      {
        "Id": "583D370F",
        "Name": "ace",
        "IsDir": true
      },
      {
        "Id": "71555C6",
        "Name": "bioos",
        "IsDir": true
      },
      {
        "Id": "9B7BCEAB",
        "Name": "LICENSE",
        "IsDir": false
      },
      {
        "Id": "74AC66D5",
        "Name": "README.md",
        "IsDir": false
      },
      {
        "Id": "AA3FB16",
        "Name": "deploy.yaml",
        "IsDir": false
      }
    ]
  }
}
```

# 文件删除

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值    | 描述                             |
|------|--------|------|--------|--------------------------------|
| Head | String | 是    | delete | 类型，删除为 "delete"                |
| Data | Struct | 是    | -      | 具体请参见下表结构体 **DeleteReqStruct** |

### 结构体 DeleteReqStruct

| 名称  | 类型     | 示例值      | 描述   |
|-----|--------|----------|------|
| Id  | String | C82C4F32 | 文件id |

### 返回数据

| 名称   | 类型     | 示例值    | 描述                              |
|------|--------|--------|---------------------------------|
| Head | String | delete | 类型，删除为 "delete"                 |
| Data | Struct | -      | 具体请参见下表结构体 **DeleteRespStruct** |

### 结构体 DeleteRespStruct

| 名称   | 类型      | 示例值        | 描述   |
|------|---------|------------|------|
| Id   | String  | stat       | 文件id |
| User | String  | fengcaiwen | 用户名称 |

### 请求示例

```json
{
  "Head": "delete",
  "Data": {
    "Id": "C82C4F32"
  }
}
```

### 返回示例

```json
{
  "Head": "delete",
  "Data": {
    "Id": "C82C4F32",
    "User": "E165B965"
  }
}
```

# 文件保存

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值     | 描述                              |
|------|--------|------|---------|---------------------------------|
| Head | String | 是    | publish | 类型，保存为 "publish"                |
| Data | Struct | 是    | -       | 具体请参见下表结构体 **PublishReqStruct** |

### 结构体 PublishReqStruct

| 名称  | 类型     | 示例值      | 描述   |
|-----|--------|----------|------|
| Id  | String | C82C4F32 | 文件id |

### 返回数据

| 名称   | 类型     | 示例值  | 描述                               |
|------|--------|------|----------------------------------|
| Head | String | stat | 类型，保存为 "publish"                 |
| Data | Struct | -    | 具体请参见下表结构体 **PublishRespStruct** |

### 结构体 PublishRespStruct

| 名称   | 类型      | 示例值        | 描述   |
|------|---------|------------|------|
| Id   | String  | stat       | 文件id |
| Rev  | Integer | 323        | TODO |
| User | String  | fengcaiwen | 用户名称 |

### 请求示例

```json
{
  "Head": "publish",
  "Data": {
    "Id": "C82C4F32"
  }
}
```

### 返回示例

```json
{
  "Head": "publish",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 323,
    "User": "E165B965"
  }
}
```

### 报错示例

```json
{
  "Head": "stat.err",
  "Data": {
    "Id": "F9ED7B40",
    "Name": "/Users/bytedance/GolandProjects/lab/golab\\",
    "IsDir": false,
    "Path": "/Users/bytedance/GolandProjects/lab/golab\\",
    "Error": "not found"
  }
}

```
# 文件-搜索

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值    | 描述              |
|------|--------|------|--------|-----------------|
| Head | String | 是    | search | 类型，搜索为 "search" |
| Data | String | 是    | abc    | 要查询的关键字         |

### 返回数据

| 名称   | 类型     | 示例值    | 描述                        |
|------|--------|--------|---------------------------|
| Head | String | search | 类型，获取目录为 "search"         |
| Data | Struct | -      | 具体请参见下表结构体 **SearchResp** |

### 结构体 StatResp

| 名称       | 类型              | 示例值              | 描述                      |
|----------|-----------------|------------------|-------------------------|
| Id       | String          | 456AFAA7         | 文件 id                   |
| Name     | String          | fengcaiwen       | 文件名称                    |
| IsDir    | Boolean         | true             | 是否是目录                   |
| Path     | String          | /home/fengcaiwen | 绝对路径                    |

### 请求示例

```json
{
  "Head": "search",
  "Data": "deploy"
}
```

### 返回示例

```json
{
  "Head": "search",
  "Data": [
    {
      "Id": "583D370F",
      "Name": "deployment",
      "IsDir": true,
      "Path": "/home/fengcaiwen"
    },
    {
      "Id": "AA3FB16",
      "Name": "deploy.yaml",
      "IsDir": false,
      "Path": "/home/fengcaiwen/deployment"
    }
  ]
}
```
# 文件新增

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值    | 描述                             |
|------|--------|------|--------|--------------------------------|
| Head | String | 是    | create | 类型，新建为 "create"                |
| Data | Struct | 是    | -      | 具体请参见下表结构体 **CreateReqStruct** |

### 结构体 CreateReqStruct

| 名称    | 类型      | 示例值       | 描述           |
|-------|---------|-----------|--------------|
| Name  | String  | test.yaml | 文件/文件夹名称，全路径 |
| IsDir | Boolean | true      | 是否是目录        |

### 返回数据

| 名称   | 类型     | 示例值    | 描述                              |
|------|--------|--------|---------------------------------|
| Head | String | create | 类型，新建为 "create"                 |
| Data | Struct | -      | 具体请参见下表结构体 **CreateRespStruct** |

### 结构体 CreateRespStruct

| 名称   | 类型     | 示例值      | 描述   |
|------|--------|----------|------|
| Id   | String | stat     | 文件id |
| User | String | E165B965 | 用户名称 |

### 请求示例

```json
{
  "Head": "create",
  "Data": {
    "Name": "test.yaml",
    "IsDir": false
  }
}
```

### 返回示例

```json
{
  "Head": "create",
  "Data": {
    "Id": "C82C4F32",
    "Name": "test.yaml",
    "IsDir": false,
    "User": "E165B965"
  }
}
```
# 文件编辑-删除

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值    | 描述                             |
|------|--------|------|--------|--------------------------------|
| Head | String | 是    | revise | 类型，更新为 "revise"                |
| Data | Struct | 是    | -      | 具体请参见下表结构体 **ReviseReqStruct** |

#### 结构体 ReviseReqStruct

| 名称  | 类型      | 示例值                  | 描述             |
|-----|---------|----------------------|----------------|
| Id  | String  | 456AFAA7             | 文件 id          |
| Rev | Integer | 25                   | 第多少次修改         |
| Ops | Array   | [71,-8,6] 或者 [71,-8] | 在第71个字符处删除8个字符 |

### 返回数据

| 名称   | 类型     | 示例值    | 描述                              |
|------|--------|--------|---------------------------------|
| Head | String | revise | 类型，获取目录为 "revise"               |
| Data | Struct | -      | 具体请参见下表结构体 **ReviseRespStruct** |

#### 结构体 ReviseRespStruct

| 名称   | 类型      | 示例值                  | 描述             |
|------|---------|----------------------|----------------|
| Id   | String  | 456AFAA7             | 文件 id          |
| Rev  | Integer | 25                   | 第几次修改          |
| Ops  | Array   | [71,-8,6] 或者 [71,-8] | 在第71个字符处删除8个字符 |
| User | String  | fengcaiwen           | 用户名称           |

### 请求示例

```json
{
  "Head": "revise",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 0,
    "Ops": [
      109,
      -2
    ]
  }
}
```

### 返回示例

```json
{
  "Head": "revise",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 1,
    "Ops": [
      109,
      -2
    ],
    "User": "B4FAA6E2"
  }
}
```
# 文件编辑-新增

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值    | 描述                             |
|------|--------|------|--------|--------------------------------|
| Head | String | 是    | revise | 类型，更新为 "revise"                |
| Data | Struct | 是    | -      | 具体请参见下表结构体 **ReviseReqStruct** |

#### 结构体 ReviseReqStruct

| 名称  | 类型      | 示例值                     | 描述              |
|-----|---------|-------------------------|-----------------|
| Id  | String  | 456AFAA7                | 文件 id           |
| Rev | Integer | 25                      | 第多少次修改          |
| Ops | Array   | [14,"a",11] 或者 [14,"a"] | 在第14个字符处写入字符"a" |

### 返回数据

| 名称   | 类型     | 示例值    | 描述                             |
|------|--------|--------|--------------------------------|
| Head | String | revise | 类型，获取目录为 "revise"              |
| Data | Struct | -      | 具体请参见下表结构体 **ReviseReqStruct** |

#### 结构体 ReviseReqStruct

| 名称   | 类型      | 示例值        | 描述    |
|------|---------|------------|-------|
| Id   | String  | 456AFAA7   | 文件 id |
| Rev  | Integer | 25         | TODO  |
| Ops  | Boolean | true       | TODO  |
| User | String  | fengcaiwen | 用户名称  |

### 请求示例

```json
{
  "Head": "revise",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 26,
    "Ops": [
      16,
      "\n",
      2
    ]
  }
}
```

### 返回示例

```json
{
  "Head": "revise",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 27,
    "Ops": [
      16,
      "\n",
      2
    ],
    "User": "B4FAA6E2"
  }
}
```

### 报错

```json
{
  "Head": "revise.err",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 323,
    "Ops": [
      119,
      "\n",
      1
    ],
    "User": "A65C39BF",
    "Err": {}
  }
}
```
# 获取单个文件详情

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值                  | 描述              |
|------|--------|------|----------------------|-----------------|
| Head | String | 是    | stat                 | 类型，获取目录为 "stat" |
| Data | String | 是    | /home/fengcaiwen/lab | 要查询的路径，绝对路径     |

### 返回数据

| 名称   | 类型     | 示例值  | 描述                            |
|------|--------|------|-------------------------------|
| Head | String | stat | 类型，获取目录为 "stat"               |
| Data | Struct | -    | 具体请参见下表结构体 **StatRespResult** |

### 结构体 StatRespResult

| 名称       | 类型              | 示例值              | 描述                      |
|----------|-----------------|------------------|-------------------------|
| Id       | String          | 456AFAA7         | 文件 id                   |
| Name     | String          | fengcaiwen       | 文件名称                    |
| IsDir    | Boolean         | true             | 是否是目录                   |
| Path     | String          | /home/fengcaiwen | 绝对路径                    |

### 请求示例

```json
{
  "Head": "stat",
  "Data": "/home/fengcaiwen/lab/test.go"
}
```

### 返回示例

```json
{
  "Head": "stat",
  "Data": {
    "Id": "C82C4F32",
    "Name": "test.go",
    "IsDir": false,
    "Path": "/home/fengcaiwen/lab/test.go"
  }
}
```
# 订阅单个文件

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值       | 描述                          |
|------|--------|------|-----------|-----------------------------|
| Head | String | 是    | subscribe | 类型，订阅文件为 "subscribe"        |
| Data | Struct | 是    | -         | 具体请参见下表结构体 **SubscribeReq** |

### 结构体 SubscribeReq

| 名称       | 类型              | 示例值              | 描述                      |
|----------|-----------------|------------------|-------------------------|
| Id       | String          | 456AFAA7         | 文件 id                   |

### 返回数据

| 名称   | 类型     | 示例值       | 描述                           |
|------|--------|-----------|------------------------------|
| Head | String | subscribe | 类型，获取目录为 "subscribe"         |
| Data | Struct | -         | 具体请参见下表结构体 **SubscribeResp** |

### 结构体 SubscribeResp

| 名称   | 类型      | 示例值        | 描述     |
|------|---------|------------|--------|
| Id   | String  | 456AFAA7   | 文件 id  |
| Rev  | Integer | 323        | 第多少次修改 |
| Ops  | String  | -          | 文件内容   |
| User | String  | fengcaiwen | 订阅的用户  |

### 请求示例

```json
{
  "Head": "subscribe",
  "Data": {
    "Id": "C82C4F32"
  }
}
```

### 返回示例

```json
{
  "Head": "subscribe",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 323,
    "Ops": [
      "hello naison\n\n\n\nhelol\n\ntewst\n\ntes\n\n\nsdfsdf\nsdf\nsd\nfs\ndf\nsdf\n\nsdf\nsd\nf\n\nasdfasdf\n\n\nasdf\n\nasf\n\ns\ndf\n\nasd\n\nasf\n\naf\n\n😊\n"
    ],
    "User": "A65C39BF"
  }
}
```

### 报错示例

```json
{
  "Head": "revise.err",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 323,
    "Ops": [
      28,
      "a",
      92
    ],
    "User": "A51053CB",
    "Err": {}
  }
}
```
# 取消订阅单个文件

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值         | 描述                            |
|------|--------|------|-------------|-------------------------------|
| Head | String | 是    | unsubscribe | 类型，取消订阅文件为 "unsubscribe"      |
| Data | Struct | 是    | -           | 具体请参见下表结构体 **UnsubscribeReq** |

### 结构体 SubReq

| 名称       | 类型              | 示例值              | 描述                      |
|----------|-----------------|------------------|-------------------------|
| Id       | String          | 456AFAA7         | 文件 id                   |

### 返回数据

| 名称   | 类型     | 示例值         | 描述                             |
|------|--------|-------------|--------------------------------|
| Head | String | unsubscribe | 类型，取消订阅文件为 "unsubscribe"       |
| Data | Struct | -           | 具体请参见下表结构体 **UnsubscribeResp** |

### 结构体 UnsubscribeResp

| 名称   | 类型      | 示例值        | 描述     |
|------|---------|------------|--------|
| Id   | String  | 456AFAA7   | 文件 id  |
| Rev  | Integer | 323        | 第多少次修改 |
| Ops  | String  | -          | 文件内容   |
| User | String  | fengcaiwen | 订阅的用户  |

### 请求示例

```json
{
  "Head": "unsubscribe",
  "Data": {
    "Id": "C82C4F32"
  }
}
```

### 返回示例

```json
{
  "Head": "unsubscribe",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 323,
    "Ops": [
      "hello naison\n\n\n\nhelol\n\ntewst\n\ntes\n\n\nsdfsdf\nsdf\nsd\nfs\ndf\nsdf\n\nsdf\nsd\nf\n\nasdfasdf\n\n\nasdf\n\nasf\n\ns\ndf\n\nasd\n\nasf\n\naf\n\n😊\n"
    ],
    "User": "A65C39BF"
  }
}
```

### 报错示例

```json
{
  "Head": "revise.err",
  "Data": {
    "Id": "C82C4F32",
    "Rev": 323,
    "Ops": [
      28,
      "a",
      92
    ],
    "User": "A51053CB",
    "Err": {}
  }
}
```
# 文件重命名

### 请求参数

| 名称   | 类型     | 是否必填 | 示例值    | 描述                             |
|------|--------|------|--------|--------------------------------|
| Head | String | 是    | rename | 类型，更新为 "rename"                |
| Data | Struct | 是    | -      | 具体请参见下表结构体 **RenameReqStruct** |

#### 结构体 ReviseReqStruct

| 名称   | 类型     | 示例值      | 描述          |
|------|--------|----------|-------------|
| Id   | String | 456AFAA7 | 文件或者文件夹 id  |
| Name | String | naison   | 文件或者文件夹的新名字 |

### 返回数据

| 名称   | 类型     | 示例值    | 描述                              |
|------|--------|--------|---------------------------------|
| Head | String | rename | 类型，获取目录为 "rename"               |
| Data | Struct | -      | 具体请参见下表结构体 **RenameRespStruct** |

#### 结构体 ReviseRespStruct

| 名称    | 类型      | 示例值      | 描述          |
|-------|---------|----------|-------------|
| Id    | String  | 456AFAA7 | 文件或者文件夹 id  |
| Name  | String  | naison   | 文件或者文件夹的新名字 |
| IsDir | Boolean | true     | 是否是目录       |

### 请求示例

```json
{
  "Head": "rename",
  "Data": {
    "Id": "C82C4F32",
    "Name": "naison"
  }
}
```

### 返回示例

```json
{
  "Head": "rename",
  "Data": {
    "Id": "C82C4F32",
    "Name": "naison",
    "IsDir": false,
    "User": "B4FAA6E2"
  }
}
```
# 删除文件夹

## 同删除文件

# 新建文件夹

## 同新建文件

# 订阅单个文件夹

## 同订阅文件

# 取消订阅单个文件夹

## 同取消订阅文件
# 文件夹重命名

## 同文件重命名

# 常见的逻辑说明

## 正在编辑的文件 A，还没有保存。此时重命名父文件夹 B 为新名称 C，然后保存文件 A，会怎么样？

- 文件夹重命名成功，但为旧文件
- 文件 A 会写到原来的路径 B，而不是新文件夹 C 中

## 用户 A 和用户 B 正在编辑同一个文件，此时 A 写入了一个字符，此时会发生什么事情？

- 后台观察到用户 A 和 用户 B 正在订阅当前文件，则会把当前文件所做的操作，转发到对应的 socket 链接中
- 此时用户 A 和 用户 B 所看到的文件内容一致。
- 用户 B 可以保存由用户 A 修改的内容
