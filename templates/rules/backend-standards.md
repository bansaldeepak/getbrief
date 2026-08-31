---
description: Backend architecture rules — layers, modules, API design, error handling patterns.
paths:
  - "**/server/**"
  - "**/api/**"
  - "**/routes/**"
---

## Architecture Layers
<!-- Example: Controller → Service → Repository. No cross-layer imports. -->

## API Design
<!-- Example: All endpoints return { data, error, meta } envelope. -->

## Error Handling
<!-- Example: Services throw typed errors; controllers map to HTTP status codes. -->

## Database Access
<!-- Example: All queries go through repository layer. No raw SQL in services. -->
