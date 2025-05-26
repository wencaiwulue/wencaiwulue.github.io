---
title: Linux 上修改 Docker 镜像存储位置
authors: naison
tags: [ Linux ]
---

# 背景

有一台 Linux 开发机，用于构建镜像或者转存镜像，但是系统盘很小，只有 120G，挂载了一块数据盘，500G 的，但是 Docker
默认的镜像存储位置在系统盘，导致系统盘空间不足，需要修改 Docker 镜像存储位置。

# 现状

```shell
df -h
```

```shell
Filesystem      Size  Used Avail Use% Mounted on
udev             32G     0   32G   0% /dev
tmpfs           6.3G   27M  6.3G   1% /run
/dev/vda1       119G   87G   27G  77% /
tmpfs            32G  3.5M   32G   1% /dev/shm
tmpfs           5.0M     0  5.0M   0% /run/lock
tmpfs            32G     0   32G   0% /sys/fs/cgroup
tmpfs           128M  4.0K  128M   1% /.syskrbonly
/dev/vdb        492G   23G  444G   5% /data00
tmpfs           6.3G  8.0K  6.3G   1% /run/user/0
tmpfs           6.3G     0  6.3G   0% /run/user/2000
tmpfs           6.3G   24K  6.3G   1% /run/user/1000
tmpfs           6.3G     0  6.3G   0% /run/user/1001
```

可以看到系统盘在 / 下，数据盘在 /data00 下。

```shell
➜  ~ docker info | grep "Docker Root Dir"
 Docker Root Dir: /var/lib/docker
```

```shell
➜  ~ docker version
Client: Docker Engine - Community
 Version:           24.0.7
 API version:       1.43
 Go version:        go1.20.10
 Git commit:        afdd53b
 Built:             Thu Oct 26 09:08:20 2023
 OS/Arch:           linux/amd64
 Context:           default

Server: Docker Engine - Community
 Engine:
  Version:          24.0.7
  API version:      1.43 (minimum version 1.12)
  Go version:       go1.20.10
  Git commit:       311b9ff
  Built:            Thu Oct 26 09:08:20 2023
  OS/Arch:          linux/amd64
  Experimental:     false
 containerd:
  Version:          1.6.26
  GitCommit:        3dd1e886e55dd695541fdcd67420c2888645a495
 runc:
  Version:          1.1.10
  GitCommit:        v1.1.10-0-g18a0cb0
 docker-init:
  Version:          0.19.0
  GitCommit:        de40ad0
➜  ~
```

可以看到，docker 的镜像存储位置在 `/var/lib/docker`，但是系统盘空间不足，需要修改。

## 解决

```shell
sudo mv /var/lib/docker /data00
```

添加配置 `"data-root": "/data00/docker"`

```shell
➜  ~ cat /etc/docker/daemon.json
{
    "insecure-registries": ["hub.byted.org", "hub.byted.org:443"],
    "live-restore": true,
    "data-root": "/data00/docker"
}
```

重启 docker

```shell
systemctl restart docker
```

## 效果

```shell
➜  ~ docker info | grep "Docker Root Dir"
 Docker Root Dir: /data00/docker
```

检查镜像

```shell
➜  ~ docker images
REPOSITORY                       TAG                  IMAGE ID       CREATED        SIZE
gcr.io/k8s-minikube/kicbase      v0.0.43              619d67e74933   2 months ago   1.26GB
moby/buildkit                    buildx-stable-1      be698b50dea4   7 months ago   172MB
➜  ~
```

查看磁盘空间

```shell
➜  ~ df -h
Filesystem      Size  Used Avail Use% Mounted on
udev             32G     0   32G   0% /dev
tmpfs           6.3G   27M  6.3G   1% /run
/dev/vda1       119G   17G   97G  15% /
tmpfs            32G  3.6M   32G   1% /dev/shm
tmpfs           5.0M     0  5.0M   0% /run/lock
tmpfs            32G     0   32G   0% /sys/fs/cgroup
tmpfs           128M  4.0K  128M   1% /.syskrbonly
/dev/vdb        492G   89G  378G  19% /data00
tmpfs           6.3G  8.0K  6.3G   1% /run/user/0
tmpfs           6.3G     0  6.3G   0% /run/user/2000
tmpfs           6.3G   24K  6.3G   1% /run/user/1000
tmpfs           6.3G     0  6.3G   0% /run/user/1001
```

系统盘空间充足，数据盘空间充足。