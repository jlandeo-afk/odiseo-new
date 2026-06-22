import pytest
import sys
import os
from unittest.mock import MagicMock, patch

# Añadir el directorio raíz al path para que reconozca el módulo 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.material_assembler import material_assembler
from app.core_api_client import InsufficientQuestionsError

@patch("app.material_assembler.core_api_client.fetch_questions")
@patch("app.material_assembler.pdf_generator.generate_pdf")
@patch("app.material_assembler.s3_service.upload_pdf")
def test_assemble_standard_flow(mock_upload, mock_generate_pdf, mock_fetch_questions):
    # Setup mocks
    mock_fetch_questions.return_value = [{"question_id": "q-1"}]
    mock_generate_pdf.return_value = b"pdf-bytes"
    mock_upload.return_value = "http://s3/test.pdf"

    payload = {
        "job_id": "job-123",
        "material_type": "BALOTARIO",
        "course_id": "algebra",
        "difficulty_level": "MEDIA",
        "syllabus_distribution": [{"topic_id": "topic-1", "subtopic_id": "sub-1", "weight": 1}],
        "tenant": {"commercial_name": "Test School", "logo_url": ""},
        "notification": {"admin_user_id": "admin-1"}
    }

    url = material_assembler.assemble(payload)

    assert url == "http://s3/test.pdf"
    mock_fetch_questions.assert_called_once()
    mock_generate_pdf.assert_called_once()
    mock_upload.assert_called_once()


@patch("app.material_assembler.core_api_client.fetch_questions")
def test_assemble_curation_required(mock_fetch_questions):
    mock_fetch_questions.return_value = [{"question_id": "q-1"}]

    payload = {
        "job_id": "job-123",
        "material_type": "BALOTARIO",
        "course_id": "algebra",
        "difficulty_level": "MEDIA",
        "requires_curation": True,
        "syllabus_distribution": [{"topic_id": "topic-1", "subtopic_id": "sub-1", "weight": 1}],
        "tenant": {"commercial_name": "Test School", "logo_url": ""},
        "notification": {"admin_user_id": "admin-1"}
    }

    status = material_assembler.assemble(payload)

    assert status == "CURATION_REQUIRED"
    mock_fetch_questions.assert_called_once()


@patch("app.material_assembler.core_api_client.fetch_questions")
@patch("app.material_assembler.pdf_generator.generate_pdf")
@patch("app.material_assembler.s3_service.upload_pdf")
def test_assemble_examen_segregation(mock_upload, mock_generate_pdf, mock_fetch_questions):
    mock_fetch_questions.return_value = [{"question_id": "q-1"}]
    mock_generate_pdf.return_value = b"pdf-bytes"
    mock_upload.return_value = "http://s3/cuadernillos.zip"

    payload = {
        "job_id": "job-123",
        "material_type": "EXAMEN",
        "course_id": "algebra",
        "difficulty_level": "MEDIA",
        "exam_areas": [{"exam_area_id": "area-1", "name": "Ciencias"}],
        "syllabus_distribution": [{"topic_id": "topic-1", "subtopic_id": "sub-1", "weight": 1}],
        "tenant": {"commercial_name": "Test School", "logo_url": ""},
        "notification": {"admin_user_id": "admin-1"}
    }

    url = material_assembler.assemble(payload)

    assert url == "http://s3/cuadernillos.zip"
    assert mock_fetch_questions.call_count == 1
    assert mock_generate_pdf.call_count == 1
    mock_upload.assert_called_once()
