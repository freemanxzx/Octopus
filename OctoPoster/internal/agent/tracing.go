package agent

import (
	"fmt"
	"log"
	"sync"
	"time"
)

// --- Tracing / Observability ---

// TraceEvent represents a single trace event from a workflow or agent execution.
type TraceEvent struct {
	Timestamp time.Time   `json:"timestamp"`
	SessionID string      `json:"session_id,omitempty"`
	Component string      `json:"component"` // "model", "tool", "workflow", "agent"
	Action    string      `json:"action"`    // "start", "end", "error"
	Name      string      `json:"name"`      // tool name, model name, etc.
	Duration  float64     `json:"duration,omitempty"` // seconds
	Metadata  interface{} `json:"metadata,omitempty"`
}

// Tracer collects and stores trace events for observability.
// Thread-safe for concurrent use across multiple sessions.
type Tracer struct {
	mu     sync.Mutex
	events []TraceEvent
	maxLen int
}

// NewTracer creates a tracer with a rolling buffer.
func NewTracer(maxEvents int) *Tracer {
	if maxEvents <= 0 {
		maxEvents = 1000
	}
	return &Tracer{
		events: make([]TraceEvent, 0, maxEvents),
		maxLen: maxEvents,
	}
}

// Record adds a trace event (thread-safe).
func (t *Tracer) Record(event TraceEvent) {
	event.Timestamp = time.Now()
	t.mu.Lock()
	defer t.mu.Unlock()

	if len(t.events) >= t.maxLen {
		// Rolling buffer: remove oldest 10%
		cutoff := t.maxLen / 10
		t.events = t.events[cutoff:]
	}
	t.events = append(t.events, event)
}

// Recent returns the N most recent events (thread-safe).
func (t *Tracer) Recent(n int) []TraceEvent {
	t.mu.Lock()
	defer t.mu.Unlock()

	if n > len(t.events) {
		n = len(t.events)
	}
	result := make([]TraceEvent, n)
	copy(result, t.events[len(t.events)-n:])
	return result
}

// Stats returns aggregate statistics (thread-safe).
func (t *Tracer) Stats() map[string]interface{} {
	t.mu.Lock()
	defer t.mu.Unlock()

	componentCounts := make(map[string]int)
	var totalDuration float64
	errorCount := 0

	for _, e := range t.events {
		componentCounts[e.Component]++
		totalDuration += e.Duration
		if e.Action == "error" {
			errorCount++
		}
	}

	return map[string]interface{}{
		"total_events":     len(t.events),
		"component_counts": componentCounts,
		"total_duration_s": fmt.Sprintf("%.2f", totalDuration),
		"error_count":      errorCount,
	}
}

// --- Trace Helpers ---

// TraceModelCall records a ChatModel invocation.
func (t *Tracer) TraceModelCall(sessionID, modelName string, start time.Time, err error) {
	action := "end"
	if err != nil {
		action = "error"
	}
	t.Record(TraceEvent{
		SessionID: sessionID,
		Component: "model",
		Action:    action,
		Name:      modelName,
		Duration:  time.Since(start).Seconds(),
		Metadata:  map[string]interface{}{"error": errString(err)},
	})
}

// TraceToolCall records a tool invocation.
func (t *Tracer) TraceToolCall(sessionID, toolName string, start time.Time, err error) {
	action := "end"
	if err != nil {
		action = "error"
	}
	t.Record(TraceEvent{
		SessionID: sessionID,
		Component: "tool",
		Action:    action,
		Name:      toolName,
		Duration:  time.Since(start).Seconds(),
		Metadata:  map[string]interface{}{"error": errString(err)},
	})
}

// TraceWorkflow records a workflow execution.
func (t *Tracer) TraceWorkflow(sessionID, workflowName string, start time.Time, err error) {
	action := "end"
	if err != nil {
		action = "error"
	}
	t.Record(TraceEvent{
		SessionID: sessionID,
		Component: "workflow",
		Action:    action,
		Name:      workflowName,
		Duration:  time.Since(start).Seconds(),
	})
}

// TraceRoute records an intent routing decision.
func (t *Tracer) TraceRoute(sessionID string, intent Intent, start time.Time) {
	routeType := "workflow"
	if intent.Type == IntentAgent {
		routeType = "agent"
	}
	t.Record(TraceEvent{
		SessionID: sessionID,
		Component: "router",
		Action:    "route",
		Name:      routeType,
		Duration:  time.Since(start).Seconds(),
		Metadata: map[string]interface{}{
			"workflow": intent.Workflow,
			"topic":    intent.Topic,
		},
	})
}

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

// --- Bind to Engine ---

// initTracer creates and attaches a tracer to the engine.
func (e *Engine) initTracer() {
	e.tracer = NewTracer(1000)
	log.Println("[agent] Tracer initialized (1000 event buffer)")
}

// Tracer returns the engine's tracer.
func (e *Engine) Tracer() *Tracer {
	return e.tracer
}
