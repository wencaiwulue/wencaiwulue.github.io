```shell
curl -sK -v http://172.17.66.220:6000/debug/pprof > heap.out
go tool pprof -http=:44444 heap.out
brew install graphviz
http://localhost:30125/debug/pprof
http://127.0.0.1:44444/ui
```

```shell
go tool pprof -http=:44444 http://localhost:6060/debug/pprof/profile\?seconds\=60
```

```text
https://pkg.go.dev/net/http/pprof
```
