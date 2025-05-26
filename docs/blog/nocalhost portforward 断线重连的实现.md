# 修复在 k8s runtime 为 containerd 时，端口转发不稳定问题

## 抛出问题

我们在开发nocalhost项目，此项目中有个功能叫做端口转发，内部使用了 k8s 的端口转发，在上面主动加了 heartbeat 心跳检查。 有用户反馈使用了 containerd 之后，端口转发不稳定，总是失败。

## 复现步骤

- 使用 Containerd 作为 k8s runtime, 并部署一个 Pod
- Pod 中监听业务端口
- 开发端口转发
- 请求正常，得到正确结果，愈合预期
- Pod 中关闭业务监听的端口
- 请求失败，得到失败结果，符合预期
- Pod 中开启业务监听的端口
- 请求失败，得到失败结果，不符合预期

## 初步分析

看起来就像是Pod关闭端口后，连接出现了问题，然后即便再次开启端口，连接也无法恢复。

### 排查思路

首先想到的就是我们的端口转发是用的 client-go 中的 portforward，可能是用法不当。因此，使用原生的 kubectl port-forward 后，发现也有问题。初步将矛头指向 containerd了

### 回想一下 k8s 实现端口转发的原理

- 监听本地端口，本地请求此端口，产生 conn1
- k8s apiserver 监听端口
- 本地连接上 apiserver 的监听端口，产生 conn2
- apiserver 和 pod 之间建立连接 conn3(后面发现这里的认知是错误的，正确的方式)
- apiserver 和 pod 之间，使用 socat 和 nsenter 实现 stream 的copy（docker），使用 pkg/netns/netns_linux.go:211，可以在指定的进程中监听网络，端口不会冲突(
  containerd)（这都什么神仙操作，学废了:)，不过这都是之后看源码发现的）

然后追踪了一下 client-go 中的 port-forward 源码，发现上面提到的本地和apiserver建立的连接 conn2 是复用的，而复用带来的问题就是不会及时的检查此连接是否有效
vendor/k8s.io/client-go/tools/portforward/portforward.go:188

```go
package image

func (pf *PortForwarder) ForwardPorts() error {
	defer pf.Close()

	var err error
	pf.streamConn, _, err = pf.dialer.Dial(portforward.PortForwardProtocolV1Name) // 这里建立了一个和apiserver的连接，后续就没有尝试重新建立连接了
	if err != nil {
		return fmt.Errorf("error upgrading connection: %s", err)
	}
	defer pf.streamConn.Close()

	return pf.forward()
}
```

vendor/k8s.io/client-go/tools/portforward/portforward.go:324

```go
package image

func (pf *PortForwarder) handleConnection(conn net.Conn, port ForwardedPort) {
	...
	// create error stream
	headers := http.Header{}
	headers.Set(v1.StreamType, v1.StreamTypeError)
	headers.Set(v1.PortHeader, fmt.Sprintf("%d", port.Remote))
	headers.Set(v1.PortForwardRequestIDHeader, strconv.Itoa(requestID))
	errorStream, err := pf.streamConn.CreateStream(headers) // 使用和apiserver的连接，建立一个错误流，这里都没有检查此连接的可用性
	if err != nil {
		runtime.HandleError(fmt.Errorf("error creating error stream for port %d -> %d: %v", port.Local, port.Remote, err))
		return
	}
	// create data stream
	headers.Set(v1.StreamType, v1.StreamTypeData)
	dataStream, err := pf.streamConn.CreateStream(headers) //使用和apiserver的连接，建立一个数据流，这里也没雨检查此链接的可用性
	if err != nil {
		runtime.HandleError(fmt.Errorf("error creating forwarding stream for port %d -> %d: %v", port.Local, port.Remote, err))
		return
	}
	...
	go func() {
		// Copy from the remote side to the local port.
		if _, err := io.Copy(conn, dataStream); err != nil && !strings.Contains(err.Error(), "use of closed network connection") {
			runtime.HandleError(fmt.Errorf("error copying from remote stream to local connection: %v", err))
		}
	}()
	...
	go func() {
		// Copy from the local port to the remote side.
		if _, err := io.Copy(dataStream, conn); err != nil && !strings.Contains(err.Error(), "use of closed network connection") {
			runtime.HandleError(fmt.Errorf("error copying from local connection to remote stream: %v", err))
			// break out of the select below without waiting for the other copy to finish
			close(localError)
		}
	}()
}
```

也即是说本地和 api-server 的连接可用性得不到保证，那么此连接断开了，就无法正确的转发请求了，因此解决方法也是很简单，在这里加个重试，
当旧的pf.streamConn create stream 失败了或者超时了，就认为此连接不可用了，然后重新建立连接即可，如下

```go
package image

func (pf *PortForwarder) tryToCreateStream(header http.Header) (httpstream.Stream, error) {
	errorChan := make(chan error)
	resultChan := make(chan httpstream.Stream)
	time.AfterFunc(time.Second*1, func() {
		errorChan <- errors.New("timeout")
	})
	go func() {
		stream, err := pf.streamConn.CreateStream(header)
		if err == nil {
			errorChan <- nil
			resultChan <- stream
		} else {
			errorChan <- err
		}
	}()
	if err := <-errorChan; err == nil {
		return <-resultChan, nil
	}
	// close old connection in case of resource leak
	_ = pf.streamConn.Close()
	var err error
	pf.streamConn, _, err = pf.dialer.Dial(portforward.PortForwardProtocolV1Name)
	if err != nil {
		runtime.HandleError(fmt.Errorf("error upgrading connection: %s", err))
		return nil, err
	}
	if stream, err := pf.streamConn.CreateStream(header); err == nil {
		return stream, nil
	}
	return nil, err
}
```

## 深入探究一下 k8s 的 port-forward 机制，为什么 docker 不会出现这个问题尼？

### dockershim 的端口转发

让我们来翻看一下 kubernetes 关于 portforward 的代码
pkg/kubelet/dockershim/docker_streaming_others.go:32

```go
package image

func (r *streamingRuntime) portForward(podSandboxID string, port int32, stream io.ReadWriteCloser) error {
	container, err := r.client.InspectContainer(podSandboxID)
	if err != nil {
		return err
	}

	if !container.State.Running {
		return fmt.Errorf("container not running (%s)", container.ID)
	}

	containerPid := container.State.Pid
	socatPath, lookupErr := exec.LookPath("socat")
	if lookupErr != nil {
		return fmt.Errorf("unable to do port forwarding: socat not found")
	}

	args := []string{"-t", fmt.Sprintf("%d", containerPid), "-n", socatPath, "-", fmt.Sprintf("TCP4:localhost:%d", port)}

	nsenterPath, lookupErr := exec.LookPath("nsenter")
	if lookupErr != nil {
		return fmt.Errorf("unable to do port forwarding: nsenter not found")
	}

	commandString := fmt.Sprintf("%s %s", nsenterPath, strings.Join(args, " "))
	klog.V(4).InfoS("Executing port forwarding command", "command", commandString)

	command := exec.Command(nsenterPath, args...)
	command.Stdout = stream

	stderr := new(bytes.Buffer)
	command.Stderr = stderr

	inPipe, err := command.StdinPipe()
	if err != nil {
		return fmt.Errorf("unable to do port forwarding: error creating stdin pipe: %v", err)
	}
	go func() {
		io.Copy(inPipe, stream)
		inPipe.Close()
	}()

	if err := command.Run(); err != nil {
		return fmt.Errorf("%v: %s", err, stderr.String())
	}

	return nil
}
```

可以看到，这里的端口转发的原理是通过 socat和 nsenter 来实现的，也即是 nsenter 可以进入 pod 所在进程的namespace（此 namespace 是 linux 中的 namespace 概念，不是 k8s
中的）
然后使用socat做端口映射。然后将本地和 apiserver 建立的连接 conn2，使用 io.copy 到 exec.command 的 stdinPipeline 中，只要命令不返回，这个端口转发总是有效的

### containerd 的端口转发

pkg/cri/server/sandbox_portforward_linux.go:35

```go
package image

func (c *criService) portForward(ctx context.Context, id string, port int32, stream io.ReadWriteCloser) error {
	s, err := c.sandboxStore.Get(id)
	if err != nil {
		return errors.Wrapf(err, "failed to find sandbox %q in store", id)
	}

	var netNSDo func(func(ns.NetNS) error) error
	// netNSPath is the network namespace path for logging.
	var netNSPath string
	securityContext := s.Config.GetLinux().GetSecurityContext()
	hostNet := securityContext.GetNamespaceOptions().GetNetwork() == runtime.NamespaceMode_NODE
	if !hostNet {
		if closed, err := s.NetNS.Closed(); err != nil {
			return errors.Wrapf(err, "failed to check netwok namespace closed for sandbox %q", id)
		} else if closed {
			return errors.Errorf("network namespace for sandbox %q is closed", id)
		}
		netNSDo = s.NetNS.Do
		netNSPath = s.NetNS.GetPath()
	} else {
		// Run the function directly for host network.
		netNSDo = func(do func(_ ns.NetNS) error) error {
			return do(nil)
		}
		netNSPath = "host"
	}

	log.G(ctx).Infof("Executing port forwarding in network namespace %q", netNSPath)
	err = netNSDo(func(_ ns.NetNS) error {
		defer stream.Close()
		var conn net.Conn
		conn, err := net.Dial("tcp4", fmt.Sprintf("localhost:%d", port))
		if err != nil {
			var errV6 error
			conn, errV6 = net.Dial("tcp6", fmt.Sprintf("localhost:%d", port))
			if errV6 != nil {
				return fmt.Errorf("failed to connect to localhost:%d inside namespace %q, IPv4: %v IPv6 %v ", port, id, err, errV6)
			}
		}
		defer conn.Close()

		errCh := make(chan error, 2)
		// Copy from the the namespace port connection to the client stream
		go func() {
			log.G(ctx).Debugf("PortForward copying data from namespace %q port %d to the client stream", id, port)
			_, err := io.Copy(stream, conn)
			errCh <- err
		}()

		// Copy from the client stream to the namespace port connection
		go func() {
			log.G(ctx).Debugf("PortForward copying data from client stream to namespace %q port %d", id, port)
			_, err := io.Copy(conn, stream)
			errCh <- err
		}()

		// Wait until the first error is returned by one of the connections
		// we use errFwd to store the result of the port forwarding operation
		// if the context is cancelled close everything and return
		var errFwd error
		select {
		case errFwd = <-errCh:
			log.G(ctx).Debugf("PortForward stop forwarding in one direction in network namespace %q port %d: %v", id, port, errFwd)
		case <-ctx.Done():
			log.G(ctx).Debugf("PortForward cancelled in network namespace %q port %d: %v", id, port, ctx.Err())
			return ctx.Err()
		}
		...
		return errFwd
	})

	if err != nil {
		return errors.Wrapf(err, "failed to execute portforward in network namespace %q", netNSPath)
	}
	log.G(ctx).Infof("Finish port forwarding for %q port %d", id, port)

	return nil
}
```

可以看到，这里没有使用到 socat 和 nsenter，而是在进程所在的 namespace（ linux 中的 namespace 概念） 中直接拨号的目标端口，产生conn3, 然后使用 io.copy(conn2, conn3)
和io.copy(conn3, conn2)，实现socat的功能
，而进入进程所在的 namespace（ linux 的 namespace ）使用的是 NetNS.do()
方法，vendor/github.com/containernetworking/plugins/pkg/ns/ns_linux.go:79
而 containerd 这里使用的是原生的 io.copy，遇到 io.EOF 就退出了
