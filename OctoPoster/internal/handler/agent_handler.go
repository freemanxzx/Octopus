package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octopus/octoposter/internal/agent"
)

// agentChatRequest is the request body for /api/agent/chat.
type agentChatRequest struct {
	SessionID string `json:"session_id"` // Optional: reuse existing session
	Message   string `json:"message" binding:"required"`
}

// agentChatResponse is the response body for /api/agent/chat.
type agentChatResponse struct {
	SessionID string `json:"session_id"`
	Reply     string `json:"reply"`
}

// AgentChat handles POST /api/agent/chat — conversational agent interaction.
// Each session is isolated per user for concurrent access.
func (h *Handler) AgentChat(c *gin.Context) {
	var req agentChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入消息内容"})
		return
	}

	if h.agentEngine == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Agent 引擎未初始化"})
		return
	}

	// Get user ID from auth context (fallback to anonymous)
	userID, _ := c.Get("user_id")
	uid, _ := userID.(string)
	if uid == "" {
		uid = "anonymous"
	}

	// Create session ID if not provided
	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	// Call agent engine (concurrent-safe: each session has its own state)
	reply, err := h.agentEngine.Chat(c.Request.Context(), sessionID, uid, req.Message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, agentChatResponse{
		SessionID: sessionID,
		Reply:     reply,
	})
}

// AgentListTools handles GET /api/agent/tools — lists available agent tools.
func (h *Handler) AgentListTools(c *gin.Context) {
	if h.agentEngine == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Agent 引擎未初始化"})
		return
	}

	c.Data(http.StatusOK, "application/json", []byte(h.agentEngine.Tools().ToolsJSON()))
}

// AgentRunPipeline handles POST /api/agent/pipeline — runs full generation pipeline with SSE.
func (h *Handler) AgentRunPipeline(c *gin.Context) {
	if h.agentEngine == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Agent 引擎未初始化"})
		return
	}

	var input agent.PipelineInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的输入参数"})
		return
	}

	if input.Topic == "" && input.SourceURL == "" && input.SourceText == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供主题、URL或文本"})
		return
	}

	events, err := h.agentEngine.RunPipeline(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Stream events as SSE
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	for event := range events {
		c.SSEvent(event.Type, event)
		c.Writer.Flush()
	}

	// Send final done event
	c.SSEvent("done", gin.H{"status": "complete"})
	c.Writer.Flush()
}

// ensureAgentEngine is a helper to ensure the agent engine is available.
func (h *Handler) ensureAgentEngine() error {
	if h.agentEngine == nil {
		return fmt.Errorf("agent engine not initialized")
	}
	return nil
}

// AgentStats handles GET /api/agent/stats — returns tracing stats.
func (h *Handler) AgentStats(c *gin.Context) {
	if h.agentEngine == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Agent 引擎未初始化"})
		return
	}

	tracer := h.agentEngine.Tracer()
	if tracer == nil {
		c.JSON(http.StatusOK, gin.H{"message": "tracing not enabled"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats":         tracer.Stats(),
		"recent_events": tracer.Recent(20),
	})
}
