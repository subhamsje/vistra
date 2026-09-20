from fastapi.testclient import TestClient
from backend.main import app

def test_user_profile_endpoints():
    client = TestClient(app)
    
    # Check default profile
    res1 = client.get('/api/user')
    assert res1.status_code == 200
    data1 = res1.json()
    assert 'name' in data1
    assert 'role' in data1
    assert 'initials' in data1
    assert 'department' in data1

    # Update profile with custom surveyor
    res2 = client.post('/api/user', json={
        'name': 'Devendra Sharma',
        'role': 'Superintending Cadastral Surveyor',
        'department': 'National Geospatial Mission'
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2['name'] == 'Devendra Sharma'
    assert data2['role'] == 'Superintending Cadastral Surveyor'
    assert data2['initials'] == 'DS'
    assert data2['department'] == 'National Geospatial Mission'

    # Verify state persists in subsequent GET
    res3 = client.get('/api/user')
    assert res3.status_code == 200
    assert res3.json()['name'] == 'Devendra Sharma'
    assert res3.json()['initials'] == 'DS'
