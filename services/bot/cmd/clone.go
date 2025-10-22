package cmd

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

func CloneRepository(token string, baseDir string, repoFullName string) (string, error) {
	repoName := filepath.Base(repoFullName)
	localRepoName := fmt.Sprintf("%s-%d", repoName, time.Now().Unix())
	targetPath := filepath.Join(baseDir, localRepoName)

	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return "", fmt.Errorf("не удалось создать директорию: %w", err)
	}

	// Формируем URL с токеном
	cloneURL := fmt.Sprintf("https://x-access-token:%s@github.com/%s.git", token, repoFullName)

	log.Printf("🔄 Клонирую репозиторий %s в %s\n", cloneURL, targetPath)

	// Клонируем репозиторий
	cmd := exec.Command("git", "clone", cloneURL, targetPath)

	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("❌ Git clone output: %s\n", string(output))
		return "", fmt.Errorf("ошибка выполнения git clone: %w", err)
	}

	return targetPath, nil
}
