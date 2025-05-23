使用 accelerate 启动分布式训练。

单机多卡：

```shell
accelerate launch --multi_gpu --machine_rank "0" --num_machines "1" --num_processes "2" main.py
```
