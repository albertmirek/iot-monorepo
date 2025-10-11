DOCKER_COMPOSE ?= "docker-compose"

test-e2e: export RABBIT_MQ_URL=amqp://admin:admin@localhost:5672

.NOPARALLEL .PHONY: test-e2e
test-e2e:
	@${DOCKER_COMPOSE} up -d rabbitmq
	pnpm run test:e2e
