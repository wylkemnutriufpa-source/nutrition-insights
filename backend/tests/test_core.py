"""
Testes básicos para auth, schemas e rotas.
Execução: pytest backend/tests/ -v
"""

import pytest
from pydantic import ValidationError

from app.schemas.ai_schemas import MealAnalysisRequest, BodyAnalysisRequest
from app.schemas.common_schemas import MealCreate


# --- Schema Validation Tests ---

class TestMealAnalysisRequest:
    def test_valid_request(self):
        req = MealAnalysisRequest(description="Arroz, feijão e frango grelhado")
        assert req.description == "Arroz, feijão e frango grelhado"

    def test_empty_description_rejected(self):
        with pytest.raises(ValidationError):
            MealAnalysisRequest(description="")

    def test_oversized_description_rejected(self):
        with pytest.raises(ValidationError):
            MealAnalysisRequest(description="x" * 2001)

    def test_control_chars_stripped(self):
        req = MealAnalysisRequest(description="Arroz\x00 e feijão")
        assert "\x00" not in req.description

    def test_http_url_rejected(self):
        with pytest.raises(ValidationError):
            MealAnalysisRequest(
                description="test",
                image_url="http://example.com/img.jpg"
            )

    def test_https_url_accepted(self):
        req = MealAnalysisRequest(
            description="test",
            image_url="https://example.com/img.jpg"
        )
        assert req.image_url.startswith("https://")


class TestBodyAnalysisRequest:
    def test_valid_request(self):
        req = BodyAnalysisRequest(height_cm=170, weight_kg=70)
        assert req.height_cm == 170

    def test_invalid_height(self):
        with pytest.raises(ValidationError):
            BodyAnalysisRequest(height_cm=10, weight_kg=70)

    def test_invalid_weight(self):
        with pytest.raises(ValidationError):
            BodyAnalysisRequest(height_cm=170, weight_kg=600)

    def test_notes_max_length(self):
        with pytest.raises(ValidationError):
            BodyAnalysisRequest(height_cm=170, weight_kg=70, notes="x" * 1001)


class TestMealCreate:
    def test_valid(self):
        meal = MealCreate(description="Salada com tomate")
        assert meal.description == "Salada com tomate"

    def test_empty_rejected(self):
        with pytest.raises(ValidationError):
            MealCreate(description="   ")


# --- Sanitization Tests ---

from app.utils.sanitize import sanitize_html
from app.services.ai_service import sanitize_ai_response


class TestSanitization:
    def test_remove_html_tags(self):
        assert sanitize_html("<script>alert(1)</script>hello") == "alert(1)hello"

    def test_remove_javascript_uri(self):
        assert "javascript:" not in sanitize_html("javascript:alert(1)")

    def test_ai_response_clean(self):
        dirty = '<img onerror="alert(1)" src=x>Resposta segura'
        clean = sanitize_ai_response(dirty)
        assert "<img" not in clean
        assert "onerror" not in clean
        assert "Resposta segura" in clean


# --- Upload Validation Tests ---

from app.routes.upload_routes import _is_valid_image


class TestUploadValidation:
    def test_jpeg_magic_bytes(self):
        assert _is_valid_image(b"\xff\xd8\xff\xe0" + b"\x00" * 12)

    def test_png_magic_bytes(self):
        assert _is_valid_image(b"\x89PNG\r\n\x1a\n" + b"\x00" * 8)

    def test_invalid_magic_bytes(self):
        assert not _is_valid_image(b"\x00" * 16)

    def test_text_file_rejected(self):
        assert not _is_valid_image(b"Hello World!!!!!")
