package handler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/octopus/octoposter/internal/middleware"
	"github.com/octopus/octoposter/internal/service"
)

// Handler holds all HTTP route handlers.
type Handler struct {
	baseDir          string
	outlineSvc       *service.OutlineService
	contentSvc       *service.ContentService
	extractorSvc     *service.ExtractorService
	templateSvc      *service.TemplateService
	imageProcessing  *service.ImageProcessingService
	userHandler      *UserHandler
	creditSvc        *service.CreditService
	moderationSvc    *service.ModerationService
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

	templateSvc, err := service.NewTemplateService(baseDir)
	if err != nil {
		return nil, err
	}

	return &Handler{
		baseDir:         baseDir,
		outlineSvc:      outlineSvc,
		contentSvc:      contentSvc,
		extractorSvc:    service.NewExtractorService(),
		templateSvc:     templateSvc,
		imageProcessing: service.NewImageProcessingService(),
		userHandler:     NewUserHandler(creditSvc),
		creditSvc:       creditSvc,
		moderationSvc:   service.NewModerationService(),
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
			authorized.POST("/outline/from-url", h.GenerateOutlineFromURL)
			authorized.POST("/outline/from-doc", h.GenerateOutlineFromDoc)
			authorized.POST("/content", h.GenerateContent)
			authorized.POST("/generate", h.GenerateImages)
			authorized.POST("/retry", h.RetryImage)
			authorized.POST("/regenerate", h.RegenerateImage)

			authorized.GET("/templates", h.ListTemplates)
			authorized.POST("/render-template", h.RenderTemplate)

			authorized.POST("/image/remove-text", h.RemoveTextFromImage)
			authorized.POST("/image/remove-bg", h.RemoveBackground)
			authorized.POST("/image/replace-bg", h.ReplaceBackground)
			
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
	Platform    string         `json:"platform"`
}

var platformRatios = map[string]string{
	"xhs":     "3:4",
	"gzh":     "1:1",
	"moments": "1:1",
	"ecom":    "3:4",
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

	targetRatio := platformRatios[req.Platform]
	events := imgSvc.GenerateImages(req.Pages, req.TaskID, req.FullOutline, req.UserTopic, req.Style, targetRatio)

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
	Platform    string       `json:"platform"`
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
	targetRatio := platformRatios[req.Platform]
	events := imgSvc.GenerateImages(pages, req.TaskID, req.FullOutline, req.UserTopic, req.Style, targetRatio)

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

type outlineFromURLRequest struct {
	URL string `json:"url"`
}

// GenerateOutlineFromURL handles POST /api/outline/from-url
func (h *Handler) GenerateOutlineFromURL(c *gin.Context) {
	var req outlineFromURLRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供有效的 URL"})
		return
	}

	// Validate URL format
	if !strings.HasPrefix(req.URL, "http://") && !strings.HasPrefix(req.URL, "https://") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL 必须以 http:// 或 https:// 开头"})
		return
	}

	userID := c.GetString("user_id")
	if h.creditSvc != nil {
		if err := h.creditSvc.Deduct(userID, 5); err != nil {
			c.JSON(http.StatusPaymentRequired, gin.H{"error": "积分不足，URL 导入生成大纲需要 5 积分"})
			return
		}
	}

	// Step 1: Extract text from URL
	sourceText, err := h.extractorSvc.ExtractFromURL(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "提取 URL 内容失败: " + err.Error()})
		return
	}

	// Step 2: Generate outline from extracted text
	result, err := h.outlineSvc.GenerateOutlineFromText(sourceText)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// GenerateOutlineFromDoc handles POST /api/outline/from-doc (multipart file upload)
func (h *Handler) GenerateOutlineFromDoc(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传文件"})
		return
	}
	defer file.Close()

	// Limit file size to 2MB
	if header.Size > 2*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件大小不能超过 2MB"})
		return
	}

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "读取文件失败"})
		return
	}

	ext := filepath.Ext(header.Filename)

	userID := c.GetString("user_id")
	if h.creditSvc != nil {
		if err := h.creditSvc.Deduct(userID, 5); err != nil {
			c.JSON(http.StatusPaymentRequired, gin.H{"error": "积分不足，文档导入生成大纲需要 5 积分"})
			return
		}
	}

	// Step 1: Extract text from document
	sourceText, err := h.extractorSvc.ExtractFromDocument(data, ext)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "解析文档失败: " + err.Error()})
		return
	}

	// Step 2: Generate outline from extracted text
	result, err := h.outlineSvc.GenerateOutlineFromText(sourceText)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

// ListTemplates handles GET /api/templates
func (h *Handler) ListTemplates(c *gin.Context) {
	templates := h.templateSvc.ListTemplates()
	c.JSON(http.StatusOK, gin.H{"success": true, "templates": templates})
}

// RenderTemplate handles POST /api/render-template
func (h *Handler) RenderTemplate(c *gin.Context) {
	var req service.RenderTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效请求"})
		return
	}

	userID := c.GetString("user_id")
	if h.creditSvc != nil {
		if err := h.creditSvc.Deduct(userID, 3); err != nil {
			c.JSON(http.StatusPaymentRequired, gin.H{"error": "积分不足，模板渲染需要 3 积分"})
			return
		}
	}

	imgData, err := h.templateSvc.RenderTemplate(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "渲染失败: " + err.Error()})
		return
	}

	// Save to task directory
	taskID := "tpl_" + fmt.Sprintf("%d", time.Now().UnixMilli())
	taskDir := filepath.Join(h.baseDir, "history", taskID)
	if err := os.MkdirAll(taskDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建目录失败"})
		return
	}

	filename := req.TemplateID + ".png"
	imgPath := filepath.Join(taskDir, filename)
	if err := os.WriteFile(imgPath, imgData, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存图片失败"})
		return
	}

	imageURL := fmt.Sprintf("/api/images/%s/%s", taskID, filename)
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"image_url": imageURL,
		"task_id":   taskID,
	})
}

type imageProcessRequest struct {
	ImageData string `json:"image_data"` // base64 encoded image
	Prompt    string `json:"prompt"`     // for replace-bg only
}

// RemoveTextFromImage handles POST /api/image/remove-text
func (h *Handler) RemoveTextFromImage(c *gin.Context) {
	var req imageProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ImageData == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供图片数据"})
		return
	}

	imageBytes, err := base64.StdEncoding.DecodeString(req.ImageData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的图片数据"})
		return
	}

	result, err := h.imageProcessing.RemoveTextFromImage(imageBytes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "处理失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"image_data": base64.StdEncoding.EncodeToString(result),
	})
}

// RemoveBackground handles POST /api/image/remove-bg
func (h *Handler) RemoveBackground(c *gin.Context) {
	var req imageProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ImageData == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供图片数据"})
		return
	}

	imageBytes, err := base64.StdEncoding.DecodeString(req.ImageData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的图片数据"})
		return
	}

	result, err := h.imageProcessing.RemoveBackground(imageBytes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "处理失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"image_data": base64.StdEncoding.EncodeToString(result),
	})
}

// ReplaceBackground handles POST /api/image/replace-bg
func (h *Handler) ReplaceBackground(c *gin.Context) {
	var req imageProcessRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ImageData == "" || req.Prompt == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供图片数据和背景描述"})
		return
	}

	imageBytes, err := base64.StdEncoding.DecodeString(req.ImageData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的图片数据"})
		return
	}

	result, err := h.imageProcessing.ReplaceBackground(imageBytes, req.Prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "处理失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"image_data": base64.StdEncoding.EncodeToString(result),
	})
}
