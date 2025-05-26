```shell
➜  ~ go tool pprof http://localhost:41203/debug/pprof/profile\?seconds\=30
Fetching profile over HTTP from http://localhost:41203/debug/pprof/profile?seconds=30
Saved profile in /Users/bytedance/pprof/pprof.kubevpn.samples.cpu.005.pb.gz
File: kubevpn
Type: cpu
Time: Mar 31, 2024 at 9:42am (CST)
Duration: 39.44s, Total samples = 62.90s (159.48%)
Entering interactive mode (type "help" for commands, "o" for options)
(pprof) top
Showing nodes accounting for 59.22s, 94.15% of 62.90s total
Dropped 38 nodes (cum <= 0.31s)
Showing top 10 nodes out of 39
      flat  flat%   sum%        cum   cum%
    40.10s 63.75% 63.75%     50.52s 80.32%  runtime.siftdownTimer
     7.56s 12.02% 75.77%      8.11s 12.89%  runtime.findObject
     4.69s  7.46% 83.23%      4.70s  7.47%  runtime.chansend
     2.20s  3.50% 86.72%      9.65s 15.34%  runtime.wbBufFlush1
     1.59s  2.53% 89.25%      1.59s  2.53%  time.Now
     0.91s  1.45% 90.70%      0.91s  1.45%  runtime.heapBitsForAddr
     0.72s  1.14% 91.84%     10.37s 16.49%  runtime.gcWriteBarrier
     0.53s  0.84% 92.69%      1.01s  1.61%  runtime.greyobject
     0.47s  0.75% 93.43%      0.47s  0.75%  runtime/internal/atomic.(*Uint32).CompareAndSwap
     0.45s  0.72% 94.15%      3.87s  6.15%  runtime.scanobject
(pprof) exit
```