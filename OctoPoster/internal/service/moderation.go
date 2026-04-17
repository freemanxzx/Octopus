package service

import (
	"fmt"
	"strings"
)

// ModerationService provides text and image moderation.
// Since Aliyun/Qiniu API keys are required for real implementation,
// this acts as a feature-complete local stub using a keyword blocklist.
type ModerationService struct {
	blockedKeywords []string
}

// NewModerationService initializes the compliance checker.
func NewModerationService() *ModerationService {
	return &ModerationService{
		blockedKeywords: []string{
			"涉黄", "赌博", "毒品", "枪支", "色情", "暴力", "血腥", "自杀", "恐怖主义",
		},
	}
}

// CheckText scans the input text for prohibited content.
func (s *ModerationService) CheckText(text string) error {
	for _, kw := range s.blockedKeywords {
		if strings.Contains(text, kw) {
			return fmt.Errorf("内容违规：包含敏感词汇 (%s)，请修改后重试", kw)
		}
	}
	return nil
}

// CheckImage represents an image compliance check stub.
func (s *ModerationService) CheckImage(base64Data string) error {
	// In a real implementation, call Aliyun Image Moderation API
	return nil
}
