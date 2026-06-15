import logging
import zipfile
import io
from .core_api_client import core_api_client, InsufficientQuestionsError
from .pdf_generator import pdf_generator
from .s3_service import s3_service

logger = logging.getLogger(__name__)

class MaterialAssembler:
    def assemble(self, job_payload: dict) -> str:
        """
        Coordina la extracción, generación y subida a S3.
        Maneja la lógica de cuadernillos segregados para EXAMEN.
        Retorna la URL final de descarga.
        """
        job_id = job_payload.get('job_id')
        material_type = job_payload.get('material_type')
        course_id = job_payload.get('course_id')
        difficulty = job_payload.get('difficulty_level')
        syllabus = job_payload.get('syllabus_distribution', [])
        tenant = job_payload.get('tenant', {})
        exam_areas = job_payload.get('exam_areas')
        requires_curation = job_payload.get('requires_curation', False)

        logger.info(f"Assembling {material_type} for job {job_id}")

        try:
            if requires_curation:
                # T024 [US4]: Pausar la generación física para revisión en UI Intermedia
                logger.info(f"Curation required for job {job_id}. Fetching questions and pausing physical generation.")
                _ = core_api_client.fetch_questions(course_id, difficulty, syllabus)
                return "CURATION_REQUIRED"

            if material_type == 'EXAMEN' and exam_areas:
            # Lógica CR-002 y CR-003: Segregación física por áreas
            pdf_buffers = {}
            for area in exam_areas:
                area_name = area.get('name', 'Area Desconocida')
                logger.info(f"Processing segregated booklet for {area_name}")
                
                # 1. Fetch questions
                questions = core_api_client.fetch_questions(course_id, difficulty, syllabus)
                
                # 2. Generar PDF para el área
                title = f"Examen - {area_name}"
                pdf_bytes = pdf_generator.generate_pdf(questions, tenant, title)
                # Formatear nombre de archivo limpio
                clean_name = area_name.replace(' ', '_').replace('(', '').replace(')', '')
                pdf_buffers[f"Cuadernillo_{clean_name}.pdf"] = pdf_bytes
            
            # Empaquetar en un ZIP para proveer un único download_url
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                for filename, filebytes in pdf_buffers.items():
                    zf.writestr(filename, filebytes)
            
            # 3. Subir a S3
            zip_buffer.seek(0)
            file_name = f"examenes/{job_id}/cuadernillos.zip"
            download_url = s3_service.upload_pdf(zip_buffer.read(), file_name)
            return download_url
            
        else:
            # Flujo estándar: Un solo documento
            questions = core_api_client.fetch_questions(course_id, difficulty, syllabus)
            title = f"{material_type} - {course_id}"
            pdf_bytes = pdf_generator.generate_pdf(questions, tenant, title)
            
            file_name = f"materiales/{job_id}/documento.pdf"
            download_url = s3_service.upload_pdf(pdf_bytes, file_name)
            return download_url
            
        except InsufficientQuestionsError as e:
            logger.error(f"Assembly aborted for job {job_id} due to data validation: {str(e)}")
            raise e
        except Exception as e:
            logger.error(f"Assembly aborted for job {job_id} due to unexpected error: {str(e)}")
            raise e

material_assembler = MaterialAssembler()
