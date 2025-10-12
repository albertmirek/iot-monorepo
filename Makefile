

DOCKER_COMPOSE ?= "docker-compose"
SHELL_CONSUMER_TTY := $(DOCKER_COMPOSE) run --rm consumer
SHELL_PRODUCER_TTY := $(DOCKER_COMPOSE) run --rm producer

.NOPARALLEL .PHONY: all
all:
	@${DOCKER_COMPOSE} pull
	$(MAKE) build
	$(MAKE) run
	$(MAKE) logs

.PHONY .SILENT: build
build:
	@${DOCKER_COMPOSE} build

.PHONY .SILENT: run
run:
	@${DOCKER_COMPOSE} up -d

.PHONY .SILENT: install
install:
	$(SHELL_CONSUMER_TTY) sh -c "pnpm install"
	$(SHELL_PRODUCER_TTY) sh -c "pnpm install"

.PHONY .SILENT: down
down:
	@${DOCKER_COMPOSE} down

.PHONY .SILENT: logs
logs:
	@${DOCKER_COMPOSE} logs -f


.NOPARALLEL .PHONY: test-all
test-all:
	echo "stopping all containers"
	$(MAKE) down
	@${DOCKER_COMPOSE} up -d rabbitmq
	sleep 3

	echo "Running Consumer tests"
	cd apps/consumer && $(MAKE) test
	echo "Consumer tests done"


	echo "Running Producer tests"
	cd apps/producer && $(MAKE) test
	echo "Producer tests done"
