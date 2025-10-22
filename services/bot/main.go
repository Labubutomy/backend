package main

import (
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/Labubutomy/backend/services/bot/handlers"
	"github.com/Labubutomy/backend/services/bot/internal"
)

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func main() {
	config := internal.BotConfig{
		AppID:          getEnvInt64("GITHUB_APP_ID", 2160421),
		PrivateKeyPath: getEnv("GITHUB_PRIVATE_KEY_PATH", "./devmatch-ai-bot.2025-10-22.private-key.pem"),
		OrgName:        getEnv("GITHUB_ORG_NAME", "testorgforme123"),
		OrgInstallID:   getEnvInt64("GITHUB_ORG_INSTALL_ID", 91157148),
	}
	port := ":" + getEnv("BOT_PORT", "50055")

	http.HandleFunc("/api/v1/bot/clone", func(w http.ResponseWriter, r *http.Request) {
		handlers.CloneHandler(config, w, r)
	})

	log.Printf("Бот запущен на порту %s\n", port)
	log.Printf("Endpoint: POST http://localhost%s/clone\n", port)

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal(err)
	}
}
