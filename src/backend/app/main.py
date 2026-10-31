"""Itinerary Map backend (FastAPI).

Run from src/backend:   uvicorn app.main:app --reload
Interactive docs:       http://localhost:8000/docs
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config
from .errors import APIError
from .routes import router

app = FastAPI(title="Itinerary Map API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(APIError)
async def api_error_handler(_: Request, exc: APIError):
    return JSONResponse(status_code=exc.status, content={"error": exc.code, "message": exc.message})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    """Contract: invalid input -> HTTP 400 {"error", "message"} (FastAPI's default is 422)."""
    first = exc.errors()[0] if exc.errors() else {}
    where = ".".join(str(x) for x in first.get("loc", []) if x not in ("body", "query"))
    msg = first.get("msg", "Invalid input").removeprefix("Value error, ")
    return JSONResponse(status_code=400,
                        content={"error": "invalid_input", "message": f"{where}: {msg}" if where else msg})


ERROR_SCHEMA = {
    "type": "object",
    "properties": {"error": {"type": "string"}, "message": {"type": "string"}},
    "required": ["error", "message"],
}
ERROR_RESPONSES = {
    "400": "Invalid input",
    "502": "Google Maps unavailable or returned an error",
    "500": "Server misconfigured or optimizer returned the wrong shape",
}


def custom_openapi():
    """Show the contract's real error responses (400/502/500) in /docs instead of FastAPI's 422."""
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi

    schema = get_openapi(title=app.title, version=app.version, routes=app.routes)
    for path, methods in schema["paths"].items():
        if not path.startswith("/api/"):
            continue
        for op in methods.values():
            op["responses"].pop("422", None)
            for code, desc in ERROR_RESPONSES.items():
                op["responses"][code] = {
                    "description": desc,
                    "content": {"application/json": {"schema": ERROR_SCHEMA}},
                }
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(router)
