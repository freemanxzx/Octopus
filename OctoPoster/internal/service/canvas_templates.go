package service

import (
	"github.com/google/uuid"
	"github.com/octopus/octoposter/internal/model"
)

// CanvasTemplateRegistry defines preset visual JSON layouts for different page archetypes.
type CanvasTemplateRegistry struct{}

// ApplyTemplate maps the extracted text into pre-defined responsive layer structures.
func ApplyTemplate(pageType string, title string, body string) []*model.CanvasLayer {
	layers := make([]*model.CanvasLayer, 0)

	// 1. Background Placeholder (Universal)
	bgLayer := &model.CanvasLayer{
		ID:         uuid.New().String(),
		Type:       "image",
		Left:       0, Top: 0, Width: 100, Height: 100,
		Visible:    true, Selectable: false, ZIndex: 0,
		Fill:       "#1c1c28",
	}
	layers = append(layers, bgLayer)

	switch pageType {
	case "cover":
		// Cover: Giant centered title, no body text usually, or very small subtitle.
		if title != "" {
			layers = append(layers, &model.CanvasLayer{
				ID: uuid.New().String(), Type: "text",
				Left: 10, Top: 40, Width: 80, Height: 40,
				Visible: true, Selectable: true, ZIndex: 10,
				Content: title, Fill: "#FFFFFF",
				FontSize: 10, FontWeight: "bold", TextAlign: "center",
			})
		}
		if body != "" {
			layers = append(layers, &model.CanvasLayer{
				ID: uuid.New().String(), Type: "text",
				Left: 15, Top: 65, Width: 70, Height: 20,
				Visible: true, Selectable: true, ZIndex: 11,
				Content: body, Fill: "#E2E8F0",
				FontSize: 3.5, FontWeight: "normal", TextAlign: "center",
			})
		}

	case "summary", "listicle":
		// Summary/Listicle: Clean left-aligned layout, prominent title at top
		if title != "" {
			layers = append(layers, &model.CanvasLayer{
				ID: uuid.New().String(), Type: "text",
				Left: 8, Top: 15, Width: 84, Height: 20,
				Visible: true, Selectable: true, ZIndex: 10,
				Content: title, Fill: "#FFFFFF",
				FontSize: 7, FontWeight: "bold", TextAlign: "left",
			})
		}
		if body != "" {
			layers = append(layers, &model.CanvasLayer{
				ID: uuid.New().String(), Type: "text",
				Left: 8, Top: 35, Width: 84, Height: 60,
				Visible: true, Selectable: true, ZIndex: 11,
				Content: body, Fill: "#E2E8F0",
				FontSize: 4, FontWeight: "normal", TextAlign: "left",
			})
		}

	default:
		// Default generic Content Page: Centered title, centered body for balance
		if title != "" {
			layers = append(layers, &model.CanvasLayer{
				ID: uuid.New().String(), Type: "text",
				Left: 10, Top: 12, Width: 80, Height: 20,
				Visible: true, Selectable: true, ZIndex: 10,
				Content: title, Fill: "#FFFFFF",
				FontSize: 8, FontWeight: "bold", TextAlign: "center",
			})
		}
		if body != "" {
			layers = append(layers, &model.CanvasLayer{
				ID: uuid.New().String(), Type: "text",
				Left: 10, Top: 40, Width: 80, Height: 50,
				Visible: true, Selectable: true, ZIndex: 11,
				Content: body, Fill: "#E2E8F0",
				FontSize: 4.2, FontWeight: "normal", TextAlign: "left",
			})
		}
	}

	return layers
}
