"""Pydantic schemas for structured agent outputs."""

from pydantic import BaseModel, Field
from typing import List


# ProfileCard schemas (for DisplayMortal and DisplayMatch)
class Origin(BaseModel):
    city: str
    state: str
    country: str


class AstrologicalNotes(BaseModel):
    sun_sign: str
    moon_sign: str
    venus_sign: str
    mars_sign: str


class ProfileCardOutput(BaseModel):
    """Output schema for DisplayMortal and DisplayMatch agents."""
    name: str
    age: float
    occupation: str
    location: str
    birthdate: str
    origin: Origin
    astrological_notes: AstrologicalNotes


# Continue Card schema
class ContinueCardOutput(BaseModel):
    """Output schema for DisplayContinueCard agent."""
    confirmation_message: str


# Choice list schema
class ChoiceItem(BaseModel):
    key: str
    title: str


class ChoicesOutput(BaseModel):
    """Output schema for DisplayChoices agent."""
    items: List[ChoiceItem]


# Compatibility Analysis schema
class CompatibilityItem(BaseModel):
    id: str
    leftEmoji: str
    leftZodiac: str
    rightZodiac: str
    rightEmoji: str
    percent: float
    color: str


class CompatibilityCardOutput(BaseModel):
    """Output schema for DisplayCompatibilityCard agent."""
    title: str
    subtitle: str
    overall: float
    items: List[CompatibilityItem]


# Game Dashboard (Compatibility Snapshot) schema
class Scene(BaseModel):
    number: float
    name: str


class Delta(BaseModel):
    value: float
    direction: str


class Bar(BaseModel):
    label: str
    percent: float
    color: str


class Pill(BaseModel):
    id: str
    icon: str
    value: float


class GameDashboardOutput(BaseModel):
    """Output schema for GameDashboard agent."""
    scene: Scene
    compatibility: float
    delta: Delta
    bars: List[Bar]
    pills: List[Pill]


# Evaluate Scene Score schema
class SceneScoreOutput(BaseModel):
    """Output schema for EvaluateSceneScore agent."""
    score: str
    reasoning: str
    current_compatibility: str = Field(alias="current-compatibility")

    class Config:
        populate_by_name = True


# Has Ended schema
class HasEndedOutput(BaseModel):
    """Output schema for HasEnded agent."""
    has_ended: bool
