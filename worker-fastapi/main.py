import logging
import asyncio
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.sqs_consumer import SQSConsumer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

consumer = SQSConsumer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup - iniciar el consumer en un thread/task background
    logger.info("Application starting up... initializing background SQS consumer")
    loop = asyncio.get_running_loop()
    task = loop.run_in_executor(None, consumer.start_polling)
    yield
    # Cleanup (si es necesario)
    logger.info("Application shutting down...")

app = FastAPI(lifespan=lifespan, title="Worker FastAPI", description="Procesa asincronamente los balotarios PDF")

@app.get("/health")
def health_check():
    return {"status": "ok"}
