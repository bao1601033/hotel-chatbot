# Vietnam Hotel Chatbot

AI-powered hotel recommendation chatbot using Claude API + AWS Athena + Next.js

## Stack
- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: FastAPI + Python
- **AI**: Claude API (claude-sonnet-4-20250514)
- **Data**: AWS Athena → S3 Parquet (gold layer)
- **Deploy**: Railway

---

## Deploy lên Railway

### Bước 1 — Push lên GitHub
```bash
git init
git add .
git commit -m "initial"
gh repo create hotel-chatbot --public --push
```

### Bước 2 — Deploy Backend
1. Vào railway.app → New Project → Deploy from GitHub
2. Chọn repo → chọn thư mục `backend`
3. Add environment variables:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=ap-southeast-1
   ATHENA_DB=hotel_data
   ATHENA_OUTPUT=s3://booking-athena-results-yourname/
   ```
4. Railway tự detect Dockerfile và deploy
5. Copy URL backend (ví dụ: `https://backend-xxx.railway.app`)

### Bước 3 — Deploy Frontend
1. New Service → Deploy from GitHub → chọn thư mục `frontend`
2. Add environment variable:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://backend-xxx.railway.app
   ```
3. Deploy → copy URL frontend

---

## Chạy local

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # điền API keys vào .env
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" > .env.local
npm run dev
```

Mở http://localhost:3000
