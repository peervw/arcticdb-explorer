import arcticdb
import pandas as pd
import numpy as np

def seed():
    uri = "lmdb://./arctic_db"
    print(f"Connecting to {uri}...")
    ac = arcticdb.Arctic(uri)
    
    lib_name = "test_lib"
    if lib_name not in ac.list_libraries():
        print(f"Creating library {lib_name}...")
        ac.create_library(lib_name)
    
    lib = ac[lib_name]
    
    print("Writing symbol 'market_data'...")
    df = pd.DataFrame(np.random.randn(100, 4), columns=['Open', 'High', 'Low', 'Close'])
    df.index = pd.date_range('2023-01-01', periods=100)
    lib.write("market_data", df)
    
    print("Writing symbol 'user_stats'...")
    df2 = pd.DataFrame({'User': ['Alice', 'Bob', 'Charlie'], 'Score': [100, 200, 150]})
    lib.write("user_stats", df2)

    print("Done. DB created at ./arctic_db")

if __name__ == "__main__":
    seed()
