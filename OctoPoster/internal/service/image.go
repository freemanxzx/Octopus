package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/octopus/octoposter/internal/config"
	"github.com/octopus/octoposter/internal/generator"
	"github.com/octopus/octoposter/internal/util"
)

const maxConcurrent = 15

// SSEvent represents a Server-Sent Event for image generation progress.
type SSEvent struct {
	Event string      `json:"event"` // "progress", "complete", "error", "finish"
	Data  interface{} `json:"data"`
}

// ImageService orchestrates the two-phase image generation pipeline.
type ImageService struct {
	gen            generator.ImageGenerator
	promptTemplate string
	promptShort    string
	historyDir     string
	useShortPrompt bool
	highConcurrency bool
	providerCfg    config.ProviderConfig
}

// NewImageService creates a new image generation service.
func NewImageService(baseDir string) (*ImageService, error) {
	cfg := config.Get()
	providerCfg, err := cfg.GetActiveImageProvider()
	if err != nil {
		return nil, err
	}

	// Load prompt templates
	promptPath := filepath.Join(baseDir, "prompts", "image_prompt.txt")
	promptData, err := os.ReadFile(promptPath)
	if err != nil {
		return nil, fmt.Errorf("load image prompt: %w", err)
	}

	promptShortPath := filepath.Join(baseDir, "prompts", "image_prompt_short.txt")
	promptShort, _ := os.ReadFile(promptShortPath) // optional

	historyDir := filepath.Join(baseDir, "history")
	os.MkdirAll(historyDir, 0755)

	gen := generator.NewOpenAIImagesGenerator(providerCfg)

	return &ImageService{
		gen:             gen,
		promptTemplate:  string(promptData),
		promptShort:     string(promptShort),
		historyDir:      historyDir,
		useShortPrompt:  providerCfg.ShortPrompt,
		highConcurrency: providerCfg.HighConcurrency,
		providerCfg:     providerCfg,
	}, nil
}

// GenerateImages runs the two-phase generation pipeline and sends SSE events to the channel.
func (s *ImageService) GenerateImages(
	pages []Page,
	taskID string,
	fullOutline string,
	userTopic string,
	style string,
) <-chan SSEvent {
	events := make(chan SSEvent, 64)
	go func() {
		defer close(events)

		taskDir := filepath.Join(s.historyDir, taskID)
		os.MkdirAll(taskDir, 0755)

		total := len(pages)

		// Split cover from content pages
		var coverPage *Page
		var contentPages []Page
		for i := range pages {
			if pages[i].Type == "cover" {
				coverPage = &pages[i]
			} else {
				contentPages = append(contentPages, pages[i])
			}
		}
		if coverPage == nil && len(pages) > 0 {
			coverPage = &pages[0]
			contentPages = pages[1:]
		}

		var coverImageData []byte

		// ========== Phase 1: Generate cover ==========
		if coverPage != nil {
			events <- SSEvent{
				Event: "progress",
				Data: map[string]interface{}{
					"index": coverPage.Index, "status": "generating",
					"message": "正在生成封面...", "current": 1, "total": total, "phase": "cover",
				},
			}

			prompt := s.buildPrompt(coverPage.Content, coverPage.Type, fullOutline, userTopic, style)
			imgData, err := s.gen.Generate(prompt, s.providerCfg.DefaultAspectRatio, s.providerCfg.Model, nil)
			if err != nil {
				events <- SSEvent{Event: "error", Data: map[string]interface{}{
					"index": coverPage.Index, "status": "error", "message": err.Error(), "retryable": true, "phase": "cover",
				}}
			} else {
				filename := fmt.Sprintf("%d.png", coverPage.Index)
				os.WriteFile(filepath.Join(taskDir, filename), imgData, 0644)

				// Compress for reference
				coverImageData, _ = util.CompressImage(imgData, 200)

				events <- SSEvent{Event: "complete", Data: map[string]interface{}{
					"index": coverPage.Index, "status": "done",
					"image_url": fmt.Sprintf("/api/images/%s/%s", taskID, filename), "phase": "cover",
				}}
			}
		}

		// ========== Phase 2: Generate content pages ==========
		if len(contentPages) > 0 {
			events <- SSEvent{Event: "progress", Data: map[string]interface{}{
				"status": "batch_start",
				"message": fmt.Sprintf("开始生成 %d 页内容...", len(contentPages)),
				"total": total, "phase": "content",
			}}

			if s.highConcurrency {
				// Concurrent generation with goroutines
				sem := make(chan struct{}, maxConcurrent)
				var wg sync.WaitGroup

				for _, page := range contentPages {
					wg.Add(1)
					page := page
					events <- SSEvent{Event: "progress", Data: map[string]interface{}{
						"index": page.Index, "status": "generating", "phase": "content",
					}}

					sem <- struct{}{}
					go func() {
						defer wg.Done()
						defer func() { <-sem }()
						s.generateSinglePage(page, taskID, taskDir, coverImageData, fullOutline, userTopic, style, events)
					}()
				}
				wg.Wait()
			} else {
				// Sequential generation
				for _, page := range contentPages {
					events <- SSEvent{Event: "progress", Data: map[string]interface{}{
						"index": page.Index, "status": "generating", "phase": "content",
					}}
					s.generateSinglePage(page, taskID, taskDir, coverImageData, fullOutline, userTopic, style, events)
				}
			}
		}

		// ========== Finish ==========
		events <- SSEvent{Event: "finish", Data: map[string]interface{}{
			"task_id": taskID, "total": total,
		}}
	}()
	return events
}

func (s *ImageService) generateSinglePage(
	page Page, taskID, taskDir string,
	coverRef []byte, fullOutline, userTopic, style string,
	events chan<- SSEvent,
) {
	prompt := s.buildPrompt(page.Content, page.Type, fullOutline, userTopic, style)
	imgData, err := s.gen.Generate(prompt, s.providerCfg.DefaultAspectRatio, s.providerCfg.Model, coverRef)
	if err != nil {
		events <- SSEvent{Event: "error", Data: map[string]interface{}{
			"index": page.Index, "status": "error", "message": err.Error(), "retryable": true, "phase": "content",
		}}
		return
	}

	filename := fmt.Sprintf("%d.png", page.Index)
	os.WriteFile(filepath.Join(taskDir, filename), imgData, 0644)

	events <- SSEvent{Event: "complete", Data: map[string]interface{}{
		"index": page.Index, "status": "done",
		"image_url": fmt.Sprintf("/api/images/%s/%s", taskID, filename), "phase": "content",
	}}
}

func (s *ImageService) buildPrompt(content, pageType, fullOutline, userTopic, style string) string {
	if s.useShortPrompt && s.promptShort != "" {
		p := s.promptShort
		p = strings.ReplaceAll(p, "{page_content}", content)
		p = strings.ReplaceAll(p, "{page_type}", pageType)
		return p
	}

	p := s.promptTemplate
	p = strings.ReplaceAll(p, "{page_content}", content)
	p = strings.ReplaceAll(p, "{page_type}", pageType)
	p = strings.ReplaceAll(p, "{full_outline}", fullOutline)
	if userTopic == "" {
		userTopic = "未提供"
	}
	p = strings.ReplaceAll(p, "{user_topic}", userTopic)

	// Inject Style
	styleDesc := ""
	switch style {
	case "minimalist":
		styleDesc = "极简、留白、扁平化风格"
	case "illustration":
		styleDesc = "精美的商业手绘插画风"
	case "photography":
		styleDesc = "8K超高清真实摄影风格"
	case "workplace":
		styleDesc = "高级商务职场精英风"
	}
	if styleDesc != "" {
		p += "\n【重点视觉风格要求】: 必须使用" + styleDesc + "进行绘制，确保整体画面纯净高级。"
	}

	return p
}

// GetImagePath returns the full path of a generated image.
func (s *ImageService) GetImagePath(taskID, filename string) string {
	return filepath.Join(s.historyDir, taskID, filename)
}
