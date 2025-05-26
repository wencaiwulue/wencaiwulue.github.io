## 记一次阅读大佬代码 vCluster 功能及实现

### 需求

用户声明需要一个集群，就需要从一个已存在的 tke 集群中，生成一个vCluster.

### 架构设计

```text
           CRD operator
                |
                |
                |
                ↓
用户 —————————> CRD 
```

用户声明 CRD, 将期望状态以及参数存储在 CRD 中，然后 CRD operator 监听 CRD 事件，使得当前状态达到期望状态，从而达到一致性

### 实现方式

- 使用 controller 机制，实现接口 `ResourceEventHandler`
- CRD operator 机制，使用 `kubebuilder`

这里讲道理两种方式都可以
