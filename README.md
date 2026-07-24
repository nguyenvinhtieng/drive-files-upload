# Cloudinary File Upload

Express.js application for uploading files to Cloudinary. All files are stored in a single folder (`jimmy-jobs` by default). Images are served directly from Cloudinary URLs.

## Features

- Upload files up to 50MB via web UI or API
- List files from the configured Cloudinary folder
- Image gallery with direct Cloudinary CDN loading
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
   ```

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
| GET | `/` | Web UI |
| POST | `/api/upload` | Upload a file (multipart field: `file`, max 50MB) |
| GET | `/api/files` | List files — returns `{ folder, files }` with `secureUrl` |
| GET | `/api/files/download?id=<public_id>` | Redirect to Cloudinary URL |

## Project Structure

```
drive-files-upload/
├── src/
│   ├── server.js                  # Express app entry point
│   ├── config.js                  # Environment config
│   ├── services/
│   │   └── cloudinaryService.js   # Cloudinary API integration
│   └── routes/
│       ├── upload.js              # POST /api/upload
│       └── files.js               # GET /api/files, download
└── public/                        # Static web UI
```

## License

ISC
