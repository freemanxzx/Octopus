package config

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"gopkg.in/yaml.v3"
)

// ProviderConfig represents a single LLM or image provider.
type ProviderConfig struct {
	Type             string  `yaml:"type"`
	APIKey           string  `yaml:"api_key"`
	BaseURL          string  `yaml:"base_url"`
	Model            string  `yaml:"model"`
	Temperature      float64 `yaml:"temperature"`
	MaxOutputTokens  int     `yaml:"max_output_tokens"`
	DefaultAspectRatio string `yaml:"default_aspect_ratio"`
	ImageSize        string  `yaml:"image_size"`
	EndpointType     string  `yaml:"endpoint_type"`
	HighConcurrency  bool    `yaml:"high_concurrency"`
	ShortPrompt      bool    `yaml:"short_prompt"`
	Quality          string  `yaml:"quality"`
	DefaultSize      string  `yaml:"default_size"`
}

// ProvidersFile represents the YAML structure of a providers config file.
type ProvidersFile struct {
	ActiveProvider string                    `yaml:"active_provider"`
	Providers      map[string]ProviderConfig `yaml:"providers"`
}

// AppConfig holds the full application configuration.
type AppConfig struct {
	mu             sync.RWMutex
	Host           string
	Port           int
	CORSOrigins    []string
	BaseDir        string // root directory of the application
	TextProviders  ProvidersFile
	ImageProviders ProvidersFile
}

var (
	globalConfig *AppConfig
	once         sync.Once
)

// Get returns the global config singleton.
func Get() *AppConfig {
	once.Do(func() {
		globalConfig = &AppConfig{
			Host:        "0.0.0.0",
			Port:        12399,
			CORSOrigins: []string{"http://localhost:5173", "http://localhost:3000"},
		}
	})
	return globalConfig
}

// Load reads YAML config files from the given base directory.
func (c *AppConfig) Load(baseDir string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.BaseDir = baseDir

	// Load text providers
	textPath := filepath.Join(baseDir, "text_providers.yaml")
	if err := loadYAML(textPath, &c.TextProviders); err != nil {
		// Not fatal, use defaults
		c.TextProviders = ProvidersFile{ActiveProvider: "gemini"}
	}

	// Load image providers
	imagePath := filepath.Join(baseDir, "image_providers.yaml")
	if err := loadYAML(imagePath, &c.ImageProviders); err != nil {
		c.ImageProviders = ProvidersFile{ActiveProvider: "gemini"}
	}

	return nil
}

// Reload clears and reloads all config.
func (c *AppConfig) Reload() error {
	return c.Load(c.BaseDir)
}

// Reload is a package-level convenience function.
func Reload() {
	if globalConfig != nil {
		globalConfig.Reload()
	}
}

// RLock acquires a read lock on the config.
func (c *AppConfig) RLock() { c.mu.RLock() }

// RUnlock releases the read lock.
func (c *AppConfig) RUnlock() { c.mu.RUnlock() }

// GetTextProviders returns a copy of all text provider configs (thread-safe).
func (c *AppConfig) GetTextProviders() map[string]ProviderConfig {
	c.mu.RLock()
	defer c.mu.RUnlock()
	result := make(map[string]ProviderConfig, len(c.TextProviders.Providers))
	for k, v := range c.TextProviders.Providers {
		result[k] = v
	}
	return result
}

// GetActiveTextProviderName returns the name of the active text provider (thread-safe).
func (c *AppConfig) GetActiveTextProviderName() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.TextProviders.ActiveProvider
}

// GetActiveTextProvider returns the config of the currently active text provider.
func (c *AppConfig) GetActiveTextProvider() (ProviderConfig, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	name := c.TextProviders.ActiveProvider
	p, ok := c.TextProviders.Providers[name]
	if !ok {
		return ProviderConfig{}, fmt.Errorf("text provider '%s' not found", name)
	}
	if p.APIKey == "" {
		return ProviderConfig{}, fmt.Errorf("text provider '%s' has no api_key", name)
	}
	return p, nil
}

// GetActiveImageProvider returns the config of the currently active image provider.
func (c *AppConfig) GetActiveImageProvider() (ProviderConfig, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	name := c.ImageProviders.ActiveProvider
	p, ok := c.ImageProviders.Providers[name]
	if !ok {
		return ProviderConfig{}, fmt.Errorf("image provider '%s' not found", name)
	}
	if p.APIKey == "" {
		return ProviderConfig{}, fmt.Errorf("image provider '%s' has no api_key", name)
	}
	return p, nil
}

// SaveTextProviders writes the text providers config back to YAML.
func (c *AppConfig) SaveTextProviders() error {
	c.mu.RLock()
	defer c.mu.RUnlock()
	path := filepath.Join(c.BaseDir, "text_providers.yaml")
	return saveYAML(path, &c.TextProviders)
}

// SaveImageProviders writes the image providers config back to YAML.
func (c *AppConfig) SaveImageProviders() error {
	c.mu.RLock()
	defer c.mu.RUnlock()
	path := filepath.Join(c.BaseDir, "image_providers.yaml")
	return saveYAML(path, &c.ImageProviders)
}

func loadYAML(path string, dest interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return yaml.Unmarshal(data, dest)
}

func saveYAML(path string, src interface{}) error {
	data, err := yaml.Marshal(src)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}
