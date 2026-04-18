package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"encoding/base64"

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

// canvasCommandRequest defines structured commands from the Canvas UI.
type canvasCommandRequest struct {
	Command string                 `json:"command" binding:"required"` // e.g. "remove_background", "rewrite_text"
	Context map[string]interface{} `json:"context"` // e.g. layer data, url, text
}

// AgentCanvasCommand handles POST /api/agent/canvas-command
func (h *Handler) AgentCanvasCommand(c *gin.Context) {
	if h.agentEngine == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Agent 引擎未初始化"})
		return
	}

	var req canvasCommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效请求格式"})
		return
	}

	// Evaluate command natively using Eino Tools bypassing chat text limits due to Base64 payload sizes
	switch req.Command {
	case "remove_background":
		url, _ := req.Context["url"].(string)
		if url == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少图片url"})
			return
		}

		// Download Image with custom User-Agent to prevent 403s
		reqDl, _ := http.NewRequest("GET", url, nil)
		reqDl.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
		resp, err := http.DefaultClient.Do(reqDl)
		if err != nil || resp.StatusCode != 200 {
			errStr := "unknown"
			if err != nil { errStr = err.Error() } else { errStr = fmt.Sprintf("status %d", resp.StatusCode) }
			c.JSON(http.StatusBadRequest, gin.H{"error": "无法下载原图: " + errStr})
			return
		}
		defer resp.Body.Close()
		imgData, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "读取图片失败"})
			return
		}

		t, ok := h.agentEngine.Tools().Get("remove_background")
		if !ok {
			c.JSON(http.StatusNotImplemented, gin.H{"error": "工具未注册"})
			return
		}

		b64Str := base64.StdEncoding.EncodeToString(imgData)
		
		inputData, _ := json.Marshal(map[string]interface{}{"image_base64": b64Str})
		resultStr, err := t.InvokableRun(context.Background(), string(inputData))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Parse the result
		var procRes agent.ImageProcessResult
		json.Unmarshal([]byte(resultStr), &procRes)

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"result":  procRes.URL, // return the newly saved URL directly to Vue!
		})
		return
	case "smart_relayout":
		docJsonStr, _ := req.Context["document"].(string)
		if docJsonStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少绘图 JSON 数据"})
			return
		}

		instruction := fmt.Sprintf(`你是一名顶尖的美工和UI排版设计师。以下是当前海报页面的图层数据（严格的 JSON）。请根据你的专业直觉，调整图层的 Left, Top, FontSize, Fill (颜色) 等属性，让整体排版更具视觉冲击力、呼吸感和对齐美感。
请注意：1. 不要删除原有图层或削减文本内容。2. 你的回复必须且仅能是一段合法的纯 JSON 文本（不要存在任何 Markdown、引号或包裹格式），我需要代码能够直接反序列化为之前的数组结构。

当前JSON数据如下：
%s`, docJsonStr)

		uid := c.GetString("user_id")
		if uid == "" {
			uid = "anonymous"
		}
		
		reply, err := h.agentEngine.Chat(c.Request.Context(), uuid.New().String(), uid, instruction)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"result":  reply,
		})
		return
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "不支持的画布指令: " + req.Command})
		return
	}
}

