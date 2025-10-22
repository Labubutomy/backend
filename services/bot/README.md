**Request:**

```json
{
  "repoName": "nick/repoName",
  "installationId": 12345678
}
```

**Response (success):**

```json
{
  "success": true,
  "message": "Repository cloned and pushed successfully",
  "repoUrl": "https://github.com/org/repo-copy-timestamp.git"
}
```

**Response (error):**

```json
{
  "success": false,
  "error": "error description"
}
```

## Как пользователю дать доступ

1. Пользователь устанавливает бота:

   ```
   https://github.com/apps/devmatch-ai-bot
   ```

2. После установки отправляет Installation ID в URL:
   ```
   https://github.com/settings/installations/XXXXXXXX
   ```
