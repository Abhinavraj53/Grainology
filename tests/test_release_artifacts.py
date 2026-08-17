import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from automation.release_artifacts import build_serving_manifest, encode_json


class ReleaseArtifactTests(unittest.TestCase):
    def test_training_canonical_files_are_excluded_with_consistent_checksums(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory)
            checksums = {
                "predictions.json": "prediction-hash",
                "market_canonical_daily.csv": "large-csv-hash",
                "market_canonical_daily.parquet": "large-parquet-hash",
            }
            (bundle / "checksums.json").write_text(json.dumps(checksums), encoding="utf-8")
            (bundle / "market_canonical_daily.csv").write_text("large", encoding="utf-8")
            (bundle / "market_canonical_daily.parquet").write_bytes(b"large")
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
            self.assertEqual(
                serving_manifest["files"]["checksums.json"],
                hashlib.sha256(encode_json(serving_checksums)).hexdigest(),
            )


if __name__ == "__main__":
    unittest.main()
