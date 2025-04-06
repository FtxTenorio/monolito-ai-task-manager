import logging
import os
from config.settings import settings

def get_logger(name):
    """
    Retorna um logger configurado com o nome especificado.
    
    Args:
        name (str): Nome do logger
        
    Returns:
        logging.Logger: Logger configurado
    """
    # Configurar o nível de log
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    # Criar o logger
    logger = logging.getLogger(name)
    logger.setLevel(log_level)
    
    # Se o logger já tiver handlers, não adicionar novos
    if logger.handlers:
        return logger
    
    # Criar um handler para console
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    
    # Criar um formato para o log
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    
    # Adicionar o handler ao logger
    logger.addHandler(console_handler)
    
    return logger 