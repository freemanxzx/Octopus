package service

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// HistoryRecord represents a single history entry.
type HistoryRecord struct {
	ID        string                 `json:"id"`
	Title     string                 `json:"title"`
	CreatedAt string                 `json:"created_at"`
	UpdatedAt string                 `json:"updated_at"`
	Outline   map[string]interface{} `json:"outline"`
	Images    HistoryImages          `json:"images"`
	Status    string                 `json:"status"`
	Thumbnail *string                `json:"thumbnail"`
}

// HistoryImages holds task and generated file info.
type HistoryImages struct {
	TaskID    string   `json:"task_id"`
	Generated []string `json:"generated"`
}

// IndexEntry is the lightweight entry in index.json.
type IndexEntry struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
	Status    string  `json:"status"`
	Thumbnail *string `json:"thumbnail"`
	PageCount int     `json:"page_count"`
	TaskID    string  `json:"task_id,omitempty"`
}

// HistoryIndex is the root structure of index.json.
type HistoryIndex struct {
	Records []IndexEntry `json:"records"`
}

// HistoryService manages history persistence.
type HistoryService struct {
	historyDir string
	indexFile  string
	mu         sync.Mutex
}

// NewHistoryService creates a new history service.
func NewHistoryService(baseDir string) *HistoryService {
	dir := filepath.Join(baseDir, "history")
	os.MkdirAll(dir, 0755)
	s := &HistoryService{
		historyDir: dir,
		indexFile:  filepath.Join(dir, "index.json"),
	}
	s.initIndex()
	return s
}

func (s *HistoryService) initIndex() {
	if _, err := os.Stat(s.indexFile); os.IsNotExist(err) {
		idx := HistoryIndex{Records: []IndexEntry{}}
		data, _ := json.MarshalIndent(idx, "", "  ")
		os.WriteFile(s.indexFile, data, 0644)
	}
}

func (s *HistoryService) loadIndex() HistoryIndex {
	data, err := os.ReadFile(s.indexFile)
	if err != nil {
		return HistoryIndex{Records: []IndexEntry{}}
	}
	var idx HistoryIndex
	json.Unmarshal(data, &idx)
	return idx
}

func (s *HistoryService) saveIndex(idx HistoryIndex) {
	data, _ := json.MarshalIndent(idx, "", "  ")
	os.WriteFile(s.indexFile, data, 0644)
}

func (s *HistoryService) recordPath(id string) string {
	return filepath.Join(s.historyDir, id+".json")
}

// CreateRecord creates a new history record.
func (s *HistoryService) CreateRecord(topic string, outline map[string]interface{}, taskID string) string {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := uuid.New().String()
	now := time.Now().Format(time.RFC3339)

	pages, _ := outline["pages"].([]interface{})
	pageCount := len(pages)

	record := HistoryRecord{
		ID:        id,
		Title:     topic,
		CreatedAt: now,
		UpdatedAt: now,
		Outline:   outline,
		Images:    HistoryImages{TaskID: taskID, Generated: []string{}},
		Status:    "draft",
		Thumbnail: nil,
	}

	data, _ := json.MarshalIndent(record, "", "  ")
	os.WriteFile(s.recordPath(id), data, 0644)

	idx := s.loadIndex()
	entry := IndexEntry{
		ID: id, Title: topic, CreatedAt: now, UpdatedAt: now,
		Status: "draft", Thumbnail: nil, PageCount: pageCount, TaskID: taskID,
	}
	idx.Records = append([]IndexEntry{entry}, idx.Records...)
	s.saveIndex(idx)

	return id
}

// GetRecord retrieves a record by ID.
func (s *HistoryService) GetRecord(id string) (*HistoryRecord, error) {
	data, err := os.ReadFile(s.recordPath(id))
	if err != nil {
		return nil, fmt.Errorf("record not found: %s", id)
	}
	var rec HistoryRecord
	if err := json.Unmarshal(data, &rec); err != nil {
		return nil, err
	}
	return &rec, nil
}

// RecordExists checks if a record exists.
func (s *HistoryService) RecordExists(id string) bool {
	_, err := os.Stat(s.recordPath(id))
	return err == nil
}

// UpdateRecord updates specified fields.
func (s *HistoryService) UpdateRecord(id string, outline map[string]interface{}, images *HistoryImages, status, thumbnail string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	rec, err := s.GetRecord(id)
	if err != nil {
		return err
	}

	now := time.Now().Format(time.RFC3339)
	rec.UpdatedAt = now

	if outline != nil {
		rec.Outline = outline
	}
	if images != nil {
		rec.Images = *images
	}
	if status != "" {
		rec.Status = status
	}
	if thumbnail != "" {
		rec.Thumbnail = &thumbnail
	}

	data, _ := json.MarshalIndent(rec, "", "  ")
	os.WriteFile(s.recordPath(id), data, 0644)

	// Update index
	idx := s.loadIndex()
	for i, e := range idx.Records {
		if e.ID == id {
			idx.Records[i].UpdatedAt = now
			if status != "" {
				idx.Records[i].Status = status
			}
			if thumbnail != "" {
				idx.Records[i].Thumbnail = &thumbnail
			}
			if images != nil && images.TaskID != "" {
				idx.Records[i].TaskID = images.TaskID
			}
			break
		}
	}
	s.saveIndex(idx)
	return nil
}

// DeleteRecord removes a record and its images.
func (s *HistoryService) DeleteRecord(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	rec, err := s.GetRecord(id)
	if err != nil {
		return err
	}

	// Delete task images directory
	if rec.Images.TaskID != "" {
		taskDir := filepath.Join(s.historyDir, rec.Images.TaskID)
		os.RemoveAll(taskDir)
	}

	os.Remove(s.recordPath(id))

	idx := s.loadIndex()
	filtered := make([]IndexEntry, 0, len(idx.Records))
	for _, e := range idx.Records {
		if e.ID != id {
			filtered = append(filtered, e)
		}
	}
	idx.Records = filtered
	s.saveIndex(idx)
	return nil
}

// ListRecords returns paginated records.
func (s *HistoryService) ListRecords(page, pageSize int, status string) ([]IndexEntry, int, int) {
	idx := s.loadIndex()
	records := idx.Records

	if status != "" && status != "all" {
		filtered := make([]IndexEntry, 0)
		for _, r := range records {
			if r.Status == status {
				filtered = append(filtered, r)
			}
		}
		records = filtered
	}

	total := len(records)
	totalPages := (total + pageSize - 1) / pageSize
	start := (page - 1) * pageSize
	end := start + pageSize
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	return records[start:end], total, totalPages
}

// SearchRecords searches by keyword.
func (s *HistoryService) SearchRecords(keyword string) []IndexEntry {
	idx := s.loadIndex()
	kw := strings.ToLower(keyword)
	var results []IndexEntry
	for _, r := range idx.Records {
		if strings.Contains(strings.ToLower(r.Title), kw) {
			results = append(results, r)
		}
	}
	return results
}

// GetStatistics returns record counts by status.
func (s *HistoryService) GetStatistics() map[string]interface{} {
	idx := s.loadIndex()
	byStatus := map[string]int{}
	for _, r := range idx.Records {
		byStatus[r.Status]++
	}
	return map[string]interface{}{
		"total":     len(idx.Records),
		"by_status": byStatus,
	}
}

// ScanAndSyncTaskImages scans a task folder and syncs.
func (s *HistoryService) ScanAndSyncTaskImages(taskID string) map[string]interface{} {
	taskDir := filepath.Join(s.historyDir, taskID)
	if _, err := os.Stat(taskDir); os.IsNotExist(err) {
		return map[string]interface{}{"success": false, "error": "task directory not found"}
	}

	entries, _ := os.ReadDir(taskDir)
	var imageFiles []string
	for _, e := range entries {
		name := e.Name()
		if strings.HasPrefix(name, "thumb_") {
			continue
		}
		ext := strings.ToLower(filepath.Ext(name))
		if ext == ".png" || ext == ".jpg" || ext == ".jpeg" {
			imageFiles = append(imageFiles, name)
		}
	}

	sort.Slice(imageFiles, func(i, j int) bool {
		return imageFiles[i] < imageFiles[j]
	})

	// Find associated record
	idx := s.loadIndex()
	var recordID string
	for _, e := range idx.Records {
		if e.TaskID == taskID {
			recordID = e.ID
			break
		}
	}

	if recordID != "" {
		rec, _ := s.GetRecord(recordID)
		if rec != nil {
			pages, _ := rec.Outline["pages"].([]interface{})
			expected := len(pages)
			actual := len(imageFiles)
			status := "draft"
			if actual >= expected && expected > 0 {
				status = "completed"
			} else if actual > 0 {
				status = "partial"
			}
			var thumb string
			if len(imageFiles) > 0 {
				thumb = imageFiles[0]
			}
			s.UpdateRecord(recordID, nil, &HistoryImages{TaskID: taskID, Generated: imageFiles}, status, thumb)

			return map[string]interface{}{
				"success": true, "record_id": recordID, "task_id": taskID,
				"images_count": len(imageFiles), "images": imageFiles, "status": status,
			}
		}
	}

	return map[string]interface{}{
		"success": true, "task_id": taskID,
		"images_count": len(imageFiles), "images": imageFiles, "no_record": true,
	}
}

// ScanAllTasks scans all task directories.
func (s *HistoryService) ScanAllTasks() map[string]interface{} {
	entries, err := os.ReadDir(s.historyDir)
	if err != nil {
		return map[string]interface{}{"success": false, "error": err.Error()}
	}

	synced, failed := 0, 0
	var orphans []string
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		result := s.ScanAndSyncTaskImages(e.Name())
		if result["success"] == true {
			if result["no_record"] == true {
				orphans = append(orphans, e.Name())
			} else {
				synced++
			}
		} else {
			failed++
		}
	}

	return map[string]interface{}{
		"success": true, "synced": synced, "failed": failed,
		"total_tasks": synced + failed + len(orphans), "orphan_tasks": orphans,
	}
}

// CreateImagesZip creates an in-memory ZIP of task images.
func (s *HistoryService) CreateImagesZip(taskID string) (*bytes.Buffer, error) {
	taskDir := filepath.Join(s.historyDir, taskID)
	if _, err := os.Stat(taskDir); os.IsNotExist(err) {
		return nil, fmt.Errorf("task directory not found: %s", taskID)
	}

	buf := new(bytes.Buffer)
	zw := zip.NewWriter(buf)

	entries, _ := os.ReadDir(taskDir)
	for _, e := range entries {
		name := e.Name()
		if strings.HasPrefix(name, "thumb_") {
			continue
		}
		ext := strings.ToLower(filepath.Ext(name))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(taskDir, name))
		if err != nil {
			continue
		}
		archiveName := name
		base := strings.TrimSuffix(name, filepath.Ext(name))
		var pageIdx int
		if n, _ := fmt.Sscanf(base, "%d", &pageIdx); n == 1 {
			archiveName = fmt.Sprintf("page_%d.png", pageIdx+1)
		}
		w, _ := zw.Create(archiveName)
		w.Write(data)
	}

	zw.Close()
	return buf, nil
}
