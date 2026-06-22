import os
import time
import requests
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class InsufficientQuestionsError(Exception):
    """Excepción lanzada cuando el Core API no devuelve suficientes reactivos según el sílabo."""
    pass

class CoreApiClient:
    def __init__(self):
        self.base_url = os.getenv("CORE_API_URL", "http://localhost:8000/api/v1/questions")
        self.api_key = os.getenv("CORE_API_KEY", "mock-api-key")

    def fetch_questions(self, course_id: str, difficulty_level: str, syllabus: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Consulta al Banco de Preguntas global (Core API) usando los parámetros del Job.
        Retorna la lista de reactivos (preguntas completas) con reintentos exponenciales.
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

        max_attempts = 3
        attempt = 1
        backoff = 1.0
        
        # En producción esto haría un POST real con reintentos
        last_error = None
        while attempt <= max_attempts:
            try:
                # Timeout de 5s para evitar bloqueos
                response = requests.post(f"{self.base_url}/search", json=payload, headers=headers, timeout=5)
                if response.status_code == 200:
                    return response.json().get('data', [])
                response.raise_for_status()
            except Exception as e:
                last_error = e
                logger.warning(f"Core API request attempt {attempt} failed: {str(e)}")
                if attempt == max_attempts:
                    logger.info("Maximum attempts reached. Falling back to Mock generator in development...")
                    break
                time.sleep(backoff)
                backoff *= 2.0
                attempt += 1

        # MOCK IMPLEMENTATION para desarrollo aislado
        logger.info("Mocking Core API response...")
        mock_questions = []
        
        # In the SQS job, distribution items have 'weight', let's use that as qty
        expected_total = sum(item.get("weight", 0) for item in syllabus)
        
        for item in syllabus:
            topic_id = item.get("topic_id")
            qty = item.get("weight", 0)
            
            # MOCK DE FALLO: Si se piden cantidades irreales o magic numbers, simulamos escasez
            actual_qty = qty
            if qty >= 99:
                actual_qty = qty // 2
                
            for i in range(actual_qty):
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
        
        # T015 [US2]: Validación de reactivos insuficientes
        if len(mock_questions) < expected_total:
            logger.error(f"Insufficient questions. Expected: {expected_total}, Found: {len(mock_questions)}")
            raise InsufficientQuestionsError(
                f"No hay suficientes reactivos para los filtros seleccionados. Se solicitaron {expected_total} pero solo hay {len(mock_questions)} disponibles."
            )
        
        logger.info(f"Core API returned {len(mock_questions)} questions")
        return mock_questions

core_api_client = CoreApiClient()
