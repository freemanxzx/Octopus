package generator

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/octopus/octoposter/internal/config"
)

// OpenAIImagesGenerator implements ImageGenerator using the /v1/images/generations endpoint.
type OpenAIImagesGenerator struct {
	httpClient *http.Client
	cfg        config.ProviderConfig
}

// NewOpenAIImagesGenerator creates a new generator for OpenAI-compatible image APIs.
func NewOpenAIImagesGenerator(cfg config.ProviderConfig) *OpenAIImagesGenerator {
	return &OpenAIImagesGenerator{
		httpClient: &http.Client{Timeout: 300 * time.Second},
		cfg:        cfg,
	}
}

type imagesRequest struct {
	Model          string   `json:"model"`
	Prompt         string   `json:"prompt"`
	ResponseFormat string   `json:"response_format"`
	AspectRatio    string   `json:"aspect_ratio,omitempty"`
	ImageSize      string   `json:"image_size,omitempty"`
	Image          []string `json:"image,omitempty"`
}

type imagesResponseItem struct {
	B64JSON string `json:"b64_json"`
}

type imagesResponse struct {
	Data []imagesResponseItem `json:"data"`
}

func (g *OpenAIImagesGenerator) Generate(prompt string, aspectRatio string, model string, referenceImage []byte) ([]byte, error) {
	baseURL := strings.TrimRight(g.cfg.BaseURL, "/")
	if strings.HasSuffix(baseURL, "/v1") {
		baseURL = baseURL[:len(baseURL)-3]
	}

	if model == "" {
		model = g.cfg.Model
	}
	if aspectRatio == "" {
		aspectRatio = g.cfg.DefaultAspectRatio
		if aspectRatio == "" {
			aspectRatio = "3:4"
		}
	}

	finalPrompt := prompt

	// Build request
	reqBody := imagesRequest{
		Model:          model,
		Prompt:         finalPrompt,
		ResponseFormat: "b64_json",
		AspectRatio:    aspectRatio,
		ImageSize:      g.cfg.ImageSize,
	}

	// If we have a reference image, enhance the prompt and add image data
	if len(referenceImage) > 0 {
		b64 := base64.StdEncoding.EncodeToString(referenceImage)
		dataURI := "data:image/png;base64," + b64
		reqBody.Image = []string{dataURI}
		reqBody.Prompt = fmt.Sprintf(
			"参考提供的 1 张图片的风格（色彩、光影、构图、氛围），生成一张新图片。\n\n新图片内容：%s\n\n要求：\n1. 保持相似的色调和氛围\n2. 使用相似的光影处理\n3. 保持一致的画面质感\n4. 如果参考图中有人物或产品，可以适当融入",
			prompt,
		)
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal image request: %w", err)
	}

	endpoint := g.cfg.EndpointType
	if endpoint == "" || endpoint == "images" {
		endpoint = "/v1/images/generations"
	}
	if !strings.HasPrefix(endpoint, "/") {
		endpoint = "/" + endpoint
	}

	url := baseURL + endpoint
	req, err := http.NewRequest("POST", url, bytes.NewReader(jsonData))
	if err != nil {
		return nil, fmt.Errorf("create image request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+g.cfg.APIKey)

	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("image API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("image API error (status %d): %s", resp.StatusCode, truncateStr(string(body), 500))
	}

	var imgResp imagesResponse
	if err := json.Unmarshal(body, &imgResp); err != nil {
		return nil, fmt.Errorf("parse image response: %w", err)
	}

	if len(imgResp.Data) == 0 {
		return nil, fmt.Errorf("image API returned empty data")
	}

	b64Data := imgResp.Data[0].B64JSON
	// Strip data URI prefix if present
	if idx := strings.Index(b64Data, ","); idx != -1 {
		b64Data = b64Data[idx+1:]
	}

	imageBytes, err := base64.StdEncoding.DecodeString(b64Data)
	if err != nil {
		return nil, fmt.Errorf("decode b64 image: %w", err)
	}

	return imageBytes, nil
}

func truncateStr(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
