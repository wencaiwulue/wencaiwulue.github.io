## 要做什么

代理 JupyterLab，在节点上安装了 jupyterLab，现在想要在浏览器中访问 jupyterLab。需要代理静态资源

## 做了什么

启动了一个 proxy pod，专门做代理，此 pod 可以访问到 node 上的 jupyterLab。

## 配置

cat config.py

```text
c = get_config()
c.ServerApp.allow_root=True
c.ServerApp.allow_remote_access=True
c.ServerApp.ip="0.0.0.0"
c.ServerApp.port=36936
c.ServerApp.root_dir="/shared/vnctest"
c.ServerApp.token="rp0fJ5hZIDPV"
c.ServerApp.base_url="/api/proxy/192.168.0.8/36936/"
```

cat test.sh

```text
#!/bin/bash
spack compiler add "$(spack location -i llvm)"
spack load py-jupyterlab
jupyter lab --config=config.py
```

## 直接贴代码

```text
package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"regexp"
)

func main() {
	http.Handle("/api/proxy/", http.HandlerFunc(ApiProxyHandler))
	server := &http.Server{Addr: ":8080"}
	server.ListenAndServe()
}

func ApiProxyHandler(w http.ResponseWriter, r *http.Request) {
	compile, err2 := regexp.Compile("api/proxy/web/(.*?)/(.*?)/")
	if err2 != nil {
		panic(err2)
	}
	submatch := compile.FindStringSubmatch(r.URL.RequestURI())
	if len(submatch) != 3 {
		panic("should not happen")
	}
	backend := fmt.Sprintf("%s://%s:%s", "http", submatch[1], submatch[2]) + r.RequestURI
	backendURL, err := url.Parse(backend)
	if err != nil {
		panic(err)
	}
	backendURL.Path = r.URL.Path 
    proxy := httputil.NewSingleHostReverseProxy(backendURL)
    proxy.ServeHTTP(w, r)
}
```

常规代理

记得设置 Path

```text
backendURL.Path = r.URL.Path 
proxy := httputil.NewSingleHostReverseProxy(backendURL)
proxy.ServeHTTP(w, r)
```

[JupyterLab 代理效果.mp4](JupyterLab%20%E4%BB%A3%E7%90%86%E6%95%88%E6%9E%9C.mp4)