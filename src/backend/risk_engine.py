from sklearn.ensemble import IsolationForest
import numpy as np


class YatraSafeRiskEngine:
    def __init__(self):
        """
        YatraSafe AI Risk Engine

        Features:
        1. Distance from danger zone
        2. Number of nearby danger zones
        3. Geofence status
        4. Emergency/SOS status
        """

        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.1,
            random_state=42
        )

        # Demo training data
        # [distance_m, nearby_zones, geofence_risk, sos]
        training_data = np.array([
            [3000, 0, 0, 0],
            [2500, 0, 0, 0],
            [2000, 0, 0, 0],
            [1500, 0, 0, 0],
            [1200, 0, 0, 0],
            [1000, 1, 0, 0],
            [800, 1, 0, 0],
            [600, 1, 0.5, 0],
            [500, 1, 0.5, 0],
            [300, 2, 1, 0],
            [200, 2, 1, 0],
            [100, 2, 1, 0],
            [50, 3, 1, 1],
            [20, 3, 1, 1],
        ])

        self.model.fit(training_data)

    def calculate_risk(
        self,
        distance_m,
        nearby_zones,
        geofence_status,
        sos_active
    ):
        """
        Calculate YatraSafe tourist risk.
        """

        # Make sure values are valid
        distance_m = max(float(distance_m), 0)

        nearby_zones = max(
            int(nearby_zones),
            0
        )

        geofence_status = str(
            geofence_status
        ).lower()

        sos_active = bool(sos_active)

        # =========================
        # GEOFENCE RISK
        # =========================

        if geofence_status == "danger":
            geofence_risk = 1

        elif geofence_status == "approaching":
            geofence_risk = 0.5

        else:
            geofence_risk = 0

        # =========================
        # AI INPUT
        # =========================

        features = np.array([[
            distance_m,
            nearby_zones,
            geofence_risk,
            1 if sos_active else 0
        ]])

        # Isolation Forest anomaly detection
        prediction = self.model.predict(
            features
        )[0]

        anomaly_detected = (
            prediction == -1
        )

        # =========================
        # BASE RISK
        # =========================

        risk_score = 5

        # =========================
        # DISTANCE RISK
        # =========================

        if distance_m <= 50:
            risk_score += 35

        elif distance_m <= 100:
            risk_score += 30

        elif distance_m <= 300:
            risk_score += 25

        elif distance_m <= 600:
            risk_score += 18

        elif distance_m <= 1000:
            risk_score += 10

        # =========================
        # NEARBY ZONE RISK
        # =========================

        risk_score += min(
            nearby_zones * 8,
            24
        )

        # =========================
        # GEOFENCE RISK
        # =========================

        if geofence_status == "approaching":

            risk_score += 25

        elif geofence_status == "danger":

            # Being inside a danger zone
            # is a major risk factor.
            risk_score += 50

        # =========================
        # SOS RISK
        # =========================

        if sos_active:

            risk_score += 30

        # =========================
        # AI ANOMALY
        # =========================

        if anomaly_detected:

            risk_score += 10

        # =========================
        # CRITICAL OVERRIDES
        # =========================

        # Tourist inside danger zone
        if geofence_status == "danger":

            risk_score = max(
                risk_score,
                75
            )

        # SOS automatically becomes critical
        if sos_active:

            risk_score = max(
                risk_score,
                85
            )

        # Very close to danger zone
        if distance_m <= 50:

            risk_score = max(
                risk_score,
                70
            )

        # =========================
        # LIMIT SCORE
        # =========================

        risk_score = int(
            min(
                max(
                    risk_score,
                    0
                ),
                100
            )
        )

        # =========================
        # SAFETY SCORE
        # =========================

        safety_score = 100 - risk_score

        # =========================
        # RISK LEVEL
        # =========================

        if risk_score >= 70:

            risk_level = "Critical"

        elif risk_score >= 50:

            risk_level = "High"

        elif risk_score >= 30:

            risk_level = "Moderate"

        else:

            risk_level = "Low"

        # =========================
        # RETURN RESULT
        # =========================

        return {
            "risk_score": risk_score,
            "safety_score": safety_score,
            "risk_level": risk_level,
            "anomaly_detected": bool(
                anomaly_detected
            )
        }


# =========================
# TEST AI ENGINE
# =========================

if __name__ == "__main__":

    engine = YatraSafeRiskEngine()

    print()
    print(
        "YatraSafe AI Risk Engine"
    )
    print(
        "========================"
    )

    # Test 1: Safe
    safe_result = engine.calculate_risk(
        distance_m=2000,
        nearby_zones=0,
        geofence_status="safe",
        sos_active=False
    )

    print()
    print("TEST 1 - SAFE")
    print(
        f"Risk Score: "
        f"{safe_result['risk_score']}/100"
    )
    print(
        f"Safety Score: "
        f"{safe_result['safety_score']}/100"
    )
    print(
        f"Risk Level: "
        f"{safe_result['risk_level']}"
    )

    # Test 2: Approaching
    approaching_result = engine.calculate_risk(
        distance_m=200,
        nearby_zones=1,
        geofence_status="approaching",
        sos_active=False
    )

    print()
    print("TEST 2 - APPROACHING")
    print(
        f"Risk Score: "
        f"{approaching_result['risk_score']}/100"
    )
    print(
        f"Safety Score: "
        f"{approaching_result['safety_score']}/100"
    )
    print(
        f"Risk Level: "
        f"{approaching_result['risk_level']}"
    )

    # Test 3: Danger zone
    danger_result = engine.calculate_risk(
        distance_m=20,
        nearby_zones=1,
        geofence_status="danger",
        sos_active=False
    )

    print()
    print("TEST 3 - DANGER ZONE")
    print(
        f"Risk Score: "
        f"{danger_result['risk_score']}/100"
    )
    print(
        f"Safety Score: "
        f"{danger_result['safety_score']}/100"
    )
    print(
        f"Risk Level: "
        f"{danger_result['risk_level']}"
    )

    # Test 4: SOS
    sos_result = engine.calculate_risk(
        distance_m=20,
        nearby_zones=1,
        geofence_status="danger",
        sos_active=True
    )

    print()
    print("TEST 4 - SOS")
    print(
        f"Risk Score: "
        f"{sos_result['risk_score']}/100"
    )
    print(
        f"Safety Score: "
        f"{sos_result['safety_score']}/100"
    )
    print(
        f"Risk Level: "
        f"{sos_result['risk_level']}"
    )

    print()