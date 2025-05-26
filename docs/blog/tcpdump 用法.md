```shell
tcpdump -i utun3 -s0 -G 1 -w %Y_%m%d_%H%M_%S.pcap
```

10s 种分割一次

```shell
editcap -i 10 宿主机197.97tcpdump.cap host97
```