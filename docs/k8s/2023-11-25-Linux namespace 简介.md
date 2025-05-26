---
title: Linux namespace 简介
authors: naison
tags: [ Linux ]
---

# 前言

我们知道容器使用 namespace 以及 cgroup 来资源隔离和限制，那么 namespace 都有哪些类型，cgroup 可以用来做什么尼？本文将和大家一起来探讨。

# Linux namespace 简介

Linux
Namespace是一种内核级别的隔离系统资源的方法，通过将系统全局资源放在不同的Namespace中，Linux提供了在一个单一系统上运行多个隔离的进程的能力。这意味着每个Namespace中的进程只能看到属于同一命名空间的资源，从而可以独立于其他Namespace的进程运行。这种隔离增强了系统的安全性，并为容器等技术提供了核心支持。
不同Namespace的程序，可以享有一份独立的系统资源。这有利于实现资源管理和限制，也可以避免不同服务或应用间的冲突问题。例如，每个Namespace都有自己的网络空间，这就意味着可以有多个网路接口，在每个Namespace中它们都可以叫eth0。
Linux Namespace主要有以下几种类型：

| Namespace | Flag            | Isolates                             |
|:----------|:----------------|:-------------------------------------|
| Cgroup    | CLONE_NEWCGROUP | Cgroup root directory                |
| IPC       | CLONE_NEWIPC    | System V IPC, POSIX message queues   |
| Network   | CLONE_NEWNET    | Network devices, stacks, ports, etc. |
| Mount     | CLONE_NEWNS     | Mount points                         |
| PID       | CLONE_NEWPID    | Process IDs                          |
| Time      | CLONE_NEWTIME   | Boot and monotonic clocks            |
| User      | CLONE_NEWUSER   | User and group IDs                   |
| UTS       | CLONE_NEWUTS    | Hostname and NIS domain name         |

[Linux man pages](https://man7.org/linux/man-pages/man7/namespaces.7.html)

## PID namespace

PID namespaces用来隔离进程的ID空间，使得不同pid namespace里的进程ID可以重复且相互之间不影响。PID
namespace可以嵌套，也就是说有父子关系，在当前namespace里面创建的所有新的namespace都是当前namespace的子namespace。父namespace里面可以看到所有子孙后代namespace里的进程信息，而子namespace里看不到祖先或者兄弟namespace里的进程信息。目前，PID
namespace最多可以嵌套32层，由内核中的宏MAX_PID_NS_LEVEL来定义，由于ID为1的进程的特殊性，所以每个PID
namespace的第一个进程的ID都是1。当这个进程运行停止后，内核将会给这个namespace里的所有其他进程发送SIGKILL信号，致使其他所有进程都停止，于是namespace被销毁掉。

```shell
➜  ~ sudo unshare --pid --mount-proc --fork /bin/sh
# ps -ef
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  2 16:43 pts/1    00:00:00 /bin/sh
root           2       1  0 16:43 pts/1    00:00:00 ps -ef
#
```

可以创建一个隔离的名字空间，其中最常用的是用于创建 PID 名字空间的 "--pid" 参数。但是，只用 "unshare --pid /bin/bash" 创建一个新的
PID 名字空间并不够，因为 "/proc" 文件系统还是原来的，它仍然反映主名字空间的进程信息。为了使新的 PID
名名空间中的进程信息反映在 "/proc" 中，我们需要在新的 PID 名字空间中装载新的 "/proc" 文件系统。具体操作为先卸载旧的 "
/proc" 文件系统，再装载新的 "/proc" 文件系统。这就是 "unshare" 命令中需要 "--mount-proc" 参数的原因。之所以使用 "
--mount-proc"，是为了让运行在新 PID 名字空间中的命令看到一份与其 PID 名字空间相匹配的进程列表。

在宿主机上可以看到 pid namespace 中的所有进程。
但是pid namespace看不到宿主机上的进程。

## Net namespace

Linux的Network Namespace（网络命名空间）是内核的一种特性，它能够提供一种资源隔离的方式，使得在同一台主机上的不同进程可以有自己独立的网络环境。每个Network
Namespace中的网络设备、IP地址、路由表、防火墙规则等都是互相隔离的。
具体来说，每个Network Namespace都有自己的：

- 网络设备：例如eth0、eth1、lo（回环）等。
- IPv4或IPv6协议栈：每个namespace都可以有自己的网络协议。
- 网络端口：例如同一台主机上的不同Network Namespace可以分别监听相同的端口，互不干扰。
- 路由和ARP表：不同Network Namespace的网络设备有各自独立的路由规则。
  这就意味着在同一个Network Namespace中的进程相互之间可以通过网络进行通信，而与其他Namespace中的进程网络隔离。这有利于实现资源管理和限制，同时也可以提供更高的系统安全性。
  我们平时使用的容器技术（如Docker）就是依赖于Network Namespace技术来实现网络的隔离和独立。例如，在Docker中创建一个新的容器时，Docker会创建一个新的Network
  Namespace，这样每个容器就可以有自己独立的网络环境。

```shell
➜  ~ sudo unshare --net --fork /bin/sh
# ping www.bing.com
connect: Network is unreachable
# ip addr
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
#
```

### CNI

使用 veth pair 连接两个网络命名空间并进行通信

1. 创建两个网络命名空间：

```shell
ip netns add net0
ip netns add net1
ip netns ls
```

进入 net ns 中

```shell
nsenter --net=/var/run/netns/net0
ip addr
nsenter --net=/var/run/netns/net1
ip addr
```

2. 创建 veth pair 并将其两端分别放入两个网络命名空间：

```shell
ip link add veth0 type veth peer name veth1
ip link set veth0 netns net0
ip link set veth1 netns net1
```

3. 启动 veth pair 的两端，并为其分配 IP 地址：

```shell
ip netns exec net0 ip link set veth0 up
ip netns exec net0 ip addr add 10.0.1.1/24 dev veth0

ip netns exec net1 ip link set veth1 up
ip netns exec net1 ip addr add 10.0.1.2/24 dev veth1
```

现在，两个网络命名空间 net0 和 net1 中的设备 veth0 和 veth1 分别拥有 IP 地址10.0.1.1和10.0.1.2，并且能够互相通信。

4. 测试

```shell
ip netns exec ns1 ping -c2 10.0.1.2
ip netns exec ns2 ping -c2 10.0.1.1
```

上述命令会在 ns1 命名空间和 ns2 命名空间中分别发送 ICMP 回显请求，测试 ns1 与 ns2 之间的连接。

## Mount namespace

Linux 的 Mount Namespace 可以为每个Namespace提供独立的文件系统挂载点视图。在一个Mount
Namespace中所做的挂载和卸载操作不会影响到其他的Namespace。

```shell
➜  code ls /mnt
➜  code ls
asdfg  a.sh  a.shh  main  main.go  main.go_1  main.go_back
➜  code cd ..
➜  ~ ls /mnt
➜  ~ sudo unshare --mount /bin/bash
root@n37-006-014:/data00/home/fengcaiwen# sudo mount -t tmpfs tmpfs /mnt
root@n37-006-014:/data00/home/fengcaiwen# cd /mnt/
root@n37-006-014:/mnt# ls
root@n37-006-014:/mnt# touch main.go
root@n37-006-014:/mnt# ls
main.go
root@n37-006-014:/mnt# exit
exit
➜  ~ ls /mnt
➜  ~
```

## UTS namespace

Linux的UTS Namespace，主要用于隔离两个系统的标识符：hostname（主机名）和NIS domain name。当你创建一个新的UTS
Namespace后，便可以在这个 Namespace 里面修改hostname和NIS domain name，而不会影响到其他Namespace。

```shell
➜  ~ hostname
n37-006-014
➜  ~ sudo unshare --uts --fork /bin/sh -c "hostname abc; /bin/sh"
# hostname
abc
#
```

## User namespace

User Namespace是Linux命名空间中的一种，主要用于隔离与安全相关的标识符和属性。这主要包括用户ID和组ID，以及进程的能力。在同一台机器上，同一个进程在不同的User
Namespace中可以具有不同的用户ID，组ID和能力。User Namespace的引入，使得我们可以在非特权用户的环境中运行具有root权限的程序。

```shell
root@ws-cm1agta5n77o3tcausf0-54f557b8f5-hkkjc:/app# unshare --user --map-user 12005 --map-group 12292 --fork /bin/sh
$ id
uid=12005(runner) gid=12292(runner) groups=12292(runner)
$ exit
root@ws-cm1agta5n77o3tcausf0-54f557b8f5-hkkjc:/app# unshare --user --fork /bin/sh
$ id
uid=65534(nobody) gid=65534(nogroup) groups=65534(nogroup)
$ exit
root@ws-cm1agta5n77o3tcausf0-54f557b8f5-hkkjc:/app# unshare --user --map-root-user --fork /bin/sh
# id
uid=0(root) gid=0(root) groups=0(root)
#
```

## IPC namespace

IPC Namespace是Linux命名空间的一种，主要用于隔离进程间的通信（IPC，InterProcess
Communication）资源，比如信号量（Semaphores）、消息队列（Message Queues）和共享内存段（Shared Memory
Segments）。在同一台机器上，同一个进程在不同的IPC Namespace中可以具有不同的IPC资源。
TIPS：
UNIX Socket被用于系统内进程间的通信（IPC），但不是被隔离在IPC Namespace中，而是在Network Namespace中进行隔离的。这意味着同一个Network
Namespace内的进程可以通过UNIX Socket进行通信，但是不同Network Namespace中的进程则无法进行UNIX Socket通信。

## Cgroups namespace

Cgroups（即控制组）是 Linux 内核的一个特性，用来限制、控制与隔离进程对系统资源（如 CPU、内存、磁盘 I/O、网络等）的使用。Cgroups
管理的资源可以按照层级进行划分，使得每个进程组可以有自己的资源限制。这是实现容器资源隔离的关键技术之一。
在 Kubernetes 中，Cgroups 被广泛用于实现工作负载的资源限制和隔离。例如，当你在 Pod 规范中设置 CPU 和内存限制时，Kubelet
会通过设置 Cgroups 参数来实现这些限制。
直到 Linux 内核 4.6 版本，引入了 Cgroup 命名空间（Cgroup Namespace）。Cgroup 命名空间用于虚拟化 Cgroup 树，使得在容器内部看到的
Cgroup 层级与宿主机上的实际 Cgroup 层级不一样。通过这种方式，可以在不改变容器进程在 Cgroup 树中位置的情况下，控制容器进程对
Cgroup 树的可见性。这可以增强容器的安全性和隔离性。

```shell
➜  ~ sudo unshare --pid --mount-proc --cgroup --fork /bin/bash
root@n37-006-014:/data00/home/fengcaiwen# cd /sys/fs/cgroup/cpu
root@n37-006-014:/sys/fs/cgroup/cpu# ls
agents.slice           clamav_mem            cpuacct.usage_percpu_sys   cpu.cfs_period_us  etrace_cpu         system.slice
cgroup.clone_children  cpuacct.stat          cpuacct.usage_percpu_user  cpu.cfs_quota_us   etrace_mem         tao_tasks
cgroup.procs           cpuacct.usage         cpuacct.usage_sys          cpu.idle           init.scope         tasks
cgroup.sane_behavior   cpuacct.usage_all     cpuacct.usage_user         cpu.shares         notify_on_release  tiger
clamav_cpu             cpuacct.usage_percpu  cpu.cfs_burst_us           cpu.stat           release_agent      user.slice
root@n37-006-014:/sys/fs/cgroup/cpu# cat cgroup.procs
root@n37-006-014:/sys/fs/cgroup/cpu# while : ; do : ; done &
[1] 12
root@n37-006-014:/sys/fs/cgroup/cpu# top
top - 14:26:44 up 17:36,  2 users,  load average: 0.69, 0.32, 0.27
Tasks:   4 total,   2 running,   2 sleeping,   0 stopped,   0 zombie
%Cpu(s): 15.1 us,  1.4 sy,  0.0 ni, 83.4 id,  0.0 wa,  0.0 hi,  0.1 si,  0.0 st
MiB Mem :  15773.5 total,  12523.4 free,   1087.1 used,   2163.0 buff/cache
MiB Swap:      0.0 total,      0.0 free,      0.0 used.  14331.1 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
     12 root      20   0    6900   1828   1316 R 100.0   0.0   0:14.61 bash
      1 root      20   0    2380    700    632 S   0.0   0.0   0:00.00 sh
      6 root      20   0    6900   3592   3084 S   0.0   0.0   0:00.00 bash
     13 root      20   0   10936   3180   2876 R   0.0   0.0   0:00.00 top



root@n37-006-014:/sys/fs/cgroup/cpu# ps -ef
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 14:24 pts/1    00:00:00 /bin/sh
root           6       1  0 14:25 pts/1    00:00:00 bash
root          12       6 99 14:26 pts/1    00:00:18 bash
root          14       6  0 14:26 pts/1    00:00:00 ps -ef
root@n37-006-014:/sys/fs/cgroup/cpu# cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us
-1
root@n37-006-014:/sys/fs/cgroup/cpu# ls
agents.slice           clamav_mem            cpuacct.usage_percpu_sys   cpu.cfs_period_us  etrace_cpu         system.slice
cgroup.clone_children  cpuacct.stat          cpuacct.usage_percpu_user  cpu.cfs_quota_us   etrace_mem         tao_tasks
cgroup.procs           cpuacct.usage         cpuacct.usage_sys          cpu.idle           init.scope         tasks
cgroup.sane_behavior   cpuacct.usage_all     cpuacct.usage_user         cpu.shares         notify_on_release  tiger
clamav_cpu             cpuacct.usage_percpu  cpu.cfs_burst_us           cpu.stat           release_agent      user.slice
root@n37-006-014:/sys/fs/cgroup/cpu# mkdir mycgroup
root@n37-006-014:/sys/fs/cgroup/cpu# cd mycgroup/
root@n37-006-014:/sys/fs/cgroup/cpu/mycgroup# ls
cgroup.clone_children  cpuacct.usage         cpuacct.usage_percpu_sys   cpuacct.usage_user  cpu.cfs_quota_us  cpu.stat
cgroup.procs           cpuacct.usage_all     cpuacct.usage_percpu_user  cpu.cfs_burst_us    cpu.idle          notify_on_release
cpuacct.stat           cpuacct.usage_percpu  cpuacct.usage_sys          cpu.cfs_period_us   cpu.shares        tasks
root@n37-006-014:/sys/fs/cgroup/cpu/mycgroup# pwd
/sys/fs/cgroup/cpu/mycgroup
root@n37-006-014:/sys/fs/cgroup/cpu/mycgroup# ls
cgroup.clone_children  cpuacct.usage         cpuacct.usage_percpu_sys   cpuacct.usage_user  cpu.cfs_quota_us  cpu.stat
cgroup.procs           cpuacct.usage_all     cpuacct.usage_percpu_user  cpu.cfs_burst_us    cpu.idle          notify_on_release
cpuacct.stat           cpuacct.usage_percpu  cpuacct.usage_sys          cpu.cfs_period_us   cpu.shares        tasks
root@n37-006-014:/sys/fs/cgroup/cpu/mycgroup# echo 12 > tasks
root@n37-006-014:/sys/fs/cgroup/cpu/mycgroup# cat cgroup.procs
12
root@n37-006-014:/sys/fs/cgroup/cpu/mycgroup# echo 20000 > cpu.cfs_quota_us
root@n37-006-014:/sys/fs/cgroup/cpu/mycgroup# top
top - 14:36:59 up 17:46,  2 users,  load average: 1.01, 1.08, 0.74
Tasks:   4 total,   2 running,   2 sleeping,   0 stopped,   0 zombie
%Cpu(s):  3.4 us,  0.6 sy,  0.0 ni, 96.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :  15773.5 total,  12530.3 free,   1075.9 used,   2167.4 buff/cache
MiB Swap:      0.0 total,      0.0 free,      0.0 used.  14341.3 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
     12 root      20   0    6900   1828   1316 R  20.0   0.0  10:22.27 bash
      1 root      20   0    2380    700    632 S   0.0   0.0   0:00.00 sh
      6 root      20   0    6900   3688   3148 S   0.0   0.0   0:00.15 bash
     48 root      20   0   10936   3244   2940 R   0.0   0.0   0:00.00 top
```

## Time namespace

在Linux系统中，Time Namespace允许每个命名空间可以拥有自己的一套时间流，Linux内核5.6及其内核版本以上才开始支持Time
Namespace。

```shell
unshare --time /bin/bash
```

使用timedatectl命令来改变系统时间：

```shell
timedatectl set-time "2022-12-31 12:00:00"
```

在执行这个命令后，只有在新的Time命名空间中的进程会看到改变的时间，对于原来的Time Namespace中的进程，他们看到的系统时间还是没有改变的。

```shell
uname -r
5.4.143-2-velinux1-amd64 # 还不支持
```

## 总结

Namespace 用来做资源隔离
Cgroup 用来做资源限制