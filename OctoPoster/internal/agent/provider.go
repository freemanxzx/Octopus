// Package agent provides the Eino-based agent framework integration for OctoPoster.
// It wraps existing services as Eino Tools and provides Chain/Graph/Workflow orchestration.
package agent

import (
	"context"
	"fmt"
	"sync"

	"github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/components/model"
	"github.com/octopus/octoposter/internal/config"
)

// Provider manages Eino ChatModel instances for different LLM providers.
// It is safe for concurrent use by multiple goroutines.
type Provider struct {
	mu     sync.RWMutex
	models map[string]model.ChatModel // keyed by provider name
}

// NewProvider creates a Provider but does NOT initialize models.
// Call Init() after config is loaded.
func NewProvider() *Provider {
	return &Provider{
		models: make(map[string]model.ChatModel),
	}
}

// Init initializes ChatModel instances from the current config.
// Safe to call multiple times (e.g. after config change).
func (p *Provider) Init(ctx context.Context) error {
	cfg := config.Get()
	textProviders := cfg.GetTextProviders()

	p.mu.Lock()
	defer p.mu.Unlock()

	// Clear old models
	p.models = make(map[string]model.ChatModel)

	for name, provCfg := range textProviders {
		if provCfg.APIKey == "" {
			continue
		}

		chatModel, err := initChatModel(ctx, provCfg)
		if err != nil {
			return fmt.Errorf("init model %q: %w", name, err)
		}

		p.models[name] = chatModel
	}

	return nil
}

// initChatModel creates an Eino ChatModel from a ProviderConfig.
func initChatModel(ctx context.Context, provCfg config.ProviderConfig) (model.ChatModel, error) {
	baseURL := provCfg.BaseURL
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com/v1beta/openai"
	}

	modelName := provCfg.Model
	if modelName == "" {
		modelName = "gemini-2.0-flash"
	}

	temp := float32(provCfg.Temperature)
	if temp == 0 {
		temp = 1.0
	}

	maxTokens := provCfg.MaxOutputTokens
	if maxTokens == 0 {
		maxTokens = 8000
	}

	return openai.NewChatModel(ctx, &openai.ChatModelConfig{
		BaseURL:     baseURL,
		APIKey:      provCfg.APIKey,
		Model:       modelName,
		Temperature: &temp,
		MaxTokens:   &maxTokens,
	})
}

// GetActive returns the ChatModel for the currently active text provider.
func (p *Provider) GetActive() (model.ChatModel, error) {
	activeName := config.Get().GetActiveTextProviderName()

	p.mu.RLock()
	defer p.mu.RUnlock()

	chatModel, ok := p.models[activeName]
	if !ok {
		// Fallback: return any available model
		for _, m := range p.models {
			return m, nil
		}
		return nil, fmt.Errorf("no active LLM provider configured")
	}
	return chatModel, nil
}

// GetByName returns a specific ChatModel by provider name.
func (p *Provider) GetByName(name string) (model.ChatModel, error) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	chatModel, ok := p.models[name]
	if !ok {
		return nil, fmt.Errorf("provider %q not found", name)
	}
	return chatModel, nil
}
