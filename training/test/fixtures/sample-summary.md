# Training: hex nut

## Prompt
a hex nut with chamfered edges

## Iterations
Iteration 1: Score 4/10 — basic hexagon but no chamfer
Iteration 2: Score 6/10 — chamfer added but too aggressive
Iteration 3: Score 8/10 — good proportions, clean chamfer

## Technique Discovered
- **Name:** Profile Extrusion
- **Category:** Prismatic shapes

## Proposed agent.md Addition
### Technique: Profile Extrusion
Keywords: hex, nut, bolt, washer, extrude, profile, polygon, prism, channel, rail

**When to use:** Any object that is a 2D profile swept into 3D.

**Proven code template:**
```openscad
$fn = 120;
module hex_nut() {
  difference() {
    linear_extrude(height = 10)
      circle(r = 15, $fn = 6);
    translate([0, 0, -1])
      cylinder(h = 12, r = 7);
  }
}
hex_nut();
```

**Pitfalls:**
- Forgetting $fn=6 for hexagon

## New Visual Failures
| Chamfer too deep | Chamfer radius > edge length | Reduce chamfer to 15% of edge |

## Decision Tree Update
| Is it a 2D profile swept into 3D? (hex nut, rail, channel) | → Profile Extrusion | Continue ↓ |
