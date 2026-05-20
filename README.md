# DuelingBook-Style Solo Duel Room

A browser-based Yu-Gi-Oh duel sandbox inspired by DuelingBook, focused on fast manual gameplay, realistic tabletop interaction, and solo deck testing.

---

# Table of Contents

- [Project Goal](#project-goal)
- [Core Philosophy](#core-philosophy)
- [Features](#features)
- [MVP Scope](#mvp-scope)
- [Duel Room Layout](#duel-room-layout)
- [Core Systems](#core-systems)
- [Card Interaction System](#card-interaction-system)
- [Context Menus](#context-menus)
- [Hand UI](#hand-ui)
- [Card Preview Panel](#card-preview-panel)
- [Duel Log](#duel-log)
- [Controls Bar](#controls-bar)
- [Deck Import System](#deck-import-system)
- [Deck Builder](#deck-builder)
- [Visual Design](#visual-design)
- [Animations](#animations)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Architecture](#architecture)
- [Rendering Strategy](#rendering-strategy)
- [Data Models](#data-models)
- [Event System](#event-system)
- [Undo System](#undo-system)
- [Replay System](#replay-system)
- [Performance Targets](#performance-targets)
- [Responsiveness](#responsiveness)
- [Folder Structure](#folder-structure)
- [Development Roadmap](#development-roadmap)
- [Technical Challenges](#technical-challenges)
- [Recommended Stack](#recommended-stack)
- [Final Recommendation](#final-recommendation)

---

# Project Goal

The goal of this project is to recreate the dueling room experience of DuelingBook in a modern browser-based application.

The focus is on:

- Manual gameplay
- Competitive usability
- Fast interactions
- Solo deck testing
- Replay-ready architecture
- Realistic tabletop flow

This project intentionally excludes:

- Matchmaking
- Ranked systems
- Authentication
- Friends/social systems
- Chat
- Full automated rulings

---

# Core Philosophy

The application should feel like:

- Playing physical Yu-Gi-Oh digitally
- Extremely responsive
- Competitive-focused
- Minimal and efficient

## Design Priorities

1. Speed
2. Precision
3. Minimal clicks
4. Information density
5. Replay-ready architecture

---

# Features

## Included Features

### Duel Room
- Interactive playmat
- Card movement
- Zones
- Card stacking
- Manual gameplay flow

### Deck Management
- YDK import
- Local deck saves

### Gameplay Utilities
- Draw
- Shuffle
- Dice
- Coin toss
- Counters
- Tokens

### Systems
- Duel log
- Replay support
- Undo support
- Event system

---

# MVP Scope

## Included

- Solo duel sandbox
- Manual card interactions
- Deck importing
- Replay architecture
- Undo functionality
- Context menus
- Card previews
- Duel logs

## Excluded

- Multiplayer
- Automated rulings
- Ranked ladder
- Accounts
- Mobile-first support

---

# Duel Room Layout

Desktop-first 16:9 interface.

```txt
 ---------------------------------------------------------
| Opponent Info Bar                                       |
|---------------------------------------------------------|
| Opponent Monster Zones                                  |
| Opponent Spell/Trap Zones                               |
| Opponent Field/Deck/GY/Banished/Extra                   |
|---------------------------------------------------------|
|                    CENTER ACTION AREA                   |
|---------------------------------------------------------|
| Player Field/Deck/GY/Banished/Extra                     |
| Player Spell/Trap Zones                                 |
| Player Monster Zones                                    |
|---------------------------------------------------------|
| Hand Area                                               |
|---------------------------------------------------------|
| Left Sidebar | Duel Log / Chat | Right Card Preview     |
 ---------------------------------------------------------
```

---

# Core Systems

## Field Zones

### Monster Zones
- 5 Main Monster Zones
- Optional Extra Monster Zones

### Spell/Trap Zones
- 5 Spell/Trap Zones

### Special Zones
- Field Spell
- Deck
- Graveyard
- Banished
- Extra Deck

---

# Card Interaction System

This is the most important part of the application.

## Primary Card Interactions

### Hover
Open card context menu and show card image and info in the Left Sidebar.

### Left Click
Select card.

---

# Context Menus

## Hand Card Context Menu

```txt
Normal Summon
Special Summon
Set
Activate
Reveal
Send to Graveyard
Banish
Return to Deck
Shuffle into Deck
Create Token
```

## Field Card Context Menu

```txt
Rotate
Flip
Attach Counter
Detach Material
Move Zone
Change Control
Destroy
```

---

# Hand UI

## Requirements

- Fan-shaped spread
- Hover enlargement

## Interactions

- Hover context menu actions
- Future multi-select support

---

# Card Preview Panel

Large left-side preview panel.

## Displays

- Card image
- Card text
- Attribute
- Type
- ATK/DEF
- Level/Rank/Link

## Behavior

- Updates on hover
- Sticky pin support

---

# Duel Log

Essential for competitive testing.

## Example

```txt
Turn 1
Player drew Ash Blossom
Player Normal Summoned Aluber
Player activated Branded Fusion
```

## Features

- Scrollable
- Replay-ready
- Optional timestamps

---

# Controls Bar

## Controls

- Draw
- Shuffle
- Roll Dice
- Coin Toss
- End Phase
- Undo
- Reset Duel
- Save Replay

---

# Deck Import System

## Supported Formats

### YDK Import
Primary supported format.

### Drag-and-Drop Upload

---

# Visual Design

## Theme

Dark competitive UI.

## Color Palette

```txt
Background: #111318
Field: #1b2230
Accent Blue: #4da3ff
Accent Gold: #f5c542
Text: #e5e7eb
Danger: #ff5a5a
```

---

# Card Rendering

## Card Ratio

```txt
59 : 86
```

## Rendering Rules

- Crisp edges
- Minimal shadows
- Subtle hover glow
- No excessive effects

---

# Animations

## Allowed

- Hover scaling
- Smooth movement
- Fade transitions

## Avoid

- Long summon animations
- Heavy particles
- Cinematic transitions

Competitive players prioritize speed.

---

# Architecture

## Frontend

- Vue.js 3 with Pinia
- TypeScript

## Styling

- CSS/SCSS

---

# Possible Data Models

## Card Instance

```ts
type CardInstance = {
  uuid: string
  cardId: number
  owner: number
  controller: number
  zone: string
  position: string
  rotation: number
  counters: number
  faceUp: boolean
}
```

## Zone Model

```ts
type Zone = {
  id: string
  type: string
  owner: number
  cards: string[]
}
```

---

# Event System

Every interaction should emit an event.

## Example Events

```txt
CARD_MOVED
CARD_DRAWN
CARD_REVEALED
CARD_ROTATED
LIFE_CHANGED
```

## Purpose

Required for:
- replay system,
- undo system.

---

# Undo System

Solo mode should support full undo functionality.

## Recommended Approach

- Action stack
- Snapshot restoration
- Event rollback

This becomes a major UX advantage over DuelingBook.

---

# Replay System

## Replay Format Example

```json
[
  {
    "type": "DRAW",
    "player": 1
  },
  {
    "type": "MOVE",
    "card": "uuid",
    "from": "HAND",
    "to": "MZONE_2"
  }
]
```

---

# Performance Targets

## Goal

Stable 60 FPS on:
- Chrome
- Firefox
- Edge

## Stress Test

100+ visible cards simultaneously.

---

# Responsiveness

Priority order:
1. Desktop
2. Tablet
3. Mobile (future)

Mobile-first support would significantly complicate interactions.

---

# Folder Structure

```txt
src/
  core/
  duel/
  renderer/
  ui/
  cards/
  state/
  replay/
  assets/
```

---

# Development Roadmap

## Phase 1
- Static field
- Card rendering
- Drag/drop

## Phase 2
- Deck import
- Draw/shuffle
- Zone systems

## Phase 3
- Context menus
- Duel log
- Counters

## Phase 4
- Undo/replay

---

# Technical Challenges

## Hardest Problems

1. Card movement animation (future)
2. Layering/z-index management
3. Undo architecture
4. Event synchronization
5. Overlapping context menus

---
