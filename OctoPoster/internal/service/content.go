package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/octopus/octoposter/internal/config"
	"github.com/octopus/octoposter/internal/llm"
)

// ContentResult holds generated titles, copywriting, and tags.
type ContentResult struct {
	Success     bool     `json:"success"`
	Titles      []string `json:"titles,omitempty"`
	Copywriting string   `json:"copywriting,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Error       string   `json:"error,omitempty"`
}

// ContentService generates Xiaohongshu-style titles, copywriting and tags.
type ContentService struct {
	promptTemplate string
}

// NewContentService creates a new content service.
func NewContentService(baseDir string) (*ContentService, error) {
	promptPath := filepath.Join(baseDir, "prompts", "content_prompt.txt")
	data, err := os.ReadFile(promptPath)
	if err != nil {
		return nil, fmt.Errorf("load content prompt: %w", err)
	}
	return &ContentService{promptTemplate: string(data)}, nil
}

// GenerateContent produces titles, copywriting, and tags from topic + outline.
func (s *ContentService) GenerateContent(topic, outline string) (*ContentResult, error) {
	cfg := config.Get()
	providerCfg, err := cfg.GetActiveTextProvider()
	if err != nil {
		return &ContentResult{Success: false, Error: err.Error()}, nil
	}

	client := llm.NewClient(providerCfg)

	prompt := s.promptTemplate
	prompt = strings.ReplaceAll(prompt, "{topic}", topic)
	prompt = strings.ReplaceAll(prompt, "{outline}", outline)

	text, err := client.GenerateText(prompt)
	if err != nil {
		return &ContentResult{Success: false, Error: err.Error()}, nil
	}

	parsed, err := parseJSONResponse(text)
	if err != nil {
		return &ContentResult{Success: false, Error: "AI 返回的内容格式不正确: " + err.Error()}, nil
	}

	return &ContentResult{
		Success:     true,
		Titles:      parsed.Titles,
		Copywriting: parsed.Copywriting,
		Tags:        parsed.Tags,
	}, nil
}

type contentJSON struct {
	Titles      []string `json:"titles"`
	Copywriting string   `json:"copywriting"`
	Tags        []string `json:"tags"`
}

// parseJSONResponse attempts to extract JSON from the LLM response with multiple fallbacks.
func parseJSONResponse(text string) (*contentJSON, error) {
	// Try 1: direct parse
	var result contentJSON
	if err := json.Unmarshal([]byte(text), &result); err == nil {
		return &result, nil
	}

	// Try 2: extract from markdown code block
	re := regexp.MustCompile("(?s)```(?:json)?\\s*\\n?(.+?)\\n?```")
	if m := re.FindStringSubmatch(text); len(m) > 1 {
		if err := json.Unmarshal([]byte(strings.TrimSpace(m[1])), &result); err == nil {
			return &result, nil
		}
	}

	// Try 3: find JSON object boundaries
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start != -1 && end != -1 && end > start {
		if err := json.Unmarshal([]byte(text[start:end+1]), &result); err == nil {
			return &result, nil
		}
	}

	return nil, fmt.Errorf("cannot parse JSON from response")
}
