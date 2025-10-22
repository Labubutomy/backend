package cmd

import (
	"context"
	"fmt"

	"github.com/google/go-github/v57/github"
)

func CreateRepository(ctx context.Context, client *github.Client, owner string, newRepoName string, sourceRepoName string) (*github.Repository, error) {
	// log.Info("Создание репозитория", "owner", owner, "repo", newRepoName)

	repo := &github.Repository{
		Name:        github.String(newRepoName),
		Description: github.String("Копия репозитория " + sourceRepoName),
		Private:     github.Bool(true),  // Можно изменить на true для приватного
		AutoInit:    github.Bool(false), // Не создаем README автоматически
	}

	// Создаем репозиторий в организации
	// Для организации передаем ее имя (не пустую строку!)
	createdRepo, _, err := client.Repositories.Create(ctx, owner, repo)
	if err != nil {
		return nil, fmt.Errorf("не удалось создать репозиторий: %w", err)
	}
	fmt.Printf("   ✅ Репозиторий создан: %s\n", createdRepo.GetHTMLURL())

	return createdRepo, nil
}
