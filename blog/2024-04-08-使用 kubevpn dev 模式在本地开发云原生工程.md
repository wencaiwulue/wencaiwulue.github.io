---
title: 使用 kubevpn dev 模式在本地开发云原生工程
authors: naison
tags: [ naison, kubevpn ]
---

## 使用 KubeVPN dev 模式在本地开发项目

## 前言

最近在开发 WebIDE 功能，开发其中的聊天功能，原理不是很复杂，但是需要存储用户的聊天信息。因此需要使用到 MySQL
数据库，但是我们的集群现在都关闭了公网访问，开发环境的集群需要通过其他集群的网络做跳板。并且这个 MySQL
是个外置的数据库，也就是没有运行在集群中，而是在同一个 VPC 下。

## 诉求

能够在本地启动项目，快速开发。

## 简单的解决之道

在本地直接使用 docker 启动一个 MySQL，修改一下配置文件，就可以在本地启动项目了。但需要手动改配置，也不是很方便。

## 使用 kubevpn 在本地开发

```shell
kubevpn dev deployment/ws-co98bl9mhb1pisov4tc0 -n feiyan-1000000001 --rm --dev-image naison/kubevpn:v2.2.4 --entrypoint bash -v ~/GolandProjects/ide-server:/app -p 2345:2345 --extra-domain mysql1a1bb5fc80a6.rds.ivolces.com -it --connect-mode container --no-proxy
```

参数解释：

- -n 指定工作负载所在的工作空间。
- --rm 自动删除本地 container。
- --dev-image 指定在本地启动 container 的镜像，如果不指定的话，默认使用工作负载的镜像。
- --entrypoint 指定启动命令，如果不指定，默认使用工作负载的启动命令。
- -v 挂载磁盘。将本地目录挂载在 docker 容器内。
- -p 指定暴露端口，将 docker 容器端口暴露在主机上。
- --extra-domain 额外的域名。将本域名解析的 ip 加入到本地路由表。
- -it 交互模式，并启动 tty。
- --connect-mode，指定链接模式，可以直接在容器中链接集群网络。
- --no-proxy 指定是否将工作负载的流量拦截到本地。

熟悉 kubectl 和 docker 的同学可以很明显的看出，这些参数都是 kubectl 以及 docker 的选项，没错，就是这样的。

启动完成后，就会自动进入到 terminal 中，然后这个 terminal 的网路就是和 k8s
集群的网络是打通的。并且环境变量，磁盘挂载，也都是集群中工作负载的配置一模一样。这样就可以在这里启动项目啦～

```shell
➜  ~ kubevpn dev deployment/ws-co98bl9mhb1pisov4tc0 -n feiyan-1000000001 --rm --dev-image naison/kubevpn:v2.2.4 --entrypoint bash -v ~/GolandProjects/ide-server:/app -p 2345:2345 --extra-domain mysql1a1bb5fc80a6.rds.ivolces.com -it --connect-mode container --no-proxy
starting container connect to cluster
Created container: kubevpn_local_96e04
Wait container kubevpn_local_96e04 to be running...
Container kubevpn_local_96e04 is running now
start to connect
got cidr from cache
get cidr successfully
update ref count successfully
traffic manager already exist, reuse it
port forward ready
tunnel connected
adding route...
dns service ok
container connect to cluster successfully
tar: Removing leading `/' from member names
tar: Removing leading `/' from hard link targets
/var/folders/30/cmv9c_5j3mq_kthx63sb1t5c0000gn/T/522107804466811630:/code
tar: Removing leading `/' from member names
tar: Removing leading `/' from hard link targets
/var/folders/30/cmv9c_5j3mq_kthx63sb1t5c0000gn/T/6989754788069797291:/etc/feiyan
tar: Removing leading `/' from member names
tar: Removing leading `/' from hard link targets
/var/folders/30/cmv9c_5j3mq_kthx63sb1t5c0000gn/T/7236198221188709503:/var/run/secrets/kubernetes.io/serviceaccount
network mode is container:4edc150aceaa685763e7d380d667eb5a02eb1e69df00768f8b8825c23e93acdd
root@4edc150aceaa:/app#
```

```shell
root@4edc150aceaa:/app# ping -c 4 mysql1a1bb5fc80a6.rds.ivolces.com
PING mysql1a1bb5fc80a6.rds.ivolces.com (10.0.0.32) 56(84) bytes of data.
64 bytes from mysql1a1bb5fc80a6.rds.ivolces.com (10.0.0.32): icmp_seq=1 ttl=62 time=120 ms
64 bytes from mysql1a1bb5fc80a6.rds.ivolces.com (10.0.0.32): icmp_seq=2 ttl=62 time=127 ms
64 bytes from mysql1a1bb5fc80a6.rds.ivolces.com (10.0.0.32): icmp_seq=3 ttl=62 time=50.4 ms
64 bytes from mysql1a1bb5fc80a6.rds.ivolces.com (10.0.0.32): icmp_seq=4 ttl=62 time=54.9 ms

--- mysql1a1bb5fc80a6.rds.ivolces.com ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3017ms
rtt min/avg/max/mdev = 50.389/88.098/126.673/35.539 ms
```

这样就可以在此容器中启动自己的项目啦～

```shell
root@4edc150aceaa:/app/cmd# alias start='./cmd server --config /etc/feiyan/config.yaml --webide-workspace-id co98bl9mhb1pisov4tc0'
root@4edc150aceaa:/app/cmd# start
Using config file: /etc/feiyan/config.yaml
2024/04/08 19:09:41.483649 cmd.go:59: [Info] FLAG: --config="/etc/feiyan/config.yaml"
2024/04/08 19:09:41.488000 cmd.go:59: [Info] FLAG: --help="false"
2024/04/08 19:09:41.488006 cmd.go:59: [Info] FLAG: --hertz-max-request-body-size="4194304"
2024/04/08 19:09:41.488009 cmd.go:59: [Info] FLAG: --hertz-port="6789"
2024/04/08 19:09:41.488012 cmd.go:59: [Info] FLAG: --hertz-tls="false"
2024/04/08 19:09:41.488017 cmd.go:59: [Info] FLAG: --kitex-port="8888"
2024/04/08 19:09:41.488019 cmd.go:59: [Info] FLAG: --kitex-tls-enable="false"
2024/04/08 19:09:41.488021 cmd.go:59: [Info] FLAG: --log-caller-key="caller"
2024/04/08 19:09:41.488023 cmd.go:59: [Info] FLAG: --log-compress="true"
2024/04/08 19:09:41.488025 cmd.go:59: [Info] FLAG: --log-level="debug"
2024/04/08 19:09:41.488027 cmd.go:59: [Info] FLAG: --log-level-key="level"
2024/04/08 19:09:41.488029 cmd.go:59: [Info] FLAG: --log-max-age="1"
2024/04/08 19:09:41.488033 cmd.go:59: [Info] FLAG: --log-max-backups="3"
2024/04/08 19:09:41.488035 cmd.go:59: [Info] FLAG: --log-max-size="100"
2024/04/08 19:09:41.488037 cmd.go:59: [Info] FLAG: --log-message-key="msg"
2024/04/08 19:09:41.488039 cmd.go:59: [Info] FLAG: --log-path="app.log"
2024/04/08 19:09:41.488041 cmd.go:59: [Info] FLAG: --log-time-key=""
2024/04/08 19:09:41.488054 cmd.go:59: [Info] FLAG: --mysql-conn-max-idle-time="30s"
2024/04/08 19:09:41.488059 cmd.go:59: [Info] FLAG: --mysql-conn-max-life-time="1h0m0s"
2024/04/08 19:09:41.488061 cmd.go:59: [Info] FLAG: --mysql-create-batch-size="1000"
2024/04/08 19:09:41.488063 cmd.go:59: [Info] FLAG: --mysql-database="MYSQL_DB"
2024/04/08 19:09:41.488065 cmd.go:59: [Info] FLAG: --mysql-host="MYSQL_HOST"
2024/04/08 19:09:41.488067 cmd.go:59: [Info] FLAG: --mysql-max-idle-conns="1"
2024/04/08 19:09:41.488068 cmd.go:59: [Info] FLAG: --mysql-max-open-conns="100"
2024/04/08 19:09:41.488070 cmd.go:59: [Info] FLAG: --mysql-password="MYSQL_PASSWORD"
2024/04/08 19:09:41.488072 cmd.go:59: [Info] FLAG: --mysql-port="MYSQL_PORT"
2024/04/08 19:09:41.488074 cmd.go:59: [Info] FLAG: --mysql-username="MYSQL_USERNAME"
2024/04/08 19:09:41.488076 cmd.go:59: [Info] FLAG: --server-ca-file=""
2024/04/08 19:09:41.488078 cmd.go:59: [Info] FLAG: --server-cert-file=""
2024/04/08 19:09:41.488088 cmd.go:59: [Info] FLAG: --server-key-file=""
2024/04/08 19:09:41.488099 cmd.go:59: [Info] FLAG: --webide-git-ignore="[*~,*.swo,*.swp,*.swpx,*.swx,.ccls-cache]"
2024/04/08 19:09:41.488143 cmd.go:59: [Info] FLAG: --webide-log-level="debug"
2024/04/08 19:09:41.488167 cmd.go:59: [Info] FLAG: --webide-max-file-size="10Mi"
2024/04/08 19:09:41.488170 cmd.go:59: [Info] FLAG: --webide-port="8910"
2024/04/08 19:09:41.488198 cmd.go:59: [Info] FLAG: --webide-revision-period="2s"
2024/04/08 19:09:41.488203 cmd.go:59: [Info] FLAG: --webide-root-dir="/code"
2024/04/08 19:09:41.488205 cmd.go:59: [Info] FLAG: --webide-sync-period="2s"
2024/04/08 19:09:41.488207 cmd.go:59: [Info] FLAG: --webide-workspace-id="co98bl9mhb1pisov4tc0"
init db witch config &{0x400032a100}init mysql feiyanadmin:Mirrors79Bio@tcp(mysql1a1bb5fc80a6.rds.ivolces.com:3306)/feiyan?charset=utf8mb4&parseTime=True&loc=Local
```