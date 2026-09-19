from setuptools import setup, find_packages

setup(
    name="vistra",
    version="1.0.0",
    description="3D ULPIN Generation & Vertical Property Mapping System",
    author="VISTRA Engineering Team",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "fastapi",
        "uvicorn",
        "pydantic",
        "shapely",
        "pyproj",
        "numpy",
        "scipy",
    ],
    entry_points={
        "console_scripts": [
            "vistra=run_vistra:main",
        ],
    },
)
