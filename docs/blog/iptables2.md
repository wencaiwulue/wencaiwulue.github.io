- IPTABLES详解（10）：IPTABLES自定义链

  转载

  [mb5ff59200ebb3c](https://blog.51cto.com/u_15077549)2021-08-26 11:46:00

  ***文章标签\*[自定义](https://blog.51cto.com/topic/zidingyi.html)[钩子函数](https://blog.51cto.com/topic/gouzihanshu.html)[80端口](https://blog.51cto.com/topic/80duankou.html)[引用计数](https://blog.51cto.com/topic/yinyongjishu.html)[源地址](https://blog.51cto.com/topic/yuandizhi.html)*****文章分类\*[代码人生](https://blog.51cto.com/nav/code)*****阅读数\**\*1164\****

  前提基础：

  当主机收到一个数据包后，数据包先在内核空间中处理，若发现目的地址是自身，则传到用户空间中交给对应的应用程序处理，若发现目的不是自身，则会将包丢弃或进行转发。

  iptables实现防火墙功能的原理是：在数据包经过内核的过程中有五处关键地方，分别是PREROUTING、INPUT、OUTPUT、FORWARD、POSTROUTING，称为钩子函数，iptables这款用户空间的软件可以在这5处地方写规则，对经过的数据包进行处理，规则一般的定义为“如果数据包头符合这样的条件，就这样处理数据包”。

  iptables中定义有5条链，说白了就是上面说的5个钩子函数，因为每个钩子函数中可以定义多条规则，每当数据包到达一个钩子函数时，iptables就会从钩子函数中第一条规则开始检查，看该数据包是否满足规则所定义的条件。如果满足，系统就会根据该条规则所定义的方法处理该数据包；否则iptables将继续检查下一条规则，如果该数据包不符合钩子函数中任一条规则，iptables就会根据该函数预先定义的默认策略来处理数据包

  iptables中定义有表，分别表示提供的功能，有filter表（实现包过滤）、nat表（实现网络地址转换）、mangle表（实现包修改）、raw表（实现数据跟踪），这些表具有一定的优先级：raw-->mangle-->nat-->filter

  一条链上可定义不同功能的规则，检查数据包时将根据上面的优先级顺序检查

  ![IPTABLES详解（10）：IPTABLES自定义链_源地址](https://s2.51cto.com/images/blog/202108/26/eb4807b1ac869599d6b7865774e38ccc.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

  （图片来源网络）

  小结一下～～～

  ![IPTABLES详解（10）：IPTABLES自定义链_80端口_02](https://s2.51cto.com/images/blog/202108/26/459e9a773439dac49ce25d6102d21f46.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

  数据包先经过PREOUTING，由该链确定数据包的走向：

  1、目的地址是本地，则发送到INPUT，让INPUT决定是否接收下来送到用户空间，流程为①--->②;

  2、若满足PREROUTING的nat表上的转发规则，则发送给FORWARD，然后再经过POSTROUTING发送出去，流程为： ①--->③--->④--->⑥

  主机发送数据包时，流程则是⑤--->⑥

  iptables安装配置

  linux一般默认都已经安装iptables，只需要开启服务即可

  | 1    | `service iptables start` |
    | ---- | ------------------------ |
  |      |                          |

  iptables规则书写

  基本语法：iptables [-t 表] [操作命令] [链][规则匹配器][-j 目标动作]

  | 表             | 说明                                               | 支持的链                        |
    | -------------- | -------------------------------------------------- | ------------------------------- |
  | raw            | 一般是为了不再让iptables对数据包进行跟踪，提高性能 | PREROUTING、OUTPUT              |
  | mangle         | 对数据包进行修改                                   | 五个链都可以                    |
  | nat            | 进行地址转换                                       | PREROUTING、OUTPUT、POSTROUTING |
  | filter（默认） | 对包进行过滤                                       | INPUT、FORWARD、OUTPUT          |

  | 常用操作命令 | 说明                                                         |
    | ------------ | ------------------------------------------------------------ |
  | -A           | 在指定链尾部添加规则                                         |
  | -D           | 删除匹配的规则                                               |
  | -R           | 替换匹配的规则                                               |
  | -I           | 在指定位置插入规则例：iptables -I INPUT 1 --dport 80 -j ACCEPT（将规则插入到filter表INPUT链中的第一位上） |
  | -L/S         | 列出指定链或所有链的规则                                     |
  | -F           | 删除指定链或所有链的规则                                     |
  | -N           | 创建用户自定义链例：iptables -N allowed                      |
  | -X           | 删除指定的用户自定义链                                       |
  | -P           | 为指定链设置默认规则策略，对自定义链不起作用例：iptables -P OUTPUT DROP |
  | -Z           | 将指定链或所有链的计数器清零                                 |
  | -E           | 更改自定义链的名称例：iptables -E allowed disallowed         |
  | -n           | ip地址和端口号以数字方式显示例：iptables -Ln                 |

  | 常见规则匹配器         | 说明                                                         |
    | ---------------------- | ------------------------------------------------------------ |
  | -p tcp\|udp\|icmp\|all | 匹配协议，all会匹配所有协议                                  |
  | -s addr[/mask]         | 匹配源地址                                                   |
  | -d addr[/mask]         | 匹配目标地址                                                 |
  | --sport port1[:port2]  | 匹配源端口(可指定连续的端口）                                |
  | --dport port1[:port2]  | 匹配目的端口(可指定连续的端口）                              |
  | -o interface           | 匹配出口网卡，只适用FORWARD、POSTROUTING、OUTPUT。例：iptables -A FORWARD -o eth0 |
  | -i interface           | 匹配入口网卡，只使用PREROUTING、INPUT、FORWARD。             |
  | --icmp-type            | 匹配icmp类型（使用iptables -p icmp -h可查看可用的ICMP类型）  |
  | --tcp-flags mask comp  | 匹配TCP标记，mask表示检查范围，comp表示匹配mask中的哪些标记。例：iptables -A FORWARD -p tcp --tcp-flags ALL SYN，ACK -j ACCEPT（表示匹配SYN和ACK标记的数据包） |

  | 目标动作 | 说明                                                         |
    | -------- | ------------------------------------------------------------ |
  | ACCEPT   | 允许数据包通过                                               |
  | DROP     | 丢弃数据包                                                   |
  | REJECT   | 丢弃数据包，并且将拒绝信息发送给发送方                       |
  | SNAT     | 源地址转换（在nat表上）例：iptables -t nat -A POSTROUTING -d 192.168.0.102 -j SNAT --to 192.168.0.1 |
  | DNAT     | 目标地址转换（在nat表上）例：iptables -t nat -A PREROUTING -d 202.202.202.2 -j DNAT --to-destination 192.168.0.102 |
  | REDIRECT | 目标端口转换（在nat表上）例：iptables -t nat -D PREROUTING -p tcp --dport 8080 -i eth2.2 -j REDIRECT --to 80 |
  | MARK     | 将数据包打上标记例：iptables -t mangle -A PREROUTING -s 192.168.1.3 -j MARK --set-mark 60 |

  注意要点：

  1、目标地址转换一般在PREROUTING链上操作

  2、源地址转换一般在POSTROUTING链上操作



保存和恢复iptables规则

    使用iptables-save可以保存到特定文件中

| 1    | `  ``iptables-save >` `/etc/sysconfig/iptables_save` |
  | ---- | ---------------------------------------------------- |
|      |                                                      |

    使用iptables-restore可以恢复规则

| 1    | `  ``iptables-restore<` `/etc/sysconfig/iptables_save` |
  | ---- | ------------------------------------------------------ |
|      |                                                        |

iptables的进阶使用

    1、limit限制流量：

​    -m limit --limit-burst 15    #设置一开始匹配的最���数据包数量

​    -m limit --limit 1000/s      #设置最大平均匹配速率

​    -m limit --limit 5/m --limit-burst 15   #表示一开始能匹配的数据包数量为15个，每匹配到一个，

​                                  limit-burst的值减1,所以匹配到15个时，该值为0,以后每过

​                                  12s，limit-burst的值会加1,表示又能匹配1个数据包

例子：

| 12   | `iptables -A INPUT -i eth0 -m limit --limit 5` `/m` `--limit-burst 15 -j ACCEPT ``iptables -A INPUT -i eth0 -j DROP` |
  | ---- | ------------------------------------------------------------ |
|      |                                                              |

    注意要点：

​    1、--limit-burst的值要比--limit的大

​    2、limit本身没有丢弃数据包的功能，因此，需要第二条规则一起才能实现限速的功能

    2、time ：在特定时间内匹配

| -m time                 | 说明                                    |
  | ----------------------- | --------------------------------------- |
| --monthdays day1[,day2] | 在每个月的特定天匹配                    |
| --timestart hh:mm:ss    | 在每天的指定时间开始匹配                |
| --timestop hh:mm:ss     | 在每天的指定时间停止匹配                |
| --weekdays day1[,day2]  | 在每个星期的指定工作日匹配，值可以是1-7 |

例子：

| 12   | `iptables -A INPUT -i eth0 -m ` `time` `--weekdays 1,2,3,4 -jACCEPT``iptables -A INPUT -i eth0 -j DROP` |
  | ---- | ------------------------------------------------------------ |
|      |                                                              |

    3、ttl：匹配符合规则的ttl值的数据包

| 参数         | 说明                     |
  | ------------ | ------------------------ |
| --ttl-eq 100 | 匹配TTL值为100的数据包   |
| --ttl-gt 100 | 匹配TTL值大于100的数据包 |
| --ttl-lt 100 | 匹配TTL值小于100的数据包 |

例子：

| 1    | `iptables -A OUTPUT -m ttl --ttl-` `eq` `100 -j ACCEPT` |
  | ---- | ------------------------------------------------------- |
|      |                                                         |

    4、multiport：匹配离散的多个端口

| 参数                         | 说明                 |
  | ---------------------------- | -------------------- |
| --sports port1[,port2,port3] | 匹配源端口           |
| --dports port1[,port2,port3] | 匹配目的端口         |
| --ports port1[,port2,port3]  | 匹配源端口或目的端口 |

例子：

| 1    | `iptables -A INPUT -m multiport --sports 22，80，8080 -j DROP` |
  | ---- | ------------------------------------------------------------ |
|      |                                                              |



    5、state：匹配指定的状态数据包

| 参数          | 说明                                                         |
  | ------------- | ------------------------------------------------------------ |
| --state value | value可以为NEW、RELATED（有关联的）、ESTABLISHED、INVALID（未知连接） |

例子：

| 1    | `iptables -A INPUT -m state --state NEW，ESTABLISHED -j ACCEPT` |
  | ---- | ------------------------------------------------------------ |
|      |                                                              |

    6、mark：匹配带有指定mark值的数据包

| 参数         | 说明                        |
  | ------------ | --------------------------- |
| --mark value | 匹配mark标记为value的数据包 |

例子：

| 1    | `iptables -t mangle -A INPUT -m mark --mark 1 -j DROP` |
  | ---- | ------------------------------------------------------ |
|      |                                                        |

    7、mac：匹配特定的mac地址

例子：

  ```
  iptables -A FORWARD -m mac --mac-` `source` `00:0C:24:FA:19:80 -j DROP
  ```



##  

**定义链-------------------------------------**



前文中，我们一直在定义规则，准确的说，我们一直在iptables的**默认链**中定义规则，那么此处，我们就来了解一下**自定义链**。

你可能会问，iptables的默认链就已经能够满足我们了，为什么还需要自定义链呢？

原因如下：

当默认链中的规则非常多时，不方便我们管理。

想象一下，如果INPUT链中存放了200条规则，这200条规则有针对httpd服务的，有针对sshd服务的，有针对私网IP的，有针对公网IP的，假如，我们突然想要修改针对httpd服务的相关规则，难道我们还要从头看一遍这200条规则，找出哪些规则是针对httpd的吗？这显然不合理。

所以，iptables中，可以自定义链，通过自定义链即可解决上述问题。

假设，我们自定义一条链，链名叫IN_WEB，我们可以将所有针对80端口的入站规则都写入到这条自定义链中，当以后想要修改针对web服务的入站规则时，就直接修改IN_WEB链中的规则就好了，即使默认链中有再多的规则，我们也不会害怕了，因为我们知道，所有针对80端口的入站规则都存放在IN_WEB链中，同理，我们可以将针对sshd的出站规则放入到OUT_SSH自定义链中，将针对Nginx的入站规则放入到IN_NGINX自定义链中，这样，我们就能想改哪里改哪里，再也不同担心找不到规则在哪里了。

但是需要注意的是，自定义链并不能直接使用，而是需要被默认链引用才能够使用，空口白话说不明白，等到示例时我们自然会明白。

说了这么多，我们来动手创建一条自定义链，使用-N选项可以创建自定义链，示例如下

![IPTABLES详解（10）：IPTABLES自定义链_源地址_03](https://s2.51cto.com/images/blog/202108/26/e132a9f2b810c10ade5ac732aafd524d.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

如上图所示，"-t filter"表示操作的表为filter表，与之前的示例相同，省略-t选项时，缺省操作的就是filter表。

"-N IN_WEB"表示创建一个自定义链，自定义链的名称为"IN_WEB"

自定义链创建完成后，查看filter表中的链，如上图所示，自定义链已经被创建，而且可以看到，这条自定义链的引用计数为0 (0 references)，也就是说，这条自定义链还没有被任何默认链所引用，所以，即使IN_WEB中配置了规则，也不会生效，我们现在不用在意它，继续聊我们的自定义链。

好了，自定义链已经创建完毕，现在我们就可以直接在自定义链中配置规则了，如下图所示，我们配置一些规则用于举例。

![IPTABLES详解（10）：IPTABLES自定义链_钩子函数_04](https://s2.51cto.com/images/blog/202108/26/391f824f060d1224ca445d94a5c670ff.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

如上图所示，对自定义链的操作与对默认链的操作并没有什么不同，一切按照操作默认链的方法操作自定义链即可。

现在，自定义链中已经有了一些规则，但是目前，这些规则无法匹配到任何报文，因为我们并没有在任何默认链中引用它。

既然IN_WEB链是为了针对web服务的入站规则而创建的，那么这些规则应该去匹配入站的报文，所以，我们应该用INPUT链去引用它。

当然，自定义链在哪里创建，应该被哪条默认链引用，取决于实际的工作场景，因为此处示例的规则是匹配入站报文，所以在INPUT链中引用自定义链。

示例如下。

![IPTABLES详解（10）：IPTABLES自定义链_钩子函数_05](https://s2.51cto.com/images/blog/202108/26/3ec81368781ecac8f0975dd15c21d336.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

上图中，我们在INPUT链中添加了一条规则，访问本机80端口的tcp报文将会被这条规则匹配到

而上述规则中的"-j IN_WEB"表示：访问80端口的tcp报文将由自定义链"IN_WEB"中的规则进行处理，没错，在之前的示例中，我们使用"-j"选项指定动作，而此处，我们将"动作"替换为了"自定义链"，当"-j"对应的值为一个自定义链时，就表示被当前规则匹配到的报文将交由对应的自定义链处理，具体怎样处理，取决于自定义链中的规则，当IN_WEB自定义链被INPUT链引用以后，可以发现，IN_WEB链的引用计数已经变为1，表示这条自定义链已经被引用了1次，自定义链还可以引用其他的自定义链，感兴趣的话，动手试试吧。

在之前的文章中，我们说过，"动作"在iptables中被称为"target"，这样描述并不准确，因为target为目标之意，报文被规则匹配到以后，target能是一个"动作"，target也能是一个"自定义链"，当target为一个动作时，表示报文按照指定的动作处理，当target为自定义链时，表示报文由自定义链中的规则处理，现在回过头再理解之前的术语，似乎更加明了了。



那么此刻，我们在192.168.1.139上尝试访问本机的80端口，已经被拒绝访问，证明刚才自定义链中的规则已经生效了。

![IPTABLES详解（10）：IPTABLES自定义链_钩子函数_06](https://s2.51cto.com/images/blog/202108/26/0b369ed4567535fe292eccc868df3ab5.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

过了一段时间，我们发现IN_WEB这个名字不太合适，我们想要将这条自定义链重命名，把名字改成WEB，可以吗？必须能啊，示例如下

![IPTABLES详解（10）：IPTABLES自定义链_80端口_07](https://s2.51cto.com/images/blog/202108/26/5c6f2c105d5e4b4baa604caf111b5bbb.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

如上图所示，使用"-E"选项可以修改自定义链名，如上图所示，引用自定义链处的名称会自动发生改变。

好了，我们已经能够创建自定义了，那么怎样删除自定义链呢？

使用"-X"选项可以删除自定义链，但是删除自定义链时，需要满足两个条件：

1、自定义链没有被任何默认链引用，即自定义链的引用计数为0。

2、自定义链中没有任何规则，即自定义链为空。



那么，我们来删除自定义链WEB试试。

![IPTABLES详解（10）：IPTABLES自定义链_源地址_08](https://s2.51cto.com/images/blog/202108/26/b09b11adc3e543862741dcb20f1c1d2a.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

如上图所示，使用"-X"选项删除对应的自定义链，但是上例中，并没有成功删除自定义链WEB，提示：Too many links，是因为WEB链已经被默认链所引用，不满足上述条件1，所以，我们需要删除对应的引用规则，示例如下。

![IPTABLES详解（10）：IPTABLES自定义链_80端口_09](https://s2.51cto.com/images/blog/202108/26/a1d247dd1f1e25b33ca7f7e5e1c8118d.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

如上图所示，删除引用自定义链的规则后，再次尝试删除自定义链，提示：Directory not empty，是因为WEB链中存在规则，不满足上述条件2，所以，我们需要清空对应的自定义链，示例如下

![IPTABLES详解（10）：IPTABLES自定义链_源地址_10](https://s2.51cto.com/images/blog/202108/26/cf8641db3c0c4fbcad28a9e9a36c8010.png?x-oss-process=image/watermark,size_16,text_QDUxQ1RP5Y2a5a6i,color_FFFFFF,t_30,g_se,x_10,y_10,shadow_20,type_ZmFuZ3poZW5naGVpdGk=/format,webp/resize,m_fixed,w_1184)

如上图所示，使用"-X"选项可以删除一个引用计数为0的、空的自定义链。

## **小结**

为了方便以后回顾，我们将上述命令进行总结。

- https://icv.51cto.com/)