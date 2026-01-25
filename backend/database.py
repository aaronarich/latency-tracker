from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session, select
import os

class LatencyRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    domain: str = Field(index=True)
    latency_ms: float
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)

class TrackedDomain(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    added_at: datetime = Field(default_factory=datetime.utcnow)

# Database configuration
DATABASE_PATH = os.getenv("DATABASE_PATH", "latency.db")
sqlite_url = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(sqlite_url, echo=False, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def add_latency_record(domain: str, latency_ms: float):
    with Session(engine) as session:
        record = LatencyRecord(domain=domain, latency_ms=latency_ms)
        session.add(record)
        session.commit()

def get_latency_data(days: int = 30):
    cutoff = datetime.utcnow() - timedelta(days=days)
    with Session(engine) as session:
        statement = select(LatencyRecord).where(LatencyRecord.timestamp >= cutoff).order_by(LatencyRecord.timestamp)
        return session.exec(statement).all()

def cleanup_old_records(days: int = 30):
    cutoff = datetime.utcnow() - timedelta(days=days)
    with Session(engine) as session:
        statement = select(LatencyRecord).where(LatencyRecord.timestamp < cutoff)
        results = session.exec(statement)
        for record in results:
            session.delete(record)
        session.commit()

def get_tracked_domains():
    with Session(engine) as session:
        statement = select(TrackedDomain)
        return session.exec(statement).all()

def add_tracked_domain(name: str):
    with Session(engine) as session:
        domain = TrackedDomain(name=name)
        session.add(domain)
        try:
            session.commit()
            session.refresh(domain)
            return domain
        except Exception as e:
            print(f"Error adding domain {name}: {e}")
            session.rollback()
            return None

def remove_tracked_domain(name: str):
    with Session(engine) as session:
        statement = select(TrackedDomain).where(TrackedDomain.name == name)
        domain = session.exec(statement).first()
        if domain:
            session.delete(domain)
            session.commit()
            return True
        return False
