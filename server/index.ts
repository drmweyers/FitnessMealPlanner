/**
 * FitMeal Pro Server Entry Point
 * 
 * This is the main server file that initializes the Express application,
 * sets up middleware for logging and error handling, and configures
 * both development (Vite) and production (static) environments.
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { recipeRouter } from './routes/recipes';
import authRouter from './authRoutes';
import adminRouter from './routes/adminRoutes';
import path from 'path';
import { fileURLToPath } from 'url';
import ViteExpress from 'vite-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from your frontend
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use('/api/auth', authRouter);
app.use('/api/recipes', recipeRouter);
app.use('/api/admin', adminRouter);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't match one above,
// send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const port = process.env.PORT || 5001;
ViteExpress.listen(app, Number(port), () =>
  console.log(`Server is listening on port ${port}...`),
);

export { app };
