import os
from compiler_api.storage.base import StorageProvider

class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: str = None):
        if base_dir is None:
            # Default to compiler_api/cache
            base_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_path(self, key: str) -> str:
        # Prevent directory traversal attacks
        filename = os.path.basename(key)
        return os.path.join(self.base_dir, filename)

    def put(self, key: str, data: bytes, content_type: str = "image/png") -> str:
        filepath = self._get_path(key)
        with open(filepath, "wb") as f:
            f.write(data)
        return filepath

    def get(self, key: str) -> bytes:
        filepath = self._get_path(key)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Key '{key}' not found in local storage.")
        with open(filepath, "rb") as f:
            return f.read()

    def exists(self, key: str) -> bool:
        filepath = self._get_path(key)
        return os.path.exists(filepath)

    def delete(self, key: str) -> None:
        filepath = self._get_path(key)
        if os.path.exists(filepath):
            os.remove(filepath)
