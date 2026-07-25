import os
import yaml


class Config:
    def __init__(self, stage: str):
        self.stage = stage
        self.shared = self._load_shared()

    def _load_shared(self) -> dict:
        path = os.path.join(os.path.dirname(__file__), "..", "..", "config", f"{self.stage}.yaml")
        with open(os.path.abspath(path), "r") as f:
            return yaml.safe_load(f)

    @property
    def stack_name(self) -> str:
        return f"BandmanagerApi{self.stage.title()}"

    @property
    def resource_prefix(self) -> str:
        return f"bandmanager-{self.stage}"
