```shell
EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0
```

```shell
EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 blob:quickparts*
```

```shell
select 8
```

```shell
EVAL "local keys = redis.call('keys', ARGV[1]) \n for i=1,#keys,5000 do \n redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) \n end \n return keys" 0 blob:quickparts*
```

