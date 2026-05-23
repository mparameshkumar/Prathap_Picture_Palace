# 🎭 Theatre Canteen Management System

A full-stack web application with a beautiful theatre-themed UI for managing three theatre canteens and parking sections. The application features a rich, immersive interface with animations and a cohesive color scheme inspired by classic theatres.

![Theatre Canteen Dashboard](https://via.placeholder.com/800x450/1a1a1a/eab308?text=Theatre+Canteen+Dashboard)

## ✨ Features

- **Theatre-themed UI** with rich animations and transitions
- **Responsive Design** works on all devices
- **Real-time Stock Management** for multiple canteens
- **Sales Tracking** with analytics and reporting
- **Role-based Access Control** for different user types
- **Interactive Dashboard** with visual data representation

## 🎨 Theming

- **Color Scheme**: Deep reds, golds, and dark backgrounds
- **Animations**: Spotlight effects, fade-ins, and smooth transitions
- **Icons**: Themed emojis and icons (🎭, 🎬, 🎟️)
- **Typography**: Elegant serif fonts for headings

## 🛠 Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Ant Design (themed)
- Chart.js
- React Router

### Backend
- FastAPI (Python)
- JWT Authentication
- SQLAlchemy ORM
- PostgreSQL
- CORS middleware

### Database
- PostgreSQL
- SQL schema with relationships
- Sample seed data

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ & npm
- Python 3.9+
- PostgreSQL 13+

### Database Setup
1. Create a new PostgreSQL database named `theatre-db`
2. Run the schema and seed scripts:
   ```bash
   psql -U postgres -d theatre-db -f db/schema.sql
   psql -U postgres -d theatre-db -f db/seed.sql
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables (create `.env` file):
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/theatre-db
   SECRET_KEY=your-secret-key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```
5. Run the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎭 Themed Components

- **Navigation**: Curtain-style menu with smooth animations
- **Cards**: Elegant cards with hover effects and spotlight highlights
- **Tables**: Styled data tables with gold accents
- **Forms**: Themed input fields and buttons
- **Alerts & Notifications**: Theatre-style popups and messages

## 📱 Responsive Design

- Fully responsive layout that works on all devices
- Mobile-friendly navigation
- Adaptive tables and forms
- Optimized for touch interactions

## 🎨 Customization

### Theme Colors
- Primary: `#7f1d1d` to `#991b1b` (Red gradient)
- Accent: `#eab308` (Gold)
- Text: `#ffffff` (White) / `#fde047` (Light yellow)
- Background: `#1a1a1a` (Dark)

### Custom CSS
Custom styles are defined in `frontend/src/index.css` with the following key classes:
- `.theatre-button` - Animated buttons
- `.spotlight` - Spotlight effect
- `.curtain` - Curtain animation
- `.shimmer` - Text shimmer effect

## 📂 Project Structure

```
theatre-canteen/
├── backend/               # FastAPI application
│   ├── app/               # Main application package
│   │   ├── __init__.py
│   │   ├── main.py        # FastAPI app and routes
│   │   ├── models/        # Database models
│   │   ├── schemas/       # Pydantic models
│   │   └── utils/         # Utility functions
│   ├── requirements.txt   # Python dependencies
│   └── .env.example      # Example environment variables
│
├── frontend/              # React application
│   ├── public/            # Static files
│   └── src/               # Source files
│       ├── components/    # Reusable components
│       ├── pages/         # Page components
│       ├── App.jsx        # Main app component
│       ├── main.jsx       # Entry point
│       └── index.css      # Global styles
│
└── db/                   # Database scripts
    ├── schema.sql        # Database schema
    └── seed.sql          # Sample data
```

## 🔧 Troubleshooting

- **Port already in use**: Change the port in `backend/.env` or kill the process using the port
- **Database connection issues**: Verify your PostgreSQL credentials in `.env`
- **Missing dependencies**: Run `npm install` or `pip install -r requirements.txt`

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- [Ant Design](https://ant.design/) for UI components
- [React Icons](https://react-icons.github.io/react-icons/) for beautiful icons
- [Chart.js](https://www.chartjs.org/) for data visualization

2) Backend
```
python -m venv .venv
.venv/Scripts/activate
pip install -r backend/requirements.txt
copy backend/.env.example backend/.env
# Update .env DB connection string if needed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir backend
```

3) Frontend
```
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Default Canteens
- Prathap Delux (1)
- Prathap Non-Delux (2)
- Mini Prathap (3)

## Notes
- Login uses JWT (demo default: username `admin`, password `admin123` seeded).
- Sales automatically decrement stock quantities.
- Charts: daily, monthly, weekly heatmap.
