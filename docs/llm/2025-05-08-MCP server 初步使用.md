# MCP server 概念

MCP Server（Model Context Protocol
Server）是基于模型上下文协议（MCP）构建的标准化服务程序，其核心作用是为大型语言模型（LLM）与外部系统（如本地资源、云端API、数据库等）建立安全、高效的连接通道。它并非大模型本身，而是大模型能力的扩展工具，通过标准化接口解决大模型在实际应用中的
“执行能力短板”

# 如何使用

## Stdio 的方式

```go
package main

import (
	"context"
	"errors"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	// Create MCP server
	s := server.NewMCPServer(
		"Demo 🚀",
		"1.0.0",
	)

	// Add tool
	tool := mcp.NewTool("hello_world",
		mcp.WithDescription("Say hello to someone"),
		mcp.WithString("name",
			mcp.Required(),
			mcp.Description("Name of the person to greet"),
		),
	)

	// Add tool handler
	s.AddTool(tool, helloHandler)

	// Start the stdio server
	if err := server.ServeStdio(s); err != nil {
		fmt.Printf("Server error: %v\n", err)
	}
}

func helloHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	name, ok := request.Params.Arguments["name"].(string)
	if !ok {
		return nil, errors.New("name must be a string")
	}

	return mcp.NewToolResultText(fmt.Sprintf("Hello, %s!", name)), nil
}
```

保存为 `main.go`

```shell
go run main.go
```

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "hello_world",
    "arguments": {
      "name": "naison"
    }
  }
}
```

```shell
➜ go run main.go
{"jsonrpc":"2.0", "id": "1", "method": "tools/call", "params": {"name": "hello_world", "arguments": {"name": "naison"}}}
{"jsonrpc":"2.0","id":"1","result":{"content":[{"type":"text","text":"Hello, naison!"}]}}
```

## SSE 的方式

```go
package main

import (
	"context"
	"errors"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	// Create MCP server
	s := server.NewMCPServer(
		"Demo 🚀",
		"1.0.0",
	)

	// Add tool
	tool := mcp.NewTool("hello_world",
		mcp.WithDescription("Say hello to someone"),
		mcp.WithString("name",
			mcp.Required(),
			mcp.Description("Name of the person to greet"),
		),
	)

	// Add tool handler
	s.AddTool(tool, helloHandler)

	// Start the stdio server
	if err := server.NewSSEServer(s).Start(":8080"); err != nil {
		fmt.Printf("Server error: %v\n", err)
	}
}

func helloHandler(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	name, ok := request.Params.Arguments["name"].(string)
	if !ok {
		return nil, errors.New("name must be a string")
	}

	return mcp.NewToolResultText(fmt.Sprintf("Hello, %s!", name)), nil
}

```

```shell
➜ go run main.go
```

```shell
➜  ~ curl http://localhost:8080/sse
event: endpoint
data: /message?sessionId=a5a74959-c1dc-44a1-933f-0853dd718288

```

使用 `endpoint` 写数据 `/message?sessionId=a5a74959-c1dc-44a1-933f-0853dd718288`

```shell
curl -X POST "http://localhost:8080/message?sessionId=a5a74959-c1dc-44a1-933f-0853dd718288" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
      "name": "hello_world",
      "arguments": {"name": "naison"}
    }
  }'
```

```shell
➜  ~ curl http://localhost:8080/sse
event: endpoint
data: /message?sessionId=a5a74959-c1dc-44a1-933f-0853dd718288

event: message
data: {"jsonrpc":"2.0","id":"1","result":{"content":[{"type":"text","text":"Hello, naison!"}]}}


```