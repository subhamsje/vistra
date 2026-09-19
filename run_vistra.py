#!/usr/bin/env python3
"""
VISTRA Master CLI & Service Runner
Executes the end-to-end 3D ULPIN generation pipeline and launches the Web & API Server.
"""

import sys
import os
import uvicorn

def main():
    print("=" * 65)
    print("  VISTRA: 3D ULPIN Generation & Vertical Property Mapping System")
    print("=" * 65)
    print("\n[+] Location: /Users/subham/code/vistra")
    print("[+] Core Modules: A-L Initialized")
    print("[+] API Docs: http://localhost:8000/docs")
    print("[+] Web UI:   http://localhost:8000/app")
    print("=" * 65)

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main()
