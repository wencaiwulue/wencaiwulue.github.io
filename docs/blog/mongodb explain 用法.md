## 参数verbose有以下3种值

- queryPlanner(默认)
  MongoDB运行查询优化器对当前的查询进行评估并选择一个最佳的查询计划

- executionStats
  mongoDB运行查询优化器对当前的查询进行评估并选择一个最佳的查询计划进行执行
  在执行完毕后返回这个最佳执行计划执行完成时的相关统计信息

- allPlansExecution
  即按照最佳的执行计划执行以及列出统计信息
  如果有多个查询计划，还会列出这些非最佳执行计划部分的统计信息

## explain 的两种用法

```json
db[
  "image-distributes-to-product"
].explain("executionStats").count({
  "src_tenant": "tenant-97ognp"
}).executionStats.executionTimeMillis
```

```json
db[
  "image-distributes-to-product"
].aggregate([
  {
    "$match": {
      "src_tenant": "tenant-97ognp"
    }
  },
  {
    "$project": {
      "_id": 1
    }
  },
  {
    "$count": "count"
  }
]).explain("executionStats")
```

## 创建和删除索引

```json
db[
  "image-distributes-to-product"
].createIndex( {
  "src_tenant": 1,
  "deleted_at": 1
}, {unique: false, sparse: false})
```

```json
db[
  "image-distributes-to-product"
].dropIndex("src_tenant_1_deleted_at_1")
```

sparse: 是否是稀疏索引

## 联合索引

```json
db[
  "image-distributes-to-product"
].aggregate([
  {
    "$match": {
      "src_tenant": "tenant-97ognp"
    }
  },
  {
    "$group": {
      "_id": "$src_workspace"
    }
  }
]).explain("executionStats")
```

得创建一个 src_tenant 和 src_workspace 的联合索引

```shell
db["image-distributes-to-product"].createIndex( { "src_tenant": 1, "src_workspace": 1 }, { unique: false, sparse: false })
```

## 减少 pipeline

在下面这个示例中，这个 project 显示 id 是没有必要的

```json
{
  "$project": {
    "_id": 1
  }
}
```

```json
db[
  "image-distributes-to-product"
].aggregate([
  {
    "$match": {
      "deleted_at": null
    }
  },
  {
    "$match": {
      "src_tenant": "tenant-97ognp"
    }
  },
  {
    "$project": {
      "_id": 1
    }
  },
  {
    "$count": "count"
  }
]).explain("executionStats")
```

```json
db[
  "image-distributes-to-product"
].aggregate([
  {
    "$match": {
      "deleted_at": null
    }
  },
  {
    "$match": {
      "src_tenant": "tenant-97ognp"
    }
  },
  {
    "$count": "count"
  }
]).explain("executionStats")
```

```shell
rs0 [direct: primary] registry> db["image-distributes-to-product"].aggregate([{"$match": {"deleted_at": null}},{"$match": {"src_tenant": "tenant-97ognp"}},{"$project": {"_id": 1}},{"$count": "count"}]).explain("executionStats").stages[0]["$cursor"].executionStats.executionTimeMillis
2019
rs0 [direct: primary] registry> db["image-distributes-to-product"].aggregate([{"$match": {"deleted_at": null}},{"$match": {"src_tenant": "tenant-97ognp"}},{"$count": "count"}]).explain("executionStats").stages[0]["$cursor"].executionStats.executionTimeMillis
1622
```

## executionStats 解释

```text
{
  stages: [
    {
      '$cursor': {
        query: { src_tenant: 'tenant-97ognp' },
        fields: { src_workspace: 1, _id: 0 },
        queryPlanner: {
          plannerVersion: 1,
          namespace: 'registry.image-distributes-to-product',
          indexFilterSet: false,
          parsedQuery: { src_tenant: { '$eq': 'tenant-97ognp' } },
          winningPlan: {
            stage: 'PROJECTION',
            transformBy: { src_workspace: 1, _id: 0 },
            inputStage: {
              stage: 'IXSCAN',
              keyPattern: { src_tenant: 1, src_workspace: 1 },
              indexName: 'src_tenant_1_src_workspace_1',
              isMultiKey: false,
              multiKeyPaths: { src_tenant: [], src_workspace: [] },
              isUnique: false,
              isSparse: false,
              isPartial: false,
              indexVersion: 2,
              direction: 'forward',
              indexBounds: {
                src_tenant: [ '["tenant-97ognp", "tenant-97ognp"]' ],
                src_workspace: [ '[MinKey, MaxKey]' ]
              }
            }
          },
          rejectedPlans: []
        },
        executionStats: {
          executionSuccess: true,
          nReturned: 1006447,
          executionTimeMillis: 858,
          totalKeysExamined: 1006447,
          totalDocsExamined: 0,
          executionStages: {
            stage: 'PROJECTION',
            nReturned: 1006447,
            executionTimeMillisEstimate: 13,
            works: 1006448,
            advanced: 1006447,
            needTime: 0,
            needYield: 0,
            saveState: 7914,
            restoreState: 7914,
            isEOF: 1,
            invalidates: 0,
            transformBy: { src_workspace: 1, _id: 0 },
            inputStage: {
              stage: 'IXSCAN',
              nReturned: 1006447,
              executionTimeMillisEstimate: 9,
              works: 1006448,
              advanced: 1006447,
              needTime: 0,
              needYield: 0,
              saveState: 7914,
              restoreState: 7914,
              isEOF: 1,
              invalidates: 0,
              keyPattern: { src_tenant: 1, src_workspace: 1 },
              indexName: 'src_tenant_1_src_workspace_1',
              isMultiKey: false,
              multiKeyPaths: { src_tenant: [], src_workspace: [] },
              isUnique: false,
              isSparse: false,
              isPartial: false,
              indexVersion: 2,
              direction: 'forward',
              indexBounds: {
                src_tenant: [ '["tenant-97ognp", "tenant-97ognp"]' ],
                src_workspace: [ '[MinKey, MaxKey]' ]
              },
              keysExamined: 1006447,
              seeks: 1,
              dupsTested: 0,
              dupsDropped: 0,
              seenInvalidated: 0
            }
          }
        }
      }
    },
    { '$group': { _id: '$src_workspace' } }
  ],
  serverInfo: {
    host: 'mongodb-2',
    port: 27017,
    version: '4.0.28',
    gitVersion: 'af1a9dc12adcfa83cc19571cb3faba26eeddac92'
  },
  ok: 1,
  operationTime: Timestamp({ t: 1684909796, i: 16 }),
  '$clusterTime': {
    clusterTime: Timestamp({ t: 1684909796, i: 16 }),
    signature: {
      hash: Binary(Buffer.from("8b8bb1fc90e2c4646e3b516b726cee2a3841f93a", "hex"), 0),
      keyId: Long("7219480935245283331")
    }
  }
}
```

- winningPlan: 用到的查询计划
- rejectedPlans: 拒绝的查询计划
- stage: 'IXSCAN' 用到了索引

## 软删除 deleted_at 索引问题

一般程序中使用 deleted_at 作为软删除的表示标识，但是如果 mongodb 中没有这个field，那么这个索引是不生效的（应该是，待确定）


