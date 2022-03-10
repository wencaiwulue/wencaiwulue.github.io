# summary

|                    |    bridge-to-kubernetes    |           kt-connect           |     telepresence     |         nocalhost         |
|--------------------|:--------------------------:|:------------------------------:|:--------------------:|:-------------------------:|
| dns 解析             |             支持             |               支持               |          支持          |            支持             |
| 本地访问远端 k8s 服务      |         支持（服务端口映射）         | 支持（linux和macOS是VPN，Windows为代理） |       支持（VPN）        |          支持（VPN）          |
| 本地访问远端 k8s 跨 ns 服务 |            不支持             |               支持               |          支持          |            支持             |
| 远端访问本地服务           |          mesh 方案           |            mesh 方案             |       mesh 方案        |          mesh 方案          |
| 协议支持情况             |      tcp、udp、http...       |            http、tcp            | icmp、tcp、udp、http... |   icmp、tcp、udp、http...    |
| 三个平台体验统一           |             好              |               不好               |          好           |             好             |
| 插件支持               | 支持 vscode 和 virtual studio |              无插件               |         无插件          | 有 vscode 插件和 jetbrains 插件 |
| 文件同步               |            不支持             |              不支持               |         不支持          |            支持             |
| 下载挂载 volume        |             支持             |              不支持               |         不支持          |            不支持            |
