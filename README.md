# FitMeal Pro - Fitness Meal Plan Generator

A comprehensive fitness meal planning application that uses OpenAI to generate healthy, nutritious recipes with detailed macro information. Built with Express.js backend and React frontend, featuring admin authentication and recipe management.

## Features

### 🥗 Recipe Management
- **AI-Generated Recipes**: Uses OpenAI GPT-4o to create unique, healthy recipes
- **Detailed Nutrition**: Complete macro information (calories, protein, carbs, fat)
- **Smart Filtering**: Filter by meal type, dietary restrictions, prep time, and nutrition
- **Recipe Search**: Full-text search across recipe names, descriptions, and ingredients

### 🔒 Admin Dashboard
- **Replit Authentication**: Secure admin access using Replit Auth
- **Recipe Approval**: Review and approve AI-generated recipes before publishing
- **Bulk Generation**: Create batches of recipes with customizable parameters
- **Recipe Management**: Edit, approve, or delete recipes through the admin interface

### 🎨 Modern UI
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Beautiful Recipe Cards**: Visual recipe browsing with nutrition highlights
- **Advanced Filters**: Comprehensive filtering and search capabilities
- **Recipe Modals**: Detailed recipe view with ingredients and instructions

## Tech Stack

### Backend
- **Express.js**: Web framework for Node.js
- **TypeScript**: Type-safe JavaScript development
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Persistent data storage
- **OpenAI API**: AI-powered recipe generation
- **Replit Auth**: Secure authentication system

### Frontend
- **React**: Modern UI library
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/UI**: High-quality UI components
- **TanStack Query**: Data fetching and caching
- **Wouter**: Lightweight routing

## Environment Setup

### Required Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Database Configuration  
DATABASE_URL=your-postgresql-connection-string

# Replit Auth (automatically provided by Replit)
REPL_ID=your-repl-id
SESSION_SECRET=your-session-secret
REPLIT_DOMAINS=your-replit-domains
ISSUER_URL=https://replit.com/oidc
