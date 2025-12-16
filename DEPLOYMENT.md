# Azure Deployment Guide

This guide will help you deploy the AI Podcast Generator to Azure Static Web Apps with secure backend functions.

## Prerequisites
- Azure account with an active subscription
- Azure CLI installed (optional, can use Azure Portal)
- The following Azure services set up:
  - Azure OpenAI
  - Azure Speech Services
  - Azure Flux (for image generation)

## Deployment Steps

### 1. Fork/Clone this Repository
```bash
git clone https://github.com/vitthalr/ai-podcast.git
cd ai-podcast
```

### 2. Create Azure Static Web App

#### Option A: Using Azure Portal (Recommended)
1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → Search for "Static Web App"
3. Fill in the details:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new or use existing
   - **Name**: `ai-podcast` (or your preferred name)
   - **Plan type**: Free (or Standard if needed)
   - **Region**: Choose closest to you
   - **Source**: GitHub
   - **Organization**: Your GitHub username
   - **Repository**: `ai-podcast`
   - **Branch**: `main`
   - **Build Presets**: Custom
   - **App location**: `/`
   - **Api location**: `api`
   - **Output location**: Leave empty

4. Click "Review + Create" → "Create"

#### Option B: Using Azure CLI
```bash
az staticwebapp create \
  --name ai-podcast \
  --resource-group <your-resource-group> \
  --source https://github.com/<your-username>/ai-podcast \
  --location "East US 2" \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --login-with-github
```

### 3. Configure Environment Variables (Application Settings)

After deployment, you need to add your API keys:

1. Go to your Static Web App in Azure Portal
2. Navigate to "Configuration" in the left menu
3. Click "Application settings"
4. Add the following settings:

| Name | Value |
|------|-------|
| `AZURE_OPENAI_ENDPOINT` | `https://your-resource.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI key |
| `AZURE_OPENAI_DEPLOYMENT` | `gpt-4o` (or your deployment name) |
| `AZURE_OPENAI_API_VERSION` | `2024-08-01-preview` |
| `AZURE_SPEECH_KEY` | Your Azure Speech key |
| `AZURE_SPEECH_REGION` | `eastus` (or your region) |
| `AZURE_FLUX_ENDPOINT` | Your Flux endpoint |
| `AZURE_FLUX_API_KEY` | Your Flux API key |

5. Click "Save"

### 4. Verify Deployment

After a few minutes, your site will be live at:
```
https://<your-app-name>.azurestaticapps.net
```

The GitHub Action will automatically build and deploy your app whenever you push to the `main` branch.

## Security Notes

✅ **Keys are now secure!** 
- API keys are stored in Azure Application Settings (encrypted at rest)
- Keys are only accessible to your backend API functions
- Users **cannot** see your keys even if they inspect the browser

✅ **Public sharing is safe!**
- You can now share your app URL publicly
- Each request goes through your secure Azure Functions backend
- No risk of key theft or abuse

## Cost Management

To prevent unexpected charges:

1. Go to Azure Portal → Cost Management
2. Create a Budget:
   - Name: `AI Podcast Budget`
   - Amount: `$10` (or your preferred limit)
   - Alert Conditions: 80%, 90%, 100%
   - Add your email for notifications

## Monitoring

To monitor API usage and errors:

1. Go to your Static Web App in Azure Portal
2. Navigate to "Application Insights" → "View Application Insights"
3. Check:
   - **Failures**: Any errors in API calls
   - **Performance**: Response times
   - **Usage**: Request counts

## Troubleshooting

### Functions not working
- Check Application Settings are saved correctly
- Verify API keys are valid in Azure Portal
- Check Application Insights for error logs

### CORS issues
- Azure Static Web Apps automatically handles CORS for the `/api/*` endpoints
- No additional configuration needed

### Build failures
- Check GitHub Actions tab in your repository
- Verify `package.json` exists in the `api/` folder

## Local Development

To test the backend locally:

1. Install Azure Functions Core Tools:
```bash
npm install -g azure-functions-core-tools@4
```

2. Create `api/local.settings.json` (copy from `local.settings.example.json`):
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_OPENAI_ENDPOINT": "your-endpoint",
    "AZURE_OPENAI_API_KEY": "your-key",
    ...
  }
}
```

3. Install dependencies:
```bash
cd api
npm install
cd ..
```

4. Start the local server:
```bash
cd api
func start
```

5. Open `index.html` in a browser (using a local server like Live Server)

## License

MIT License
