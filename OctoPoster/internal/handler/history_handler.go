package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/octopus/octoposter/internal/service"
)

// HistoryHandler holds history-related HTTP handlers.
type HistoryHandler struct {
	svc *service.HistoryService
}

// NewHistoryHandler creates a new history handler.
func NewHistoryHandler(baseDir string) *HistoryHandler {
	return &HistoryHandler{svc: service.NewHistoryService(baseDir)}
}

// RegisterRoutes registers all history API routes.
func (h *HistoryHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/history", h.Create)
	rg.GET("/history", h.List)
	rg.GET("/history/search", h.Search)
	rg.GET("/history/stats", h.Stats)
	rg.GET("/history/:id", h.Get)
	rg.GET("/history/:id/exists", h.Exists)
	rg.PUT("/history/:id", h.Update)
	rg.DELETE("/history/:id", h.Delete)
	rg.GET("/history/:id/download", h.Download)
	rg.GET("/history/scan/:taskId", h.ScanTask)
	rg.POST("/history/scan-all", h.ScanAll)
}

func (h *HistoryHandler) Create(c *gin.Context) {
	var req struct {
		Topic   string                 `json:"topic"`
		Outline map[string]interface{} `json:"outline"`
		TaskID  string                 `json:"task_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Topic == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "topic 和 outline 不能为空"})
		return
	}
	id := h.svc.CreateRecord(req.Topic, req.Outline, req.TaskID)
	c.JSON(http.StatusOK, gin.H{"success": true, "record_id": id})
}

func (h *HistoryHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")

	records, total, totalPages := h.svc.ListRecords(page, pageSize, status)
	c.JSON(http.StatusOK, gin.H{
		"success": true, "records": records, "total": total,
		"page": page, "page_size": pageSize, "total_pages": totalPages,
	})
}

func (h *HistoryHandler) Get(c *gin.Context) {
	rec, err := h.svc.GetRecord(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "record": rec})
}

func (h *HistoryHandler) Exists(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"exists": h.svc.RecordExists(c.Param("id"))})
}

func (h *HistoryHandler) Update(c *gin.Context) {
	var req struct {
		Outline   map[string]interface{} `json:"outline"`
		Images    *service.HistoryImages `json:"images"`
		Status    string                 `json:"status"`
		Thumbnail string                 `json:"thumbnail"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid request"})
		return
	}
	if err := h.svc.UpdateRecord(c.Param("id"), req.Outline, req.Images, req.Status, req.Thumbnail); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *HistoryHandler) Delete(c *gin.Context) {
	if err := h.svc.DeleteRecord(c.Param("id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *HistoryHandler) Search(c *gin.Context) {
	kw := c.Query("keyword")
	if kw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "keyword required"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "records": h.svc.SearchRecords(kw)})
}

func (h *HistoryHandler) Stats(c *gin.Context) {
	stats := h.svc.GetStatistics()
	stats["success"] = true
	c.JSON(http.StatusOK, stats)
}

func (h *HistoryHandler) ScanTask(c *gin.Context) {
	result := h.svc.ScanAndSyncTaskImages(c.Param("taskId"))
	c.JSON(http.StatusOK, result)
}

func (h *HistoryHandler) ScanAll(c *gin.Context) {
	result := h.svc.ScanAllTasks()
	c.JSON(http.StatusOK, result)
}

func (h *HistoryHandler) Download(c *gin.Context) {
	rec, err := h.svc.GetRecord(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": err.Error()})
		return
	}
	if rec.Images.TaskID == "" {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "no task images"})
		return
	}
	buf, err := h.svc.CreateImagesZip(rec.Images.TaskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}
	filename := rec.Title + ".zip"
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/zip", buf.Bytes())
}
