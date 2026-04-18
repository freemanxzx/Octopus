package model

// CanvasDocument represents a top-level canvas layout structure.
// This is the standard JSON protocol connecting the Agent backend to the Vue frontend.
type CanvasDocument struct {
	ID          string        `json:"id"`
	Title       string        `json:"title"`
	AspectRatio string        `json:"aspect_ratio"` // e.g., "3:4", "16:9", "1:1"
	Width       int           `json:"width"`        // Base resolution width
	Height      int           `json:"height"`       // Base resolution height
	Background  string        `json:"background"`   // Fill color or image URL
	Pages       []*CanvasPage `json:"pages"`
}

// CanvasPage represents a single poster or slide in the document.
type CanvasPage struct {
	ID         string         `json:"id"`
	PageNumber int            `json:"page_number"`
	Layers     []*CanvasLayer `json:"layers"`
}

// CanvasLayer represents a single visual element on the canvas.
type CanvasLayer struct {
	ID   string `json:"id"`
	Type string `json:"type"` // "text", "image", "shape", "group"

	// Bounding Box (Relative or Absolute depending on mode, usually absolute baseline)
	Left   float64 `json:"left"`
	Top    float64 `json:"top"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`

	// Layer Control
	Visible    bool    `json:"visible"`
	Selectable bool    `json:"selectable"`
	ZIndex     float64 `json:"z_index"`

	// Element Specific Data
	Content string `json:"content,omitempty"` // For text layer
	Src     string `json:"src,omitempty"`     // For image layer, could be data URI or URL

	// Common styling
	Fill    string `json:"fill,omitempty"`
	Opacity float64 `json:"opacity,omitempty"`

	// Text specific
	FontSize   float64 `json:"font_size,omitempty"`
	FontFamily string  `json:"font_family,omitempty"`
	FontWeight string  `json:"font_weight,omitempty"`
	TextAlign  string  `json:"text_align,omitempty"` // left, center, right
}

// Default layout constraints logic can be added here
// e.g. mapping percentages to absolute values based on Target Width/Height
