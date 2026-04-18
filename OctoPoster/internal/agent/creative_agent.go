package agent

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/compose"
	"github.com/cloudwego/eino/flow/agent/react"
	"github.com/cloudwego/eino/schema"
)

const creativeAgentSystemPrompt = `你是 OctoPoster 的创意助手，一位专业的小红书内容策划师。

你拥有以下能力（工具）：
- 根据主题生成大纲 (generate_outline)
- 从URL提取内容并生成大纲 (generate_outline_from_url)
- 生成文案 (generate_content)
- 提取网页内容 (extract_url)
- 图片去文字 (remove_text_from_image)
- 图片去背景 (remove_background)
- 图片换背景 (replace_background)

工作原则：
1. 当用户需求明确时，直接调用对应工具完成任务
2. 当用户需求模糊时，先询问澄清再行动
3. 主动给出创意建议和优化方案
4. 每次生成内容后，简要说明为什么这样设计`

// CreativeAgent wraps an Eino ReAct Agent with OctoPoster's tools.
// It autonomously decides which tools to call based on user input,
// supporting multi-turn reasoning and automatic fallback.
type CreativeAgent struct {
	agent    *react.Agent
	provider *Provider
	tools    *ToolRegistry
}

// NewCreativeAgent creates a ReAct agent with all registered tools.
func NewCreativeAgent(ctx context.Context, provider *Provider, tools *ToolRegistry) (*CreativeAgent, error) {
	chatModel, err := provider.GetActive()
	if err != nil {
		return nil, fmt.Errorf("no active model for agent: %w", err)
	}

	// Build ToolsNodeConfig from registered tools
	toolsConfig := compose.ToolsNodeConfig{
		Tools: tools.BaseTools(),
	}

	agentInstance, err := react.NewAgent(ctx, &react.AgentConfig{
		Model:       chatModel,
		ToolsConfig: toolsConfig,
		MaxStep:     15, // Allow up to 15 reasoning steps
		MessageModifier: func(ctx context.Context, input []*schema.Message) []*schema.Message {
			// Prepend system prompt
			res := make([]*schema.Message, 0, len(input)+1)
			res = append(res, schema.SystemMessage(creativeAgentSystemPrompt))
			res = append(res, input...)
			return res
		},
	})
	if err != nil {
		return nil, fmt.Errorf("create react agent: %w", err)
	}

	return &CreativeAgent{
		agent:    agentInstance,
		provider: provider,
		tools:    tools,
	}, nil
}

// Generate runs the ReAct agent with multi-turn tool calling.
// The agent will autonomously decide which tools to call and iterate
// until it produces a final answer (or hits MaxStep).
func (ca *CreativeAgent) Generate(ctx context.Context, messages []*schema.Message) (*schema.Message, error) {
	return ca.agent.Generate(ctx, messages)
}
