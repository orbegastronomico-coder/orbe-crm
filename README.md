# OrBe CRM

Corporate CRM with pipeline management, searchable database, and operational control panel.

## Features

- **Dashboard**: Real-time overview of KPIs and growth metrics.
- **Pipeline**: Kanban-style management for leads and clients.
- **Client Database**: Full searchable database of contacts and companies.
- **AI Integration**: Powered by Google Gemini for insights and operational tips.
- **Supabase Backend**: Real-time data synchronization and persistence.

## Tech Stack

- React 18+
- TypeScript
- Tailwind CSS
- Lucide React (Icons)
- Framer Motion (Animations)
- Supabase (Backend)
- Google Gemini API (AI)

## Getting Started

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables (see `.env.example`).
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
- `GEMINI_API_KEY`: Your Google Gemini API Key.
