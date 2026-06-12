# Appflow & Navigation Path
**Navigation Strategy:** Single-Page Application (SPA) architecture optimized for instantaneous view transitions.

## 1. Complete Screen State Chart
```mermaid
graph TD
    A[Launch PWA on Phone] --> B{Is Session Valid?}
    B -- No --> C[Minimal Password Lock Screen]
    B -- Yes --> D[Main Stream Dashboard]
    
    D --> E[Tap Filter Bar]
    E -->|Select 'Energy'| F[Instant Client-side Filtered Feed]
    
    D --> G[Pull Down Screen]
    G --> H[Trigger Refresh Request to Supabase Client]
    H --> D
