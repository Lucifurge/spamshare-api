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
      return res.status(200).json({ message: 'Server is up and running!' });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  });
}
