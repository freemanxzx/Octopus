package service

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/octopus/octoposter/internal/config"
	"github.com/octopus/octoposter/internal/llm"
)

// Page represents one parsed page from the outline.
type Page struct {
	Index   int    `json:"index"`
	Type    string `json:"type"`    // "cover", "content", "summary"
	Content string `json:"content"`
}

// OutlineResult is the result of generating an outline.
type OutlineResult struct {
	Success  bool   `json:"success"`
	Outline  string `json:"outline,omitempty"`
	Pages    []Page `json:"pages,omitempty"`
	Error    string `json:"error,omitempty"`
}

// OutlineService handles outline generation and parsing.
type OutlineService struct {
	promptTemplate      string
	smartPromptTemplate string
}

// NewOutlineService creates a new outline service, loading the prompt templates.
func NewOutlineService(baseDir string) (*OutlineService, error) {
	promptPath := filepath.Join(baseDir, "prompts", "outline_prompt.txt")
	data, err := os.ReadFile(promptPath)
	if err != nil {
		return nil, fmt.Errorf("load outline prompt: %w", err)
	}

	// Load smart outline prompt (optional, for URL/doc import)
	smartPath := filepath.Join(baseDir, "prompts", "smart_outline_prompt.txt")
	smartData, _ := os.ReadFile(smartPath)

	return &OutlineService{
		promptTemplate:      string(data),
		smartPromptTemplate: string(smartData),
	}, nil
}

// GenerateOutline calls the LLM to produce a structured outline.
func (s *OutlineService) GenerateOutline(topic string, images ...string) (*OutlineResult, error) {
	cfg := config.Get()
	providerCfg, err := cfg.GetActiveTextProvider()
	if err != nil {
		return &OutlineResult{Success: false, Error: err.Error()}, nil
	}

	client := llm.NewClient(providerCfg)
	prompt := strings.ReplaceAll(s.promptTemplate, "{topic}", topic)
	
	if len(images) > 0 {
		prompt += fmt.Sprintf("\n\n注意：用户提供了 %d 张参考图片，请在生成大纲时考虑这些图片的内容和风格。这些图片可能是产品图、个人照片或场景图，请根据图片内容来优化大纲，使生成的内容与图片相关联。", len(images))
	}

	text, err := client.GenerateText(prompt, images...)
	if err != nil {
		return &OutlineResult{Success: false, Error: err.Error()}, nil
	}

	pages := parseOutline(text)
	return &OutlineResult{
		Success: true,
		Outline: text,
		Pages:   pages,
	}, nil
}

// GenerateOutlineFromText creates an outline from existing long-form text (e.g. scraped article or uploaded document).
func (s *OutlineService) GenerateOutlineFromText(sourceText string) (*OutlineResult, error) {
	if s.smartPromptTemplate == "" {
		// Fallback: treat source text as the topic
		return s.GenerateOutline(sourceText)
	}

	cfg := config.Get()
	providerCfg, err := cfg.GetActiveTextProvider()
	if err != nil {
		return &OutlineResult{Success: false, Error: err.Error()}, nil
	}

	client := llm.NewClient(providerCfg)
	prompt := strings.ReplaceAll(s.smartPromptTemplate, "{source_text}", sourceText)

	text, err := client.GenerateText(prompt)
	if err != nil {
		return &OutlineResult{Success: false, Error: err.Error()}, nil
	}

	pages := parseOutline(text)
	return &OutlineResult{
		Success: true,
		Outline: text,
		Pages:   pages,
	}, nil
}

// parseOutline splits the LLM output into pages using <page> delimiters.
func parseOutline(text string) []Page {
	var rawPages []string
	if strings.Contains(strings.ToLower(text), "<page>") {
		re := regexp.MustCompile(`(?i)<page>`)
		rawPages = re.Split(text, -1)
	} else {
		rawPages = strings.Split(text, "---")
	}

	typeMap := map[string]string{
		"封面": "cover",
		"内容": "content",
		"总结": "summary",
	}

	var pages []Page
	idx := 0
	typeRe := regexp.MustCompile(`^\[(\S+)\]`)

	for _, raw := range rawPages {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}

		pageType := "content"
		if m := typeRe.FindStringSubmatch(raw); len(m) > 1 {
			if mapped, ok := typeMap[m[1]]; ok {
				pageType = mapped
			}
		}

		pages = append(pages, Page{
			Index:   idx,
			Type:    pageType,
			Content: raw,
		})
		idx++
	}

	return pages
}
