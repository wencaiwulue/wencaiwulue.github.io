# 调用 replitLM

# CPU 模式

```shell
from transformers import AutoModelForCausalLM, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained('/root/howard/replit-code-v1-3b', trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained('/root/howard/replit-code-v1-3b', trust_remote_code=True)

x = tokenizer.encode('# 写一个快速排序', return_tensors='pt')
x = tokenizer.encode('func (h *wsHandler) handle(w http.ResponseWriter, r *http.Request) {\n    applog.Debugw("handle ws request", "url", r.URL.String(), "header", r.Header)\n    wsID := r.URL.Query().Get("WorkspaceID")\n    # 根据 wsID 查询 url，反向代理', return_tensors='pt')
x = tokenizer.encode('func fibonacci(n int) {', return_tensors='pt')
x = tokenizer.encode('# 写一个 http server ', return_tensors='pt')

y = model.generate(x, max_length=200, do_sample=True, top_p=0.95, top_k=4, temperature=0.8, num_return_sequences=1, eos_token_id=tokenizer.eos_token_id)

# decoding, clean_up_tokenization_spaces=False to ensure syntactical correctness
print(tokenizer.decode(y[0], skip_special_tokens=True, clean_up_tokenization_spaces=False))
```

# GPU 模式

```shell
from transformers import AutoModelForCausalLM, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("/root/howard/replit-code-v1_5-3b", trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained("/root/howard/replit-code-v1_5-3b", trust_remote_code=True).half().cuda()

inputs = tokenizer('讲个笑话', return_tensors="pt").to(model.device)

outputs = model.generate(**inputs, do_sample=True, temperature=0.1, top_p=0.95, max_new_tokens=100)
outputs = model.generate(**inputs, do_sample=True, temperature=0.1, top_p=0.95, max_new_tokens=100, top_k=4, num_return_sequences=1, eos_token_id=tokenizer.eos_token_id)

print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

## 输入

```shell
x = tokenizer.encode('func fibonacci(n int) {', return_tensors='pt')
```

## 输出

```text
func fibonacci(n int) {
	if n == 0 {
		return
	}
	if n == 1 {
		fmt.Println(0)
		return
	}
	fibonacci(n - 1)
	fmt.Println(n)
}

func main() {
	fibonacci(7)
}
```

```text
func fibonacci(n int) {
	if n < 2 {
		fmt.Println(n)
		return
	}
	fibonacci(n - 1)
	fibonacci(n - 2)
}

func main() {
	fibonacci(7)
}
```

```text
func (h *wsHandler) handle(w http.ResponseWriter, r *http.Request) {
  applog.Debugw("handle ws request", "url", r.URL.String(), "header", r.Header)
    wsID := r.URL.Query().Get("WorkspaceID")
    if wsID == "" {
        http.Error(w, "WorkspaceID is required", http.StatusBadRequest)
        
```

```text
func (h *wsHandler) handle(w http.ResponseWriter, r *http.Request) {
    applog.Debugw("handle ws request", "url", r.URL.String(), "header", r.Header)
    wsID := r.URL.Query().Get("WorkspaceID")
    if wsID == "" {
        applog.Errorw("invalid ws id", "url", r.
```

```text
// 写一个快速排序的函数,它的时间复杂度是O(nlogn)
// 它的空间复杂度是O(n)
func QuickSort(arr []int) {
	if len(arr) <= 1 {
		return
	}
	// 选择一个基准值,一般是第一个元素
	pivot := arr[0]
	// 定义两个指针,一个指向小于基准值
```

```text
// 写一个快速排序的函数
// 使用递归
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  let pivot = arr.shift();
  let left = [];
  let right = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < pivot) {
      left
```

```shell
>>> x = tokenizer.encode('// 写一个 http server ', return_tensors='pt')
>>> y = model.generate(x, max_length=200, do_sample=True, top_p=0.95, top_k=4, temperature=0.2, num_return_sequences=1, eos_token_id=tokenizer.eos_token_id)
The attention mask and the pad token id were not set. As a consequence, you may observe unexpected behavior. Please pass your input's `attention_mask` to obtain reliable results.
Setting `pad_token_id` to `eos_token_id`:1 for open-end generation.
>>> generated_code = tokenizer.decode(y[0], skip_special_tokens=True, clean_up_tokenization_spaces=False)
>>> print(generated_code)
// 写一个 http server , 监听 3000 端口
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});
server.listen(3000);
console.log('Server running at http://127.0.0.1:3000/');
```

## 输入

```text
x = tokenizer.encode('func (h *wsHandler) handle(w http.ResponseWriter, r *http.Request) {\n    applog.Debugw("handle ws request", "url", r.URL.String(), "header", r.Header)\n    wsID := r.URL.Query().Get("WorkspaceID")\n    # 根据 wsID 查询 url，反向代理', return_tensors='pt')
```

## 输出

```text
func (h *wsHandler) handle(w http.ResponseWriter, r *http.Request) {
    applog.Debugw("handle ws request", "url", r.URL.String(), "header", r.Header)
    wsID := r.URL.Query().Get("WorkspaceID")
    # 根据 wsID 查询 url,反向代理到 ws 服务
    wsURL := h.wsURL(wsID)
    if wsURL == "" {
        applog.Errorw("handle ws request", "url", r.URL.String(), "header", r.Header, "error", "ws not found")
        http.Error(w, "ws not found", http.StatusNotFound)
        return
    }
    # 根据 wsURL 创建 ws 连接
    wsConn, err := websocket
```

```shell
func (h *wsHandler) handle(w http.ResponseWriter, r *http.Request) {
    applog.Debugw("handle ws request", "url", r.URL.String(), "header", r.Header)
    wsID := r.URL.Query().Get("WorkspaceID")
    # 根据 wsID 查询 url,反向代理到 ws 服务
    if wsID == "" {
        applog.Errorw("handle ws request", "url", r.URL.String(), "header", r.Header, "error", "WorkspaceID is empty")
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    url, err := h.workspace.GetWorkspaceURL(wsID)
    if err != nil {
        applog.Errorw("handle ws request", "url",
```