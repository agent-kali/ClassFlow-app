"""
Error bodies for the shapes docs/api-contract.md defines: 404 `not_found` and
422 `unprocessable_entity`. FastAPI's default `{"detail": ...}` body does not
match the contract, so the two handlers below reshape it.
"""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Request-body field names, as they appear in src/domain/types.ts.
_WIRE_FIELDS = {
    "date",
    "startMin",
    "endMin",
    "classGroupId",
    "roomId",
    "teacherId",
    "cmName",
    "curriculum",
    "weekCode",
    "status",
    "movedFrom",
    "id",
}


class NotFoundError(Exception):
    """A mutation targeted a resource id that does not exist."""

    def __init__(self, resource: str, id: str) -> None:
        self.resource = resource
        self.id = id
        super().__init__(f"{resource} not found: {id}")


class UnprocessableError(Exception):
    """
    A request is well-formed JSON but not acceptable: a referenced id does not
    exist, or `endMin <= startMin` once a patch is merged with the stored row.
    """

    def __init__(self, message: str, field: str | None = None) -> None:
        self.message = message
        self.field = field
        super().__init__(message)


def not_found_body(resource: str, id: str) -> dict[str, Any]:
    return {
        "status": 404,
        "code": "not_found",
        "message": f"{resource} not found.",
        "resource": resource,
        "id": id,
    }


def unprocessable_body(message: str, field: str | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {
        "status": 422,
        "code": "unprocessable_entity",
        "message": message,
    }
    if field is not None:
        body["field"] = field
    return body


def _field_from_location(location: tuple[Any, ...]) -> str | None:
    """The contract carries `field` only when the error is tied to one field."""
    for part in reversed(location):
        if isinstance(part, str) and part in _WIRE_FIELDS:
            return part
    return None


def _message_from_validation_error(error: dict[str, Any]) -> str:
    message = str(error.get("msg", "Request body is invalid."))
    # Pydantic prefixes messages raised from validators.
    return message.removeprefix("Value error, ")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def handle_not_found(_: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content=not_found_body(exc.resource, exc.id))

    @app.exception_handler(UnprocessableError)
    async def handle_unprocessable(_: Request, exc: UnprocessableError) -> JSONResponse:
        return JSONResponse(
            status_code=422, content=unprocessable_body(exc.message, exc.field)
        )

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        errors = exc.errors()
        first = errors[0] if errors else {}
        return JSONResponse(
            status_code=422,
            content=unprocessable_body(
                _message_from_validation_error(first),
                _field_from_location(tuple(first.get("loc", ()))),
            ),
        )
