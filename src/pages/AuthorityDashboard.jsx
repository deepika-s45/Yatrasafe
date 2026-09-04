import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);

  return null;
}

function AuthorityDashboard() {
  // =========================
  // GPS
  // =========================

  const [position, setPosition] = useState(null);

  const [locationStatus, setLocationStatus] = useState(
    "Getting location..."
  );

  // =========================
  // DANGER ZONES
  // =========================

  const [zoneName, setZoneName] = useState("");
  const [latitude, setLatitude] = useState("20.5937");
  const [longitude, setLongitude] = useState("78.9629");
  const [radius, setRadius] = useState("300");
  const [dangerZones, setDangerZones] = useState([]);

  // =========================
  // AI RISK MONITORING
  // =========================

  const [aiRisk, setAiRisk] = useState({
    risk_score: 10,
    safety_score: 90,
    risk_level: "Low",
    anomaly_detected: false,
  });

  const [aiLoading, setAiLoading] = useState(false);

  // =========================
  // LOAD DANGER ZONES
  // =========================

  const loadDangerZones = () => {
    const savedZones = localStorage.getItem(
      "yatraSafeDangerZones"
    );

    if (savedZones) {
      try {
        const zones = JSON.parse(savedZones);

        setDangerZones(
          Array.isArray(zones) ? zones : []
        );
      } catch (error) {
        console.error(
          "Unable to read danger zones:",
          error
        );

        setDangerZones([]);
      }
    } else {
      setDangerZones([]);
    }
  };

  useEffect(() => {
    loadDangerZones();

    const handleStorageChange = () => {
      loadDangerZones();
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  // =========================
  // GPS TRACKING
  // =========================

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus(
        "GPS is not supported by this browser."
      );

      return;
    }

    const success = (location) => {
      const {
        latitude,
        longitude,
      } = location.coords;

      const currentPosition = [
        latitude,
        longitude,
      ];

      setPosition(currentPosition);

      setLocationStatus(
        "Location tracking active"
      );

      // Automatically use current GPS
      // for new danger zones.
      setLatitude(latitude.toFixed(6));
      setLongitude(longitude.toFixed(6));
    };

    const error = () => {
      setLocationStatus(
        "Location permission denied."
      );
    };

    navigator.geolocation.getCurrentPosition(
      success,
      error,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    const watchId =
      navigator.geolocation.watchPosition(
        success,
        error,
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
        }
      );

    return () => {
      navigator.geolocation.clearWatch(
        watchId
      );
    };
  }, []);

  // =========================
  // DISTANCE CALCULATION
  // =========================

  function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
  ) {
    const R = 6371000;

    const lat1Rad =
      (lat1 * Math.PI) / 180;

    const lat2Rad =
      (lat2 * Math.PI) / 180;

    const deltaLat =
      ((lat2 - lat1) * Math.PI) / 180;

    const deltaLon =
      ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLon / 2) ** 2;

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  }

  // =========================
  // AI RISK ANALYSIS
  // =========================

  useEffect(() => {
    if (!position) {
      return;
    }

    // If there are no danger zones,
    // tourist is considered safe.
    if (dangerZones.length === 0) {
      setAiRisk({
        risk_score: 5,
        safety_score: 95,
        risk_level: "Low",
        anomaly_detected: false,
      });

      return;
    }

    const analyzeRisk = async () => {
      try {
        setAiLoading(true);

        // =========================
        // FIND CLOSEST ZONE
        // =========================

        let closestDistance = Infinity;

        dangerZones.forEach((zone) => {
          const distance =
            calculateDistance(
              position[0],
              position[1],
              Number(zone.latitude),
              Number(zone.longitude)
            );

          if (
            distance < closestDistance
          ) {
            closestDistance = distance;
          }
        });

        // =========================
        // FIND NEARBY ZONES
        // =========================

        const nearbyZones =
          dangerZones.filter((zone) => {
            const distance =
              calculateDistance(
                position[0],
                position[1],
                Number(zone.latitude),
                Number(zone.longitude)
              );

            return distance <= 1000;
          });

        // =========================
        // DETERMINE GEOFENCE STATUS
        // =========================

        let geofenceStatus = "safe";

        const insideZone =
          dangerZones.some((zone) => {
            const distance =
              calculateDistance(
                position[0],
                position[1],
                Number(zone.latitude),
                Number(zone.longitude)
              );

            const zoneRadius =
              Number(zone.radius) || 300;

            return (
              distance <= zoneRadius
            );
          });

        const approachingZone =
          dangerZones.some((zone) => {
            const distance =
              calculateDistance(
                position[0],
                position[1],
                Number(zone.latitude),
                Number(zone.longitude)
              );

            const zoneRadius =
              Number(zone.radius) || 300;

            return (
              distance <=
              zoneRadius + 150
            );
          });

        if (insideZone) {
          geofenceStatus = "danger";
        } else if (approachingZone) {
          geofenceStatus = "approaching";
        }

        // =========================
        // DEBUG INFORMATION
        // =========================

        console.log(
          "YatraSafe AI Input:",
          {
            position,
            closestDistance,
            nearbyZones:
              nearbyZones.length,
            geofenceStatus,
            dangerZones,
          }
        );

        // =========================
        // SEND DATA TO FASTAPI
        // =========================

        const response = await fetch(
          "http://127.0.0.1:8000/predict-risk",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              distance_m:
                closestDistance === Infinity
                  ? 2000
                  : closestDistance,

              nearby_zones:
                nearbyZones.length,

              geofence_status:
                geofenceStatus,

              sos_active: false,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            "AI server returned an error."
          );
        }

        const data =
          await response.json();

        console.log(
          "YatraSafe AI Response:",
          data
        );

        setAiRisk({
          risk_score:
            Number(data.risk_score) || 0,

          safety_score:
            Number(data.safety_score) || 0,

          risk_level:
            data.risk_level || "Low",

          anomaly_detected:
            Boolean(
              data.anomaly_detected
            ),
        });

      } catch (error) {
        console.error(
          "Authority AI Risk Error:",
          error
        );
      } finally {
        setAiLoading(false);
      }
    };

    analyzeRisk();

  }, [position, dangerZones]);

  // =========================
  // CREATE DANGER ZONE
  // =========================

  const handleCreateZone = (event) => {
    event.preventDefault();

    const newZone = {
      id: Date.now(),

      name:
        zoneName.trim() ||
        "High-Risk Zone",

      latitude: Number(latitude),

      longitude: Number(longitude),

      radius: Number(radius),

      type: "danger",

      status: "Active",
    };

    const updatedZones = [
      ...dangerZones,
      newZone,
    ];

    localStorage.setItem(
      "yatraSafeDangerZones",
      JSON.stringify(updatedZones)
    );

    localStorage.setItem(
      "yatraSafeDangerZone",
      JSON.stringify(newZone)
    );

    setDangerZones(updatedZones);

    alert(
      "🔴 Danger zone created successfully!"
    );

    setZoneName("");
  };

  // =========================
  // DELETE DANGER ZONE
  // =========================

  const handleDeleteZone = (id) => {
    const updatedZones =
      dangerZones.filter(
        (zone) => zone.id !== id
      );

    setDangerZones(updatedZones);

    localStorage.setItem(
      "yatraSafeDangerZones",
      JSON.stringify(updatedZones)
    );

    if (updatedZones.length > 0) {
      localStorage.setItem(
        "yatraSafeDangerZone",
        JSON.stringify(
          updatedZones[
            updatedZones.length - 1
          ]
        )
      );
    } else {
      localStorage.removeItem(
        "yatraSafeDangerZone"
      );
    }
  };

  // =========================
  // MAP CENTER
  // =========================

  const mapCenter =
    dangerZones.length > 0
      ? [
          Number(
            dangerZones[0].latitude
          ),
          Number(
            dangerZones[0].longitude
          ),
        ]
      : position || [
          20.5937,
          78.9629,
        ];

  // =========================
  // RISK CLASS
  // =========================

  const getRiskClass = () => {
    if (
      aiRisk.risk_level ===
      "Critical"
    ) {
      return "risk-critical";
    }

    if (
      aiRisk.risk_level ===
      "High"
    ) {
      return "risk-high";
    }

    if (
      aiRisk.risk_level ===
      "Moderate"
    ) {
      return "risk-moderate";
    }

    return "risk-low";
  };

  return (
    <div className="dashboard">

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="dashboard-nav">

        <div className="logo">
          🛡️ YatraSafe
        </div>

        <div className="dashboard-user">
          🟢 Authority
        </div>

      </nav>

      <main className="dashboard-content">

        {/* =========================
            HEADER
        ========================= */}

        <div className="dashboard-heading">

          <div>

            <p className="dashboard-label">
              AUTHORITY DASHBOARD
            </p>

            <h1>
              Tourist Safety Control Center 👮
            </h1>

            <p>
              Monitor tourist activity,
              safety zones and emergency
              alerts.
            </p>

          </div>

        </div>

        {/* =========================
            STATISTICS
        ========================= */}

        <div className="stats-grid">

          <div className="stat-card">

            <span>👥</span>

            <p>
              Active Tourists
            </p>

            <h2>
              128
            </h2>

            <small>
              Currently being monitored
            </small>

          </div>

          <div className="stat-card">

            <span>🟢</span>

            <p>
              Safe Tourists
            </p>

            <h2>
              116
            </h2>

            <small>
              90.6% currently safe
            </small>

          </div>

          <div className="stat-card">

            <span>⚠️</span>

            <p>
              Risk Alerts
            </p>

            <h2>
              {aiRisk.risk_level ===
                "High" ||
              aiRisk.risk_level ===
                "Critical"
                ? "1"
                : "0"}
            </h2>

            <small>
              AI-detected risk
            </small>

          </div>

          <div className="stat-card">

            <span>🚨</span>

            <p>
              Emergency Alerts
            </p>

            <h2>
              4
            </h2>

            <small>
              Active emergency cases
            </small>

          </div>

        </div>

        {/* =========================
            AI RISK ALERT
        ========================= */}

        {(aiRisk.risk_level ===
          "High" ||
          aiRisk.risk_level ===
            "Critical") && (

          <div className="ai-risk-alert">

            <div className="ai-risk-alert-icon">
              🚨
            </div>

            <div className="ai-risk-alert-content">

              <strong>
                AI RISK ALERT
              </strong>

              <p>
                Tourist/device requires
                immediate attention based
                on AI risk analysis.
              </p>

              <div className="ai-risk-alert-details">

                <span>
                  Risk Score:

                  <strong>
                    {aiRisk.risk_score}/100
                  </strong>
                </span>

                <span>
                  Risk Level:

                  <strong>
                    {aiRisk.risk_level}
                  </strong>
                </span>

                <span>
                  Anomaly:

                  <strong>
                    {aiRisk.anomaly_detected
                      ? " Detected"
                      : " Normal"}
                  </strong>
                </span>

              </div>

            </div>

            <button
              type="button"
              className="ai-alert-map-button"
              onClick={() => {
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
            >
              VIEW ON MAP
            </button>

          </div>

        )}

        {/* =========================
            AI RISK MONITORING
        ========================= */}

        <div className="authority-card ai-authority-card">

          <div className="card-header">

            <div>

              <h2>
                🤖 AI Risk Monitoring
              </h2>

              <p>
                AI analysis of the currently
                tracked tourist/device.
              </p>

            </div>

            <span className="live-badge">
              ● AI LIVE
            </span>

          </div>

          <div className="ai-monitor-grid">

            <div className="ai-monitor-item">

              <span>
                Risk Score
              </span>

              <strong
                className={getRiskClass()}
              >
                {aiLoading
                  ? "..."
                  : `${aiRisk.risk_score}/100`}
              </strong>

            </div>

            <div className="ai-monitor-item">

              <span>
                Safety Score
              </span>

              <strong>
                {aiLoading
                  ? "..."
                  : `${aiRisk.safety_score}/100`}
              </strong>

            </div>

            <div className="ai-monitor-item">

              <span>
                Risk Level
              </span>

              <strong
                className={getRiskClass()}
              >
                {aiLoading
                  ? "Analyzing..."
                  : aiRisk.risk_level}
              </strong>

            </div>

            <div className="ai-monitor-item">

              <span>
                Anomaly Detection
              </span>

              <strong>
                {aiLoading
                  ? "..."
                  : aiRisk.anomaly_detected
                  ? "⚠️ Detected"
                  : "✓ Normal"}
              </strong>

            </div>

          </div>

        </div>

        {/* =========================
            GEOFENCE MANAGEMENT
        ========================= */}

        <div className="authority-card">

          <div className="card-header">

            <div>

              <h2>
                🔴 Geofence Management
              </h2>

              <p>
                Create multiple danger zones
                for tourist protection.
              </p>

            </div>

            {dangerZones.length > 0 && (

              <span className="live-badge">
                ● {dangerZones.length} ZONES
              </span>

            )}

          </div>

          <form
            className="geofence-form"
            onSubmit={handleCreateZone}
          >

            <div className="geofence-field">

              <label>
                Zone Name
              </label>

              <input
                type="text"
                placeholder="Example: High-Risk Area"
                value={zoneName}
                onChange={(event) =>
                  setZoneName(
                    event.target.value
                  )
                }
                required
              />

            </div>

            <div className="geofence-field">

              <label>
                Latitude
              </label>

              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(event) =>
                  setLatitude(
                    event.target.value
                  )
                }
                required
              />

            </div>

            <div className="geofence-field">

              <label>
                Longitude
              </label>

              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(event) =>
                  setLongitude(
                    event.target.value
                  )
                }
                required
              />

            </div>

            <div className="geofence-field">

              <label>
                Radius (meters)
              </label>

              <input
                type="number"
                min="50"
                value={radius}
                onChange={(event) =>
                  setRadius(
                    event.target.value
                  )
                }
                required
              />

            </div>

            <button
              type="submit"
              className="create-zone-button"
            >
              ➕ Add Danger Zone
            </button>

          </form>

          {/* ACTIVE ZONES */}

          {dangerZones.length > 0 && (

            <div className="zone-list">

              {dangerZones.map(
                (zone) => (

                  <div
                    className="zone-item"
                    key={zone.id}
                  >

                    <div>

                      <strong>
                        🔴 {zone.name}
                      </strong>

                      <small>
                        Lat:{" "}
                        {zone.latitude}
                        {" | "}
                        Lng:{" "}
                        {zone.longitude}
                        {" | "}
                        Radius:{" "}
                        {zone.radius}m
                      </small>

                    </div>

                    <div className="zone-actions">

                      <span className="zone-active">
                        🟢 Active
                      </span>

                      <button
                        type="button"
                        className="delete-zone-button"
                        onClick={() =>
                          handleDeleteZone(
                            zone.id
                          )
                        }
                      >
                        🗑️ Delete
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

        {/* =========================
            MAP + ALERTS
        ========================= */}

        <div className="dashboard-grid">

          {/* LIVE MAP */}

          <div className="dashboard-map">

            <div className="card-header">

              <div>

                <h2>
                  Live Tourist Map
                </h2>

                <p>
                  {locationStatus}
                </p>

              </div>

              <span className="live-badge">
                ● LIVE
              </span>

            </div>

            <div className="real-map">

              <MapContainer
                center={mapCenter}
                zoom={15}
                scrollWheelZoom={true}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >

                <MapUpdater
                  center={mapCenter}
                />

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* CURRENT LOCATION */}

                {position && (

                  <>

                    <Marker
                      position={position}
                    >

                      <Popup>

                        <strong>
                          📍 Tourist Location
                        </strong>

                        <br />

                        Currently tracked device

                        <br />

                        GPS tracking active

                      </Popup>

                    </Marker>

                    <Circle
                      center={position}
                      radius={80}
                      pathOptions={{
                        color: "#3c9b5f",
                        fillColor:
                          "#3c9b5f",
                        fillOpacity: 0.12,
                      }}
                    />

                  </>

                )}

                {/* DANGER ZONES */}

                {dangerZones.map(
                  (zone) => (

                    <div
                      key={zone.id}
                    >

                      <Circle
                        center={[
                          Number(
                            zone.latitude
                          ),
                          Number(
                            zone.longitude
                          ),
                        ]}
                        radius={Number(
                          zone.radius
                        )}
                        pathOptions={{
                          color:
                            "#d92d20",
                          fillColor:
                            "#d92d20",
                          fillOpacity:
                            0.25,
                        }}
                      />

                      <Marker
                        position={[
                          Number(
                            zone.latitude
                          ),
                          Number(
                            zone.longitude
                          ),
                        ]}
                      >

                        <Popup>

                          <strong>
                            🔴{" "}
                            {zone.name}
                          </strong>

                          <br />

                          Authority-designated
                          danger zone

                          <br />

                          Radius:{" "}
                          {zone.radius}m

                        </Popup>

                      </Marker>

                    </div>

                  )
                )}

              </MapContainer>

            </div>

          </div>

          {/* EMERGENCY ALERTS */}

          <div className="quick-actions">

            <h2>
              Emergency Alerts
            </h2>

            <button>

              🚨

              <div>

                <strong>
                  SOS Alert
                </strong>

                <small>
                  Tourist #YS1024
                </small>

              </div>

            </button>

            <button>

              ⚠️

              <div>

                <strong>
                  Danger Zone Entry
                </strong>

                <small>
                  Tourist #YS1087
                </small>

              </div>

            </button>

            <button>

              🧭

              <div>

                <strong>
                  Route Deviation
                </strong>

                <small>
                  Tourist #YS1102
                </small>

              </div>

            </button>

          </div>

        </div>

        {/* =========================
            ACTIVE ZONE SUMMARY
        ========================= */}

        {dangerZones.length > 0 && (

          <div className="authority-card active-zone-card">

            <h2>
              🔴 Active Danger Zones
            </h2>

            <p>
              {dangerZones.length}{" "}
              authority-designated danger zone
              {dangerZones.length > 1
                ? "s"
                : ""}{" "}
              currently active.
            </p>

            <div className="zone-details">

              <div>

                <span>
                  Total Zones
                </span>

                <strong>
                  {dangerZones.length}
                </strong>

              </div>

              <div>

                <span>
                  AI Risk Level
                </span>

                <strong
                  className={getRiskClass()}
                >
                  {aiRisk.risk_level}
                </strong>

              </div>

              <div>

                <span>
                  Risk Score
                </span>

                <strong>
                  {aiRisk.risk_score}/100
                </strong>

              </div>

              <div>

                <span>
                  Safety Score
                </span>

                <strong>
                  {aiRisk.safety_score}/100
                </strong>

              </div>

              <div>

                <span>
                  AI Status
                </span>

                <strong className="zone-active">
                  🤖 Active
                </strong>

              </div>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default AuthorityDashboard;