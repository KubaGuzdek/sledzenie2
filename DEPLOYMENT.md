# Deployment Guide for King Of theBay

This guide provides step-by-step instructions for deploying the King Of theBay application to Render.com.

## Prerequisites

1. A [Render.com](https://render.com) account
2. Your application code in a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Options

### Option 1: Deploy using the render.yaml file (Recommended)

1. **Fork or clone this repository** to your GitHub account.
2. In your Render dashboard, go to **Blueprints** and click **New Blueprint Instance**.
3. Connect your GitHub account and select the repository.
4. Render will automatically detect the `render.yaml` file and configure the service.
5. You'll be prompted to enter a value for the `ORGANIZER_PASSWORD` environment variable.
6. Click **Apply** to deploy the application.

### Option 2: Manual deployment

1. In your Render dashboard, click **New** and select **Web Service**.
2. Connect your GitHub repository.
3. Configure the service with the following settings:
   - **Name**: king-of-the-bay (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT`: 10000
     - `NODE_ENV`: production
     - `ORGANIZER_PASSWORD`: [Your secure password for organizer access]
4. Click **Create Web Service** to deploy.

## Verifying WebSocket Functionality

### Testing Locally

Before deploying, you can test WebSocket functionality locally:

1. Start the server: `npm start`
2. In a new terminal, run the WebSocket test script: `npm run test-websocket`
3. The script will attempt to connect to the WebSocket server and send test messages
4. You should see output indicating a successful connection and message exchange

### Testing After Deployment

After deployment, you can verify that WebSockets are working correctly in two ways:

#### Method 1: Browser Testing

1. Open your deployed application in a web browser.
2. Open the browser's developer tools (F12 or right-click and select "Inspect").
3. Go to the "Console" tab.
4. Look for messages like:
   - "WebSocket connection established"
   - "Authenticated as participant" or "Authenticated as organizer"

If you see these messages, WebSockets are working correctly.

#### Method 2: Using the Test Script

1. Edit the `test-deployed-websocket.js` file and update the `DEPLOYED_URL` variable with your Render.com URL:
   ```javascript
   const DEPLOYED_URL = 'wss://your-app-name.onrender.com';
   ```
   
   Note: Use `wss://` instead of `https://` for the WebSocket secure protocol.

2. Run the test script:
   ```
   npm run test-deployed
   ```

3. The script will attempt to connect to your deployed WebSocket server and send test messages.
4. You can also test organizer authentication by entering the password when prompted.

## Troubleshooting WebSocket Issues

If you encounter issues with WebSockets:

1. **Check browser console for errors**: Look for connection errors or WebSocket-related messages.
2. **Verify environment variables**: Make sure the `PORT` environment variable is set correctly.
3. **Check Render.com logs**: In your Render dashboard, go to your service and check the logs for any errors.
4. **Test locally first**: Before deploying, test the application locally to ensure WebSockets work correctly.
5. **Check for firewall issues**: Some networks may block WebSocket connections. Try accessing from a different network.

## Data Persistence

The application stores data in the `data` directory, which is part of the ephemeral filesystem on Render.com. This means:

1. Data will persist as long as your service is running.
2. Data may be lost if your service is restarted or redeployed.

For production use, consider:

1. Implementing a database solution (MongoDB, PostgreSQL, etc.)
2. Setting up periodic backups of the data directory
3. Using Render.com's disk add-on for persistent storage

## Accessing the Application

After deployment, your application will be available at the URL provided by Render.com. The application has two main views:

- **Participant View**: The main index page (`/`)
- **Organizer View**: Available at `/organizer-view.html`

To access the organizer view, you'll need to enter the password you set in the `ORGANIZER_PASSWORD` environment variable.
