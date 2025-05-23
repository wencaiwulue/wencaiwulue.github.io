# GRPC gateway 将 GRPC 转为 HTTP 接口

## 背景

做大模型相关的事情，有一个场景是将一个 GRPC 接口转为 HTTP 接口，本来想着的只有一个 GRPC
接口，直接手写转换就可以了，但是考虑到可能未来还有更多的接口需要转换，因为直接调研了一下现成的方案。于是就找到了
`GRPC-gateway`，本文就简单记录一下使用 `GRPC-gateway` 将 GRPC 接口转换为 HTTP 接口的整个过程吧。

## 环境准备

- GRPC proto 定义文件
- [buf](https://github.com/bufbuild/buf) 工具

```text
 syntax = "proto3";
 package your.service.v1;
 option go_package = "github.com/yourorg/yourprotos/gen/go/your/service/v1";

 message StringMessage {
   string value = 1;
 }

 service YourService {
   rpc Echo(StringMessage) returns (StringMessage) {}
 }
```