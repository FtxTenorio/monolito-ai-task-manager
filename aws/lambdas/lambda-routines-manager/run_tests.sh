#!/bin/bash

# Configurar o PYTHONPATH para incluir o diretório raiz
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Executar os testes
python tests/test_lambda.py 