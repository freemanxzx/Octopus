package service

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
)

// TemplateMeta describes a poster template.
type TemplateMeta struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Preview      string   `json:"preview"`
	Slots        []string `json:"slots"`
	Category     string   `json:"category"`
	AspectRatios []string `json:"aspect_ratios"`
}

// TemplateService manages poster templates and renders them via headless Chrome.
type TemplateService struct {
	baseDir      string
	templateDir  string
	templates    []TemplateMeta
}

// NewTemplateService scans the templates directory and loads all available templates.
func NewTemplateService(baseDir string) (*TemplateService, error) {
	templateDir := filepath.Join(baseDir, "templates")

	svc := &TemplateService{
		baseDir:     baseDir,
		templateDir: templateDir,
	}

	// Scan templates directory
	entries, err := os.ReadDir(templateDir)
	if err != nil {
		if os.IsNotExist(err) {
			return svc, nil // No templates directory yet
		}
		return nil, fmt.Errorf("read templates dir: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		metaPath := filepath.Join(templateDir, entry.Name(), "metadata.json")
		data, err := os.ReadFile(metaPath)
		if err != nil {
			continue // Skip templates without metadata
		}
		var meta TemplateMeta
		if err := json.Unmarshal(data, &meta); err != nil {
			continue
		}
		svc.templates = append(svc.templates, meta)
	}

	return svc, nil
}

// ListTemplates returns all available templates.
func (s *TemplateService) ListTemplates() []TemplateMeta {
	return s.templates
}

// AspectRatioToDimensions converts a ratio string to pixel dimensions.
func AspectRatioToDimensions(ratio string) (int, int) {
	switch ratio {
	case "1:1":
		return 1080, 1080
	case "3:4":
		return 1080, 1440
	case "16:9":
		return 1920, 1080
	case "9:16":
		return 1080, 1920
	case "4:3":
		return 1440, 1080
	default:
		return 1080, 1440 // Default to 3:4
	}
}

// RenderTemplateRequest holds the parameters for rendering a template.
type RenderTemplateRequest struct {
	TemplateID string            `json:"template_id"`
	Data       map[string]string `json:"data"`
	Ratio      string            `json:"ratio"`
}

// RenderTemplate fills a template with data and renders it to a PNG via headless Chrome.
func (s *TemplateService) RenderTemplate(req RenderTemplateRequest) ([]byte, error) {
	// Find template
	templatePath := filepath.Join(s.templateDir, req.TemplateID, "template.html")
	htmlData, err := os.ReadFile(templatePath)
	if err != nil {
		return nil, fmt.Errorf("模板不存在: %s", req.TemplateID)
	}

	// Determine dimensions
	ratio := req.Ratio
	if ratio == "" {
		ratio = "3:4"
	}
	width, height := AspectRatioToDimensions(ratio)

	// Replace placeholders
	html := string(htmlData)
	html = strings.ReplaceAll(html, "{{WIDTH}}", fmt.Sprintf("%d", width))
	html = strings.ReplaceAll(html, "{{HEIGHT}}", fmt.Sprintf("%d", height))

	for key, value := range req.Data {
		placeholder := "{{" + strings.ToUpper(key) + "}}"
		html = strings.ReplaceAll(html, placeholder, value)
	}

	// Format points if provided as semicolon-separated text
	if points, ok := req.Data["points"]; ok {
		pointItems := strings.Split(points, ";")
		var pointsHTML strings.Builder
		icons := []string{"✨", "💡", "🎯", "⚡", "🔥", "💎", "🌟", "📌"}
		for i, item := range pointItems {
			item = strings.TrimSpace(item)
			if item == "" {
				continue
			}
			icon := icons[i%len(icons)]
			pointsHTML.WriteString(fmt.Sprintf(
				`<div class="point"><span class="point-icon">%s</span><span>%s</span></div>`,
				icon, item,
			))
		}
		html = strings.ReplaceAll(html, "{{POINTS}}", pointsHTML.String())
	}

	// Render via headless Chrome
	return s.renderHTMLToImage(html, width, height)
}

// renderHTMLToImage takes raw HTML and renders it to a PNG screenshot using chromedp.
func (s *TemplateService) renderHTMLToImage(html string, width, height int) ([]byte, error) {
	// Create headless Chrome context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Configure headless Chrome options
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.WindowSize(width, height),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-dev-shm-usage", true),
	)

	allocCtx, allocCancel := chromedp.NewExecAllocator(ctx, opts...)
	defer allocCancel()

	chromeCtx, chromeCancel := chromedp.NewContext(allocCtx)
	defer chromeCancel()

	var buf []byte

	// Navigate to data URL and capture screenshot
	dataURL := "data:text/html;charset=utf-8," + html

	err := chromedp.Run(chromeCtx,
		chromedp.EmulateViewport(int64(width), int64(height), chromedp.EmulateScale(2)), // 2x for Retina
		chromedp.Navigate(dataURL),
		chromedp.Sleep(1500*time.Millisecond), // Wait for fonts to load
		chromedp.FullScreenshot(&buf, 100),
	)
	if err != nil {
		return nil, fmt.Errorf("chromedp render: %w", err)
	}

	return buf, nil
}
