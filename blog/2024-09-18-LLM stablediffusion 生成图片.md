---
title: LLM StableDiffusion 生成图片
authors: naison
tags: [ LLM, StableDiffusion, 文生图 ]
---

# LLM StableDiffusion 生成图片

## 背景

需要使用 [StableDiffusion](https://github.com/Stability-AI/stablediffusion) 文生图。

## 环境

- 本地 mac 能够访问到 HuggingFace
- Linux 主机有 GPU 卡

由于 linux 主机无法访问到 HuggingFace，因此在本地电脑上下载好，然后上传到 linux 服务器。

## 步骤

#### 本地下载模型文件

```shell
huggingface-cli download stabilityai/stable-diffusion-2-1 --local-dir ~/stable-diffusion
```

#### 使用 rsync 上传到 Linux 主机

```shell
rsync -e "ssh -i ~/.ssh/common.pem" -aP ~/stable-diffusion root@10.0.1.45:/shared/llm-models
```

#### 或者直接在 Linux 主机上配置 mirror 源

```shell
export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download stabilityai/stable-diffusion-2-1 --local-dir ~/stable-diffusion
```

#### 安装 python 依赖

```shell
pip install fastchat diffusers torch
```

#### 使用 python 代码调用文生图

```python
from diffusers import StableDiffusionPipeline

# 加载模型
model_id = "/shared/llm-models/stable-diffusion/"
pipe = StableDiffusionPipeline.from_pretrained(model_id)
pipe.to("cuda")  # 或者使用 "cpu"
image = pipe("generate a dog").images[0]
image.save("generated_image.png")
print("Image generated and saved as 'generated_image.png'.")
```

```shell
(base) root@iv-yczfw5rmkgcva4frh5tu:~# python img.py
Loading pipeline components...:  17%|█████████████████▌                                                                                       | 1/6 [00:00<00:04,  1.12it/s]/root/miniconda3/lib/python3.12/site-packages/transformers/tokenization_utils_base.py:1601: FutureWarning: `clean_up_tokenization_spaces` was not set. It will be set to `True` by default. This behavior will be depracted in transformers v4.45, and will be then set to `False` by default. For more details check this issue: https://github.com/huggingface/transformers/issues/31884
  warnings.warn(
Loading pipeline components...: 100%|█████████████████████████████████████████████████████████████████████████████████████████████████████████| 6/6 [00:01<00:00,  4.27it/s]
100%|███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████| 50/50 [00:19<00:00,  2.52it/s]
Image generated and saved as 'generated_image.png'.
(base) root@iv-yczfw5rmkgcva4frh5tu:~# ls
generated_image.png   img.py
(base) root@iv-yczfw5rmkgcva4frh5tu:~# cat img.py
```

#### 下载生成的图片到本地

```shell
scp -i ~/.ssh/common.pem root@10.0.1.45:~/generated_image.png generated_image.png
```

#### 查看效果

![generated_image.png](stablediffusion/generated_image.png)