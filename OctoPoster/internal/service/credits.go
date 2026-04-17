package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

type CreditService struct {
	mu       sync.RWMutex
	dataPath string
	ledger   map[string]int // userID -> credits
}

func NewCreditService(dataPath string) (*CreditService, error) {
	if dataPath == "" {
		dataPath = "data/credits.json"
	}

	err := os.MkdirAll(filepath.Dir(dataPath), 0755)
	if err != nil {
		return nil, err
	}

	cs := &CreditService{
		dataPath: dataPath,
		ledger:   make(map[string]int),
	}

	if _, err := os.Stat(dataPath); err == nil {
		data, err := os.ReadFile(dataPath)
		if err == nil && len(data) > 0 {
			json.Unmarshal(data, &cs.ledger)
		}
	}

	return cs, nil
}

func (s *CreditService) save() error {
	data, err := json.MarshalIndent(s.ledger, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.dataPath, data, 0644)
}

func (s *CreditService) GetCredits(userID string) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	credits, exists := s.ledger[userID]
	if !exists {
		// New user bonus
		credits = 200
		s.ledger[userID] = credits
		s.save()
	}
	return credits
}

func (s *CreditService) Deduct(userID string, amount int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	credits, exists := s.ledger[userID]
	if !exists {
		credits = 200 // Bonus
	}

	if credits < amount {
		return fmt.Errorf("credits insufficient")
	}

	s.ledger[userID] = credits - amount
	return s.save()
}
