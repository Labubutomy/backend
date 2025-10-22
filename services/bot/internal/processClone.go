package internal

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/Labubutomy/backend/services/bot/cmd"
)

func ProcessCloneAndPush(config BotConfig, userInstallationID int64, userRepo string) (string, error) {
	ctx := context.Background()

	// 1. Получаем токен и клиент пользователя
	userToken, err := getInstallationToken(config.AppID, userInstallationID, config.PrivateKeyPath)
	if err != nil {
		return "", fmt.Errorf("failed to get user token: %w", err)
	}
	userClient, err := createGitHubClient(config.AppID, userInstallationID, config.PrivateKeyPath)
	if err != nil {
		return "", fmt.Errorf("failed to create user client: %w", err)
	}

	// 2. Получаем токен и клиент организации
	orgToken, err := getInstallationToken(config.AppID, config.OrgInstallID, config.PrivateKeyPath)
	if err != nil {
		return "", fmt.Errorf("failed to get org token: %w", err)
	}
	orgClient, err := createGitHubClient(config.AppID, config.OrgInstallID, config.PrivateKeyPath)
	if err != nil {
		return "", fmt.Errorf("failed to create org client: %w", err)
	}

	// 3. Получаем список репозиториев пользователя
	repos, _, err := userClient.Apps.ListRepos(ctx, nil)
	if err != nil {
		return "", fmt.Errorf("failed to list repositories: %w", err)
	}

	repoName := filepath.Base(userRepo)
	isAvailable := false
	for _, r := range repos.Repositories {
		if r.Name != nil && *r.Name == repoName {
			isAvailable = true
			break
		}
	}

	if !isAvailable {
		return "", fmt.Errorf("repository %s not found for user", userRepo)
	}
	baseDir := "./cloned_repos"
	log.Printf("📦 Клонирование репозитория %s...\n", userRepo)
	targetDir, err := cmd.CloneRepository(userToken, baseDir, userRepo)
	if err != nil {
		return "", fmt.Errorf("failed to clone repository: %w", err)
	}
	defer os.RemoveAll(targetDir)

	newRepoName := fmt.Sprintf("%s-copy-%d", userRepo, time.Now().Unix())
	orgRepo, err := cmd.CreateRepository(ctx, orgClient, config.OrgName, newRepoName, userRepo)
	if err != nil {
		return "", fmt.Errorf("failed to create repository: %w", err)
	}

	err = cmd.PushRepository(orgToken, newRepoName, targetDir, orgRepo)
	if err != nil {
		log.Printf("⚠️ Ошибка при пуше, удаляю репозиторий %s/%s...\n", config.OrgName, newRepoName)

		if _, deleteErr := orgClient.Repositories.Delete(ctx, config.OrgName, newRepoName); deleteErr != nil {
			log.Printf("❌ Не удалось удалить репозиторий %s: %v\n", *orgRepo.FullName, deleteErr)
			return "", fmt.Errorf("failed to push repository: %w (также не удалось удалить созданный репозиторий: %v)", err, deleteErr)
		}

		log.Printf("✅ Репозиторий %s/%s успешно удалён\n", config.OrgName, newRepoName)
		return "", fmt.Errorf("failed to push repository: %w", err)
	}

	return orgRepo.GetURL(), nil
}
