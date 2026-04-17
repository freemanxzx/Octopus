package handler

import (
	"net/http"
	"github.com/octopus/octoposter/internal/service"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	creditSvc *service.CreditService
}

func NewUserHandler(creditSvc *service.CreditService) *UserHandler {
	return &UserHandler{creditSvc: creditSvc}
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	credits := h.creditSvc.GetCredits(userID)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"credits": credits,
		"user_id": userID,
	})
}
