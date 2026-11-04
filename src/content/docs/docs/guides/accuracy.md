---
title: Accuracy
description: How accurately Odyssey tracks where your weapon is aimed and where it is, and what changes it.
sidebar:
  order: 2
---
Odyssey measures two things for every weapon: **where it is aimed** on the screen, and **where it is** in front of the screen (its pose: position and orientation). Different things limit each one, so they have separate figures.

## At a glance

| | |
|---|---|
| Aiming accuracy | ±0.5 MOA at the center of the screen, 1 MOA at the edges, measured at 15 ft (4.6 m) |
| Position precision | About ±3 mm at 15 ft (4.6 m) on a 65-inch HDTV, and less on larger screens |
| Position accuracy | Within 1% of your distance from the screen on an HDTV, and within 1.5% on a projection screen up to 120 inches |

## Aiming accuracy

A minute of angle (MOA) is 1/60 of a degree, about 1 inch at 100 yards. At the center of the screen, Odyssey reports where your weapon is aimed to within ±0.5 MOA. In practice:

- On a simulated 100-yard target, a shot lands within about half an inch of where the weapon was pointed.
- Standing 15 ft from a 65-inch 4K TV, that is within 2 pixels of the true spot.

Because it is an angle, it stays about the same as you move closer or farther away. It is best at the center of the screen and drops to about 1 MOA toward the edges.

The size of your screen and how accurately it was measured during calibration don't change where your shots land. Odyssey measures your aim relative to the screen itself, so an error in the screen's measured size cancels out.

These figures assume the weapon is zeroed. See [Getting started](/docs/guides/getting-started/).

## Position precision and accuracy

**Precision** is how much the reported position jitters while you hold the weapon still. **Accuracy** is how far the reported position can be from where the weapon really is. Like any depth camera's, both depend on distance:

| Screen | Distance | Precision | Accuracy |
|---|---|---|---|
| 65-inch HDTV | 10 ft (3 m) | ±1.5 mm | 2.2 cm |
| 65-inch HDTV | 15 ft (4.6 m) | ±3 mm | 3.3 cm |
| 65-inch HDTV | 20 ft (6.1 m) | ±5 mm | 4.4 cm |
| 120-inch projection screen | 10 ft (3 m) | ±1 mm | 4.0 cm |
| 120-inch projection screen | 15 ft (4.6 m) | ±1.5 mm | 6.1 cm |
| 120-inch projection screen | 20 ft (6.1 m) | ±3 mm | 8.1 cm |

- **Precision gets better on a larger screen.** The markers around a larger screen are farther apart, so the tracker sees small changes in distance more clearly. It gets worse quickly with distance: twice as far away jitters about four times as much.
- **Accuracy comes from calibration.** Odyssey Desktop measures your screen with a depth camera, and a depth camera's error grows the farther it stands from what it measures. A projection screen needs the camera farther back to see all of it, so its measurement carries a larger error. That error acts like a ruler that is slightly too long or too short: every position is off by the same share of your distance from the screen.

Positions are steady to a few millimeters, so movement, stance, and follow-through are tracked closely, even when the absolute position is off by a few centimeters. Neither figure changes where your shots land on the screen.

## Getting the best accuracy

- When calibrating, put the depth camera as close to the screen as it can be while it still sees the whole screen and all the markers.
- Calibrate again whenever the screen, the markers, or the projector move.
- Zero each weapon after calibrating.
- Keep the markers clean and nothing in front of them.

## How these figures were worked out

Aiming accuracy was measured at 15 ft (4.6 m). The position figures are calculated, not measured:

- **Precision** follows from the measured aiming accuracy, the distance, and the size of the screen.
- **Accuracy** follows from the published depth accuracy of the Orbbec Gemini 335L and 336L depth cameras: ±1% at 2 m and ±2% at 4 m. It assumes the camera stands about one screen-width from the screen. Orbbec's figures are limits, so most calibrations do better than the table.
