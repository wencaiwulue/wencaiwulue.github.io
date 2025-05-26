```shell
GOOS=linux CGO_ENABLED=1 GOARCH=amd64  CC=x86_64-linux-musl-cc  CXX=x86_64-linux-musl-cc++ go build -tags dynamic code.byted.org/epscp/bioos/cmd/apiserver
```

更详细的日志

```shell
GOOS=linux CGO_ENABLED=1 GOARCH=amd64  CC=x86_64-linux-musl-cc  CXX=x86_64-linux-musl-cc++ go build -tags dynamic -x code.byted.org/epscp/bioos/cmd/apiserver
```

```shell
BINS=apiserver PLATFORM=linux_amd64 make go.build
```