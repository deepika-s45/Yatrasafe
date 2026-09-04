from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from risk_engine import YatraSafeRiskEngine

app = FastAPI(
    title="YatraSafe AI Safety API",
    version="1.0.0"
)

# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://yatrasafe.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create AI engine
risk_engine = YatraSafeRiskEngine()


class RiskRequest(BaseModel):
    distance_m: float
    nearby_zones: int
    geofence_status: str
    sos_active: bool


@app.get("/")
def home():
    return {
        "message": "YatraSafe AI Safety API is running"
    }


@app.post("/predict-risk")
def predict_risk(request: RiskRequest):

    result = risk_engine.calculate_risk(
        distance_m=request.distance_m,
        nearby_zones=request.nearby_zones,
        geofence_status=request.geofence_status,
        sos_active=request.sos_active
    )

    # Convert NumPy boolean to normal Python boolean
    result["anomaly_detected"] = bool(
        result["anomaly_detected"]
    )

    return result