🏙️ NagrikSetu (नागरिक सेतु)
    Bridging the Gap Between Citizens and Civic Solutions
    NagrikSetu is a next-generation, community-driven civic engagement platform designed to empower citizens and streamline urban maintenance. The name, meaning "Citizen Bridge," reflects the core mission: to provide a direct, transparent link between local residents and municipal authorities
🌟 The Vision
    In many urban areas, reporting a pothole, a broken street light, or a garbage pile is often a slow, bureaucratic process with little to no feedback. NagrikSetu changes this by transforming every citizen into a "sensor" for the city.

    By combining real-time geographic mapping with community verification (upvoting), the platform ensures that the most urgent issues rise to the top of the priority list, ensuring that city resources are spent where they are needed most.
✨ Key Features
   📍 Interactive Spatial Reporting: Pinpoint the exact location of infrastructure issues on a live map using OpenStreetMap and Leaflet.

   📸 Visual Evidence: Attach photo proof directly to reports to provide clarity and prevent false claims.

   🔥 Community Upvoting: Instead of multiple people filing the same complaint, citizens can "upvote" an existing issue to signal high urgency.

   🔄 Recurring Issue Tracking (The "Raise Issue" Feature): A unique logic that allows citizens to re-flag a "Resolved" issue if the fix was poor or the problem returns. This holds authorities accountable for the quality of repairs.

  📊 Live Insights Dashboard: A data-driven view for both citizens and admins to monitor the health and progress of neighborhood projects.

  🛡️ Admin Oversight: A dedicated mode for officials to update statuses (Pending → In Progress → Resolved) in real-time.

🚀 NagrikSetu - Setup Guide
    NagrikSetu is a community-driven infrastructure reporting tool. Follow these steps to get the project running locally after cloning.

🛠 Tech Stack

   Frontend
    React.js: A library for building a dynamic user interface.

    Leaflet & React-Leaflet: Powers the interactive map for precise location picking.

   Axios: Manages API calls between the frontend and the backend.

   OpenStreetMap (Nominatim): Used for reverse-geocoding coordinates into readable addresses.

Backend
   Node.js & Express: The server environment and framework handling our API routes.

   Multer: Middleware used to handle multipart/form-data for image uploads.

   CORS: Ensures the frontend can communicate with the backend server securely.

   PostgreSQL: The database used for storing report data (Category, Lat, Lng, Image Path).

   Dotenv: Used to manage environment variables safely.

🧩 Key Extensions & Logic
    ES Modules ("type": "module"): Used in the backend to maintain consistency with modern JavaScript syntax.

    Image Removal Logic: Allows users to clear or replace a captured photo before submission to ensure accuracy.

    Map Invalidation: A custom MapFixer component ensures the Leaflet map renders correctly without grey tiles on load.

1. Install Dependencies
   After cloning the repository, install the necessary packages for both the frontend and the backend.

   Bash:
   # Install frontend dependencies
   npm install

   # Install backend dependencies (if in a separate folder, cd into it first)
   cd server:
   npm install
   cd ..

2. Database Setup (PostgreSQL)
   1.Open pgAdmin 4 or your terminal's psql.
   2.Create a new database named nagriksetu.
   3.Enable PostGIS: Before running the table query, run this command to enable geographic features:
     CREATE EXTENSION IF NOT EXISTS postgis;
   4.Create the Reports Table: Open the Query Tool and execute the contents of query.sql

3. Environment Variables (.env)
   Since the .env file is ignored by Git for security, you must create one manually in the root of your project (or your server folder).
   Create a file named .env and add your PostgreSQL credentials:
    DB_USER=postgres
    DB_HOST=localhost
    DB_NAME=nagriksetu
    DB_PASSWORD=your_password_here
    DB_PORT=5432
    PORT=5000

4. Create Local Uploads Directory
    1.Because the uploads folder is ignored by Git, you must create it manually so the backend has a place to store images.

    2.In the root of the project(nagriksetu-backend), create a folder named uploads.

   3.Crucial: All report images must be stored inside the uploads folder. The backend is configured to look for and serve files specifically from this path.
   
    Directory structure(nagriksetu-backend/):
     /server
     /src
     /uploads <-- Your images go here
     .env

5. Running the Application
   Start the Backend
    Bash:
    node server/index.js
   
   start the frontend
    Bash:
    npm run dev

6.Key Features to Check
  ->Explorer: Use the map to pinpoint issues.
  
  ->Insights: View community reports and upvote them.
  
  ->Raise Issue Button: Located on "Resolved" cards; it highlights in red to allow citizens to re-report failing fixes.