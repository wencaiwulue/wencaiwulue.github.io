server 端

```shell
iperf3 -s -p 5201
```

client 端：

```shell
iperf3 -c 223.254.0.100
```

## 直接在 devbox 中压测

- iperf3 server 运行在 rancher pod 中 `iperf3 -s -p 5201`
- 使用 port-forward 将 5201
  端口暴露 `kubectl port-forward kubevpn-traffic-manager-7bbb8b7567-765xg --address 0.0.0.0 5201:5201`

### 在 devbox 上 `iperf3 -c 127.0.0.1`

```text
Accepted connection from 127.0.0.1, port 45722
[  5] local 127.0.0.1 port 5201 connected to 127.0.0.1 port 45726
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-1.00   sec   314 MBytes  2.63 Gbits/sec
[  5]   1.00-2.00   sec   325 MBytes  2.73 Gbits/sec
[  5]   2.00-3.00   sec   319 MBytes  2.68 Gbits/sec
[  5]   3.00-4.00   sec   344 MBytes  2.89 Gbits/sec
[  5]   4.00-5.00   sec   315 MBytes  2.64 Gbits/sec
[  5]   5.00-6.00   sec   327 MBytes  2.74 Gbits/sec
[  5]   6.00-7.00   sec   249 MBytes  2.09 Gbits/sec
[  5]   7.00-8.00   sec   331 MBytes  2.77 Gbits/sec
[  5]   8.00-9.00   sec   354 MBytes  2.97 Gbits/sec
[  5]   9.00-10.00  sec   308 MBytes  2.59 Gbits/sec
[  5]  10.00-10.12  sec  46.8 MBytes  3.30 Gbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-10.12  sec  3.16 GBytes  2.68 Gbits/sec                  receiver
```

```text
iperf3 -c 127.0.0.1 -P 100
[SUM]   0.00-10.00  sec   639 MBytes   536 Mbits/sec  2584             sender
[SUM]   0.00-10.89  sec   184 MBytes   142 Mbits/sec                  receiver
```

### 在本地 `iperf3 -c 10.37.6.14`

拷贝的 iperf3 server 数据，client 端有报错
```text
Accepted connection from 127.0.0.1, port 46488
[  5] local 127.0.0.1 port 5201 connected to 127.0.0.1 port 46492
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-1.00   sec  18.8 MBytes   158 Mbits/sec
[  5]   1.00-2.00   sec  18.9 MBytes   159 Mbits/sec
[  5]   2.00-3.00   sec  21.4 MBytes   179 Mbits/sec
[  5]   3.00-4.00   sec  21.6 MBytes   181 Mbits/sec
[  5]   4.00-5.00   sec  19.6 MBytes   165 Mbits/sec
[  5]   5.00-6.00   sec  21.6 MBytes   181 Mbits/sec
[  5]   6.00-7.00   sec  20.0 MBytes   168 Mbits/sec
[  5]   7.00-8.00   sec  19.8 MBytes   166 Mbits/sec
[  5]   8.00-9.00   sec  20.0 MBytes   168 Mbits/sec
[  5]   9.00-10.00  sec  19.6 MBytes   165 Mbits/sec
[  5]  10.00-10.08  sec  1.65 MBytes   168 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-10.08  sec   203 MBytes   169 Mbits/sec                  receiver
```
```text
iperf3 -c 10.37.6.14 -P 100
[SUM]   0.00-10.14  sec   122 MBytes   101 Mbits/sec                  receiver
WARNING:  Size of data read does not correspond to offered length
iperf3: error - unable to receive results: Bad file descriptor
```

## 在 devbox 上通过 kubevpn 压测

- iperf3 server 运行在 rancher pod 中 `iperf3 -s -p 5201`
- 使用 kubevpn 链接到集群，直接访问 iperf3

### 在 devbox 上直接访问 pod ip

```text
Connecting to host 223.254.0.100, port 5201
[  5] local 223.254.0.101 port 28162 connected to 223.254.0.100 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec  12.8 MBytes   108 Mbits/sec   68   94.3 KBytes
[  5]   1.00-2.00   sec  16.6 MBytes   139 Mbits/sec   41    160 KBytes
[  5]   2.00-3.00   sec  19.6 MBytes   164 Mbits/sec   26    212 KBytes
[  5]   3.00-4.00   sec  18.5 MBytes   155 Mbits/sec   75    198 KBytes
[  5]   4.00-5.00   sec  17.5 MBytes   147 Mbits/sec   81    139 KBytes
[  5]   5.00-6.00   sec  17.1 MBytes   143 Mbits/sec    3    199 KBytes
[  5]   6.00-7.00   sec  18.2 MBytes   152 Mbits/sec   74    139 KBytes
[  5]   7.00-8.00   sec  16.3 MBytes   137 Mbits/sec   42    109 KBytes
[  5]   8.00-9.00   sec  18.2 MBytes   153 Mbits/sec    0    189 KBytes
[  5]   9.00-10.00  sec  18.0 MBytes   151 Mbits/sec   29    171 KBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-10.00  sec   173 MBytes   145 Mbits/sec  439             sender
[  5]   0.00-10.00  sec   171 MBytes   143 Mbits/sec                  receiver
```

### 在本地 使用 kubevpn 链接，直接访问 pod ip

```text
Connecting to host 223.254.0.100, port 5201
[  4] local 223.254.0.102 port 57042 connected to 223.254.0.100 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-1.00   sec  4.20 MBytes  35.2 Mbits/sec
[  4]   1.00-2.01   sec   843 KBytes  6.87 Mbits/sec
[  4]   2.01-3.00   sec  3.28 MBytes  27.7 Mbits/sec
[  4]   3.00-4.00   sec  2.08 MBytes  17.4 Mbits/sec
[  4]   4.00-5.00   sec  3.76 MBytes  31.6 Mbits/sec
[  4]   5.00-6.00   sec  3.50 MBytes  29.3 Mbits/sec
[  4]   6.00-7.00   sec  2.64 MBytes  22.2 Mbits/sec
[  4]   7.00-8.00   sec  2.63 MBytes  22.1 Mbits/sec
[  4]   8.00-9.00   sec  2.97 MBytes  24.9 Mbits/sec
[  4]   9.00-10.00  sec  3.30 MBytes  27.6 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-10.00  sec  29.2 MBytes  24.5 Mbits/sec                  sender
[  4]   0.00-10.00  sec  28.8 MBytes  24.2 Mbits/sec                  receiver
```

```text
iperf3 -c 223.254.0.100 -P 100
[SUM]   0.00-10.00  sec  60.1 MBytes  50.4 Mbits/sec                  sender
[SUM]   0.00-10.00  sec  53.4 MBytes  44.8 Mbits/sec                  receiver
```

## 优化后
### 在本地 port-forward 访问
client
```text
➜  ~ iperf3 -c 127.0.0.1
Connecting to host 127.0.0.1, port 5201
[  4] local 127.0.0.1 port 56443 connected to 127.0.0.1 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-1.00   sec  29.7 MBytes   249 Mbits/sec
[  4]   1.00-2.00   sec  40.1 MBytes   336 Mbits/sec
[  4]   2.00-3.00   sec  41.4 MBytes   347 Mbits/sec
[  4]   3.00-4.00   sec  40.4 MBytes   339 Mbits/sec
[  4]   4.00-5.00   sec  38.2 MBytes   322 Mbits/sec
[  4]   5.00-6.00   sec  20.9 MBytes   175 Mbits/sec
[  4]   6.00-7.00   sec  42.0 MBytes   352 Mbits/sec
[  4]   7.00-8.00   sec  42.6 MBytes   358 Mbits/sec
[  4]   8.00-9.00   sec  43.7 MBytes   366 Mbits/sec
WARNING:  Size of data read does not correspond to offered length
iperf3: error - unable to receive results: Resource temporarily unavailable
```
server
```text
-----------------------------------------------------------
Server listening on 5201
-----------------------------------------------------------
Accepted connection from 127.0.0.1, port 56006
[  5] local 127.0.0.1 port 5201 connected to 127.0.0.1 port 56008
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-1.00   sec  25.5 MBytes   214 Mbits/sec
[  5]   1.00-2.00   sec  39.5 MBytes   331 Mbits/sec
[  5]   2.00-3.00   sec  41.5 MBytes   348 Mbits/sec
[  5]   3.00-4.00   sec  40.2 MBytes   338 Mbits/sec
[  5]   4.00-5.00   sec  37.4 MBytes   314 Mbits/sec
[  5]   5.00-6.00   sec  20.4 MBytes   171 Mbits/sec
[  5]   6.00-7.00   sec  42.2 MBytes   354 Mbits/sec
[  5]   7.00-8.00   sec  43.3 MBytes   363 Mbits/sec
[  5]   8.00-9.00   sec  43.5 MBytes   365 Mbits/sec
[  5]   9.00-10.00  sec  43.7 MBytes   366 Mbits/sec
[  5]  10.00-10.08  sec  3.59 MBytes   378 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-10.08  sec   381 MBytes   317 Mbits/sec                  receiver
```

### 在本地直接访问 pod ip
client
```text
➜  ~ iperf3 -c 10.42.0.72
Connecting to host 10.42.0.72, port 5201
[  4] local 223.254.0.101 port 56446 connected to 10.42.0.72 port 5201
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-1.00   sec  13.9 MBytes   117 Mbits/sec
[  4]   1.00-2.00   sec  24.9 MBytes   209 Mbits/sec
[  4]   2.00-3.00   sec  26.1 MBytes   219 Mbits/sec
[  4]   3.00-4.01   sec  20.0 MBytes   166 Mbits/sec
[  4]   4.01-5.00   sec  23.5 MBytes   199 Mbits/sec
[  4]   5.00-6.00   sec  26.2 MBytes   220 Mbits/sec
[  4]   6.00-7.01   sec  26.0 MBytes   217 Mbits/sec
[  4]   7.01-8.00   sec  27.2 MBytes   229 Mbits/sec
[  4]   8.00-9.00   sec  28.8 MBytes   242 Mbits/sec
[  4]   9.00-10.00  sec  27.0 MBytes   226 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bandwidth
[  4]   0.00-10.00  sec   244 MBytes   204 Mbits/sec                  sender
[  4]   0.00-10.00  sec   244 MBytes   204 Mbits/sec                  receiver

iperf Done.
```
server
```text
-----------------------------------------------------------
Server listening on 5201
-----------------------------------------------------------
Accepted connection from 223.254.0.101, port 56445
[  5] local 10.42.0.72 port 5201 connected to 223.254.0.101 port 56446
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-1.00   sec  9.95 MBytes  83.5 Mbits/sec
[  5]   1.00-2.00   sec  25.3 MBytes   212 Mbits/sec
[  5]   2.00-3.00   sec  26.2 MBytes   220 Mbits/sec
[  5]   3.00-4.00   sec  19.5 MBytes   163 Mbits/sec
[  5]   4.00-5.00   sec  23.6 MBytes   198 Mbits/sec
[  5]   5.00-6.00   sec  26.0 MBytes   218 Mbits/sec
[  5]   6.00-7.00   sec  26.1 MBytes   219 Mbits/sec
[  5]   7.00-8.00   sec  27.4 MBytes   230 Mbits/sec
[  5]   8.00-9.00   sec  29.0 MBytes   244 Mbits/sec
[  5]   9.00-10.00  sec  26.7 MBytes   224 Mbits/sec
[  5]  10.00-10.12  sec  3.70 MBytes   258 Mbits/sec
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate
[  5]   0.00-10.12  sec   244 MBytes   202 Mbits/sec                  receiver
-----------------------------------------------------------
Server listening on 5201
-----------------------------------------------------------
```