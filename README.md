## diamond plus portal

web app for real estate agent training and content delivery

### setup

1. install dependencies:
```bash
cd core && npm install
cd ../admin && npm install
```

2. set up environment variables (see env vars section)

3. run development:
```bash
# core portal
cd core && npm run dev

# admin portal  
cd admin && npm run dev
```

### env vars

#### core portal
- `DATABASE_URL` - postgres connection string
- `SUPABASE_URL` - supabase project url
- `SUPABASE_ANON_KEY` - supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - supabase service role key
- `MUX_TOKEN_ID` - mux api token id
- `MUX_TOKEN_SECRET` - mux api token secret
- `AWS_ACCESS_KEY_ID` - aws access key
- `AWS_SECRET_ACCESS_KEY` - aws secret key
- `AWS_REGION` - aws region
- `S3_BUCKET_NAME` - s3 bucket name

#### admin portal
- same as core portal

### production

```bash
npm run build
npm start
```
