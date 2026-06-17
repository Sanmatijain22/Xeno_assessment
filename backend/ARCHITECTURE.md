# XENO DATA INTELLIGENCE HUB — BACKEND ARCHITECTURE SPECIFICATION

This document establishes the technical architecture, schema designs, API definitions, and queue/processing workflows for the Xeno backend transaction processing engine.

---

## 1. Complete Folder Structure

The backend directory layout is organized into clean domain layers:

```
backend/
├── app/
│   ├── api/                 # ASGI route handlers (Litestar)
│   │   ├── __init__.py      # Exposes API Controllers
│   │   ├── rules.py         # Dynamic validation rules API
│   │   └── upload.py        # Dataset ingestion & job status monitoring API
│   ├── services/            # Core business logic orchestrators
│   │   ├── __init__.py      # Exposes services singletons
│   │   ├── ai.py            # Gemini API integration service
│   │   ├── storage.py       # Local file storage path resolver
│   │   └── validation.py    # Chunk validation manager (Polars + Pandera)
│   ├── workers/             # Async background tasks poll loop
│   │   ├── __init__.py      # Exposes background hooks
│   │   └── tasks.py         # Redis RQ job worker logic
│   ├── repositories/        # Database Access Objects (SQLAlchemy Async)
│   │   ├── __init__.py      # Exposes database controllers
│   │   ├── base.py          # Generic DB CRUD helper
│   │   ├── rules.py         # CountryRules DAO operations
│   │   └── jobs.py          # Job statuses and Logs updates DAO operations
│   ├── models/              # Declarative database mapping objects
│   │   ├── __init__.py      # Exposes model classes
│   │   ├── database.py      # SQLAlchemy Base instance
│   │   ├── rules.py         # CountryRules ORM model
│   │   ├── jobs.py          # UploadedFiles and ProcessingJobs models
│   │   ├── logs.py          # ValidationLogs row errors model
│   │   └── ai.py            # AIReports parsed scores model
│   ├── schemas/             # JSON serialization structures (msgspec)
│   │   ├── __init__.py      # Exposes validation schemas
│   │   ├── rules.py         # Country configuration models
│   │   └── jobs.py          # Job heartbeats and reports structures
│   ├── validators/          # Data frame assertions schema definitions
│   │   ├── __init__.py      # Exposes validation assertions
│   │   └── rules.py         # Dynamic Pandera schema builders
│   ├── config/              # Environment parameters and session managers
│   │   ├── __init__.py      # Exposes settings and DB instances
│   │   ├── settings.py      # Settings loader class
│   │   └── db.py            # Async engine and transactional scopes
│   └── utils/               # Shared system utility packages
│       ├── __init__.py      # Exposes utilities
│       └── logger.py        # Structured logging setups
├── migrations/              # Database migration tracking files (Alembic)
├── uploads/                 # Holds incoming raw transaction files
├── outputs/                 # Stores validated clean datasets and logs
├── tests/                   # Integration and pipeline tests suite
│   ├── __init__.py
│   ├── test_api.py
│   └── test_processing.py
├── main.py                  # ASGI server instantiation and run script
├── requirements.txt         # Package requirements manifest
├── Dockerfile               # Multi-stage production container configuration
├── docker-compose.yml       # Local dev infrastructure (App + PostgreSQL + Redis)
└── .env.example             # Local parameters template
```

---

## 2. Architecture Explanation

The system is decoupled into isolated single-responsibility layers:
* **API Layer**: Exposes asynchronous ASGI endpoints using **Litestar**. Selected for superior performance and low latency compared to FastAPI.
* **Serialization Layer**: Handled entirely by **msgspec** for both JSON parsing and DTO matching. Msgspec utilizes struct compiling to parse fields at native C speeds, avoiding Pydantic overhead.
* **Database Access (ORM)**: Utilizes **SQLAlchemy 2.0**'s async extension (`asyncpg` driver) for non-blocking database operations, managing sessions using standard context manager scopes.
* **Queue Engine (Redis + RQ)**: Uploads are processed asynchronously. File metadata is saved to PostgreSQL instantly, and the raw file processing task is enqueued onto Redis.
* **Worker Layer (RQ Workers)**: Background worker loops polling the queue, running validations, splitting chunks, and prompting the Gemini API.
* **Streaming Validation Pipeline**: Utilizes **Polars** to read datasets lazily (`pl.scan_csv`) and streams chunks, avoiding loading raw multi-gigabyte datasets entirely into memory. Data validation constraints are enforced using **Pandera**.

---

## 3. Database Design

A relational schema is established using dynamic Postgres JSONB capabilities for AI analysis reports:

### 1. `country_rules` Table
Stores regex matching expressions, active flags, and formats by country. Allows onboarding new regions dynamically:
* `id` (`UUID`, PK)
* `country_code` (`VARCHAR(2)`, Unique, Indexed): ISO code (e.g. IN, US, SG).
* `country_name` (`VARCHAR(100)`)
* `phone_regex` (`VARCHAR(255)`): Dynamic regex pattern used by Pandera constraints.
* `date_format` (`VARCHAR(50)`): Standard structure matching pattern (e.g. DD-MM-YYYY).
* `is_active` (`BOOLEAN`, Default: True)
* `created_at` / `updated_at` (`TIMESTAMPTZ`)

### 2. `uploaded_files` Table
Registers incoming dataset streams:
* `id` (`UUID`, PK)
* `filename` (`VARCHAR(255)`)
* `file_path` (`VARCHAR(512)`): File location on disk/cloud storage.
* `file_size` (`INTEGER`): File size in bytes.
* `mime_type` (`VARCHAR(100)`)
* `created_at` (`TIMESTAMPTZ`)

### 3. `processing_jobs` Table
State machine tracking the processing status:
* `id` (`VARCHAR(50)`, PK): Human-readable pattern tracking key (e.g., `TXN-12345`).
* `uploaded_file_id` (`UUID`, FK `uploaded_files.id`): Back reference to upload payload.
* `status` (`VARCHAR(20)`, Indexed): State parameter (`queued`, `processing`, `completed`, `failed`).
* `total_records` (`INTEGER`, Nullable): Total rows found.
* `valid_records` (`INTEGER`, Nullable): Total passing rows.
* `invalid_records` (`INTEGER`, Nullable): Total failing rows.
* `clean_file_path` (`VARCHAR(512)`, Nullable): Clean outputs storage location on disk.
* `error_report_path` (`VARCHAR(512)`, Nullable): Isolated errors storage location.
* `created_at` / `updated_at` (`TIMESTAMPTZ`)

### 4. `validation_logs` Table
Granular catalog of all rows failing Pandera assertions checks:
* `id` (`BIGINT`, PK, Auto-increment)
* `job_id` (`VARCHAR(50)`, FK `processing_jobs.id`, Indexed)
* `row_number` (`INTEGER`): Failing index offset inside dataset.
* `column_name` (`VARCHAR(100)`, Nullable): Column causing validation failure.
* `error_message` (`VARCHAR(512)`): Assertion details text.
* `error_type` (`VARCHAR(50)`, Indexed): Classifier (e.g., `invalid_phone`, `negative_amount`, `missing_field`).
* `created_at` (`TIMESTAMPTZ`)

### 5. `ai_reports` Table
Parsed dashboard analytics received from Gemini:
* `id` (`UUID`, PK)
* `job_id` (`VARCHAR(50)`, FK `processing_jobs.id`, Unique, Indexed): Associated job entry.
* `quality_score` (`FLOAT`): Aggregated validation score.
* `common_errors` (`JSONB`): List of aggregated error types and columns counts.
* `country_analysis` (`JSONB`): Breakdown dictionary of regional performance indicators.
* `recommendations` (`JSONB`): List of steps to improve source quality.
* `executive_summary` (`TEXT`): Summary paragraph written by the LLM.
* `created_at` / `updated_at` (`TIMESTAMPTZ`)

---

## 4. API Design

Endpoints exchange msgspec-validated schemas:

### Ingestion & Status Group
* `POST /api/upload`: Receives file stream (multipart) and `country_code` target. Returns `202 Accepted` immediately with `{"job_id": "TXN-XXX", "status": "queued"}`.
* `GET /api/jobs`: Queries a list of all processing job metadata.
* `GET /api/jobs/{job_id}`: Retrieves job detail metrics and record counts.
* `GET /api/jobs/{job_id}/status`: Fetches minimal heartbeat status payload.
* `GET /api/jobs/{job_id}/downloads`: Returns location paths pointing to clean files, error reports, and chunks.
* `GET /api/jobs/{job_id}/report`: Returns the parsed Gemini AI report.

### Validation Rules Configuration Group
* `GET /api/rules`: Returns list of rules parameters.
* `POST /api/rules`: Creates a rule matching configuration.
* `PUT /api/rules/{id}`: Modifies target rules configuration.
* `DELETE /api/rules/{id}`: Removes rules configuration.

---

## 5. Queue Workflow (Redis + RQ)

Background task execution uses RQ (Redis Queue):

1. **Enqueue**: When a user triggers `POST /api/upload`, Litestar saves the file payload locally under `/uploads/`, inserts a database status of `queued`, and dispatches the task:
   `queue.enqueue(process_dataset_task, job_id, file_path, country_code)`
2. **Poll**: The RQ worker process listens to the Redis connection, popping the task when a worker loop becomes idle.
3. **Status Update**: The worker sets the database `status` to `processing`.
4. **Execution**: The worker launches the streaming validator, populates logs, and sends statistics to Gemini.
5. **Finalize**: The worker updates the job `status` to `completed` (or `failed` if an unhandled exception occurred) and saves the generated output paths.

---

## 6. Processing Workflow

Data evaluation uses Polars and Pandera for streaming execution:

1. **Dynamic Schema Setup**: Retrieve validation rules for the job's target `country_code` from PostgreSQL. Construct a Pandera `DataFrameSchema` incorporating regex matching patterns and formatting constraints.
2. **Lazy Scan**: Initiate a Polars scan (`pl.scan_csv` or `pl.read_ipc_schema`) to evaluate transaction fields without loading files into memory.
3. **Chunked Iteration**: Stream the lazy evaluation pipeline in batches (e.g. 50,000 records at a time) to keep the memory footprint constant:
   - For each chunk, run Pandera assertions.
   - Separate valid and invalid rows.
   - For invalid rows, format descriptive error messages and compile them into a `ValidationLogs` batch.
   - Append passing records to `clean_transactions.csv` and split them into sub-files (`chunk_n.csv`).
   - Append failing records to `error_report.csv` alongside row indexes and failure reasons.
4. **Aggregation**: Save validation log batches to the database. Generate final counts of valid/invalid records.
5. **AI Report Synthesis**: Send aggregated quality metrics (error counts by column, error type logs) to Gemini. Save the generated report payload to `ai_reports` in PostgreSQL.

---

## 7. Component Responsibilities

* **`UploadController` (`app/api/upload.py`)**: Entry point for API inputs. Handles uploads, validates metadata limits, saves file inputs to disk, and pushes task commands to Redis.
* **`RulesController` (`app/api/rules.py`)**: Interface for configuring country validation schemas.
* **`ValidationService` (`app/services/validation.py`)**: Coordinates the data processing pipeline. Handles lazy data scanning, Pandera validation checks, and error logging.
* **`AIService` (`app/services/ai.py`)**: Constructs prompt contexts from validation statistics and calls the Gemini API.
* **`StorageService` (`app/services/storage.py`)**: Manages physical output directories and paths mapping.
* **`BaseRepository` (`app/repositories/base.py`)**: Core database CRUD interface using SQLAlchemy async session calls.
* **`JobsRepository` (`app/repositories/jobs.py`)**: Implements database interactions for processing jobs, validation logs, and AI reports.

---

## 8. Environment Variables

The system relies on the following configurations (defined in `.env`):

* `ENV`: Runs as `development` or `production`.
* `DEBUG`: Toggles verbose trace logging and error detail structures.
* `SECRET_KEY`: Cryptographic key for session signature checks.
* `DATABASE_URL`: Asyncpg driver URL for SQLAlchemy asyncio commands (`postgresql+asyncpg://...`).
* `DATABASE_SYNC_URL`: Sync driver connection URL for Alembic migration scripts.
* `REDIS_URL`: Connection string pointing to Redis cache database.
* `GEMINI_API_KEY`: API token key enabling Gemini queries.
* `UPLOAD_DIR` / `OUTPUT_DIR`: Path coordinates defining where transaction files and processed data are saved.

---

## 9. Deployment Architecture

The production environment is structured as follows:

* **SaaS Database Layer**: Database hosted on **Neon PostgreSQL** (autoscaling, async pool).
* **SaaS Cache Layer**: Task scheduling queues hosted on **Upstash Redis** (low latency, SSL protected).
* **API Service Layer**: Host service deployed to **Railway** running Litestar ASGI web apps inside multi-stage Docker runner instances, scaled horizontally behind Railway's internal proxy balancer.
* **Worker Service Layer**: Decoupled RQ Workers deployed as background services on **Railway**, connecting to Upstash Redis and Neon Postgres databases.
* **AI Service Layer**: Calls the **Gemini API** directly from the RQ Worker runtime.
