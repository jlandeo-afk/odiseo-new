import os
import pdfkit
import logging
from jinja2 import Template

logger = logging.getLogger(__name__)

class PdfGenerator:
    def __init__(self):
        pass

    def generate_pdf(self, questions: list, tenant_metadata: dict, title: str) -> bytes:
        """
        Genera el documento PDF inyectando el branding del tenant.
        Retorna el binario en formato bytes.
        """
        logger.info(f"Generating PDF for {tenant_metadata.get('commercial_name')} - {title}")
        
        html_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
                .header img { max-height: 80px; }
                .title { font-size: 24px; font-weight: bold; margin-top: 10px; }
                .question { margin-bottom: 20px; }
                .question-content { font-size: 16px; margin-bottom: 10px; }
                .options { list-style-type: none; padding-left: 20px; }
                .options li { margin-bottom: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                {% if tenant.logo_url %}
                    <img src="{{ tenant.logo_url }}" alt="Logo">
                {% endif %}
                <div class="title">{{ tenant.commercial_name }}</div>
                <h3>{{ title }}</h3>
            </div>
            
            <div class="content">
                {% for q in questions %}
                <div class="question">
                    <div class="question-content"><b>{{ loop.index }}.</b> {{ q.content }}</div>
                    <ul class="options">
                        {% for opt in q.options %}
                            <li><b>{{ opt.key }})</b> {{ opt.value }}</li>
                        {% endfor %}
                    </ul>
                </div>
                {% endfor %}
            </div>
        </body>
        </html>
        """
        
        template = Template(html_template)
        rendered_html = template.render(
            tenant=tenant_metadata,
            title=title,
            questions=questions
        )
        
        try:
            pdf_bytes = pdfkit.from_string(rendered_html, False, options={'quiet': ''})
            return pdf_bytes
        except Exception as e:
            logger.warning(f"pdfkit execution failed (possibly missing wkhtmltopdf in dev environment). Fallback to encoded HTML bytes. Error: {str(e)}")
            return rendered_html.encode('utf-8')

pdf_generator = PdfGenerator()
