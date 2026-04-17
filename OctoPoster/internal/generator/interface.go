package generator

// ImageGenerator is the interface all image generation adapters must implement.
type ImageGenerator interface {
	// Generate produces image bytes from a prompt.
	// referenceImage is optional compressed cover image bytes for style consistency.
	Generate(prompt string, aspectRatio string, model string, referenceImage []byte) ([]byte, error)
}
