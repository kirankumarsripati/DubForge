"""Tests for DubForge Python workspace."""

from workers import __version__ as workers_version


def test_workers_version() -> None:
    """Workers package exposes a version string."""
    assert workers_version == "0.1.0"
