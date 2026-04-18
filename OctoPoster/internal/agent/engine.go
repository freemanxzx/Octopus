package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/cloudwego/eino/schema"
	"github.com/octopus/octoposter/internal/service"
)

// Engine is the main entry point for the Eino agent framework.
// It manages providers, tools, workflows, router, and sessions for concurrent multi-user access.
type Engine struct {
	provider      *Provider
	tools         *ToolRegistry
	workflows     *WorkflowExecutor
	creativeAgent *CreativeAgent
	router        *Router
	sessions      *SessionManager
	tracer        *Tracer
}

// NewEngine creates and initializes the agent engine.
func NewEngine(
	ctx context.Context,
	outlineSvc *service.OutlineService,
	contentSvc *service.ContentService,
	extractorSvc *service.ExtractorService,
	imageProcessing *service.ImageProcessingService,
) (*Engine, error) {
	// Initialize LLM provider
	provider := NewProvider()
	if err := provider.Init(ctx); err != nil {
		log.Printf("[agent] Warning: LLM provider init failed (will retry on first use): %v", err)
	}

	// Register tools
	tools, err := NewToolRegistry(outlineSvc, contentSvc, extractorSvc, imageProcessing)
	if err != nil {
		return nil, fmt.Errorf("init tool registry: %w", err)
	}

	engine := &Engine{
		provider: provider,
		tools:    tools,
		sessions: NewSessionManager(),
	}
	engine.initWorkflows()

	// Try to create ReAct agent (requires active model)
	agentInst, aErr := NewCreativeAgent(ctx, provider, tools)
	if aErr != nil {
		log.Printf("[agent] ReAct agent not available (will use workflow-only): %v", aErr)
	} else {
		engine.creativeAgent = agentInst
	}

	// Create router (works even without agent - falls back to workflows)
	engine.router = NewRouter(engine.workflows, engine.creativeAgent)
	engine.initTracer()

	return engine, nil
}

// Provider returns the LLM provider (for direct ChatModel access).
func (e *Engine) Provider() *Provider { return e.provider }

// Tools returns the tool registry.
func (e *Engine) Tools() *ToolRegistry { return e.tools }

// Sessions returns the session manager.
func (e *Engine) Sessions() *SessionManager { return e.sessions }

// ReloadModels reinitializes ChatModels after config change.
func (e *Engine) ReloadModels(ctx context.Context) error {
	return e.provider.Init(ctx)
}

// GenerateOutline is a convenience method using the existing outline service.
func (e *Engine) GenerateOutline(ctx context.Context, topic string) (*service.OutlineResult, error) {
	return e.tools.outlineSvc.GenerateOutline(topic)
}

// GenerateContent is a convenience method for content generation.
func (e *Engine) GenerateContent(ctx context.Context, topic, outline string) (*service.ContentResult, error) {
	return e.tools.contentSvc.GenerateContent(topic, outline)
}

// Chat sends a user message and routes it to the best handler.
// Uses intent Router: clear commands → Workflow, open-ended → ReAct Agent.
// Each session is isolated — multiple users can chat concurrently.
func (e *Engine) Chat(ctx context.Context, sessionID, userID, message string) (string, error) {
	session := e.sessions.GetOrCreate(sessionID, userID)
	session.AddMessage(schema.UserMessage(message))

	// Use router for intent-based dispatch
	if e.router != nil {
		result, err := e.router.Route(ctx, session.GetMessages(), message)
		if err != nil {
			return "", fmt.Errorf("route: %w", err)
		}

		// Convert response to string
		var reply string
		switch v := result.Response.(type) {
		case string:
			reply = v
		default:
			data, _ := json.Marshal(result.Response)
			reply = string(data)
		}

		session.AddMessage(schema.AssistantMessage(reply, nil))
		return reply, nil
	}

	// Fallback: direct model call (Phase 1 behavior)
	chatModel, err := e.provider.GetActive()
	if err != nil {
		return "", fmt.Errorf("no active model: %w", err)
	}

	systemMsg := schema.SystemMessage(
		"你是 OctoPoster 创作助手，帮助用户创建小红书图文内容。",
	)
	allMessages := append([]*schema.Message{systemMsg}, session.GetMessages()...)

	resp, err := chatModel.Generate(ctx, allMessages)
	if err != nil {
		return "", fmt.Errorf("generate: %w", err)
	}

	session.AddMessage(resp)
	return resp.Content, nil
}

// --- Session Management ---

// Session tracks an individual user's agent conversation state.
type Session struct {
	ID        string
	UserID    string
	Messages  []*schema.Message
	CreatedAt time.Time
	UpdatedAt time.Time
	mu        sync.Mutex
}

// AddMessage appends a message to the session (thread-safe).
func (s *Session) AddMessage(msg *schema.Message) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Messages = append(s.Messages, msg)
	s.UpdatedAt = time.Now()
}

// GetMessages returns a copy of session messages (thread-safe).
func (s *Session) GetMessages() []*schema.Message {
	s.mu.Lock()
	defer s.mu.Unlock()
	msgs := make([]*schema.Message, len(s.Messages))
	copy(msgs, s.Messages)
	return msgs
}

// SessionManager manages concurrent agent sessions.
type SessionManager struct {
	sessions sync.Map // map[string]*Session
}

// NewSessionManager creates a new session manager.
func NewSessionManager() *SessionManager {
	return &SessionManager{}
}

// GetOrCreate returns an existing session or creates a new one.
func (sm *SessionManager) GetOrCreate(sessionID, userID string) *Session {
	session := &Session{
		ID:        sessionID,
		UserID:    userID,
		Messages:  make([]*schema.Message, 0),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	actual, _ := sm.sessions.LoadOrStore(sessionID, session)
	return actual.(*Session)
}

// Get returns a session by ID, or nil if not found.
func (sm *SessionManager) Get(sessionID string) *Session {
	if s, ok := sm.sessions.Load(sessionID); ok {
		return s.(*Session)
	}
	return nil
}

// Delete removes a session.
func (sm *SessionManager) Delete(sessionID string) {
	sm.sessions.Delete(sessionID)
}

// CleanExpired removes sessions older than the given duration.
func (sm *SessionManager) CleanExpired(maxAge time.Duration) int {
	cutoff := time.Now().Add(-maxAge)
	count := 0
	sm.sessions.Range(func(key, value any) bool {
		session := value.(*Session)
		if session.UpdatedAt.Before(cutoff) {
			sm.sessions.Delete(key)
			count++
		}
		return true
	})
	return count
}
