import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from automation.release_artifacts import (
    build_market_payload_chunks,
    build_serving_manifest,
    encode_json,
)


class ReleaseArtifactTests(unittest.TestCase):
    def test_market_payload_chunks_are_bounded_and_lossless(self):
        payload = {
            "Wheat": {
                "market-a": {"series": [1] * 40},
                "market-b": {"series": [2] * 40},
                "market-c": {"series": [3] * 40},
            },
            "Maize": {"market-d": {"series": [4] * 20}},
        }

        chunks = build_market_payload_chunks(payload, max_bytes=180)

        rebuilt = {}
        self.assertGreater(len(chunks), 1)
        for grain, chunk in chunks:
            self.assertLessEqual(len(encode_json(chunk)), 180)
            rebuilt.setdefault(grain, {}).update(chunk[grain])
        self.assertEqual(rebuilt, payload)

    def test_training_canonical_files_are_excluded_with_consistent_checksums(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory)
            checksums = {
                "predictions.json": "prediction-hash",
                "market_forecast_series.json": "transformed-market-hash",
                "historical_efficiency.json": "transformed-efficiency-hash",
                "grainology_release.zip": "package-hash",
                "market_canonical_daily.csv": "large-csv-hash",
                "market_canonical_daily.parquet": "large-parquet-hash",
            }
            (bundle / "checksums.json").write_text(json.dumps(checksums), encoding="utf-8")
            (bundle / "market_canonical_daily.csv").write_text("large", encoding="utf-8")
            (bundle / "market_canonical_daily.parquet").write_bytes(b"large")
            (bundle / "grainology_release.zip").write_bytes(b"package")
            manifest = {
                "files": {
                    **checksums,
                    "checksums.json": "old-checksums-hash",
                }
            }

            serving_manifest, serving_checksums, excluded = build_serving_manifest(bundle, manifest)

            self.assertEqual(
                excluded,
                ["market_canonical_daily.csv", "market_canonical_daily.parquet"],
            )
            self.assertEqual(serving_checksums, {"predictions.json": "prediction-hash"})
            self.assertNotIn("market_canonical_daily.csv", serving_manifest["files"])
            self.assertNotIn("market_canonical_daily.parquet", serving_manifest["files"])
            self.assertNotIn("market_forecast_series.json", serving_manifest["files"])
            self.assertNotIn("historical_efficiency.json", serving_manifest["files"])
            self.assertNotIn("grainology_release.zip", serving_manifest["files"])
            self.assertEqual(
                serving_manifest["package_artifacts_retained_in_kaggle"],
                ["grainology_release.zip"],
            )
            self.assertEqual(
                serving_manifest["chunked_serving_artifacts"],
                [
                    "historical_efficiency.json",
                    "market_actuals.json",
                    "market_forecast_series.json",
                ],
            )
            self.assertEqual(
                serving_manifest["files"]["checksums.json"],
                hashlib.sha256(encode_json(serving_checksums)).hexdigest(),
            )


if __name__ == "__main__":
    unittest.main()
