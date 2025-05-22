# King Of theBay - GPS Tracking Application

A real-time GPS tracking application for water sports events, with participant and organizer views.

## Features

- Real-time GPS tracking
- WebSocket communication for live updates
- Participant and organizer views
- SOS emergency signals
- Race management
- Responsive design for mobile and desktop

## Local Development

To run the application locally:

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Deployment to Render.com

This application is configured for easy deployment to [Render.com](https://render.com).

### Option 1: Deploy using the render.yaml file

1. Fork or clone this repository to your GitHub account.
2. In your Render dashboard, go to "Blueprints" and click "New Blueprint Instance".
3. Connect your GitHub account and select the repository.
4. Render will automatically detect the `render.yaml` file and configure the service.
5. Click "Apply" to deploy the application.

### Option 2: Manual deployment

1. In your Render dashboard, click "New" and select "Web Service".
2. Connect your GitHub repository.
3. Configure the service with the following settings:
   - **Name**: king-of-the-bay (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT`: 10000
     - `NODE_ENV`: production

4. Click "Create Web Service" to deploy.

## WebSocket Configuration

The application uses WebSockets for real-time communication. When deployed to Render.com, WebSockets will work automatically with the following considerations:

- Render.com supports WebSockets out of the box
- The application is configured to use secure WebSockets (wss://) when deployed with HTTPS
- A fallback to localStorage is implemented for situations where WebSockets might be temporarily unavailable

## Accessing the Application

After deployment, your application will be available at the URL provided by Render.com. The application has two main views:

- **Participant View**: The main index page (`/`)
- **Organizer View**: Available at `/organizer-view.html`

## Troubleshooting

If you encounter any issues with WebSockets:

1. Check the browser console for connection errors
2. Verify that your Render.com service is running correctly
3. Ensure that no firewall is blocking WebSocket connections
4. The application will automatically fall back to localStorage if WebSockets are unavailable

## License

This project is licensed under the MIT License - see the LICENSE file for details.
