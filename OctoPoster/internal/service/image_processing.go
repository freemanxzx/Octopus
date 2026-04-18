package service

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/octopus/octoposter/internal/config"
)

// ImageProcessingService provides AI-powered image manipulation.
type ImageProcessingService struct {
	httpClient *http.Client
}

// NewImageProcessingService creates a new image processing service.
func NewImageProcessingService() *ImageProcessingService {
	return &ImageProcessingService{
		httpClient: &http.Client{Timeout: 120 * time.Second},
	}
}

// RemoveTextFromImage uses the AI image provider to remove text from an image via inpainting.
// It sends the image to the configured image API with a "remove all text" prompt.
func (s *ImageProcessingService) RemoveTextFromImage(imageData []byte) ([]byte, error) {
	return s.editImage(imageData, "Remove all text, watermarks, and overlaid typography from this image. Keep the background clean and naturally filled in. Output a clean image without any text.")
}

// RemoveBackground uses the AI image provider to remove the background of an image.
func (s *ImageProcessingService) RemoveBackground(imageData []byte) ([]byte, error) {
	return s.editImage(imageData, "Remove the background of this image completely. Keep only the main subject/object. Replace the background with a pure transparent/white area.")
}

// ReplaceBackground generates a new background based on a text prompt.
func (s *ImageProcessingService) ReplaceBackground(imageData []byte, prompt string) ([]byte, error) {
	return s.editImage(imageData, fmt.Sprintf("Replace the background of this image with: %s. Keep the main subject intact.", prompt))
}

// editImage sends an image to the AI provider for editing with the given prompt.
func (s *ImageProcessingService) editImage(imageData []byte, prompt string) ([]byte, error) {
	cfg := config.Get()
	providerCfg, err := cfg.GetActiveImageProvider()
	if err != nil {
		return nil, fmt.Errorf("no active image provider: %w", err)
	}

	// Encode image as multipart/form-data (required by OpenAI image edits API)
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	// Add the image file
	part, err := writer.CreateFormFile("image", "image.png")
	if err != nil {
		return nil, fmt.Errorf("create form file: %w", err)
	}
	_, err = part.Write(imageData)
	if err != nil {
		return nil, fmt.Errorf("write image data to form: %w", err)
	}

	// Add text fields
	_ = writer.WriteField("model", providerCfg.Model)
	_ = writer.WriteField("prompt", prompt)
	_ = writer.WriteField("n", "1")
	_ = writer.WriteField("size", "1024x1024")

	err = writer.Close()
	if err != nil {
		return nil, fmt.Errorf("close multipart writer: %w", err)
	}

	apiURL := providerCfg.BaseURL + "/v1/images/edits"
	req, err := http.NewRequest("POST", apiURL, &body)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+providerCfg.APIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned %d: %s", resp.StatusCode, string(respBody))
	}

	// Parse the response
	var result struct {
		Data []struct {
			B64JSON string `json:"b64_json"`
			URL     string `json:"url"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if len(result.Data) == 0 {
		return nil, fmt.Errorf("no image returned from API")
	}

	// Decode base64 result
	if result.Data[0].B64JSON != "" {
		decoded, err := base64.StdEncoding.DecodeString(result.Data[0].B64JSON)
		if err != nil {
			return nil, fmt.Errorf("decode result image: %w", err)
		}
		return decoded, nil
	}

	// If URL-based response, fetch the image
	if result.Data[0].URL != "" {
		imgResp, err := http.Get(result.Data[0].URL)
		if err != nil {
			return nil, fmt.Errorf("fetch result image: %w", err)
		}
		defer imgResp.Body.Close()
		return io.ReadAll(imgResp.Body)
	}

	return nil, fmt.Errorf("no image data in API response")
}
