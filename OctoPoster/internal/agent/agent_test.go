package agent

import (
	"sync"
	"testing"
	"time"

	"github.com/cloudwego/eino/schema"
)

// TestSessionManagerConcurrency verifies that SessionManager is safe
// for concurrent access from multiple goroutines (simulating multi-user access).
func TestSessionManagerConcurrency(t *testing.T) {
	sm := NewSessionManager()
	const numUsers = 100
	const messagesPerUser = 50

	var wg sync.WaitGroup
	wg.Add(numUsers)

	for i := 0; i < numUsers; i++ {
		go func(userIdx int) {
			defer wg.Done()
			sessionID := "session-" + string(rune('A'+userIdx%26))
			userID := "user-" + string(rune('0'+userIdx%10))

			session := sm.GetOrCreate(sessionID, userID)
			if session == nil {
				t.Errorf("user %d got nil session", userIdx)
				return
			}

			for j := 0; j < messagesPerUser; j++ {
				session.AddMessage(schema.UserMessage("test message"))
			}

			msgs := session.GetMessages()
			if len(msgs) == 0 {
				t.Errorf("user %d got empty messages", userIdx)
			}
		}(i)
	}

	wg.Wait()
}

// TestTracerConcurrency verifies that the Tracer is safe under concurrent writes.
func TestTracerConcurrency(t *testing.T) {
	tracer := NewTracer(500)
	const numGoroutines = 50
	const eventsPerGoroutine = 100

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(idx int) {
			defer wg.Done()
			for j := 0; j < eventsPerGoroutine; j++ {
				tracer.Record(TraceEvent{
					Component: "test",
					Action:    "test",
					Name:      "tool-" + string(rune('A'+idx%26)),
					Duration:  0.01,
				})
			}
		}(i)
	}

	wg.Wait()

	stats := tracer.Stats()
	totalEvents := stats["total_events"].(int)
	if totalEvents == 0 {
		t.Error("tracer recorded 0 events after concurrent writes")
	}
	t.Logf("Tracer recorded %d events from %d goroutines", totalEvents, numGoroutines)
}

// TestSessionCleanup verifies expired session cleanup.
func TestSessionCleanup(t *testing.T) {
	sm := NewSessionManager()

	// Create sessions
	s1 := sm.GetOrCreate("old", "user1")
	s1.UpdatedAt = time.Now().Add(-2 * time.Hour)

	sm.GetOrCreate("new", "user2")

	// Clean sessions older than 1 hour
	cleaned := sm.CleanExpired(1 * time.Hour)
	if cleaned != 1 {
		t.Errorf("expected 1 cleaned, got %d", cleaned)
	}

	if sm.Get("old") != nil {
		t.Error("old session should be deleted")
	}
	if sm.Get("new") == nil {
		t.Error("new session should still exist")
	}
}

// TestRouterIntentClassification verifies the intent router classifies correctly.
func TestRouterIntentClassification(t *testing.T) {
	router := &Router{}

	tests := []struct {
		input    string
		wantType IntentType
		wantFlow string
	}{
		{"帮我生成大纲 护肤品测评", IntentWorkflow, "outline"},
		{"写文案 旅行攻略", IntentWorkflow, "content"},
		{"https://mp.weixin.qq.com/s/xxx 这篇转成图文", IntentWorkflow, "outline_from_url"},
		{"一键生成 美食分享", IntentWorkflow, "pipeline"},
		{"我想做一个关于猫咪的有趣内容", IntentAgent, ""},
		{"如何提高我的小红书曝光量", IntentAgent, ""},
	}

	for _, tt := range tests {
		intent := router.classifyIntent(tt.input)
		if intent.Type != tt.wantType {
			t.Errorf("input=%q: got type %d, want %d", tt.input, intent.Type, tt.wantType)
		}
		if tt.wantFlow != "" && intent.Workflow != tt.wantFlow {
			t.Errorf("input=%q: got workflow %q, want %q", tt.input, intent.Workflow, tt.wantFlow)
		}
	}
}
