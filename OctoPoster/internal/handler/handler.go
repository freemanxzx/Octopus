package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octopus/octoposter/internal/middleware"
	"github.com/octopus/octoposter/internal/service"
)

// Handler holds all HTTP route handlers.
type Handler struct {
	baseDir       string
	outlineSvc    *service.OutlineService
	contentSvc    *service.ContentService
	userHandler   *UserHandler
	creditSvc     *service.CreditService
	moderationSvc *service.ModerationService
}

// New creates a new handler set.
func New(baseDir string, creditSvc *service.CreditService) (*Handler, error) {
	outlineSvc, err := service.NewOutlineService(baseDir)
	if err != nil {
		return nil, err
	}
	contentSvc, err := service.NewContentService(baseDir)
	if err != nil {
		return nil, err
	}

	return &Handler{
		baseDir:       baseDir,
		outlineSvc:    outlineSvc,
		contentSvc:    contentSvc,
		userHandler:   NewUserHandler(creditSvc),
		creditSvc:     creditSvc,
		moderationSvc: service.NewModerationService(),
	}, nil
}

// RegisterRoutes registers all API routes on the Gin engine.
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Unprotected routes
		api.GET("/health", h.Health)
		api.GET("/images/:taskId/:filename", h.ServeImage)
		
		// Protected routes
		authorized := api.Group("/")
		authorized.Use(middleware.AuthMiddleware())
		{
			authorized.POST("/outline", h.GenerateOutline)
			authorized.POST("/content", h.GenerateContent)
			authorized.POST("/generate", h.GenerateImages)
			authorized.POST("/retry", h.RetryImage)
			authorized.POST("/regenerate", h.RegenerateImage)
			
			authorized.GET("/config", h.GetConfig)
			authorized.POST("/config", h.SaveConfig)
			authorized.POST("/config/test", h.TestConnection)
			authorized.GET("/user/profile", h.userHandler.GetProfile)

			// History routes
			historyH := NewHistoryHandler(h.baseDir)
			historyH.RegisterRoutes(authorized)
		}
	}
}

// Health handles GET /api/health
func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "OctoPoster API 运行正常",
		"version": "0.1.0",
	})
}

type outlineRequest struct {
	Topic  string   `json:"topic"`
	Images []string `json:"images,omitempty"`
}

// GenerateOutline handles POST /api/outline
func (h *Handler) GenerateOutline(c *gin.Context) {
	var req outlineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效请求"})
		return
	}

	if err := h.moderationSvc.CheckText(req.Topic); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	if h.creditSvc != nil {
		if err := h.creditSvc.Deduct(userID, 5); err != nil {
			c.JSON(http.StatusPaymentRequired, gin.H{"error": "积分不足，生成大纲需要 5 积分"})
			return
		}
	}

	result, err := h.outlineSvc.GenerateOutline(req.Topic, req.Images...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

type contentRequest struct {
	Topic   string `json:"topic"`
	Outline string `json:"outline"`
}

// GenerateContent handles POST /api/content
func (h *Handler) GenerateContent(c *gin.Context) {
	var req contentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效请求"})
		return
	}

	if err := h.moderationSvc.CheckText(req.Topic + req.Outline); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.contentSvc.GenerateContent(req.Topic, req.Outline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

type generateRequest struct {
	Pages       []service.Page `json:"pages"`
	TaskID      string         `json:"task_id"`
	FullOutline string         `json:"full_outline"`
	UserTopic   string         `json:"user_topic"`
	Style       string         `json:"style"`
}

// GenerateImages handles POST /api/generate with SSE streaming.
func (h *Handler) GenerateImages(c *gin.Context) {
	var req generateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效请求"})
		return
	}

	if req.TaskID == "" {
		req.TaskID = "task_" + uuid.New().String()[:8]
	}

	userID := c.GetString("user_id")
	if h.creditSvc != nil {
		cost := len(req.Pages) * 2
		if err := h.creditSvc.Deduct(userID, cost); err != nil {
			c.JSON(http.StatusPaymentRequired, gin.H{"error": fmt.Sprintf("积分不足，生成需要 %d 积分", cost)})
			return
		}
	}

	imgSvc, err := service.NewImageService(h.baseDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	events := imgSvc.GenerateImages(req.Pages, req.TaskID, req.FullOutline, req.UserTopic, req.Style)

	// SSE response
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
		return
	}

	for event := range events {
		data, _ := json.Marshal(event.Data)
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event.Event, string(data))
		flusher.Flush()
	}
}

type retryRequest struct {
	TaskID      string       `json:"task_id"`
	Page        service.Page `json:"page"`
	FullOutline string       `json:"full_outline"`
	UserTopic   string       `json:"user_topic"`
	Style       string       `json:"style"`
}

// RetryImage handles POST /api/retry
func (h *Handler) RetryImage(c *gin.Context) {
	var req retryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效请求"})
		return
	}

	imgSvc, err := service.NewImageService(h.baseDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Wrap single page as a full generation request, reusing the existing pipeline
	pages := []service.Page{req.Page}
	events := imgSvc.GenerateImages(pages, req.TaskID, req.FullOutline, req.UserTopic, req.Style)

	// Collect the result from the single-page generation
	var result gin.H
	for ev := range events {
		if ev.Event == "complete" {
			result = gin.H{"success": true, "index": req.Page.Index, "image_url": ev.Data}
		} else if ev.Event == "error" {
			result = gin.H{"success": false, "index": req.Page.Index, "error": ev.Data}
		}
	}
	if result == nil {
		result = gin.H{"success": false, "error": "no result"}
	}
	c.JSON(http.StatusOK, result)
}

// ServeImage handles GET /api/images/:taskId/:filename
func (h *Handler) ServeImage(c *gin.Context) {
	taskID := c.Param("taskId")
	filename := c.Param("filename")

	imgPath := filepath.Join(h.baseDir, "history", taskID, filename)
	if _, err := os.Stat(imgPath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "图片不存在"})
		return
	}

	c.File(imgPath)
}
