package service

import (
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/PuerkitoBio/goquery"
)

// ExtractorService handles extracting text from URLs and documents.
type ExtractorService struct {
	httpClient *http.Client
}

// NewExtractorService creates a new extractor service.
func NewExtractorService() *ExtractorService {
	return &ExtractorService{
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// ExtractFromURL fetches a URL and extracts the main article text.
func (s *ExtractorService) ExtractFromURL(url string) (string, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("URL returned status %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return "", fmt.Errorf("parse HTML: %w", err)
	}

	// Remove noise elements
	doc.Find("script, style, nav, header, footer, iframe, noscript, .comment, .sidebar, .ad, .advertisement").Remove()

	// Try common article containers first
	var articleText string
	selectors := []string{
		"#js_content",       // WeChat articles
		"article",           // Standard HTML5
		".article-content",  // Common blog pattern
		".post-content",     // Common blog pattern
		".entry-content",    // WordPress
		".content",          // Generic
		"main",              // HTML5 main
		".rich_media_content", // WeChat fallback
	}

	for _, sel := range selectors {
		node := doc.Find(sel)
		if node.Length() > 0 {
			articleText = extractTextFromSelection(node)
			if utf8.RuneCountInString(articleText) > 100 {
				break
			}
		}
	}

	// Fallback: use body
	if utf8.RuneCountInString(articleText) < 100 {
		articleText = extractTextFromSelection(doc.Find("body"))
	}

	articleText = cleanText(articleText)

	if utf8.RuneCountInString(articleText) < 50 {
		return "", fmt.Errorf("提取的内容过短（%d 字），可能页面需要登录或 JS 渲染", utf8.RuneCountInString(articleText))
	}

	// Truncate if too long (keep first ~5000 chars for LLM context)
	runes := []rune(articleText)
	if len(runes) > 5000 {
		articleText = string(runes[:5000]) + "\n\n[... 内容已截断，以上为核心部分 ...]"
	}

	return articleText, nil
}

// ExtractFromDocument parses uploaded document bytes into plain text.
func (s *ExtractorService) ExtractFromDocument(data []byte, ext string) (string, error) {
	ext = strings.ToLower(strings.TrimPrefix(ext, "."))

	switch ext {
	case "txt", "md", "markdown":
		text := string(data)
		if utf8.RuneCountInString(text) < 10 {
			return "", fmt.Errorf("文档内容过短")
		}
		// Truncate
		runes := []rune(text)
		if len(runes) > 5000 {
			text = string(runes[:5000]) + "\n\n[... 内容已截断 ...]"
		}
		return text, nil
	default:
		return "", fmt.Errorf("暂不支持 .%s 格式，目前支持 .txt 和 .md", ext)
	}
}

func extractTextFromSelection(sel *goquery.Selection) string {
	var sb strings.Builder
	sel.Find("p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, span, section").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if text != "" {
			sb.WriteString(text)
			sb.WriteString("\n")
		}
	})
	result := sb.String()
	if result == "" {
		// Fallback to raw text
		result = sel.Text()
	}
	return result
}

func cleanText(text string) string {
	// Collapse consecutive empty lines
	lines := strings.Split(text, "\n")
	var cleaned []string
	emptyCount := 0
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			emptyCount++
			if emptyCount <= 1 {
				cleaned = append(cleaned, "")
			}
		} else {
			emptyCount = 0
			cleaned = append(cleaned, line)
		}
	}
	return strings.TrimSpace(strings.Join(cleaned, "\n"))
}
