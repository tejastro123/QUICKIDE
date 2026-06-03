from abc import ABC, abstractmethod

class StorageProvider(ABC):
    @abstractmethod
    def put(self, key: str, data: bytes, content_type: str = "image/png") -> str:
        """Store the data and return a local path, URL, or key."""
        pass

    @abstractmethod
    def get(self, key: str) -> bytes:
        """Retrieve the data bytes by key."""
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Check if the data exists for the given key."""
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        """Delete the data for the given key."""
        pass
