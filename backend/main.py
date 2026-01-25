from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session
from datetime import datetime
import os
from database import create_db_and_tables, add_latency_record, get_latency_data, cleanup_old_records, engine, get_tracked_domains, add_tracked_domain, remove_tracked_domain
from ping_service import ping_domain
import uvicorn
from pydantic import BaseModel

class DomainCreate(BaseModel):
    name: str

app = FastAPI(title="Latency Tracker API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_DOMAINS = [
    "google.com",
    "icloud.com",
    "duckduckgo.com",
    "cloudflare.com",
    "fly.customer.io"
]

def perform_pings():
    print(f"[{datetime.utcnow()}] Running pings...")
    domains = [d.name for d in get_tracked_domains()]
    for domain in domains:
        latency = ping_domain(domain)
        if latency != -1.0:
            add_latency_record(domain, latency)
    
    # Also perform cleanup once a day (simplified: check on every ping cycle but we could optimize)
    # For now, let's just do it here to keep it simple.
    cleanup_old_records(days=30)

scheduler = BackgroundScheduler()
scheduler.add_job(perform_pings, 'interval', seconds=30)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Seed default domains if none exist
    if not get_tracked_domains():
        for domain in DEFAULT_DOMAINS:
            add_tracked_domain(domain)
    scheduler.start()

@app.get("/latency")
def read_latency(days: int = 30):
    return get_latency_data(days=days)

@app.get("/status")
def get_status():
    domains = [d.name for d in get_tracked_domains()]
    return {"status": "ok", "domains": domains}

@app.get("/domains")
def list_domains():
    return get_tracked_domains()

@app.post("/domains")
def create_domain(domain: DomainCreate):
    print(f"Attempting to add domain: {domain.name}")
    new_domain = add_tracked_domain(domain.name)
    if not new_domain:
        raise HTTPException(status_code=409, detail="Domain already exists")
    return new_domain

@app.delete("/domains/{domain_name}")
def delete_domain(domain_name: str):
    success = remove_tracked_domain(domain_name)
    return {"success": success}

# Serve static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

    @app.get("/")
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_path, "index.html"))
    
    # Catch-all for other frontend files (css, js) if they aren't in /static
    @app.get("/{file_path:path}")
    async def serve_file(file_path: str):
        full_path = os.path.join(frontend_path, file_path)
        if os.path.isfile(full_path):
            return FileResponse(full_path)
        return FileResponse(os.path.join(frontend_path, "index.html"))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
