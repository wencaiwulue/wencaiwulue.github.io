```text
/Users/bytedance/GolandProjects/lm-evaluation-harness/.venv/bin/python /Users/bytedance/GolandProjects/lm-evaluation-harness/.venv/bin/lm_eval --model doubao --tasks gsm8k --output_path /Users/bytedance/GolandProjects/lm-evaluation-harness/result --log_samples --model_args model=facebook/opt-125m,base_url=http://localhost:8000/chat/completions,num_concurrent=1,max_retries=1,tokenized_requests=False 
2024-09-09:12:31:32,220 INFO     [__main__.py:272] Verbosity set to INFO
2024-09-09:12:31:32,276 INFO     [__init__.py:491] `group` and `group_alias` keys in tasks' configs will no longer be used in the next release of lm-eval. `tag` will be used to allow to call a collection of tasks just like `group`. `group` will be removed in order to not cause confusion with the new ConfigurableGroup which will be the offical way to create groups with addition of group-wide configuations.
2024-09-09:12:31:36,844 INFO     [__main__.py:376] Selected Tasks: ['gsm8k']
2024-09-09:12:31:36,846 INFO     [evaluator.py:158] Setting random seed to 0 | Setting numpy seed to 1234 | Setting torch manual seed to 1234
2024-09-09:12:31:36,846 INFO     [evaluator.py:195] Initializing doubao model, with arguments: {'model': 'facebook/opt-125m', 'base_url': 'http://localhost:8000/chat/completions', 'num_concurrent': 1, 'max_retries': 1, 'tokenized_requests': False}
2024-09-09:12:31:36,846 INFO     [api_models.py:110] Concurrent requests are disabled. To enable concurrent requests, set `num_concurrent` > 1.
2024-09-09:12:31:36,846 INFO     [api_models.py:120] Using tokenizer huggingface
/Users/bytedance/GolandProjects/lm-evaluation-harness/.venv/lib/python3.10/site-packages/transformers/tokenization_utils_base.py:1601: FutureWarning: `clean_up_tokenization_spaces` was not set. It will be set to `True` by default. This behavior will be depracted in transformers v4.45, and will be then set to `False` by default. For more details check this issue: https://github.com/huggingface/transformers/issues/31884
  warnings.warn(
2024-09-09:12:31:48,832 INFO     [evaluator.py:274] Setting fewshot random generator seed to 1234
2024-09-09:12:31:48,833 INFO     [task.py:423] Building contexts for gsm8k on rank 0...
100%|██████████| 1319/1319 [00:02<00:00, 640.81it/s]
2024-09-09:12:31:50,906 INFO     [evaluator.py:457] Running generate_until requests
Requesting API: 100%|██████████| 1319/1319 [1:09:23<00:00,  3.16s/it]
2024-09-09:13:41:22,089 INFO     [evaluation_tracker.py:206] Saving results aggregated
2024-09-09:13:41:22,091 INFO     [evaluation_tracker.py:287] Saving per-sample results for: gsm8k
doubao (model=facebook/opt-125m,base_url=http://localhost:8000/chat/completions,num_concurrent=1,max_retries=1,tokenized_requests=False), gen_kwargs: (None), limit: None, num_fewshot: None, batch_size: 1
|Tasks|Version|     Filter     |n-shot|  Metric   |   |Value |   |Stderr|
|-----|------:|----------------|-----:|-----------|---|-----:|---|-----:|
|gsm8k|      3|flexible-extract|     5|exact_match|↑  |0.6384|±  |0.0132|
|     |       |strict-match    |     5|exact_match|↑  |0.5868|±  |0.0136|


Process finished with exit code 0

```