package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/Labubutomy/backend/services/bot/internal"
)

func CloneHandler(config internal.BotConfig, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(internal.CloneResponse{
			Success: false,
			Error:   "Method not allowed. Use POST",
		})
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(internal.CloneResponse{
			Success: false,
			Error:   "Failed to read request body",
		})
		return
	}
	defer r.Body.Close()

	var req internal.CloneRequest
	if err := json.Unmarshal(body, &req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(internal.CloneResponse{
			Success: false,
			Error:   "Invalid JSON format",
		})
		return
	}

	log.Printf("Получен запрос: installationId=%d, repoName=%s", req.InstallationID, req.RepoName)

	repoURL, err := internal.ProcessCloneAndPush(config, req.InstallationID, req.RepoName)
	if err != nil {
		log.Printf("❌ Ошибка: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(internal.CloneResponse{
			Success: false,
			Error:   err.Error(),
		})
		return
	}

	log.Printf("✅ Успешно! Репозиторий: %s\n", repoURL)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(internal.CloneResponse{
		Success: true,
		Message: "Repository cloned and pushed successfully",
		RepoURL: repoURL,
	})
}
