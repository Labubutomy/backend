package cmd

import (
	"fmt"
	"log"
	"os/exec"

	"github.com/google/go-github/v57/github"
)

func PushRepository(token, newRepoName, targetPath string, createdRepo *github.Repository) error {
	// Удаляем старый remote origin
	cmd := exec.Command("git", "remote", "remove", "origin")
	cmd.Dir = targetPath
	cmd.Run() // Игнорируем ошибку, если remote не существует

	// Добавляем новый remote с токеном
	remoteURL := fmt.Sprintf("https://x-access-token:%s@github.com/%s.git", token, createdRepo.GetFullName())

	cmd = exec.Command("git", "remote", "add", "origin", remoteURL)
	cmd.Dir = targetPath
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("не удалось добавить remote: %w", err)
	}

	// Пушим в новый репозиторий
	fmt.Printf("   Загрузка файлов в %s...\n", newRepoName)
	cmd = exec.Command("git", "push", "-u", "origin", "main")
	cmd.Dir = targetPath

	_, err := cmd.CombinedOutput()
	if err != nil {
		cmd = exec.Command("git", "push", "-u", "origin", "master")

		cmd.Dir = targetPath
		output, err := cmd.CombinedOutput()

		if err != nil {
			log.Printf("Ошибка при пуше в репозиторий: %s", string(output))
			return fmt.Errorf("не удалось запушить в репозиторий: %w", err)
		}
	}

	return nil
}
