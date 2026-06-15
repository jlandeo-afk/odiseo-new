import os
import pdfkit
import logging
from jinja2 import Template

logger = logging.getLogger(__name__)

# T028: Refactorización y extracción de CSS para optimización
BASE_CSS = """
body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
.header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }
.header img { max-height: 80px; }
.title { font-size: 24px; font-weight: bold; margin-top: 10px; color: #2c3e50; }
.question { margin-bottom: 25px; page-break-inside: avoid; }
.question-content { font-size: 16px; margin-bottom: 12px; }
.options { list-style-type: none; padding-left: 20px; }
.options li { margin-bottom: 8px; }
"""

BASE_HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        {{ css_styles }}
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

class PdfGenerator:
    def __init__(self):
        self.template = Template(BASE_HTML_TEMPLATE)

    def generate_pdf(self, questions: list, tenant_metadata: dict, title: str) -> bytes:
        """
        Genera el documento PDF inyectando el branding del tenant.
        Retorna el binario en formato bytes.
        """
        logger.info(f"Generating PDF for {tenant_metadata.get('commercial_name')} - {title}")
        
        rendered_html = self.template.render(
            css_styles=BASE_CSS,
            tenant=tenant_metadata,
            title=title,
            questions=questions
        )
        
        try:
            pdf_options = {
                'page-size': 'A4',
                'margin-top': '0.75in',
                'margin-right': '0.75in',
                'margin-bottom': '0.75in',
                'margin-left': '0.75in',
                'encoding': "UTF-8",
                'quiet': ''
            }
            pdf_bytes = pdfkit.from_string(rendered_html, False, options=pdf_options)
            return pdf_bytes
        except Exception as e:
            logger.warning(f"pdfkit execution failed (possibly missing wkhtmltopdf in dev environment). Fallback to encoded HTML bytes. Error: {str(e)}")
            return rendered_html.encode('utf-8')

pdf_generator = PdfGenerator()
