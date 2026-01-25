import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Icon Fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to center map when GPS updates
function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => { if (coords) map.setView([coords.lat, coords.lng], 16); }, [coords]);
  return null;
}

function App() {
  const [tickets, setTickets] = useState([]);
  const [category, setCategory] = useState('Pothole');
  const [userLoc, setUserLoc] = useState(null);
  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchTickets();
    // Get live GPS location
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error("GPS Denied"),
      { enableHighAccuracy: true }
    );
  }, []);

  const fetchTickets = async () => {
    const res = await axios.get('http://localhost:5000/api/tickets');
    setTickets(res.data);
  };

const handleCapture = (e) => {
  const file = e.target.files[0];
  if (file) {
    // 1. Check file size. If > 2MB, alert the user (huge photos cause the crash)
    if (file.size > 2 * 1024 * 1024) {
      alert("Photo is too large! Please take a lower resolution photo or a screenshot.");
      return;
    }
    
    // 2. ONLY store the file object, DO NOT create a preview URL
    setImage(file); 
    alert("Photo selected! Now tap 'Submit Report'.");
  }
};

 const handleReport = async () => {
  if (!image) return alert("Please select a photo first!");

  // 1. Try to get GPS
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      // SUCCESS: Use real GPS
      sendReport(pos.coords.latitude, pos.coords.longitude);
    },
    async (err) => {
      // FAILURE: Use Map Center as fallback
      console.warn("GPS failed, using map center instead.");
      const mapCenter = [23.2599, 77.4126]; // Fallback to Bhopal or your current view
      sendReport(mapCenter[0], mapCenter[1]);
      alert("Note: GPS was blocked, using map center coordinates instead.");
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
};

// Helper function to keep the code clean
const sendReport = async (lat, lng) => {
  try {
    const formData = new FormData();
    formData.append('category', category);
    formData.append('description', 'Mobile Report');
    formData.append('lat', lat);
    formData.append('lng', lng);
    formData.append('image', image); // The file from your state

    await axios.post('http://10.241.58.226:5000/api/report', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    alert("Report Submitted Successfully!");
    setImage(null);
    fetchTickets();
  } catch (err) {
    console.error(err);
    alert("Upload failed. Check laptop terminal for errors.");
  }
};

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      
      {/* MOBILE HEADER */}
      <div style={{ padding: '15px', background: '#27ae60', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
        NagrikSetu Mobile Reporter
      </div>

      {/* MAP VIEW */}
      <div style={{ flex: 1 }}>
    <MapContainer 
  center={userLoc || [23.2599, 77.4126]} // Default to Bhopal coords
  zoom={15} 
  preferCanvas={true} // High performance mode
  style={{ height: '100%', width: '100%' }}
>
  <TileLayer 
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    keepBuffer={2} // Reduces memory usage by keeping fewer tiles in background
  />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userLoc && <Marker position={[userLoc.lat, userLoc.lng]} icon={L.divIcon({className: 'user-loc', html: '🔵', iconSize: [20, 20]})} />}
          {tickets.map(t => (
            <Marker key={t.id} position={[parseFloat(t.lat), parseFloat(t.lng)]}>
              <Popup><strong>{t.category}</strong><br/>Reports: {t.report_count}</Popup>
            </Marker>
          ))}
          <RecenterMap coords={userLoc} />
        </MapContainer>
      </div>

      {/* BOTTOM MOBILE DRAWER */}
      <div style={{ padding: '20px', background: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', boxShadow: '0 -2px 10px rgba(0,0,0,0.2)' }}>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px' }}>
          <option value="Pothole">Pothole</option>
          <option value="Garbage">Garbage</option>
          <option value="Broken Pipe">Water Leak</option>
        </select>

        
<input 
  type="file" 
  accept=".jpg, .jpeg, .png"  // Specifying extensions often bypasses the auto-camera trigger
  ref={fileInputRef} 
  onChange={handleCapture} 
  style={{ display: 'none' }} 
/>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => fileInputRef.current.click()} style={{ flex: 1, padding: '15px', background: '#34495e', color: 'white', border: 'none', borderRadius: '8px' }}>
            {image ? "✅ Photo Ready" : "📸 Take Photo"}
          </button>
          
          <button onClick={handleReport} disabled={!image} style={{ flex: 1, padding: '15px', background: image ? '#27ae60' : '#bdc3c7', color: 'white', border: 'none', borderRadius: '8px' }}>
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;