import json
import tempfile
import unittest
from pathlib import Path

from automation.release_quality import build_release_quality_report


GRAINS = ("Wheat", "Paddy", "Maize", "Mustard")
HORIZONS = ("7", "30", "90")


def metrics(mape, strategy):
    return {
        grain: {
            "All States": {
                horizon: {
                    "ml_mape": mape,
                    "ml_mae": 50.0,
                    "sample_count": 100,
                    "selected_method": "ensemble",
                    "validation_strategy": strategy,
                }
                for horizon in HORIZONS
            }
        }
        for grain in GRAINS
    }


class ReleaseQualityTests(unittest.TestCase):
    def report(self, candidate_mape, candidate_strategy, champion_mape, champion_strategy):
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory)
            (bundle / "metrics.json").write_text(
                json.dumps(metrics(candidate_mape, candidate_strategy)), encoding="utf-8"
            )
            (bundle / "predictions.json").write_text("{}", encoding="utf-8")
            (bundle / "evaluation_report.json").write_text(
                json.dumps({"evaluation_strategy": "horizon_embargo_temporal_holdout"}),
                encoding="utf-8",
            )
            return build_release_quality_report(
                bundle,
                champion_metrics=metrics(champion_mape, champion_strategy),
            )

    def test_incomparable_validation_strategies_do_not_block_release(self):
        report = self.report(6.0, "horizon_embargo_temporal_holdout", 2.0, "dashboard_random")
        self.assertTrue(report["passed"])
        self.assertFalse(report["issues"])
        self.assertTrue(report["warnings"])
        self.assertTrue(all(not row["strategies_comparable"] for row in report["national_metric_comparisons"]))

    def test_same_strategy_regression_remains_blocking(self):
        strategy = "horizon_embargo_temporal_holdout"
        report = self.report(6.0, strategy, 2.0, strategy)
        self.assertFalse(report["passed"])
        self.assertTrue(any("regressed" in issue for issue in report["issues"]))

    def test_absolute_national_mape_limit_remains_blocking(self):
        report = self.report(13.0, "horizon_embargo_temporal_holdout", 2.0, "dashboard_random")
        self.assertFalse(report["passed"])
        self.assertTrue(any("exceeds" in issue for issue in report["issues"]))


if __name__ == "__main__":
    unittest.main()
