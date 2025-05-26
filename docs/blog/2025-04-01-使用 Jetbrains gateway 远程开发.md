## 背景

使用 jetbrain gateway 链接本地的开发容器。

## 启动一个开发容器

```shell
docker run -d \
  --name=ssh \
  -e PUID=1000 \
  -e PGID=0 \
  -e TZ=Etc/UTC \
  -e LANG=C.UTF-8 \
  -e SUDO_ACCESS=true `#optional` \
  -e PASSWORD_ACCESS=true `#optional` \
  -e USER_PASSWORD=naison `#optional` \
  -e USER_NAME=naison `#optional` \
  -e DOCKER_MODS=linuxserver/mods:openssh-server-ssh-tunnel \
  -e LOG_STDOUT= `#optional` \
  -p 2222:2222 \
  -v ~/:/app \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --restart always \
  lscr.io/linuxserver/openssh-server:latest
```

## 需要替换 musl

https://youtrack.jetbrains.com/issue/IJPL-170288/RD-cant-work-on-Alpine

https://mirrors.tuna.tsinghua.edu.cn/help/alpine/

```shell
sudo apk update && sudo apk add libxext libxrender libxtst libxi freetype procps gcompat
```

## 否则会报错

## 换源

```shell
sed -i \
    -e "s@http://\(deb\|httpredir\).debian.org/debian@https://mirrors.tuna.tsinghua.edu.cn/debian@g" \
    -e "s@http://security.debian.org/debian-security@https://mirrors.tuna.tsinghua.edu.cn/debian-security@g" \
    /etc/apt/sources.list
```

```shell
sed -i 's#https\?://dl-cdn.alpinelinux.org/alpine#https://mirrors.tuna.tsinghua.edu.cn/alpine#g' /etc/apk/repositories
```

```shell
docker context create orbstack --docker "host=unix:///app/.orbstack/run/docker.sock"
docker context use orbstack
```

