# LM001 — Living Map Object Model

**Status:** Draft 001 (Accepted Baseline)

---

# Purpose

Define the smallest set of objects that can exist within the Ex Games Living Map.

This document describes **what exists**.

It deliberately avoids describing **how it will be implemented**.

Implementation decisions belong elsewhere.

---

# Design Principle

The Living Map is a geographical canvas.

Everything that appears within the Ex Games experience must ultimately be attached to a geographic object.

---

# Fundamental Object

The fundamental object within the Living Map is an **Area**.

An Area represents a real-world location.

An Area may be represented by:

* Point
* Line
* Polygon
* Multi-polygon

The geometry is an implementation detail.

Conceptually, every object is simply an Area.

---

# Every Area possesses

At minimum:

* Identifier
* Name
* Geographic Boundary
* Area Type
* Position

No additional information is required for an Area to exist.

---

# Information that may later attach to an Area

Future phases may attach:

* Images
* Video
* Audio
* Documents
* Stories
* Historical Events
* Timelines
* Challenges
* Opportunities
* Species
* Ecological Information
* Projects
* Activities
* Achievements

None of these are required during LM001.

---

# Relationships

Areas may relate to other Areas.

Examples include:

* Contains
* Adjacent To
* Connected To
* Part Of

Relationship behaviour will be defined in later phases.

---

# Guiding Principle

The Living Map stores places.

The Ex Games experience emerges from the information attached to those places.

The map itself remains deliberately generic.

---

# LM001 Objective

LM001 is complete when:

* Auckland can be explored smoothly.
* Areas can exist.
* Areas can be selected.

Nothing more is required.

Everything else belongs to later phases.

---

# Design Reminder

Whenever a new idea is proposed, ask:

**"Does this define an Area, or is it simply information that attaches to an Area?"**

If it attaches to an Area, it almost certainly belongs in a later phase rather than LM001.

