package internal

type BotConfig struct {
	AppID          int64
	PrivateKeyPath string
	OrgName        string
	OrgInstallID   int64
}

type CloneRequest struct {
	InstallationID int64  `json:"installationId"`
	RepoName       string `json:"repoName,omitempty"`
}

type CloneResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	RepoURL string `json:"repoUrl,omitempty"`
	Error   string `json:"error,omitempty"`
}
