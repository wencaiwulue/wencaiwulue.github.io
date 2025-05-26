# summary

|     | bridge-to-kubernetes  |  kt-connect   | telepresence  | nocalhost |
|  ----  | :----:  |  :----:  | :----:  |  :----: |
| dns 解析  | 支持 | 支持  | 支持 | 不支持（未来会支持）|
| 本地访问远端 k8s 服务  | 支持（服务映射） | 支持（linux和macOS是VPN，Windows为代理）  | 支持（VPN） | 基于端口转发 |
| 本地访问远端 k8s 跨 namespace 服务  | 不支持 | 支持  | 支持 |基于端口转发 |
| 远端访问本地服务  | mesh 方案  | mesh 方案  | mesh 方案 | 不支持（未来会支持）|
| 协议支持情况  | tcp、udp、http... | http、tcp  | icmp、tcp、udp、http... |不支持（未来会支持）|
| 三个平台体验统一  | 好 | 不好  | 好 |好|
| 插件支持  | 支持 vscode 和 virtual studio | 无插件  | 无插件 |有 vscode 插件和 jetbrains 系列插件|
| 文件同步  | 不支持 | 不支持  | 不支持 | 支持 |
| 下载挂载 volume  | 支持 | 不支持  | 不支持 | 不支持 |
