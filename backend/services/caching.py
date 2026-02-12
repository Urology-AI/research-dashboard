"""
Caching service for performance optimization
Simple in-memory cache (can be replaced with Redis)
"""
from typing import Any, Optional
from datetime import datetime, timedelta
import json
import hashlib


def _is_serializable(obj: Any) -> bool:
    """
    Check if an object is JSON serializable
    """
    try:
        json.dumps(obj)
        return True
    except (TypeError, ValueError):
        return False


def _filter_serializable(args: tuple, kwargs: dict) -> tuple:
    """
    Filter out non-serializable objects from args and kwargs
    """
    # Filter args - exclude Session objects and other non-serializable types
    filtered_args = []
    for arg in args:
        # Skip SQLAlchemy Session objects and other common non-serializable types
        if hasattr(arg, '__class__'):
            class_name = arg.__class__.__name__
            # Skip Session objects and other database-related objects
            if class_name in ('Session', 'scoped_session', 'AsyncSession'):
                continue
        # Only include if serializable
        if _is_serializable(arg):
            filtered_args.append(arg)
        else:
            # For non-serializable objects, use their string representation
            filtered_args.append(f"<{type(arg).__name__}>")
    
    # Filter kwargs similarly
    filtered_kwargs = {}
    for key, value in kwargs.items():
        if hasattr(value, '__class__'):
            class_name = value.__class__.__name__
            if class_name in ('Session', 'scoped_session', 'AsyncSession'):
                continue
        if _is_serializable(value):
            filtered_kwargs[key] = value
        else:
            filtered_kwargs[key] = f"<{type(value).__name__}>"
    
    return tuple(filtered_args), filtered_kwargs


# Simple in-memory cache
_cache = {}
_cache_timestamps = {}


def get_cache_key(*args, **kwargs) -> str:
    """
    Generate a cache key from arguments
    Filters out non-serializable objects like database sessions
    """
    # Filter out non-serializable objects (like Session)
    filtered_args, filtered_kwargs = _filter_serializable(args, kwargs)
    key_data = json.dumps({'args': filtered_args, 'kwargs': filtered_kwargs}, sort_keys=True)
    return hashlib.md5(key_data.encode()).hexdigest()


def get_cached(key: str, ttl: int = 300) -> Optional[Any]:
    """
    Get value from cache if it exists and hasn't expired
    ttl: Time to live in seconds (default 5 minutes)
    """
    if key not in _cache:
        return None
    
    # Check if expired
    if key in _cache_timestamps:
        age = (datetime.now() - _cache_timestamps[key]).total_seconds()
        if age > ttl:
            # Expired, remove from cache
            del _cache[key]
            del _cache_timestamps[key]
            return None
    
    return _cache[key]


def set_cached(key: str, value: Any) -> None:
    """
    Store value in cache
    """
    _cache[key] = value
    _cache_timestamps[key] = datetime.now()


def clear_cache(pattern: Optional[str] = None) -> int:
    """
    Clear cache entries
    If pattern is provided, only clear keys matching the pattern
    Returns number of entries cleared
    """
    if pattern is None:
        count = len(_cache)
        _cache.clear()
        _cache_timestamps.clear()
        return count
    
    # Clear matching keys
    keys_to_remove = [k for k in _cache.keys() if pattern in k]
    for key in keys_to_remove:
        del _cache[key]
        if key in _cache_timestamps:
            del _cache_timestamps[key]
    
    return len(keys_to_remove)


def cache_decorator(ttl: int = 300):
    """
    Decorator to cache function results
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            cache_key = get_cache_key(func.__name__, *args, **kwargs)
            cached_result = get_cached(cache_key, ttl)
            
            if cached_result is not None:
                return cached_result
            
            # Call function and cache result
            result = func(*args, **kwargs)
            set_cached(cache_key, result)
            return result
        
        return wrapper
    return decorator
