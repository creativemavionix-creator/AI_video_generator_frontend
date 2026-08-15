from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
import os
import re
from dotenv import load_dotenv

load_dotenv()

security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    FastAPI dependency that extracts and validates the Supabase JWT Bearer token.
    Supports both symmetric HS256 secret verification and asymmetric RS256/ES256 JWKS key verification.
    Returns a dictionary containing 'user_id' and 'email'.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer token in Authorization header."
        )

    token = credentials.credentials
    secret = os.getenv("SUPABASE_JWT_SECRET")
    
    # Resolve Supabase base URL for JWKS public key fetching
    raw_supabase_url = os.getenv("VITE_SUPABASE_URL", "")
    supabase_url = re.sub(r'/rest/v1/?$', '', raw_supabase_url).strip()

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET is not configured on the backend server."
        )

    try:
        # 1. Read token header to inspect the signing algorithm
        header = jwt.get_unverified_header(token)
        token_alg = header.get("alg", "HS256")

        # 2. Branch decoding based on algorithm type
        if token_alg == "HS256":
            # Symmetric HS256 verification using SUPABASE_JWT_SECRET
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
        else:
            # Asymmetric RS256 / ES256 verification using Supabase's public JWKS endpoint
            if not supabase_url:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="VITE_SUPABASE_URL is required for asymmetric RS256/ES256 token verification."
                )
            jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            jwks_client = PyJWKClient(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                options={"verify_aud": False}
            )

        user_id: str = payload.get("sub")
        email: str = payload.get("email", "")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token: missing user identifier ('sub')."
            )

        return {"user_id": str(user_id), "email": email}

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired. Please log in again."
        )
    except (jwt.PyJWTError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or untrusted authentication token signature: {str(e)}"
        )
