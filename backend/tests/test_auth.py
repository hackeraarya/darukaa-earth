from app.auth import get_user_id_from_token, hash_password, verify_password


def test_password_hash_round_trip():
    password_hash = hash_password("correct horse battery staple")

    assert password_hash != "correct horse battery staple"
    assert verify_password("correct horse battery staple", password_hash)
    assert not verify_password("wrong password", password_hash)


def test_access_token_contains_user_id():
    token = __import__("app.auth", fromlist=["create_access_token"]).create_access_token(42)

    assert get_user_id_from_token(token) == 42
