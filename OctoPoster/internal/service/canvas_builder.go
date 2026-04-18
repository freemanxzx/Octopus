package service

import (
	"strings"

	"github.com/google/uuid"
	"github.com/octopus/octoposter/internal/model"
)

// CanvasBuilder provides utilities to construct a CanvasDocument protocol
// from LLM generated outlines or raw data.
type CanvasBuilder struct{}

// NewCanvasBuilder creates a CanvasBuilder.
func NewCanvasBuilder() *CanvasBuilder {
	return &CanvasBuilder{}
}

// BuildFromOutline converts a parsed OutlineResult into a strict CanvasDocument.
func (b *CanvasBuilder) BuildFromOutline(topic string, outline *OutlineResult, aspectRatio string) *model.CanvasDocument {
	w, h := getDimensionsFromRatio(aspectRatio)

	doc := &model.CanvasDocument{
		ID:          uuid.New().String(),
		Title:       topic,
		AspectRatio: aspectRatio,
		Width:       w,
		Height:      h,
		Background:  "#0B0B0F", // Default dark mode background
		Pages:       make([]*model.CanvasPage, 0, len(outline.Pages)),
	}

	for i, p := range outline.Pages {
		page := &model.CanvasPage{
			ID:         uuid.New().String(),
			PageNumber: i + 1,
			Layers:     make([]*model.CanvasLayer, 0),
		}

		// Parse the page content to extract title and body
		title, body := extractTextComponents(p.Content)

		// Apply archetype template patterns based on identified type
		page.Layers = ApplyTemplate(p.Type, title, body)

		doc.Pages = append(doc.Pages, page)
	}

	return doc
}

// getDimensionsFromRatio returns base pixel dimensions for a given ratio.
func getDimensionsFromRatio(ratio string) (int, int) {
	switch ratio {
	case "16:9":
		return 1920, 1080
	case "1:1":
		return 1080, 1080
	case "3:4":
		return 1080, 1440
	default:
		return 1080, 1440 // default to 3:4 for xiaohongshu
	}
}

// extractTextComponents does basic heuristic parsing to split Page content into Title / Body.
func extractTextComponents(content string) (string, string) {
	lines := strings.Split(content, "\n")
	var title string
	var bodyBuilder strings.Builder

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if title == "" {
			// Remove common markdown prefixes for title
			title = strings.TrimPrefix(line, "标题：")
			title = strings.TrimPrefix(title, "Title:")
			title = strings.TrimLeft(title, "#* ")
		} else {
			bodyBuilder.WriteString(line)
			bodyBuilder.WriteString("\n")
		}
	}

	return title, strings.TrimSpace(bodyBuilder.String())
}
