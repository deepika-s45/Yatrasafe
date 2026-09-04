import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function LocationUpdater({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 16);
    }
  }, [position, map]);

  return null;
}

function TouristDashboard() {
  const [position, setPosition] = useState(null);

  const [locationStatus, setLocationStatus] = useState(
    "Getting your location..."
  );

  const [sosActive, setSosActive] = useState(false);

  const [dangerZones, setDangerZones] = useState([]);

  const [geofenceStatus, setGeofenceStatus] =
    useState("safe");

  const [distanceToZone, setDistanceToZone] =
    useState(null);

  const [nearestZone, setNearestZone] =
    useState(null);

  // =========================
  // AI RISK DATA
  // =========================

  const [aiRisk, setAiRisk] = useState({
    risk_score: 10,
    safety_score: 90,
    risk_level: "Low",
    anomaly_detected: false,
  });

  const [aiLoading, setAiLoading] = useState(false);

  // =========================
  // SAFE ROUTE
  // =========================

  const [safeRoute, setSafeRoute] = useState([]);

  const [routeActive, setRouteActive] =
    useState(false);

  const [routeMessage, setRouteMessage] =
    useState("");

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

        setDangerZones(zones);
      } catch (error) {
        console.log(
          "Unable to read danger zones."
        );
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

      setPosition([
        latitude,
        longitude,
      ]);

      setLocationStatus(
        "Location tracking active"
      );
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
  // GEOFENCE CHECK
  // =========================

  useEffect(() => {
    if (
      !position ||
      dangerZones.length === 0
    ) {
      setGeofenceStatus("safe");
      setDistanceToZone(null);
      setNearestZone(null);

      return;
    }

    let closestZone = null;
    let closestDistance = Infinity;

    dangerZones.forEach((zone) => {
      const distance = calculateDistance(
        position[0],
        position[1],
        Number(zone.latitude),
        Number(zone.longitude)
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestZone = zone;
      }
    });

    setNearestZone(closestZone);

    setDistanceToZone(
      Math.round(closestDistance)
    );

    if (
      closestZone &&
      closestDistance <=
        Number(closestZone.radius)
    ) {
      setGeofenceStatus("danger");
    } else if (
      closestZone &&
      closestDistance <=
        Number(closestZone.radius) + 150
    ) {
      setGeofenceStatus("approaching");
    } else {
      setGeofenceStatus("safe");
    }
  }, [position, dangerZones]);

  // =========================
  // NEARBY DANGER ZONES
  // =========================

  const nearbyDangerZones =
    dangerZones.filter((zone) => {
      if (!position) return false;

      const distance = calculateDistance(
        position[0],
        position[1],
        Number(zone.latitude),
        Number(zone.longitude)
      );

      return distance <= 1000;
    });

  // =========================
  // CONNECT TO AI BACKEND
  // =========================

  useEffect(() => {
    if (!position) return;

    const getAIRisk = async () => {
      try {
        setAiLoading(true);

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
                distanceToZone ?? 2000,

              nearby_zones:
                nearbyDangerZones.length,

              geofence_status:
                geofenceStatus,

              sos_active:
                sosActive,
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

        setAiRisk(data);

      } catch (error) {
        console.error(
          "AI Risk Engine Error:",
          error
        );
      } finally {
        setAiLoading(false);
      }
    };

    getAIRisk();

  }, [
    position,
    distanceToZone,
    geofenceStatus,
    sosActive,
    dangerZones,
  ]);

  // =========================
  // LEAFLET SIZING
  // =========================

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(
        new Event("resize")
      );
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // =========================
  // SOS
  // =========================

  const handleSOS = () => {
    if (sosActive) {
      setSosActive(false);
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to activate SOS emergency mode?"
    );

    if (!confirmed) return;

    setSosActive(true);

    if (position) {
      alert(
        `🚨 SOS ACTIVATED!\n\nLatitude: ${position[0].toFixed(
          6
        )}\nLongitude: ${position[1].toFixed(
          6
        )}`
      );
    } else {
      alert(
        "🚨 SOS ACTIVATED!\n\nGPS location unavailable."
      );
    }
  };

  // =========================
  // AI SAFE ROUTE
  // =========================

  const handleSafeRoute = () => {
    if (!position) {
      alert(
        "📍 Your current GPS location is not available yet."
      );

      return;
    }

    const currentLat = position[0];
    const currentLng = position[1];

    let routePoints = [];
    let avoidedZones = 0;

    if (dangerZones.length === 0) {
      routePoints = [
        [currentLat, currentLng],

        [
          currentLat + 0.0015,
          currentLng + 0.0015,
        ],

        [
          currentLat + 0.003,
          currentLng + 0.0025,
        ],
      ];

      setRouteMessage(
        "AI recommended route — no active danger zones detected."
      );

    } else {
      let closestZone = null;
      let closestDistance = Infinity;

      dangerZones.forEach((zone) => {
        const distance = calculateDistance(
          currentLat,
          currentLng,
          Number(zone.latitude),
          Number(zone.longitude)
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestZone = zone;
        }
      });

      dangerZones.forEach((zone) => {
        const distance = calculateDistance(
          currentLat,
          currentLng,
          Number(zone.latitude),
          Number(zone.longitude)
        );

        if (distance < 1000) {
          avoidedZones++;
        }
      });

      if (closestZone) {
        const zoneLat =
          Number(
            closestZone.latitude
          );

        const zoneLng =
          Number(
            closestZone.longitude
          );

        const latDifference =
          currentLat - zoneLat;

        const lngDifference =
          currentLng - zoneLng;

        const magnitude =
          Math.sqrt(
            latDifference ** 2 +
              lngDifference ** 2
          ) || 1;

        const safeOffset = 0.004;

        const waypoint = [
          zoneLat +
            (latDifference /
              magnitude) *
              safeOffset,

          zoneLng +
            (lngDifference /
              magnitude) *
              safeOffset,
        ];

        const destination = [
          currentLat + 0.005,
          currentLng + 0.004,
        ];

        routePoints = [
          [currentLat, currentLng],
          waypoint,
          destination,
        ];

        if (avoidedZones > 0) {
          setRouteMessage(
            `AI recommended route — avoids ${avoidedZones} high-risk zone${
              avoidedZones > 1
                ? "s"
                : ""
            }.`
          );
        } else {
          setRouteMessage(
            "AI recommended safe route generated."
          );
        }
      }
    }

    setSafeRoute(routePoints);
    setRouteActive(true);
  };

  // =========================
  // CURRENT ZONE TEXT
  // =========================

  const zoneText =
    geofenceStatus === "danger"
      ? "Danger Zone"
      : geofenceStatus === "approaching"
      ? "Caution Zone"
      : "Safe Zone";

  return (
    <div className="dashboard">

      {/* NAVBAR */}
      <nav className="dashboard-nav">

        <div className="logo">
          🛡️ YatraSafe
        </div>

        <div className="dashboard-user">
          🟢 Tourist
        </div>

      </nav>

      <main className="dashboard-content">

        {/* HEADER */}
        <div className="dashboard-heading">

          <div>

            <p className="dashboard-label">
              TOURIST DASHBOARD
            </p>

            <h1>
              Stay safe on your journey 👋
            </h1>

            <p>
              Your journey is being monitored
              with your permission.
            </p>

          </div>

          <button
            className={
              sosActive
                ? "sos-button sos-active"
                : "sos-button"
            }
            onClick={handleSOS}
          >
            {sosActive
              ? "🛑 CANCEL SOS"
              : "🚨 SOS"}
          </button>

        </div>

        {/* AI RISK SUMMARY */}
        <div className="ai-risk-card">

          <div className="ai-risk-icon">
            🤖
          </div>

          <div className="ai-risk-content">

            <strong>
              AI Safety Analysis
            </strong>

            <p>

              {aiLoading
                ? "Analyzing your current location..."
                : (
                  <>
                    Risk Level:{" "}
                    <strong>
                      {aiRisk.risk_level}
                    </strong>

                    {" • "}

                    Risk Score:{" "}
                    <strong>
                      {aiRisk.risk_score}/100
                    </strong>
                  </>
                )}

            </p>

            <small>
              AI is analyzing GPS location,
              nearby danger zones and
              geofence status.
            </small>

          </div>

        </div>

        {/* DANGER ALERT */}
        {geofenceStatus === "danger" && (
          <div className="geofence-alert">

            <div className="geofence-alert-icon">
              🚨
            </div>

            <div>

              <strong>
                You have entered a high-risk zone
              </strong>

              <p>
                You are currently inside{" "}
                <strong>
                  {nearestZone?.name}
                </strong>
                .
              </p>

              {distanceToZone !== null && (
                <p>
                  Distance from zone center:{" "}
                  <strong>
                    {distanceToZone}m
                  </strong>
                </p>
              )}

            </div>

          </div>
        )}

        {/* APPROACHING ALERT */}
        {geofenceStatus === "approaching" && (
          <div className="geofence-alert approaching-alert">

            <div className="geofence-alert-icon">
              ⚠️
            </div>

            <div>

              <strong>
                Approaching High-Risk Area
              </strong>

              <p>
                You are getting close to{" "}
                <strong>
                  {nearestZone?.name}
                </strong>
                .
              </p>

              {distanceToZone !== null && (
                <p>
                  Distance from zone center:{" "}
                  <strong>
                    {distanceToZone}m
                  </strong>
                </p>
              )}

            </div>

          </div>
        )}

        {/* SOS ALERT */}
        {sosActive && (
          <div className="sos-alert-banner">

            <div>

              <strong>
                🚨 SOS Emergency Mode Active
              </strong>

              <p>
                Your current GPS location
                has been captured.
              </p>

            </div>

            <span>
              LIVE
            </span>

          </div>
        )}

        {/* SAFE ROUTE ALERT */}
        {routeActive && (
          <div className="safe-route-alert">

            <div className="safe-route-icon">
              🧭
            </div>

            <div>

              <strong>
                AI Safe Route Recommended
              </strong>

              <p>
                {routeMessage}
              </p>

            </div>

            <button
              className="clear-route-button"
              onClick={() => {
                setSafeRoute([]);
                setRouteActive(false);
                setRouteMessage("");
              }}
            >
              Clear
            </button>

          </div>
        )}

        {/* STATISTICS */}
        <div className="stats-grid">

          {/* AI SAFETY SCORE */}
          <div className="stat-card">

            <span>🛡️</span>

            <p>
              AI Safety Score
            </p>

            <h2>
              {aiLoading
                ? "..."
                : aiRisk.safety_score}

              <span>/100</span>
            </h2>

            <small>
              AI Risk:{" "}
              {aiRisk.risk_level}
            </small>

          </div>

          {/* CURRENT ZONE */}
          <div className="stat-card">

            <span>📍</span>

            <p>
              Current Zone
            </p>

            <h2>
              {zoneText}
            </h2>

            <small>
              {locationStatus}
            </small>

          </div>

          {/* ROUTE */}
          <div className="stat-card">

            <span>🧭</span>

            <p>
              Route Status
            </p>

            <h2>
              {routeActive
                ? "Safe Route"
                : "On Route"}
            </h2>

            <small>
              {routeActive
                ? "AI risk-aware route active"
                : "No route optimization active"}
            </small>

          </div>

          {/* ALERTS */}
          <div className="stat-card">

            <span>🚨</span>

            <p>
              Active Alerts
            </p>

            <h2>
              {sosActive ||
              geofenceStatus !== "safe"
                ? "1"
                : "0"}
            </h2>

            <small>
              {sosActive
                ? "SOS emergency active"
                : geofenceStatus === "danger"
                ? "Danger zone active"
                : geofenceStatus === "approaching"
                ? "Approaching danger zone"
                : "No active alerts"}
            </small>

          </div>

        </div>

        {/* MAIN GRID */}
        <div className="dashboard-grid">

          {/* MAP */}
          <div className="dashboard-map">

            <div className="card-header">

              <div>

                <h2>
                  Live Safety Map
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

              {position ? (

                <MapContainer
                  center={position}
                  zoom={16}
                  scrollWheelZoom={true}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                >

                  <LocationUpdater
                    position={position}
                  />

                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* TOURIST */}
                  <Marker
                    position={position}
                  >

                    <Popup>

                      <strong>
                        📍 You are here
                      </strong>

                      <br />

                      YatraSafe Tourist

                      <br />

                      GPS tracking active

                    </Popup>

                  </Marker>

                  {/* TOURIST SAFETY RADIUS */}
                  <Circle
                    center={position}
                    radius={80}
                    pathOptions={{
                      color: "#3c9b5f",
                      fillColor: "#3c9b5f",
                      fillOpacity: 0.12,
                    }}
                  />

                  {/* ALL DANGER ZONES */}
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

                            Authority
                            designated
                            high-risk area

                            <br />

                            Radius:{" "}
                            {zone.radius}m

                          </Popup>

                        </Marker>

                      </div>
                    )
                  )}

                  {/* AI SAFE ROUTE */}
                  {safeRoute.length > 0 && (
                    <Polyline
                      positions={safeRoute}
                      pathOptions={{
                        color: "#2f8f55",
                        weight: 6,
                        opacity: 0.9,
                        dashArray: "10 8",
                      }}
                    />
                  )}

                  {/* ROUTE DESTINATION */}
                  {safeRoute.length > 0 && (
                    <Marker
                      position={
                        safeRoute[
                          safeRoute.length - 1
                        ]
                      }
                    >

                      <Popup>

                        <strong>
                          🧭 AI Safe Route
                        </strong>

                        <br />

                        Recommended
                        low-risk direction

                      </Popup>

                    </Marker>
                  )}

                </MapContainer>

              ) : (

                <div className="map-loading">
                  📍 Getting your location...
                </div>

              )}

            </div>

          </div>

          {/* QUICK ACTIONS */}
          <div className="quick-actions">

            <h2>
              Quick Actions
            </h2>

            <button
              onClick={handleSafeRoute}
            >

              🧭

              <div>

                <strong>
                  Find Safe Route
                </strong>

                <small>
                  AI-powered safer route
                </small>

              </div>

            </button>

            <button>

              📝

              <div>

                <strong>
                  Report Incident
                </strong>

                <small>
                  Report a safety issue
                </small>

              </div>

            </button>

            <button>

              👨‍👩‍👧

              <div>

                <strong>
                  Share Journey
                </strong>

                <small>
                  Share your location
                </small>

              </div>

            </button>

            <button>

              🆔

              <div>

                <strong>
                  Tourist ID
                </strong>

                <small>
                  View your digital ID
                </small>

              </div>

            </button>

          </div>

        </div>

        {/* ACTIVE ZONES SUMMARY */}
        {dangerZones.length > 0 && (

          <div className="authority-card active-zone-card">

            <h2>
              🔴 Active Safety Zones
            </h2>

            <p>
              {dangerZones.length} authority-designated
              danger zone
              {dangerZones.length > 1
                ? "s"
                : ""}{" "}
              currently active.
            </p>

          </div>

        )}

      </main>

    </div>
  );
}

export default TouristDashboard;