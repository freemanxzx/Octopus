package handler

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/octopus/octoposter/internal/config"
	"gopkg.in/yaml.v3"
)

// GetConfig handles GET /api/config
func (h *Handler) GetConfig(c *gin.Context) {
	cfg := config.Get()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"config": gin.H{
			"text_generation": gin.H{
				"active_provider": cfg.TextProviders.ActiveProvider,
				"providers":       maskProviders(cfg.TextProviders.Providers),
			},
			"image_generation": gin.H{
				"active_provider": cfg.ImageProviders.ActiveProvider,
				"providers":       maskProviders(cfg.ImageProviders.Providers),
			},
		},
	})
}

func maskProviders(providers map[string]config.ProviderConfig) map[string]interface{} {
	result := map[string]interface{}{}
	for name, p := range providers {
		masked := map[string]interface{}{
			"type":      p.Type,
			"model":     p.Model,
			"base_url":  p.BaseURL,
			"has_key":   p.APIKey != "",
		}
		if p.APIKey != "" {
			if len(p.APIKey) > 8 {
				masked["api_key_masked"] = p.APIKey[:4] + "****" + p.APIKey[len(p.APIKey)-4:]
			} else {
				masked["api_key_masked"] = "****"
			}
		}
		result[name] = masked
	}
	return result
}

// SaveConfig handles POST /api/config
func (h *Handler) SaveConfig(c *gin.Context) {
	var req struct {
		TextGeneration  *configSection `json:"text_generation"`
		ImageGeneration *configSection `json:"image_generation"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "invalid request"})
		return
	}

	if req.TextGeneration != nil {
		updateYAMLConfig(filepath.Join(h.baseDir, "text_providers.yaml"), req.TextGeneration)
	}
	if req.ImageGeneration != nil {
		updateYAMLConfig(filepath.Join(h.baseDir, "image_providers.yaml"), req.ImageGeneration)
	}

	// Reload config
	config.Reload()

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "配置已保存"})
}

type configSection struct {
	ActiveProvider string                            `json:"active_provider"`
	Providers      map[string]map[string]interface{} `json:"providers"`
}

func updateYAMLConfig(path string, section *configSection) {
	existing := map[string]interface{}{}
	if data, err := os.ReadFile(path); err == nil {
		yaml.Unmarshal(data, &existing)
	}
	if section.ActiveProvider != "" {
		existing["active_provider"] = section.ActiveProvider
	}
	if section.Providers != nil {
		// Preserve existing api_keys if new ones are empty
		existingProviders, _ := existing["providers"].(map[string]interface{})
		for name, newCfg := range section.Providers {
			apiKey, _ := newCfg["api_key"].(string)
			if apiKey == "" && existingProviders != nil {
				if old, ok := existingProviders[name].(map[string]interface{}); ok {
					if oldKey, ok := old["api_key"].(string); ok {
						newCfg["api_key"] = oldKey
					}
				}
			}
			delete(newCfg, "api_key_masked")
			delete(newCfg, "has_key")
		}
		existing["providers"] = section.Providers
	}
	data, _ := yaml.Marshal(existing)
	os.WriteFile(path, data, 0644)
}

// TestConnection handles POST /api/config/test
func (h *Handler) TestConnection(c *gin.Context) {
	var req struct {
		Type   string `json:"type"`
		APIKey string `json:"api_key"`
		BaseURL string `json:"base_url"`
		Model  string `json:"model"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Type == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "type required"})
		return
	}

	if req.APIKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "API Key required"})
		return
	}

	baseURL := strings.TrimRight(req.BaseURL, "/")
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com/v1beta/openai"
	}

	model := req.Model
	if model == "" {
		model = "gemini-2.0-flash"
	}

	// Send a simple test request
	payload := fmt.Sprintf(`{"model":"%s","messages":[{"role":"user","content":"回复'你好'"}],"max_tokens":50}`, model)
	httpReq, _ := http.NewRequest("POST", baseURL+"/chat/completions", bytes.NewBufferString(payload))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+req.APIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "error": fmt.Sprintf("连接失败: %s", err.Error())})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		c.JSON(http.StatusOK, gin.H{"success": false, "error": fmt.Sprintf("HTTP %d: %s", resp.StatusCode, truncateStr(string(body), 200))})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "连接成功！"})
}

func truncateStr(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// RegenerateImage handles POST /api/regenerate
func (h *Handler) RegenerateImage(c *gin.Context) {
	// Reuse the same logic as retry but with explicit name for frontend clarity
	h.RetryImage(c)
}
