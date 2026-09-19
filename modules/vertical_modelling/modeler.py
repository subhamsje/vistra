"""
Module G: Vertical Property Hierarchy & LADM Cadastre Modelling
Models hierarchical relations (Parcel -> Building -> Floor -> Unit -> Common Area).
Encapsulates ISO 19152 LADM (Land Administration Domain Model) and RRR (Rights, Restrictions, Responsibilities).
"""

from typing import List, Dict, Any, Optional
from core.schemas.entity import VistraEntity, EntityType, ElevationInfo, CadastralMetadata, RRR, RightType, ProvenanceInfo

class VerticalPropertyModeler:
    def __init__(self):
        pass

    def build_cadastral_tree(self, parcel: Dict[str, Any], buildings: List[Dict[str, Any]], floors: List[Dict[str, Any]], units: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Constructs an explicit LADM-compliant hierarchical property graph.
        """
        p_id = parcel["id"]
        props = parcel.get("properties", {})
        
        # Parcel node
        parcel_node = {
            "entity_id": p_id,
            "entity_type": "PARCEL",
            "name": f"Cadastral Parcel {props.get('survey_khasra_no', p_id)}",
            "z_bounds": [props.get("base_elevation_m", 920.0), props.get("max_elevation_m", 960.0)],
            "rrr": {
                "tenure_type": "FREEHOLD",
                "rights": ["LAND_OWNERSHIP", "DEVELOPMENT_RIGHTS", "AIR_RIGHTS_UPTO_60M"],
                "restrictions": ["MUNICIPAL_ZONING_BYLAWS", "RAINWATER_HARVESTING_MANDATORY"],
                "responsibilities": ["ANNUAL_PROPERTY_TAX"]
            },
            "buildings": []
        }

        # Filter buildings belonging to this parcel
        child_buildings = [b for b in buildings if b.get("properties", {}).get("parent_parcel_id") == p_id or b.get("parent_id") == p_id]

        for b in child_buildings:
            b_id = b["id"]
            b_props = b.get("properties", {})
            b_node = {
                "entity_id": b_id,
                "entity_type": "BUILDING",
                "name": b_props.get("name", f"Building Block {b_id}"),
                "z_bounds": [b_props.get("base_elevation_m", 920.0), b_props.get("roof_elevation_m", 938.0)],
                "rrr": {
                    "tenure_type": "COMMON_PROPERTY",
                    "rights": ["OCCUPANCY_PERMIT", "STRUCTURAL_SUPERSTRUCTURE"],
                    "restrictions": ["FIRE_SAFETY_CLEARANCE_REQUIRED"],
                    "responsibilities": ["SOCIETY_MAINTENANCE"]
                },
                "floors": []
            }

            # Filter floors for this building
            child_floors = [fl for fl in floors if fl.get("building_id") == b_id]
            # Sort monotonically by base elevation
            child_floors.sort(key=lambda x: x.get("base_elevation_m", 0.0))

            for fl in child_floors:
                fl_id = fl["id"]
                fl_node = {
                    "entity_id": fl_id,
                    "entity_type": "FLOOR",
                    "floor_level": fl.get("floor_level"),
                    "name": fl.get("name"),
                    "z_bounds": [fl.get("base_elevation_m"), fl.get("roof_elevation_m")],
                    "units": []
                }

                # Filter units for this floor
                child_units = [u for u in units if u.get("floor_id") == fl_id]
                for u in child_units:
                    fl_node["units"].append({
                        "entity_id": u["id"],
                        "entity_type": "UNIT",
                        "unit_number": u.get("unit_number"),
                        "unit_type": u.get("unit_type"),
                        "z_bounds": u.get("z_bounds"),
                        "rrr": {
                            "tenure_type": "FREEHOLD" if not fl.get("is_basement") else "LEASEHOLD",
                            "rights": ["SOLE_OCCUPANCY", "RESALE_RIGHT", "SUBLEASE_RIGHT"],
                            "restrictions": ["NO_STRUCTURAL_ALTERATION", "RESIDENTIAL_USE_ONLY"],
                            "responsibilities": ["MONTHLY_COMMON_MAINTENANCE_DUES"]
                        }
                    })

                b_node["floors"].append(fl_node)

            parcel_node["buildings"].append(b_node)

        return parcel_node
