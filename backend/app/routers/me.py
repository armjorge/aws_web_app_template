from typing import Any

from fastapi import APIRouter, Request

router = APIRouter(tags=["me"])


@router.get("/me")
def me(request: Request) -> dict[str, Any]:
    """
    Sample protected route.

    When Cognito JWT auth is enabled on API Gateway, claims are available under
    request.scope["aws.event"]["requestContext"]["authorizer"]["jwt"]["claims"].
    Locally (uvicorn), this returns a stub payload.
    """
    event = request.scope.get("aws.event") or {}
    claims = (
        event.get("requestContext", {})
        .get("authorizer", {})
        .get("jwt", {})
        .get("claims", {})
    )

    if claims:
        return {
            "authenticated": True,
            "sub": claims.get("sub"),
            "email": claims.get("email"),
        }

    return {
        "authenticated": False,
        "message": "No Cognito claims present (expected when running locally).",
    }
