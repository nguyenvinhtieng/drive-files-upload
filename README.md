# Cloudinary File Upload

Express.js application for uploading and managing files on Cloudinary. Files are organized in folders under a configurable root folder (`jimmy-jobs` by default). Images are served directly from Cloudinary URLs.

## Features

- Upload up to 50 files (50MB each) via web UI or API
- Browse folders and files with search, sort, and breadcrumbs
- Create and delete folders
- Bulk select and delete files and folders
- Image preview with direct Cloudinary CDN loading
- Server-side only — API secrets never exposed to the browser

## Prerequisites

- Node.js 18+
- A [Cloudinary](https://cloudinary.com/) account (free tier works)

## Cloudinary Setup

1. Sign up or log in at [cloudinary.com](https://cloudinary.com/).
2. Open the **Dashboard** and copy:
   - Cloud name
   - API Key
   - API Secret

## Configuration

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env`:

   ```env
   PORT=3000
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLOUDINARY_FOLDER_NAME=jimmy-jobs
   APP_PASSWORD=your_secure_password
   SESSION_SECRET=your_random_session_secret
   ```

   - `APP_PASSWORD` — password required to access the web UI and all APIs.
   - `SESSION_SECRET` — random string used to sign session cookies (e.g. `openssl rand -base64 32`). Keep this secret.

   After a successful login, the session stays active for **2 hours** before requiring the password again.

## Install & Run

```bash
npm install
npm start
```

For development with auto-reload:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/login` | Sign-in page |
| POST | `/api/auth/login` | Sign in — body: `{ password }` |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/status` | Check session — `{ authenticated: boolean }` |
| GET | `/` | Web UI (requires sign-in) |
| POST | `/api/upload` | Upload files (multipart field: `file`, optional `path`, max 50 files × 50MB) |
| GET | `/api/files` | List folder contents — `?path=` for subfolders |
| DELETE | `/api/files?id=<public_id>` | Delete a file |
| POST | `/api/files/delete-bulk` | Bulk delete files — body: `{ ids: string[] }` |
| GET | `/api/files/download?id=<public_id>` | Redirect to Cloudinary download URL |
| POST | `/api/folders` | Create folder — body: `{ path, name }` |
| DELETE | `/api/folders?path=<folder_path>` | Delete folder and all contents |

## Project Structure

```
drive-files-upload/
├── src/
│   ├── server.js                  # Express app entry point
│   ├── app.js                     # Express middleware and routes
│   ├── config.js                  # Environment config
│   ├── middleware/
│   │   └── auth.js                # Session auth middleware
│   ├── services/
│   │   └── cloudinaryService.js   # Cloudinary API integration
│   └── routes/
│       ├── upload.js              # POST /api/upload
│       ├── files.js               # GET/DELETE /api/files
│       ├── folders.js             # POST/DELETE /api/folders
│       └── auth.js                # POST /api/auth/*
└── public/                        # Static web UI
```

## License

ISC
