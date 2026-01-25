import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from database import add_tracked_domain, create_db_and_tables, engine, TrackedDomain
from sqlmodel import Session, select

print(f"Database URL: {engine.url}")

try:
    print("Ensuring DB tables exist...")
    create_db_and_tables()
    
    print("Checking existing domains...")
    with Session(engine) as session:
        domains = session.exec(select(TrackedDomain)).all()
        print(f"Current domains: {[d.name for d in domains]}")

    print("Attempting to add 'test-debug.com'...")
    # call the function we suspect is failing
    result = add_tracked_domain("test-debug.com")
    
    if result:
        print(f"Success! Added: {result.name}")
    else:
        print("Failed to add domain (returned None).")
        
        # Now let's try to do it manually to see the exception
        print("Retrying manually to catch exception...")
        with Session(engine) as session:
            domain = TrackedDomain(name="test-debug.com")
            session.add(domain)
            try:
                session.commit()
                print("Manual commit successful?!")
            except Exception as e:
                print(f"Caught expected exception: {type(e).__name__}: {e}")

except Exception as e:
    print(f"An unexpected error occurred: {e}")
