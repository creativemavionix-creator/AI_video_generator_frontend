from fastapi import FastAPI, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import threading
import uuid
import os
import time
from database import (
    engine,
    create_db_and_tables, 
    get_session, 
    GenerationJob, 
    GenerationJobUpdate,
    create_job_in_db,
    get_job_from_db,
    list_jobs_from_db,
    list_completed_gallery_jobs_from_db,
    update_job_in_db,
    delete_job_in_db
)
from AI_generator import run_demo_generation
from ai_workflow import workflow_app
from auth import get_current_user
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MaVionix AI Video Generator API", version="0.1.0")

@app.on_event("startup")
def on_startup():
    # Initialize the SQLite database on server start
    create_db_and_tables()


allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateVideoRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=3,
        description="Primary text prompt describing the video the user wants to generate.",
    )
    negative_prompt: Optional[str] = Field(
        default=None,
        description="Optional text describing elements that should be avoided in the generated video.",
    )
    style_category: str = Field(
        default="All",
        description="High-level grouping used to filter and organize available generation styles.",
    )
    style_id: str = Field(
        default="cinematic",
        description="Stable internal identifier for the selected style preset.",
    )
    style: str = Field(
        default="Cinematic",
        description="Human-readable name of the selected style preset.",
    )
    color_grade: str = Field(
        default="cinematic",
        description="Color grading preset used to influence the overall look and mood.",
    )
    model: str = Field(
        default="MaVionix Motion v2",
        description="Video generation model selected for this request.",
    )
    duration: str = Field(
        default="0:15",
        description="Target video duration expressed as a short time label.",
    )
    resolution: str = Field(
        default="1080p",
        description="Output resolution requested for the generated video.",
    )
    ratio: str = Field(
        default="16:9",
        description="Aspect ratio of the output video.",
    )
    frame_rate: str = Field(
        default="30 fps",
        description="Desired playback frame rate for the rendered video.",
    )
    camera_movement: str = Field(
        default="Static",
        description="Camera motion preset that shapes how the shot moves over time.",
    )
    animation_style: str = Field(
        default="Realistic Motion",
        description="Animation style that controls the movement behavior of subjects and scenes.",
    )
    lighting: str = Field(
        default="Natural",
        description="Lighting preset used to guide the scene illumination.",
    )
    background: str = Field(
        default="Auto",
        description="Background selection mode or preset for the generated scene.",
    )
    motion_strength: int = Field(
        default=55,
        ge=0,
        le=100,
        description="Strength of motion in the generated clip, from low to high.",
    )
    creativity: int = Field(
        default=60,
        ge=0,
        le=100,
        description="How creatively the model should deviate from the literal prompt.",
    )
    character_consistency: bool = Field(
        default=True,
        description="Whether the generator should try to keep character appearance consistent across frames.",
    )
    seed: Optional[int] = Field(
        default=None,
        description="Optional random seed used to make results more reproducible.",
    )

def run_video_generation_workflow(job_id: str,user_id : str,initial_state: str):
    """
    Executes the LangGraph workflow in the background.
    Creates its own database session to ensure the connection stays open.
    """
    print(f"Starting background workflow for Job ID: {job_id}")
    
    # 1. Create a fresh database session specifically for this background thread
    with Session(engine) as session:
        try:
            config = {
                "run_name": f"AI_Job_{job_id}",
                "configurable": {
                    "db_session": session,
                    "user_id": user_id,       # <--- Pass user_id here
                },
                "metadata": {
                    "job_id": job_id,
                    "user_id": user_id,       # <--- Pass user_id here
                }
            }

            # 4. RUN THE GRAPH
            workflow_app.invoke(initial_state, config=config)
            
            print(f"Workflow {job_id} completed successfully.")
            
        except Exception as e:
            
            error_msg = f"Workflow failed: {str(e)}"
            print(error_msg)

            update_job_in_db(
                session=session, 
                job_id=job_id, 
                job_update=GenerationJobUpdate(status="Failed", error=error_msg)
            )

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "maVionix-ai-video-generator"}

@app.get("/")
def first_page():
    return {"status": "ok", "service": "maVionix-ai-video-generator"}


# @app.get("/templates")
# def get_templates():
#     return [
#         {"id": "product-launch", "label": "Product Launch Ad", "prompt": "A sleek 15-second product advertisement, studio lighting, slow orbit camera, premium commercial feel"},
#         {"id": "instagram-reel", "label": "Instagram Reel", "prompt": "A fast-paced vertical social media reel with bold text overlays and trending transitions"},
#         {"id": "cinematic-trailer", "label": "Cinematic Trailer", "prompt": "An epic cinematic trailer sequence, dramatic lighting, slow motion, orchestral mood"},
#     ]


@app.post("/generate", response_model=GenerationJob)
def generate_video(
    payload: GenerateVideoRequest, 
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    job_id = str(uuid.uuid4())
    job = GenerationJob(
        id=job_id,
        user_id=current_user["user_id"],
        status="queued",
        prompt=payload.prompt,
        negative_prompt=payload.negative_prompt,
        style_category=payload.style_category,
        style_id=payload.style_id,
        style=payload.style,
        color_grade=payload.color_grade,
        model=payload.model,
        duration=payload.duration,
        resolution=payload.resolution,
        ratio=payload.ratio,
        frame_rate=payload.frame_rate,
        camera_movement=payload.camera_movement,
        animation_style=payload.animation_style,
        lighting=payload.lighting,
        background=payload.background,
        motion_strength=payload.motion_strength,
        creativity=payload.creativity,
        character_consistency=payload.character_consistency,
        seed=payload.seed,
        created_at=time.time(),
        progress=0,
    )

    try:
        saved_job = create_job_in_db(session=session, job=job)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create job: {e}")

    initial_state= {
                "job_id": job_id,
                "upd_prompt": payload.prompt,
                "upd_negative_prompt":payload.negative_prompt,
                "duration": 5,            
                "resolution": "480p", 
                "ratio": "16:9",
                "frame_rate": 24,
            }
    
    worker_thread = threading.Thread(
        target=run_video_generation_workflow,
        args=(job_id,current_user["user_id"],initial_state),
        daemon=True,
    )
    worker_thread.start()

    return saved_job



# ==========================================
# 1. CREATE a Job
# ==========================================
@app.post("/jobs/", response_model=GenerationJob)
def create_job(
    job: GenerationJob, 
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """
    Creates a new video generation job. 
    Overrides user_id with the authenticated user ID.
    """
    job.user_id = current_user["user_id"]
    return create_job_in_db(session=session, job=job)

# ==========================================
# 2. READ Completed Gallery Jobs
# ==========================================
@app.get(
    "/jobs/gallery",
    response_model=List[GenerationJob],
    summary="List completed video jobs for the Gallery",
    description="Fetches completed video jobs belonging to the authenticated user."
)
def list_gallery_jobs(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    return list_completed_gallery_jobs_from_db(
        session=session, 
        user_id=current_user["user_id"], 
        offset=offset, 
        limit=limit
    )

# ==========================================
# 3. READ a specific Job by ID
# ==========================================
@app.get("/jobs/{job_id}", response_model=GenerationJob)
def get_job(
    job_id: str, 
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    """Fetches a specific job by its unique ID, verifying ownership."""
    job = get_job_from_db(session=session, job_id=job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied: You do not own this video job")
    return job

# ==========================================
# 3. READ all Jobs (List / Dashboard View)
# ==========================================
@app.get(
    "/jobs/", 
    response_model=List[GenerationJob],
    summary="List all video generation jobs",
    description="Fetches a paginated list of video generation jobs belonging to the authenticated user."
)
def list_jobs(
    offset: int = Query(default=0, ge=0, description="The number of jobs to skip before returning results."), 
    limit: int = Query(default=20, ge=1, le=100, description="The maximum number of jobs to return."), 
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    return list_jobs_from_db(
        session=session, 
        user_id=current_user["user_id"], 
        offset=offset, 
        limit=limit
    )

# ==========================================
# 4. UPDATE a Job
# ==========================================
@app.patch("/jobs/{job_id}", response_model=GenerationJob)
def update_job(
    job_id: str, 
    job_update: GenerationJobUpdate, 
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    db_job = get_job_from_db(session=session, job_id=job_id)
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if db_job.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied: You do not own this video job")
    
    updated_job = update_job_in_db(session=session, job_id=job_id, job_update=job_update)
    return updated_job

# ==========================================
# 5. DELETE a Job
# ==========================================
@app.delete("/jobs/{job_id}")
def delete_job(
    job_id: str, 
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user)
):
    db_job = get_job_from_db(session=session, job_id=job_id)
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if db_job.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied: You do not own this video job")
        
    success = delete_job_in_db(session=session, job_id=job_id)
    return {"ok": True, "message": f"Job {job_id} deleted successfully."}
