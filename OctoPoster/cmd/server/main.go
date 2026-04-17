package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/octopus/octoposter/internal/config"
	"github.com/octopus/octoposter/internal/handler"
	"github.com/octopus/octoposter/internal/service"
)

func main() {
	// Determine base directory (executable location)
	exe, err := os.Executable()
	if err != nil {
		log.Fatal("cannot determine executable path:", err)
	}
	baseDir := filepath.Dir(filepath.Dir(filepath.Dir(exe)))

	// For development: use current working directory
	if _, err := os.Stat(filepath.Join(baseDir, "prompts")); os.IsNotExist(err) {
		baseDir, _ = os.Getwd()
	}

	fmt.Println("🐙 OctoPoster - AI 小红书图文生成器")
	fmt.Printf("📂 工作目录: %s\n", baseDir)

	// Load config
	cfg := config.Get()
	if err := cfg.Load(baseDir); err != nil {
		log.Printf("⚠️  配置加载警告: %v", err)
	}

	// Create Gin router
	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSOrigins,
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Content-Type", "Authorization"},
	}))

	// Initialize credit service
	creditPath := filepath.Join(baseDir, "data", "credits.json")
	creditSvc, err := service.NewCreditService(creditPath)
	if err != nil {
		log.Printf("⚠️  Credits service init failed (will use memory only): %v", err)
	}

	// Register API handlers
	h, err := handler.New(baseDir, creditSvc)
	if err != nil {
		log.Fatal("handler init failed:", err)
	}
	h.RegisterRoutes(r)

	// Serve embedded frontend (if dist/ folder exists)
	distDir := filepath.Join(baseDir, "web", "dist")
	if info, err := os.Stat(distDir); err == nil && info.IsDir() {
		fmt.Println("📦 前端构建产物已检测到，启用静态托管")
		r.Static("/assets", filepath.Join(distDir, "assets"))
		r.StaticFile("/", filepath.Join(distDir, "index.html"))
		r.NoRoute(func(c *gin.Context) {
			c.File(filepath.Join(distDir, "index.html"))
		})
	} else {
		fmt.Println("🔧 开发模式 - 前端请单独启动 (npm run dev)")
		r.GET("/", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "OctoPoster API",
				"version": "0.1.0",
				"endpoints": gin.H{
					"health":   "GET /api/health",
					"outline":  "POST /api/outline",
					"content":  "POST /api/content",
					"generate": "POST /api/generate",
					"images":   "GET /api/images/:taskId/:filename",
				},
			})
		})
	}

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	fmt.Printf("🚀 服务启动: http://localhost:%d\n", cfg.Port)
	if err := r.Run(addr); err != nil {
		log.Fatal("server error:", err)
	}
}
