import sys
import os
import psycopg2

def init_db(connection_url):
    print(f"Connecting to database: {connection_url[:30]}...")
    conn = psycopg2.connect(connection_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    schema_file = os.path.join(os.path.dirname(__file__), "..", "sql", "schema.sql")
    with open(schema_file, "r", encoding="utf-8") as f:
        sql = f.read()
        
    print("Executing schema.sql...")
    cur.execute(sql)
    
    # Verify tables
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'ide09';")
    tables = [row[0] for row in cur.fetchall()]
    print("\nInitialization Successful! Tables created in ide09:")
    for t in tables:
        print(f" - ide09.{t}")
        
    cur.execute("SELECT count(*) FROM ide09.allowed_chats;")
    print(f"\nAllowed chats count: {cur.fetchone()[0]}")
    
    conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/init_render_db.py <RENDER_EXTERNAL_DB_URL>")
        sys.exit(1)
    init_db(sys.argv[1])
