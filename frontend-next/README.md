# Assistente de Voz com IA

Este é um aplicativo web que permite interagir com um assistente de IA através de comandos de voz. O aplicativo utiliza reconhecimento de voz para capturar comandos falados e envia esses comandos para um backend que processa a solicitação usando IA.

## Tecnologias Utilizadas

- **Frontend**: Next.js, React, Material UI
- **Backend**: FastAPI, Python
- **Comunicação**: WebSockets
- **Reconhecimento de Voz**: Web Speech API

## Funcionalidades

- Reconhecimento de voz em tempo real
- Interface de chat para visualizar mensagens do usuário e respostas do assistente
- Indicadores visuais de status (conexão, gravação, processamento)
- Design responsivo e moderno com Material UI

## Como Executar

### Pré-requisitos

- Node.js (v18 ou superior)
- npm ou yarn
- Python 3.8 ou superior
- Backend do projeto configurado e em execução

### Instalação e Execução do Frontend

1. Navegue até a pasta do frontend:
   ```
   cd frontend-next
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```
   npm run dev
   ```

4. Acesse o aplicativo em `http://localhost:3000`

### Execução do Backend

1. Navegue até a pasta do backend:
   ```
   cd backend
   ```

2. Ative o ambiente virtual (se estiver usando):
   ```
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate     # Windows
   ```

3. Inicie o servidor:
   ```
   python main.py
   ```

4. O servidor WebSocket estará disponível em `ws://localhost:8000/ws`

## Uso

1. Clique no botão do microfone para iniciar o reconhecimento de voz
2. Fale seu comando ou pergunta
3. Aguarde a resposta do assistente
4. Clique no botão do microfone novamente para parar o reconhecimento

## Estrutura do Projeto

```
frontend-next/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   ├── theme/
│   │   └── theme.ts
│   └── types/
│       └── speech-recognition.d.ts
├── public/
├── package.json
└── README.md
```

## Licença

Este projeto está licenciado sob a licença MIT.
