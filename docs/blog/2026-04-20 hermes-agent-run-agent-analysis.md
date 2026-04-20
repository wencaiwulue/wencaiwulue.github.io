---
title: 深度解析 Hermes Agent：一个 12000+ 行代码的 AI Agent 框架
authors: naison
tags: [ 'hermes', 'ai-agent', 'tool-calling', 'python' ]
---

## 简介

[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) 是一个功能完整的 AI Agent
框架，其核心文件 `run_agent.py` 超过 **12,600 行**代码。这篇文章将深入解析其架构设计、核心功能和实现细节。

## 文件概览

```
文件名: run_agent.py
行数: 12,620 行
主要语言: Python 3
许可证: 基于代码仓库推断为开源项目
```

### 核心依赖

```python
# 主要外部库
openai          # OpenAI SDK，支持多提供商
fire            # CLI 命令行接口
anthropic       # Anthropic SDK (条件导入)
boto3           # AWS Bedrock 支持

# 标准库
asyncio, threading, concurrent.futures  # 并发处理
json, re, hashlib, base64               # 数据处理
tempfile, pathlib                       # 文件操作
```

## 核心架构

### 1. AIAgent 主类

`AIAgent` 是整个框架的核心，负责管理对话流程、工具执行和响应处理：

```python
class AIAgent:
    """
    AI Agent with tool calling capabilities.

    Manages the conversation flow, tool execution, and response handling
    for AI models that support function calling.
    """

    def __init__(
        self,
        base_url: str = None,
        api_key: str = None,
        model: str = "",
        max_iterations: int = 90,  # 默认最大迭代次数
        enabled_toolsets: List[str] = None,
        disabled_toolsets: List[str] = None,
        # ... 更多参数
    ):
```

### 2. 多 API 模式支持

框架支持多种 API 接口模式，自动检测并适配：

| API 模式               | 说明                        | 自动检测条件                                   |
|----------------------|---------------------------|------------------------------------------|
| `chat_completions`   | 标准 OpenAI 聊天完成 API        | 默认模式                                     |
| `codex_responses`    | OpenAI Codex/GPT-5 响应 API | `openai-codex` 提供商或 `chatgpt.com` URL    |
| `anthropic_messages` | Anthropic Messages API    | `anthropic` 提供商或 `api.anthropic.com` URL |
| `bedrock_converse`   | AWS Bedrock Converse API  | `bedrock` 提供商或 URL 包含 `bedrock-runtime`  |

```python
# API 模式自动检测逻辑
if self.api_mode == "anthropic_messages":
    # 使用原生 Anthropic SDK
    self._anthropic_client = build_anthropic_client(...)
elif self.api_mode == "bedrock_converse":
    # 使用 AWS boto3
    self._bedrock_region = extract_region_from_url(base_url)
else:
    # 使用 OpenAI 兼容客户端
    self.client = OpenAI(...)
```

### 3. 工具系统架构

工具系统采用模块化设计，支持并行执行优化：

```python
# 工具分类定义
_NEVER_PARALLEL_TOOLS = frozenset({"clarify"})  # 必须串行

_PARALLEL_SAFE_TOOLS = frozenset({
    "ha_get_state", "ha_list_entities",      # Home Assistant
    "read_file", "search_files",             # 文件操作
    "web_extract", "web_search",             # 网络工具
    "vision_analyze",                        # 视觉分析
})

_PATH_SCOPED_TOOLS = frozenset({
    "read_file", "write_file", "patch"      # 基于路径隔离
})
```

**并行执行决策逻辑：**

```python
def _should_parallelize_tool_batch(tool_calls) -> bool:
    """判断工具调用批次是否可以安全并行执行。"""
    if len(tool_calls) <= 1:
        return False

    tool_names = [tc.function.name for tc in tool_calls]

    # 检查是否有禁止并行的工具
    if any(name in _NEVER_PARALLEL_TOOLS for name in tool_names):
        return False

    # 检查路径冲突（针对文件操作工具）
    reserved_paths = []
    for tool_call in tool_calls:
        if tool_name in _PATH_SCOPED_TOOLS:
            scoped_path = _extract_parallel_scope_path(tool_name, args)
            if any(_paths_overlap(scoped_path, existing) for existing in reserved_paths):
                return False  # 路径冲突，不能并行
            reserved_paths.append(scoped_path)

    return True
```

## 核心功能详解

### 1. 上下文压缩系统

当对话上下文超过模型限制时，自动触发压缩：

```python
def _compress_context(
    self,
    messages: List[Dict],
    system_message: str,
    approx_tokens: int = None,
    task_id: str = None
) -> Tuple[List[Dict], str]:
    """
    压缩策略：
    1. 保留系统消息和最近的用户消息
    2. 对历史对话生成摘要
    3. 保留关键工具调用结果
    4. 可选择创建新会话来存储压缩后的内容
    """
```

**压缩算法流程图：**

```
检测到上下文超限
       ↓
尝试解析错误中的限制值 ──→ 成功 → 使用解析值
       ↓ 失败
使用 get_next_probe_tier() 降级
       ↓
更新 ContextCompressor 配置
       ↓
执行压缩（保留关键消息，摘要历史）
       ↓
压缩后长度是否减少？ ──→ 否 → 达到最小层级，报错退出
       ↓ 是
重新尝试 API 调用
```

### 2. 迭代预算控制

防止无限循环和资源耗尽：

```python
class IterationBudget:
    """
    线程安全的迭代计数器
    - 父代理默认 90 次迭代
    - 子代理独立预算（默认 50 次）
    - execute_code 工具调用可退款不消耗预算
    """

    def __init__(self, max_total: int):
        self.max_total = max_total
        self._used = 0
        self._lock = threading.Lock()

    def consume(self) -> bool:
        """尝试消耗一次迭代，返回是否成功"""
        with self._lock:
            if self._used >= self.max_total:
                return False
            self._used += 1
            return True

    def refund(self) -> None:
        """退还一次迭代（用于 execute_code）"""
        with self._lock:
            if self._used > 0:
                self._used -= 1
```

### 3. 错误处理与降级策略

```python
def classify_api_error(error) -> ErrorClassification:
    """
    分类错误类型，决定是否可以重试或需要降级：

    - rate_limit: 速率限制 → 重试，指数退避
    - context_overflow: 上下文溢出 → 压缩上下文
    - auth_error: 认证错误 → 尝试降级到备用提供商
    - billing: 计费问题 → 降级
    - overloaded: 提供商过载 → 重试并考虑降级
    """
```

**降级链配置：**

```python
# 支持多级降级链
self._fallback_chain = [
    {"provider": "openrouter", "model": "anthropic/claude-3-opus"},
    {"provider": "anthropic", "model": "claude-3-sonnet"},
    {"provider": "openai", "model": "gpt-4"},
]

# 当主提供商失败时自动切换
if self._try_activate_fallback():
    retry_count = 0  # 重置重试计数
    continue
```

### 4. 提示词缓存 (Anthropic)

针对 Claude 模型的成本优化：

```python
def _anthropic_prompt_cache_policy(self) -> Tuple[bool, bool]:
    """
    决定是否启用提示词缓存及使用哪种布局

    返回: (是否启用缓存, 是否使用原生缓存布局)
    """
    # 自动为 Claude 模型启用缓存
    if "claude" not in self.model.lower():
        return False, False

    # 原生 Anthropic API
    if self.provider == "anthropic":
        return True, True

    # OpenRouter 上的 Claude
    if "openrouter" in self.base_url.lower():
        return True, False  # 使用 OpenRouter 布局

    return False, False

# 使用 4 个断点策略（system_and_3）
# 可将多轮对话的输入成本降低约 75%
```

### 5. 多模态内容处理

```python
def _chat_content_to_responses_parts(content: Any) -> List[Dict[str, Any]]:
    """
    将 OpenAI Chat 格式的多模态内容转换为 Responses API 格式

    输入: [{"type": "text"|"image_url", ...}]
    输出: [{"type": "input_text"|"input_image", ...}]
    """
    converted = []
    for part in content:
        if part["type"] == "text":
            converted.append({"type": "input_text", "text": part["text"]})
        elif part["type"] == "image_url":
            converted.append({
                "type": "input_image",
                "image_url": part["image_url"]["url"]
            })
    return converted
```

### 6. 轨迹记录与训练数据生成

支持将对话保存为训练数据格式：

```python
def _convert_to_trajectory_format(
    self,
    messages: List[Dict],
    user_query: str,
    completed: bool
) -> List[Dict]:
    """
    将内部消息格式转换为轨迹格式（类似 ShareGPT）

    格式示例:
    [
      {"from": "system", "value": "..."},
      {"from": "human", "value": "..."},
      {"from": "gpt", "value": "..."},
      {"from": "tool", "value": "..."}
    ]
    """
```

### 7. 工具调用参数修复

处理模型生成的不规范 JSON：

```python
def _repair_tool_call_arguments(raw_args: str, tool_name: str = "?") -> str:
    """
    尝试修复损坏的工具调用参数 JSON

    常见问题:
    - 尾部逗号
    - Python 的 None 而不是 null
    - 未闭合的括号
    - 截断的 JSON

    如果无法修复，返回 "{}" 以避免崩溃整个会话
    """
    # 修复策略:
    # 1. 移除尾部逗号
    # 2. 闭合未闭合的括号
    # 3. Python None -> null
    # 4. 如果全部失败，返回空对象
```

## 技术亮点总结

| 特性         | 实现细节                        |
|------------|-----------------------------|
| **模块化设计**  | 核心逻辑、工具系统、上下文管理、UI 交互分离     |
| **多提供商支持** | 统一的抽象层支持 10+ LLM 提供商        |
| **并发优化**   | 智能判断工具并行安全性，最大 8 工作线程       |
| **成本控制**   | Anthropic 提示词缓存可降低 75% 输入成本 |
| **容错设计**   | 多级降级链、指数退避重试、自动上下文压缩        |
| **可观测性**   | 详细的轨迹记录、调试转储、速率限制跟踪         |

## 结语

`run_agent.py` 是一个生产级的 AI Agent 框架实现，展示了如何构建一个健壮、可扩展、多功能的智能代理系统。其代码质量和架构设计值得深入学习和借鉴。

---

*本文基于 [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) 仓库的 `run_agent.py` 文件分析整理。*
