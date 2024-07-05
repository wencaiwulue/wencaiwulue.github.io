---
license: apache-2.0
datasets:
  - bigcode/the-stack-dedup
  - togethercomputer/RedPajama-Data-1T
tags:
  - code
  - Composer
  - MosaicML
  - llm-foundry
  - StreamingDatasets
language:
  - code
---

# Replit Code V-1.5 3B

Developed by: Replit, Inc.

## Model Description

Replit Code v1.5 is a 3.3B parameter Causal Language Model focused on **Code Completion**.

The model is trained in `bfloat16` on 1T tokens of code (~200B tokens  over 5 epochs, including linear cooldown) for 30 programming languages from a subset of permissively licensed code from Bigcode's [Stack Dedup dataset](https://huggingface.co/datasets/bigcode/the-stack-dedup), a filtered natural language sample from Markdown and reStructuredText subsets from the same Stack Dedup dataset, and a dev-oriented sample from  [RedPajama's StackExchange dataset](https://github.com/togethercomputer/RedPajama-Data) sourced from the [Stack Exchange Data Dump by Stack Exchange Inc](https://archive.org/details/stackexchange).

The 30 programming languages are: 
```
Java, JavaScript, C, PHP, Python, C++, C#, TypeScript, Go, CSS, HTML, Rust, Ruby, Swift, Scala, Shell, Lua, Perl, Haskell, JSX, Julia, Common Lisp, OCaml, Solidity, Scheme, R, Zig, SQL, Racket, D
```

The context size of the model is 4096 tokens. We use the GPTNeoX tokenizer with a custom trained and optimized vocabulary of 32768 tokens. This custom vocabulary led to single-digit % points on compression while maintaining or improving coverage on our training corpus.

The model has been trained on the [MosaicML](https://www.mosaicml.com/) platform on 128  H100-80GB GPUs using their [LLM Foundry](https://github.com/mosaicml/llm-foundry) and [Composer](https://github.com/mosaicml/composer) training library built on top of PyTorch.

## Dependencies
You will need to install the latest versions of the following dependencies:
```
einops
torch
transformers
```

## How to Use

### Generation

You can generate code using the `transformers` library as follows:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained('replit/replit-code-v1_5-3b', trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained('replit/replit-code-v1_5-3b', trust_remote_code=True)

x = tokenizer.encode('def fibonacci(n): ', return_tensors='pt')
y = model.generate(x, max_length=100, do_sample=True, top_p=0.95, top_k=4, temperature=0.2, num_return_sequences=1, eos_token_id=tokenizer.eos_token_id)

# decoding
generated_code = tokenizer.decode(y[0], skip_special_tokens=True, clean_up_tokenization_spaces=False)
print(generated_code)
```

Experiment with different decoding methods and parameters to get the best results for your use case.

### Using Triton Implementation of Flash Attention

```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoConfig

config = AutoConfig.from_pretrained(
    "replit/replit-code-v1_5-3b",
    trust_remote_code=True
)
config.attn_config['attn_impl'] = 'triton'

# load model
tokenizer = AutoTokenizer.from_pretrained('replit/replit-code-v1_5-3b', trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained('replit/replit-code-v1_5-3b', config=config, trust_remote_code=True)
model.to(device='cuda:0', dtype=torch.bfloat16)

# forward pass
x = tokenizer.encode('def fibonacci(n): ', return_tensors='pt').to(device='cuda:0')
x = x.to(device='cuda:0')
y = model.generate(x, max_length=100, do_sample=True, top_p=0.95, top_k=4, temperature=0.2, num_return_sequences=1, eos_token_id=tokenizer.eos_token_id)


# decoding
generated_code = tokenizer.decode(y[0], skip_special_tokens=True, clean_up_tokenization_spaces=False)
print(generated_code)
```

Experiment with different decoding methods and parameters to get the best results for your use case. We recommend experimenting with `temperature` and `reptition_penalty`for optimal performance on your use case!

## Intended Use

Replit intends this model be used by anyone as a foundational model for application-specific fine-tuning without strict limitations on commercial use.

The model is trained specifically for code completion tasks.


## Limitations
The pre-training dataset may have contained offensive or inappropriate content even after applying data cleansing and toxicity and profanity filters, and such content may be reflected in model generated text. We recommend that users exercise reasonable caution when using in production systems. Do not use for any applications that may cause harm or distress to individuals or groups.
