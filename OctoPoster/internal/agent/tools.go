package agent

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/cloudwego/eino/components/tool"
	toolutils "github.com/cloudwego/eino/components/tool/utils"
	"github.com/octopus/octoposter/internal/service"
)

// ToolRegistry holds all registered Eino tools backed by OctoPoster services.
// It is safe for concurrent use as all underlying services are stateless.
type ToolRegistry struct {
	outlineSvc      *service.OutlineService
	contentSvc      *service.ContentService
	extractorSvc    *service.ExtractorService
	imageProcessing *service.ImageProcessingService
	tools           map[string]tool.InvokableTool
}

// NewToolRegistry creates a registry and wraps existing services as Eino Tools.
func NewToolRegistry(
	outlineSvc *service.OutlineService,
	contentSvc *service.ContentService,
	extractorSvc *service.ExtractorService,
	imageProcessing *service.ImageProcessingService,
) (*ToolRegistry, error) {
	r := &ToolRegistry{
		outlineSvc:      outlineSvc,
		contentSvc:      contentSvc,
		extractorSvc:    extractorSvc,
		imageProcessing: imageProcessing,
		tools:           make(map[string]tool.InvokableTool),
	}
	if err := r.registerAll(); err != nil {
		return nil, fmt.Errorf("register tools: %w", err)
	}
	return r, nil
}

// Tools returns all registered Eino tools as a slice.
func (r *ToolRegistry) Tools() []tool.InvokableTool {
	result := make([]tool.InvokableTool, 0, len(r.tools))
	for _, t := range r.tools {
		result = append(result, t)
	}
	return result
}

// BaseTools returns all tools as BaseTool (for ToolsNodeConfig compatibility).
func (r *ToolRegistry) BaseTools() []tool.BaseTool {
	result := make([]tool.BaseTool, 0, len(r.tools))
	for _, t := range r.tools {
		result = append(result, t)
	}
	return result
}

// Get returns a specific tool by name.
func (r *ToolRegistry) Get(name string) (tool.InvokableTool, bool) {
	t, ok := r.tools[name]
	return t, ok
}

// registerAll creates and registers all tools.
func (r *ToolRegistry) registerAll() error {
	type toolEntry struct {
		name string
		tool tool.InvokableTool
		err  error
	}

	// --- Outline Generation ---
	t1, err := toolutils.InferTool(
		"generate_outline",
		"根据主题生成小红书图文大纲，返回结构化的多页内容",
		func(ctx context.Context, input *OutlineInput) (*service.OutlineResult, error) {
			return r.outlineSvc.GenerateOutline(input.Topic)
		},
	)
	if err != nil {
		return fmt.Errorf("outline tool: %w", err)
	}
	r.tools["generate_outline"] = t1

	// --- Outline from URL ---
	t2, err := toolutils.InferTool(
		"generate_outline_from_url",
		"从URL提取文章内容并生成小红书图文大纲",
		func(ctx context.Context, input *OutlineFromURLInput) (*service.OutlineResult, error) {
			text, err := r.extractorSvc.ExtractFromURL(input.URL)
			if err != nil {
				return nil, fmt.Errorf("extract URL: %w", err)
			}
			return r.outlineSvc.GenerateOutlineFromText(text)
		},
	)
	if err != nil {
		return fmt.Errorf("outline_from_url tool: %w", err)
	}
	r.tools["generate_outline_from_url"] = t2

	// --- Content Generation ---
	t3, err := toolutils.InferTool(
		"generate_content",
		"根据主题和大纲生成小红书文案（标题、正文、标签）",
		func(ctx context.Context, input *ContentInput) (*service.ContentResult, error) {
			return r.contentSvc.GenerateContent(input.Topic, input.Outline)
		},
	)
	if err != nil {
		return fmt.Errorf("content tool: %w", err)
	}
	r.tools["generate_content"] = t3

	// --- URL Extraction ---
	t4, err := toolutils.InferTool(
		"extract_url",
		"从网页URL提取正文内容，支持公众号、博客、新闻等",
		func(ctx context.Context, input *ExtractURLInput) (*ExtractResult, error) {
			text, err := r.extractorSvc.ExtractFromURL(input.URL)
			if err != nil {
				return nil, err
			}
			return &ExtractResult{Text: text}, nil
		},
	)
	if err != nil {
		return fmt.Errorf("extract_url tool: %w", err)
	}
	r.tools["extract_url"] = t4

	// --- Remove Text from Image ---
	t5, err := toolutils.InferTool(
		"remove_text_from_image",
		"从图片中去除所有文字和水印，保持背景干净",
		func(ctx context.Context, input *ImageInput) (*ImageProcessResult, error) {
			result, err := r.imageProcessing.RemoveTextFromImage([]byte(input.ImageBase64))
			if err != nil {
				return nil, err
			}
			return &ImageProcessResult{Success: true, Size: len(result)}, nil
		},
	)
	if err != nil {
		return fmt.Errorf("remove_text tool: %w", err)
	}
	r.tools["remove_text_from_image"] = t5

	// --- Remove Background ---
	t6, err := toolutils.InferTool(
		"remove_background",
		"去除图片背景，只保留主体",
		func(ctx context.Context, input *ImageInput) (*ImageProcessResult, error) {
			result, err := r.imageProcessing.RemoveBackground([]byte(input.ImageBase64))
			if err != nil {
				return nil, err
			}
			return &ImageProcessResult{Success: true, Size: len(result)}, nil
		},
	)
	if err != nil {
		return fmt.Errorf("remove_bg tool: %w", err)
	}
	r.tools["remove_background"] = t6

	// --- Replace Background ---
	t7, err := toolutils.InferTool(
		"replace_background",
		"替换图片背景为指定场景",
		func(ctx context.Context, input *ReplaceBGInput) (*ImageProcessResult, error) {
			result, err := r.imageProcessing.ReplaceBackground([]byte(input.ImageBase64), input.Prompt)
			if err != nil {
				return nil, err
			}
			return &ImageProcessResult{Success: true, Size: len(result)}, nil
		},
	)
	if err != nil {
		return fmt.Errorf("replace_bg tool: %w", err)
	}
	r.tools["replace_background"] = t7

	return nil
}

// --- Tool Input/Output Types ---
// Eino uses struct tags to auto-infer JSON Schema.
// `jsonschema:"description=..."` provides the parameter description for the LLM.

// OutlineInput is the input for outline generation.
type OutlineInput struct {
	Topic string `json:"topic" jsonschema:"description=创作主题，例如：护肤品测评、旅行攻略"`
}

// OutlineFromURLInput is the input for outline generation from URL.
type OutlineFromURLInput struct {
	URL string `json:"url" jsonschema:"description=要提取内容的网页URL"`
}

// ContentInput is the input for content (copy) generation.
type ContentInput struct {
	Topic   string `json:"topic" jsonschema:"description=创作主题"`
	Outline string `json:"outline" jsonschema:"description=已生成的大纲文本"`
}

// ExtractURLInput is the input for URL text extraction.
type ExtractURLInput struct {
	URL string `json:"url" jsonschema:"description=要提取内容的网页URL"`
}

// ImageInput is the input for image processing tools.
type ImageInput struct {
	ImageBase64 string `json:"image_base64" jsonschema:"description=Base64编码的图片数据"`
}

// ReplaceBGInput is the input for background replacement.
type ReplaceBGInput struct {
	ImageBase64 string `json:"image_base64" jsonschema:"description=Base64编码的图片数据"`
	Prompt      string `json:"prompt" jsonschema:"description=新背景的描述，例如：海滩、星空、简约白色"`
}

// ExtractResult is the output for URL extraction.
type ExtractResult struct {
	Text string `json:"text"`
}

// ImageProcessResult is the output for image processing tools.
type ImageProcessResult struct {
	Success bool `json:"success"`
	Size    int  `json:"size"`
}

// ToolsJSON returns a JSON representation of all registered tools (for debugging).
func (r *ToolRegistry) ToolsJSON() string {
	names := make([]string, 0, len(r.tools))
	for name := range r.tools {
		names = append(names, name)
	}
	data, _ := json.Marshal(names)
	return string(data)
}
