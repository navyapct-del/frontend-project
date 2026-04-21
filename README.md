# Data Orchestration Platform — Frontend

A React-based web application for intelligent document management, AI-powered search, and multi-modal content orchestration. Built on Azure services with a 3-tier architecture.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Azure Static Web App (Frontend)            │
│              React + Vite + Tailwind CSS                │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│         Azure API Management (Consumption Tier)         │
│         data-orchestration-apim.azure-api.net           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│         Azure Function App — Python (Backend)           │
│         dataocrhfunapp                                  │
│                                                         │
│  /upload      /documents    /query                      │
│  /file        /document/:id /health                     │
│  /reset-index /diagnose     /cleanup-session            │
└──────┬──────────────┬───────────────┬───────────────────┘
       │              │               │
       ▼              ▼               ▼
  Azure Blob     Azure AI         Azure OpenAI
  Storage        Search           (GPT + Embeddings)
                    │
                    ▼
              Doc Intelligence
              (PDF/DOCX parsing)
```

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| State Management | Zustand + Recoil |
| Routing | React Router v6 |
| Auth | AWS Cognito (amazon-cognito-identity-js) |
| Charts | Chart.js + react-chartjs-2 |
| Tables | Tabulator |
| Rich Text | CKEditor 5 |
| File Upload | react-dropzone |
| Video Playback | video.js, HLS.js, Shaka Player |
| Forms | react-hook-form + Yup |
| Icons | Lucide React + Heroicons |

### Backend (Azure Function App — Python)
| Service | Purpose |
|---|---|
| Azure Blob Storage | File storage (documents, images, videos) |
| Azure AI Search | Vector + keyword search index |
| Azure OpenAI | GPT-4 for Q&A, embeddings for RAG |
| Azure Document Intelligence | PDF/DOCX text + table extraction |
| Azure Key Vault | Secrets management |
| Azure Application Insights | Monitoring & telemetry |

---

## Project Structure

```
frontend-project/
├── src/
│   ├── Pages/                        # Top-level page components
│   │   ├── Login.jsx                 # Cognito login
│   │   ├── Register.jsx              # Cognito registration
│   │   ├── ForgotPassword.jsx        # Password reset
│   │   ├── ContentManager.jsx        # File manager (upload/view/delete)
│   │   ├── SymphonyChatbot.jsx       # Multi-document AI chatbot
│   │   ├── InformationSage.jsx       # Knowledge base Q&A
│   │   └── SingleFileSathi.jsx       # Single-file AI assistant
│   │
│   ├── Data-Orch-Components/         # Feature-specific components
│   │   ├── CardsComponent/           # File cards (grid/list view)
│   │   │   ├── Cards.jsx             # Individual file card
│   │   │   ├── ObjectCard.jsx        # Card grid container + delete button
│   │   │   ├── DocumentModal.jsx     # PDF/DOCX preview modal
│   │   │   ├── ImageModal.jsx        # Image preview modal
│   │   │   ├── VideoModal.jsx        # Video player modal
│   │   │   └── MediaModal.jsx        # Generic media modal
│   │   ├── ChatComponents/           # AI chat UI
│   │   │   ├── BotMessage.jsx        # Bot response renderer
│   │   │   ├── ChartRenderer.jsx     # Dynamic chart rendering from AI
│   │   │   ├── MarkdownText.jsx      # Markdown response formatter
│   │   │   ├── ResultTable.jsx       # Tabular AI response
│   │   │   └── TypewriterText.jsx    # Typewriter animation
│   │   ├── UploadComponent/          # File upload flows
│   │   │   ├── UploadMain.jsx        # Upload entry point (routes by type)
│   │   │   ├── Document/             # Document upload form
│   │   │   ├── Image/                # Image upload form
│   │   │   ├── Video/                # Video upload form
│   │   │   ├── ProgressBar.jsx       # Upload progress indicator
│   │   │   └── FileExtensions.jsx    # Allowed file type display
│   │   ├── SearchComponent/          # Live search
│   │   ├── AdvanceSearchComponent/   # Filtered + summarized search
│   │   ├── KendraComponent/          # Index management UI
│   │   ├── chatbox.jsx               # Chat input box
│   │   ├── ChatInfoSage.jsx          # Info Sage chat interface
│   │   ├── TagsFilter.jsx            # Tag-based filtering
│   │   ├── CheckboxesFilter.jsx      # Type-based filtering
│   │   └── TabulatorFile.jsx         # Spreadsheet-style file list
│   │
│   ├── config/
│   │   ├── AzureApi.js               # All API calls → APIM → Function App
│   │   ├── ApiCall.jsx               # Higher-level API helpers
│   │   ├── Account.jsx               # Cognito auth context provider
│   │   └── downloadfile.jsx          # File download helper
│   │
│   ├── router/
│   │   ├── index.jsx                 # Route definitions
│   │   └── ProtectedRoute.jsx        # Auth guard (redirects to login)
│   │
│   ├── stores/                       # Zustand global state
│   │   ├── chatStore.js              # Chat history & session state
│   │   ├── side-menu.js              # Sidebar navigation state
│   │   ├── dark-mode.js              # Theme preference
│   │   └── color-scheme.js           # Color theme
│   │
│   ├── layouts/                      # App shell layouts
│   │   ├── side-menu/                # Sidebar navigation layout
│   │   ├── top-menu/                 # Top navigation layout
│   │   └── simple-menu/              # Minimal layout
│   │
│   ├── base-components/              # Reusable UI primitives
│   │   ├── modal/, dropdown/         # Overlay components
│   │   ├── chart/, litepicker/       # Data viz & date picker
│   │   ├── ckeditor/                 # Rich text editor variants
│   │   ├── tom-select/               # Enhanced select input
│   │   └── loading-icon/             # Spinner animations
│   │
│   ├── utils/
│   │   ├── helper.js                 # Date, size, format utilities
│   │   └── fileValidation.js         # Upload file type/size checks
│   │
│   ├── App.jsx                       # Root component + auth provider
│   ├── main.jsx                      # Vite entry point
│   └── UserPool.js                   # Cognito User Pool config
│
├── public/                           # Static assets
├── .env.example                      # Environment variable template
├── vite.config.js                    # Vite build config
├── tailwind.config.js                # Tailwind theme config
└── buildspec.yml                     # AWS CodeBuild spec (CI/CD)
```

---

## Backend API Endpoints

All requests go through APIM → `dataocrhfunapp` (Azure Function App, Python).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/upload` | Upload file → Blob Storage → extract → index |
| `GET` | `/documents` | List all indexed documents |
| `GET` | `/file?id={id}` | Download/stream a file |
| `DELETE` | `/document/{id}` | Delete file from storage + index |
| `POST` | `/query` | RAG query against indexed documents |
| `POST` | `/reset-index` | Rebuild Azure AI Search index |
| `GET` | `/diagnose` | Index health diagnostics |
| `POST` | `/cleanup-session` | Remove temp blobs for a session |

### Backend Services (`azure_upload_function/services/`)

| File | Responsibility |
|---|---|
| `blob_service.py` | Upload/download/delete files in Azure Blob Storage |
| `extractor.py` | Extract text from PDF, DOCX, CSV, XLSX, TXT |
| `doc_intelligence_service.py` | Azure Document Intelligence for complex PDFs |
| `chunking_service.py` | Split documents into chunks for embedding |
| `rag_pipeline.py` | Full RAG pipeline: chunk → embed → index |
| `rag_service.py` | RAG query orchestration |
| `query_engine.py` | Query routing, hybrid search, answer generation |
| `search_service.py` | Azure AI Search CRUD operations |
| `openai_service.py` | Azure OpenAI completions + embeddings |
| `table_service.py` | Azure Table Storage for document metadata |
| `analytics_service.py` | Usage analytics and telemetry |
| `summary_service.py` | Auto-generate document summaries |
| `language_service.py` | Language detection |
| `cleaner.py` | Text cleaning and normalization |
| `delete_service.py` | Coordinated delete across blob + index + table |
| `router_service.py` | Request routing logic |
| `config.py` | Environment config loader |

---

## Key Features

- **Content Manager** — Upload, browse, search, and delete documents (PDF, DOCX, CSV, XLSX, TXT), images, and videos. Supports grid and list views with file-type filtering, tag filtering, and pagination.
- **AI Chatbot (Symphony)** — Multi-document conversational AI powered by Azure OpenAI GPT-4 with RAG. Supports chart generation from natural language queries.
- **Information Sage** — Knowledge base Q&A with source attribution and markdown rendering.
- **Single File Sathi** — Upload a single file and chat with it in an isolated session.
- **Advanced Search** — Hybrid keyword + vector search with tag filters and AI-generated summaries.
- **Authentication** — AWS Cognito user pool with protected routes, registration, login, and password reset.

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Start dev server
npm run dev
```

### Environment Variables

```env
VITE_AZURE_API_URL=https://<apim-name>.azure-api.net/<api-path>
```

---

## Azure Resources

| Resource | Name | Purpose |
|---|---|---|
| Static Web App | `data-orch-frontend` | Hosts the React app |
| API Management | `data-orch-apim-consumption` | API gateway (Consumption tier) |
| Function App | `dataocrhfunapp` | Python backend |
| Storage Account | `dataorchstorageacc` | Blob storage for files |
| AI Search | `dataorchaisearch` | Vector + keyword search |
| OpenAI | `DataOpenAI1` | GPT-4 + embeddings |
| Document Intelligence | `dataorchdocintelligence` | PDF/DOCX parsing |
| Key Vault | `data-orch-kv` | Secrets |
| App Insights | `dataorchappinsights` | Monitoring |
| NSG | `data-orch-nsg` | Network security rules |

---

## Deployment

The frontend deploys automatically via GitHub Actions to Azure Static Web Apps on push to `main`.

Backend deploys via `functionapp.zip` to `dataocrhfunapp` using Azure Functions deployment.
