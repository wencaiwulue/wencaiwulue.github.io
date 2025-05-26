## 简单使用

### 显示

```shell
iptables -t nat -L -n 
```

- -t 指定表名字，nat/filter
- -L 显示所有
- -n 显示行号

### 增加

```shell
iptables -t filter -A INPUT -j DROP
```

- -A 表示追加 append
- -j 动作 DROP/FORWARD

```shell
iptables -t filter -I INPUT 1 -j ACCEPT
```

- -I 表示插入，insert

### 删除

```shell
iptables -t filter -D INPUT 1
```

```shell
iptables -t filter -D INPUT -j DROP
```

- -D 删除 delete

## 发送到主机

配套使用的

```shell
iptable -t nat -A PREROUTING -p tcp --dport 7788 -j DNAT --to 192.168.0.11:7799
```

```shell
iptable -t nat -A POSTROUTING -p tcp -d 192.168.0.11 --dport 7799 -j SNAT --to 182.168.0.12
```

或者

```shell
iptable -t nat -A POSTROUTING -p tcp -d 192.168.0.11 --dport 7799 -j MASQUERADE
```

## kubevpn 中的 traffic-manager

```shell
iptables -t nat -A POSTROUTING -s ${CIDR4} -o eth0 -j MASQUERADE
```

只用到了这一个规则，为什么呢？

原因在于只处理两种情况

- 本地请求虚拟网络，比如在本地 223.254.0.1 `ping 223.254.0.100`

这种已经在程序中处理了，并不需要用到 iptables

- 本地请求容器网络，比如在本地 223.254.0.1 `ping 172.10.0.12`

这种比较复杂，流量到了 traffic-manager，由 tun 网卡根据路由表转发给 eth0 网卡，这样其实已经进入了网络协议栈，已经过了 PREROUTING 表了，只需要做 SNAT 即可，发出去的时候，自动做 SNAT，将
source-ip 修改为主机网卡 ip。然后在 ip 为 `172.10.0.12` 的这个 pod 中，响应时网卡将 source-ip 和 destination-ip 调个个儿，那么就知道是 node 的主机 ip
在请求，因此就可以发送到 traffic-manager 所在的 node了，然后再通过 iptables 的映射，转换为 223.254.0.1



