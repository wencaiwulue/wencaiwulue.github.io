---
title: 大模型 LLM function call
authors: naison
tags: [ LLM, function call ]
---

## 背景

在做大模型私有化相关的内容，遇到需要支持 function call 的功能

## 主要流程

![流程](function_call/function_call.svg)

由于大模型不支持流式输入，因此实际上对于 function call，都是通过单次的 http 请求来实现的。

## 举例说明

使用大模型 function call 查询 南山图书馆位置的需求。

### 按照 OpenAI 的 function 格式发送请求

假设我们有个 function LocationTool, 作用是根据指定名称，查询具体位置。详细参数描述如下：

```text
LocationTool：根据用户给出的问题查询具体位置或推荐具体地点。当问题中给出指定地点询问位置时可以返回位置信息，包含酒店、餐厅、博物馆、政府/医疗/教学机构等，但不包含市辖区、城市名称、乡镇名称。问题中可对餐厅、博物馆、政府单位、景点等进行推荐，返回推荐的具体地点。
    支持如下参数：
        location_keyword：表示用户想要查找的地点，必填参数，字符串类型；
        poi_keyword：表示地点类型，必填参数，字符串类型；
        latitude：表示UserInfo中纬度，必填参数，浮点型；
        longitude：表示UserInfo中经度，必填参数，浮点型；
        sort：表示排序规则，0=不排序，1=最近优先，2=最便宜优先，3=最贵优先，默认值为0，缺省参数，整型。
    使用举例，需要出本插件的情况：问题是 "上海台儿庄路的特色小餐馆"，参数为 {\"location_keyword\":\"上海台儿庄路\",\"poi_keyword\":\"特色小餐馆\",\"latitude\":\"30.11\",\"longitude\":\"121.45\"}。类似以下文本不出本插件：北京好玩的地方、门头沟在哪、方恒的消防栓在哪、推荐一些当地特产。
```

```shell
➜  ~ curl -X POST localhost:8000/chat/completions -H "Content-Type: application/json" -d '{
    "model": "doubao",
    "stream": false,
    "messages": [
        {
            "role": "user",
            "content": "请帮我查询一下南山图书馆的位置"
        }
    ],
    "temperature": 0.95,
    "top_p": 0.8,
    "top_k": 10,
    "repetition_penalty": 1,
    "max_new_tokens": 2048,
    "tools": [{
      "id": "1",
      "type": "function",
      "function": {
        "name": "LocationTool",
        "description": "根据用户给出的问题查询具体位置或推荐具体地点。当问题中给出指定地点询问位置时可以返回位置信息，包含酒店、餐厅、博物馆、政府/医疗/教学机构等，但不包含市辖区、城市名称、乡镇名称。问题中可对餐厅、博物馆、政府单位、景点等进行推荐，返回推荐的具体地点。",
        "parameters": {
          "type": "object",
          "properties": {
            "location_keyword": {
              "type": "string",
              "description": "表示用户想要查找的地点"
            },
            "poi_keyword": {
              "type": "string",
              "description": "表示UserInfo中纬度"
            },
            "latitude": {
              "type": "string",
              "description": "表示UserInfo中纬度"
            },
            "longitude": {
              "type": "string",
              "description": "表示UserInfo中纬度"
            },
            "sort": {
              "type": "integer",
              "description": "0=不排序，1=最近优先，2=最便宜优先，3=最贵优先，默认值为0"
            }
          },
          "required": ["location_keyword","poi_keyword","latitude","longitude"]
        }
      }
    }]
}'
{"model":"doubao","choices":[{"delta":{"role":"assistant","content":"\n当前提供了 1 个工具，分别是['LocationTool']，需求为查询南山图书馆的位置，需要调用 LocationTool 获取相关信息。","tool_calls":[{"type":"function","function":{"name":"LocationTool","arguments":"{\"latitude\": \"22.536444\", \"location_keyword\": \"南山图书馆\"}"},"index":0,"id":"call_nbkpltop1qzycolf8gw3n7zk"}]},"index":0,"finish_reason":"tool_calls","logprobs":null}],"usage":{"prompt_tokens":220,"completion_tokens":82,"total_tokens":302}}

➜  ~
```

可以看到响应包含

```json
{
  "tool_calls": [
    {
      "type": "function",
      "function": {
        "name": "LocationTool",
        "arguments": "{\"latitude\": \"22.536444\", \"location_keyword\": \"南山图书馆\"}"
      },
      "index": 0,
      "id": "call_nbkpltop1qzycolf8gw3n7zk"
    }
  ]
}
```

### 调用 function call 获取结果

```json
{
  "type": "function",
  "function": {
    "name": "LocationTool",
    "arguments": "{\"latitude\": \"22.536444\", \"location_keyword\": \"南山图书馆\"}"
  },
  "index": 0,
  "id": "call_nbkpltop1qzycolf8gw3n7zk"
}
```

使用给到的参数，调用其他组件 `LocationTool` 方法，获取到结果。

```text
南山区南山大道2093号
```

### 将结果给到大模型，做最终的输出

```shell
curl -X POST localhost:8000/chat/completions -H "Content-Type: application/json" -d '{
    "model": "doubao",
    "stream": false,
    "messages": [
        {
            "role": "user",
            "content": "请帮我查询一下南山图书馆的位置"
        },
        {
            "role":"assistant",
            "content":"\n当前提供了 1 个工具，分别是[\"LocationTool\"]，需求是查询南山图书馆的位置，需要调用 LocationTool 获取相关信息。","tool_calls":[{"type":"function","function":{"name":"LocationTool","arguments":"{\"latitude\": \"22.5385\", \"location_keyword\": \"南山图书馆\"}"},"index":0,"id":"1"}]
        },
        {
            "role": "tool",
            "content": "南山区南山大道2093号",
            "tool_call_id": "1"
        }
    ],
    "temperature": 0.95,
    "top_p": 0.8,
    "top_k": 10,
    "repetition_penalty": 1,
    "max_new_tokens": 2048,
    "tools": [{
      "id": "1",
      "type": "function",
      "function": {
        "name": "LocationTool",
        "description": "根据用户给出的问题查询具体位置或推荐具体地点。当问题中给出指定地点询问位置时可以返回位置信息，包含酒店、餐厅、博物馆、政府/医疗/教学机构等，但不包含市辖区、城市名称、乡镇名称。问题中可对餐厅、博物馆、政府单位、景点等进行推荐，返回推荐的具体地点。",
        "parameters": {
          "type": "object",
          "properties": {
            "location_keyword": {
              "type": "string",
              "description": "表示用户想要查找的地点"
            },
            "poi_keyword": {
              "type": "string",
              "description": "表示UserInfo中纬度"
            },
            "latitude": {
              "type": "string",
              "description": "表示UserInfo中纬度"
            },
            "longitude": {
              "type": "string",
              "description": "表示UserInfo中纬度"
            },
            "sort": {
              "type": "integer",
              "description": "0=不排序，1=最近优先，2=最便宜优先，3=最贵优先，默认值为0"
            }
          },
          "required": ["location_keyword","poi_keyword","latitude","longitude"]
        }
      }
    }]
}'
{"model":"doubao","choices":[{"message":{"role":"assistant","content":"南山图书馆的位置是南山区南山大道 2093 号。","tool_calls":[]},"index":0,"finish_reason":"stop","logprobs":null}],"usage":{"prompt_tokens":291,"completion_tokens":28,"total_tokens":319}}
```

### 最终的结果

模型回复 `南山图书馆的位置是南山区南山大道 2093 号`，得到了我们想要的答案。

## 探究本质

本质还是以训练的格式，直接发送给大模型。让大模型按照指定格式来识别。

```shell
➜  ~ curl -X POST localhost:8000/chat/completions -H "Content-Type: application/json" -d '{
    "model": "doubao",
    "stream": false,
    "messages": [
        {
            "role":"assistant",
            "content":"<|Functions|>:\n- LocationTool：根据用户给出的问题查询具体位置或推荐具体地点。当问题中给出指定地点询问位置时可以返回位置信息，包含酒店、餐厅、博物馆、政府/医疗/教学机构等，但不包含市辖区、城市名称、乡镇名称。问题中可对餐厅、博物馆、政府单位、景点等进行推荐，返回推荐的具体地点。支持如下参数：location_keyword：表示用户 想要查找的地点，必填参数，字符串类型；poi_keyword：表示地点类型，必填参数，字符串类型；latitude：表示UserInfo中纬度，必填参数，浮点型；longitude：表示UserInfo中经度，必填 参数，浮点型；sort：表示排序规则，0=不排序，1=最近优先，2=最便宜优先，3=最贵优先，默认值为0，缺省参数，整型。比如，需要出本插件的情况：问题是 \"上海台儿庄路的特色小餐馆\" ，参数为 {\"location_keyword\":\"上海台儿庄路\",\"poi_keyword\":\"特色小餐馆\",\"latitude\":\"30.11\",\"longitude\":\"121.45\"}。类似以下文本不出本插件：北京好玩的地方、门头沟在哪、方恒的消防栓在哪、推荐一些当地特产。\n\n<|UserInfo|>:\n{\"system_time\": \"2023-09-14T19:27:42\", \"longitude\": 106.03, \"latitude\": 42.04}"
        },
        {
            "role": "user",
            "content": "请帮我查询一下南山图书馆的位置"
        }
    ],
    "temperature": 0.95,
    "top_p": 0.8,
    "top_k": 10,
    "repetition_penalty": 1,
    "max_new_tokens": 2048
}'
{"model":"doubao","choices":[{"message":{"role":"assistant","content":"\n当前提供了 1 个工具，分别是['LocationTool']，需求是查询南山图书馆的位置，需要调用 LocationTool 获取相关信息。","tool_calls":[{"type":"function","function":{"name":"LocationTool","arguments":"{\"latitude\": 42.04, \"longitude\": 106.03, \"location_keyword\": \"南山图书馆\"}"},"index":0,"id":"call_uwy26bq6wvx7ud0g3anhrxhu"}]},"index":0,"finish_reason":"tool_calls","logprobs":null}],"usage":{"prompt_tokens":361,"completion_tokens":87,"total_tokens":448}}
```

```shell
➜  ~ curl -X POST localhost:8000/chat/completions -H "Content-Type: application/json" -d '{
    "model": "doubao",
    "stream": false,
    "messages": [
        {
            "role":"assistant",
            "content":"<|Functions|>:\n- LocationTool：根据用户给出的问题查询具体位置或推荐具体地点。当问题中给出指定地点询问位置时可以返回位置信息，包含酒店、餐厅、博物馆、政府/医疗/教学机构等，但不包含市辖区、城市名称、乡镇名称。问题中可对餐厅、博物馆、政府单位、景点等进行推荐，返回推荐的具体地点。支持如下参数：location_keyword：表示用户 想要查找的地点，必填参数，字符串类型；poi_keyword：表示地点类型，必填参数，字符串类型；latitude：表示UserInfo中纬度，必填参数，浮点型；longitude：表示UserInfo中经度，必填 参数，浮点型；sort：表示排序规则，0=不排序，1=最近优先，2=最便宜优先，3=最贵优先，默认值为0，缺省参数，整型。比如，需要出本插件的情况：问题是 \"上海台儿庄路的特色小餐馆\" ，参数为 {\"location_keyword\":\"上海台儿庄路\",\"poi_keyword\":\"特色小餐馆\",\"latitude\":\"30.11\",\"longitude\":\"121.45\"}。类似以下文本不出本插件：北京好玩的地方、门头沟在哪、方恒的消防栓在哪、推荐一些当地特产。\n\n<|UserInfo|>:\n{\"system_time\": \"2023-09-14T19:27:42\", \"longitude\": 106.03, \"latitude\": 42.04}"
        },
        {
            "role": "user",
            "content": "请帮我查询一下南山图书馆的位置"
        },
        {
            "role":"assistant",
            "content":"<|Observation|>:南山区南山大道2093号"
        }
    ],
    "temperature": 0.95,
    "top_p": 0.8,
    "top_k": 10,
    "repetition_penalty": 1,
    "max_new_tokens": 2048
}'
{"model":"doubao","choices":[{"message":{"role":"assistant","content":"为您查询到南山图书馆的地址为：南山区南山大道 2093 号。\n\n如果您想了解更多关于南山图书馆的信息，或者有其他需求，请继续提问。","tool_calls":[]},"index":0,"finish_reason":"stop","logprobs":null}],"usage":{"prompt_tokens":384,"completion_tokens":53,"total_tokens":437}}
```