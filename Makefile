.PHONY: down up health

down:
	docker-compose down

up:
	docker-compose up -d

health:
	@echo "Checking API health..."
	@curl -f http://localhost:3001/health && echo "✓ API: OK" || echo "✗ API: FAILED"
	@echo "Checking Web health..."
	@curl -f http://localhost:3000/ > /dev/null 2>&1 && echo "✓ Web: OK" || echo "✗ Web: FAILED"
