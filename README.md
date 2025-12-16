# 🎙️ Catchup

Transform any topic into an engaging, studio-quality AI podcast using vanilla JavaScript. Features realistic multi-host conversation, background music mixing, and dynamic cover art generation.

## ✨ Features

- **🧠 Intelligent Scripting**: Uses Azure OpenAI (GPT-4) to generate natural, unscripted-style conversations between two hosts.
- **🗣️ Realistic Voice Acting**: Powered by Azure Speech Services with distinct voices and emotional prosody.
- **🎧 Studio Audio Mixing**: 
  - Automatic background music mixing using the Web Audio API.
  - Smart crossfading: Music fades to silence during speech and swells during the intro/outro.
  - Generates a single downloadable WAV file.
- **🎨 Dynamic Cover Art**: Generates unique 3D-rendered album art for each topic using Azure Flux.
- **⚡ High Performance**:
  - **IndexedDB Caching**: Stores large audio and image files locally to prevent regeneration.
  - **Parallel Processing**: Generates script and cover art simultaneously.
- **🎹 Interactive UI**:
  - Typewriter-style starter prompts.
  - Full playback controls (Seek, Play/Pause, Progress Bar).
  - Modern, responsive design with Tailwind CSS.

## 🚀 Deployment Guide (Azure Static Web Apps)

This application uses a **Backend-for-Frontend** architecture to keep your API keys secure.

### 1. Deploy to Azure
1. Push this repository to GitHub.
2. Go to the [Azure Portal](https://portal.azure.com).
3. Create a new **Static Web App**.
4. Connect your GitHub repository.
5. In the Build Details:
   - **App location**: `/`
   - **Api location**: `api`
   - **Output location**: `.`

### 2. Configure Environment Variables
Once deployed, go to your Static Web App in the Azure Portal:
1. Navigate to **Settings** > **Configuration**.
2. Add the following Application Settings:

| Setting Name | Value |
|--------------|-------|
| `AZURE_OPENAI_ENDPOINT` | Your Azure OpenAI Endpoint |
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI Key |
| `AZURE_OPENAI_DEPLOYMENT` | Your Deployment Name (e.g., gpt-4o) |
| `AZURE_OPENAI_API_VERSION` | `2024-08-01-preview` |
| `AZURE_SPEECH_KEY` | Your Speech Service Key |
| `AZURE_SPEECH_REGION` | Your Speech Service Region (e.g., eastus) |
| `AZURE_FLUX_ENDPOINT` | Your Flux Image Generation Endpoint |
| `AZURE_FLUX_API_KEY` | Your Flux API Key |

3. Click **Save**.

### 3. Local Development
To run locally with the API functions:
1. Install [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local).
2. Create `api/local.settings.json` with your keys (see `api/local.settings.example.json`).
3. Run `func start` in the `api` folder.
4. Open `index.html` using a local server (e.g., Live Server).

## 🛠️ Technologies Used

- **Frontend**: Vanilla JavaScript, HTML5, Tailwind CSS
- **Backend**: Azure Functions (Node.js)
- **Audio Engine**: Web Audio API
- **Storage**: IndexedDB

## 📂 Project Structure

```
audiopodcast/
├── api/                # Azure Functions (Secure Backend)
│   ├── generateScript/
│   ├── generateAudio/
│   └── generateImage/
├── assets/             # Static assets
├── js/                 # Frontend Logic
└── index.html          # Entry point
```

## 🔒 Security

- **Zero Exposure**: API keys are stored securely in Azure Configuration, never in the browser.
- **Proxy Architecture**: The frontend calls the backend (`/api/*`), which then calls Azure services.

## 📄 License

MIT License
