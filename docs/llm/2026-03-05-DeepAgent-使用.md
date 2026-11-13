# DeepAgent 使用

直接使用如下方式配置。

```shell
export ANTHROPIC_API_KEY=xxx
export ANTHROPIC_BASE_URL=https://ark.cn-beijing.volces.com/api/compatible
export ANTHROPIC_MODEL=glm-4-7-251222
```

```shell
deepagents --model-params '{"max_tokens": "32768"}'
```

还需要配置 max_tokens，否则会报错如下

```text
Error: Agent error: Error code: 400 - {'error': {'code': 'InvalidParameter', 'message': 'The parameter `max_tokens` specified in the request is not valid: integer above maximum value, expected a value <= 32768, but got 64000 instead. Request id: 0217726819022521e8917f6489049782b636a98f4bd750c7633f1', 'param': 'max_tokens', 'type': 'BadRequest'}}
```