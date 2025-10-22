package internal

import (
	"context"
	"net/http"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v57/github"
)

func getInstallationToken(appID, installationID int64, keyPath string) (string, error) {
	itr, err := ghinstallation.NewKeyFromFile(
		http.DefaultTransport,
		appID,
		installationID,
		keyPath,
	)
	if err != nil {
		return "", err
	}

	token, err := itr.Token(context.Background())
	if err != nil {
		return "", err
	}

	return token, nil
}

func createGitHubClient(appID, installationID int64, keyPath string) (*github.Client, error) {
	itr, err := ghinstallation.NewKeyFromFile(
		http.DefaultTransport,
		appID,
		installationID,
		keyPath,
	)
	if err != nil {
		return nil, err
	}

	return github.NewClient(&http.Client{Transport: itr}), nil
}
