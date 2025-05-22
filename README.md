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

For detailed deployment instructions, see the [DEPLOYMENT.md](DEPLOYMENT.md) file.

### Quick Start

1. Fork or clone this repository to your GitHub account.
2. In your Render dashboard, go to "Blueprints" and click "New Blueprint Instance".
3. Connect your GitHub account and select the repository.
4. Render will automatically detect the `render.yaml` file and configure the service.
5. You'll be prompted to enter a value for the `ORGANIZER_PASSWORD` environment variable.
6. Click "Apply" to deploy the application.

### Testing WebSockets

The application includes two test scripts to verify WebSocket functionality:

- `npm run test-websocket` - Test WebSockets locally
- `npm run test-deployed` - Test WebSockets on your deployed Render.com application

See the [DEPLOYMENT.md](DEPLOYMENT.md) file for detailed testing instructions.

## Data Storage

The application stores tracking data and participant information in a `data` directory:

- `data/tracking_data.json`: Contains real-time GPS tracking information
- `data/participants.json`: Contains participant profiles and registration information

When deployed to Render.com, this data is stored on the ephemeral filesystem. For production use with persistent data, consider:

1. Implementing a database solution (MongoDB, PostgreSQL, etc.)
2. Setting up periodic backups of the data directory
3. Using Render.com's disk add-on for persistent storage

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
