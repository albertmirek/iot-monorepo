

DOCKER_COMPOSE ?= "docker-compose"
SHELL_CONSUMER_TTY := $(DOCKER_COMPOSE) run --rm consumer
SHELL_PRODUCER_TTY := $(DOCKER_COMPOSE) run --rm producer

.NOPARALLEL .PHONY: all
all:
	@${DOCKER_COMPOSE} pull
	$(MAKE) run
	$(MAKE) install
	$(MAKE) logs

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
