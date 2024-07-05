## 下载模型文件

需要提前安装 `git-lfs`

```shell
git clone https://huggingface.co/replit/replit-code-v1_5-3b
```

```shell
pip install einops torch transformers
```

```shell
from transformers import AutoTokenizer, AutoModelForCausalLM
tokenizer = AutoTokenizer.from_pretrained("/root/.config/replit-code-v1_5-3b", trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained("/root/.config/replit-code-v1_5-3b", trust_remote_code=True).cuda()
model = model.eval()
response, history = model.chat(tokenizer, "你好", history=[])
print(response)
```