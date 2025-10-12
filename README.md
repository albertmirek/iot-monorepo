# Backend Developer Programming Assignment

## Table of Contents
1. [Solution](#solution)
   - [Architecture Overview](#architecture-overview)
   - [Running the Application](#running-the-application)
   - [Running Tests](#running-tests)
   - [How It Works](#how-it-works)
     - [Producer Service](#producer-service-simulated-iot-devices)
     - [Consumer Service](#consumer-service-data-processing--storage)
     - [Datastore Implementation](#datastore-implementation)
   - [REST API](#rest-api)
   - [RabbitMQ Management](#rabbitmq-management)
   - [Project Structure](#project-structure)
   - [Technology Stack](#technology-stack)
2. [Assignment](#assignment)
   - [Requirements](#requirements)
   - [Specification](#specification)
   - [Quality Requirements](#quality-requirements)
3. [Bonus Question](#bonus-question)


## Solution

### Architecture Overview

The solution implements a microservices architecture with two main services communicating via RabbitMQ:

```
┌─────────────┐      ┌──────────┐      ┌─────────────┐
│  Producer   │─────>│ RabbitMQ │─────>│  Consumer   │
│  (10 IoT    │      │  Queue   │      │  + REST API │
│  Devices)   │      └──────────┘      └─────────────┘
└─────────────┘                              │
     Every 10s                            In-Memory
                                         Data Store
```

### Running the Application

**Start all services (Producer, Consumer, RabbitMQ):**
```bash
make all
```

This command will:
1. Pull necessary Docker images
2. Build the services
3. Start all containers (RabbitMQ, Producer, Consumer)
4. Display logs from all services

**Other useful commands:**
```bash
make build    # Build Docker images
make run      # Start containers
make down     # Stop all containers
make logs     # View logs
```

### Running Tests

**Run all tests (producer + consumer) (unit + e2e) from root:**
```bash
make test-all
```

This command:
1. Stops all running containers
2. Starts RabbitMQ
3. Runs Consumer tests (unit + e2e)
4. Runs Producer tests (unit + e2e)

### How It Works

#### Producer Service (Simulated IoT Devices)

The producer simulates **10 IoT devices** that send telemetry data:

- **Interval**: Every **10 seconds** (`@Interval('telemetry_emit_interval', 10000)`)
- **Data Generated**: Randomly selects one of 10 device IDs and generates:
  - `deviceId`: UUID (one of 10 pre-generated UUIDs)
  - `timestamp`: Current ISO 8601 timestamp
  - `temperature`: Random value between 20-30°C
  - `humidity`: Random value between 0.3-0.6 (30-60%)
- **Validation**: Uses Zod schema to validate data before sending
- **Queue**: Sends validated data to `telemetry_data_emitted_queue` (or any other queue, depends on TELEMETRY_QUEUE env variable set in docker-compose)

**Example payload:**
```json
{
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2025-10-12T10:30:45.123Z",
  "temperature": 25.4,
  "humidity": 0.45
}
```

#### Consumer Service (Data Processing & Storage)

The consumer listens to the RabbitMQ queue and processes incoming events:

**Event Processing:**
1. **Receives** telemetry data from `telemetry_data_emitted_queue`
2. **Validates** data using Zod schema (same as producer)
3. **Stores** data in in-memory datastore
4. **Acknowledges** message (removes from queue)

**Error Handling:**
- Invalid data (schema validation fails): Logs error and acknowledges (prevents retry loop)
- Out-of-order data (timestamp older than last record): Rejected silently, logs warning
- Unexpected errors: Logs error and throws (message will be requeued)

#### Datastore Implementation

Data is stored in an **in-memory Map** with optimized access patterns:

**Structure:**
```typescript
Map<string, TelemetryDataStoreRecord[]>
```
- **Key**: Device UUID
- **Value**: Array of telemetry records (chronologically sorted)

**Storage Logic:**
1. Check if incoming data timestamp is newer than the last stored record for the device
2. If data is obsolete (older timestamp), it is dropped and a warning is logged
3. If data is valid, it's appended to the end of the device's array
4. Arrays are naturally sorted by timestamp due to this append-only approach

**Query Optimization:**
- **Single Device**: Direct Map lookup
- **All Devices**: Flattens all arrays and sorts chronologically
- **Date Filtering**: Uses `findIndex()` to find boundaries, then slices array
  - Since data is pre-sorted, no need to scan all elements
  - For multi-device queries, data is sorted once before filtering

### REST API

The consumer exposes a REST API for querying stored telemetry data:

**Endpoint:** `GET http://localhost:3000/telemetry`

**Query Parameters:**
- `deviceId` (optional): Filter by specific device UUID
- `from` (optional): Start date in ISO 8601 format (inclusive)
- `to` (optional): End date in ISO 8601 format (inclusive)

**Examples:**

```bash
# Get all telemetry data
curl http://localhost:3000/telemetry

# Get data for a specific device
curl http://localhost:3000/telemetry?deviceId=a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Get data within a date range
curl "http://localhost:3000/telemetry?from=2025-10-12T00:00:00Z&to=2025-10-12T23:59:59Z"

# Combine filters
curl "http://localhost:3000/telemetry?deviceId=a1b2c3d4-e5f6-7890-abcd-ef1234567890&from=2025-10-12T00:00:00Z"
```

**Response Format:**
```json
[
  {
    "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "createdAt": "2025-10-12T10:30:45.123Z",
    "temperature": 25.4,
    "humidity": 0.45
  },
  ...
]
```

### RabbitMQ Management

Access RabbitMQ Management UI at: **http://localhost:15672**
- Username: `admin`
- Password: `admin`

### Project Structure

```
iot-monorepo/
├── apps/
│   ├── consumer/           # Consumer microservice
│   │   ├── src/
│   │   │   ├── consumer/   # RabbitMQ event handlers
│   │   │   ├── datastore/  # In-memory storage service
│   │   │   └── main.ts
│   │   └── test/           # Unit & E2E tests
│   └── producer/           # Producer microservice
│       ├── src/
│       │   ├── producer.service.ts  # Telemetry generation
│       │   └── main.ts
│       └── test/           # Unit & E2E tests
├── packages/
│   └── node-lib/           # Shared library
│       └── schema/         # Zod validation schemas
├── docker-compose.yml      # Service orchestration
└── Makefile               # Build & test automation
```

### Technology Stack

- **Framework**: NestJS (Node.js/TypeScript)
- **Message Broker**: RabbitMQ 4.1.4
- **Validation**: Zod
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose
- **Monorepo**: pnpm workspaces

## Assignment

### Requirements

Develop two microservices, a Simulated IoT Device (Producer) and a Consumer, communicating over RabbitMQ. The services should run locally with Docker/Docker Compose. Use Typescript and git.

###  Specification

#### Simulated IoT Device (Producer):

- Simulates an IoT device sending telemetry data at regular intervals (e.g.,s every 10 seconds).
- Generates and sends payloads with:
    - deviceId (UUID),
    - timestamp (current time),
    - temperature (random number within a realistic range, e.g., 20-30°C),
    - humidity (random number within a realistic range, e.g., 30-60%).
- Sends telemetry data to a RabbitMQ queue.
- Consumer Service:
    - Listens to the RabbitMQ queue, processes each incoming telemetry payload, and stores them in an in-memory data store.
    - Exposes a REST API (/telemetry) that returns stored telemetry data and supports date range filtering.

- Docker Compose:
    - Configure RabbitMQ and both services to work in a local Docker Compose setup.

#### Quality Requirements
- Code: Clean, modular, and maintainable.
- Testing: Include unit and integration tests for both services.
- Documentation: Update README.md with setup and API instructions.
- Git: Use clear commits.

## Bonus Question

**Question:** "What would you change to handle high volumes of telemetry data more effectively?"

**Answer:** See detailed analysis and recommendations in **[BONUS.md](./BONUS.md)**

