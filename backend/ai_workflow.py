import os
import base64
import io
import json
import time
import subprocess
import requests
from typing import TypedDict, List, Optional, Any
from langgraph.graph import StateGraph, START, END
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from magic_hour import Client
from google import genai
from google.genai import types
from elevenlabs.client import ElevenLabs
from sync import Sync
from sync.common import Audio, Video, GenerationOptions
from sync.core.api_error import ApiError
from pydub import AudioSegment
from langchain_core.runnables.config import RunnableConfig
from langsmith import traceable
from database import GenerationJob,GenerationJobUpdate,get_job_from_db,update_job_in_db
from cloudinary_cloud import upload_video,get_video_url,delete_video

load_dotenv()


class EnhancedPromptOutput(BaseModel):
    updated_prompt: str = Field(
        description="Detailed, vivid text-to-video prompt incorporating lighting, camera motion, style, color grade, and subject dynamics without buzzwords."
    )
    updated_negative_prompt: str = Field(
        description="Comprehensive negative prompt avoiding temporal artifacts, morphing, bad anatomy, text, low resolution, and unnatural movement."
    )
    speech: str = Field(
        description="Character dialogue for Text-To-Speech (TTS). Return an empty string '' if no dialogue is spoken."
    )
    is_speech_present: bool = Field(
        description="Indicates whether the video contains spoken dialogue. True if speech is present, False otherwise."
    )
    sfx_audio_prompt: List[str] = Field(
        description="List of prompts for text-to-audio/SFX model describing ambient sounds, background noise, or environmental sound effects."
    )
    is_sfx_audio_present: bool = Field(
        description="Indicates whether the video contains sound effects. True if SFX are present, False otherwise."
    )

  
class EventOccurrence(BaseModel):
    sfx_prompt: str = Field(description="A highly descriptive prompt optimized for AI text-to-audio generation.")
    start_time_mmss: str = Field(description="Start time in MM:SS format")
    end_time_mmss: str = Field(description="End time in MM:SS format")

    @property
    def start_time_seconds(self) -> float:
        return self._convert_mmss_to_seconds(self.start_time_mmss)

    @property
    def end_time_seconds(self) -> float:
        return self._convert_mmss_to_seconds(self.end_time_mmss)
        
    @property
    def duration_seconds(self) -> float:
        duration = self.end_time_seconds - self.start_time_seconds
        # Fallback for instantaneous events (Gemini 1fps limitation)
        return duration if duration > 0 else 0.5

    def _convert_mmss_to_seconds(self, time_str: str) -> float:
        try:
            parts = time_str.split(":")
            if len(parts) == 2:
                return float(int(parts[0]) * 60 + int(parts[1]))
            elif len(parts) == 3:
                return float(int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2]))
            return float(time_str)
        except Exception:
            return 0.0

class VideoGroundingResult(BaseModel):
    events: list[EventOccurrence] = Field(description="List of detected events")
    speech_start_time: str = Field(description="Start time at which person appear to say something or start talking on screen,it should be in MM:SS format") 
    speech_end_time: str = Field(description="End time at which person stop talking on screen,it should be in MM:SS format")
    refined_speech: str = Field(description="Refined speech prompt that fits the video context and timing, preserving original meaning and emotion.")

    @property
    def speech_start_time_seconds(self) -> float:
        return self._convert_speech_mmss_to_seconds(self.speech_start_time)

    @property
    def speech_end_time_seconds(self) -> float:
        return self._convert_speech_mmss_to_seconds(self.speech_end_time)
        

    def _convert_speech_mmss_to_seconds(self, time_str: str) -> float:
        try:
            parts = time_str.split(":")
            if len(parts) == 2:
                return float(int(parts[0]) * 60 + int(parts[1]))
            elif len(parts) == 3:
                return float(int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2]))
            return float(time_str)
        except Exception:
            return 0.0

@traceable(name="generate_sfx")
def generate_sfx(event: EventOccurrence, el_client: ElevenLabs, output_dir: str,value : str) -> str:
    """Generates an SFX file via ElevenLabs API, respecting the 0.5s minimum."""
    print(f"Generating SFX for: {event.sfx_prompt}")
    
    # ElevenLabs API requires minimum 0.5 seconds
    api_duration = max(event.duration_seconds, 0.5)
    
    result = el_client.text_to_sound_effects.convert(
        text=event.sfx_prompt,
        duration_seconds=api_duration,
        prompt_influence=0.3,
    )
    
    output_path = os.path.join(output_dir, f"sfx_audio_{value}.mp3")
    
    with open(output_path, "wb") as f:
        for chunk in result:
            f.write(chunk)
            
    return output_path

@traceable(name="get_audio_duration")
def get_audio_duration(file_path: str) -> float:
    """Helper function to get the exact audio duration using ffprobe."""
    cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file_path
    ]
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"FFprobe error: {e}")
        return 0.0

@traceable(name="sync_audio_to_duration")
def sync_audio_to_duration(input_path: str, output_path: str, target_duration: float) -> str:
    """
    Uses FFmpeg's 'atempo' filter to stretch or compress audio to exactly match the target_duration.
    The atempo filter changes the speed without changing the pitch of the voice.
    """
    original_duration = get_audio_duration(input_path)
    
    if original_duration <= 0:
        raise ValueError("Original audio duration is zero or invalid.")
        
    # The atempo filter multiplier. 
    # tempo > 1.0 speeds up the audio (makes it shorter). 
    # tempo < 1.0 slows down the audio (makes it longer).
    tempo = original_duration / target_duration
    
    # FFmpeg's atempo filter is strictly limited to values between 0.5 and 100.0.
    # Since we cap our ratio between 0.9 and 1.1 in the main function, this is safe.
    cmd = [
        "ffmpeg", "-y", "-i", input_path,  # -y overwrites output file if it exists
        "-filter:a", f"atempo={tempo}",
        output_path
    ]
    
    print(f"Running FFmpeg: Stretching audio by a factor of {tempo:.4f}...")
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    if result.returncode != 0:
        print(f"FFmpeg Error Output: {result.stderr}")
        raise RuntimeError("FFmpeg failed to process the audio.")
        
    return output_path

@traceable(name="download_video_to_folder")
def download_video_to_folder(video_url: str, output_dir: str, filename: str) -> str:
    # Create the folder if it does not already exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Build the complete destination file path
    save_path = os.path.join(output_dir, filename)
    
    print(f"Downloading video to {save_path}...")
    response = requests.get(video_url, stream=True)
    response.raise_for_status()
    
    # Write the stream in 8KB chunks
    with open(save_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
                
    print(f"Saved successfully to: {save_path}")
    return save_path



class WorkflowState(TypedDict):
    """The central state object passed between all LangGraph nodes."""
    job_id: str
    upd_prompt: str
    upd_negative_prompt: str
    duration: int
    resolution: str
    ratio: str
    frame_rate: int
    speech: str
    is_speech_present: bool
    speech_start_time: float
    speech_end_time: float
    sfx_prompt: List[str]
    is_sfx_present: bool
    timestamps: List[EventOccurrence]

  

def prompt_enhancer(state: WorkflowState, config: RunnableConfig):
    """Enhances the user's base prompt for video generation."""

    # ==========================================
    # database integration to get complete job details
    # ==========================================
    session = config["configurable"]["db_session"]
    job=get_job_from_db(session=session, job_id=state["job_id"])

    # 1. Initialize ChatGroq LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash", 
        temperature=0.4,
        google_api_key=os.getenv("GEMINI_API_KEY") 
    )

    # 2. Bind the Pydantic schema for strict structured output
    structured_llm = llm.with_structured_output(EnhancedPromptOutput)

    # 3. Define the Prompt Template
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """
            You are an expert AI Video Prompt Engineer and Sound Director for high-end text-to-video models (such as Wan 2.1, LTX-Video, CogVideoX, and HunyuanVideo).
            
            Your objective is to generate a perfectly synchronized multimedia payload consisting of visuals, dialogue, and sound effects. All elements will be merged in post-production, so they must flawlessly align in tone, pacing, and context.
            
            1. **Text-to-Video Prompt Engineering (`updated_prompt`)**:
                - Weave user parameters seamlessly into a natural, visually descriptive scene.
                - Describe physical subjects, fluid actions, subject-camera spatial relationship, atmospheric lighting, and style textures directly.
                - DO NOT use vague buzzwords like "photorealistic", "4k", "hyperdetailed", "masterpiece". Use concrete sensory visual descriptors instead.
                - **Synchronization Cue:** Keep motion descriptions fluid. If a character is going to speak, explicitly describe their mouth moving or their expression. If a loud sound occurs, describe the visual impact.
            
            2. **Negative Prompt Engineering (`updated_negative_prompt`)**:
                - Combine any user-provided negative prompt with robust anti-artifact triggers for AI video: morphing, flickering, floating objects, extra limbs, distorted face, jittery camera, bad anatomy, text/watermarks, overexposure, plastic skin texture.
            
            3. **Dialogue Extraction (`speech` & `is_speech_present`)**:
                - If the scene implies a character talking or if spoken lines are present in the prompt, extract or compose a concise dialogue line suitable for TTS generation.
                - Set `is_speech_present` to true if dialogue is generated.
                - If no dialogue is appropriate for the scene, set `speech` to "" and `is_speech_present` to false.
                - **CRITICAL DURATION MATH:** Humans speak at an average rate of 2.5 words per second. You must check the requested `duration` of the video. The generated `speech` MUST strictly contain a word count equal to or less than `duration * 2.5`. (e.g., A 5-second video can only have a maximum of 12 words). If the user provided too much dialogue, summarize or cut it down to fit this strict mathematical limit while preserving the core meaning.
                - **Synchronization Cue:** The spoken words must logically fit the character's emotional state and the visual duration described in the `updated_prompt`.
            
            4. **Sound Effects & Ambience (`sfx_audio_prompt` & `is_sfx_audio_present`)**:
                - Generate a LIST of descriptive text-to-audio prompts for background noise, sound effects, or environmental audio. 
                - Example: ["Heavy footsteps crunching on gravel", "Distant thunder rumbling"]
                - Set `is_sfx_audio_present` to true if SFX are generated, otherwise false.
                - **Synchronization Cue:** Every sound effect in this list MUST directly match a visual action or environment established in the `updated_prompt`. 
            
            CRITICAL: You must output strictly valid JSON matching the requested schema. The visual prompt, speech, and SFX MUST read like they belong to the exact same movie scene.
        """),
        ("user", "Optimize this video generation job configuration:\n\n{job_json}")
    ])

    # 4. Construct the LCEL Chain
    chain = prompt_template | structured_llm


    # 5. Execute Chain - returns EnhancedPromptOutput instance directly
    result: EnhancedPromptOutput = chain.invoke({"job_json": job.model_dump_json(indent=2, exclude={'id', 'status','style_id','model','seed','created_at','progress','video_url','error'})})

    # ==========================================
    # Correct output and update state also job_json
    # ==========================================
    setattr(job,'progress',20)
    setattr(job,'status','processing')  
    session.add(job)
    session.commit()
    session.refresh(job)

    return {
        "upd_prompt": result.updated_prompt,
        "upd_negative_prompt": result.updated_negative_prompt,
        "speech": result.speech,
        "is_speech_present": result.is_speech_present,
        "sfx_prompt": result.sfx_audio_prompt,
        "is_sfx_present": result.is_sfx_audio_present
    }


def video_generator(state: WorkflowState, config: RunnableConfig):
    """Generates the base video using the enhanced prompt."""
    client = Client(token=os.getenv("MAGIC_HOUR_API_KEY"))

    # Define a working directory for your video outputs
    output_dir = "./output_results"
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"[{state['job_id']}] Submitting job to Magic Hour (Model: ltx-2.3)...")
    
    try:
        # 1. Trigger the generation
        response = client.v1.text_to_video.generate(
            style={
                "prompt": state["upd_prompt"],
                "negative_prompt": state["upd_negative_prompt"]
            },
            model="ltx-2.3",          
            end_seconds=state["duration"],  # Use the duration from the state
            resolution=state["resolution"],  # Use the resolution from the state
            orientation="landscape",
            wait_for_completion=True, 
            download_outputs=True,
            download_directory=output_dir
        )
        
        # 2. Safely capture and rename the downloaded file
        if hasattr(response, 'downloaded_paths') and response.downloaded_paths:
            original_file_path = response.downloaded_paths[0]
            
            # Construct the exact path you want using the job_id
            final_file_path = os.path.join(output_dir, f"silent_video_{state['job_id']}.mp4")
            
            # Rename the file (os.replace is safer than os.rename as it handles overwriting)
            os.replace(original_file_path, final_file_path)
            
            print(f"[{state['job_id']}] Video generation successful! Saved as: {final_file_path}")
            
        else:
            print(f"[{state['job_id']}] Generation completed, but SDK returned no local file path.")
            
    except Exception as e:
        print(f"[{state['job_id']}] Pipeline halted: {e}")

    session = config["configurable"]["db_session"]
    job=update_job_in_db(session=session, job_id=state["job_id"], job_update=GenerationJobUpdate(progress=40))   

    return {}

def features_extractor(state: WorkflowState, config: RunnableConfig):
    """Analyzes the video to extract timestamps and visual events."""

    video_path = f"./output_results/silent_video_{state['job_id']}.mp4"

    # 1. Define what we want Gemini to find
    # Format the list into a numbered string for the prompt
    formatted_sfx_targets = "\n".join([f"{i+1}. {sfx}" for i, sfx in enumerate(state["sfx_prompt"])])

    # 2. The Optimized Prompt
    prompt = f"""
        ORIGINAL VIDEO CREATION PROMPT:
        "{state['upd_prompt']}"

        TARGET AUDIO EVENTS:
        {formatted_sfx_targets}

        TARGET DIALOGUE / SPEECH:
        "{state['speech']}"

        TASK:
        You are provided with a video, the prompt used to create it, a specific list of 'TARGET AUDIO EVENTS', and the 'TARGET DIALOGUE' meant to be spoken.
        Your goal is to detect timestamps for the SFX events, finalize their audio prompts, AND detect the best timestamps for the speech while refining the dialogue to fit the video perfectly.

        INSTRUCTIONS:
        
        PART 1: SOUND EFFECTS (SFX) EXTRACTION
        1. VISUAL VERIFICATION (DROP): Watch the video carefully. You must ONLY output timestamps for events from the TARGET list that ACTUALLY appear visually in the video. If a target event does not happen on screen, IGNORE IT completely. Do not hallucinate.
        2. PROMPT REFINEMENT (KEEP OR MODIFY): For each validated event, look at its provided target prompt. 
        - KEEP: If the provided prompt perfectly describes what is happening on screen, output it exactly as provided.
        - MODIFY: If the video reveals specific visual details that change the sound (e.g., the car horn is muffled, or the rain is hitting glass instead of concrete), improve the prompt to match the visual reality while keeping the professional audio tags (e.g., 'sound effects foley').
        3. TIMESTAMP EXTRACTION: Return the exact start and end times in MM:SS format for the validated events.
        4. CONFIDENCE ASSESSMENT: You can take help from 'state["upd_prompt"]' to understand the context of the scene, but do not hallucinate events that are not visually present.

        --- VISUAL VERIFICATION & EVALUATION RULES (SFX) ---

        1. DIRECT EVENTS (Visible Source):
        - The object or action creating the sound is visible on screen (e.g., seeing rain fall, seeing a car horn pressed).
        - ACTION: Extract exact start and end timestamps. Modify the 'sfx_prompt' if visual details warrant it.

        2. IMPLIED / OFF-SCREEN / AMBIENT EVENTS (Invisible Source):
        - The sound source is NOT visible, BUT it is justified by visual reactions or scene context:
            * Reaction-based: (e.g., People look back in fear and start running -> maps to off-screen threat/siren).
            * Environment-based: (e.g., Scene takes place in a dense forest -> maps to ambient river/nature sounds for that scene segment).
        - ACTION: Extract start and end timestamps matching the duration of the visual reaction or environmental shot. Modify the 'sfx_prompt' to include keywords like "off-screen", "distant", "background ambient", or "muffled".

        3. UNGROUNDED EVENTS (DROP):
        - The event is neither visible nor implied by reactions or scene setting.
        - ACTION: Completely drop this event from the output JSON. Do NOT generate timestamps.
        
        PART 2: SPEECH DETECTION & DIALOGUE REFINEMENT
        Because this is an AI-generated video, lip-sync and mouth movements may be highly inaccurate or missing. Do NOT rely strictly on precise lip motion.
        
        1. TIMESTAMP EXTRACTION: Watch the characters in the video. Identify when a person is visibly present on screen and appears to be in a position, posture, or context to speak.
        2. USE DIALOGUE LENGTH: Look at the 'TARGET DIALOGUE'. Estimate how long it takes to say those words. Record the 'speech_start_time' and 'speech_end_time' in MM:SS format based on the character's visible presence to comfortably fit the speech duration.
        3. DIALOGUE REFINEMENT: Evaluate if the provided 'TARGET DIALOGUE' fits the extracted timeframe and the character's physical movements. If the speech is too long for the available screen time, too short, or slightly mismatches the visual context of the 'ORIGINAL VIDEO CREATION PROMPT', you must edit and refine the dialogue text. 
            - CRITICAL: You MUST preserve the exact original meaning and emotional context of the speech, just adapt the pacing or wording to fit the video reality.
            - **CRITICAL DURATION MATH:** Humans speak at an average rate of 2.5 words per second. You must check the requested `duration` of the video. The generated `speech` MUST strictly contain a word count equal to or less than `duration * 2.5`. (e.g., A 5-second video can only have a maximum of 12 words). If the user provided too much dialogue, summarize or cut it down to fit this strict mathematical limit while preserving the core meaning.
        4. If no character is present to speak during the entire video, return "00:00" for both timestamps and an empty string "" for the refined speech.

        --- JSON OUTPUT MAPPING INSTRUCTIONS ---

        Map the data to the JSON schema as follows:
        - 'events': A list of validated SFX events.
           - 'sfx_prompt': The finalized prompt string.
                * If unchanged, use the input prompt string directly.
                * If off-screen, add spatial terms like "distant", "off-screen", or "background echo".
                * Ensure professional audio tags (e.g., 'sound effects foley') remain attached.
            - 'start_time_mmss': The timestamp (MM:SS) where the action, reaction, or ambient scene begins.
            - 'end_time_mmss': The timestamp (MM:SS) where the action, reaction, or ambient scene ends.
        - 'speech_start_time': MM:SS start time based on character presence.
        - 'speech_end_time': MM:SS end time based on character presence.
        - 'refined_speech': The updated and contextually fitted dialogue string (or the original if it fits perfectly).

        Return a strict JSON object using the provided schema.
    """

    # # 2. Extract Timestamps
    # events = extract_timestamps(video_path, prompt)
    # print(f"Found {len(events)} events.")
    
    client = genai.Client()
    
    print(f"Uploading {video_path} to Gemini...")
    video_file = client.files.upload(file=video_path)
    
    # Wait for the video to finish processing on Google's servers
    print("Waiting for video processing...")
    while video_file.state.name == "PROCESSING":
        print(".", end="", flush=True)
        time.sleep(2)
        video_file = client.files.get(name=video_file.name)
    print("\nVideo ready.")

    if video_file.state.name == "FAILED":
        raise ValueError("Video processing failed.")

    print("Analyzing video with gemini-3.6-flash...")
    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=[video_file, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=VideoGroundingResult,
            temperature=0.1
        ),
    )

    client.files.delete(name=video_file.name)
    
    # Parse the JSON response back into our Pydantic models
    data = json.loads(response.text)
    pydantic_data=VideoGroundingResult(**data)

    session = config["configurable"]["db_session"]
    job=update_job_in_db(session=session, job_id=state["job_id"], job_update=GenerationJobUpdate(progress=60))

    return {'timestamps': pydantic_data.events,
            'speech_start_time': pydantic_data.speech_start_time_seconds,
            'speech_end_time': pydantic_data.speech_end_time_seconds,
            'speech': pydantic_data.refined_speech}


def speech_generator(state: WorkflowState, config: RunnableConfig):
    """Generates the voiceover speech audio."""
    if not state.get("is_speech_present"):
        print("Speech not requested. Bypassing speech_generator node.")
        return {}
    
    print("Initiating Gemini TTS. Target speech duration:")
    
    # 2. Initialize the Gemini API client
    # Replace or use environment variables for safety in production
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    # 3. Call the dedicated Gemini TTS Preview Model
    enhanced_prompt = (
        f"Speak every word correctly with same emotions as mentioned. "
        f"Speak at a pace that ensures you finish reading this strictly within {state['speech_end_time']-state['speech_start_time']} seconds. "
        f"Text: {state['speech']}"
    )
    
    try:
        interaction = client.interactions.create(
            model="gemini-3.1-flash-tts-preview", 
            input=enhanced_prompt,
            response_format={"type": "audio"},
            generation_config={
                "response_mime_type": "audio/wav", # We leave this in case Google updates the API, but handle raw as fallback
                "speech_config": [
                    {
                        "voice": "Aoede"
                    }
                ]
            }
        )
        
        # Extract the base64 encoded audio data and decode it into raw bytes
        audio_bytes = base64.b64decode(interaction.output_audio.data)
        
    except Exception as e:
        print(f"Gemini API Error: {e}")

    # 4. Convert raw PCM to a valid WAV file for FFmpeg
    temp_raw_path = f"./output_results/raw_speech_{state['job_id']}.wav"
    temp_stretched_path = f"./output_results/stretched_speech_{state['job_id']}.wav"
    
    try:
        # Load the raw PCM bytes into pydub by explicitly defining the format
        audio_stream = io.BytesIO(audio_bytes)
        raw_audio = AudioSegment.from_file(
            audio_stream, 
            format="raw", 
            frame_rate=24000, 
            channels=1, 
            sample_width=2
        )
        
        # Save it to disk as a REAL valid WAV file (with headers) so FFmpeg can read it
        raw_audio.export(temp_raw_path, format="wav")
        
    except Exception as e:
        print(f"Error saving or loading raw audio from disk: {e}")
    
    # 5. Check duration and apply Time-Stretching via FFmpeg if needed
    actual_speech_length_s = len(raw_audio) / 1000.0
    speech_audio = raw_audio # Default to using the raw audio
    
    if actual_speech_length_s > 0:
        allowed_duration = state['speech_end_time'] - state['speech_start_time']
        ratio = actual_speech_length_s / allowed_duration
        
        # If it missed the target duration but is within a 10% stretchable range (0.9 to 1.1)
        if 0.9 <= ratio <= 1.1 and abs(ratio - 1.0) > 0.01:
            print(f"Time-stretching audio by a ratio of {ratio:.4f} (Original: {actual_speech_length_s}s, Target: {allowed_duration}s)")
            try:
                sync_audio_to_duration(temp_raw_path, temp_stretched_path, allowed_duration)
                # Load the newly stretched file back into pydub for merging
                speech_audio = AudioSegment.from_file(temp_stretched_path)
            except Exception as e:
                print(f"Failed to stretch audio via FFmpeg: {e}. Proceeding with original audio.")
        
        elif ratio > 1.1:
            print(f"Warning: The generated speech ({actual_speech_length_s:.2f}s) significantly exceeded the requested limit ({allowed_duration:.2f}s). Stretching aborted to prevent distortion.")

    # 6. Create a full-duration master silent track
    total_duration_ms = int(state["duration"] * 1000)
    base_silence = AudioSegment.silent(duration=total_duration_ms)
    
    # 7. Overlay the speech onto the silent track at the exact start_time
    start_time_ms = int(state["speech_start_time"] * 1000)
    final_audio = base_silence.overlay(speech_audio, position=start_time_ms)

    output_path = f"./output_results/final_speech_{state['job_id']}.wav"
    
    # 8. Save and export the final audio
    final_audio.export(output_path, format="wav")
    
    # 9. Cleanup the intermediate files from the server
    if os.path.exists(temp_raw_path):
        os.remove(temp_raw_path)
    if os.path.exists(temp_stretched_path):
        os.remove(temp_stretched_path)

    session = config["configurable"]["db_session"]
    job=update_job_in_db(session=session, job_id=state["job_id"], job_update=GenerationJobUpdate(progress=70))
    print(f"Success! Audio saved.")

    return {}

def sfx_wait_node(state: WorkflowState,config: RunnableConfig):
    """
    A dummy node used strictly for path padding.
    It equalizes the super-steps so the merger node triggers synchronously.
    """
    print("SFX Wait Node: Padding the path to align with the lipsyncer branch...")
    return {} # No state updates


def sfx_audio_generator(state: WorkflowState, config: RunnableConfig):
    """Generates sound effects based on extracted video events."""
    if not state.get("is_sfx_present"):
        print("SFX not requested. Bypassing sfx_audio_generator node.")
        return {}
    
    output_dir = "./output_results"
    final_mix = AudioSegment.silent(duration=(state["duration"] * 1000))

    api_key = os.getenv("ELEVENLABS_API_KEY") 
    
    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY is not set!")

    el_client = ElevenLabs(
        api_key=api_key, 
    )

    count=1
    # 4. Generate and Mix
    for event in state["timestamps"]:
        # Generate the sound
        value=f"{state['job_id']}_{count}"
        sfx_path = generate_sfx(event, el_client, output_dir,value)
        count+=1
        # Load it into pydub
        sfx_audio = AudioSegment.from_file(sfx_path)
            
        # Calculate the exact millisecond to place the sound
        start_ms = int(event.start_time_seconds * 1000)
        
        # Overlay the sound onto the main mix
        print(f"Mixing '{event.sfx_prompt}' at {start_ms}ms")
        final_mix = final_mix.overlay(sfx_audio, position=start_ms)

        if os.path.exists(sfx_path):
                os.remove(sfx_path)

    # 5. Export Final Mix
    final_mix.export(f"./output_results/final_sfx_audio_{state['job_id']}.mp3", format="mp3")
    print(f"Export complete: final_sfx_audio_{state['job_id']}.mp3")

    return {}

def lipsyncer(state: WorkflowState, config: RunnableConfig):
    """Syncs the generated speech to the video characters."""
    if not state.get("is_speech_present"):
        print("Speech not requested. Bypassing lipsyncer node.")
        return {}
    
    cloud_video=upload_video(f"./output_results/silent_video_{state['job_id']}.mp4",config["configurable"]["user_id"], state["job_id"], "silent_video")
    
    video_url = cloud_video["secure_url"]

    cloud_audio=upload_video(f"./output_results/final_speech_{state['job_id']}.wav",config["configurable"]["user_id"], state["job_id"], "final_speech")
    audio_url = cloud_audio["secure_url"]

    print("Passing to Sync Labs:")
    print(f"Video: {video_url}")
    print(f"Audio: {audio_url}")

    sync_client = Sync(api_key= os.getenv("SYNC_API_KEY"))
    try:
        response = sync_client.generations.create(
            input=[
                Video(url=video_url),
                Audio(url=audio_url),
            ],
            model="lipsync-2", # You can also use "sync-3" for their highest quality 4k model
            options=GenerationOptions(sync_mode="cut_off"), # Options: 'cut_off', 'loop', 'bounce'
        )
    except ApiError as e:
        print(f"API Error: {e.status_code} - {e.body}")
    
    job_id = response.id
    print(f"Job submitted successfully. Job ID: {job_id}")
    # Polling loop to wait for completion
    generation = sync_client.generations.get(job_id)

    result_url = None

    while generation.status not in ["COMPLETED", "FAILED", "REJECTED"]:
        print(f"Status: {generation.status}... checking again in 5 seconds.")
        time.sleep(5)
        generation = sync_client.generations.get(job_id)
    if generation.status == "COMPLETED":
        print(f"Success! Output URL: {generation.output_url}")
        result_url = generation.output_url
    else:
        print(f"Generation failed: {generation.error}")


    if result_url:
        print(f"Final Lip-synced Video: {result_url}")
        path=download_video_to_folder(result_url, output_dir="./output_results", filename=f"lipsync_video_{state['job_id']}.mp4")
        delete_video(cloud_video["public_id"])
        delete_video(cloud_audio["public_id"])
        if os.path.exists(f"./output_results/silent_video_{state['job_id']}.mp4"):
            os.remove(f"./output_results/silent_video_{state['job_id']}.mp4")


    session = config["configurable"]["db_session"]
    job=update_job_in_db(session=session, job_id=state["job_id"], job_update=GenerationJobUpdate(progress=90))

    return {}

def merger(state: WorkflowState, config: RunnableConfig):
    """Muxes video and audio streams based on flags, then uploads to Cloudinary."""
    job_id = state["job_id"]
    user_id = config["configurable"]["user_id"]
    
    is_speech = state.get("is_speech_present", False)
    is_sfx = state.get("is_sfx_present", False)

    silent_video_path = f"./output_results/silent_video_{job_id}.mp4"
    lipsync_video_path = f"./output_results/lipsync_video_{job_id}.mp4"
    speech_path = f"./output_results/final_speech_{job_id}.wav"
    sfx_path = f"./output_results/final_sfx_audio_{job_id}.mp3"
    final_output_path = f"./output_results/final_masterpiece_{job_id}.mp4"

    base_video_path = lipsync_video_path if (is_speech and os.path.exists(lipsync_video_path)) else silent_video_path
    upload_target = base_video_path
    video_url = None

    if is_speech and is_sfx:
        print("Merger [Case 1]: Merging lipsync video + speech (100%) + sfx (70%)...")
        command = [
            "ffmpeg", "-y",
            "-i", base_video_path,
            "-i", speech_path,
            "-i", sfx_path,
            "-filter_complex", "[1:a]volume=1.0[speech];[2:a]volume=0.7[sfx];[speech][sfx]amix=inputs=2:duration=first:normalize=0[aout]",
            "-map", "0:v:0",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "256k",
            "-ar", "48000",
            final_output_path
        ]
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        upload_target = final_output_path

    elif is_speech and not is_sfx:
        print("Merger [Case 2]: Merging lipsync video + speech audio only (100%)...")
        command = [
            "ffmpeg", "-y",
            "-i", base_video_path,
            "-i", speech_path,
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "256k",
            "-ar", "48000",
            final_output_path
        ]
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        upload_target = final_output_path

    elif not is_speech and is_sfx:
        print("Merger [Case 3]: Merging silent video + SFX audio only (70%)...")
        command = [
            "ffmpeg", "-y",
            "-i", base_video_path,
            "-i", sfx_path,
            "-filter_complex", "[1:a]volume=0.7[aout]",
            "-map", "0:v:0",
            "-map", "[aout]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "256k",
            "-ar", "48000",
            final_output_path
        ]
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        upload_target = final_output_path

    else:
        print("Merger [Case 4]: Both Speech and SFX disabled. Using silent video directly...")
        upload_target = base_video_path

    print(f"Uploading final masterpiece to Cloudinary for user: {user_id}...")
    cloud_video = upload_video(upload_target, user_id, job_id, "final_video")
    video_url = cloud_video["secure_url"]

    session = config["configurable"]["db_session"]
    update_job_in_db(
        session=session,
        job_id=job_id,
        job_update=GenerationJobUpdate(progress=100, status="Completed", video_url=video_url)
    )

    for path in [silent_video_path, lipsync_video_path, speech_path, sfx_path, final_output_path]:
        if os.path.exists(path):
            try:
                os.remove(path)
            except Exception as e:
                print(f"Cleanup warning: {e}")

    return {}

workflow = StateGraph(WorkflowState)

workflow.add_node("prompt_enhancer", prompt_enhancer)
workflow.add_node("video_generator", video_generator)
workflow.add_node("features_extractor", features_extractor)
workflow.add_node("speech_generator", speech_generator)
workflow.add_node("sfx_wait_node", sfx_wait_node)
workflow.add_node("sfx_audio_generator", sfx_audio_generator)
workflow.add_node("lipsyncer", lipsyncer)
workflow.add_node("merger", merger)

# 1. Start the workflow
workflow.add_edge(START, "prompt_enhancer")

# 2. Linear progression to feature extraction
workflow.add_edge("prompt_enhancer", "video_generator")
workflow.add_edge("video_generator", "features_extractor")

# 3. Parallel Fan-out: Extractor triggers BOTH speech and SFX simultaneously
workflow.add_edge("features_extractor", "speech_generator")
workflow.add_edge("features_extractor", "sfx_wait_node")

# 4. Speech must go through lipsyncing
workflow.add_edge("speech_generator", "lipsyncer")
workflow.add_edge("sfx_wait_node", "sfx_audio_generator")

# 5. Fan-in: Wait for both lipsyncer and SFX to finish before merging
workflow.add_edge("lipsyncer", "merger")
workflow.add_edge("sfx_audio_generator", "merger")

# 6. End the workflow
workflow.add_edge("merger", END)

workflow_app = workflow.compile()

# Example of how to visualize or test the empty graph
if __name__ == "__main__":
    print("LangGraph Workflow Compiled Successfully!")

    # Generate and save the graph image
    try:
        # This converts the graph to a Mermaid chart and fetches a PNG
        image_data = workflow_app.get_graph().draw_mermaid_png()
        with open("updated_workflow_graph.png", "wb") as f:
            f.write(image_data)
        print("Graph image successfully saved as 'workflow_graph.png'!")
        
    except Exception as e:
        print(f"Could not generate graph image. Error: {e}")

    # To run a dummy test:



    # final_state = workflow_app.invoke({"job_id": "test_123", "sfx_prompt": []},
    #                          config={
    #                                 "configurable": {
    #                                     "db_session": session  # <-- Injected here!
    #                                 }
    #                             })
    # print(final_state)



    
