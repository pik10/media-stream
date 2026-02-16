# Quick Start Guide

## Servers Running

✅ **Backend**: http://localhost:3000
✅ **Frontend**: http://localhost:5173

## How to Access the Application

1. Open your browser and go to: **http://localhost:5173**

2. **Register an account**:
   - Click "Register" on the login page
   - Choose a username (3+ characters, alphanumeric)
   - Choose a password (6+ characters)
   - Click "Register"

3. **Login**:
   - After registration, you'll be redirected to login
   - Enter your username and password
   - Click "Login"

4. **Add your first S3 library**:
   - Click "Add Library" button
   - Fill in the form:
     - **Library Name**: Any friendly name (e.g., "My Videos")
     - **S3 Endpoint**: Your S3 endpoint URL (e.g., `https://s3.amazonaws.com` or your Garage endpoint)
     - **Region**: Your S3 region (e.g., `us-east-1`)
     - **Bucket Name**: Your S3 bucket name
     - **Access Key**: Your S3 access key
     - **Secret Key**: Your S3 secret key
     - **Path Prefix** (optional): A subfolder path in your bucket
   - Click "Test Connection" to verify your credentials
   - Click "Add Library" to save

5. **Browse and watch videos**:
   - Click "Browse Videos" on your library card
   - Navigate through folders if you have any
   - Click on any video file to start streaming
   - Use the video controls to play, pause, seek, adjust volume, or go fullscreen

## Example S3 Credentials for Testing

If you have an AWS S3 bucket with videos:
```
Endpoint: https://s3.amazonaws.com
Region: us-east-1 (or your region)
Bucket: your-bucket-name
Access Key: YOUR_AWS_ACCESS_KEY
Secret Key: YOUR_AWS_SECRET_KEY
```

For Garage (self-hosted S3):
```
Endpoint: http://your-garage-host:3900
Region: garage (or any value)
Bucket: your-bucket-name
Access Key: YOUR_GARAGE_KEY_ID
Secret Key: YOUR_GARAGE_SECRET
```

## Supported Video Formats

- MP4 (.mp4)
- MKV (.mkv)
- WebM (.webm)
- AVI (.avi)
- MOV (.mov)
- M4V (.m4v)
- FLV (.flv)
- WMV (.wmv)
- MPEG (.mpg, .mpeg)

## Stopping the Servers

To stop the servers, use Ctrl+C in the terminal windows where they're running, or:

```bash
# Find and kill the processes
pkill -f "node src/server.js"
pkill -f "vite"
```

## Troubleshooting

### Videos won't play
- Check that your S3 credentials are correct
- Verify the bucket name and endpoint URL
- Ensure video files are accessible in your bucket
- Check browser console for errors

### Can't connect to S3
- Use the "Test Connection" button when adding a library
- Verify endpoint URL format (must include http:// or https://)
- Check that the region matches your S3 configuration
- Ensure access key has read permissions on the bucket

### Login issues
- Make sure both backend and frontend servers are running
- Check that backend is accessible at http://localhost:3000
- Clear browser local storage if needed: Developer Tools > Application > Local Storage > Clear

## Database Location

The SQLite database is stored at:
```
/path/to/media-stream/backend/database.sqlite
```

## Security Notes

- S3 credentials are encrypted at rest using AES-256
- JWT tokens expire after 24 hours
- Passwords are hashed with bcrypt (cost factor 12)
- All API endpoints require authentication except login/register
- Rate limiting is applied to auth endpoints (5 requests per minute)

## Next Steps

- Add multiple S3 libraries for different buckets
- Organize your videos in folders for easy navigation
- The video player supports seeking (jumping to different timestamps)
- Use breadcrumbs to navigate back through folder hierarchies

Enjoy streaming your videos!
