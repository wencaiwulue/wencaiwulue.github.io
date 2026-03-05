# Claude code 使用豆包模型

## 步骤

实际上只需要编辑 `~/.claude/settings.json` 文件

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "xxx",
    "ANTHROPIC_BASE_URL": "https://ark.cn-beijing.volces.com/api/compatible",
    "ANTHROPIC_MODEL": "deepseek-v3-2-251201",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "permissions": {
    "allow": [],
    "deny": []
  },
  "enabledPlugins": {
    "document-skills@anthropic-agent-skills": true,
    "example-skills@anthropic-agent-skills": true,
    "kubevpn-skills@anthropic-agent-skills": true
  }
}
```

## 大坑

需要注意，这里的 `BASE_URL`

```text
https://ark.cn-beijing.volces.com/api/compatible
```

而不是官方文档中写的

```text
https://ark.cn-beijing.volces.com/api/v3/responses
```