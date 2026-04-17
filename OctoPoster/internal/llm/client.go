package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/octopus/octoposter/internal/config"
)

type ChatRequestMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

type ChatResponseMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest is the request body for /v1/chat/completions.
type ChatRequest struct {
	Model       string               `json:"model"`
	Messages    []ChatRequestMessage `json:"messages"`
	Temperature float64              `json:"temperature,omitempty"`
	MaxTokens   int                  `json:"max_tokens,omitempty"`
}

// ChatChoice represents one choice in the response.
type ChatChoice struct {
	Message ChatResponseMessage `json:"message"`
}

// ChatResponse is the response from /v1/chat/completions.
type ChatResponse struct {
	Choices []ChatChoice `json:"choices"`
}

// Client wraps HTTP calls to OpenAI-compatible LLM APIs.
type Client struct {
	httpClient *http.Client
	cfg        config.ProviderConfig
}

// NewClient creates a new LLM client from provider config.
func NewClient(cfg config.ProviderConfig) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		cfg:        cfg,
	}
}

// GenerateText sends a prompt and returns the model's text response.
func (c *Client) GenerateText(prompt string, base64Images ...string) (string, error) {
	baseURL := strings.TrimRight(c.cfg.BaseURL, "/")
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com/v1beta/openai"
	}

	model := c.cfg.Model
	if model == "" {
		model = "gemini-2.0-flash"
	}

	temp := c.cfg.Temperature
	if temp == 0 {
		temp = 1.0
	}

	maxTokens := c.cfg.MaxOutputTokens
	if maxTokens == 0 {
		maxTokens = 8000
	}

	var content interface{} = prompt
	if len(base64Images) > 0 {
		var parts []map[string]interface{}
		parts = append(parts, map[string]interface{}{
			"type": "text",
			"text": prompt,
		})
		for _, b64 := range base64Images {
			parts = append(parts, map[string]interface{}{
				"type": "image_url",
				"image_url": map[string]string{
					"url": "data:image/jpeg;base64," + strings.TrimPrefix(b64, "data:image/jpeg;base64,"),
				},
			})
		}
		content = parts
	}

	reqBody := ChatRequest{
		Model: model,
		Messages: []ChatRequestMessage{
			{Role: "user", Content: content},
		},
		Temperature: temp,
		MaxTokens:   maxTokens,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	url := baseURL + "/chat/completions"
	req, err := http.NewRequest("POST", url, bytes.NewReader(jsonData))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.cfg.APIKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("LLM request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("LLM API error (status %d): %s", resp.StatusCode, truncate(string(body), 500))
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return "", fmt.Errorf("parse LLM response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("LLM returned empty choices")
	}

	return chatResp.Choices[0].Message.Content, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
