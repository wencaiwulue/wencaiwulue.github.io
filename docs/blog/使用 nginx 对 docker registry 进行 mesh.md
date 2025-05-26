### 需求

推送镜像时，根据不同的 header 推送到不同的仓库

### 伪代码

```go
package image

// Param 输入参数
type Param struct {
	Src  Entry `json:"src"`
	Dest Entry `json:"dest"`
	// 代理域名，通过这个代理域名，向 Dest 仓库推送镜像
	ProxyDomain string `json:"proxy_domain"`
}

// Transfer ...
func Transfer(param Param, annos ...map[string]string) error {
	var transport = http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{
		InsecureSkipVerify: true,
	}

	var roundTripper http.RoundTripper = transport
	// proxy from dev to product
	if param.ProxyDomain != "" {
		index := strings.Index(param.Dest.Image, "/")
		imageName := param.Dest.Image[index+1:]
		originDstDomain := param.Dest.Image[:index]
		param.Dest.Image = fmt.Sprintf("%s/%s", param.ProxyDomain, imageName)
		roundTripper = &ProxyTransport{Transport: transport, domain: originDstDomain}
	}

	var err error
	var srcImage gcrv1.Image
	{ // 1. pull image
		var srcOptions []crane.Option
		srcOptions = append(srcOptions, crane.WithTransport(roundTripper))
		srcOptions = append(srcOptions, crane.Insecure)
		srcImage, err = crane.Pull(param.Src.Image, srcOptions...)
		if err != nil {
			return err
		}
	}

	{ // 2. push image
		var destOptions []crane.Option
		destOptions = append(destOptions, crane.WithTransport(roundTripper))
		destOptions = append(destOptions, crane.Insecure)
		err = crane.Push(srcImage, param.Dest.Image, destOptions...)
	}
	return err
}
```

```go
package image

type ProxyTransport struct {
	Transport *http.Transport
	domain    string
}

func (t *ProxyTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("mesh", t.domain)
	return t.Transport.RoundTrip(req)
}
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: naison
data:
  nginx.conf: |
    user nginx;
    worker_processes  1;

    error_log  /var/log/nginx/error.log warn;

    events {
      worker_connections  10240;
    }
    http {
      include       /etc/nginx/mime.types;
      default_type  application/octet-stream;

      access_log  /var/log/nginx/access.log  main;

      sendfile        on;
      keepalive_timeout  65;
      client_max_body_size 3000M;

      server {
          listen 80;
          autoindex off;

          resolver coredns.kube-system.svc.cluster.local;
          set $target $http_mesh;


          location / {
            proxy_hide_header Www-authenticate;
            add_header Www-authenticate "Bearer realm=\"http://$host:$server_port/service/token\",service=\"harbor-registry\"" always;

            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_pass_request_body on;
            proxy_set_header Host $target;

            proxy_pass http://$target;
            proxy_redirect off;
          }
      }
    server {
          listen 31443;
          resolver coredns.kube-system.svc.cluster.local;
          set $target $http_mesh;

          location / {
            proxy_hide_header Www-authenticate;
            add_header Www-authenticate "Bearer realm=\"https://$host:$server_port/service/token\",service=\"harbor-registry\"" always;

            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_pass_request_body on;
            proxy_set_header Host $proxy_host;

            proxy_pass https://$target;
            proxy_redirect off;
          }
      }
    }

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: naison
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 1
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: vecps.cargo.io/infcprelease/nginx:1.15.5-alpine-multiarch
          ports:
            - name: http
              protocol: TCP
            - containerPort: 31443
              protocol: TCP
          volumeMounts:
            - name: nginx-conf
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
              readOnly: false
      volumes:
        - name: nginx-conf
          configMap:
            name: nginx-config
            items:
              - key: nginx.conf
                path: nginx.conf

---
apiVersion: v1
kind: Service
metadata:
  name: nginx
  namespace: naison
spec:
  type: NodePort
  ports:
    - port: 80
      name: "80"
      protocol: TCP
      targetPort: 80
      nodePort: 31080
    - port: 31443
      name: "443"
      protocol: TCP
      targetPort: 31443
      nodePort: 31443
  selector:
    app: nginx
```