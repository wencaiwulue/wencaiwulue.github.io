## 前言

上一篇博客介绍了[Docker是什么？](http://testerfans.com/archives/what-is-docker)
，并简单介绍了Docker依赖的一些Linux内核底层技术。其中包括namespaces（命名空间）、Control groups（控制组）、Union file systems
（联合文件系统），本篇文章我们将整体对命名空间有一个整体认知，并通过接下来的几篇文章来分别试验各种不同的命名空间，理解Docker
容器是如何实现资源隔离的。

## namespace简介

namespace(命名空间)是linux
kernel实现资源隔离的一种技术,命名空间将全局系统资源进行隔离，使命名空间内的进程看起来拥有自己的全局资源。在命名空间内对全局资源的更改对属于相同命名空间成员的其他进程有影响，但对非命名空间内进程是没有影响的。命名空间的其中一种使用场景就是实现容器。

## namespace类型

Linux
kernel目前支持8种namespace，这些namespace可以实现对不同类型的资源进行隔离，通过查看docker官网目前docker除了支持IPC、Network、Mount、PID、User、UTS这六种命名空间之外，目前在API
1.4.1+版本也已经支持[cgroupns](https://docs.docker.com/engine/reference/commandline/container_run/)
选项来实现对容器的cgroup命名空间进行设定。

![](https://www.testerfans.com/upload/2022/04/image-1651056907915.png)

Linux namespace列表和具体的说明如下表：

| 命名空间名   | 全称                                                                                                  | 系统API调用参数        | 隔离内容                                                | 内核版本                                                                        |
|---------|-----------------------------------------------------------------------------------------------------|------------------|-----------------------------------------------------|-----------------------------------------------------------------------------|
| Mount   | Mount                                                                                               | CLONE\_NEWNS     | Mount points挂载点（文件系统）                               | 2.4.19                                                                      |
| UTS     | [UNIX Time-sharing System](https://dsf.berkeley.edu/cs262/UNIX-annotated.pdf)                       | CLONE\_NEWUTS    | 系统主机名和 NIS(Network Information Service) 主机名（有时称为域名） | 2.6.19                                                                      |
| IPC     | [InterProcess Communication](https://www.jianshu.com/p/c1015f5ffa74)                                | CLONE\_NEWIPC    | System V IPC, POSIX message queues信号量，消息队列          | 2.6.19                                                                      |
| PID     | [Process IDentification](https://www.cyberciti.biz/faq/howto-display-process-pid-under-linux-unix/) | CLONE\_NEWPID    | Process IDs进程号                                      | [2.6.24](https://kernelnewbies.org/Linux_2_6_24#PID_and_network_namespaces) |
| Network | Network                                                                                             | CLONE\_NEWNET    | Network devices, stacks, ports, etc.网络设备，协议栈，端口等等   | [2.6.24](https://kernelnewbies.org/Linux_2_6_24#PID_and_network_namespaces) |
| User    | User                                                                                                | CLONE\_NEWUSER   | 用户和用户组                                              | [3.8](https://kernelnewbies.org/Linux_3.8#User_namespace_support_completed) |
| Cgroups | Control groups                                                                                      | CLONE\_NEWCGROUP | Cgroup root directory cgroup 根目录                    | [4.6](https://kernelnewbies.org/Linux_4.6#Support_for_cgroup_namespaces)    |
| Time    | Time                                                                                                | CLONE\_NEWTIME   | 系统时钟                                                | [5.6](https://kernelnewbies.org/Linux_5.6#Time_Namespaces)                  |

## namespaces API

Linux提供了多种系统调用API来操作namespaces，包括：clone()、setns() 和 unshare() 方法，使用这些方法时通过传入上表中的CLONE\_NEW\*
flag来指定要操作的命名空间。

## clone()方法

调用者可以通过clone方法在创建进程的时候为进程创建命名空间，具体方法声明如下：

```c
/* Prototype for the glibc wrapper function */
#define _GNU_SOURCE
#include <sched.h>
int clone(int (*fn)(void *), void *child_stack, int flags, void *arg);
```

clone() 是在 C 语言库中glibc定义的一个封装(wrapper)函数，它负责建立新进程的堆栈并且调用对编程者隐藏的 clone()
系统调用。Clone() 其实是 linux 系统调用 fork() 的一种更通用的实现方式，它可以通过 flags 来控制使用多少功能。下面我们只介绍与
namespace 相关的 4 个参数。

+ fn : 指定一个由新进程执行的函数。当这个函数返回时，子进程终止。该函数返回一个整数，表示子进程的退出代码。
+ child\_stack : 传入子进程使用的栈空间，调用进程(指调用 clone() 的进程)应该总是为子进程分配新的堆栈。
+ flags : 使用哪些 CLONE\_NEW\* 标志位。
+ args : 指定传递给 fn() 函数的参数。

> 一共有 20 多种 CLONE\_ 开头的 falg(标志位) 参数用来控制 clone 进程的不同内容，可以通过 man clone来查看具体信息。

## setns()方法

调用者可以通过setns()方法将当前进程加入到已有的namespace中，具体方法声明如下：

```c
#define _GNU_SOURCE
#include <sched.h>
int setns(int fd, int nstype);
```

和 clone() 函数一样，C 语言库中的 setns() 函数也是对 setns() 系统调用的封装：

+ fd：表示要加入的 namespace 的文件描述符，可以通过打开其中一个符号链接来获取，也可以通过打开 bind mount 到其中一个链接的文件来获取。
+ nstype：让调用者可以去检查 fd 指向的 namespace 类型，值可以设置为CLONE\_NEW\* 常量，填0表示不检查。如果调用者已经明确知道自己要加入了
  namespace 类型，或者不关心 namespace 类型，就可以使用该参数来自动校验。

> 在 docker 中，使用 docker exec 命令在已经运行着的容器中执行新的命令就需要用到 setns() 函数，`docker exec -it <container id> bash` 是不是很熟悉？  
> 另外我们可以通过man setns查看具体信息。

## unshare()方法

可以通过调用unshare方法将当前进程加入到新建namespace进行资源隔离，unshare() 在 C 语言库中的声明如下：

```c
#define _GNU_SOURCE
#include <sched.h>
int unshare(int flags);
```

unshare() 与 clone() 类似，但它运行在原进程上，不需要创建一个新进程，即：先通过指定的 flags 参数 CLONE\_NEW\* 创建一个新的
namespace，然后将调用者进程加入该 namespace。最后实现的效果其实就是将调用者从当前的 namespace 分离，然后加入一个新的
namespace。

> Linux 中自带的 unshare 命令，就是通过 unshare() 系统调用实现的，使用方法如下：$ unshare \[options\] program \[arguments\]

## 关键目录

## /proc/\[pid\]/ns 目录

每个进程都有一个 /proc/PID/ns 目录，其下面的文件依次表示每个 namespace, 例如 user 就表示 user namespace。从 3.8
版本的内核开始，该目录下的每个文件都是一个特殊的符号链接，链接指向 namespace:\[namespace:\[namespace-inode-number\]，前半部份为
namespace 的名称，后半部份的数字表示这个 namespace 的句柄号。句柄号用来对进程所关联的 namespace 执行某些操作。

```shell
[root@VM-16-7-centos ~]# ll /proc/$$/ns
total 0
lrwxrwxrwx 1 root root 0 Apr 28 19:36 ipc -> ipc:[4026531839]
lrwxrwxrwx 1 root root 0 Apr 28 19:36 mnt -> mnt:[4026531840]
lrwxrwxrwx 1 root root 0 Apr 28 19:36 net -> net:[4026531956]
lrwxrwxrwx 1 root root 0 Apr 28 19:36 pid -> pid:[4026531836]
lrwxrwxrwx 1 root root 0 Apr 28 19:36 user -> user:[4026531837]
lrwxrwxrwx 1 root root 0 Apr 28 19:36 uts -> uts:[4026531838]
```

目录文件介绍：

| 文件名称                                 | 描述                                                      |
|--------------------------------------|---------------------------------------------------------|
| /proc/\[pid\]/ns/cgroup              | 进程的 cgroup namespace                                    |
| /proc/\[pid\]/ns/ipc                 | 进程的 IPC namespace                                       |
| /proc/\[pid\]/ns/mnt                 | 进程的 mount namespace                                     |
| /proc/\[pid\]/ns/net                 | 进程的 network namespace                                   |
| /proc/\[pid\]/ns/pid                 | 进程的 PID namespace在进程的整个生命周期里是不变的                        |
| /proc/\[pid\]/ns/pid\_for\_children  | 进程创建子进程的 PID namespace这个文件与 /proc/\[pid\]/ns/pid 不一定一致。 |
| /proc/\[pid\]/ns/time                | 进程的 time namespace                                      |
| /proc/\[pid\]/ns/time\_for\_children | 进程创建子进程的 time namespace                                 |
| /proc/\[pid\]/ns/user                | 进程的 user namespace                                      |
| /proc/\[pid\]/ns/uts                 | 进程的 UTS namespace                                       |

这些符号链接的用途之一是用来确认两个不同的进程是否处于同一 namespace 中。如果两个进程指向的 namespace inode number
相同，就说明他们在同一个 namespace 下，否则就在不同的 namespace 下。

这些符号链接指向的文件比较特殊，不能直接访问，事实上指向的文件存放在被称为 nsfs 的文件系统中，该文件系统用户不可见，可以使用系统调用
stat() 在返回的结构体的 st\_ino 字段中获取 inode number。在 shell 终端中可以用命令（实际上就是调用了 stat()）看到指向文件的
inode 信息：

```shell
[root@VM-16-7-centos ~]# stat -L /proc/$$/ns/ipc
  File: ‘/proc/21410/ns/ipc’
  Size: 0               Blocks: 0          IO Block: 1024   regular empty file
Device: 3h/3d   Inode: 4026531839  Links: 1
Access: (0444/-r--r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2022-04-28 19:51:03.234978473 +0800
Modify: 2022-04-28 19:51:03.234978473 +0800
Change: 2022-04-28 19:51:03.234978473 +0800
 Birth: -
```

除了上述用途之外，这些符号链接还有其他的用途，如果我们打开了其中一个文件，那么只要与该文件相关联的文件描述符处于打开状态，即使该
namespace 中的所有进程都终止了，该 namespace 依然不会被删除。

## /proc/sys/user 目录

/proc/sys/user 目录下的文件记录了各 namespace 的相关限制。当达到限制，相关调用会报错 error ENOSPC 。

| 文件名称                    | 限制内容说明                                                    |
|-------------------------|-----------------------------------------------------------|
| max\_cgroup\_namespaces | 在 user namespace 中的每个用户可以创建的最大 cgroup namespaces 数        |
| max\_ipc\_namespaces    | 在 user namespace 中的每个用户可以创建的最大 ipc namespaces 数           |
| max\_mnt\_namespaces    | 在 user namespace 中的每个用户可以创建的最大 mount namespaces 数         |
| max\_net\_namespaces    | 在 user namespace 中的每个用户可以创建的最大 network namespaces 数       |
| max\_pid\_namespaces    | 在 user namespace 中的每个用户可以创建的最大 PID namespaces 数           |
| max\_time\_namespaces   | Linux 5.7在 user namespace 中的每个用户可以创建的最大 time namespaces 数 |
| max\_user\_namespaces   | 在 user namespace 中的每个用户可以创建的最大 user namespaces 数          |
| max\_uts\_namespaces    | 在 user namespace 中的每个用户可以创建的最大 uts namespaces 数           |

## Namespace 的生命周期

正常的 namespace 的生命周期与最后一个进程的终止和离开相关。但有一些情况，即使最后一个进程已经退出了，namespace 仍不能被销毁。

+ /proc/\[pid\]/ns/\* 中的文件被打开或者 mount ，即使最后一个进程退出，也不能被销毁。
+ namespace 存在分层，子 namespace 仍存在 ，即使最后一个进程退出，也不能被销毁。
+ 一个 user namespace 拥有一些非 user namespace （比如拥有 PID namespace 等其他的 namespace 存在），即使最后一个进程退出，也不能被销毁。
+ 对于 PID namespace 而言，如果与 /proc/\[pid\]/ns/pid\_for\_children 存在关联关系时，即使最后一个进程退出，也不能被销毁。
+ 一些其他情况。

## 总结

Linux通过namespace实现资源的隔离，并提供clone()、setns()、unshare()
方法实现对namespace的操作，我们可以在/proc/\[pid\]/ns和/proc/user目录下查看具体的进程namespace信息，namespace有自己的生命周期，namespace的释放与是否依然被依赖有关。本篇整体介绍了namespace的概况，后续我们会分别探索每种namespace的原理。

* * *

本文参考：  
[man namespace](https://man7.org/linux/man-pages/man7/namespaces.7.html#EXAMPLES)  
[Linux Namespace:简介](https://www.cnblogs.com/sparkdev/p/9365405.html)  
[Docker 基础技术之 Linux namespace 详解](https://mp.weixin.qq.com/s/10HgkUE14wVI_RNmFdqkzA)  
[Linux Namespace 入门系列：Namespace API](https://segmentfault.com/a/1190000022187686)