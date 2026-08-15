import cloudinary 
import cloudinary.uploader
import cloudinary.api
import os
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()
# ==========================================
# 1. Configuration
# ==========================================
# You get these from your Cloudinary Dashboard
cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure=True # Forces HTTPS
)

# ==========================================
# 2. CREATE (Upload a Video)
# ==========================================
def upload_video(local_file_path: str, user_id: str, job_id: str, video_name: str) -> dict:
    """
    Uploads a video to Cloudinary.
    Uses the user_id and job_id to simulate a folder structure.
    """
    # The public_id is the exact "path" where the video will live.
    # It fakes a folder structure: user_123/job_456/final_video
    custom_path = f"users/{user_id}/jobs/{job_id}/{video_name}"
    # print(cloud_name)
    # print(api_key)
    # print(api_secret)

    print(f"Uploading {local_file_path} to {custom_path}...")
    
    try:
        response = cloudinary.uploader.upload(
            local_file_path, 
            resource_type="video", # CRITICAL: Must specify video, otherwise it defaults to image
            public_id=custom_path,
            overwrite=True         # If a file exists at this path, overwrite it
        )
        print("Upload successful!")
        # Return the secure URL to save in your database
        return {
            "public_id": response.get("public_id"),
            "secure_url": response.get("secure_url"),
            "duration": response.get("duration")
        }
    except Exception as e:
        print(f"Upload failed: {e}")
        return None

# ==========================================
# 3. READ (Get Video Info & URL)
# ==========================================
def get_video_url(public_id: str) -> str:
    """
    Generates a direct URL to the video using its public_id.
    """
    # Cloudinary builds the URL based on the public_id
    url, options = cloudinary.utils.cloudinary_url(
        public_id, 
        resource_type="video",
        secure=True
    )
    return url

def get_video_metadata(public_id: str) -> dict:
    """
    Fetches the metadata (size, format, resolution) of an existing video.
    """
    try:
        response = cloudinary.api.resource(public_id, resource_type="video")
        return response
    except Exception as e:
        print(f"Failed to fetch metadata: {e}")
        return None

# ==========================================
# 4. UPDATE (Rename or move a video)
# ==========================================
def rename_video(old_public_id: str, new_public_id: str) -> dict:
    """
    Renames a video (or moves it to a new 'folder' path).
    """
    try:
        response = cloudinary.uploader.rename(
            old_public_id, 
            new_public_id, 
            resource_type="video"
        )
        print(f"Successfully renamed to {new_public_id}")
        return response
    except Exception as e:
        print(f"Failed to rename video: {e}")
        return None

# ==========================================
# 5. DELETE (Remove a video)
# ==========================================
def delete_video(public_id: str):
    """
    Deletes a video permanently from Cloudinary to free up storage space.
    """
    try:
        response = cloudinary.uploader.destroy(
            public_id, 
            resource_type="video" # Must specify video to delete videos
        )
        
        if response.get("result") == "ok":
            print(f"Successfully deleted {public_id}")
        else:
            print(f"Delete returned unexpected result: {response}")
            
    except Exception as e:
        print(f"Failed to delete video: {e}")

# ==========================================
# Example Usage
# ==========================================
if __name__ == "__main__":
    # Test variables
    my_local_video = r"C:\Users\siddh\MaVionix Internship\video-generator-dashboard\video-generator-dashboard-fixed\sid_practice\lipsync_work\output_videos\final_output_2.mp4" # Ensure you have a real video here
    test_user = "user_88"
    test_job = "job_402"
    
    # 1. CREATE
    # This creates a file at: users/user_88/jobs/job_402/final_video
    upload_data = upload_video(my_local_video, test_user, test_job, "final_video")
    
    if upload_data:
        saved_public_id = upload_data["public_id"]
        print(f"Video URL for database: {upload_data['secure_url']}")
        
        # 2. READ
        direct_url = get_video_url(saved_public_id)
        print(f"Generated playback URL: {direct_url}")
        
        # # 3. UPDATE
        # # Move it from the job folder to an 'archive' folder
        # archived_id = f"users/{test_user}/archive/final_video"
        # rename_video(saved_public_id, archived_id)
        
        # # 4. DELETE
        # # Clean up the file so you don't pay for storage
        # delete_video(archived_id)