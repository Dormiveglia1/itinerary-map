"""Errors returned to the client as {"error": code, "message": text} (Data Contract v0.1)."""


class APIError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


class GoogleAPIError(APIError):
    """Google Places/Routes unavailable or returned an error -> HTTP 502."""

    def __init__(self, code: str, message: str):
        super().__init__(502, code, message)
