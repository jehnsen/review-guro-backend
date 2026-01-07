import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello from Vercel!');
});

// CRITICAL STEP: Export the app
export default app;

// Only listen when running locally
if (import.meta.url === `file://${process.argv[1]}`) {
    app.listen(3000, () => {
        console.log('Server running on port 3000');
    });
}
declare global {
  namespace Express {
    interface Request {}
    interface Response {}
  }
}