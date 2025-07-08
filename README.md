# 📅 Availability Planner

A modern, full-stack team availability management application built with Next.js, TypeScript, and Supabase.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/jonasvh39-gmailcoms-projects/v0-full-stack-availability-planner)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

## ✨ Features

- 🗓️ **Interactive Calendar** - Visual availability tracking with intuitive calendar interface
- 👥 **Team Management** - Create and manage multiple teams with member roles
- 🌍 **Multi-language Support** - Built-in internationalization for global teams
- 📊 **Export Functionality** - Export availability data for reporting and analysis
- 🎨 **Modern UI** - Beautiful, responsive design with dark/light theme support
- ⚡ **Real-time Updates** - Live synchronization of availability changes
- 📱 **Mobile Responsive** - Works seamlessly on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/availability-planner.git
   cd availability-planner
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials and other required environment variables.

4. **Set up the database**
   Run the SQL scripts in the `scripts/` folder in your Supabase SQL editor:
   ```
   01-create-tables.sql
   02-seed-data.sql
   03-update-members-table.sql
   04-update-availability-statuses.sql
   05-fix-availability-constraints.sql
   06-add-profile-images.sql
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: React hooks and context
- **Deployment**: Vercel
- **Package Manager**: pnpm

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── [locale]/          # Internationalized routes
│   ├── team/              # Team-specific pages
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and configurations
├── public/               # Static assets
├── scripts/              # Database migration scripts
└── styles/               # Additional styling files
```

## 🌐 Live Demo

Experience the app live at: **[Availability Planner](https://vercel.com/jonasvh39-gmailcoms-projects/v0-full-stack-availability-planner)**

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/) for beautiful, accessible components
- Icons by [Lucide React](https://lucide.dev/)
- Powered by [Supabase](https://supabase.com/) for backend infrastructure
