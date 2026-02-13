import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Fix for Leaflet marker icons
import mIcon from "leaflet/dist/images/marker-icon.png";
import mShadow from "leaflet/dist/images/marker-shadow.png";
let DefIcon = L.icon({ iconUrl: mIcon, shadowUrl: mShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefIcon;

// Force map to recalculate size when switching views
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => { map.invalidateSize(); }, 300);
  }, [map]);
  return null;
}

function LocationPicker({ setAddress }) {
  const map = useMapEvents({
    moveend: async () => {
      const c = map.getCenter();
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.lat}&lon=${c.lng}`);
        const data = await res.json();
        setAddress(data.display_name || "Custom Location");
      } catch (e) { setAddress(`${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`); }
    },
  });
  return null;
}

function App() {
  const [view, setView] = useState("map");
  const [isAdmin, setIsAdmin] = useState(false);
  const [category, setCategory] = useState("Pothole");
  const [image, setImage] = useState(null);
  const [address, setAddress] = useState("Move map to pinpoint...");
  const [allReports, setAllReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [isReopening, setIsReopening] = useState(false);
  const mapRef = useRef(null);

  const BACKEND = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const provider = new OpenStreetMapProvider();

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/reports`);
      setAllReports(res.data);
    } catch (err) { console.error("API Error:", err); }
  };

  const handleUpvote = async (id) => {
    await axios.post(`${BACKEND}/api/report/${id}/vote`);
    fetchReports();
  };

  const updateStatus = async (id, status) => {
    await axios.post(`${BACKEND}/api/report/${id}/status`, { status });
    fetchReports();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const results = await provider.search({ query: searchQuery });
    if (results.length > 0 && mapRef.current) {
      mapRef.current.flyTo([results[0].y, results[0].x], 16);
      setAddress(results[0].label);
    }
  };

  const findMe = () => {
    if (mapRef.current) {
      mapRef.current.locate().on("locationfound", (e) => mapRef.current.flyTo(e.latlng, 16));
    }
  };

  const submitReport = async () => {
    if (!image) return alert("Upload a photo proof.");
    const c = mapRef.current.getCenter();
    const fd = new FormData();
    fd.append("category", category);
    fd.append("description", address);
    fd.append("lat", c.lat);
    fd.append("lng", c.lng);
    fd.append("image", image);
    fd.append("isReopen", isReopening);

    try {
      await axios.post(`${BACKEND}/api/report`, fd);
      alert(isReopening ? "Re-report logged!" : "Report submitted!");
      setImage(null); setIsReopening(false); fetchReports();
    } catch (err) {
      if (err.response?.status === 409) {
        if (window.confirm("Similar report exists. Upvote instead?")) {
          handleUpvote(err.response.data.duplicateId);
          setImage(null);
        }
      }
    }
  };

  return (
    <div className="modern-app">
      <header className="glass-nav">
        <h1>NagrikSetu</h1>
        <button className={`admin-pill ${isAdmin ? "on" : ""}`} onClick={() => setIsAdmin(!isAdmin)}>
          {isAdmin ? "Admin: ON" : "Admin Login"}
        </button>
      </header>

      <div className="content-shell">
        <main className="display-core">
          {view === "map" ? (
            <div className="map-frame">
              <MapContainer center={[23.2599, 77.4126]} zoom={13} ref={mapRef} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapResizer />
                <LocationPicker setAddress={setAddress} />
                {allReports.map(r => (
                  <Marker key={r.id} position={[parseFloat(r.lat), parseFloat(r.lng)]}>
                    <Popup>
                      <div className="popup-card">
                        <img src={`${BACKEND}/uploads/${r.image_path}`} alt="issue" style={{width: '100%'}} />
                        <p><strong>{r.category}</strong></p>
                        <p>Status: {r.status}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              <div className="crosshair">📍</div>
              <button className="find-me-btn" onClick={findMe}>🎯</button>
            </div>
          ) : (
            <div className="dashboard-scroll">
              <div className="dashboard-header">
                <h2>Live Insights</h2>
              </div>
              <div className="report-grid">
                {allReports.map(r => (
                  <div key={r.id} className="modern-card">
                    <div className="card-image-wrap">
                      <img src={`${BACKEND}/uploads/${r.image_path}`} alt="issue" />
                      <span className={`status-pill ${r.status.toLowerCase().replace(" ", "-")}`}>{r.status}</span>
                    </div>
                    <div className="card-body">
                      <div className="card-top">
                        <span className="category-tag">{r.category}</span>
                        <button onClick={() => handleUpvote(r.id)} className="vote-btn">🔥 {r.upvotes}</button>
                      </div>
                      <h4 className="card-address">📍 {r.description}</h4>
                      <div className="card-footer">
                         <span className="time-stamp">{new Date(r.created_at).toLocaleDateString()}</span>
                         
                         {r.status === 'Resolved' && !isAdmin && (
                            <button className="reopen-btn colorful-highlight" onClick={() => {
                                setCategory(r.category); setSearchQuery(r.description);
                                setIsReopening(true); setView('map');
                                setTimeout(() => mapRef.current.flyTo([r.lat, r.lng], 16), 100);
                            }}>RAISE ISSUE 🔄</button>
                         )}

                         {isAdmin && (
                            <select className="status-select" value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)}>
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="view-switcher">
            <button onClick={() => setView('map')} className={view==='map'?'active':''}>Explorer</button>
            <button onClick={() => setView('dashboard')} className={view==='dashboard'?'active':''}>Insights</button>
          </div>
        </main>

        <aside className="action-sidebar">
          {isReopening && <div className="reopen-banner">⚠️ RE-REPORTING MODE</div>}
          <div className="sidebar-group">
            <label>🔍 SEARCH</label>
            <form onSubmit={handleSearch} className="sidebar-search">
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Type location..." />
            </form>
          </div>
          <div className="sidebar-group">
            <label>📍 PINNED LOCATION</label>
            <div className="info-box">{address}</div>
          </div>
          <div className="sidebar-group">
            <label>📝 CATEGORY</label>
            <select className="modern-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Pothole</option><option>Garbage Pile</option><option>Water Leakage</option>
            </select>
          </div>
          <div className="sidebar-group">
            <label>📸 PROOF</label>
            <div className="upload-box" onClick={() => document.getElementById('cam').click()}>
              {image ? <img src={URL.createObjectURL(image)} alt="preview" /> : "Upload Photo"}
              <input type="file" id="cam" hidden onChange={(e) => setImage(e.target.files[0])} />
            </div>
          </div>
          <button className="submit-btn" disabled={!image} onClick={submitReport}>
            {isReopening ? "FILE RE-COMPLAINT" : "SUBMIT REPORT"}
          </button>
        </aside>
      </div>
    </div>
  );
}
export default App;
