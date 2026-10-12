---
name: discover-must-persist
description: /brief discover must always create a DISCOVERY.md file in the
  feature folder — conversation output alone violates project-local memory
  premise
metadata:
  type: feedback
_brief:
  version: 1
  record_id: 40beaeb3-0e62-4dc0-a907-69c0ebe5f7aa
  item:
    id: feedback_discover-must-persist
    type: memory
    title: /brief discover must always create a DISCOVERY.md file in the feature
      folder — conversation output alone violates project-local memory premise
    status: active
    link: null
    pr: null
---

The discover skill must always produce a `DISCOVERY.md` file in `documentation/stories/<feature>/`, not just conversation output.

**Why:** Brief's whole premise is project-local memory — anyone can pick up anytime, anywhere. Discovery findings that exist only in conversation context are lost the moment the session ends. The user had to manually remind to create the document.

**How to apply:** Update `discover/SKILL.md` to include a mandatory "Phase 6: Persist" step that writes the discovery summary to `documentation/stories/<feature>/DISCOVERY.md`. The feature folder should be created at the start of discovery (after branch check), and the document written as the final step before announcing readiness for PRD.
