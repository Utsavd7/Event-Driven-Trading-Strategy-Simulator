"""
ML signal engine: feature engineering, earnings predictor, regime detection, anomaly detection.
All computation is local — no external API required.
"""
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score


FEATURE_COLS = [
    "ret_5d", "ret_20d", "vol_ratio", "rsi_14",
    "vol_zscore", "price_position", "mom_10d", "mom_30d",
]


class MLSignalEngine:

    def compute_features(self, prices_df: pd.DataFrame) -> pd.DataFrame:
        """Engineer a feature DataFrame from OHLCV data."""
        df = prices_df.copy()
        close = df["close"]
        volume = df["volume"] if "volume" in df.columns else pd.Series(1, index=df.index)

        df["ret_1d"] = close.pct_change(1)
        df["ret_5d"] = close.pct_change(5)
        df["ret_20d"] = close.pct_change(20)
        df["ret_60d"] = close.pct_change(60)

        vol_5d = df["ret_1d"].rolling(5).std() * np.sqrt(252)
        vol_20d = df["ret_1d"].rolling(20).std() * np.sqrt(252)
        df["vol_5d"] = vol_5d
        df["vol_20d"] = vol_20d
        df["vol_ratio"] = vol_5d / (vol_20d + 1e-9)

        df["mom_10d"] = close / close.shift(10) - 1
        df["mom_30d"] = close / close.shift(30) - 1

        delta = close.diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        df["rsi_14"] = 100 - 100 / (1 + gain / (loss + 1e-9))

        df["vol_zscore"] = (volume - volume.rolling(20).mean()) / (volume.rolling(20).std() + 1e-9)

        hi = df["high"].rolling(20).max() if "high" in df.columns else close.rolling(20).max()
        lo = df["low"].rolling(20).min() if "low" in df.columns else close.rolling(20).min()
        df["price_position"] = (close - lo) / (hi - lo + 1e-9)

        df.dropna(inplace=True)
        return df

    def fit_earnings_predictor(self, prices_df: pd.DataFrame, earnings_dates: list) -> dict:
        """Train Random Forest classifier + regressor on historical earnings plays."""
        try:
            features_df = self.compute_features(prices_df)
            feat_cols = [c for c in FEATURE_COLS if c in features_df.columns]

            X, y = [], []
            for ed in earnings_dates:
                event_date = pd.to_datetime(ed["date"])
                before = features_df.index[features_df.index <= event_date]
                after = prices_df.index[prices_df.index > event_date]

                if len(before) < 4 or len(after) < 3:
                    continue

                entry_date = before[-3]
                exit_date = after[2]

                if entry_date not in prices_df.index or exit_date not in prices_df.index:
                    continue

                entry_price = prices_df.loc[entry_date, "close"]
                exit_price = prices_df.loc[exit_date, "close"]
                post_return = float((exit_price - entry_price) / entry_price)

                row = features_df.loc[entry_date, feat_cols].values
                if np.any(np.isnan(row)):
                    continue

                X.append(row)
                y.append(post_return)

            if len(X) < 5:
                return {"error": "Not enough earnings history", "n_samples": len(X)}

            X = np.array(X)
            y = np.array(y)
            y_class = (y > 0).astype(int)

            scaler = StandardScaler()
            Xs = scaler.fit_transform(X)

            clf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
            clf.fit(Xs, y_class)
            cv = int(min(3, len(X)))
            cv_acc = float(np.mean(cross_val_score(clf, Xs, y_class, cv=cv, scoring="accuracy")))

            reg = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
            reg.fit(Xs, y)

            importances = dict(zip(feat_cols, [float(v) for v in clf.feature_importances_]))

            return {
                "classifier": clf,
                "regressor": reg,
                "scaler": scaler,
                "feature_cols": feat_cols,
                "cv_accuracy": cv_acc,
                "n_samples": len(X),
                "feature_importances": importances,
            }
        except Exception as e:
            return {"error": str(e), "n_samples": 0}

    def predict_next_earnings(self, prices_df: pd.DataFrame, model_bundle: dict) -> dict:
        """Apply trained model to current features to get a forward signal."""
        if "error" in model_bundle:
            return {
                "signal": "HOLD", "confidence": 0.5,
                "predicted_return": 0.0, "feature_importances": {},
                "reason": model_bundle.get("error", "insufficient data"),
            }
        try:
            features_df = self.compute_features(prices_df)
            feat_cols = model_bundle["feature_cols"]
            scaler = model_bundle["scaler"]
            clf = model_bundle["classifier"]
            reg = model_bundle["regressor"]

            row = features_df.iloc[-1][feat_cols].values.reshape(1, -1)
            if np.any(np.isnan(row)):
                return {"signal": "HOLD", "confidence": 0.5, "predicted_return": 0.0, "feature_importances": {}}

            Xs = scaler.transform(row)
            proba = clf.predict_proba(Xs)[0]
            predicted_return = float(reg.predict(Xs)[0])
            buy_prob = float(proba[1]) if len(proba) > 1 else 0.5

            signal = "BUY" if buy_prob >= 0.62 else ("SELL" if buy_prob <= 0.38 else "HOLD")

            return {
                "signal": signal,
                "confidence": float(max(buy_prob, 1 - buy_prob)),
                "predicted_return": predicted_return,
                "buy_probability": buy_prob,
                "cv_accuracy": model_bundle.get("cv_accuracy", 0),
                "n_training_samples": model_bundle.get("n_samples", 0),
                "feature_importances": model_bundle.get("feature_importances", {}),
            }
        except Exception as e:
            return {"signal": "HOLD", "confidence": 0.5, "predicted_return": 0.0, "error": str(e)}

    def detect_market_regime(self, prices_df: pd.DataFrame) -> dict:
        """3-state regime detection using Gaussian Mixture Model."""
        try:
            close = prices_df["close"]
            ret_20d = close.pct_change(20)
            vol_20d = close.pct_change().rolling(20).std() * np.sqrt(252)

            df = pd.DataFrame({"ret": ret_20d, "vol": vol_20d}).dropna()
            if len(df) < 30:
                return {"current_regime": "unknown", "confidence": 0.0, "regime_history": []}

            scaler = StandardScaler()
            X = scaler.fit_transform(df.values)

            gm = GaussianMixture(n_components=3, random_state=42, n_init=5)
            gm.fit(X)
            labels = gm.predict(X)
            proba = gm.predict_proba(X)

            # Map cluster indices to regime names by average return rank
            cluster_means = {i: df["ret"][labels == i].mean() for i in range(3)}
            sorted_c = sorted(cluster_means, key=lambda k: cluster_means[k])
            regime_map = {
                sorted_c[0]: "bear_high_vol",
                sorted_c[1]: "neutral",
                sorted_c[2]: "bull_low_vol",
            }

            current_label = int(labels[-1])
            current_regime = regime_map[current_label]
            current_conf = float(proba[-1][current_label])

            history = [
                {"date": df.index[i].strftime("%Y-%m-%d"), "regime": regime_map[labels[i]]}
                for i in range(max(0, len(df) - 60), len(df))
            ]

            return {
                "current_regime": current_regime,
                "confidence": current_conf,
                "regime_history": history,
                "current_return_20d": float(df["ret"].iloc[-1]),
                "current_vol_20d": float(df["vol"].iloc[-1]),
            }
        except Exception as e:
            return {"current_regime": "unknown", "confidence": 0.0, "regime_history": [], "error": str(e)}

    def detect_anomalies(self, prices_df: pd.DataFrame) -> dict:
        """Detect unusual price/volume behaviour using Isolation Forest."""
        try:
            features_df = self.compute_features(prices_df)
            cols = [c for c in ["ret_1d", "vol_20d", "vol_zscore", "rsi_14"] if c in features_df.columns]
            X = features_df[cols].values
            if len(X) < 20:
                return {"anomaly_dates": [], "anomaly_scores": [], "total_anomalies": 0}

            iso = IsolationForest(contamination=0.05, random_state=42)
            preds = iso.fit_predict(X)
            scores = iso.decision_function(X)

            anomaly_dates = [features_df.index[i].strftime("%Y-%m-%d") for i, p in enumerate(preds) if p == -1]
            anomaly_scores = [float(scores[i]) for i, p in enumerate(preds) if p == -1]

            return {
                "anomaly_dates": anomaly_dates[-20:],
                "anomaly_scores": anomaly_scores[-20:],
                "total_anomalies": len(anomaly_dates),
            }
        except Exception as e:
            return {"anomaly_dates": [], "anomaly_scores": [], "total_anomalies": 0, "error": str(e)}
