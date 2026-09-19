"""
Module L: Human Review, Cadastral Governance & Audit Trail
Implements Human-in-the-Loop triage for AI floor predictions, encroachment alerts,
and property freeze/unfreeze actions.
Adapted from Landmark-AI and gujarat-landchain governance patterns.
"""

import datetime
import hashlib
from typing import List, Dict, Any, Optional
from modules.database.database import SpatialDatabase

class GovernanceManager:
    def __init__(self, db: Optional[SpatialDatabase] = None):
        self.db = db or SpatialDatabase()

    def record_decision(self, entity_id: str, ulpin_3d: str, action: str, reviewer: str, notes: str, prev_state: Dict[str, Any], new_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Records an immutable audit event: CONFIRM, OVERRIDE, REJECT, or FREEZE.
        Computes SHA-256 seal of the event.
        """
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"
        raw_audit = f"{entity_id}:{ulpin_3d}:{action}:{reviewer}:{timestamp}"
        audit_hash = hashlib.sha256(raw_audit.encode("utf-8")).hexdigest()

        with self.db.get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
            INSERT INTO governance_audit_log (entity_id, ulpin_3d, action, previous_state, new_state, reviewer, notes, audit_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                entity_id,
                ulpin_3d,
                action,
                str(prev_state),
                str(new_state),
                reviewer,
                notes,
                audit_hash
            ))
            conn.commit()

        return {
            "status": "RECORDED",
            "audit_hash": audit_hash,
            "action": action,
            "timestamp": timestamp,
            "reviewer": reviewer
        }

    def get_audit_trail(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.db.get_connection() as conn:
            cur = conn.cursor()
            rows = cur.execute("""
            SELECT id, entity_id, ulpin_3d, action, reviewer, notes, audit_hash, created_at
            FROM governance_audit_log
            ORDER BY id DESC LIMIT ?
            """, (limit,)).fetchall()
            
            return [dict(r) for r in rows]
