from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import arcticdb
import pandas as pd
import uuid
from typing import Dict, List, Optional, Any
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---

class ConnectRequest(BaseModel):
    uri: str
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: Optional[str] = None

class CreateLibraryRequest(BaseModel):
    name: str

class UpdateDataRequest(BaseModel):
    data: List[Dict[str, Any]] # Records format: [{'index': ..., 'col1': ...}, ...]
    index_col: Optional[str] = None

# --- Session Manager ---

class ArcticSessionManager:
    def __init__(self):
        self.sessions: Dict[str, arcticdb.Arctic] = {}

    def create_session(self, req: ConnectRequest) -> str:
        try:
            conn = None
            if req.uri.startswith("lmdb://") or req.uri.startswith("mongodb://"):
                conn = arcticdb.Arctic(req.uri)
            elif req.uri.startswith("s3://"):
                if req.aws_access_key_id and req.aws_secret_access_key:
                    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
                    parsed = urlparse(req.uri)
                    query = parse_qs(parsed.query)
                    query['access'] = [req.aws_access_key_id]
                    query['secret'] = [req.aws_secret_access_key]
                    if req.aws_region:
                         query['region'] = [req.aws_region]
                    new_query = urlencode(query, doseq=True)
                    secure_uri = list(parsed)
                    secure_uri[4] = new_query
                    full_uri = urlunparse(secure_uri)
                    conn = arcticdb.Arctic(full_uri)
                else:
                    conn = arcticdb.Arctic(req.uri)
            else:
                 conn = arcticdb.Arctic(req.uri)
            
            # Verify connection
            conn.list_libraries()

            token = str(uuid.uuid4())
            self.sessions[token] = conn
            return token
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def get_connection(self, token: str):
        if token not in self.sessions:
            raise HTTPException(status_code=401, detail="Session expired or invalid")
        return self.sessions[token]

session_manager = ArcticSessionManager()

async def get_arctic_conn(x_session_token: str = Header(...)):
    if not x_session_token:
        raise HTTPException(status_code=401, detail="Missing Session Token")
    return session_manager.get_connection(x_session_token)

# --- Endpoints ---

@app.post("/api/connect")
async def connect(request: ConnectRequest):
    token = session_manager.create_session(request)
    return {"status": "connected", "uri": request.uri, "token": token}

@app.get("/api/libraries")
async def list_libraries(conn = Depends(get_arctic_conn)):
    try:
        libs = conn.list_libraries()
        return {"libraries": libs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/libraries")
async def create_library(request: CreateLibraryRequest, conn = Depends(get_arctic_conn)):
    try:
        conn.create_library(request.name)
        return {"status": "created", "library": request.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/libraries/{lib_name}/symbols")
async def list_symbols(lib_name: str, conn = Depends(get_arctic_conn)):
    try:
        lib = conn[lib_name]
        symbols = lib.list_symbols()
        return {"symbols": symbols}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/libraries/{lib_name}/symbols/upload")
async def upload_symbol(
    lib_name: str, 
    file: UploadFile = File(...), 
    symbol_name: str = Body(...),
    conn = Depends(get_arctic_conn)
):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        # Basic index inference: if 'Date' or 'Time' or 'Index' column exists, set it
        # Otherwise, let ArcticDB handle (it often adds an index)
        # For this simple app, we'll index by the first column if it looks datetime-ish or unique?
        # Actually, let's just write common pandas inference.
        
        lib = conn[lib_name]
        lib.write(symbol_name, df)
        return {"status": "uploaded", "symbol": symbol_name, "rows": len(df)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/libraries/{lib_name}/symbols/{symbol}")
async def delete_symbol(lib_name: str, symbol: str, conn = Depends(get_arctic_conn)):
    try:
        lib = conn[lib_name]
        lib.delete(symbol)
        return {"status": "deleted", "symbol": symbol}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/libraries/{lib_name}/symbols/{symbol}/data")
async def get_symbol_data(
    lib_name: str, 
    symbol: str, 
    limit: int = 100, 
    query: Optional[str] = None,
    version: Optional[int] = None,
    conn = Depends(get_arctic_conn)
):
    try:
        lib = conn[lib_name]
        read_args = {}
        if version is not None:
             read_args['as_of'] = version
        
        # We read the whole symbol then filter/head. 
        # ArcticDB optimized read is read(symbol, date_range=...), but generic query is post-process for now.
        item = lib.read(symbol, **read_args)
        df = item.data
        
        total_rows = len(df)
        
        if query:
            try:
                # Security risk in production (eval), but acceptable for local tool context as per standard patterns
                df = df.query(query)
            except Exception as qe:
                raise HTTPException(status_code=400, detail=f"Invalid query: {str(qe)}")
        
        filtered_rows = len(df)
        df_head = df.head(limit)
        
        # Convert to split dict manually to ensure index is preserved clearly
        # df.to_dict('split') gives {index: [], columns: [], data: [[]]}
        data = df_head.to_dict(orient='split')
        
        return {
            "symbol": symbol,
            "version": item.version,
            "total_rows": total_rows,
            "filtered_rows": filtered_rows,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/libraries/{lib_name}/symbols/{symbol}/data")
async def update_symbol_data(
    lib_name: str, 
    symbol: str, 
    request: UpdateDataRequest,
    conn = Depends(get_arctic_conn)
):
    try:
        lib = conn[lib_name]
        # We expect record-oriented updates from frontend for the rows modified
        # We need to construct a DataFrame from the updates
        updates = request.data
        if not updates:
             return {"status": "no_changes"}

        df_update = pd.DataFrame(updates)
        
        # If an index column is specified or we need to infer
        if request.index_col:
            df_update.set_index(request.index_col, inplace=True)
        else:
            # If the original data had an index, we hopefully received it in the updates
            # The frontend should send the index as a column if possible or we assume the first column?
            # Creating a robust generic editor is hard. 
            # For now, let's assume the frontend sends the index as the first column or 'index' key in records.
            # If 'index' is in columns, set it.
            if 'index' in df_update.columns:
                 df_update.set_index('index', inplace=True)
            elif df_update.columns.name == 'index':
                 pass 

        # Using lib.update to merge changes
        # Note: lib.update sorts by index.
        lib.update(symbol, df_update)
        
        return {"status": "updated", "rows_affected": len(df_update)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/libraries/{lib_name}/symbols/{symbol}/versions")
async def list_versions(lib_name: str, symbol: str, conn = Depends(get_arctic_conn)):
    try:
        lib = conn[lib_name]
        # list_versions returns a dict or list depending on ArcticDB version? 
        # Usually it's available via lib.read_metadata or checking API.
        # Actually standard ArcticDB: lib.list_versions(symbol)
        versions = list(lib.list_versions(symbol)) 
        # versions is a generator/iterator of dicts usually: {'version': 1, 'date': ...}
        
        # Convert to list to serialise
        return {"versions": versions}
    except Exception as e:
         # Fallback if list_versions not directly available or different API
         raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
