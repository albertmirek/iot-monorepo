# Backend Developer Programming Assignment

## Requirements

Develop two microservices, a Simulated IoT Device (Producer) and a Consumer, communicating over RabbitMQ. The services should run locally with Docker/Docker Compose. Use Typescript and git.

## Specification

### Simulated IoT Device (Producer):

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

### Quality Requirements
- Code: Clean, modular, and maintainable.
- Testing: Include unit and integration tests for both services.
- Documentation: Update README.md with setup and API instructions.
- Git: Use clear commits.

### Bonus Question
In BONUS.md or in your merge request, answer:

“What would you change to handle high volumes of telemetry data more effectively?”

