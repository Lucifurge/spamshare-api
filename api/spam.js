import cors from 'cors';

// CORS middleware
const corsMiddleware = cors({
  origin: '*', // Allow all origins (you can restrict this if needed)
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
});

// Serverless function handler
export default async function handler(req, res) {
  // Apply CORS middleware
  corsMiddleware(req, res, () => {
    // Health Check for server status
    if (req.method === 'GET') {
      return res.status(200).send(`
        <html>
          <head>
            <title>Server Status</title>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                background-color: #f0f4f8;
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                color: #333;
              }
              .container {
                text-align: center;
                background-color: #fff;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                padding: 40px;
                width: 300px;
              }
              h1 {
                font-size: 2rem;
                color: #4CAF50;
                margin-bottom: 20px;
              }
              p {
                font-size: 1rem;
                color: #555;
              }
              .status {
                font-weight: bold;
                color: #4CAF50;
                font-size: 1.2rem;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Server Running</h1>
              <p>The server is up and running smoothly!</p>
              <div class="status">Status: <span>Online</span></div>
            </div>
          </body>
        </html>
      `);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  });
}
