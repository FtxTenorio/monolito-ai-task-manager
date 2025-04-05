FROM public.ecr.aws/lambda/python:3.11

# Atualizar pip e instalar dependências
RUN pip install --upgrade pip

# Copiar os requisitos primeiro para aproveitar o cache do Docker
COPY requirements.txt ${LAMBDA_TASK_ROOT}
RUN pip install -r requirements.txt

# Copiar o código da aplicação
COPY src/ ${LAMBDA_TASK_ROOT}/src/

# Definir o handler da Lambda
CMD ["src.handlers.routine_handler.lambda_handler"] 