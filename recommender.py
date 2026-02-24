"""
Glass recommendation engine that accounts for face shape and age demographics.

Age groups are defined as:
  - child      : age 0-12
  - teen       : age 13-17
  - young_adult: age 18-35
  - adult      : age 36-59
  - senior     : age 60+

Face shapes supported: oval, round, square, heart, oblong, diamond, triangle
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

# ---------------------------------------------------------------------------
# Age-group helpers
# ---------------------------------------------------------------------------

AGE_GROUPS = {
    "child": (0, 12),
    "teen": (13, 17),
    "young_adult": (18, 35),
    "adult": (36, 59),
    "senior": (60, 150),
}


def classify_age_group(age: int) -> str:
    """Return the age-group label for a given age."""
    if age < 0:
        raise ValueError(f"Age must be non-negative, got {age}")
    for group, (lo, hi) in AGE_GROUPS.items():
        if lo <= age <= hi:
            return group
    raise ValueError(f"Could not classify age {age}")


# ---------------------------------------------------------------------------
# Recommendation data
# ---------------------------------------------------------------------------

# Base frame styles recommended for each face shape (age-agnostic starting point)
_FACE_SHAPE_FRAMES: dict[str, List[str]] = {
    "oval": ["aviator", "wayfarer", "round", "cat-eye", "geometric"],
    "round": ["rectangular", "square", "geometric", "browline", "wayfarer"],
    "square": ["round", "oval", "rimless", "cat-eye", "aviator"],
    "heart": ["aviator", "round", "rimless", "light-colored frames"],
    "oblong": ["tall frames", "decorative temples", "round", "square"],
    "diamond": ["cat-eye", "oval", "rimless browline"],
    "triangle": ["top-heavy frames", "browline", "cat-eye", "aviator"],
}

# Age-group modifiers: frames to *prefer* and frames to *avoid*
_AGE_GROUP_MODIFIERS: dict[str, dict] = {
    "child": {
        "prefer": ["flexible frames", "small fit", "rubber nose pads", "polycarbonate lenses"],
        "avoid": ["rimless", "large frames", "heavy metal frames"],
        "fit_notes": "Small/petite fit; lightweight and durable materials are essential.",
    },
    "teen": {
        "prefer": ["trendy styles", "sporty frames", "medium fit"],
        "avoid": ["very large oversized frames"],
        "fit_notes": "Medium fit; style-conscious options work well.",
    },
    "young_adult": {
        "prefer": ["fashion-forward", "bold colors", "geometric", "large fit"],
        "avoid": [],
        "fit_notes": "Standard adult fit; wide variety of styles suitable.",
    },
    "adult": {
        "prefer": ["classic styles", "professional frames", "progressive-lens ready"],
        "avoid": [],
        "fit_notes": "Standard to wide fit; consider progressive-lens compatibility.",
    },
    "senior": {
        "prefer": [
            "progressive-lens ready",
            "lightweight frames",
            "wide fit",
            "high nose bridge",
            "spring hinges",
        ],
        "avoid": ["very small frames", "heavy frames"],
        "fit_notes": (
            "Wide fit with spring hinges; frames should accommodate progressive or "
            "bifocal lenses. Lightweight materials (titanium, memory metal) reduce fatigue."
        ),
    },
}


# ---------------------------------------------------------------------------
# Recommendation result
# ---------------------------------------------------------------------------


@dataclass
class GlassRecommendation:
    face_shape: str
    age: int
    age_group: str
    recommended_frames: List[str]
    preferred_features: List[str]
    frames_to_avoid: List[str]
    fit_notes: str
    lens_suggestions: List[str] = field(default_factory=list)

    def summary(self) -> str:
        lines = [
            f"Face shape  : {self.face_shape}",
            f"Age         : {self.age} ({self.age_group})",
            f"Frames      : {', '.join(self.recommended_frames)}",
            f"Features    : {', '.join(self.preferred_features)}",
        ]
        if self.frames_to_avoid:
            lines.append(f"Avoid       : {', '.join(self.frames_to_avoid)}")
        if self.lens_suggestions:
            lines.append(f"Lenses      : {', '.join(self.lens_suggestions)}")
        lines.append(f"Fit notes   : {self.fit_notes}")
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Lens suggestions by age group
# ---------------------------------------------------------------------------

_AGE_LENS_SUGGESTIONS: dict[str, List[str]] = {
    "child": ["polycarbonate lenses", "anti-scratch coating", "UV400 protection"],
    "teen": ["polycarbonate lenses", "anti-reflective coating", "UV400 protection"],
    "young_adult": ["single-vision", "anti-reflective coating", "blue-light filter"],
    "adult": [
        "progressive lenses",
        "anti-reflective coating",
        "blue-light filter",
        "UV400 protection",
    ],
    "senior": [
        "progressive or bifocal lenses",
        "anti-reflective coating",
        "photochromic option",
        "UV400 protection",
        "high-index lenses to reduce weight",
    ],
}


# ---------------------------------------------------------------------------
# Core recommendation function
# ---------------------------------------------------------------------------


def recommend_glasses(face_shape: str, age: int) -> GlassRecommendation:
    """Return a GlassRecommendation for the given face shape and age.

    Parameters
    ----------
    face_shape:
        One of: oval, round, square, heart, oblong, diamond, triangle.
        Case-insensitive.
    age:
        Integer age of the individual (0–150).

    Returns
    -------
    GlassRecommendation
        Dataclass with recommended frames, features, fit notes, and lens
        suggestions tailored to both face shape and age group.
    """
    face_shape = face_shape.strip().lower()
    if face_shape not in _FACE_SHAPE_FRAMES:
        raise ValueError(
            f"Unknown face shape '{face_shape}'. "
            f"Supported shapes: {list(_FACE_SHAPE_FRAMES.keys())}"
        )

    age_group = classify_age_group(age)
    base_frames = _FACE_SHAPE_FRAMES[face_shape]
    modifiers = _AGE_GROUP_MODIFIERS[age_group]

    # Filter out frames that are discouraged for this age group
    frames_to_avoid = modifiers["avoid"]
    recommended = [f for f in base_frames if f not in frames_to_avoid]

    return GlassRecommendation(
        face_shape=face_shape,
        age=age,
        age_group=age_group,
        recommended_frames=recommended,
        preferred_features=modifiers["prefer"],
        frames_to_avoid=frames_to_avoid,
        fit_notes=modifiers["fit_notes"],
        lens_suggestions=_AGE_LENS_SUGGESTIONS.get(age_group, []),
    )
