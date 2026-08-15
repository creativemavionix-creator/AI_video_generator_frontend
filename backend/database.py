import time
import uuid
from typing import Optional
from pathlib import Path
from sqlmodel import SQLModel, Field, create_engine, Session, select
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# 1. Define the Database Table Schema
# ==========================================
class GenerationJob(SQLModel, table=True):
    """
    SQLModel table definition for a video generation job.
    Inherits from SQLModel and sets table=True to map it to SQLite.
    """
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), 
        primary_key=True,
        description="Unique identifier assigned to the generation job."
    )
    user_id: str = Field(
        index=True,
        description="Supabase User UUID owning this record."
    )
    status: str = Field(
        default="queued",
        description="Current lifecycle state of the job, such as queued, running, completed, or failed."
    )
    prompt: str = Field(
        description="Primary text prompt describing the video the user wants to generate."
    )
    negative_prompt: Optional[str] = Field(
        default=None,
        description="Optional text describing elements that should be avoided in the generated video."
    )
    style_category: str = Field(
        description="High-level grouping used to filter and organize available generation styles."
    )
    style_id: str = Field(
        description="Stable internal identifier for the selected style preset."
    )
    style: str = Field(
        description="Human-readable name of the selected style preset."
    )
    color_grade: str = Field(
        description="Color grading preset used to influence the overall look and mood."
    )
    model: str = Field(
        description="Video generation model selected for this request."
    )
    duration: str = Field(
        description="Target video duration expressed as a short time label."
    )
    resolution: str = Field(
        description="Output resolution requested for the generated video."
    )
    ratio: str = Field(
        description="Aspect ratio of the output video."
    )
    frame_rate: str = Field(
        description="Desired playback frame rate for the rendered video."
    )
    camera_movement: str = Field(
        description="Camera motion preset that shapes how the shot moves over time."
    )
    animation_style: str = Field(
        description="Animation style that controls the movement behavior of subjects and scenes."
    )
    lighting: str = Field(
        description="Lighting preset used to guide the scene illumination."
    )
    background: str = Field(
        description="Background selection mode or preset for the generated scene."
    )
    motion_strength: int = Field(
        ge=0, le=100,
        description="Strength of motion in the generated clip, from low to high."
    )
    creativity: int = Field(
        ge=0, le=100,
        description="How creatively the model should deviate from the literal prompt."
    )
    character_consistency: bool = Field(
        description="Whether the generator should try to keep character appearance consistent across frames."
    )
    seed: Optional[int] = Field(
        default=None,
        description="Optional random seed used to make results more reproducible."
    )
    created_at: float = Field(
        default_factory=time.time,
        description="Unix timestamp indicating when the job was created."
    )
    progress: int = Field(
        default=0,
        description="Progress percentage or progress value reported for the job."
    )
    video_url: Optional[str] = Field(
        default=None,
        description="URL of the generated video once the job completes successfully."
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message captured when job processing fails."
    )

# ==========================================
# 2. Update Model (For PATCH requests)
# ==========================================
# In production, you don't want users sending the ENTIRE job object just to update 'progress' to 50%.
# This model allows updating only specific fields.
class GenerationJobUpdate(SQLModel):
    status: Optional[str] = None
    progress: Optional[int] = None
    video_url: Optional[str] = None
    error: Optional[str] = None


# ==========================================
# 3. Database Connection Setup
# ==========================================
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to local SQLite if DATABASE_URL is not set in .env
    DB_DIR = Path("./database_store")
    DB_DIR.mkdir(parents=True, exist_ok=True)
    DATABASE_URL = f"sqlite:///{DB_DIR / 'jobs_database.db'}"

# Create database engine (supports PostgreSQL and SQLite fallback)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

def create_db_and_tables():
    """Creates database tables in PostgreSQL / database target."""
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# ==========================================
# 1. CREATE
# ==========================================
def create_job_in_db(session: Session, job: GenerationJob) -> GenerationJob:
    session.add(job)
    session.commit()
    session.refresh(job)
    return job

# ==========================================
# 2. READ (Single)
# ==========================================
def get_job_from_db(session: Session, job_id: str) -> Optional[GenerationJob]:
    return session.get(GenerationJob, job_id)

# ==========================================
# 3. READ (List)
# ==========================================
def list_jobs_from_db(session: Session, user_id: str, offset: int = 0, limit: int = 20) -> List[GenerationJob]:
    if not user_id:
        return []
    statement = (
        select(GenerationJob)
        .where(GenerationJob.user_id == user_id)
        .order_by(GenerationJob.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return session.exec(statement).all()

def list_completed_gallery_jobs_from_db(session: Session, user_id: str, offset: int = 0, limit: int = 50) -> List[GenerationJob]:
    if not user_id:
        return []
    statement = (
        select(GenerationJob)
        .where(
            GenerationJob.user_id == user_id,
            GenerationJob.status.in_(["Completed", "completed"]),
            GenerationJob.video_url != None,
            GenerationJob.video_url != ""
        )
        .order_by(GenerationJob.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return session.exec(statement).all()

# ==========================================
# 4. UPDATE
# ==========================================
def update_job_in_db(session: Session, job_id: str, job_update: GenerationJobUpdate) -> Optional[GenerationJob]:
    db_job = session.get(GenerationJob, job_id)
    if not db_job:
        return None  # Return None if not found, let the API handle the error
    
    # Extract only the fields that were actually provided
    update_data = job_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_job, key, value)
        
    session.add(db_job)
    session.commit()
    session.refresh(db_job)
    return db_job

# ==========================================
# 5. DELETE
# ==========================================
def delete_job_in_db(session: Session, job_id: str) -> bool:
    job = session.get(GenerationJob, job_id)
    if not job:
        return False # Return False if there was nothing to delete
        
    session.delete(job)
    session.commit()
    return True