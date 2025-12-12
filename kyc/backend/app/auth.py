from fastapi import Header, HTTPException, status


async def verify_api_key(x_api_key: str = Header(None)):
    # Placeholder simple API key check; replace with proper auth if needed.
    if not x_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing API key")
    return True
