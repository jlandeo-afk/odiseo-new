import os
import requests
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class CoreApiClient:
    def __init__(self):
        self.base_url = os.getenv("CORE_API_URL", "http://localhost:8000/api/v1/questions")
        self.api_key = os.getenv("CORE_API_KEY", "mock-api-key")

    def fetch_questions(self, course_id: str, difficulty_level: str, syllabus: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Consulta al Banco de Preguntas global (Core API) usando los parámetros del Job.
        Retorna la lista de reactivos (preguntas completas).
        """
        logger.info(f"Fetching questions for course {course_id} at difficulty {difficulty_level}")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "course_id": course_id,
            "difficulty_level": difficulty_level,
            "syllabus_filters": syllabus
        }

        try:
            # En producción esto haría un POST real
            # response = requests.post(f"{self.base_url}/search", json=payload, headers=headers)
            # response.raise_for_status()
            # return response.json().get('data', [])
            
            # MOCK IMPLEMENTATION para desarrollo aislado
            logger.info("Mocking Core API response...")
            mock_questions = []
            for item in syllabus:
                topic_id = item.get("topic_id")
                qty = item.get("requested_quantity", 0)
                for i in range(qty):
                    mock_questions.append({
                        "question_id": f"q-{topic_id}-{i}",
                        "content": f"Pregunta simulada {i+1} de la DB central para el tema {topic_id}. Nivel: {difficulty_level}",
                        "options": [
                            {"key": "A", "value": "Opción 1"},
                            {"key": "B", "value": "Opción 2"},
                            {"key": "C", "value": "Opción 3"},
                            {"key": "D", "value": "Opción 4"}
                        ],
                        "correct_answer": "A"
                    })
            
            logger.info(f"Core API returned {len(mock_questions)} questions")
            return mock_questions

        except requests.RequestException as e:
            logger.error(f"Error fetching questions from Core API: {str(e)}")
            raise e

core_api_client = CoreApiClient()
