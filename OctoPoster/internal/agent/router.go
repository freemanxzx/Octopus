package agent

import (
	"context"
	"fmt"
	"strings"

	"github.com/cloudwego/eino/schema"
)

// IntentType represents the detected user intent.
type IntentType int

const (
	// IntentWorkflow — deterministic, fast execution via predefined workflows.
	IntentWorkflow IntentType = iota
	// IntentAgent — open-ended, uses ReAct agent with autonomous tool calling.
	IntentAgent
)

// Intent holds the classified intent and extracted parameters.
type Intent struct {
	Type       IntentType `json:"type"`
	Workflow   string     `json:"workflow,omitempty"`   // For IntentWorkflow: which workflow
	Topic      string     `json:"topic,omitempty"`      // Extracted topic
	URL        string     `json:"url,omitempty"`        // Extracted URL
	RawMessage string     `json:"raw_message"`
}

// RouterResult holds the response from the intent router.
type RouterResult struct {
	Intent   Intent      `json:"intent"`
	Response interface{} `json:"response"`
}

// Router determines whether to use a Workflow (fast, deterministic) or
// the ReAct Agent (flexible, multi-turn) based on user input analysis.
//
// Routing Rules:
//   - Direct commands with clear action → Workflow
//   - Ambiguous/creative/multi-step requests → Agent
//   - URLs in input → Workflow (URL extraction pipeline)
type Router struct {
	workflows *WorkflowExecutor
	agent     *CreativeAgent
}

// NewRouter creates an intent router.
func NewRouter(workflows *WorkflowExecutor, agent *CreativeAgent) *Router {
	return &Router{
		workflows: workflows,
		agent:     agent,
	}
}

// Route classifies the user message and dispatches to the appropriate handler.
func (r *Router) Route(ctx context.Context, sessionMessages []*schema.Message, message string) (*RouterResult, error) {
	intent := r.classifyIntent(message)

	switch intent.Type {
	case IntentWorkflow:
		return r.handleWorkflow(ctx, intent)
	case IntentAgent:
		return r.handleAgent(ctx, sessionMessages, intent)
	default:
		return r.handleAgent(ctx, sessionMessages, intent)
	}
}

// classifyIntent performs fast, rule-based intent classification.
// This avoids an LLM call for routing — keeping latency minimal for common cases.
func (r *Router) classifyIntent(message string) Intent {
	msg := strings.TrimSpace(message)
	lower := strings.ToLower(msg)

	intent := Intent{
		RawMessage: msg,
	}

	// Rule 1: URL detected → URL workflow
	if containsURL(msg) {
		intent.Type = IntentWorkflow
		intent.Workflow = "outline_from_url"
		intent.URL = extractFirstURL(msg)
		return intent
	}

	// Rule 2: Explicit outline keywords → Outline workflow
	outlineKeywords := []string{
		"生成大纲", "创建大纲", "做个大纲", "写大纲",
		"生成提纲", "帮我出大纲", "小红书大纲",
	}
	for _, kw := range outlineKeywords {
		if strings.Contains(lower, kw) {
			intent.Type = IntentWorkflow
			intent.Workflow = "outline"
			intent.Topic = extractTopicFromMessage(msg, kw)
			return intent
		}
	}

	// Rule 3: Explicit content/copywriting keywords → Content workflow
	contentKeywords := []string{
		"生成文案", "写文案", "创建文案", "做文案",
		"写标题", "爆款标题",
	}
	for _, kw := range contentKeywords {
		if strings.Contains(lower, kw) {
			intent.Type = IntentWorkflow
			intent.Workflow = "content"
			intent.Topic = extractTopicFromMessage(msg, kw)
			return intent
		}
	}

	// Rule 4: Full pipeline keywords → Pipeline workflow
	pipelineKeywords := []string{
		"一键生成", "全部生成", "从头生成", "完整生成",
		"帮我做", "帮我创建",
	}
	for _, kw := range pipelineKeywords {
		if strings.Contains(lower, kw) {
			intent.Type = IntentWorkflow
			intent.Workflow = "pipeline"
			intent.Topic = extractTopicFromMessage(msg, kw)
			return intent
		}
	}

	// Default: Agent mode for open-ended requests
	intent.Type = IntentAgent
	intent.Topic = msg
	return intent
}

// handleWorkflow dispatches to the appropriate workflow.
func (r *Router) handleWorkflow(ctx context.Context, intent Intent) (*RouterResult, error) {
	var response interface{}
	var err error

	switch intent.Workflow {
	case "outline":
		response, err = r.workflows.RunOutlineChain(ctx, intent.Topic)
	case "outline_from_url":
		response, err = r.workflows.RunOutlineFromURLChain(ctx, intent.URL)
	case "content":
		response, err = r.workflows.RunCopyChain(ctx, intent.Topic, "")
	case "pipeline":
		events, pErr := r.workflows.RunFullPipeline(ctx, PipelineInput{Topic: intent.Topic})
		if pErr != nil {
			return nil, pErr
		}
		// Collect all events into a response
		var allEvents []WorkflowEvent
		for e := range events {
			allEvents = append(allEvents, e)
		}
		response = allEvents
		err = nil
	default:
		return nil, fmt.Errorf("unknown workflow: %s", intent.Workflow)
	}

	if err != nil {
		return nil, err
	}

	return &RouterResult{
		Intent:   intent,
		Response: response,
	}, nil
}

// handleAgent dispatches to the ReAct creative agent.
func (r *Router) handleAgent(ctx context.Context, sessionMessages []*schema.Message, intent Intent) (*RouterResult, error) {
	if r.agent == nil {
		// Fallback: if no agent available, try as pipeline
		intent.Workflow = "outline"
		intent.Type = IntentWorkflow
		return r.handleWorkflow(ctx, intent)
	}

	// Build message list with user message
	messages := make([]*schema.Message, len(sessionMessages))
	copy(messages, sessionMessages)
	messages = append(messages, schema.UserMessage(intent.RawMessage))

	resp, err := r.agent.Generate(ctx, messages)
	if err != nil {
		return nil, err
	}

	return &RouterResult{
		Intent:   intent,
		Response: resp.Content,
	}, nil
}

// --- URL Detection Helpers ---

func containsURL(s string) bool {
	return strings.Contains(s, "http://") || strings.Contains(s, "https://")
}

func extractFirstURL(s string) string {
	for _, prefix := range []string{"https://", "http://"} {
		idx := strings.Index(s, prefix)
		if idx >= 0 {
			end := idx
			for end < len(s) && s[end] != ' ' && s[end] != '\n' && s[end] != '\t' {
				end++
			}
			return s[idx:end]
		}
	}
	return ""
}

// extractTopicFromMessage tries to extract the topic from user message
// by removing the keyword and cleaning whitespace.
func extractTopicFromMessage(msg, keyword string) string {
	lower := strings.ToLower(msg)
	idx := strings.Index(lower, keyword)
	if idx < 0 {
		return msg
	}

	// Try after keyword
	after := strings.TrimSpace(msg[idx+len(keyword):])
	if after != "" {
		// Remove common suffix words
		for _, suffix := range []string{"吧", "的", "一下", "看看"} {
			after = strings.TrimSuffix(after, suffix)
		}
		return strings.TrimSpace(after)
	}

	// Try before keyword
	before := strings.TrimSpace(msg[:idx])
	if before != "" {
		for _, prefix := range []string{"帮我", "请", "用", "关于"} {
			before = strings.TrimPrefix(before, prefix)
		}
		return strings.TrimSpace(before)
	}

	return msg
}
