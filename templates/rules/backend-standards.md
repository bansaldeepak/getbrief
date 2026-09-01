---
description: Backend architecture rules — layers, modules, API design, error handling patterns.
paths:
  - "**/server/**"
  - "**/api/**"
  - "**/routes/**"
---

## Architecture Layers
<!-- brief:auto section="architecture-layers" -->
<!-- Example: Controller → Service → Repository. No cross-layer imports. -->
<!-- /brief:auto -->

## API Design
<!-- brief:auto section="api-design" -->
<!-- Example: All endpoints return { data, error, meta } envelope. -->
<!-- /brief:auto -->

## Error Handling
<!-- brief:auto section="error-handling" -->
<!-- Example: Services throw typed errors; controllers map to HTTP status codes. -->
<!-- /brief:auto -->

## Database Access
<!-- brief:auto section="database-access" -->
<!-- Example: All queries go through repository layer. No raw SQL in services. -->
<!-- /brief:auto -->
